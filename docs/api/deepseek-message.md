---
channel_id: deepseek
protocol_id: anthropic_messages
doc_status: verified
doc_url: "https://api-docs.deepseek.com/zh-cn/guides/anthropic_api"
last_verified: 2026-06-16
compare: true
required_parameters: [model, messages, max_tokens]
parameter_groups:
  Core: [model, messages, max_tokens, system]
  Sampling: [temperature, top_p, stop_sequences]
  Reasoning.Switch: [thinking]
  Output.Structure: [output_config]
  Tools: [tools, tools[].name, tools[].description, tools[].input_schema, tool_choice]
  Protocol: [stream]
  Metadata: [metadata, metadata.user_id]
  Unsupported: [top_k, container, mcp_servers, service_tier]
notes: 对照 docs/api/deepseek-message.md（2026-06-16）。temperature [0,2]；thinking.budget_tokens Ignored。 类型字段按该渠道官方 API 原文收录。
---

# DeepSeek Anthropic Messages API Notes


## Endpoint

| Item | Value |
|---|---|
| Base URL | `https://api.deepseek.com/anthropic` |
| Messages | `POST https://api.deepseek.com/anthropic/v1/messages` |

SDK 配置示例：

```bash
export ANTHROPIC_BASE_URL=https://api.deepseek.com/anthropic
export ANTHROPIC_API_KEY=${YOUR_API_KEY}
```

## Authentication

| Header | Support |
|---|---|
| `x-api-key` | Fully Supported |
| `anthropic-version` | Ignored |
| `anthropic-beta` | Ignored |

## Models

| Input model | Mapped to |
|---|---|
| `deepseek-v4-pro` | 直接使用 |
| `deepseek-v4-flash` | 直接使用 |
| 不支持的模型名 | 自动映射到 `deepseek-v4-flash` |
| `claude-opus*` | `deepseek-v4-pro` |
| `claude-haiku*` / `claude-sonnet*` | `deepseek-v4-flash` |

## Required Request Fields

| Parameter | Type | Notes |
|---|---|---|
| `model` | `string` | 使用 DeepSeek 模型名（见上表映射） |
| `messages` | `array` | Anthropic Messages 格式 |
| `max_tokens` | `integer` | 官方示例必填 |

## Documented Request Parameters

| Parameter | Type | Notes |
|---|---|---|
| `model` | `string` | 见 Models 映射 |
| `max_tokens` | `integer` | 官方示例必填 |
| `system` | `string \| array` | |
| `messages` | `array` | Anthropic Messages 格式；见 Message Fields |
| `stream` | `boolean` | |
| `stop_sequences` | `array<string>` | |
| `temperature` | `number` | 范围 **[0.0, 2.0]** |
| `top_p` | `number` | |
| `top_k` | `integer` | Ignored |
| `thinking` | `object` | `budget_tokens` **Ignored** |
| `output_config` | `object` | 仅 `effort` 支持 |
| `metadata` | `object` | 仅 `user_id` 支持，其余 Ignored |
| `container` | `object` | Ignored |
| `mcp_servers` | `array` | Ignored |
| `service_tier` | `string` | Ignored |

### Support status (reference)

| Parameter | Support Status | Notes |
|---|---|---|
| `model` | Use DeepSeek Model Instead | 见 Models 映射 |
| `max_tokens` | Fully Supported | |
| `system` | Fully Supported | |
| `messages` | Fully Supported | 见 Message Fields |
| `stream` | Fully Supported | |
| `stop_sequences` | Fully Supported | |
| `temperature` | Fully Supported | 范围 **[0.0, 2.0]** |
| `top_p` | Fully Supported | |
| `top_k` | Ignored | |
| `thinking` | Supported | `budget_tokens` **Ignored** |
| `output_config` | Partial | 仅 `effort` 支持 |
| `metadata` | Partial | 仅 `user_id` 支持，其余 Ignored |
| `container` | Ignored | |
| `mcp_servers` | Ignored | |
| `service_tier` | Ignored | |

## Tool Fields

### `tools[]`

| Field | Support Status |
|---|---|
| `name` | Fully Supported |
| `description` | Fully Supported |
| `input_schema` | Fully Supported |
| `cache_control` | Ignored |

### `tool_choice`

| Value | Support Status |
|---|---|
| `none` | Fully Supported |
| `auto` | Supported（`disable_parallel_tool_use` Ignored） |
| `any` | Supported（`disable_parallel_tool_use` Ignored） |
| `tool` | Supported（`disable_parallel_tool_use` Ignored） |

## Message Fields (`messages[].content`)

| Variant | Sub-Field | Support Status |
|---|---|---|
| `string` | — | Fully Supported |
| `array`, `type="text"` | `text` | Fully Supported |
| | `cache_control` | Ignored |
| | `citations` | Ignored |
| `array`, `type="image"` | — | **Not Supported** |
| `array`, `type="document"` | — | **Not Supported** |
| `array`, `type="search_result"` | — | **Not Supported** |
| `array`, `type="thinking"` | — | Supported |
| `array`, `type="redacted_thinking"` | — | **Not Supported** |
| `array`, `type="tool_use"` | `id` | Fully Supported |
| | `name` | Fully Supported |
| | `input` | Fully Supported |
| | `cache_control` | Ignored |
| `array`, `type="tool_result"` | `tool_use_id` | Fully Supported |
| | `content` | Fully Supported |
| | `cache_control` | Ignored |
| | `is_error` | Ignored |
| `array`, `type="server_tool_use"` | — | Supported |
| `array`, `type="web_search_tool_result"` | — | Supported |
| `array`, `type="code_execution_tool_result"` | — | **Not Supported** |
| `array`, `type="mcp_tool_use"` | — | **Not Supported** |
| `array`, `type="mcp_tool_result"` | — | **Not Supported** |
| `array`, `type="container_upload"` | — | **Not Supported** |

## 实测：temperature 字面量

对应测评 case 分组「协议 / 采样」：`temperature` 分别传入 JSON integer `1`、`2` 与 float `1.0`、`2.0`。

| 传入值 | JSON 类型 | 官方文档 | 实测 (Noctua) | 备注 |
|---|---|---|---|---|
| `1` | integer | 类型 `number`；范围 `[0, 2]` | 待实测 | |
| `2` | integer | 类型 `number`；范围 `[0, 2]` | 待实测 | |
| `1.0` | float | 类型 `number`；范围 `[0, 2]` | 待实测 | |
| `2.0` | float | 类型 `number`；范围 `[0, 2]` | 待实测 | |

> 实测与文档不一致时，在「实测」列记录 HTTP 状态、错误码或实际行为；勿改写「官方文档」列。

## Official Archive

Source page: https://api-docs.deepseek.com/zh-cn/guides/anthropic_api
