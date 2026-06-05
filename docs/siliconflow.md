# SiliconFlow Chat Completions API Notes

Sources:

- https://api-docs.siliconflow.cn/docs/api/chat-completions-post
- https://api-docs.siliconflow.cn/docs/userguide/capabilities/multimodal-vision

This document summarizes the SiliconFlow OpenAI-compatible Chat Completions endpoint for `llm-rosetta` mock template and compatibility-test design. It is a structured summary of the docs page, not a verbatim mirror.

## Endpoint

```http
POST https://api.siliconflow.cn/v1/chat/completions
```

The endpoint creates a model response for a chat conversation and follows an OpenAI-style chat completions shape.

## Authentication

Use bearer-token authentication in the request headers:

```http
Authorization: Bearer <token>
Content-Type: application/json
```

## Required Request Fields

| Field | Type | Notes |
|---|---|---|
| `model` | `string` | Model name, for example `Pro/zai-org/GLM-4.7`. The docs point users to the SiliconFlow model list for the current supported models. |
| `messages` | `array<object>` | Conversation messages so far. Typical roles include `system`, `user`, `assistant`, and tool-related messages when using function calling. |

## Supported / Documented Request Parameters

| Parameter | Type | Compatibility Notes |
|---|---|---|
| `model` | `string` | Required. OpenAI-standard field. |
| `messages` | `array<object>` | Required. OpenAI-standard field. |
| `stream` | `boolean` | OpenAI-compatible streaming switch. |
| `max_tokens` | `integer` | Maximum generated tokens. Docs warn not to set it to the context-window upper bound; reserve about 10k tokens for input and system overhead. |
| `enable_thinking` | `boolean` | SiliconFlow/Qwen-style reasoning-mode switch. Only supported by specific models listed in the docs. |
| `thinking_budget` | `integer` | Reasoning budget for reasoning models. |
| `reasoning_effort` | `string` | OpenAI-style reasoning effort parameter. |
| `min_p` | `number` | Alternative sampling parameter. |
| `stop` | `array<string> \| string \| null` | Stop sequence configuration. |
| `temperature` | `number` | Sampling temperature. |
| `top_p` | `number` | Nucleus sampling. |
| `top_k` | `number` | Top-k sampling; not part of the core OpenAI chat-completions parameter set. |
| `frequency_penalty` | `number` | Penalizes repeated tokens based on frequency. Range shown in docs: `-2 <= value <= 2`. |
| `n` | `integer` | Number of generations to return. Example/default shown as `1`. |
| `response_format` | `Text \| JSON schema \| JSON object` | Supports text, JSON schema, and JSON object response formats. Docs recommend JSON schema where supported. |
| `tools` | `array<object>` | Function-calling tools. The docs state only functions are currently supported as tools and mention a max of 128 functions. |
| `tool_choice` | inferred from examples | Examples use `tool_choice: "auto"`. |

## VLM / Multimodal Request Parameters

SiliconFlow documents VLM input on the same OpenAI-compatible `POST /chat/completions` endpoint. Use a vision-capable model such as `zai-org/GLM-4.6V` and pass multimodal content parts in `messages[].content`.

| Parameter / Field | Type | Compatibility Notes |
|---|---|---|
| `model` | `string` | Required. For image understanding examples, the Chat Completions docs use `zai-org/GLM-4.6V`. Model availability and modality support can change; check the SiliconFlow model hub for the current list. |
| `messages` | `array<object>` | Required. For multimodal requests, user message `content` is an array of content parts instead of a plain string. |
| `messages[].content[]` | `array<object>` | Each content part declares a `type`, such as `text`, `image_url`, `audio_url`, or `video_url`. |
| `messages[].content[].type` | `string` | Multimodal type discriminator. Documented values include `text`, `image_url`, `audio_url`, and `video_url`. |
| `messages[].content[].text` | `string` | Text instruction paired with media content. |
| `messages[].content[].image_url.url` | `string` | Image URL or base64-encoded image data. DeepSeek-OCR-specific docs also mention PDF URL/base64 support. |
| `messages[].content[].image_url.detail` | `string` | Optional detail level for image input: `auto`, `low`, or `high`. |
| `messages[].content[].video_url.url` | `string` | Video URL or base64-encoded video data. Use only with video-capable models. |
| `messages[].content[].video_url.detail` | `string` | Optional video detail level: `auto`, `low`, or `high`. |
| `messages[].content[].video_url.max_frames` | `integer` | Maximum number of frames to extract from a video. |
| `messages[].content[].video_url.fps` | `number` | Frames per second to extract. Docs describe final frame count as `min(fps × duration, max_frames)`. |
| `messages[].content[].audio_url.url` | `string` | Audio URL or base64-encoded audio data. Use only with audio-capable multimodal models. |
| `temperature` | `number` | Supported in the documented image-input cURL example. |
| `max_tokens` | `integer` | Supported in the documented image-input examples; use a small value for compatibility smoke tests. |

Documented model-family modality notes:

| Model Family | Vision | Audio | Video | Notes |
|---|---:|---:|---:|---|
| Qwen3-Omni | yes | yes | yes | Full multimodal support. |
| Qwen3-VL | yes | no | yes | Vision and video understanding. |
| GLM | yes | no | no | Vision understanding only. |
| Qwen2-VL | yes | no | no | Vision understanding only. |
| DeepseekVL2 | yes | no | no | Vision understanding only. |
| Step3 | yes | no | no | Vision understanding only. |
| DeepSeek-OCR | yes | no | no | Vision/OCR-oriented; docs mention PDF input support. |

## VLM Request Example

```bash
curl --location "https://api.siliconflow.cn/v1/chat/completions" \
  --header "Content-Type: application/json" \
  --header "Authorization: Bearer YOUR_API_KEY" \
  --data '{
    "model": "zai-org/GLM-4.6V",
    "messages": [
      {
        "role": "user",
        "content": [
          {"type": "text", "text": "Describe this image in one short phrase."},
          {
            "type": "image_url",
            "image_url": {
              "url": "https://example.com/image1.jpg",
              "detail": "low"
            }
          }
        ]
      }
    ],
    "temperature": 0.2,
    "max_tokens": 120
  }'
```

## Response Shape

The documented response includes these top-level fields:

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | Response id. |
| `choices` | `array<object>` | Completion choices. |
| `usage` | `object` | Token usage. |
| `created` | `integer` | Creation timestamp. |
| `model` | `string` | Model used. |
| `object` | `string` | OpenAI-style object type, typically `chat.completion`. |

The docs also mention that the response header contains `x-siliconcloud-trace-id`, a unique request trace identifier useful for log lookup and troubleshooting.

## Choice Fields

Documented or visible choice-related fields include:

| Field | Type | Notes |
|---|---|---|
| `choices[].message.content` | `string` | Final assistant answer. |
| `choices[].message.reasoning_content` | `string` | Supported only by the DeepSeek-R1 series according to the docs. It is returned alongside `content`; previous reasoning chains are not appended to later-round context. |
| `choices[].message.tool_calls` | `array<object>` | Tool/function calls generated by the model. |
| `choices[].finish_reason` | `string` | Documented values include `stop`, `eos`, `length`, and `tool_calls`. |

## Usage Fields

Documented or visible usage fields include:

| Field | Type | Notes |
|---|---|---|
| `usage.prompt_tokens` | `integer` | Number of tokens in the prompt. |
| `usage.completion_tokens` | `integer` | Number of generated completion tokens. |
| `usage.total_tokens` | `integer` | Prompt + completion token count. |
| `usage.prompt_cache_hit_tokens` | `integer` | Number of input tokens that resulted in a cache hit. |
| `usage.prompt_cache_miss_tokens` | `integer` | Number of input tokens that did not result in a cache hit. |
| `usage.completion_tokens_details.reasoning_tokens` | `integer` | Tokens generated for reasoning. |
| `usage.prompt_tokens_details.cached_tokens` | `integer` | Cached tokens in the prompt. |

## Function Calling

The docs describe `tools` as a list of tool definitions the model may call. Currently only `function` tools are supported. Tool-call details include:

| Field | Type | Notes |
|---|---|---|
| `tools[].type` | `string` | Value is `function`. |
| `tools[].function.name` | `string` | Function name. |
| `tools[].function.description` | `string` | Function description. |
| `tools[].function.parameters` | `object` | JSON schema-like parameter definition. |
| `choices[].message.tool_calls[].id` | `string` | Tool call id. |
| `choices[].message.tool_calls[].type` | `string` | Currently `function`. |
| `choices[].message.tool_calls[].function.name` | `string` | Called function name. |
| `choices[].message.tool_calls[].function.arguments` | `string` | Generated function arguments as JSON text. Validate before execution. |

## Minimal Request Example

```bash
curl --request POST \
  --url https://api.siliconflow.cn/v1/chat/completions \
  --header "Content-Type: application/json" \
  --header "Authorization: Bearer YOUR_API_KEY" \
  --data '{
    "model": "Pro/zai-org/GLM-4.7",
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "Say hi"}
    ]
  }'
```

## OpenAI SDK Style

The docs show the OpenAI Python SDK configured with SiliconFlow's base URL:

```python
from openai import OpenAI

client = OpenAI(
    api_key="YOUR_API_KEY",
    base_url="https://api.siliconflow.cn/v1"
)

response = client.chat.completions.create(
    model="Pro/zai-org/GLM-4.7",
    messages=[
        {"role": "user", "content": "Say hi"}
    ]
)
```

## llm-rosetta Template Implications

Suggested SiliconFlow test groups:

| Group | Parameters |
|---|---|
| Sampling | `temperature`, `top_p`, `top_k`, `min_p`, `n`, `stop`, `frequency_penalty` |
| Length | `max_tokens` |
| Reasoning | `enable_thinking`, `thinking_budget`, `reasoning_effort` |
| Output | `response_format` |
| Tools | `tools`, `tool_choice` |
| Protocol | `stream` |
| Prefix continuation | `messages[].prefix` |
| Metadata / Observability | response header `x-siliconcloud-trace-id`, usage cache fields |
| Vision / Multimodal | `messages[].content[]`, `messages[].content[].image_url`, `image_url.detail`, `video_url`, `audio_url` |

Compatibility points to test against OpenAI:

- `top_k`, `min_p`, `enable_thinking`, and `thinking_budget` are provider/model-specific extensions.
- `messages[].prefix` is a model/provider-extension probe for assistant prefix continuation. Keep it optional and verify that the returned assistant content starts with the requested prefix.
- VLM inputs use OpenAI-style content arrays, but support is model-gated. Keep image/video/audio cases optional or marked with `requires_model_capability`.
- `reasoning_content` can appear inside `choices[].message` for supported reasoning models.
- `usage` can include provider-specific cache and reasoning-token breakdown fields.
- The top-level OpenAI-compatible required response fields to verify are `id`, `object`, `created`, `model`, `choices`, and `usage`.
- Function calling should be tested for both request acceptance (`tools`, `tool_choice`) and response shape (`tool_calls[].function.arguments` as a string).
