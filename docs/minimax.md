# MiniMax OpenAI-Compatible Chat Completions Support List

Sources:

- https://platform.minimax.io/docs/llms.txt
- https://platform.minimax.io/docs/api-reference/text-chat-openai
- https://platform.minimax.io/docs/api-reference/text-openai-api
- https://platform.minimax.io/docs/guides/text-chat
- https://platform.minimax.io/docs/guides/text-m2-function-call
- https://platform.minimax.io/docs/api-reference/text-prompt-caching

This file is a support matrix for compatibility-test design. It only covers MiniMax's OpenAI-compatible Chat Completions endpoint.

## Endpoint And Headers

| Item | Support | Notes |
|---|---|---|
| Endpoint | supported | `POST https://api.minimaxi.com/v1/chat/completions` |
| Base URL | supported | `https://api.minimaxi.com/v1` |
| Auth | required | `Authorization: Bearer <MINIMAX_API_KEY>` |
| `Content-Type` | required | `application/json` |
| OpenAI SDK base URL | supported | `OPENAI_BASE_URL=https://api.minimaxi.com/v1` |

MiniMax also exposes an Anthropic-compatible Messages endpoint for Claude-style request bodies:

| Item | Support | Notes |
|---|---|---|
| Messages base URL | supported | `https://api.minimaxi.com/anthropic/v1` |
| Messages endpoint | supported | `POST https://api.minimaxi.com/anthropic/v1/messages` |
| Messages auth | required | `X-Api-Key: <MINIMAX_API_KEY>` plus `anthropic-version: 2023-06-01` |

## Supported Models

Official MiniMax pages do not list exactly the same enum in every place. Prefer `MiniMax-M2.7` as the default smoke-test model and keep model override available.

| Model | Support | Context | Notes |
|---|---|---|---|
| `MiniMax-M2.7` | supported | `204,800` | Default recommended test model. About 60 tps in docs. |
| `MiniMax-M2.7-highspeed` | supported | `204,800` | Same family, faster output, about 100 tps. |
| `MiniMax-M2.5` | supported | `204,800` | M2.5 family. |
| `MiniMax-M2.5-highspeed` | supported by SDK/overview docs | `204,800` | Some HTTP reference enums may omit this value; verify in real tests. |
| `MiniMax-M2.1` | supported | `204,800` | M2.1 family. |
| `MiniMax-M2.1-highspeed` | supported by SDK/overview docs | `204,800` | Some HTTP reference enums may omit this value; verify in real tests. |
| `MiniMax-M2` | supported by SDK/overview docs | `204,800` | Agentic/reasoning model; some HTTP reference enums may omit this value. |
| `M2-her` | guide-only legacy/special model | `64K` | Chat guide describes it for role-play/dialogue. Do not use as default OpenAI-compatible smoke-test model. |

## Required Body Fields

| Field | Support | Type | Notes |
|---|---|---|---|
| `model` | required | `string` | Use a supported MiniMax model ID, usually `MiniMax-M2.7`. |
| `messages` | required | `array<object>` | Conversation history. |

## Message Roles

| Role | Support | Notes |
|---|---|---|
| `system` | supported | Defines model behavior. |
| `user` | supported | User input. |
| `assistant` | supported | Historical model responses. Preserve full assistant messages in tool/thinking workflows. |
| `tool` | supported by tool workflow | Used for tool result pass-back after assistant tool calls. |
| `user_system` | MiniMax extension | Defines the user's role/persona for role-play scenarios. |
| `group` | MiniMax extension | Conversation group/scenario name. |
| `sample_message_user` | MiniMax extension | Example user message for dialogue style learning. |
| `sample_message_ai` | MiniMax extension | Example assistant message for dialogue style learning. |

## Core Request Parameters

| Parameter | Support | Type / Range | Notes |
|---|---|---|---|
| `stream` | supported | `boolean`, default `false` | Returns `chat.completion.chunk` style chunks when true. |
| `max_completion_tokens` | supported | integer `>= 1`; HTTP page says max `2048` | Preferred length control for `/v1/chat/completions`. |
| `temperature` | supported | `(0, 1]`; default/recommended `1.0` | Values outside this range return an error, not clipping. |
| `top_p` | supported | `(0, 1]`; default `0.95` | Nucleus sampling. |
| `n` | restricted | only `1` | SDK compatibility page says `n` only supports value `1`. |
| `reasoning_split` | MiniMax extension | `boolean` | Pass via OpenAI SDK `extra_body`. When true, thinking content is returned separately in `message.reasoning_details`. |
| `stream_options` | docs mention / partially specified | `object` | OpenAI-compatible page mentions streaming; child fields should be verified by real tests. |

## Ignored / Unsupported Parameters

| Parameter / Feature | Support | Notes |
|---|---|---|
| `presence_penalty` | ignored | Official compatibility page says it is ignored. |
| `frequency_penalty` | ignored | Official compatibility page says it is ignored. |
| `logit_bias` | ignored | Official compatibility page says it is ignored. |
| `function_call` | unsupported | Deprecated OpenAI function-call field is not supported; use `tools`. |
| `image_url` / image input | unsupported | Official compatibility page says image input is not currently supported. |
| `input_audio` / audio input | unsupported | Official compatibility page says audio input is not currently supported. |
| `max_tokens` | not clearly documented for OpenAI-compatible endpoint | Prefer `max_completion_tokens`; include only as legacy compatibility probe if needed. |
| `response_format` | not clearly documented for M2 OpenAI-compatible endpoint | Do not assume JSON mode or JSON schema support until tested. |
| `logprobs`, `top_logprobs`, `seed`, `stop`, `parallel_tool_calls`, `metadata`, `user` | not clearly documented for MiniMax OpenAI-compatible HTTP | Include as probe cases if client compatibility matters, but classify as unknown until tested. |

## Tool Calling

| Field | Support | Shape / Notes |
|---|---|---|
| `tools` | supported | Function tool definitions. |
| `tools[].type=function` | supported | Function tool. |
| `tools[].function.name` | supported | Function name. |
| `tools[].function.description` | supported | Function description. |
| `tools[].function.parameters` | supported | JSON Schema object. |
| `tool_choice=auto` | supported | Model decides whether to call tools. |
| `tool_choice=none` | supported | Model does not call tools. |
| Forced named function | unclear / must test | Current docs emphasize `tools`; exact forced named function behavior should be verified. |
| `choices[].message.tool_calls` | supported | Tool call response field. |
| `tool_calls[].function.arguments` | supported | JSON string; caller must validate. |

Tool/thinking continuity caveat:

- In multi-turn function-call conversations, append the complete assistant message to history, including `tool_calls`.
- MiniMax may inject thinking into `message.content` using `<think>...</think>`; preserve it unchanged.
- With `reasoning_split: true`, MiniMax returns thinking in `message.reasoning_details`; preserve that field in later history.

## Prompt Caching

| Feature | Support | Notes |
|---|---|---|
| Automatic caching | supported | Works without request-shape changes; docs say it applies to API calls with `512` or more input tokens. |
| OpenAI-compatible cache usage | supported | `usage.prompt_tokens_details.cached_tokens` can report cache hits. |
| Cache-supported models | supported | Docs list M2.7/M2.5/M2.1 series for passive caching. |

## Non-Streaming Response Fields

| Field | Support | Notes |
|---|---|---|
| `id` | supported | Unique response ID. |
| `object` | supported | `chat.completion`. |
| `created` | supported | Unix timestamp in seconds. |
| `model` | supported | Model used. |
| `choices` | supported | Choice array. |
| `choices[].index` | supported | Choice index. |
| `choices[].finish_reason` | supported | Examples include `stop`; length/tool-call values should be tested. |
| `choices[].message.role` | supported | Usually `assistant`. |
| `choices[].message.content` | supported | May include `<think>` content if `reasoning_split` is false/not used. |
| `choices[].message.name` | supported | Example responses include `MiniMax AI`. |
| `choices[].message.audio_content` | MiniMax response field | Present as an empty string in examples. |
| `choices[].message.reasoning_details` | `reasoning_split` response field | Returned when `reasoning_split: true`. |
| `choices[].message.tool_calls` | supported | Function call results. |
| `usage.prompt_tokens` | supported | Prompt token count. |
| `usage.completion_tokens` | supported | Completion token count. |
| `usage.total_tokens` | supported | Total token count. |
| `usage.total_characters` | MiniMax extension | Present in examples. |
| `usage.completion_tokens_details.reasoning_tokens` | supported | Reasoning token count. |
| `usage.prompt_tokens_details.cached_tokens` | supported with prompt caching | Shown in OpenAI SDK prompt-caching example. |

## Streaming Response Shape

| Field / Event | Support | Notes |
|---|---|---|
| Streaming chunks | supported | Chat completion chunk style. |
| `object` | supported | `chat.completion.chunk`. |
| `id`, `created`, `model` | supported | Same logical completion identity across chunks. |
| `choices[].delta.content` | supported | Incremental output text. |
| `choices[].delta.tool_calls` | supported with tools | Incremental tool-call data should be verified. |
| `choices[].finish_reason` | supported | Final chunk finish reason. |

## Error / Boundary Behavior To Test

| Case | Expected / Documented Behavior |
|---|---|
| `temperature=0` | Invalid because range is open on the left: `(0, 1]`. |
| `temperature>1` | Invalid; docs say values outside range return an error. |
| `top_p=0` | Invalid because range is open on the left. |
| `top_p>1` | Invalid. |
| `n != 1` | Unsupported/rejected or otherwise non-compliant; docs say only `1` is supported. |
| `presence_penalty`, `frequency_penalty`, `logit_bias` | Accepted but ignored per docs. |
| `function_call` | Unsupported; use `tools`. |
| Image/audio input | Not supported. |
| `reasoning_split=true` | Should separate thinking into `message.reasoning_details`; verify response shape. |

## Compatibility Test Implications

| Group | Fields To Test |
|---|---|
| Required / defaults | `model`, `messages`, default `stream`, default `temperature`, default `top_p` |
| Message roles | `system`, `user`, `assistant`, `tool`, `user_system`, `group`, `sample_message_user`, `sample_message_ai` |
| Sampling boundaries | `temperature`, `top_p`, invalid `0`, invalid `>1`, restricted `n` |
| Ignored parameters | `presence_penalty`, `frequency_penalty`, `logit_bias` |
| Length | `max_completion_tokens`, legacy probe for `max_tokens` |
| Streaming | `stream`, chunk object parsing |
| Reasoning | `<think>` in `content`, `reasoning_split`, `reasoning_details` |
| Tools | `tools`, `tool_choice=auto`, `tool_choice=none`, tool call response, tool result pass-back |
| Unsupported inputs | `image_url`, `input_audio` |
| Response extensions | `audio_content`, `reasoning_details`, `usage.total_characters`, cache usage fields |
| Prompt caching | Automatic cache hit fields via `usage.prompt_tokens_details.cached_tokens` |

Important compatibility caveats:

- For OpenAI-compatible M2 models, do not assume full OpenAI parameter parity. MiniMax explicitly ignores some standard OpenAI fields and rejects/limits others.
- Preserve full thinking/tool response objects in multi-turn tool workflows. Dropping `<think>`, `reasoning_details`, or `tool_calls` can break reasoning continuity.
- Some official pages disagree on exact model enum coverage. Treat model access failures separately from parameter compatibility failures.
