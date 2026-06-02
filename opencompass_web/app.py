import asyncio
import json
import os
import shlex
import subprocess
import time
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse, PlainTextResponse
from pydantic import BaseModel, Field

try:
    from importlib.metadata import version
except ImportError:  # pragma: no cover
    from importlib_metadata import version


APP_ROOT = Path(os.environ.get("OPENCOMPASS_APP_ROOT", "/app"))
OUTPUT_ROOT = Path(os.environ.get("OPENCOMPASS_OUTPUT_DIR", APP_ROOT / "outputs"))
MAX_LOG_BYTES = 512_000

app = FastAPI(title="provider-diff OpenCompass Web")
current_process: subprocess.Popen[str] | None = None
current_run_id: str | None = None


class RunRequest(BaseModel):
    api_base_url: str = Field(default="https://api.openai.com/v1")
    api_key: str = Field(default="")
    model_name: str = Field(default="gpt-4o-mini")
    model_abbr: str = Field(default="")
    datasets: str = Field(default="demo_gsm8k_chat_gen")
    run_mode: str = Field(default="all")
    max_seq_len: int = Field(default=16384, ge=1)
    max_out_len: int = Field(default=512, ge=1)
    batch_size: int = Field(default=1, ge=1)
    query_per_second: float = Field(default=1, gt=0)
    retry: int = Field(default=2, ge=0)
    temperature: str = Field(default="")
    max_workers: str = Field(default="")
    truncation_mode: str = Field(default="none")
    tokenizer_path: str = Field(default="")
    proxy_url: str = Field(default="")
    extra_body_json: str = Field(default="")
    extra_model_config_json: str = Field(default="")
    max_num_workers: int = Field(default=1, ge=1)
    dataset_num_runs: int = Field(default=1, ge=1)
    reuse: str = Field(default="")
    debug: bool = Field(default=True)
    dry_run: bool = Field(default=False)
    dump_eval_details: bool = Field(default=True)
    extra_args: str = Field(default="")


def opencompass_version() -> str:
    try:
        return version("opencompass")
    except Exception:
        return "unknown"


def run_dir(run_id: str) -> Path:
    return OUTPUT_ROOT / run_id


def safe_run_name() -> str:
    return time.strftime("run-%Y%m%d-%H%M%S", time.gmtime())


def list_outputs() -> list[dict[str, Any]]:
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    items: list[dict[str, Any]] = []
    for path in sorted(OUTPUT_ROOT.iterdir(), key=lambda item: item.stat().st_mtime, reverse=True):
        stat = path.stat()
        items.append(
            {
                "name": path.name,
                "kind": "dir" if path.is_dir() else "file",
                "size": stat.st_size,
                "mtime": int(stat.st_mtime),
            }
        )
    return items[:80]


def latest_log_text(run_id: str | None = None) -> str:
    if run_id:
        candidates = [run_dir(run_id) / "opencompass.log"]
    else:
        candidates = sorted(OUTPUT_ROOT.glob("run-*/opencompass.log"), key=lambda item: item.stat().st_mtime, reverse=True)
    if not candidates:
        return ""
    path = candidates[0]
    if not path.exists():
        return ""
    with path.open("rb") as file:
        file.seek(0, os.SEEK_END)
        size = file.tell()
        file.seek(max(0, size - MAX_LOG_BYTES))
        return file.read().decode("utf-8", errors="replace")


def parse_json_object(raw: str, field_name: str) -> dict[str, Any]:
    value = raw.strip()
    if not value:
        return {}
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail=f"{field_name} is not valid JSON: {exc.msg}") from exc
    if not isinstance(parsed, dict):
        raise HTTPException(status_code=400, detail=f"{field_name} must be a JSON object.")
    return parsed


def parse_optional_float(raw: str, field_name: str) -> float | None:
    value = raw.strip()
    if not value:
        return None
    try:
        return float(value)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"{field_name} must be a number.") from exc


def parse_optional_int(raw: str, field_name: str) -> int | None:
    value = raw.strip()
    if not value:
        return None
    try:
        return int(value)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"{field_name} must be an integer.") from exc


def normalize_openai_api_base(url: str) -> str:
    value = url.strip() or "https://api.openai.com/v1"
    trimmed = value.rstrip("/")
    if trimmed.endswith("/chat/completions"):
        return trimmed
    if trimmed.endswith("/v1"):
        return f"{trimmed}/chat/completions"
    return f"{trimmed}/v1/chat/completions"


def redacted(value: str) -> str:
    if not value:
        return ""
    if len(value) <= 8:
        return "***"
    return f"{value[:4]}...{value[-4:]}"


def py_literal(value: Any) -> str:
    return repr(value)


def model_config_from_payload(payload: RunRequest, target_dir: Path) -> tuple[Path, dict[str, Any]]:
    if not payload.model_name.strip():
        raise HTTPException(status_code=400, detail="Model name is required.")
    if payload.truncation_mode not in {"none", "front", "mid", "rear"}:
        raise HTTPException(status_code=400, detail="Invalid truncation mode.")
    if payload.run_mode not in {"all", "infer", "eval", "viz"}:
        raise HTTPException(status_code=400, detail="Invalid run mode.")

    extra_body = parse_json_object(payload.extra_body_json, "extra_body")
    extra_model_config = parse_json_object(payload.extra_model_config_json, "extra_model_config")
    temperature = parse_optional_float(payload.temperature, "temperature")
    max_workers = parse_optional_int(payload.max_workers, "max_workers")
    api_base = normalize_openai_api_base(payload.api_base_url)
    abbr = payload.model_abbr.strip() or payload.model_name.strip().replace("/", "_").replace(":", "_")

    model_config: dict[str, Any] = {
        "path": payload.model_name.strip(),
        "abbr": abbr,
        "key": "ENV",
        "openai_api_base": api_base,
        "max_seq_len": payload.max_seq_len,
        "max_out_len": payload.max_out_len,
        "batch_size": payload.batch_size,
        "query_per_second": payload.query_per_second,
        "retry": payload.retry,
        "mode": payload.truncation_mode,
        "run_cfg": {"num_gpus": 0},
    }
    if temperature is not None:
        model_config["temperature"] = temperature
    if max_workers is not None:
        model_config["max_workers"] = max_workers
    if payload.tokenizer_path.strip():
        model_config["tokenizer_path"] = payload.tokenizer_path.strip()
    if payload.proxy_url.strip():
        model_config["openai_proxy_url"] = payload.proxy_url.strip()
    if extra_body:
        model_config["extra_body"] = extra_body
    model_config.update(extra_model_config)

    lines = [
        "from opencompass.models import OpenAI",
        "",
        "models = [",
        "    dict(",
        "        type=OpenAI,",
    ]
    for key, value in model_config.items():
        lines.append(f"        {key}={py_literal(value)},")
    lines.extend(["    ),", "]", ""])

    config_path = target_dir / "model_config.py"
    config_path.write_text("\n".join(lines), encoding="utf-8")
    return config_path, model_config


def build_command(payload: RunRequest, config_path: Path, target_dir: Path) -> list[str]:
    datasets = shlex.split(payload.datasets)
    extra_args = shlex.split(payload.extra_args)
    if not datasets:
        raise HTTPException(status_code=400, detail="At least one dataset config is required.")

    command = [
        "opencompass",
        str(config_path),
        "--datasets",
        *datasets,
        "--work-dir",
        str(target_dir),
        "--mode",
        payload.run_mode,
        "--max-num-workers",
        str(payload.max_num_workers),
        "--dataset-num-runs",
        str(payload.dataset_num_runs),
        "--dump-eval-details",
        "true" if payload.dump_eval_details else "false",
    ]
    if payload.debug:
        command.append("--debug")
    if payload.dry_run:
        command.append("--dry-run")
    if payload.reuse.strip():
        command.extend(["--reuse", payload.reuse.strip()])
    command.extend(extra_args)
    return command


def redacted_payload(payload: RunRequest) -> dict[str, Any]:
    data = payload.model_dump()
    data["api_key"] = redacted(payload.api_key)
    return data


@app.get("/healthz")
def healthz() -> dict[str, Any]:
    return {
        "ok": True,
        "service": "opencompass-web",
        "opencompass_version": opencompass_version(),
        "running": current_process is not None and current_process.poll() is None,
        "run_id": current_run_id,
    }


@app.get("/api/status")
def status() -> dict[str, Any]:
    return {
        "opencompass_version": opencompass_version(),
        "running": current_process is not None and current_process.poll() is None,
        "run_id": current_run_id,
        "outputs": list_outputs(),
    }


@app.get("/api/log")
def log(run_id: str | None = None) -> PlainTextResponse:
    return PlainTextResponse(latest_log_text(run_id))


@app.post("/api/runs")
async def start_run(payload: RunRequest) -> JSONResponse:
    global current_process, current_run_id

    if current_process is not None and current_process.poll() is None:
        raise HTTPException(status_code=409, detail="An OpenCompass run is already active.")

    run_id = safe_run_name()
    target_dir = run_dir(run_id)
    target_dir.mkdir(parents=True, exist_ok=True)

    config_path, model_config = model_config_from_payload(payload, target_dir)
    command = build_command(payload, config_path, target_dir)
    redacted_model_config = {**model_config, "key": "ENV"}
    metadata = {
        "run_id": run_id,
        "command": command,
        "request": redacted_payload(payload),
        "model_config": redacted_model_config,
        "created_at": int(time.time()),
    }
    (target_dir / "request.json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")

    env = os.environ.copy()
    if payload.api_key.strip():
        env["OPENAI_API_KEY"] = payload.api_key.strip()
    env["OPENAI_BASE_URL"] = payload.api_base_url.strip()

    log_file = (target_dir / "opencompass.log").open("w", encoding="utf-8")
    log_file.write("$ " + " ".join(shlex.quote(part) for part in command) + "\n\n")
    log_file.write(f"model={payload.model_name.strip()} api_base={normalize_openai_api_base(payload.api_base_url)} api_key={redacted(payload.api_key)}\n\n")
    log_file.flush()
    current_process = subprocess.Popen(command, stdout=log_file, stderr=subprocess.STDOUT, text=True, env=env)
    current_run_id = run_id

    async def close_when_done(process: subprocess.Popen[str], file_handle: Any) -> None:
        while process.poll() is None:
            await asyncio.sleep(1)
        file_handle.write(f"\n\n[exit_code] {process.returncode}\n")
        file_handle.close()

    asyncio.create_task(close_when_done(current_process, log_file))
    return JSONResponse(metadata, status_code=202)


@app.post("/api/runs/stop")
def stop_run() -> dict[str, Any]:
    global current_process
    if current_process is None or current_process.poll() is not None:
        return {"stopped": False, "message": "No active run."}
    current_process.terminate()
    return {"stopped": True, "run_id": current_run_id}


@app.get("/", response_class=HTMLResponse)
def dashboard() -> str:
    return """
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>OpenCompass Web</title>
    <style>
      :root {
        --bg: #f7f7f8;
        --surface: #fff;
        --surface-muted: #f2f3f5;
        --border: #e1e3e8;
        --text: #20242a;
        --muted: #6f747e;
        --brand: #2764e8;
        --brand-soft: #eef4ff;
        --ok: #12805c;
        --warn: #a96600;
        --danger: #c93434;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      * { box-sizing: border-box; }
      body { margin: 0; background: var(--bg); color: var(--text); font-size: 14px; }
      header {
        position: sticky; top: 0; z-index: 10; display: flex; align-items: center; justify-content: space-between; gap: 12px;
        height: 58px; padding: 0 18px; background: rgba(255,255,255,.96); border-bottom: 1px solid var(--border);
        backdrop-filter: blur(10px);
      }
      h1 { margin: 0; font-size: 18px; letter-spacing: 0; }
      h2 { margin: 0 0 10px; font-size: 15px; letter-spacing: 0; }
      main { width: min(1440px, calc(100vw - 24px)); margin: 12px auto 28px; display: grid; gap: 12px; }
      .grid { display: grid; grid-template-columns: minmax(420px, .95fr) minmax(460px, 1.05fr); gap: 12px; align-items: start; }
      .panel { border: 1px solid var(--border); border-radius: 8px; background: var(--surface); padding: 14px; }
      .status { display: flex; align-items: center; gap: 8px; color: var(--muted); }
      .dot { width: 8px; height: 8px; border-radius: 99px; background: var(--ok); }
      form { display: grid; gap: 12px; }
      fieldset { display: grid; gap: 10px; margin: 0; border: 1px solid var(--border); border-radius: 8px; padding: 12px; }
      legend { padding: 0 5px; color: var(--muted); font-size: 12px; font-weight: 750; }
      .fields-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
      .fields-3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
      label { display: grid; gap: 5px; min-width: 0; color: var(--muted); font-size: 12px; font-weight: 650; }
      input, select, textarea {
        width: 100%; min-width: 0; border: 1px solid var(--border); border-radius: 6px; padding: 0 9px; color: var(--text);
        background: #fff; font: inherit; outline: none;
      }
      input, select { height: 34px; }
      textarea { min-height: 82px; padding: 8px 9px; resize: vertical; }
      input:focus, select:focus, textarea:focus { border-color: #87a9ff; box-shadow: 0 0 0 3px rgba(39,100,232,.12); }
      .checkbox-row { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
      .check { display: inline-flex; grid-template-columns: none; gap: 6px; align-items: center; color: var(--text); }
      .check input { width: 15px; height: 15px; }
      button, a.button {
        display: inline-flex; align-items: center; justify-content: center; min-height: 34px;
        border: 1px solid var(--border); border-radius: 6px; padding: 0 12px; color: var(--text);
        background: #fff; cursor: pointer; text-decoration: none; font-weight: 650;
      }
      button.primary { border-color: var(--brand); background: var(--brand); color: #fff; }
      button.danger { border-color: #ffd3d3; color: var(--danger); }
      button:disabled { opacity: 0.55; cursor: not-allowed; }
      .actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
      .hint { margin-top: 2px; color: var(--muted); font-size: 12px; line-height: 1.35; }
      .muted { color: var(--muted); }
      .mono { font-family: "SFMono-Regular", "Cascadia Code", Consolas, monospace; }
      pre {
        min-height: 430px; max-height: calc(100vh - 250px); overflow: auto; margin: 0;
        border: 1px solid var(--border); border-radius: 7px; padding: 12px; background: #111418; color: #d6e0ea;
        white-space: pre-wrap; overflow-wrap: anywhere; font-size: 12px; line-height: 1.45;
      }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th, td { border-bottom: 1px solid var(--border); padding: 7px 5px; text-align: left; vertical-align: top; }
      th { color: var(--muted); font-weight: 700; }
      .quick-row { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 8px; }
      .chip { min-height: 26px; border-color: #d8e2ff; color: var(--brand); background: var(--brand-soft); font-family: inherit; font-size: 12px; }
      @media (max-width: 980px) { .grid, .fields-2, .fields-3 { grid-template-columns: 1fr; } }
    </style>
  </head>
  <body>
    <header>
      <h1>OpenCompass Web</h1>
      <div class="status"><span class="dot"></span><span id="version" class="mono">loading</span></div>
    </header>
    <main>
      <div class="grid">
        <section class="panel">
          <form id="runForm">
            <fieldset>
              <legend>OpenAI-compatible API</legend>
              <label>API URL
                <input id="apiBaseUrl" class="mono" value="https://api.openai.com/v1" autocomplete="off" />
                <span class="hint">可填 base URL（如 /v1）或完整 /chat/completions，服务端会自动补齐。</span>
              </label>
              <label>API Key
                <input id="apiKey" class="mono" type="password" placeholder="sk-..." autocomplete="off" />
                <span class="hint">仅注入本次进程环境变量 OPENAI_API_KEY；日志和 request.json 会打码。</span>
              </label>
              <div class="fields-2">
                <label>Model
                  <input id="modelName" class="mono" value="gpt-4o-mini" autocomplete="off" />
                </label>
                <label>Abbr
                  <input id="modelAbbr" class="mono" placeholder="留空则用 model 名" autocomplete="off" />
                </label>
              </div>
              <div class="quick-row">
                <button class="chip" type="button" data-preset="siliconflow">SiliconFlow</button>
                <button class="chip" type="button" data-preset="openai">OpenAI</button>
                <button class="chip" type="button" data-preset="openrouter">OpenRouter</button>
                <button class="chip" type="button" data-preset="deepseek">DeepSeek</button>
              </div>
            </fieldset>

            <fieldset>
              <legend>Datasets and run</legend>
              <label>Datasets
                <input id="datasets" class="mono" value="demo_gsm8k_chat_gen" autocomplete="off" />
                <span class="hint">多个 dataset 用空格分隔，等同于 opencompass --datasets ...</span>
              </label>
              <div class="fields-3">
                <label>Mode
                  <select id="runMode">
                    <option value="all">all</option>
                    <option value="infer">infer</option>
                    <option value="eval">eval</option>
                    <option value="viz">viz</option>
                  </select>
                </label>
                <label>Max workers
                  <input id="maxNumWorkers" class="mono" type="number" min="1" value="1" />
                </label>
                <label>Dataset runs
                  <input id="datasetNumRuns" class="mono" type="number" min="1" value="1" />
                </label>
              </div>
              <div class="fields-2">
                <label>Reuse
                  <input id="reuse" class="mono" placeholder="留空 / latest / 指定 timestamp" autocomplete="off" />
                </label>
                <label>Extra CLI args
                  <input id="extraArgs" class="mono" placeholder="例如 --config-verbose" autocomplete="off" />
                </label>
              </div>
              <div class="checkbox-row">
                <label class="check"><input id="debug" type="checkbox" checked /> debug</label>
                <label class="check"><input id="dryRun" type="checkbox" /> dry-run</label>
                <label class="check"><input id="dumpEvalDetails" type="checkbox" checked /> dump eval details</label>
              </div>
            </fieldset>

            <fieldset>
              <legend>Model runtime</legend>
              <div class="fields-3">
                <label>max_seq_len
                  <input id="maxSeqLen" class="mono" type="number" min="1" value="16384" />
                </label>
                <label>max_out_len
                  <input id="maxOutLen" class="mono" type="number" min="1" value="512" />
                </label>
                <label>batch_size
                  <input id="batchSize" class="mono" type="number" min="1" value="1" />
                </label>
              </div>
              <div class="fields-3">
                <label>query_per_second
                  <input id="queryPerSecond" class="mono" type="number" min="0.01" step="0.01" value="1" />
                </label>
                <label>retry
                  <input id="retry" class="mono" type="number" min="0" value="2" />
                </label>
                <label>temperature
                  <input id="temperature" class="mono" placeholder="留空使用 dataset 默认" autocomplete="off" />
                </label>
              </div>
              <div class="fields-3">
                <label>truncation mode
                  <select id="truncationMode">
                    <option value="none">none</option>
                    <option value="front">front</option>
                    <option value="mid">mid</option>
                    <option value="rear">rear</option>
                  </select>
                </label>
                <label>max_workers
                  <input id="maxWorkers" class="mono" placeholder="留空自动" autocomplete="off" />
                </label>
                <label>tokenizer_path
                  <input id="tokenizerPath" class="mono" placeholder="可选" autocomplete="off" />
                </label>
              </div>
              <label>Proxy URL
                <input id="proxyUrl" class="mono" placeholder="http://127.0.0.1:7890" autocomplete="off" />
              </label>
              <div class="fields-2">
                <label>extra_body JSON
                  <textarea id="extraBodyJson" class="mono" spellcheck="false" placeholder='{"top_p": 0.9}'></textarea>
                </label>
                <label>extra model config JSON
                  <textarea id="extraModelConfigJson" class="mono" spellcheck="false" placeholder='{"rpm_verbose": true}'></textarea>
                </label>
              </div>
            </fieldset>

            <div class="actions">
              <button id="startButton" class="primary" type="submit">Start run</button>
              <button id="stopButton" class="danger" type="button">Stop</button>
              <a class="button" href="https://rank.opencompass.org.cn/home" target="_blank" rel="noopener noreferrer">CompassRank</a>
              <a class="button" href="https://hub.opencompass.org.cn/home" target="_blank" rel="noopener noreferrer">CompassHub</a>
              <a class="button" href="https://opencompass.readthedocs.io/" target="_blank" rel="noopener noreferrer">Docs</a>
            </div>
          </form>
        </section>
        <section class="panel">
          <h2>Outputs</h2>
          <table>
            <thead><tr><th>Output</th><th>Kind</th><th>Updated</th></tr></thead>
            <tbody id="outputs"><tr><td colspan="3" class="muted">No outputs yet.</td></tr></tbody>
          </table>
        </section>
      </div>
      <section class="panel">
        <h2>Run log</h2>
        <pre id="log">Waiting for OpenCompass.</pre>
      </section>
    </main>
    <script>
      const els = {
        version: document.querySelector("#version"),
        outputs: document.querySelector("#outputs"),
        log: document.querySelector("#log"),
        form: document.querySelector("#runForm"),
        apiBaseUrl: document.querySelector("#apiBaseUrl"),
        apiKey: document.querySelector("#apiKey"),
        modelName: document.querySelector("#modelName"),
        modelAbbr: document.querySelector("#modelAbbr"),
        datasets: document.querySelector("#datasets"),
        runMode: document.querySelector("#runMode"),
        maxSeqLen: document.querySelector("#maxSeqLen"),
        maxOutLen: document.querySelector("#maxOutLen"),
        batchSize: document.querySelector("#batchSize"),
        queryPerSecond: document.querySelector("#queryPerSecond"),
        retry: document.querySelector("#retry"),
        temperature: document.querySelector("#temperature"),
        maxWorkers: document.querySelector("#maxWorkers"),
        truncationMode: document.querySelector("#truncationMode"),
        tokenizerPath: document.querySelector("#tokenizerPath"),
        proxyUrl: document.querySelector("#proxyUrl"),
        extraBodyJson: document.querySelector("#extraBodyJson"),
        extraModelConfigJson: document.querySelector("#extraModelConfigJson"),
        maxNumWorkers: document.querySelector("#maxNumWorkers"),
        datasetNumRuns: document.querySelector("#datasetNumRuns"),
        reuse: document.querySelector("#reuse"),
        debug: document.querySelector("#debug"),
        dryRun: document.querySelector("#dryRun"),
        dumpEvalDetails: document.querySelector("#dumpEvalDetails"),
        extraArgs: document.querySelector("#extraArgs"),
        startButton: document.querySelector("#startButton"),
        stopButton: document.querySelector("#stopButton")
      };
      const presets = {
        siliconflow: { apiBaseUrl: "https://api.siliconflow.cn/v1", modelName: "Qwen/Qwen2.5-7B-Instruct", modelAbbr: "siliconflow-qwen" },
        openai: { apiBaseUrl: "https://api.openai.com/v1", modelName: "gpt-4o-mini", modelAbbr: "gpt-4o-mini" },
        openrouter: { apiBaseUrl: "https://openrouter.ai/api/v1", modelName: "openai/gpt-4o-mini", modelAbbr: "openrouter-gpt-4o-mini" },
        deepseek: { apiBaseUrl: "https://api.deepseek.com/v1", modelName: "deepseek-chat", modelAbbr: "deepseek-chat" }
      };
      let activeRunId = null;

      function numberValue(input, fallback) {
        const value = Number(input.value);
        return Number.isFinite(value) ? value : fallback;
      }

      function payloadFromForm() {
        return {
          api_base_url: els.apiBaseUrl.value,
          api_key: els.apiKey.value,
          model_name: els.modelName.value,
          model_abbr: els.modelAbbr.value,
          datasets: els.datasets.value,
          run_mode: els.runMode.value,
          max_seq_len: numberValue(els.maxSeqLen, 16384),
          max_out_len: numberValue(els.maxOutLen, 512),
          batch_size: numberValue(els.batchSize, 1),
          query_per_second: numberValue(els.queryPerSecond, 1),
          retry: numberValue(els.retry, 2),
          temperature: els.temperature.value,
          max_workers: els.maxWorkers.value,
          truncation_mode: els.truncationMode.value,
          tokenizer_path: els.tokenizerPath.value,
          proxy_url: els.proxyUrl.value,
          extra_body_json: els.extraBodyJson.value,
          extra_model_config_json: els.extraModelConfigJson.value,
          max_num_workers: numberValue(els.maxNumWorkers, 1),
          dataset_num_runs: numberValue(els.datasetNumRuns, 1),
          reuse: els.reuse.value,
          debug: els.debug.checked,
          dry_run: els.dryRun.checked,
          dump_eval_details: els.dumpEvalDetails.checked,
          extra_args: els.extraArgs.value
        };
      }

      function formatTime(seconds) {
        return new Date(seconds * 1000).toLocaleString();
      }

      async function refresh() {
        const status = await fetch("/api/status").then((res) => res.json());
        activeRunId = status.run_id || activeRunId;
        els.version.textContent = `opencompass ${status.opencompass_version}${status.running ? " | running" : ""}`;
        els.startButton.disabled = Boolean(status.running);
        els.stopButton.disabled = !status.running;
        els.outputs.innerHTML = status.outputs.length
          ? status.outputs.map((item) => `<tr><td class="mono">${item.name}</td><td>${item.kind}</td><td>${formatTime(item.mtime)}</td></tr>`).join("")
          : `<tr><td colspan="3" class="muted">No outputs yet.</td></tr>`;
        const query = activeRunId ? `?run_id=${encodeURIComponent(activeRunId)}` : "";
        const log = await fetch(`/api/log${query}`).then((res) => res.text());
        if (log) els.log.textContent = log;
      }

      document.querySelectorAll("[data-preset]").forEach((button) => {
        button.addEventListener("click", () => {
          const preset = presets[button.dataset.preset];
          if (!preset) return;
          els.apiBaseUrl.value = preset.apiBaseUrl;
          els.modelName.value = preset.modelName;
          els.modelAbbr.value = preset.modelAbbr;
        });
      });

      els.form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const response = await fetch("/api/runs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payloadFromForm())
        });
        const body = await response.json();
        if (!response.ok) {
          els.log.textContent = body.detail || "Failed to start run.";
          return;
        }
        activeRunId = body.run_id;
        await refresh();
      });

      els.stopButton.addEventListener("click", async () => {
        await fetch("/api/runs/stop", { method: "POST" });
        await refresh();
      });

      refresh();
      setInterval(refresh, 3000);
    </script>
  </body>
</html>
"""
