# 阿里云百炼 Chat Completions API Notes

> **Last verified:** 2026-06-25 against official API documentation.
> **Official source:** https://help.aliyun.com/zh/model-studio/qwen-api-via-openai-chat-completions
> **Protocol ID:** `chat_completions`

Structured summary for Noctua compatibility-test design.


## Endpoints

| Region | Base URL | Chat completions |
|---|---|---|
| 华北2（北京） | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `POST .../chat/completions` |
| 新加坡 | `https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1` | same |
| 美国（弗吉尼亚） | `https://dashscope-us.aliyuncs.com/compatible-mode/v1` | same |
| 德国（法兰克福） | `https://{WorkspaceId}.eu-central-1.maas.aliyuncs.com/compatible-mode/v1` | same |
| 日本（东京） | `https://{WorkspaceId}.ap-northeast-1.maas.aliyuncs.com/compatible-mode/v1` | same |

Singapore migration note: prefer workspace URL `https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com` over legacy `https://dashscope-intl.aliyuncs.com`.

Anthropic Messages (separate protocol):

```text
https://dashscope.aliyuncs.com/apps/anthropic/v1
```

## Authentication

```http
Authorization: Bearer <DASHSCOPE_API_KEY>
Content-Type: application/json
```

## Required Request Fields

| Parameter | Type | Notes |
|---|---|---|
| `model` | `string` | Required. Qwen / third-party models on Bailian |
| `messages` | `array<object>` | Required. `system`, `user`, `assistant`, `tool`; multimodal parts |

## Documented Request Parameters

| Parameter | Type | OpenAI? | Default | Range | Notes |
|---|---|---|---|---|---|
| `stream` | `boolean` | yes | `false` | — | Non-stream timeout 300s; use stream for long output |
| `stream_options.include_usage` | `boolean` | yes | `false` | — | Only when `stream=true` |
| `temperature` | `float` | yes | model-dependent | [0, 2) | See official doc for per-model defaults |
| `top_p` | `float` | yes | model-dependent | (0, 1.0] | |
| `top_k` | `integer \| null` | **no** | model-dependent | ≥0; null or >100 disables | `extra_body`; not on DeepSeek/Kimi/MiniMax |
| `repetition_penalty` | `float` | **no** | model-dependent | >0; 1.0=no penalty | `extra_body` |
| `presence_penalty` | `float` | yes | model-dependent | [-2, 2] | |
| `response_format` | `object` | yes | `{"type":"text"}` | — | `text` \| `json_object` |
| `max_tokens` | `integer` | yes | — | — | **即将废弃** — prefer `max_completion_tokens` |
| `max_completion_tokens` | `integer` | yes | — | — | Includes thinking chain; recommended for thinking models |
| `vl_high_resolution_images` | `boolean` | **no** | `false` | — | VL models; `extra_body` |
| `n` | `integer` | yes | `1` | 1–4 | Must be 1 when `tools` present |
| `enable_thinking` | `boolean` | **no** | model-dependent | — | `extra_body`; hybrid thinking |
| `thinking` | `object` | **no** | — | — | MiniMax-M3 on Bailian: `adaptive` \| `disabled` |
| `preserve_thinking` | `boolean` | **no** | `false` | — | `extra_body` |
| `thinking_budget` | `integer` | **no** | — | — | Qwen3.x / Qwen3-VL |
| `reasoning_effort` | `string` | **no** | `high` | DeepSeek-V4 | `high` \| `max`; compat mappings |
| `tool_stream` | `boolean` | **no** | `false` | — | `extra_body`; stream only |
| `enable_code_interpreter` | `boolean` | **no** | `false` | — | `extra_body` |
| `seed` | `integer` | yes | model-dependent | [0, 2^31-1] | |
| `logprobs` | `boolean` | yes | `false` | — | Thinking `reasoning_content` excluded |
| `top_logprobs` | `integer` | yes | `0` | [0, 5] | Requires `logprobs=true` |
| `stop` | `string \| array` | yes | — | — | Do not mix token_id and string in array |
| `tools` | `array` | yes | — | — | Function tools |
| `tool_choice` | `string \| object` | yes | `auto` | — | Thinking models cannot force tool |
| `parallel_tool_calls` | `boolean` | yes | `false` | — | |
| `enable_search` | `boolean` | **no** | `false` | — | `extra_body` |
| `search_options` | `object` | **no** | — | — | `extra_body` |
| `modalities` | `array` | yes | `["text"]` | — | Qwen-Omni: `["text","audio"]` |
| `audio` | `object` | yes | — | — | Qwen-Omni output audio; `format`: `wav` |
| `skill` | `array` | **no** | — | — | `qwen-doc-turbo` PPT only; requires `stream=true` |
| `X-DashScope-DataInspection` | header | — | — | — | Content safety header, not body |

## extra_body Parameters

Non-standard parameters (`top_k`, `repetition_penalty`, `enable_thinking`, `thinking`, `thinking_budget`, `preserve_thinking`, `reasoning_effort`, `tool_stream`, `enable_code_interpreter`, `enable_search`, `search_options`, `vl_high_resolution_images`, `skill`) should be passed via `extra_body`

## Multimodal Message Parts

`messages[].content[]` types: `text`, `image_url`, `input_audio`, `video`, `video_url`. Optional pixel controls: `min_pixels`, `max_pixels`, `total_pixels`, `fps`. Explicit cache: `cache_control.type = ephemeral`.

## Source

Structured from user-supplied `ali-chat` (2026-06-25) + prior `ali.md` endpoint/multimodal notes.
