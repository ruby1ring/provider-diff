# Chat Completions OpenAPI 与 Thinking 参数适配需求

## 背景

当前系统需要对外提供一套通用的 `chat/completions` OpenAPI 文档。该 API 需要兼容 OpenAI Chat Completions 的主流请求/响应结构，同时补充 thinking / reasoning 控制能力。

不同 provider 对 thinking 的参数命名、开关语义、预算字段、输出字段并不一致。例如：

- SiliconFlow / Qwen 风格主要使用 `enable_thinking`、`thinking_budget`。
- DeepSeek 官方使用 `thinking: {"type": "enabled"|"disabled"}` 和 `reasoning_effort`。
- MiniMax 不同模型族对 `thinking` 的支持不同，`reasoning_split` 主要是输出格式控制。
- 阿里百炼 / DashScope 有 `enable_thinking`、`thinking_budget`，并且模型分 thinking-only 与 hybrid thinking。
- vLLM 依赖服务端模型、reasoning parser、chat template，常见逃生参数包括 `chat_template_kwargs`、`thinking_token_budget`。

因此本需求不是“发明一个所有上游都原生支持的 thinking 参数”，而是：

1. 对外提供一套 SiliconFlow-compatible / OpenAI-compatible 的统一 Chat Completions API。
2. 在统一 API 中提供 thinking 控制字段。
3. 针对不同 provider 在 adapter 层映射到各自 native 参数。
4. 支持 provider-native 参数透传或逃生，保证高级用户可以绕过统一映射。
5. 控制面支持新增 provider 类型，并提供推荐规则。

## 目标

### 功能目标

1. 制作一份通用 `chat/completions` OpenAPI 文档。
2. OpenAPI 文档中包含 thinking / reasoning 相关请求参数和响应 metadata。
3. 新增 provider 类型：
   - `vllm`
   - `deepseek`
   - `minimax`
   - `ali`
   - `siliconflow`
4. 控制面支持上述 provider 类型。
5. 控制面为不同 provider 提供推荐规则，包括：
   - 默认 endpoint / base_url 建议
   - 支持的 thinking 方言
   - 参数映射规则
   - 透传字段白名单或策略
   - 不支持字段的处理策略
6. 请求侧支持统一参数，也支持透传 / 逃生参数。
7. 响应侧返回 thinking 参数实际生效情况，避免用户误以为不支持字段已经生效。

### 非目标

1. 不要求所有 provider 都原生支持同一套 thinking 字段。
2. 不要求把所有 provider 的 thinking 输出都转换成完全一致的可读思维链。
3. 不承诺所有模型都能关闭 thinking。
4. 不承诺所有 provider 都能限制 thinking budget。
5. 不把 HTTP 200 等同于 thinking 参数生效。

## 对外 API 设计原则

### 兼容 OpenAI Chat Completions

基础请求结构应保持 OpenAI-compatible：

```json
{
  "model": "string",
  "messages": [
    {
      "role": "user",
      "content": "Hello"
    }
  ],
  "stream": false,
  "temperature": 0.7,
  "max_tokens": 1024
}
```

基础响应结构也应保持 OpenAI-compatible：

```json
{
  "id": "chatcmpl_xxx",
  "object": "chat.completion",
  "created": 1710000000,
  "model": "xxx",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "..."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 20,
    "total_tokens": 30
  }
}
```

### 对外 thinking 主协议采用 SiliconFlow 风格

统一 API 顶层支持以下 thinking 字段：

```json
{
  "enable_thinking": true,
  "thinking_budget": 1000,
  "thinking": {
    "type": "enabled"
  },
  "reasoning_effort": "medium"
}
```

字段定义：

| 字段 | 类型 | 对外语义 | 说明 |
|---|---|---|---|
| `enable_thinking` | `boolean` | 是否希望开启 / 关闭 thinking | SiliconFlow-compatible 主开关。adapter 根据 provider 映射到 native 参数。 |
| `thinking_budget` | `integer` | 希望限制 thinking token 预算 | SiliconFlow-compatible budget 字段。不是所有 provider 支持。 |
| `thinking` | `object` | DeepSeek/SiliconFlow-compatible thinking object | 支持 `type: enabled/disabled/adaptive` 等 provider-dependent 形态。优先级高于 `enable_thinking`。 |
| `reasoning_effort` | `string` | 推理强度 | OpenAI-compatible / best-effort 字段。不同 provider 支持值不同。 |

`reasoning_effort` 建议 OpenAPI enum 至少包含：

```text
none, minimal, low, medium, high, xhigh, max
```

注意：

- `max` 主要用于兼容 DeepSeek 等 provider。
- `none` 表示希望关闭或最低 reasoning，但只有目标 provider/model 支持时才生效。
- provider 不支持的值应按规则映射、忽略、warning 或 error。

### 支持 provider-native 逃生

统一字段无法覆盖所有 provider 原生能力，因此必须支持 native escape。

需要同时支持两种输入形态：

#### 形态一：顶层未知字段逃生

OpenAI SDK 的 `extra_body` / `extraBody` 通常会被 SDK merge 到最终 JSON body 顶层。因此服务端必须识别顶层未知字段。

例如用户使用 Python OpenAI SDK：

```python
client.chat.completions.create(
    model="qwen3-vllm",
    messages=[{"role": "user", "content": "hi"}],
    extra_body={
        "chat_template_kwargs": {
            "enable_thinking": False
        },
        "thinking_token_budget": 2048
    }
)
```

服务端最终可能收到：

```json
{
  "model": "qwen3-vllm",
  "messages": [
    {
      "role": "user",
      "content": "hi"
    }
  ],
  "chat_template_kwargs": {
    "enable_thinking": false
  },
  "thinking_token_budget": 2048
}
```

服务端应把 `chat_template_kwargs`、`thinking_token_budget` 识别为 native escape 字段。

#### 形态二：`extra_body` 对象逃生

直接 HTTP 用户可以传：

```json
{
  "model": "qwen3-vllm",
  "messages": [
    {
      "role": "user",
      "content": "hi"
    }
  ],
  "extra_body": {
    "chat_template_kwargs": {
      "enable_thinking": false
    },
    "thinking_token_budget": 2048
  }
}
```

服务端也应支持，并将 `extra_body` 中的内容归一化为 native escape 字段。

### 逃生字段优先级

推荐优先级：

```text
provider_options[selected_provider] > extra_body > unknown top-level native fields > thinking > enable_thinking/thinking_budget > reasoning_effort > model default
```

如果第一期不做 `provider_options`，则使用：

```text
extra_body > unknown top-level native fields > thinking > enable_thinking/thinking_budget > reasoning_effort > model default
```

冲突示例：

```json
{
  "enable_thinking": true,
  "chat_template_kwargs": {
    "enable_thinking": false
  }
}
```

如果目标 provider 是 vLLM，应以 `chat_template_kwargs.enable_thinking=false` 为准，并在响应 metadata 中说明 `enable_thinking=true` 被 native escape 覆盖。

## Provider 映射需求

### vLLM

Provider type: `vllm`

推荐基础配置：

```text
base_url: http://localhost:8000/v1
endpoint: /chat/completions
protocol: openai-compatible
```

thinking 规则：

| 对外字段 | vLLM native 映射 |
|---|---|
| `reasoning_effort` | 原样传递给 vLLM，前提是服务端版本支持 |
| `enable_thinking=true` | 可映射为 `chat_template_kwargs.enable_thinking=true` |
| `enable_thinking=false` | 可映射为 `chat_template_kwargs.enable_thinking=false` |
| `thinking_budget` | 可映射为 `thinking_token_budget`，需确认当前 vLLM 版本 / parser 支持 |
| 顶层 `chat_template_kwargs` | native escape，优先级高 |
| 顶层 `thinking_token_budget` | native escape，优先级高 |

控制面推荐规则：

- 要求用户配置 served model。
- 要求用户标注是否启用了 reasoning parser。
- 可提示：Qwen3 等模型需要匹配 chat template 与 reasoning parser。
- 对 vLLM 返回的 reasoning 字段做 location probe，不假设固定字段名。

### DeepSeek 官方

Provider type: `deepseek`

推荐基础配置：

```text
base_url: https://api.deepseek.com
endpoint: /chat/completions
protocol: openai-compatible
```

thinking 规则：

| 对外字段 | DeepSeek native 映射 |
|---|---|
| `enable_thinking=true` | `thinking: {"type":"enabled"}` |
| `enable_thinking=false` | `thinking: {"type":"disabled"}` |
| `thinking.type` | 原样映射到 `thinking.type` |
| `reasoning_effort=medium/low/high` | 映射为 DeepSeek 支持的 effort；`low/medium -> high` |
| `reasoning_effort=xhigh/max` | 映射为 `max` |
| `thinking_budget` | 不支持时忽略 / warning / error，取决于策略 |

响应落点：

- `choices[].message.reasoning_content`
- streaming: `choices[].delta.reasoning_content`
- usage 中可能有 reasoning token 计数

控制面推荐规则：

- thinking 默认通常为 enabled。
- 关闭 thinking 需要显式 `thinking.type=disabled`。
- thinking 模式下 tool calling 后续请求要保留 `reasoning_content`。

### MiniMax

Provider type: `minimax`

推荐基础配置：

```text
base_url: https://api.minimaxi.com/v1 或 https://api.minimax.io/v1
endpoint: /chat/completions
protocol: openai-compatible
```

thinking 规则：

| 对外字段 | MiniMax native 映射 |
|---|---|
| `enable_thinking=true` | MiniMax-M3 可映射为 `thinking: {"type":"adaptive"}` |
| `enable_thinking=false` | MiniMax-M3 可映射为 `thinking: {"type":"disabled"}` |
| `thinking.type` | 对 MiniMax-M3 可原样或映射；M2.x 不保证关闭生效 |
| `reasoning_effort` | 无通用官方映射，默认忽略 / warning |
| `thinking_budget` | 无通用官方映射，默认忽略 / warning |
| `reasoning_split` | native escape，控制 thinking 输出分离，不是 thinking 开关 |

响应落点：

- `choices[].message.reasoning_content`
- `choices[].message.reasoning_details`
- `choices[].message.content` 中的 `<think>...</think>`
- `usage.completion_tokens_details.reasoning_tokens`

控制面推荐规则：

- MiniMax-M3 与 M2.x 要区分。
- M2.x 即使接受 `thinking.type=disabled`，也不能判定为 effective disable。
- `reasoning_split` 应归类为输出格式控制，不应归类为开启 / 关闭 thinking。

### 阿里官方 / DashScope / 百炼

Provider type: `ali`

推荐基础配置：

```text
base_url: https://dashscope.aliyuncs.com/compatible-mode/v1
endpoint: /chat/completions
protocol: openai-compatible
```

thinking 规则：

| 对外字段 | Ali native 映射 |
|---|---|
| `enable_thinking=true` | 原样传递 |
| `enable_thinking=false` | 原样传递，前提是 hybrid thinking 模型支持 |
| `thinking_budget` | 原样传递，前提是模型支持 |
| `thinking.type=enabled` | 可映射为 `enable_thinking=true` |
| `thinking.type=disabled` | 可映射为 `enable_thinking=false` |
| `reasoning_effort` | 仅对支持 effort 的模型映射；否则忽略 / warning |

响应落点：

- `choices[].message.reasoning_content`
- streaming delta 中的 `reasoning_content`
- usage 中可能有 reasoning token 计数

控制面推荐规则：

- 模型需要区分 hybrid thinking 与 thinking-only。
- thinking-only 模型不能关闭。
- 不支持 thinking 的模型应忽略或拒绝 thinking 字段，取决于策略。

### SiliconFlow 官方

Provider type: `siliconflow`

推荐基础配置：

```text
base_url: https://api.siliconflow.cn/v1
endpoint: /chat/completions
protocol: openai-compatible
```

thinking 规则：

| 对外字段 | SiliconFlow native 映射 |
|---|---|
| `enable_thinking=true` | 原样传递 |
| `enable_thinking=false` | 原样传递，前提是模型支持 |
| `thinking_budget` | 原样传递 |
| `thinking.type=enabled` | 可作为 DeepSeek-compatible 形态透传 / 映射 |
| `thinking.type=disabled` | 可作为 DeepSeek-compatible 形态透传 / 映射 |
| `reasoning_effort` | 如果 provider/model 支持则透传；不支持则忽略 / warning |

说明：

- 当前需求要求支持 SiliconFlow 的 `thinking` object 行为，即使官方文档未清晰列出，也应作为 SiliconFlow-compatible 扩展能力调研和支持。
- 实现时应通过 probe 验证 `thinking` object 在目标模型上的实际行为。

响应落点：

- `choices[].message.reasoning_content`
- `<think>...</think>` in content
- `usage.completion_tokens_details.reasoning_tokens`

控制面推荐规则：

- 推荐主格式仍为 `enable_thinking` / `thinking_budget`。
- `thinking` object 作为兼容扩展。
- 关闭 thinking 的判定不能只看 HTTP 200，必须看响应证据。

## 不支持字段处理策略

OpenAPI 应定义 `reasoning_options.unsupported_behavior`：

```json
{
  "reasoning_options": {
    "unsupported_behavior": "warn"
  }
}
```

取值：

| 值 | 行为 |
|---|---|
| `ignore` | 忽略不支持字段，不返回 warning |
| `warn` | 忽略不支持字段，并在 metadata 中返回 warning |
| `error` | 如果无法满足 thinking 请求，则返回 4xx |

默认建议：`warn`。

## 响应 metadata 需求

为了避免用户误判 thinking 参数是否生效，响应应增加 metadata。

建议字段名：

```json
{
  "reasoning_metadata": {
    "requested": {
      "enable_thinking": true,
      "thinking_budget": 1000,
      "thinking": {
        "type": "enabled"
      },
      "reasoning_effort": "medium"
    },
    "applied": {
      "provider": "siliconflow",
      "dialect": "enable_thinking",
      "native_params": {
        "enable_thinking": true,
        "thinking_budget": 1000
      }
    },
    "ignored": [
      {
        "field": "reasoning_effort",
        "reason": "The selected provider/model does not support this field."
      }
    ],
    "overridden": [
      {
        "field": "enable_thinking",
        "by": "chat_template_kwargs.enable_thinking"
      }
    ],
    "warnings": [],
    "evidence": {
      "visible_reasoning": true,
      "reasoning_tokens": 523,
      "locations": [
        "choices[0].message.reasoning_content"
      ]
    }
  }
}
```

metadata 至少应包含：

| 字段 | 必需 | 说明 |
|---|---:|---|
| `requested` | 是 | 用户请求中的 thinking 相关字段 |
| `applied.provider` | 是 | 实际 provider |
| `applied.dialect` | 是 | 实际使用的 thinking 方言 |
| `applied.native_params` | 建议 | 实际发给上游或映射后的关键参数，注意不要包含密钥 |
| `ignored` | 是 | 被忽略的字段 |
| `overridden` | 是 | 被更高优先级字段覆盖的字段 |
| `warnings` | 是 | 风险提示 |
| `evidence` | 建议 | 响应中观察到的 thinking 证据 |

## OpenAPI 文档交付要求

需要产出一份 OpenAPI 3.x 文档，至少包含：

1. `POST /v1/chat/completions`
2. request body schema
3. response body schema
4. streaming response 说明
5. error schema
6. thinking 参数说明
7. native escape 参数说明
8. provider-specific mapping 说明
9. 示例请求和示例响应

### 请求 schema 必须包含

OpenAI-compatible 基础字段：

- `model`
- `messages`
- `stream`
- `temperature`
- `top_p`
- `max_tokens`
- `max_completion_tokens`
- `tools`
- `tool_choice`
- `response_format`

Thinking 字段：

- `enable_thinking`
- `thinking_budget`
- `thinking`
- `reasoning_effort`
- `reasoning_options`

Escape 字段：

- `extra_body`
- 允许 additionalProperties，用于 OpenAI SDK `extra_body` 展开后的顶层 native escape 字段。

OpenAPI schema 需要明确：

```yaml
additionalProperties: true
```

或通过文档说明顶层未知字段会被视为 native escape。

## 控制面需求

### Provider 类型

控制面新增 provider 类型：

```text
vllm
deepseek
minimax
ali
siliconflow
```

每个 provider 配置至少包含：

| 字段 | 说明 |
|---|---|
| `provider_type` | provider 类型 |
| `base_url` | 上游 base URL |
| `api_key` | 上游 API key |
| `default_model` | 默认模型 |
| `thinking_policy` | thinking 映射策略 |
| `passthrough_policy` | 透传策略 |
| `unsupported_behavior` | 默认不支持字段处理方式 |
| `model_capabilities` | 模型能力配置 |

### Provider 推荐规则

控制面需要提供推荐规则：

```json
{
  "provider_type": "vllm",
  "recommended": {
    "base_url": "http://localhost:8000/v1",
    "passthrough_policy": "allow_known_native_fields",
    "thinking_policy": {
      "dialect": "vllm",
      "native_fields": [
        "reasoning_effort",
        "chat_template_kwargs",
        "thinking_token_budget"
      ]
    }
  }
}
```

各 provider 至少需要定义：

- 支持的 native thinking 字段
- 推荐的统一字段映射
- 是否允许未知字段透传
- 默认 unsupported behavior
- 响应 thinking location probe 配置

## 透传策略

需要支持至少三种透传策略：

| 策略 | 行为 |
|---|---|
| `none` | 不透传未知字段 |
| `allow_known_native_fields` | 只透传规则中声明过的 native 字段 |
| `allow_all` | 透传所有未知字段 |

默认建议：

| Provider | 默认透传策略 |
|---|---|
| `vllm` | `allow_all` 或 `allow_known_native_fields` |
| `deepseek` | `allow_known_native_fields` |
| `minimax` | `allow_known_native_fields` |
| `ali` | `allow_known_native_fields` |
| `siliconflow` | `allow_known_native_fields` |

安全要求：

- 不允许透传认证相关字段覆盖系统上游认证。
- 不允许用户通过 body 覆盖 `Authorization`、`api_key`、`base_url` 等敏感配置。
- metadata 中不得返回 API key。

## 验收标准

### OpenAPI 文档验收

1. 文档可以被 OpenAPI 3.x 工具解析。
2. `POST /v1/chat/completions` schema 包含 thinking 字段。
3. 文档明确说明 `extra_body` 与顶层 unknown fields 的区别。
4. 文档明确说明 OpenAI SDK 的 `extra_body` 会被 merge 到顶层。
5. 文档明确说明不支持字段的处理策略。
6. 文档包含每个 provider 的映射示例。

### Provider 接入验收

每个 provider 至少需要完成：

1. 控制面可选择 provider 类型。
2. 可配置 base_url、api_key、default_model。
3. 可保存 thinking policy。
4. 可保存 passthrough policy。
5. 可通过推荐规则快速填充默认配置。

### Thinking 映射验收

至少覆盖以下场景：

1. SiliconFlow:
   - `enable_thinking=true`
   - `thinking_budget=1000`
   - `thinking: {"type":"enabled"}`
   - `thinking: {"type":"disabled"}`
2. DeepSeek:
   - `enable_thinking=true -> thinking.type=enabled`
   - `enable_thinking=false -> thinking.type=disabled`
   - `reasoning_effort=medium -> high`
   - `reasoning_effort=max -> max`
3. MiniMax:
   - MiniMax-M3 enable / disable 映射
   - `reasoning_split` 透传
   - MiniMax-M2.x disabled 不应标记为确认关闭
4. Ali:
   - `enable_thinking` 原样传递
   - `thinking_budget` 原样传递
   - thinking-only 模型关闭失败应 warning 或 error
5. vLLM:
   - `chat_template_kwargs` 顶层逃生
   - `thinking_token_budget` 顶层逃生
   - `extra_body` 对象逃生
   - escape 覆盖顶层统一字段

### Metadata 验收

1. 响应包含 `reasoning_metadata`。
2. 被忽略字段出现在 `ignored`。
3. 被覆盖字段出现在 `overridden`。
4. 实际映射字段出现在 `applied.native_params`。
5. 能检测到 thinking 输出位置时，写入 `evidence.locations`。
6. 能检测到 reasoning token 时，写入 `evidence.reasoning_tokens`。

## 调研任务

请实现同学先完成以下调研：

1. OpenAI SDK Python / Node 的 `extra_body` / `extraBody` 最终 HTTP body 行为。
2. vLLM 当前版本支持的 thinking / reasoning 相关参数：
   - `reasoning_effort`
   - `chat_template_kwargs.enable_thinking`
   - `thinking_token_budget`
3. SiliconFlow 当前对 `thinking: {"type":"enabled"|"disabled"}` 的实际支持情况。
4. MiniMax 不同模型族对 `thinking.type=disabled` 的实际行为。
5. 阿里百炼哪些模型是 hybrid thinking，哪些是 thinking-only。
6. DeepSeek 官方 `reasoning_effort` 值映射和错误行为。
7. 各 provider 对未知顶层字段的行为：
   - 忽略
   - 报错
   - 透传
   - 部分接受

## 开放问题

1. `reasoning_metadata` 是否作为标准响应字段返回，还是只在 debug / verbose 模式返回？
2. `unsupported_behavior` 默认使用 `warn` 还是 `ignore`？
3. 是否第一期支持 `provider_options`，还是只支持 `extra_body` 和顶层 unknown escape？
4. 是否允许用户在请求级别覆盖 provider 的 passthrough policy？
5. 是否需要在控制面维护模型级 capability，例如：
   - supports_thinking
   - supports_thinking_disable
   - supports_thinking_budget
   - supports_reasoning_effort
   - thinking_output_locations
6. streaming 模式下 `reasoning_metadata` 如何返回：
   - 最后一个 usage chunk
   - 自定义 event
   - HTTP trailer
   - 非流式 only

## 推荐一期范围

一期建议只做：

1. OpenAPI 文档。
2. 新增五个 provider 类型。
3. 控制面推荐规则。
4. `enable_thinking`、`thinking_budget`、`thinking`、`reasoning_effort` 字段定义。
5. `extra_body` + 顶层 unknown fields 逃生。
6. provider-specific mapping 规则配置。
7. 非流式响应中的 `reasoning_metadata`。
8. 基础 probe / 单元测试验证映射。

二期再做：

1. streaming metadata。
2. provider_options。
3. 模型级 capability 自动探测。
4. 更细的 strict/error 策略。
5. 控制面可视化展示 thinking probe 结果。
