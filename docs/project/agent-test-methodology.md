# Agent 测试方法论

Agent 测试（`kind: agent`）是 Noctua 的第三类测试：除了直接向网关发 HTTP 请求（chat/completions、messages），还**真实启动本地 CLI 编码 agent**（Claude Code / opencode / kilo），把它们指向被测网关，执行真实任务并校验结果。它验证的是 agent 客户端视角的端到端契约：认证注入、模型路由、工具调用（读/改/建/Bash/搜索）、多步工作流。

## 为什么需要

HTTP 协议测试验证「网关能正确响应请求」，但真实的 agent 客户端（Claude Code、opencode、kilo 等）有各自的协议方言、工具定义、上下文组装方式。一个网关可能对裸 HTTP 请求返回 200，却在被 agent 客户端调用时暴露问题：

- agent 发送的 messages 结构（如 Anthropic 风格 content blocks）与网关预期不符；
- agent 工具调用循环（tool_use / tool_result）在网关上的投影转换失败；
- 认证 header 方言（`x-api-key` vs `Authorization: Bearer`）不被网关接受；
- agent 的会话级行为（title 预请求、工具多轮）触发网关或上游限流。

Agent 测试把这些风险转化为可重复、可断言的用例。

## 架构

Agent 测试由 **本机 CLI**（`cli/noctua.mjs`）执行，不经过 Go 后端（Web 后端在 Docker 中运行，没有 agent 二进制）。后端在 `/api/providers` 中过滤 `kind: agent` 的 manifest，避免 Web UI 展示无法执行的 provider。

```
cli/noctua.mjs  (--endpoint-id agent_test)
  └─ AGENT_ADAPTERS: claude | opencode | kilo
       ├─ 配置注入：环境变量（claude）/ 临时配置文件（opencode/kilo）
       ├─ 无头命令构造
       └─ 输出解析：JSON result（claude）/ NDJSON 事件流（opencode/kilo）
  └─ 临时工作目录（mkdtemp）：
       ├─ 写入 setup_files（模拟项目）
       ├─ 执行 agent
       └─ 校验文件断言（file_created / file_content_*）
```

## 适配器协议

| 适配器 | 配置注入 | 无头命令 | 输出解析 |
| --- | --- | --- | --- |
| `claude` | `ANTHROPIC_BASE_URL`（网关根地址，**不带 `/v1`**，agent 自行拼 `/v1/messages`）+ `ANTHROPIC_API_KEY` + `ANTHROPIC_MODEL` | `claude --bare -p "<prompt>" --output-format json --max-turns N --dangerously-skip-permissions` | 单条 JSON：`is_error` / `result` / `num_turns` / `total_cost_usd` |
| `opencode` | 临时 `opencode.json`：`provider.tokenplus = { npm: "@ai-sdk/openai-compatible", options: { baseURL, apiKey }, models: { <model>: {...} } }`，用 `OPENCODE_CONFIG` 显式指向 | `opencode run -m tokenplus/<model> --format json --auto --title noctua-agent-test --pure "<prompt>"` | NDJSON 事件流：`text` 事件（`part.text`）、`error` 事件 |
| `kilo` | 同上，但文件名 `kilo.jsonc`（schema `https://app.kilo.ai/config.json`），**必须用 `KILO_CONFIG` 显式指定**（kilo 不自动发现 cwd 配置） | `kilo run -m tokenplus/<model> --format json --auto --title noctua-agent-test --pure "<prompt>"` | 同上 |

关键点：

- **`--bare`（claude）**：跳过 hooks/plugins/MCP，启动快，且要求 API key（CI 友好）。
- **`--title` + `--pure`（opencode/kilo）**：`--title` 跳过 title 预请求（否则每次 run 先发一个小模型请求生成会话标题，请求量翻倍）；`--pure` 跳过外部插件，避免加载用户全局 agent/插件配置。
- **`--auto`**：自动批准权限（工具调用场景必需；非交互模式默认拒绝权限）。

## 用例 schema

```json
{
  "case_id": "tp_agent_claude_edit_code",
  "agent": "claude",
  "channel": "siliconflow",
  "prompt": "Fix the bug in math.js: the 'add' function currently subtracts but should add. Edit the file.",
  "model": "deepseek-ai/DeepSeek-V4-Pro",
  "args": ["--max-turns", "5", "--dangerously-skip-permissions"],
  "setup_files": [{ "path": "math.js", "content": "..." }],
  "expect": {
    "exit_code": 0,
    "no_error": true,
    "output_non_empty": true,
    "output_contains": "greet",
    "output_contains_any": ["secrets.js"],
    "file_created": ["hello.txt"],
    "file_content_contains": [{ "path": "math.js", "contains": "a + b" }],
    "file_content_not_contains": [{ "path": "math.js", "contains": "a - b" }]
  }
}
```

### 断言类型

| 断言 | 含义 |
| --- | --- |
| `exit_code` | 进程退出码 |
| `no_error` | 结构化输出中无 error（claude `is_error` / opencode·kilo `error` 事件） |
| `output_non_empty` | 文本输出非空 |
| `output_contains` | 文本输出包含指定子串 |
| `output_contains_any` | 文本输出包含任一子串 |
| `file_created` | 运行后工作目录中存在指定文件 |
| `file_content_contains` | 运行后文件内容包含子串 |
| `file_content_not_contains` | 运行后文件内容不包含子串（如验证 bug 修复） |

## 用例矩阵

`payloads/tokenplus_agents/` 提供 3 agent × 7 场景 = 21 个场景用例 + 4 个渠道用例：

| 场景 | category | 验证能力 | 典型断言 |
| --- | --- | --- | --- |
| 基本对话 | `basic` | 连通性 + 文本生成 | exit 0 + output_non_empty |
| 阅读代码 | `read_code` | Read 工具 | output_contains 函数名 |
| 修改代码 | `edit_code` | Edit 工具 | file_content_contains + file_content_not_contains |
| 调用 Bash | `tools_bash` | Bash 工具 | output_contains 命令输出 |
| 创建文件 | `create_file` | Write 工具 | file_created + file_content_contains |
| 搜索代码 | `search_code` | Grep/Glob 工具 | output_contains_any 文件名 |
| 多步任务 | `multistep` | 读→改→建组合 | 组合断言 |

渠道用例（`category: channel`）用 `channel` 字段标识上游渠道，`model` 用网关 channel-probe 配置中该渠道的对外模型名，验证「agent → 网关 → 具体上游渠道」整条链路。

## 执行控制

| 机制 | 说明 |
| --- | --- |
| 串行执行 | agent 测试强制并发 1（opencode/kilo 共享全局 db，并发有锁冲突风险） |
| `--case-delay <ms>` | 用例间固定间隔（默认 6000ms），缓解上游渠道限流 |
| 429 退避 | 重试检测到 rate limit / 429 时等待更久（attempt × 15s）再重试 |
| 3 次复跑 | 非确定性失败重试至多 3 次，`flaky_recovered` 标记 |
| 超时 | 单次执行 `-t <ms>`（默认 90000） |

## 已踩的坑（实现时的重要发现）

1. **`PWD` 环境变量 vs 进程 cwd**：opencode/kilo 用 `PWD` 环境变量而非进程 cwd 定位工作目录。Node `spawn` 继承父进程 `PWD`，导致 agent 工具在**错误目录**读写文件（文件写到了调用者目录）。修复：`env.PWD = workDir`。手动复现 agent 命令时务必先 `cd` 到目标目录。

2. **kilo 不自动发现 cwd 配置**：opencode 会加载 cwd 下的 `opencode.json`，但 kilo 不会发现 `kilo.jsonc`，必须用 `KILO_CONFIG` 环境变量显式指向。

3. **opencode/kilo 的 title 预请求**：每次 `opencode run` 默认先发一个小模型请求生成会话标题。显式 `--title` 跳过，请求量减半。

4. **全局配置污染**：opencode/kilo 会加载用户全局配置（`~/.config/opencode/opencode.json`、插件、自定义 agent），导致行为不确定、启动慢。`--pure` 跳过外部插件。

5. **channel-probe 网关按 model 精确路由**：`model` 必须是 `channel-probe.yaml` 中注册的对外模型名。重复 model 名会互相覆盖（后注册者生效），导致部分渠道无法路由。messages 与 chat 端点的可用 model 可能不同（如百炼 chat=`deepseek-v4-pro`、messages=`glm-5.2`）。

6. **上游限流**：真实渠道对连续请求限流（burst 后 429 + `Retry-After`）。测试工具层只能缓解（串行 + 间隔 + 退避），无法消除；渠道侧配额恢复后重试即可。

## 扩展新 agent

在 `cli/noctua.mjs` 的 `AGENT_ADAPTERS` 注册适配器：

```js
codex: {
  bin: "codex",
  configFile: "config.toml",
  configEnv: "CODEX_CONFIG",
  buildConfig({ baseURL, apiKey, model }) { /* ... */ },
  buildArgs({ prompt, model, args }) { return ["exec", "-m", model, ...(args ?? []), prompt]; },
  parseOutput(stdout, stderr) { /* ... */ },
},
```

用例 `agent` 字段填入适配器键即可，无需改执行引擎。
