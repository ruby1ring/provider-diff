# Noctua 文档索引

`docs/` 按内容类型分为三个子目录，外加原始材料归档。

## 目录结构

| 目录 | 用途 |
|------|------|
| [`api/`](api/) | 各渠道 API 协议参数摘要与跨渠道参考 |
| [`errorcode/`](errorcode/) | 各渠道错误码参考 |
| [`project/`](project/) | 项目内部方法论与运维文档 |
| [`archive/`](archive/) | 原始导出与待归一化材料（飞书剪存、OpenAPI 全文等） |

## 命名约定

- **API 协议**：`api/{provider}-{protocol}.md`
  - `chat` — Chat Completions
  - `message` — Anthropic Messages
  - `response` — Responses API
  - 部分渠道 Chat Completions 沿用 `{provider}.md`（如 `deepseek.md`）
- **错误码**：`errorcode/{provider}.md`
- **原始材料**：`archive/{provider}-{protocol}-raw.{md,openapi.md}`

---

## api/ — API 协议与参考

### 各渠道协议摘要

| 渠道 | Chat Completions | Anthropic Messages | Responses API |
|------|------------------|--------------------|---------------|
| DeepSeek | [deepseek.md](api/deepseek.md) | [deepseek-message.md](api/deepseek-message.md) | — |
| Moonshot | [moonshot-chat.md](api/moonshot-chat.md) | — | — |
| 智谱 Zhipu | [zhipu-chat.md](api/zhipu-chat.md) | — | — |
| 阿里云百炼 | [ali-chat.md](api/ali-chat.md) | [ali-message.md](api/ali-message.md) | [ali-response.md](api/ali-response.md) |
| OpenRouter | [openrouter-chat.md](api/openrouter-chat.md) | [openrouter-message.md](api/openrouter-message.md) | [openrouter-response.md](api/openrouter-response.md) |
| MiniMax | [minimax-chat.md](api/minimax-chat.md) | [minimax-message.md](api/minimax-message.md) | [minimax-response.md](api/minimax-response.md) |
| SiliconFlow | [siliconflow-chat.md](api/siliconflow-chat.md) | [siliconflow-message.md](api/siliconflow-message.md) | — |
| StreamLake | [streamlake-chat.md](api/streamlake-chat.md) | [streamlake-message.md](api/streamlake-message.md) | [streamlake-response.md](api/streamlake-response.md) |

### 基准与跨渠道参考

| 文件 | 说明 |
|------|------|
| [openai.md](api/openai.md) | OpenAI 基准参数索引 |
| [claude.md](api/claude.md) | Anthropic Claude 参数索引 |
| [vllm.md](api/vllm.md) | vLLM 自托管 OpenAI-compat |
| [thinking-dialects.md](api/thinking-dialects.md) | thinking/reasoning 参数方言汇总 |
| [usage.md](api/usage.md) | `usage` 字段断言矩阵 |
| [chat-completion-openapi-thinking-requirements.md](api/chat-completion-openapi-thinking-requirements.md) | 对外 OpenAPI thinking 适配需求 |
| [openrouter.case.md](api/openrouter.case.md) | OpenRouter 官方 endpoint 测试导出（用例来源） |

---

## errorcode/ — 错误码

| 渠道 | 文件 |
|------|------|
| DeepSeek | [deepseek.md](errorcode/deepseek.md) |
| 阿里云百炼 | [ali.md](errorcode/ali.md) |
| MiniMax | [minimax.md](errorcode/minimax.md) |
| Moonshot | [moonshot.md](errorcode/moonshot.md) |
| OpenRouter | [openrouter.md](errorcode/openrouter.md) |
| StreamLake | [streamlake.md](errorcode/streamlake.md) |
| 智谱 Zhipu | [zhipu.md](errorcode/zhipu.md) |

---

## project/ — 项目内部文档

| 文件 | 说明 |
|------|------|
| [capacity-probe-methodology.md](project/capacity-probe-methodology.md) | 容量探测方法论 |
| [performance-benchmark-design.md](project/performance-benchmark-design.md) | 性能测试范围说明 |
| [branch-protection.md](project/branch-protection.md) | `main` 分支保护配置 |

---

## archive/ — 原始材料

未经 Noctua 结构化整理的原始导出，供对照与归一化脚本参考。详见 [`archive/`](archive/) 目录。
