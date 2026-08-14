# Noctua

**Noctua** is an LLM provider protocol compatibility and gateway policy testing tool. It runs structured cases against OpenAI-compatible (and provider-specific) Chat Completions APIs to show which parameters are supported, rejected, or silently ignored, and how response shapes differ from the baseline.

This repository’s internal name remains **provider-diff** for Docker images, Compose services, CI, and the embedded backend binary. The product-facing name (Web UI, macOS app, reports) is **Noctua**.

Product requirements for the compatibility testing flow: [prd.md](prd.md).

## Naming

| Context | Name |
| --- | --- |
| Product, Web UI, macOS `.app`, exported reports | **Noctua** |
| Git repository, npm package, Docker image / Compose service | `provider-diff` |
| Embedded backend process binary | `provider-diff-backend` |
| macOS Bundle ID (desktop app) | `cn.siliconflow.noctua` |

## Quick start

Start the static frontend and Go backend locally:

```sh
npm run dev
```

Open http://127.0.0.1:4173/web/ (or the URL printed by the dev script). Choose a provider, enter an API key in the browser, and run compatibility cases.

Requirements: Node.js (for `npm`), Python 3 (`http.server`), and Go (for `go run` in `backend/`).

## Local configuration

API keys stay on your machine and are not committed. To use a local config file for non-UI tooling:

```sh
cp config.example.yaml config.yaml
```

Replace the placeholder API keys in `config.yaml`. The file is listed in `.gitignore` and is not pushed to GitHub.

Channel keys used by **测评模型 → 查询渠道** (live model list lookup). Section names match **测评渠道** platform ids in `web/lib/channel-catalog.js`:

| `config.yaml` section | 测评渠道 |
| --- | --- |
| `deepseek` | DeepSeek 开放平台 |
| `moonshot` | Moonshot 开放平台 |
| `zhipu` | 智谱开放平台 |
| `minimax` | MiniMax 开放平台 |
| `aliyun-cn` | 阿里云百炼（中国-华北 2） |
| `aliyun-us` | 阿里云百炼（美国-弗吉尼亚） |
| `siliconflow-cn` | SiliconFlow CN |
| `siliconflow-com` | SiliconFlow COM |
| `openrouter` | OpenRouter |
| `tokenplus` | TokenPlus |
| `sf-router-cn` | SF Silinex CN |
| `sf-router-com` | SF Silinex COM |
| `streamlake-cn` | 快手万擎（StreamLake） |
| `baidu-qifan` | 百度千帆（ModelBuilder v2，OpenAI 兼容） |

Legacy section names (`ali`, `siliconflow`, `streamlake`, `baidu`) are still accepted as fallbacks for scripts. Environment variables (e.g. `SILICONFLOW_API_KEY`, `WQ_API_KEY` for StreamLake, `QIANFAN_API_KEY` for 百度千帆) are used when no matching section is found.

## Capacity / model-limit probes

The capacity probe measures the four 模型限制 metrics from a provider's model card — 最大输入长度 / 最大输出长度 / 上下文长度 / 最大思考长度 — each on three axes: **是否支持传 (accept)** / **传了是否生效 (effective)** / **最大能传多少 (max)**.

```sh
node scripts/probe-capacity.js
```

The probe reads `config.yaml`, uses each provider manifest's default model, tries common K/M tiers from large to small, and writes a timestamped JSON report under `outputs/capacity-probes/`. Each tier is emitted as a capacity test case with a stable `case_id`.

Probe kinds (`--probes`, default `output,context`):

- `output` (`max_output`) — largest accepted output budget tier.
- `output-effective` (`max_output_effective`) — forces a long generation at small caps and checks the output is actually truncated (`finish_reason=length`, `completion_tokens≈cap`), proving `max_tokens` really takes effect.
- `input` (`max_input`) — largest accepted input length, independent of the context window.
- `context` (`total_context`) — largest accepted total context tier. **Balanced by default**: when `input` and `output` are probed first, each context tier is split into input/output below the measured caps so a context that exceeds the input cap can still be reached (`--no-context-balanced` for the legacy input-heavy mode).
- `thinking-budget` (`thinking_budget`) — for reasoning models only: tests the per-provider thinking-budget field (`thinking_budget` / `thinking.budget_tokens` / `reasoning.max_tokens`; MiniMax has none) for acceptance, max accepted value, and whether `reasoning_tokens` scale with the budget.

Useful options:

```sh
node scripts/probe-capacity.js --providers openai,deepseek
node scripts/probe-capacity.js --endpoint-id all --providers claude,openrouter
node scripts/probe-capacity.js --providers siliconflow --model siliconflow=Pro/zai-org/GLM-4.7 --probes input,output,output-effective,thinking-budget,context
node scripts/probe-capacity.js --providers vllm --model vllm=Qwen/Qwen3-8B --context-candidates 512k,256k,128k
node scripts/probe-capacity.js --providers ali,deepseek,minimax --max-concurrency 3
node scripts/probe-capacity.js --dry-run
```

`max_output` / `max_input` / `total_context` are acceptance probes for common tiers; they confirm the largest requested tier the endpoint accepts, not that the model generated that many tokens (`max_output_effective` covers actual truncation). `total_context` keeps the conclusion on common tiers such as `128k`, `256k`, and `1m`, but the actual long prompt is built with a proportional safety margin (default `5%`) to avoid tokenizer and message-wrapper edge effects; attempt details include `tested_total_context_display` and provider `usage` when available. K/M labels use 1024 units: `128k = 131072`, `1m = 1048576`. The default mode stops after a tier boundary is bracketed; `--exhaustive` forces every tier. Target-level concurrency is available with `--max-concurrency` (tiers inside one target stay sequential).

To surface measured-vs-documented limits in the 测评模型 model-intro drawer, aggregate reports into `web/data/model-limits-observed.json`:

```sh
npm run build:model-limits
```

See `docs/project/capacity-probe-methodology.md` for the full methodology, provider thinking-budget dialects, balanced context, and result interpretation rules.

## Agent tests (CLI coding agents)

Beyond raw HTTP protocol cases, Noctua can drive **real local CLI coding agents** — Claude Code, opencode, and kilo — through a gateway. This verifies the end-to-end contract an actual agent client sees: auth injection, model routing, tool calls (read / edit / create / bash / grep), and multi-step workflows.

Agent tests are executed by the local CLI (`cli/noctua.mjs`) because they spawn local processes. They are **not** available in the Web UI or the Docker backend (no agent binaries there); the backend deliberately filters `kind: agent` manifests from `/api/providers`.

### Prerequisites (macOS)

Agent tests drive your locally installed agent CLIs. Noctua ships only the adapters and cases (all open source); the agent binaries themselves are installed by you. Check what's installed and get one-line install commands:

```sh
node scripts/check-agents.mjs
# ✓ claude code    2.1.229
# ✗ opencode       未安装
#         安装：curl -fsSL https://opencode.ai/install | bash
```

| Agent | macOS install command |
| --- | --- |
| Claude Code | `curl -fsSL https://claude.ai/install.sh \| bash` |
| opencode | `curl -fsSL https://opencode.ai/install \| bash` |
| kilo | `npm install -g @kilocode/cli@latest` |

Agent binaries are intentionally **not** bundled (Claude Code is proprietary and cannot be redistributed; the other two are MIT). Missing agents are skipped gracefully at runtime — only cases for installed agents run.

### Quick start

```sh
# 检测本机 agent 安装状态 + 安装指引
node scripts/check-agents.mjs

# 列出 tokenplus 的 agent 测试用例
node cli/noctua.mjs -p tokenplus --endpoint-id agent_test --list-cases

# 跑全部 25 个用例（经本地网关）
node cli/noctua.mjs -p tokenplus --endpoint-id agent_test --cases all \
  -k sk-probe-local -u http://127.0.0.1:8899/v1

# 只跑某个 agent / 某个场景 / 某个渠道
node cli/noctua.mjs -p tokenplus --endpoint-id agent_test --agents opencode -k <key> -u <base-url>
node cli/noctua.mjs -p tokenplus --endpoint-id agent_test --category edit_code -k <key> -u <base-url>
node cli/noctua.mjs -p tokenplus --endpoint-id agent_test --category channel -k <key> -u <base-url>

# 只看将要执行的命令（不真正运行）
node cli/noctua.mjs -p tokenplus --endpoint-id agent_test --cases all --dry-run -k <key>

# 输出 JSON + Markdown 报告
node cli/noctua.mjs -p tokenplus --endpoint-id agent_test --cases all \
  -k <key> -u <base-url> -o outputs/agents.json --md outputs/agents.md
```

### How it works

| Agent | 配置注入 | 无头命令 | 成功判定 |
| --- | --- | --- | --- |
| Claude Code | 环境变量 `ANTHROPIC_BASE_URL` + `ANTHROPIC_API_KEY` + `ANTHROPIC_MODEL`（零配置文件） | `claude --bare -p "<prompt>" --output-format json --max-turns N` | JSON `is_error:false` + `result` 非空 + exit 0 |
| opencode | 临时项目级 `opencode.json` 定义 provider（`@ai-sdk/openai-compatible` + baseURL + apiKey + models），`OPENCODE_CONFIG` 指向 | `opencode run -m tokenplus/<model> --format json --auto --title ... --pure "<prompt>"` | NDJSON 事件流：有 `text` 事件、无 `error` 事件 |
| kilo | 同 opencode，但配置文件名 `kilo.jsonc` + **必须 `KILO_CONFIG` 环境变量显式指定** | `kilo run -m tokenplus/<model> --format json --auto --title ... --pure "<prompt>"` | 同上 |

适配器定义在 `cli/noctua.mjs` 的 `AGENT_ADAPTERS`。每个 agent 通过环境变量或临时配置文件注入网关地址 / key / 模型，然后在**临时工作目录**（`mkdtemp`）中执行任务，运行后校验工作目录中的文件状态。

### 用例目录规范

Agent 用例位于 `payloads/<provider>_agents/`（`--endpoint-id agent_test` 加载），结构：

```text
payloads/tokenplus_agents/
  manifest.json          # kind: "agent", endpoint: "agent_test", cases 列表
  001_claude_basic.json  # 单个用例：agent + prompt + args + setup_files + expect
```

用例 schema：

```json
{
  "case_id": "tp_agent_claude_edit_code",
  "agent": "claude",                    // claude | opencode | kilo（对应 AGENT_ADAPTERS 键）
  "channel": "siliconflow",             // 可选：标识经网关路由到的上游渠道
  "prompt": "Fix the bug in math.js ...",
  "model": "deepseek-ai/DeepSeek-V4-Pro", // 网关对外 model 名（channel-probe 按 model 精确路由）
  "args": ["--max-turns", "5"],         // 可选：追加到无头命令的参数
  "setup_files": [                      // 可选：预置到临时工作目录的项目文件
    { "path": "math.js", "content": "..." }
  ],
  "expect": {
    "exit_code": 0,
    "no_error": true,
    "output_non_empty": true,
    "output_contains": "greet",              // 输出文本包含
    "output_contains_any": ["secrets.js"],   // 输出文本包含任一
    "file_created": ["hello.txt"],           // 运行后工作目录中应存在
    "file_content_contains": [{ "path": "math.js", "contains": "a + b" }],
    "file_content_not_contains": [{ "path": "math.js", "contains": "a - b" }]
  }
}
```

内置场景（`payloads/tokenplus_agents/` 覆盖 3 agent × 7 场景 = 21 个用例）：`basic` 基本对话、`read_code` 阅读代码、`edit_code` 修改代码、`tools_bash` 调用 Bash、`create_file` 创建文件、`search_code` Grep/Glob 搜索、`multistep` 多步任务。渠道用例（`category: channel`）验证经网关路由到具体上游渠道（如硅基流动 / 百炼 / 百度 / 数据宝）。

### 已知注意事项

- **上游限流**：真实渠道对连续请求限流（burst 后 429）。用例默认串行（agent 测试强制并发 1），用例间默认间隔 `--case-delay 6000`；遇到 429 重试等待更久。跑大量用例时保持默认间隔。
- **`PWD` 陷阱**：opencode / kilo 用 `PWD` 环境变量（而非进程 cwd）定位工作目录。CLI 已注入 `env.PWD = workDir`；如果你手动复现 agent 命令，务必先 `cd` 到目标目录。
- **kilo 不自动发现 cwd 配置**：必须用 `KILO_CONFIG` 显式指定配置文件（CLI 已处理）。
- **model 名唯一性**：经 channel-probe 网关路由时，`model` 必须是网关 `channel-probe.yaml` 中注册的对外模型名（网关按 model 精确路由，重复名会互相覆盖）。messages 端点（claude 走 `/v1/messages`）与 chat 端点（opencode/kilo 走 `/v1/chat/completions`）的可用 model 可能不同，分别验证。

### Agent 适配器扩展

新增 agent（如 codex / aider）只需在 `cli/noctua.mjs` 的 `AGENT_ADAPTERS` 注册一个适配器：`bin`（可执行名）、`baseUrlEnv/apiKeyEnv/modelEnv` 或 `configFile/configEnv`（配置注入方式）、`buildArgs`（无头命令）、`parseOutput`（输出解析）。用例 `agent` 字段填入适配器键即可。

## Generated outputs

Files under `outputs/` are not committed. See [outputs/README.md](outputs/README.md).

To regenerate the optional startup baseline import bundle:

```sh
node scripts/run-original-baselines.js
```

## macOS desktop (Noctua)

Build a self-contained macOS app with the UI and embedded Go backend. **These commands run only on macOS**.

**Requirements:** macOS, Node.js, Go, Xcode Command Line Tools (`iconutil`).

### Production DMG

```sh
npm install
npm run dist:dmg
```

Output: `dist/Noctua-<version>-<arch>.dmg`.

The app starts its own backend on a free `127.0.0.1` port and passes that URL into the UI. Docker Compose is not required.

Unsigned local builds may be blocked on first launch; use **right-click → Open** if Gatekeeper warns.

GitHub Actions also builds the DMG from the `Release DMG` workflow on pushes to `main` or manual runs from `main`. Each successful run uploads a temporary workflow artifact named `Noctua-macOS-DMG`. Pushes to `main`, or manual runs with `publish_release=true`, replace the fixed `latest` GitHub Release with one asset named `Noctua-latest-macOS.dmg`, so the public download URL stays stable: `https://github.com/ruby1ring/provider-diff/releases/download/latest/Noctua-latest-macOS.dmg`.

**Bundle ID:** `cn.siliconflow.noctua`.

### Local smoke test (no DMG)

```sh
npm run desktop:dev
```

### Optional bundled services

EvalScope and OpenCompass are not in the DMG by default. The shell can start bundled executables when present at package time:

- `desktop/services/evalscope-service`
- `desktop/services/opencompass-service`

If they are missing, the EvalScope / OpenCompass tabs use external URLs (same as the web dev flow).

## Docker Compose

Start the **provider-diff** stack (Noctua UI + Go API + EvalScope + OpenCompass):

```sh
docker compose up --build
```

Open http://localhost:4173/web/.

If Docker Hub is slow or blocked, pin local base images:

```sh
GO_BASE_IMAGE=golang:1.24.8-alpine \
PYTHON_BASE_IMAGE=python:3.12-slim \
EVALSCOPE_BASE_IMAGE=python:3.12-slim \
OPENCOMPASS_BASE_IMAGE=python:3.12-slim \
docker compose up --build
```

### Published ports

| Port | Service |
| --- | --- |
| `4173` | Web UI (Noctua branding) |
| `8080` | Go backend API (`provider-diff-backend` in container) |
| `9000` | EvalScope dashboard — http://localhost:9000/dashboard |
| `9100` | OpenCompass Web — http://localhost:9100/ |

OpenCompass is also available from the OpenCompass tab in the UI.

## Docker image (API + UI only)

```sh
docker build -t provider-diff .
docker run --rm -p 4173:4173 -p 8080:8080 provider-diff
```

Open http://localhost:4173/web/. The UI expects the backend at http://localhost:8080 — publish both ports.

## CI/CD

The workflow in `.github/workflows/deploy.yml` validates and deploys `main` with Docker Compose on the self-hosted runner labeled `provider-diff`.

Register the runner on `dev-02`:

```sh
ssh chentianyu@10.60.30.2
cd /data/services/actions-runner/provider-diff
RUNNER_TOKEN=<github-registration-token> ./setup-github-runner.sh
nohup ./run.sh > runner.log 2>&1 &
```

Create the registration token from GitHub: **Settings → Actions → Runners → New self-hosted runner**.

## Troubleshooting

### `build/icon.icns` missing or DMG build fails on icon

On macOS, regenerate the icon set (also run automatically by `npm run dist:dmg`):

```sh
bash scripts/build-mac-icon.sh
```

Ensure `assets/noctua/icon.png` exists in the repo (1024×1024 source for the app icon).

### Header logo does not appear

Confirm `assets/noctua/icon.png` is present and that you open the UI via `http://127.0.0.1:4173/web/` (not a `file://` path without assets).

### Browser history or Feishu settings seem empty after upgrade

The UI migrates data from legacy `llm-rosetta-*` and `providerx-*` localStorage keys to `noctua-*` on first read. Reload once; no manual export is required.

### `npm run desktop:dev` or `dist:dmg` fails on Linux / Windows

Desktop packaging is **macOS-only** by design (`scripts/build-dmg.js`). Use `npm run dev` or Docker on other platforms.

## Runtime check (maintainers)

After branding or packaging changes, on macOS:

```sh
cd backend && go test ./...
bash scripts/build-mac-icon.sh
npm run dev
# optional: npm run desktop:dev
# optional: npm run dist:dmg
```

Web/Docker flows do not depend on `build/icon.icns` or Electron.

## 协作开发

请勿在本地长期直接修改并 push `main`。请使用功能分支 + Pull Request，流程见 [CONTRIBUTING.md](CONTRIBUTING.md)。仓库管理员可为 `main` 配置分支保护，见 [docs/project/branch-protection.md](docs/project/branch-protection.md)。
