# Noctua 文档索引

`docs/` 按内容类型分为三个子目录。

## 目录结构

| 目录 | 用途 |
|------|------|
| [`api/`](api/) | 各渠道 API 协议参数摘要（**唯一人工维护层** → 自动生成 Web 矩阵） |
| [`errorcode/`](errorcode/) | 各渠道错误码参考（**人工层** + registry → 自动生成 Web 目录） |
| [`project/`](project/) | 项目内部方法论与运维文档 |

## 命名约定

- **API 协议**：`api/{provider}-{protocol}.md`（含 YAML frontmatter）
  - `chat` — Chat Completions
  - `message` — Anthropic Messages
  - `response` — Responses API
  - 部分渠道 Chat Completions 沿用 `{provider}.md`（如 `deepseek.md`）
- **错误码**：`errorcode/{provider}.md`

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

---

## 测评协议 — Web 参数矩阵

| 人工维护 | 自动生成 | Web 消费 |
|----------|----------|----------|
| `docs/api/*.md` + [protocol-md-template.md](project/protocol-md-template.md) | `web/data/protocol-matrix.json` | `#protocols` |

```bash
npm run build:protocol-matrix
npm run dev   # md 有变更时启动前自动重建
```

维护规则：[protocol-parameter-mapping.md](project/protocol-parameter-mapping.md)

---

## errorcode/ — 错误码

| 人工维护 | 自动生成 | Web 消费 |
|----------|----------|----------|
| `docs/errorcode/*.md` + `error-code-registry.json` | `web/data/error-code-catalog.json` | `#error-channels` / `#error-mapping` |

```bash
npm run build:error-code-catalog
```

维护规则：[error-code-mapping.md](project/error-code-mapping.md)

| 渠道 | 文件 |
|------|------|
| DeepSeek | [deepseek.md](errorcode/deepseek.md) |
| 阿里云百炼 | [ali.md](errorcode/ali.md) |
| MiniMax | [minimax.md](errorcode/minimax.md) |
| Moonshot | [moonshot.md](errorcode/moonshot.md) |
| OpenRouter | [openrouter.md](errorcode/openrouter.md) |
| StreamLake | [streamlake.md](errorcode/streamlake.md) |
| SiliconFlow | [siliconflow.md](errorcode/siliconflow.md) |
| 智谱 Zhipu | [zhipu.md](errorcode/zhipu.md) |

---

## project/ — 项目内部文档

| 文件 | 说明 |
|------|------|
| [protocol-md-template.md](project/protocol-md-template.md) | 协议 md 整理模板 |
| [protocol-parameter-mapping.md](project/protocol-parameter-mapping.md) | 测评协议参数矩阵维护 |
| [error-code-mapping.md](project/error-code-mapping.md) | 渠道错误码映射维护 |
| [capacity-probe-methodology.md](project/capacity-probe-methodology.md) | 容量探测方法论 |
