# 协议参数 Markdown 整理模板

`docs/api/{provider}-{protocol}.md` 是协议参数矩阵的**唯一人工维护层**。运行 `npm run build:protocol-matrix` 后自动生成 `web/data/protocol-matrix.json` 供 Web UI 消费。

## Frontmatter（文件头 YAML）

每个协议文档必须以 `---` 包裹的 YAML 开头：

```yaml
---
channel_id: aliyun
protocol_id: chat_completions
doc_status: verified
doc_url: https://help.aliyun.com/zh/model-studio/qwen-api-via-openai-chat-completions
last_verified: 2026-06-25
compare: true
required_parameters: [model, messages]
parameter_groups:
  Core: [model, messages]
  Sampling: [temperature, top_p, presence_penalty, seed, stop, n]
  Length: [max_tokens, max_completion_tokens]
notes: "对照官方文档；矩阵仅收录 OpenAI 标准顶层参数。"
---
```

| 字段 | 说明 |
|------|------|
| `channel_id` | 与 Web `channel_id` 一致（如 `aliyun`、`deepseek`） |
| `protocol_id` | `chat_completions` \| `anthropic_messages` \| `responses_api` |
| `doc_status` | `verified` \| `partial` \| `missing` \| `internal` |
| `compare` | `false` 时不纳入横向测评对比 |
| `required_parameters` | 顶层必填字段；可覆盖协议默认值 |
| `parameter_groups` | 矩阵侧栏分组及参数列表 |
| `notes` | 维护备注，显示在文档徽章 tooltip |

## 正文结构

### 1. Required Request Fields

顶层必填字段（含 `messages` 的 role/content 说明）：

```markdown
## Required Request Fields

| Parameter | Type | Notes |
|---|---|---|
| `model` | `string` | Required. |
| `messages` | `array<object>` | Required. min 1；roles: system, user, assistant, tool |
```

### 2. Documented Request Parameters

统一 **6 列表格**（构建脚本只解析此格式）：

```markdown
## Documented Request Parameters

| Parameter | Type | Required | Default | Range | Notes |
|---|---|---|---|---|---|
| `temperature` | `float` | no | model-dependent | [0, 2) | |
| `messages` | `array<object>` | yes | — | min 1 | |
| `max_tokens` | `integer` | no | — | — | **Deprecated** |
```

列规则：

- **Type**：照抄该渠道官方 API 文档/OpenAPI 中的类型原文（如 Ali 的 `float`、OpenRouter 的 `double`、DeepSeek 的 `number`），**不要**跨渠道统一成 `number`
- **Required**：`yes` / `no` / `—`
- **Range**：`[0, 2)`、`(0, 1]`、`1–4`、`min 1, max 10`、`≤ 100`
- **Notes** 含 deprecated / 无效果 / Ignored → 自动生成 `effective` 标记
- 嵌套字段用点号路径：`messages[].role`、`stream_options.include_usage`

## 命名约定

| 协议 | 文件名 |
|------|--------|
| Chat Completions | `{provider}-chat.md` 或 `{provider}.md`（DeepSeek） |
| Anthropic Messages | `{provider}-message.md` |
| Responses API | `{provider}-response.md` |

## 日常工作流

1. 官方文档更新 → 只改对应 `docs/api/*.md`（类型字段按该渠道官方 API 原文收录）
2. `npm run build:protocol-matrix`
3. `node scripts/audit-protocol-types.mjs`（校验文档表格与矩阵类型一致）
4. 查看终端 coverage report
5. 刷新 Web `#protocols` 验证矩阵与约束抽屉

**不要**再维护 `web/lib/protocol-parameter-*.js` 或 `docs/archive/`。
