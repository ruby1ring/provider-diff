/**
 * Maps docs/api/*.md files to channel metadata (parameter groups, doc status).
 * Used by inject-protocol-frontmatter.mjs and build-protocol-matrix.mjs fallback.
 */
export const PROTOCOL_DOC_MANIFEST = {
  "docs/api/deepseek.md": {
    channel_id: "deepseek",
    protocol_id: "chat_completions",
    doc_status: "verified",
    doc_url: "https://api-docs.deepseek.com/zh-cn/api/create-chat-completion",
    last_verified: "2026-06-16",
    compare: true,
    required_parameters: ["model", "messages"],
    parameter_groups: {
      Sampling: ["temperature", "top_p", "stop", "frequency_penalty", "presence_penalty"],
      Length: ["max_tokens"],
      "Reasoning.Switch": ["thinking"],
      "Reasoning.Intensity": ["reasoning_effort"],
      "Output.Structure": ["response_format"],
      Tools: ["tools", "tool_choice", "tools[].function.strict"],
      Protocol: ["stream", "stream_options", "stream_options.include_usage"],
      Debug: ["logprobs", "top_logprobs"],
      Metadata: ["user_id"],
      Beta: ["messages[].prefix", "messages[].reasoning_content"]
    },
    notes: "对照 docs/api/deepseek.md（2026-06-16）。frequency_penalty / presence_penalty 已 deprecated，接受但无效果。"
  },
  "docs/api/deepseek-message.md": {
    channel_id: "deepseek",
    protocol_id: "anthropic_messages",
    doc_status: "verified",
    doc_url: "https://api-docs.deepseek.com/zh-cn/guides/anthropic_api",
    last_verified: "2026-06-16",
    compare: true,
    required_parameters: ["model", "messages", "max_tokens"],
    parameter_groups: {
      Core: ["model", "messages", "max_tokens", "system"],
      Sampling: ["temperature", "top_p", "stop_sequences"],
      "Reasoning.Switch": ["thinking"],
      "Output.Structure": ["output_config"],
      Tools: ["tools", "tools[].name", "tools[].description", "tools[].input_schema", "tool_choice"],
      Protocol: ["stream"],
      Metadata: ["metadata", "metadata.user_id"],
      Unsupported: ["top_k", "container", "mcp_servers", "service_tier"]
    },
    notes: "对照 docs/api/deepseek-message.md（2026-06-16）。temperature [0,2]；thinking.budget_tokens Ignored。"
  },
  "docs/api/moonshot-chat.md": {
    channel_id: "moonshot",
    protocol_id: "chat_completions",
    doc_status: "verified",
    doc_url: "https://platform.moonshot.cn/docs/api/chat",
    last_verified: "2026-06-25",
    compare: true,
    required_parameters: ["model", "messages"],
    parameter_groups: {
      Sampling: ["temperature", "top_p", "n", "stop", "presence_penalty", "frequency_penalty"],
      Length: ["max_tokens", "max_completion_tokens"],
      "Output.Structure": ["response_format"],
      Tools: ["tools"],
      Protocol: ["stream", "stream_options.include_usage"],
      Metadata: ["prompt_cache_key", "safety_identifier"]
    },
    notes: "对照 docs/api/moonshot-chat.md（2026-06-25）。temperature 范围 [0,1]（非 OpenAI [0,2]）；max_tokens 已弃用。"
  },
  "docs/api/zhipu-chat.md": {
    channel_id: "zhipu",
    protocol_id: "chat_completions",
    doc_status: "verified",
    doc_url: "https://open.bigmodel.cn/dev/api#glm-4",
    last_verified: "2026-06-25",
    compare: true,
    required_parameters: ["model", "messages"],
    parameter_groups: {
      Sampling: ["temperature", "top_p", "stop"],
      Length: ["max_tokens"],
      "Reasoning.Switch": ["thinking", "thinking.type"],
      "Reasoning.Intensity": ["reasoning_effort"],
      "Reasoning.Output": ["thinking.clear_thinking"],
      "Output.Structure": ["response_format"],
      Tools: ["tools", "tool_choice", "tool_stream"],
      Protocol: ["stream", "do_sample"],
      Metadata: ["request_id", "user_id"]
    },
    notes: "对照 docs/api/zhipu-chat.md（2026-06-25）。temperature 范围 [0,1]；reasoning_effort 仅 GLM-5.2。"
  },
  "docs/api/ali-chat.md": {
    channel_id: "aliyun",
    protocol_id: "chat_completions",
    doc_status: "verified",
    doc_url: "https://help.aliyun.com/zh/model-studio/qwen-api-via-openai-chat-completions",
    last_verified: "2026-06-25",
    compare: true,
    required_parameters: ["model", "messages"],
    parameter_groups: {
      Sampling: ["temperature", "top_p", "top_k", "repetition_penalty", "presence_penalty", "seed", "stop", "n"],
      Length: ["max_tokens", "max_completion_tokens"],
      "Reasoning.Switch": ["enable_thinking", "thinking"],
      "Reasoning.Intensity": ["thinking_budget", "reasoning_effort"],
      "Reasoning.Output": ["preserve_thinking"],
      "Output.Structure": ["response_format"],
      "Output.Modality": ["modalities", "vl_high_resolution_images", "audio"],
      Tools: ["tools", "tool_choice", "parallel_tool_calls", "tool_stream", "enable_code_interpreter"],
      Protocol: ["stream", "stream_options.include_usage"],
      Debug: ["logprobs", "top_logprobs"],
      Search: ["enable_search", "search_options"],
      Extra: ["skill", "X-DashScope-DataInspection"]
    },
    notes: "对照 docs/api/ali-chat.md（2026-06-25）。含百炼 extra_body 与搜索扩展参数。"
  },
  "docs/api/ali-message.md": {
    channel_id: "aliyun",
    protocol_id: "anthropic_messages",
    doc_status: "verified",
    doc_url: "https://help.aliyun.com/zh/model-studio/anthropic-api-messages",
    last_verified: "2026-06-25",
    compare: true,
    required_parameters: ["model", "messages", "max_tokens"],
    parameter_groups: {
      Core: ["model", "messages", "max_tokens", "system"],
      Sampling: ["temperature", "top_p", "top_k", "stop_sequences"],
      "Reasoning.Switch": ["thinking"],
      "Reasoning.Intensity": ["thinking.budget_tokens", "reasoning_effort"],
      Tools: ["tools", "tool_choice"],
      Protocol: ["stream"],
      "Output.Structure": ["output_config"]
    },
    notes: "对照 docs/api/ali-message.md（2026-06-25）。temperature 范围 [0,2)（非 Anthropic 官方 [0,1]）。"
  },
  "docs/api/ali-response.md": {
    channel_id: "aliyun",
    protocol_id: "responses_api",
    doc_status: "verified",
    doc_url: "https://help.aliyun.com/zh/model-studio/qwen-api-via-openai-responses",
    last_verified: "2026-06-25",
    compare: true,
    required_parameters: ["model", "input"],
    parameter_groups: {
      Core: ["model", "input"],
      Sampling: ["temperature", "top_p"],
      Length: ["max_output_tokens"],
      "Reasoning.Intensity": ["reasoning.effort"],
      Tools: ["tools", "tool_choice"],
      Protocol: ["stream"]
    },
    notes: "对照 docs/api/ali-response.md（2026-06-25）。仅文档化参数生效；background 异步不支持。"
  },
  "docs/api/openrouter-chat.md": {
    channel_id: "openrouter",
    protocol_id: "chat_completions",
    doc_status: "verified",
    doc_url: "https://openrouter.ai/docs/api/api-reference/chat/send-chat-completion-request",
    last_verified: "2026-06-25",
    compare: true,
    required_parameters: ["messages"],
    parameter_groups: {
      Core: ["model", "messages"],
      Sampling: ["temperature", "top_p", "top_k", "frequency_penalty", "presence_penalty", "repetition_penalty", "min_p", "top_a", "logit_bias", "logprobs", "top_logprobs"],
      "Reasoning.Switch": ["reasoning"],
      "Reasoning.Intensity": ["reasoning_effort"],
      Routing: ["models", "provider", "plugins", "session_id"],
      Tools: ["parallel_tool_calls"]
    },
    notes: "对照 docs/api/openrouter-chat.md（2026-06-25）。矩阵仅收录文档摘要表参数；model 可选。"
  },
  "docs/api/openrouter-message.md": {
    channel_id: "openrouter",
    protocol_id: "anthropic_messages",
    doc_status: "verified",
    doc_url: "https://openrouter.ai/docs/api/api-reference/anthropic-messages/create-messages",
    last_verified: "2026-06-25",
    compare: true,
    required_parameters: ["model", "messages", "max_tokens"],
    parameter_groups: {
      Core: ["model", "messages", "max_tokens", "system"],
      Sampling: ["temperature", "top_p", "top_k", "stop_sequences"],
      "Reasoning.Switch": ["thinking"],
      Tools: ["tools", "tool_choice"],
      Protocol: ["stream"],
      Routing: ["models", "fallbacks", "provider", "session_id", "route", "trace", "stop_server_tools_when"],
      Extra: ["output_config", "metadata", "user", "cache_control", "plugins", "service_tier", "context_management", "speed"]
    },
    notes: "对照 docs/api/openrouter-message.md（2026-06-25）。"
  },
  "docs/api/openrouter-response.md": {
    channel_id: "openrouter",
    protocol_id: "responses_api",
    doc_status: "verified",
    doc_url: "https://openrouter.ai/docs/api/reference/responses/overview",
    last_verified: "2026-06-25",
    compare: true,
    required_parameters: ["model", "input"],
    parameter_groups: {
      Core: ["model", "input"],
      Sampling: ["temperature", "top_p"],
      Length: ["max_output_tokens"],
      Tools: ["tools", "tool_choice"],
      Protocol: ["stream"]
    },
    notes: "对照 docs/api/openrouter-response.md（2026-06-25）。"
  },
  "docs/api/minimax-chat.md": {
    channel_id: "minimax",
    protocol_id: "chat_completions",
    doc_status: "verified",
    doc_url: "https://platform.minimax.io/docs/api-reference/text-chat-openai",
    last_verified: "2026-06-25",
    compare: true,
    required_parameters: ["model", "messages"],
    parameter_groups: {
      Sampling: ["temperature", "top_p"],
      Length: ["max_completion_tokens", "max_tokens"],
      "Reasoning.Switch": ["thinking", "thinking.type"],
      "Reasoning.Output": ["reasoning_split"],
      Tools: ["tools"],
      Protocol: ["stream", "stream_options.include_usage"],
      Extra: ["service_tier"]
    },
    notes: "对照 docs/api/minimax-chat.md（2026-06-25）。"
  },
  "docs/api/minimax-message.md": {
    channel_id: "minimax",
    protocol_id: "anthropic_messages",
    doc_status: "verified",
    doc_url: "https://platform.minimax.io/docs/api-reference/text-chat-openai",
    last_verified: "2026-06-25",
    compare: true,
    required_parameters: ["model", "messages", "max_tokens"],
    parameter_groups: {
      Core: ["model", "messages", "max_tokens", "system"],
      Sampling: ["temperature", "top_p"],
      "Reasoning.Switch": ["thinking", "thinking.type"],
      Tools: ["tools", "tool_choice"],
      Protocol: ["stream"],
      Extra: ["service_tier", "metadata"]
    },
    notes: "对照 docs/api/minimax-message.md（2026-06-25）。"
  },
  "docs/api/minimax-response.md": {
    channel_id: "minimax",
    protocol_id: "responses_api",
    doc_status: "verified",
    doc_url: "https://platform.minimax.io/docs/api-reference/text-chat-openai",
    last_verified: "2026-06-16",
    compare: true,
    required_parameters: ["model", "input"],
    parameter_groups: {
      Core: ["model", "input"],
      Sampling: ["temperature", "top_p"],
      Length: ["max_output_tokens"],
      "Reasoning.Switch": ["reasoning"],
      "Reasoning.Intensity": ["reasoning.effort"],
      Tools: ["tools", "tool_choice"],
      Protocol: ["stream"],
      "Output.Structure": ["instructions", "text", "text.format.type"],
      Extra: ["service_tier", "metadata", "prompt_cache_key", "parallel_tool_calls", "store", "truncation"]
    },
    notes: "对照 docs/api/minimax-response.md（2026-06-16）。temperature/top_p 范围 (0,1]，非 OpenAI Responses 标准。"
  },
  "docs/api/siliconflow-chat.md": {
    channel_id: "siliconflow",
    protocol_id: "chat_completions",
    doc_status: "verified",
    doc_url: "https://docs.siliconflow.cn/cn/api-reference/chat-completions/chat-completions",
    last_verified: "2026-06-16",
    compare: true,
    required_parameters: ["model", "messages"],
    parameter_groups: {
      Core: ["model", "messages", "messages[].role", "messages[].content"],
      Sampling: ["temperature", "top_p", "top_k", "min_p", "n", "stop", "frequency_penalty"],
      Length: ["max_tokens"],
      "Reasoning.Switch": ["enable_thinking"],
      "Reasoning.Intensity": ["thinking_budget", "reasoning_effort"],
      "Output.Structure": ["response_format", "response_format.type"],
      Tools: ["tools", "tools[].type", "tools[].function.name", "tools[].function.description", "tools[].function.parameters", "tools[].function.strict"],
      Protocol: ["stream"],
      Multimodal: [
        "messages[].content[].type=text",
        "messages[].content[].type=image_url",
        "messages[].content[].image_url.url",
        "messages[].content[].image_url.detail",
        "messages[].content[].type=video_url",
        "messages[].content[].video_url.url",
        "messages[].content[].video_url.fps",
        "messages[].content[].type=audio_url",
        "messages[].content[].audio_url.url"
      ]
    },
    notes: "对照 docs/api/siliconflow-chat.md（2026-06-16）。"
  },
  "docs/api/siliconflow-message.md": {
    channel_id: "siliconflow",
    protocol_id: "anthropic_messages",
    doc_status: "verified",
    doc_url: "https://docs.siliconflow.cn/cn/api-reference/chat-completions/messages",
    last_verified: "2026-06-16",
    compare: true,
    required_parameters: ["model", "messages", "max_tokens"],
    parameter_groups: {
      Core: ["model", "messages", "messages[].role", "messages[].content", "max_tokens", "system", "system[].type", "system[].text"],
      Sampling: ["temperature", "top_p", "top_k", "stop_sequences"],
      Tools: ["tools", "tools[].name", "tools[].description", "tools[].input_schema", "tool_choice"],
      Protocol: ["stream"]
    },
    notes: "对照 docs/api/siliconflow-message.md（2026-06-16）。"
  },
  "docs/api/streamlake-chat.md": {
    channel_id: "streamlake",
    protocol_id: "chat_completions",
    doc_status: "verified",
    doc_url: "https://www.streamlake.com/document/WANQING/mq6k66r6xgqwnfbd8t",
    last_verified: "2026-06-25",
    compare: true,
    required_parameters: ["model", "messages"],
    parameter_groups: {
      Core: ["model", "messages"],
      Sampling: ["temperature", "top_p", "top_k", "presence_penalty", "seed", "stop", "n"],
      Length: ["max_tokens", "max_completion_tokens"],
      "Reasoning.Switch": ["enable_thinking"],
      "Output.Structure": ["response_format"],
      "Output.Modality": ["modalities", "audio"],
      Tools: ["tools", "tool_choice", "parallel_tool_calls"],
      Protocol: ["stream", "stream_options", "stream_options.include_usage"],
      Debug: ["logprobs", "top_logprobs"]
    },
    notes: "对照 docs/api/streamlake-chat.md（2026-06-25）。model 为推理点 ID（ep-xxx）。"
  },
  "docs/api/streamlake-message.md": {
    channel_id: "streamlake",
    protocol_id: "anthropic_messages",
    doc_status: "verified",
    doc_url: "https://www.streamlake.com/document/WANQING/mq6k6xfnbs4vn99zggq",
    last_verified: "2026-06-25",
    compare: true,
    required_parameters: ["model", "messages", "max_tokens"],
    parameter_groups: {
      Core: ["model", "messages", "max_tokens", "system"],
      Sampling: ["stop_sequences"],
      "Reasoning.Switch": ["thinking"],
      Tools: ["tools", "tool_choice"],
      Protocol: ["stream"],
      Metadata: ["metadata", "cache_control", "service_tier"],
      Extra: ["container", "inference_geo", "output_config"]
    },
    notes: "对照 docs/api/streamlake-message.md（2026-06-25）。"
  },
  "docs/api/streamlake-response.md": {
    channel_id: "streamlake",
    protocol_id: "responses_api",
    doc_status: "verified",
    doc_url: "https://www.streamlake.com/document/WANQING/mq6k6jmxvq9ngxkozfl",
    last_verified: "2026-06-25",
    compare: true,
    required_parameters: ["model", "input"],
    parameter_groups: {
      Core: ["model", "input"],
      Sampling: ["temperature", "top_p"],
      Length: ["max_output_tokens"],
      "Reasoning.Switch": ["reasoning", "enable_thinking"],
      Tools: ["tools", "tool_choice"],
      Protocol: ["stream"],
      Metadata: ["instructions", "previous_response_id", "conversation"]
    },
    notes: "对照 docs/api/streamlake-response.md（2026-06-25）。"
  },
  "docs/api/vllm.md": {
    channel_id: "vllm",
    protocol_id: "chat_completions",
    doc_status: "verified",
    doc_url: "https://docs.vllm.ai/en/latest/serving/online_serving/openai_compatible_server/",
    last_verified: "2026-06-16",
    compare: false,
    required_parameters: ["model", "messages"],
    parameter_groups: {
      Sampling: ["temperature", "top_p", "top_k", "min_p", "repetition_penalty", "stop", "stop_token_ids", "include_stop_str_in_output", "min_tokens"],
      Length: ["max_tokens", "max_completion_tokens"],
      "Reasoning.Switch": ["chat_template_kwargs.enable_thinking"],
      "Reasoning.Intensity": ["reasoning_effort"],
      "Output.Structure": ["response_format", "structured_outputs"],
      Tools: ["tools", "tool_choice", "parallel_tool_calls"],
      Protocol: ["stream", "stream_options", "stream_options.include_usage"],
      Template: ["continue_final_message", "add_generation_prompt"],
      Debug: ["return_token_ids", "request_id"]
    },
    notes: "vLLM extra_body 扩展参数见 docs/api/vllm.md。"
  },
  "docs/api/openai.md": {
    channel_id: "openai",
    protocol_id: "chat_completions",
    doc_status: "verified",
    doc_url: "https://platform.openai.com/docs/api-reference/chat/create",
    last_verified: "2026-06-16",
    compare: false,
    required_parameters: ["model", "messages"],
    parameter_groups: {
      Sampling: ["temperature", "top_p", "n", "seed", "stop", "frequency_penalty", "presence_penalty", "logit_bias"],
      Length: ["max_tokens", "max_completion_tokens"],
      "Reasoning.Intensity": ["reasoning_effort"],
      "Output.Structure": ["response_format"],
      Tools: ["tools", "tool_choice", "parallel_tool_calls"],
      Protocol: ["stream", "stream_options", "stream_options.include_usage"],
      Debug: ["logprobs", "top_logprobs"],
      Metadata: ["user", "metadata", "store"],
      Extra: ["service_tier", "prediction", "audio"]
    },
    notes: "参考基线渠道；docs/api/openai.md 含更多未列入矩阵的字段。"
  },
  "docs/api/claude.md": {
    channel_id: "claude",
    protocol_id: "chat_completions",
    doc_status: "verified",
    doc_url: "https://platform.claude.com/docs/en/api/openai-sdk",
    last_verified: "2026-06-16",
    compare: false,
    required_parameters: ["model", "messages"],
    parameter_groups: {
      Sampling: ["temperature", "top_p", "n", "stop", "seed", "frequency_penalty", "presence_penalty"],
      Length: ["max_tokens", "max_completion_tokens"],
      "Reasoning.Switch": ["thinking"],
      "Reasoning.Intensity": ["reasoning_effort"],
      "Output.Structure": ["response_format"],
      Tools: ["tools", "tool_choice", "parallel_tool_calls", "tools[].function.strict", "functions", "function_call"],
      Protocol: ["stream", "stream_options", "stream_options.include_usage"],
      Debug: ["logprobs", "top_logprobs"],
      Metadata: ["metadata", "store", "user"],
      Multimodal: ["messages[].content[].image_url", "messages[].content[].image_url.detail", "messages[].content[].input_audio"]
    },
    notes: "OpenAI SDK 兼容层；多项参数文档标注为 accepted but ignored。"
  },
  "docs/api/thinking-dialects.md": {
    channel_id: "thinking",
    protocol_id: "chat_completions",
    doc_status: "internal",
    doc_url: null,
    last_verified: "2026-06-08",
    compare: false,
    required_parameters: [],
    parameter_groups: {
      "Reasoning.Switch": [
        "enable_thinking",
        "thinking",
        "reasoning",
        "chat_template_kwargs.enable_thinking"
      ],
      "Reasoning.Intensity": [
        "reasoning_effort",
        "thinking_budget",
        "reasoning.effort",
        "reasoning.max_tokens",
        "thinking.budget_tokens"
      ],
      "Reasoning.Output": [
        "reasoning.summary",
        "reasoning.exclude",
        "include_reasoning",
        "reasoning_split",
        "preserve_thinking",
        "thinking.clear_thinking"
      ],
      Length: ["max_completion_tokens"],
      Observability: ["reasoning_content", "usage.completion_tokens_details.reasoning_tokens"]
    },
    notes: "跨渠道推理方言探针，非单一供应商 API 文档。"
  }
};

export const MANIFEST_LOCAL_DOC_PATHS = Object.keys(PROTOCOL_DOC_MANIFEST);
