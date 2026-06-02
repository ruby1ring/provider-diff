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
    models: str = Field(default="gpt_4o_2024_05_13")
    datasets: str = Field(default="demo_gsm8k_chat_gen")
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

    models = shlex.split(payload.models)
    datasets = shlex.split(payload.datasets)
    extra_args = shlex.split(payload.extra_args)
    if not models or not datasets:
        raise HTTPException(status_code=400, detail="models and datasets are required.")

    command = [
        "opencompass",
        "--models",
        *models,
        "--datasets",
        *datasets,
        "--work-dir",
        str(target_dir),
        *extra_args,
    ]

    metadata = {
        "run_id": run_id,
        "command": command,
        "created_at": int(time.time()),
    }
    (target_dir / "request.json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")

    log_file = (target_dir / "opencompass.log").open("w", encoding="utf-8")
    log_file.write("$ " + " ".join(shlex.quote(part) for part in command) + "\n\n")
    log_file.flush()
    current_process = subprocess.Popen(command, stdout=log_file, stderr=subprocess.STDOUT, text=True)
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
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>OpenCompass Web</title>
    <style>
      :root {
        --bg: #f7f7f8;
        --surface: #fff;
        --border: #e2e3e7;
        --text: #22252a;
        --muted: #6f737c;
        --brand: #2764e8;
        --ok: #13895d;
        --warn: #b76b00;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      * { box-sizing: border-box; }
      body { margin: 0; background: var(--bg); color: var(--text); font-size: 14px; }
      header {
        display: flex; align-items: center; justify-content: space-between; gap: 12px;
        height: 56px; padding: 0 18px; background: var(--surface); border-bottom: 1px solid var(--border);
      }
      h1 { margin: 0; font-size: 18px; letter-spacing: 0; }
      main { width: min(1280px, calc(100vw - 24px)); margin: 12px auto 28px; display: grid; gap: 12px; }
      .grid { display: grid; grid-template-columns: 0.95fr 1.05fr; gap: 12px; }
      .panel { border: 1px solid var(--border); border-radius: 8px; background: var(--surface); padding: 14px; }
      .status { display: flex; align-items: center; gap: 8px; color: var(--muted); }
      .dot { width: 8px; height: 8px; border-radius: 99px; background: var(--ok); }
      label { display: grid; gap: 5px; color: var(--muted); font-size: 12px; font-weight: 650; }
      input { width: 100%; height: 34px; border: 1px solid var(--border); border-radius: 6px; padding: 0 9px; color: var(--text); }
      form { display: grid; gap: 10px; }
      button, a.button {
        display: inline-flex; align-items: center; justify-content: center; min-height: 34px;
        border: 1px solid var(--border); border-radius: 6px; padding: 0 12px; color: var(--text);
        background: #fff; cursor: pointer; text-decoration: none; font-weight: 650;
      }
      button.primary { border-color: var(--brand); background: var(--brand); color: #fff; }
      button:disabled { opacity: 0.55; cursor: not-allowed; }
      .actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
      .muted { color: var(--muted); }
      .mono { font-family: "SFMono-Regular", "Cascadia Code", Consolas, monospace; }
      pre {
        min-height: 420px; max-height: calc(100vh - 210px); overflow: auto; margin: 0;
        border: 1px solid var(--border); border-radius: 7px; padding: 12px; background: #111418; color: #d6e0ea;
        white-space: pre-wrap; overflow-wrap: anywhere; font-size: 12px; line-height: 1.45;
      }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th, td { border-bottom: 1px solid var(--border); padding: 7px 5px; text-align: left; vertical-align: top; }
      th { color: var(--muted); font-weight: 700; }
      .links { display: flex; flex-wrap: wrap; gap: 8px; }
      @media (max-width: 860px) { .grid { grid-template-columns: 1fr; } }
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
            <label>Models
              <input id="models" class="mono" value="gpt_4o_2024_05_13" autocomplete="off" />
            </label>
            <label>Datasets
              <input id="datasets" class="mono" value="demo_gsm8k_chat_gen" autocomplete="off" />
            </label>
            <label>Extra args
              <input id="extraArgs" class="mono" value="--debug" autocomplete="off" />
            </label>
            <div class="actions">
              <button id="startButton" class="primary" type="submit">Start run</button>
              <button id="stopButton" type="button">Stop</button>
              <a class="button" href="https://rank.opencompass.org.cn/home" target="_blank" rel="noopener noreferrer">CompassRank</a>
              <a class="button" href="https://hub.opencompass.org.cn/home" target="_blank" rel="noopener noreferrer">CompassHub</a>
              <a class="button" href="https://opencompass.readthedocs.io/" target="_blank" rel="noopener noreferrer">Docs</a>
            </div>
          </form>
        </section>
        <section class="panel">
          <table>
            <thead><tr><th>Output</th><th>Kind</th><th>Updated</th></tr></thead>
            <tbody id="outputs"><tr><td colspan="3" class="muted">No outputs yet.</td></tr></tbody>
          </table>
        </section>
      </div>
      <section class="panel">
        <pre id="log">Waiting for OpenCompass.</pre>
      </section>
    </main>
    <script>
      const els = {
        version: document.querySelector("#version"),
        outputs: document.querySelector("#outputs"),
        log: document.querySelector("#log"),
        form: document.querySelector("#runForm"),
        models: document.querySelector("#models"),
        datasets: document.querySelector("#datasets"),
        extraArgs: document.querySelector("#extraArgs"),
        startButton: document.querySelector("#startButton"),
        stopButton: document.querySelector("#stopButton")
      };
      let activeRunId = null;

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

      els.form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const response = await fetch("/api/runs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            models: els.models.value,
            datasets: els.datasets.value,
            extra_args: els.extraArgs.value
          })
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
