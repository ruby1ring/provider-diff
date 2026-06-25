# DeepSeek Anthropic Messages API Notes

> **Last verified:** 2026-06-16 against official API documentation (browser scrape).
> **Official source:** https://api-docs.deepseek.com/zh-cn/guides/anthropic_api
> **Protocol ID:** `anthropic_messages`

Structured summary for Noctua compatibility-test design.

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

## Documented Request Parameters (Simple Fields)

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

## Official Archive

Source page: https://api-docs.deepseek.com/zh-cn/guides/anthropic_api
