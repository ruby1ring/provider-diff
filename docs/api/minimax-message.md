---
channel_id: minimax
protocol_id: anthropic_messages
doc_status: verified
doc_url: "https://platform.minimax.io/docs/api-reference/text-anthropic-api"
last_verified: 2026-07-08
compare: true
required_parameters: [model, messages, max_tokens]
parameter_groups:
  Core: [model, messages, max_tokens, system]
  Sampling: [temperature, top_p]
  Reasoning.Switch: [thinking, thinking.type]
  Tools: [tools, tool_choice]
  Protocol: [stream]
  Extra: [service_tier, metadata]
  Unsupported: [top_k, stop_sequences, mcp_servers, context_management, container]
notes: 对照官方文档（2026-07-08）。max_tokens 官方必填；top_k/stop_sequences/mcp_servers/context_management/container 官方标注忽略（stop_sequences 被忽略属显著非标行为）；thinking 默认 disabled（与 chat 协议默认 adaptive 相反）。 类型字段按该渠道官方 API 原文收录。
---
# MiniMax Anthropic Messages API Notes


## Endpoint

| Region | HTTP |
|---|---|
| China | `POST https://api.minimaxi.com/anthropic/v1/messages` |
| International | `POST https://api.minimax.io/anthropic/v1/messages` |

## Authentication

`X-Api-Key` + `anthropic-version: 2023-06-01`  
`Content-Type: application/json`

## Required Request Fields

| Parameter | Type | Notes |
|---|---|---|
| `model` | `string` | MiniMax-M3（多模态）或 M2.7 / M2.5 / M2.1 / M2 系列 |
| `messages` | `array` | M3 支持 text / image / video / tool / thinking；M2.x 仅 text / tool |
| `max_tokens` | `integer` | 官方必填。M3 推荐 131072，最大 524288；M2.x 推荐 65536，最大 204800 |

## Documented Request Parameters

| Parameter | Type | Required | Default | Range | Notes |
|---|---|---|---|---|---|
| `system` | `string \| array` | no | — | — | 数组块支持 `cache_control` |
| `max_tokens` | `integer` | yes | — | ≥ 1 | **官方必填**。M3 推荐 131072，最大 524288；M2.x 推荐 65536，最大 204800。缺省行为验证：2026-07-08 复测因账号余额不足（HTTP 402 insufficient balance 1008）未完成，待重测（probe=minimax_msgs_no_max_tokens）。 |
| `stream` | `boolean` | no | `false` | — | SSE 流式 |
| `temperature` | `number` | no | `1` | [0, 2] | 官方：范围 [0,2]，建议值 1；越界报错 |
| `top_p` | `number` | no | M3: `0.95`; M2.x: `0.9` | [0, 1] | |
| `thinking` | `object` | no | `{"type":"disabled"}` | — | M3：`disabled` / `adaptive`；省略时默认 disabled；M2.x 无法关闭 thinking。**双协议差异**：本协议默认 `disabled`，与本渠道 Chat Completions 协议默认 `adaptive` 相反。 |
| `thinking.type` | `string` | no | `disabled` | `disabled` \| `adaptive` | |
| `tools` | `array` | no | — | — | 函数工具声明（Anthropic Messages 兼容） |
| `tool_choice` | `object` | no | — | — | auto / any / tool / none |
| `service_tier` | `string` | no | `standard` | `standard` \| `priority` | Priority 1.5× 价格 |
| `metadata` | `object` | no | — | — | 建议含 `user_id` |
| `top_k` | `integer` | no | — | — | 官方：「此参数将被忽略」（Ignored）。 |
| `stop_sequences` | `array<string>` | no | — | — | 官方：「此参数将被忽略」（Ignored）。**重点：停止词被忽略属显著非标行为**（Anthropic Messages 标准中应生效）。实测验证：2026-07-08 复测因账号余额不足（HTTP 402 insufficient balance 1008）未完成，待重测（probe=minimax_msgs_stop_sequences）。 |
| `mcp_servers` | `array` | no | — | — | 官方：「此参数将被忽略」（Ignored）。 |
| `context_management` | `object` | no | — | — | 官方：「此参数将被忽略」（Ignored）。 |
| `container` | `object` | no | — | — | 官方：「此参数将被忽略」（Ignored）。 |

## Raw Archive
