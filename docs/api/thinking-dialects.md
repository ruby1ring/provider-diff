---
channel_id: thinking
protocol_id: chat_completions
doc_status: internal
doc_url: null
last_verified: 2026-06-08
compare: false
required_parameters: []
parameter_groups:
  Reasoning.Switch: [enable_thinking, thinking, reasoning, chat_template_kwargs.enable_thinking]
  Reasoning.Intensity: [reasoning_effort, thinking_budget, reasoning.effort, reasoning.max_tokens, thinking.budget_tokens]
  Reasoning.Output: [reasoning.summary, reasoning.exclude, include_reasoning, reasoning_split, preserve_thinking, thinking.clear_thinking]
  Length: [max_completion_tokens]
  Observability: [reasoning_content, usage.completion_tokens_details.reasoning_tokens]
notes: 跨渠道推理方言探针，非单一供应商 API 文档。
---

# Thinking / Reasoning 参数方言官方文档汇总


本文档按官方文档口径整理各 provider 的 thinking / reasoning 控制方式，用于设计 `provider-diff` 探针、供应商适配层和对外 API 文档。

整理日期：2026-06-08。

注意：这里的“thinking”不等同于所有厂商都会暴露完整原始思维链。不同厂商可能只暴露摘要、加密块、空占位、token 计数，或者完全不暴露可读内容。

## 总表

| Provider | 主要 API 面 | 官方 thinking 方言 | 开启方式 | 关闭方式 | 强度 / 预算 | 输出落点 | 重要限制 |
|---|---|---|---|---|---|---|---|
| OpenAI | Responses API；Chat Completions | Responses: `reasoning` object；Chat: `reasoning_effort` | Responses: `reasoning: {"effort":"low/medium/high/..."}`；Chat: `reasoning_effort` | 支持 `none` 的模型可用 `effort/reasoning_effort: "none"`；不是所有模型支持 | `none`、`minimal`、`low`、`medium`、`high`、`xhigh`，模型相关 | 原始 reasoning tokens 不可见；usage 中有 reasoning token 计数；部分 Responses 模型可返回 reasoning summary | 新项目官方更推荐 Responses API；Chat Completions 的字段形态与 Responses 不同 |
| Anthropic Claude | Native Messages；OpenAI SDK compatibility | Native: `thinking` object；新模型也有 adaptive thinking / effort | 手动：`thinking: {"type":"enabled","budget_tokens":N}`；新 Opus/Sonnet 推荐或要求 `thinking: {"type":"adaptive"}` | 多数支持手动 thinking 的模型可用 `thinking: {"type":"disabled"}`；部分新模型不支持 disabled 或手动模式 | 手动模式用 `budget_tokens`；adaptive 模式用 effort 参数控制深度 | Native Messages: `content[]` 中的 `type:"thinking"` block；可 `display:"summarized"` 或 `display:"omitted"`；usage 可含 `thinking_tokens` | OpenAI SDK compatibility 可通过 `extra_body.thinking` 开启，但不返回 Claude 详细 thinking；`reasoning_effort` 在兼容层被忽略 |
| DeepSeek | OpenAI-compatible Chat Completions；Anthropic-compatible | `thinking` object + `reasoning_effort` | `extra_body: {"thinking":{"type":"enabled"}}`；默认 enabled | `extra_body: {"thinking":{"type":"disabled"}}` | `reasoning_effort: "high"` 或 `"max"`；兼容映射：`low/medium -> high`，`xhigh -> max` | 非流式：`choices[].message.reasoning_content`；流式：`choices[].delta.reasoning_content` | thinking 模式下 `temperature/top_p/presence_penalty/frequency_penalty` 被接受但无效果；有 tool call 时必须把 `reasoning_content` 原样传回后续请求 |
| Alibaba Cloud Model Studio / DashScope | OpenAI-compatible Chat Completions；DashScope API | Qwen-style `enable_thinking` + `thinking_budget` | 混合思考模型：`enable_thinking: true`；OpenAI Python SDK 需放进 `extra_body` | 混合思考模型：`enable_thinking: false`；thinking-only 模型不能关闭 | `thinking_budget` 限制 thinking tokens，官方说明主要支持 Qwen3 thinking 模式和 Kimi models | OpenAI-compatible streaming delta / message 中的 `reasoning_content`；DashScope message 中也有 `reasoning_content` | 模型分为 hybrid thinking 和 thinking-only；很多 deep thinking 模型官方建议流式调用；`enable_thinking` 不是 OpenAI 标准参数 |
| SiliconFlow | OpenAI-compatible Chat Completions | Qwen/SiliconFlow-style `enable_thinking` + `thinking_budget` | `enable_thinking: true`；文档列出支持该字段的模型 | `enable_thinking: false`；只对支持该字段的模型成立 | `thinking_budget`，默认 `4096`，范围 `128..32768` | 响应 schema 含 `choices[].message.reasoning_content`；usage 可见 reasoning token 细节 | 当前官方页面明确列出 `enable_thinking` / `thinking_budget`，未在该页检索到 `reasoning_effort`；不要把它当成 SiliconFlow 通用官方开关 |
| MiniMax | OpenAI-compatible Chat Completions；Anthropic-compatible Messages | M3: `thinking` object；M 系列输出格式：`reasoning_split` | MiniMax-M3: 省略 `thinking` 默认开启，或 `thinking: {"type":"adaptive"}`；M2.x thinking 默认开启且不能关闭 | MiniMax-M3: `thinking: {"type":"disabled"}`；M2.x 接受 disabled 但 thinking 仍保持开启 | 官方 OpenAI-compatible 页没有列出 effort/budget；`reasoning_split` 只控制输出分离 | `reasoning_split:true` 时返回 `reasoning_content` / `reasoning_details`；false 或 native 格式可把 `<think>...</think>` 放在 `content` | `reasoning_split` 不是开关；M2.x 的 `thinking.type=disabled` 不能作为关闭成功证据 |
| OpenRouter | OpenAI-compatible Chat Completions | Unified `reasoning` object；legacy `include_reasoning` | `reasoning: {"enabled":true}`，或 `{"effort":"..."}`，或 `{"max_tokens":N}` | `reasoning: {"effort":"none"}` 可禁用；`reasoning: {"exclude":true}` 只是不返回 reasoning，不等于关闭模型内部 reasoning | `effort: xhigh/high/medium/low/minimal/none`；`max_tokens`；Anthropic / Qwen / Gemini 等会映射到各自上游字段 | `choices[].message.reasoning`；`choices[].message.reasoning_details`；streaming delta 中也可有 `reasoning_details` | OpenRouter 会归一化不同上游；请求被 OpenRouter 接受不代表每个上游模型都实际支持；部分模型如 OpenAI o-series 不返回 reasoning tokens |
| vLLM | OpenAI-compatible server | Server parser + `reasoning_effort` / `chat_template_kwargs` / thinking budget | 需启动 reasoning parser；`reasoning_effort: "low/medium/high"` 会自动注入 `enable_thinking=true`；或显式 `chat_template_kwargs.enable_thinking=true` | `reasoning_effort:"none"` 会注入 `enable_thinking=false`；或显式 `chat_template_kwargs.enable_thinking=false` | `thinking_token_budget` / reasoning config，版本和模型相关 | OpenAI-compatible response 的 `choices[].message.reasoning` 或相近 reasoning 字段；streaming delta 可含 reasoning | 显式 `chat_template_kwargs.enable_thinking` 优先于 `reasoning_effort` 自动注入；必须匹配模型和 reasoning parser |

## 各家细节

### OpenAI

OpenAI 的原生 reasoning 控制主要在 Responses API 中是：

```json
{
  "reasoning": {
    "effort": "medium"
  }
}
```

Chat Completions 中对应的是 `reasoning_effort`，用于 reasoning models。官方文档说明可用值是模型相关的，可以包括：

```text
none, minimal, low, medium, high, xhigh
```

OpenAI 不通过 API 暴露原始 reasoning tokens；这些 token 会占上下文和费用，并在 usage 里以 reasoning token 计数体现。Responses API 中可请求 reasoning summary，但这不是原始思维链。

适配建议：

- 优先把 OpenAI Responses 映射为 `reasoning.effort`。
- 如果走 Chat Completions，再映射为 `reasoning_effort`。
- 关闭 thinking 只能在目标模型支持 `none` 时使用 `none`；否则不能假设可关闭。

### Anthropic Claude

Claude native Messages API 的手动 extended thinking 形态是：

```json
{
  "thinking": {
    "type": "enabled",
    "budget_tokens": 10000
  }
}
```

可关闭时使用：

```json
{
  "thinking": {
    "type": "disabled"
  }
}
```

但 Claude 的模型版本差异很关键：官方文档说明 Opus 4.8 / Opus 4.7 不再支持手动 `type:"enabled"` + `budget_tokens`，要使用 adaptive thinking；Opus 4.6 / Sonnet 4.6 仍可用手动模式但已推荐 adaptive。

thinking 输出在 native Messages response 的 `content[]` 中：

```json
{
  "type": "thinking",
  "thinking": "...",
  "signature": "..."
}
```

Claude 4 系列默认可能返回 summarized thinking；也可用 `display:"omitted"` 省略 thinking 文本但保留签名。OpenAI SDK compatibility 层可通过 `extra_body` 传 `thinking`，但官方明确说该兼容响应不会返回 Claude 的详细 thought process；同时 `reasoning_effort` 在兼容层是 ignored。

适配建议：

- Claude native 优先使用 `thinking`。
- Claude OpenAI-compatible 只适合快速比较，不适合把 detailed thinking 当成可观测输出。
- `reasoning_effort` 不应映射给 Claude 兼容层。

### DeepSeek

DeepSeek 官方 thinking mode 使用 OpenAI-compatible 扩展字段：

```json
{
  "thinking": {
    "type": "enabled"
  },
  "reasoning_effort": "high"
}
```

关闭：

```json
{
  "thinking": {
    "type": "disabled"
  }
}
```

默认是 enabled。`reasoning_effort` 官方列出 `high` 和 `max`，并说明兼容映射：

| 输入 | 实际语义 |
|---|---|
| `low` | `high` |
| `medium` | `high` |
| `high` | `high` |
| `xhigh` | `max` |
| `max` | `max` |

输出：

- 非流式：`choices[].message.reasoning_content`
- 流式：`choices[].delta.reasoning_content`

适配建议：

- DeepSeek 是 `thinking` 开关 + `reasoning_effort` 强度的组合，不要只发 `reasoning_effort` 来代表开关。
- tool calling 的 thinking turn 必须保留 `reasoning_content` 并传回，否则后续请求可能 400。

### Alibaba Cloud Model Studio / DashScope

百炼 deep thinking 模型分成两类：

| 类型 | 行为 |
|---|---|
| Hybrid thinking | 可用 `enable_thinking` 开启 / 关闭 |
| Thinking-only | 始终 thinking，不能关闭 |

OpenAI-compatible 形态：

```json
{
  "enable_thinking": true
}
```

关闭 hybrid thinking：

```json
{
  "enable_thinking": false
}
```

限制 thinking 长度：

```json
{
  "enable_thinking": true,
  "thinking_budget": 1000
}
```

官方说明 `enable_thinking` 不是 OpenAI 标准参数；Python OpenAI SDK 中应通过 `extra_body` 传入。`thinking_budget` 用于限制 thinking tokens，官方页面说明主要支持 Qwen3 thinking 模式和 Kimi models。响应中 thinking 内容通过 `reasoning_content` 返回。

适配建议：

- Qwen / 百炼优先使用 `enable_thinking`。
- `thinking_budget` 只能在目标模型支持时发送。
- thinking-only 模型不能通过通用参数强行关闭。

### SiliconFlow

SiliconFlow 当前官方 Chat Completions 页面列出的 thinking 字段是：

```json
{
  "enable_thinking": true,
  "thinking_budget": 4096
}
```

字段语义：

| 字段 | 官方说明 |
|---|---|
| `enable_thinking` | 在 thinking 与 non-thinking 模式之间切换；默认 true；只支持文档列出的模型 |
| `thinking_budget` | chain-of-thought 输出最大 token 数；默认 4096；范围 `128..32768` |

响应 schema 中有 `choices[].message.reasoning_content`。仓库既有 SiliconFlow notes 里曾记录 `reasoning_effort`，但本次打开的官方页面没有检索到该字段。因此对外文档中不应把 `reasoning_effort` 写成 SiliconFlow 通用官方 thinking 参数；最多作为 provider-dependent probe 或历史兼容探针。

适配建议：

- SiliconFlow 的官方主路径是 `enable_thinking` / `thinking_budget`。
- 对 `enable_thinking:false` 的成功判定不能只看 HTTP 200；还要检查没有 `reasoning_content`、没有 `<think>`，且 usage 中没有正数 reasoning/thinking token。

### MiniMax

MiniMax 官方 OpenAI SDK 文档现在分出两件事：

1. `thinking` 控制 MiniMax-M3 的 thinking 是否启用。
2. `reasoning_split` 只控制 thinking 输出格式。

MiniMax-M3 开启 / 默认：

```json
{
  "thinking": {
    "type": "adaptive"
  }
}
```

MiniMax-M3 关闭：

```json
{
  "thinking": {
    "type": "disabled"
  }
}
```

输出分离：

```json
{
  "reasoning_split": true
}
```

官方说明：

- MiniMax-M3 省略 `thinking` 时默认 thinking on。
- `thinking.type=adaptive` 对 M3 等价于 thinking on。
- `thinking.type=disabled` 对 M3 是跳过 thinking、直接回答。
- M2.x 模型接受 `thinking.type=disabled`，但 thinking 仍保持开启。
- `reasoning_split` 不开启也不关闭 thinking；只决定 thinking 是分离到 `reasoning_content` / `reasoning_details`，还是以 `<think>...</think>` 留在 `content`。

适配建议：

- MiniMax-M3: `thinking` 是开关，`reasoning_split` 是输出格式。
- MiniMax-M2.x: 不要把 `thinking.type=disabled` 判定为关闭能力；必须以响应证据为准。
- 多轮 function call / interleaved thinking 中要保留完整 assistant message，包括 `tool_calls` 和 thinking 相关字段。

### OpenRouter

OpenRouter 提供 unified `reasoning` object：

```json
{
  "reasoning": {
    "effort": "high",
    "exclude": false
  }
}
```

也可用 token budget：

```json
{
  "reasoning": {
    "max_tokens": 2000
  }
}
```

或者只启用默认配置：

```json
{
  "reasoning": {
    "enabled": true
  }
}
```

官方说明 `reasoning.effort` 可取：

```text
xhigh, high, medium, low, minimal, none
```

`reasoning.exclude:true` 表示模型仍可内部 reasoning，但不把 reasoning 返回给客户端；它不是关闭 reasoning。legacy `include_reasoning` 仍支持，但官方建议改用 `reasoning`。

输出：

- `choices[].message.reasoning`
- `choices[].message.reasoning_details`
- streaming: `choices[].delta.reasoning_details`

OpenRouter 还支持把 reasoning 传回后续请求，字段可以是 `message.reasoning`、`message.reasoning_details`，也说明 `reasoning_content` 可作为 alias。

适配建议：

- OpenRouter 应优先使用 `reasoning` object。
- 区分 `exclude:true` 和真正关闭：前者是不返回，后者才是 `effort:"none"`。
- 因为 OpenRouter 聚合多上游，必须结合模型和响应证据判断是否真的生效。

### vLLM

vLLM 是自托管 OpenAI-compatible server，thinking 能力依赖：

- 启动时选择 reasoning-capable 模型。
- 启动时配置匹配的 reasoning parser，例如 Qwen3 parser。
- 请求字段与 vLLM 版本匹配。

官方 reasoning outputs 文档说明：

```json
{
  "reasoning_effort": "medium"
}
```

会自动注入 chat template kwargs：

| 请求 | 自动注入 |
|---|---|
| `reasoning_effort:"low"` | `enable_thinking=true` |
| `reasoning_effort:"medium"` | `enable_thinking=true` |
| `reasoning_effort:"high"` | `enable_thinking=true` |
| `reasoning_effort:"none"` | `enable_thinking=false` |

如果请求里显式传了：

```json
{
  "chat_template_kwargs": {
    "enable_thinking": false
  }
}
```

那么显式值优先于 `reasoning_effort` 自动注入。

thinking budget 需要 reasoning config / `thinking_token_budget` 等能力配合，具体随 vLLM 版本和模型变化。

适配建议：

- vLLM 的“官方方言”不是云厂商统一 API，而是 server runtime + chat template + parser 的组合。
- 探针必须记录 server 版本、served model、reasoning parser 和 chat template kwargs。

## 对外 API 文档设计启示

如果我们要对外提供统一 API，不建议把下面这些字段一起平铺：

```json
{
  "reasoning_effort": "medium",
  "enable_thinking": true,
  "thinking_budget": 1000,
  "thinking": {
    "type": "enabled"
  }
}
```

原因是这些字段来自不同厂商方言。平铺后有几个问题：

- 用户会以为它们可以同时生效，但很多 provider 只认识其中一个。
- `thinking` 在 Claude、DeepSeek、MiniMax 中含义不同。
- `reasoning_split` 是输出格式，不是 thinking 开关。
- `exclude` / `display:"omitted"` 是“不返回 thinking”，不是“不 thinking”。
- `thinking_budget`、`budget_tokens`、`reasoning.max_tokens` 都是预算，但目标字段不同，模型限制也不同。

更稳妥的文档结构是：外层表达用户意图，adapter 层映射到 provider native 字段，并在响应中回填实际使用的 dialect。

示例：

```json
{
  "thinking": {
    "enabled": true,
    "effort": "medium",
    "budget_tokens": 1000,
    "return": "auto"
  }
}
```

但这个对象必须在文档中声明为“统一意图参数”，不是任何一家 provider 的 native body。服务端应按 provider 选择映射：

| Provider | 映射 |
|---|---|
| OpenAI Responses | `reasoning.effort` |
| OpenAI Chat | `reasoning_effort` |
| Claude native | `thinking.type` + `budget_tokens` / adaptive effort |
| DeepSeek | `thinking.type` + `reasoning_effort` |
| DashScope / SiliconFlow | `enable_thinking` + `thinking_budget` |
| MiniMax-M3 | `thinking.type`；可选 `reasoning_split` 作为输出格式 |
| MiniMax-M2.x | 不能保证关闭；`reasoning_split` 只控制输出格式 |
| OpenRouter | `reasoning.enabled` / `reasoning.effort` / `reasoning.max_tokens` / `reasoning.exclude` |
| vLLM | `reasoning_effort` 或 `chat_template_kwargs.enable_thinking`，视 server 配置 |

响应中建议增加诊断字段：

```json
{
  "thinking_effective": {
    "provider": "minimax",
    "dialect": "thinking_object",
    "requested": {
      "enabled": false
    },
    "native_request": {
      "thinking": {
        "type": "disabled"
      }
    },
    "evidence": {
      "visible_reasoning": false,
      "reasoning_tokens": 0,
      "locations": []
    },
    "confidence": "confirmed"
  }
}
```

这样 API 文档可以同时保留统一入口和 provider-native 真实性，不会把某家的字段伪装成所有家的原生支持。

## 官方来源

- OpenAI reasoning guide: https://platform.openai.com/docs/guides/reasoning
- OpenAI Chat Completions API reference: https://platform.openai.com/docs/api-reference/chat/create
- Anthropic extended thinking: https://platform.claude.com/docs/en/build-with-claude/extended-thinking
- Anthropic OpenAI SDK compatibility: https://platform.claude.com/docs/en/api/openai-sdk
- DeepSeek thinking mode: https://api-docs.deepseek.com/guides/thinking_mode
- Alibaba Cloud Model Studio deep thinking: https://www.alibabacloud.com/help/en/model-studio/deep-thinking
- SiliconFlow Chat Completions: https://docs.siliconflow.com/en/api-reference/chat-completions/chat-completions
- MiniMax OpenAI SDK compatibility: https://platform.minimax.io/docs/api-reference/text-openai-api
- OpenRouter Chat Completions API reference: https://openrouter.ai/docs/api-reference/chat-completion
- OpenRouter reasoning tokens guide: https://openrouter.ai/docs/guides/best-practices/reasoning-tokens
- vLLM reasoning outputs: https://docs.vllm.ai/en/stable/features/reasoning_outputs/
