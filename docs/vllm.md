# vLLM OpenAI-Compatible Server Notes

Sources:

- https://docs.vllm.ai/en/latest/serving/online_serving/openai_compatible_server/
- https://docs.vllm.ai/en/v0.15.0/features/structured_outputs/

This document summarizes vLLM's OpenAI-compatible server for provider-diff compatibility-test design. It focuses on `POST /v1/chat/completions` and request parameters that are useful for protocol probing.

## Endpoint And Headers

| Item | Support | Notes |
|---|---|---|
| Endpoint | supported | `POST http://localhost:8000/v1/chat/completions` by default after `vllm serve ...`. |
| Base URL | supported | Default local server base URL is `http://localhost:8000/v1`. |
| Auth | optional / deployment-dependent | The docs show `--api-key token-abc123`; requests use `Authorization: Bearer <token>`. Some local deployments accept any placeholder key. |
| `Content-Type` | required | `application/json`. |
| Streaming | supported | `stream: true` returns server-sent events. |
| `X-Request-Id` header | supported with flag | vLLM documents `X-Request-Id` as the supported extra HTTP header when enabled by `--enable-request-id-headers`. |

## Required Body Fields

| Field | Support | Type | Notes |
|---|---|---|---|
| `model` | required | `string` | Served model id. The docs examples commonly use Hugging Face model ids such as `NousResearch/Meta-Llama-3-8B-Instruct`. |
| `messages` | required | `array<object>` | OpenAI-style chat messages. The served model needs a chat template for Chat Completions. |

## OpenAI-Compatible Chat Fields

The Chat API is documented as compatible with OpenAI Chat Completions. vLLM also supports vision- and audio-related request parameters, but `image_url.detail` is explicitly not supported. The `user` parameter is documented as ignored.

Common useful compatibility probes:

| Parameter | Notes |
|---|---|
| `temperature`, `top_p`, `stop` | Standard sampling fields. |
| `max_tokens` / `max_completion_tokens` | Output length fields; actual support can vary by vLLM version and OpenAI client compatibility layer. |
| `response_format` | Supports `text`, `json_object`, `json_schema`, and `structural_tag` formats in current docs. |
| `tools`, `tool_choice`, `parallel_tool_calls` | Tool behavior depends on the served model and launch flags such as tool-call parser / auto tool choice settings. |
| `stream`, `stream_options.include_usage` | Streaming protocol and optional final usage chunk. |

## vLLM Extra Body Parameters

vLLM documents extra parameters that can be sent through OpenAI SDK `extra_body` or directly merged into raw HTTP JSON payloads.

| Parameter | Type / Values | Notes |
|---|---|---|
| `top_k` | `integer` or `null` | Top-k sampling; not part of core OpenAI Chat Completions. |
| `min_p` | `number` | Alternative sampling cutoff. |
| `repetition_penalty` | `number` | Penalizes repeated generation. |
| `length_penalty` | `number` | Beam-search related length penalty. |
| `stop_token_ids` | `array<int>` | Token-id stop conditions. |
| `include_stop_str_in_output` | `boolean` | Controls whether matched stop strings remain in output. |
| `ignore_eos` | `boolean` | Continue generation after EOS when true. |
| `min_tokens` | `integer` | Minimum number of generated tokens. |
| `skip_special_tokens` | `boolean` | Controls special-token stripping. |
| `spaces_between_special_tokens` | `boolean` | Controls spacing between special tokens. |
| `truncate_prompt_tokens` | `integer` | Truncate prompt token count. |
| `truncation_side` | `left` / `right` | Which side to truncate when truncation is active. |
| `allowed_token_ids` | `array<int>` | Restrict possible output token ids. |
| `prompt_logprobs` | `integer` | Prompt token log probabilities. |
| `echo` | `boolean` | Prepends the last message when the role matches. |
| `add_generation_prompt` | `boolean` | Chat-template control for adding the generation prompt. |
| `continue_final_message` | `boolean` | Allows assistant prefill / continuing the final message; cannot be combined with `add_generation_prompt`. |
| `structured_outputs` | object | Current structured-output wrapper, e.g. `{ "choice": ["positive", "negative"] }` or `{ "json": {...schema...} }`. |
| `request_id` | `string` | Request id carried through inference and returned in response. |
| `return_token_ids` | `boolean` | Adds token ids to response/chunks for debugging. |
| `return_prompt_text` | `boolean` | Adds rendered prompt text for chat-template inspection. |
| `cache_salt` | `string` | Salts prefix cache in multi-tenant deployments. |
| `vllm_xargs` | object | Extra custom-extension request parameters. |

## Test Design Notes

- Use `http://localhost:8000/v1` as the default base URL because vLLM is usually a self-hosted local or private deployment.
- Use `Qwen/Qwen3-8B` as the default reasoning-focused placeholder because the vLLM reasoning docs use Qwen3 examples with a matching reasoning parser; users should override it to the served model id when running cases.
- For thinking-mode validation, start vLLM with a reasoning-capable model and matching parser, for example `vllm serve Qwen/Qwen3-8B --reasoning-parser qwen3`.
- Treat thinking-mode success as observable evidence, not just request acceptance: non-stream responses should expose a non-empty reasoning field such as `choices[].message.reasoning` / `reasoning_content`, stream chunks should expose reasoning in `choices[].delta.*`, or usage should contain positive reasoning/thinking token counts.
- `reasoning_effort=low|medium|high` should enable thinking, while `reasoning_effort=none` should disable it. Explicit `chat_template_kwargs.enable_thinking` takes priority over the automatic value inferred from `reasoning_effort`.
- Treat tool-calling probes as optional because a model may need server launch flags such as `--enable-auto-tool-choice` and a tool-call parser.
- Avoid a required vision test in the first provider set because model capability and `image_url.detail` behavior vary; include it only as a later model-capability-specific expansion.
- Validate parameter acceptance and OpenAI-style response shape rather than exact generated text.
