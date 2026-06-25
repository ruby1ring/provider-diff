# SiliconFlow Chat Completions API Notes

> **Last verified:** 2026-06-16 against official API documentation (browser + OpenAPI).
> **Official source:** https://docs.siliconflow.cn/cn/api-reference/chat-completions/chat-completions
> **Protocol ID:** `chat_completions`

Structured summary for Noctua compatibility-test design.

## Endpoint

| Region | HTTP |
|---|---|
| China | `POST https://api.siliconflow.cn/v1/chat/completions` |
| International | `POST https://api.siliconflow.com/v1/chat/completions` |

## Authentication

`Authorization: Bearer <API_KEY>`

## Required Request Fields

| Parameter | Type | Notes |
|---|---|---|
| `model` | `string` | 见 [Models](https://cloud.siliconflow.cn/models?types=chat) |
| `messages` | `array<object>` | min 1，max 10 |

## Documented Request Parameters (LLM)

| Parameter | Type | Required | Default | Range | Notes |
|---|---|---|---|---|---|
| `messages[].role` | `string` | yes | `user` | `system` \| `user` \| `assistant` | |
| `messages[].content` | `string` | yes | — | — | LLM 为纯文本 |
| `stream` | `boolean` | no | — | — | SSE；以 `data: [DONE]` 结束 |
| `max_tokens` | `integer` | no | — | — | 预留约 10k 给输入/系统开销 |
| `enable_thinking` | `boolean` | no | — | — | 见下方支持模型列表 |
| `thinking_budget` | `integer` | no | — | [128, 32768] | 推理模型思维链 token 上限 |
| `reasoning_effort` | `string` | no | — | `high` \| `max` | **仅** `deepseek-ai/DeepSeek-V4-Flash` |
| `min_p` | `number` | no | — | [0, 1] | **仅** Qwen3 |
| `stop` | `string \| array` | no | — | max 4 | 命中后不含 stop 序列 |
| `temperature` | `number` | no | — | ≤ 2 | |
| `top_p` | `number` | no | `0.7` | — | Nucleus sampling |
| `top_k` | `number` | no | — | ≤ 100 | |
| `frequency_penalty` | `number` | no | — | [-2, 2] | |
| `n` | `integer` | no | `1` | — | 返回生成数量 |
| `response_format` | `object` | no | — | — | 输出格式 |
| `response_format.type` | `string` | no | `text` | `text` | |
| `tools` | `array` | no | — | max 128 | 仅 `function` 类型 |
| `tools[].type` | `string` | yes | — | `function` | |
| `tools[].function.name` | `string` | yes | — | max 64 | a-zA-Z0-9_- |
| `tools[].function.description` | `string` | no | — | — | |
| `tools[].function.parameters` | `object` | no | — | — | JSON Schema |
| `tools[].function.strict` | `boolean` | no | `false` | — | Structured Outputs 子集 |

### `enable_thinking` supported models

`Pro/zai-org/GLM-5`, `Pro/zai-org/GLM-4.7`, `deepseek-ai/DeepSeek-V3.2`, `Pro/deepseek-ai/DeepSeek-V3.2`, `zai-org/GLM-4.6`, `Qwen/Qwen3-8B`, `Qwen/Qwen3-14B`, `Qwen/Qwen3-32B`, `Qwen/Qwen3-30B-A3B`, `tencent/Hunyuan-A13B-Instruct`, `zai-org/GLM-4.5V`, `deepseek-ai/DeepSeek-V3.1-Terminus`, `Pro/deepseek-ai/DeepSeek-V3.1-Terminus`, `Qwen/Qwen3.5-397B-A17B`, `Qwen/Qwen3.5-122B-A10B`, `Qwen/Qwen3.5-35B-A3B`, `Qwen/Qwen3.5-27B`, `Qwen/Qwen3.5-9B`, `Qwen/Qwen3.5-4B`

## Documented Request Parameters (VLM)

VLM schema（`ChatCompletionVLMRequest`）与 LLM 共享 `stream`、`max_tokens`、`stop`、`temperature`、`top_p`、`top_k`、`frequency_penalty`、`n`、`response_format`；`messages[].content` 为多模态数组：

| Content part | Type | Child fields | Notes |
|---|---|---|---|
| `text` | `text` | `text` | 文本块 |
| `image_url` | `image_url` | `image_url.url`, `image_url.detail` | `detail`: `auto` \| `low` \| `high`；DeepSeek-OCR 支持 PDF |
| `audio_url` | `audio_url` | `audio_url.url` | URL 或 base64 |
| `video_url` | `video_url` | `video_url.url`, `video_url.detail`, `video_url.max_frams`, `video_url.fps` | Qwen3-Omni / Qwen3-VL；建议 ≤30s |

## Response Fields

| Field | Notes |
|---|---|
| `id`, `object`, `created`, `model`, `choices`, `usage` | 标准 chat.completion |
| `choices[].message.content` | 最终回答 |
| `choices[].message.reasoning_content` | deepseek-R1 系列、Qwen/QwQ-32B |
| `choices[].message.tool_calls` | `id`, `type=function`, `function.name`, `function.arguments` |
| `choices[].finish_reason` | `stop`, `eos`, `length`, `tool_calls` |
| `usage.prompt_cache_hit_tokens` / `prompt_cache_miss_tokens` | 缓存命中统计 |
| `usage.completion_tokens_details.reasoning_tokens` | 推理 token |
| Header `x-siliconcloud-trace-id` | 请求追踪 ID |

## Raw Archive

[`docs/archive/siliconflow-chat-raw.md`](../archive/siliconflow-chat-raw.md)
