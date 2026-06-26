---
channel_id: aliyun
protocol_id: anthropic_messages
doc_status: verified
doc_url: "https://help.aliyun.com/zh/model-studio/anthropic-api-messages"
last_verified: 2026-06-25
compare: true
required_parameters: [model, messages, max_tokens]
parameter_groups:
  Core: [model, messages, max_tokens, system]
  Sampling: [temperature, top_p, top_k, stop_sequences]
  Reasoning.Switch: [thinking]
  Reasoning.Intensity: [thinking.budget_tokens, reasoning_effort]
  Tools: [tools, tool_choice]
  Protocol: [stream]
  Output.Structure: [output_config]
notes: 对照 docs/api/ali-message.md（2026-06-25）。temperature 范围 [0,2)（非 Anthropic 官方 [0,1]）。 类型字段按该渠道官方 API 原文收录。
---

# 阿里云百炼 Anthropic Messages API Notes


## Endpoint

| Region | HTTP |
|---|---|
| 华北2 | `POST https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/apps/anthropic/v1/messages` |
| 新加坡 | `POST https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/apps/anthropic/v1/messages` |
| 美国 | `POST https://dashscope-us.aliyuncs.com/apps/anthropic/v1/messages` |

## Authentication

`x-api-key` 或 `Authorization: Bearer <DASHSCOPE_API_KEY>`

## Required Request Fields

| Parameter | Type | Notes |
|---|---|---|
| `model` | `string` | Qwen / DeepSeek / Kimi / GLM / MiniMax 等 |
| `messages` | `array` | `user` / `assistant` 交替；不含 `system` 角色 |
| `max_tokens` | `integer` | 回复上限；不限制 thinking token（由 `thinking.budget_tokens` 控制） |

## Documented Request Parameters

| Parameter | Type | Required | Default | Range | Notes |
|---|---|---|---|---|---|
| `system` | `string \| array` | no | — | — | 顶层传入；数组形式支持 `cache_control` |
| `stream` | `boolean` | no | `false` | — | |
| `temperature` | `number` | no | — | [0, 2) | **注意**：非 Anthropic 官方 [0,1] |
| `top_p` | `number` | no | — | — | 与 temperature 建议只设其一 |
| `top_k` | `integer` | no | — | — | |
| `stop_sequences` | `array` | no | — | — | 命中后 `stop_reason` 仍为 `end_turn` |
| `thinking` | `object` | no | — | — | `enabled` / `disabled` |
| `thinking.budget_tokens` | `integer` | no | — | — | `type=enabled` 时生效 |
| `reasoning_effort` | `string` | no | `max` | `high` \| `max` | DeepSeek-V4 系列；low/medium→high，xhigh→max |
| `tools` | `array` | no | — | — | Function Call |
| `tool_choice` | `object` | no | `auto` | auto / any / none / tool | |
| `output_config` | `object` | no | — | — | 结构化输出；deepseek/glm 严格 schema |

## 实测：temperature 字面量

对应测评 case 分组「协议 / 采样」：`temperature` 分别传入 JSON integer `1`、`2` 与 float `1.0`、`2.0`。

| 传入值 | JSON 类型 | 官方文档 | 实测 (Noctua) | 备注 |
|---|---|---|---|---|
| `1` | integer | 类型 `number`；范围 `[0, 2)` | 待实测 | |
| `2` | integer | 类型 `number`；范围 `[0, 2)`（上界不含 2） | 待实测 | |
| `1.0` | float | 类型 `number`；范围 `[0, 2)` | 待实测 | |
| `2.0` | float | 类型 `number`；范围 `[0, 2)`（上界不含 2） | 待实测 | |

> 实测与文档不一致时，在「实测」列记录 HTTP 状态、错误码或实际行为；勿改写「官方文档」列。

## Raw Archive

