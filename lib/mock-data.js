window.LLM_ROSETTA_DATA = (() => {
  const parameterOrigins = window.PROVIDERX_RULES?.PARAMETER_ORIGINS || {
    temperature: "openai-standard",
    top_p: "openai-standard",
    n: "openai-standard",
    seed: "openai-standard",
    stop: "openai-standard",
    frequency_penalty: "openai-standard",
    presence_penalty: "openai-standard",
    logit_bias: "openai-standard",
    max_tokens: "openai-standard",
    max_completion_tokens: "openai-standard",
    reasoning_effort: "openai-standard",
    response_format: "openai-standard",
    tools: "openai-standard",
    tool_choice: "openai-standard",
    functions: "openai-standard",
    function_call: "openai-standard",
    parallel_tool_calls: "openai-standard",
    stream: "openai-standard",
    stream_options: "openai-standard",
    "stream_options.include_usage": "openai-standard",
    logprobs: "openai-standard",
    top_logprobs: "openai-standard",
    user: "openai-standard",
    metadata: "openai-standard",
    store: "openai-standard",
    service_tier: "openai-standard",
    prediction: "openai-standard",
    audio: "openai-standard",
    "messages[].content[].image_url": "openai-standard",
    "messages[].content[].image_url.detail": "openai-standard",
    "messages[].content[].input_audio": "openai-standard",
    thinking: "provider-private",
    "reasoning.effort": "openrouter-extension",
    "reasoning.summary": "openrouter-extension",
    reasnoing_effort: "provider-private",
    "usage.completion_tokens_details.reasoning_tokens": "provider-private",
    user_id: "deepseek-extension",
    reasoning_content: "deepseek-extension",
    "messages[].prefix": "deepseek-extension",
    "messages[].reasoning_content": "deepseek-extension",
    "tools[].function.strict": "deepseek-extension",
    "tools[].function.parameters": "openai-standard",
    enable_thinking: "qwen-extension",
    preserve_thinking: "qwen-extension",
    thinking_budget: "qwen-extension",
    "chat_template_kwargs.enable_thinking": "provider-private",
    repetition_penalty: "dashscope-private",
    modalities: "dashscope-private",
    vl_high_resolution_images: "dashscope-private",
    tool_stream: "dashscope-private",
    enable_code_interpreter: "dashscope-private",
    enable_search: "dashscope-private",
    search_options: "dashscope-private",
    skill: "dashscope-private",
    "X-DashScope-DataInspection": "dashscope-private",
    top_k: "provider-private",
    min_p: "siliconflow-extension",
    repetition_penalty: "provider-private",
    thinking_token_budget: "vllm-extension",
    min_tokens: "vllm-extension",
    stop_token_ids: "vllm-extension",
    include_stop_str_in_output: "vllm-extension",
    "structured_outputs.choice": "vllm-extension",
    continue_final_message: "vllm-extension",
    add_generation_prompt: "vllm-extension",
    return_token_ids: "vllm-extension",
    request_id: "vllm-extension",
    "x-siliconcloud-trace-id": "siliconflow-observability",
    result_format: "dashscope-private",
    incremental_output: "dashscope-private",
    mask_sensitive_info: "minimax-private",
    tools_calling_choice: "minimax-private",
    reasoning: "openrouter-extension",
    include_reasoning: "openrouter-extension",
    top_a: "openrouter-extension",
    models: "openrouter-routing",
    provider: "openrouter-routing",
    "provider.order": "openrouter-routing",
    "provider.require_parameters": "openrouter-routing",
    "provider.zdr": "openrouter-routing",
    plugins: "openrouter-extension",
    transforms: "openrouter-extension",
    "openrouter:datetime": "openrouter-extension",
    "openrouter:web_search": "openrouter-extension",
    system_fingerprint: "openrouter-observability",
    max_tokens_to_sample: "anthropic-messages",
    system: "anthropic-messages",
    "content[].type=text": "anthropic-messages",
    "content[].type=tool_use": "anthropic-messages",
    "content[].type=tool_result": "anthropic-messages",
    thinking_budget_tokens: "anthropic-messages",
    "anthropic-version": "anthropic-messages"
  };

  const chatEndpoint = {
    endpoint_id: "chat_completions",
    label: "Chat Completions",
    short_label: "Chat",
    description: "OpenAI-compatible /chat/completions",
    provider_suffix: ""
  };

  const messagesEndpoint = {
    endpoint_id: "anthropic_messages",
    label: "Anthropic Messages",
    short_label: "Messages",
    description: "Anthropic-compatible /v1/messages",
    provider_suffix: "_messages"
  };

  const anthropicMessagesParameters = {
    Core: ["model", "messages", "system"],
    Content: ["content[].type=text", "content[].type=tool_use", "content[].type=tool_result"],
    Sampling: ["temperature", "top_p", "top_k", "stop_sequences"],
    Length: ["max_tokens"],
    Tools: ["tools", "tool_choice"],
    Protocol: ["stream"],
    Reasoning: ["thinking", "thinking_budget_tokens"],
    Metadata: ["metadata", "anthropic-version"]
  };

  function withEndpoints(channel, messagesOverrides = null) {
    const endpoints = {
      chat_completions: {
        ...chatEndpoint,
        supported: true,
        provider_id: channel.provider_id || channel.channel_id,
        default_base_url: channel.default_base_url,
        default_model: channel.default_model,
        api_docs_url: channel.api_docs_url,
        base_url_options: channel.base_url_options,
        parameters: channel.parameters
      }
    };
    if (messagesOverrides) {
      endpoints.anthropic_messages = {
        ...messagesEndpoint,
        supported: true,
        provider_id: messagesOverrides.provider_id || `${channel.provider_id || channel.channel_id}_messages`,
        default_base_url: messagesOverrides.default_base_url,
        default_model: messagesOverrides.default_model || channel.default_model,
        api_docs_url: messagesOverrides.api_docs_url || channel.api_docs_url,
        base_url_options: messagesOverrides.base_url_options,
        parameters: messagesOverrides.parameters || anthropicMessagesParameters
      };
    } else {
      endpoints.anthropic_messages = {
        ...messagesEndpoint,
        supported: false,
        unavailable_reason: "OpenAI 官方接口没有 Anthropic Messages endpoint。"
      };
    }
    return {
      ...channel,
      endpoints
    };
  }

  const channels = [
    withEndpoints({
      channel_id: "openai",
      name: "OpenAI Official",
      emoji: "🇺🇸",
      logo: "design-system/assets/logos/openai.svg",
      description: "参考基线",
      summary: "25 个参数 · 标准基线",
      default_base_url: "https://api.openai.com/v1",
      default_model: "gpt-4o-mini",
      api_docs_url: "https://developers.openai.com/api/reference/resources/chat",
      parameters: {
        Sampling: ["temperature", "top_p", "n", "seed", "stop", "frequency_penalty", "presence_penalty", "logit_bias"],
        Length: ["max_tokens", "max_completion_tokens"],
        Reasoning: ["reasoning_effort"],
        Output: ["response_format"],
        Tools: ["tools", "tool_choice", "parallel_tool_calls"],
        Protocol: ["stream", "stream_options"],
        Debug: ["logprobs", "top_logprobs"],
        Metadata: ["user", "metadata", "store"],
        Extra: ["service_tier", "prediction", "audio"]
      }
    }),
    withEndpoints({
      channel_id: "claude",
      name: "Claude Official",
      emoji: "🧡",
      logo: "design-system/assets/logos/claude.svg",
      description: "Anthropic 官方",
      summary: "OpenAI SDK compatibility",
      default_base_url: "https://api.anthropic.com/v1",
      default_model: "claude-sonnet-4-6",
      api_docs_url: "https://platform.claude.com/docs/en/api/openai-sdk",
      parameters: {
        Sampling: ["temperature", "top_p", "n", "stop", "seed", "frequency_penalty", "presence_penalty"],
        Length: ["max_tokens", "max_completion_tokens"],
        Reasoning: ["thinking", "reasoning_effort"],
        Output: ["response_format"],
        Tools: ["tools", "tool_choice", "parallel_tool_calls", "tools[].function.strict", "functions", "function_call"],
        Protocol: ["stream", "stream_options", "stream_options.include_usage"],
        Debug: ["logprobs", "top_logprobs"],
        Metadata: ["metadata", "store", "user"],
        Multimodal: ["messages[].content[].image_url", "messages[].content[].image_url.detail", "messages[].content[].input_audio"]
      }
    }, {
      provider_id: "claude_messages",
      default_base_url: "https://api.anthropic.com/v1",
      default_model: "claude-sonnet-4-6",
      api_docs_url: "https://platform.claude.com/docs/en/api/messages"
    }),
    withEndpoints({
      channel_id: "deepseek",
      name: "DeepSeek",
      emoji: "🐳",
      logo: "design-system/assets/logos/deepseek.ico",
      description: "DeepSeek 官方",
      summary: "22 个重点参数",
      default_base_url: "https://api.deepseek.com",
      default_model: "deepseek-v4-flash",
      api_docs_url: "https://api-docs.deepseek.com/api/create-chat-completion",
      parameters: {
        Sampling: ["temperature", "top_p", "stop", "frequency_penalty", "presence_penalty"],
        Length: ["max_tokens"],
        Reasoning: ["thinking", "reasoning_effort", "reasoning_content"],
        Output: ["response_format"],
        Tools: ["tools", "tool_choice", "tools[].function.strict", "tools[].function.parameters"],
        Protocol: ["stream", "stream_options", "stream_options.include_usage"],
        Debug: ["logprobs", "top_logprobs"],
        Metadata: ["user_id"],
        Beta: ["messages[].prefix", "messages[].reasoning_content"]
      }
    }, {
      default_base_url: "https://api.deepseek.com/anthropic/v1",
      default_model: "deepseek-v4-flash",
      api_docs_url: "https://api-docs.deepseek.com/quick_start/anthropic_api"
    }),
    withEndpoints({
      channel_id: "aliyun",
      provider_id: "ali",
      name: "Aliyun Bailian",
      emoji: "☁️",
      logo: "design-system/assets/logos/aliyun.svg",
      description: "阿里百炼（DashScope）",
      summary: "30 个参数",
      default_base_url: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      base_url_options: [
        { label: "华北 2", value: "https://dashscope.aliyuncs.com/compatible-mode/v1" },
        { label: "弗吉尼亚", value: "https://dashscope-us.aliyuncs.com/compatible-mode/v1" },
        { label: "新加坡", value: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1" }
      ],
      default_model: "qwen-plus",
      api_docs_url: "https://help.aliyun.com/zh/model-studio/qwen-api-via-openai-chat-completions",
      parameters: {
        Sampling: ["temperature", "top_p", "top_k", "repetition_penalty", "presence_penalty", "seed", "stop", "n"],
        Length: ["max_tokens"],
        Reasoning: ["enable_thinking", "preserve_thinking", "thinking_budget", "reasoning_effort"],
        Output: ["response_format", "modalities", "vl_high_resolution_images"],
        Tools: ["tools", "tool_choice", "parallel_tool_calls", "tool_stream", "enable_code_interpreter"],
        Protocol: ["stream", "stream_options"],
        Debug: ["logprobs", "top_logprobs"],
        Search: ["enable_search", "search_options"],
        Extra: ["skill", "X-DashScope-DataInspection"]
      }
    }, {
      provider_id: "ali_messages",
      default_base_url: "https://dashscope.aliyuncs.com/apps/anthropic/v1",
      default_model: "qwen-plus",
      api_docs_url: "https://help.aliyun.com/zh/model-studio/anthropic-api-messages"
    }),
    withEndpoints({
      channel_id: "openrouter",
      name: "OpenRouter",
      emoji: "🧭",
      logo: "design-system/assets/logos/openrouter.svg",
      description: "OpenRouter 官方",
      summary: "OpenAI-compatible 聚合路由",
      default_base_url: "https://openrouter.ai/api/v1",
      default_model: "openai/gpt-4o-mini",
      api_docs_url: "https://openrouter.ai/docs/api-reference/chat-completion",
      parameters: {
        Sampling: ["temperature", "top_p", "top_k", "top_a", "min_p", "seed", "stop", "frequency_penalty", "presence_penalty", "logit_bias"],
        Length: ["max_tokens", "max_completion_tokens"],
        Reasoning: ["reasoning", "reasoning_effort", "include_reasoning"],
        Output: ["response_format"],
        Tools: ["tools", "tool_choice", "parallel_tool_calls", "tools[].function.strict"],
        Protocol: ["stream", "stream_options", "stream_options.include_usage"],
        Routing: ["models", "provider", "provider.order", "provider.require_parameters", "provider.zdr"],
        Plugins: ["plugins", "transforms", "openrouter:datetime", "openrouter:web_search"],
        Observability: ["metadata", "system_fingerprint"]
      }
    }, {
      default_base_url: "https://openrouter.ai/api/v1",
      default_model: "anthropic/claude-sonnet-4.5",
      api_docs_url: "https://openrouter.ai/docs/api-reference/messages"
    }),
    withEndpoints({
      channel_id: "minimax",
      name: "MiniMax",
      emoji: "🎬",
      logo: "design-system/assets/logos/minimax.ico",
      description: "MiniMax 官方",
      summary: "15 个参数",
      default_base_url: "https://api.minimaxi.com/v1",
      base_url_options: [
        { label: "国内站", value: "https://api.minimaxi.com/v1" },
        { label: "海外站", value: "https://api.minimax.io/v1" }
      ],
      default_model: "MiniMax-M2.7",
      api_docs_url: "https://platform.minimax.io/docs/api-reference/text-openai-api",
      parameters: {
        Sampling: ["temperature", "top_p", "stop"],
        Length: ["max_tokens"],
        Output: ["response_format"],
        Tools: ["tools", "tool_choice"],
        Protocol: ["stream"],
        Metadata: ["user"],
        Extra: ["mask_sensitive_info", "tools_calling_choice"]
      }
    }, {
      default_base_url: "https://api.minimaxi.com/anthropic/v1",
      base_url_options: [
        { label: "国内站", value: "https://api.minimaxi.com/anthropic/v1" },
        { label: "海外站", value: "https://api.minimax.io/anthropic/v1" }
      ],
      default_model: "MiniMax-M2.7"
    }),
    withEndpoints({
      channel_id: "vllm",
      name: "vLLM",
      emoji: "V",
      logo: "design-system/assets/logos/vllm.svg",
      description: "Self-hosted OpenAI-compatible server",
      summary: "OpenAI-compatible plus vLLM extras",
      default_base_url: "http://localhost:8000/v1",
      default_model: "Qwen/Qwen3-8B",
      api_docs_url: "https://docs.vllm.ai/en/latest/serving/online_serving/openai_compatible_server/",
      parameters: {
        Sampling: ["temperature", "top_p", "top_k", "min_p", "repetition_penalty", "stop", "stop_token_ids", "include_stop_str_in_output", "min_tokens"],
        Length: ["max_tokens", "max_completion_tokens"],
        Reasoning: ["reasoning_effort", "chat_template_kwargs.enable_thinking", "thinking_token_budget"],
        Output: ["response_format", "structured_outputs.choice"],
        Tools: ["tools", "tool_choice", "parallel_tool_calls"],
        Protocol: ["stream", "stream_options", "stream_options.include_usage"],
        Template: ["continue_final_message", "add_generation_prompt"],
        Debug: ["return_token_ids", "request_id"]
      }
    }),
    withEndpoints({
      channel_id: "siliconflow",
      name: "SiliconFlow",
      emoji: "🧊",
      logo: "design-system/assets/logos/siliconflow-mark.svg",
      description: "硅基流动",
      summary: "20 个参数",
      default_base_url: "https://api.siliconflow.cn/v1",
      base_url_options: [
        { label: "国内站 cn", value: "https://api.siliconflow.cn/v1" },
        { label: "海外站 com", value: "https://api.siliconflow.com/v1" }
      ],
      default_model: "Pro/zai-org/GLM-4.7",
      api_docs_url: "https://docs.siliconflow.cn/en/api-reference/chat-completions/chat-completions",
      parameters: {
        Sampling: ["temperature", "top_p", "top_k", "min_p", "n", "stop", "frequency_penalty"],
        Length: ["max_tokens"],
        Reasoning: ["enable_thinking", "thinking_budget", "reasoning_effort"],
        Output: ["response_format"],
        Tools: ["tools", "tool_choice"],
        Protocol: ["stream"],
        Observability: ["x-siliconcloud-trace-id"],
        Multimodal: ["messages[].content[].image_url", "messages[].content[].image_url.detail"]
      }
    }, {
      default_base_url: "https://api.siliconflow.cn/v1",
      default_model: "Pro/zai-org/GLM-4.7"
    }),
    withEndpoints({
      channel_id: "thinking",
      provider_id: "thinking",
      name: "Thinking Probe",
      emoji: "T",
      logo: "design-system/assets/logos/openai.svg",
      description: "通用推理开关探针",
      summary: "探测 thinking 开关与内容落点",
      default_base_url: "https://api.openai.com/v1",
      default_model: "gpt-5.1",
      parameters: {
        Reasoning: [
          "reasoning_effort",
          "reasnoing_effort",
          "enable_thinking",
          "thinking_budget",
          "thinking",
          "reasoning",
          "reasoning.effort",
          "reasoning.summary",
          "chat_template_kwargs.enable_thinking"
        ],
        Length: ["max_completion_tokens"],
        Observability: ["reasoning_content", "usage.completion_tokens_details.reasoning_tokens"]
      }
    }),
    withEndpoints({
      channel_id: "silinex_overseas",
      provider_id: "siliconflow",
      name: "海外站",
      emoji: "🌐",
      logo: "design-system/assets/logos/siliconflow-mark.svg",
      description: "自有海外站",
      summary: "暂按 SiliconFlow 参数集测试",
      default_base_url: "https://sr-endpoint.horay.ai",
      default_model: "Pro/zai-org/GLM-4.7",
      api_docs_url: "https://docs.siliconflow.cn/en/api-reference/chat-completions/chat-completions",
      parameters: {
        Sampling: ["temperature", "top_p", "top_k", "min_p", "n", "stop", "frequency_penalty"],
        Length: ["max_tokens"],
        Reasoning: ["enable_thinking", "thinking_budget", "reasoning_effort"],
        Output: ["response_format"],
        Tools: ["tools", "tool_choice"],
        Protocol: ["stream"],
        Observability: ["x-siliconcloud-trace-id"]
      }
    }, {
      default_base_url: "https://sr-endpoint.horay.ai",
      default_model: "Pro/zai-org/GLM-4.7"
    }),
    withEndpoints({
      channel_id: "silinex_china",
      provider_id: "siliconflow",
      name: "国内站",
      emoji: "🇨🇳",
      logo: "design-system/assets/logos/siliconflow-mark.svg",
      description: "自有国内站",
      summary: "暂按 SiliconFlow 参数集测试",
      default_base_url: "https://api.sr.silinex.work",
      default_model: "Pro/zai-org/GLM-4.7",
      api_docs_url: "https://docs.siliconflow.cn/en/api-reference/chat-completions/chat-completions",
      parameters: {
        Sampling: ["temperature", "top_p", "top_k", "min_p", "n", "stop", "frequency_penalty"],
        Length: ["max_tokens"],
        Reasoning: ["enable_thinking", "thinking_budget", "reasoning_effort"],
        Output: ["response_format"],
        Tools: ["tools", "tool_choice"],
        Protocol: ["stream"],
        Observability: ["x-siliconcloud-trace-id"]
      }
    }, {
      default_base_url: "https://api.sr.silinex.work",
      default_model: "Pro/zai-org/GLM-4.7"
    })
  ];

  const baseline = {
    id: "chatcmpl-openai-baseline",
    object: "chat.completion",
    created: 1764226800,
    model: "gpt-4o-mini",
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: "hi"
        },
        finish_reason: "stop"
      }
    ],
    usage: {
      prompt_tokens: 9,
      completion_tokens: 2,
      total_tokens: 11
    }
  };

  const successResponse = {
    id: "chatcmpl-channel-ok",
    object: "chat.completion",
    created: 1764226801,
    model: "deepseek-chat",
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: "hi"
        },
        finish_reason: "stop"
      }
    ],
    usage: {
      prompt_tokens: 9,
      completion_tokens: 2,
      total_tokens: 11
    }
  };

  const extensionResponse = {
    ...successResponse,
    id: "chatcmpl-channel-extension",
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: "hi",
          reasoning_content: "The user asked for a short greeting."
        },
        finish_reason: "stop"
      }
    ],
    usage: {
      prompt_tokens: 9,
      completion_tokens: 2,
      total_tokens: 11,
      prompt_cache_hit_tokens: 4
    }
  };

  const typeMismatchResponse = {
    ...successResponse,
    id: "chatcmpl-channel-warning",
    choices: {
      index: 0,
      message: {
        role: "assistant",
        content: "hi"
      },
      finish_reason: "stop"
    },
    usage: {
      prompt_tokens: "9",
      completion_tokens: 2,
      total_tokens: 11
    },
    warnings: ["该 provider 可能忽略 frequency_penalty"]
  };

  const missingUsageResponse = {
    id: "chatcmpl-missing-usage",
    object: "chat.completion",
    created: 1764226801,
    model: "deepseek-chat",
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: "hi"
        },
        finish_reason: "stop"
      }
    ]
  };

  const makeRequest = (model, param) => ({
    model,
    messages: [{ role: "user", content: "Say hi" }],
    [param]: param === "n" ? 2 : param === "response_format" ? { type: "json_object" } : param === "tools" ? [{ type: "function", function: { name: "lookup", parameters: { type: "object" } } }] : true
  });

  const deepseekResults = [
    ["temperature", "sampling", "accepted", 412, 0, ""],
    ["top_p", "sampling", "accepted", 389, 0, ""],
    ["stop", "sampling", "accepted", 376, 0, ""],
    ["frequency_penalty", "sampling", "warning", 430, 3, "响应提示该参数可能被忽略"],
    ["presence_penalty", "sampling", "accepted", 417, 0, ""],
    ["max_tokens", "length", "accepted", 398, 0, ""],
    ["thinking", "reasoning", "accepted", 421, 2, "返回中可能包含 reasoning_content"],
    ["reasoning_effort", "reasoning", "accepted", 438, 2, "支持 high/max 与兼容映射"],
    ["response_format", "output", "accepted", 451, 0, ""],
    ["tools", "tools", "accepted", 506, 2, "tool call 结构存在差异"],
    ["tool_choice", "tools", "accepted", 469, 1, "返回中包含 provider fingerprint"],
    ["stream", "protocol", "accepted", 334, 0, ""],
    ["stream_options", "protocol", "accepted", 386, 0, ""],
    ["logprobs", "debug", "accepted", 512, 0, ""],
    ["top_logprobs", "debug", "accepted", 444, 0, ""],
    ["user_id", "metadata", "accepted", 361, 0, ""]
  ].map(([parameter, category, status, latency_ms, diff_count, message]) => ({
    case_id: `deepseek:${parameter}`,
    channel_id: "deepseek",
    parameter,
    category,
    status,
    latency_ms,
    diff_count,
    message
  }));

  const coverageNaResult = {
    case_id: "coverage:audio",
    channel_id: "coverage",
    parameter: "audio",
    category: "output",
    status: "na",
    latency_ms: 0,
    diff_count: 0,
    message: "mock coverage for n/a status"
  };

  const responses = {};
  for (const result of deepseekResults) {
    const response =
      result.parameter === "frequency_penalty" || result.parameter === "tools"
          ? typeMismatchResponse
          : result.parameter === "stream_options"
            ? missingUsageResponse
            : result.diff_count > 0
              ? extensionResponse
              : successResponse;

    responses[result.case_id] = {
      request_body: makeRequest("deepseek-v4-flash", result.parameter),
      baseline_response: baseline,
      channel_response: response
    };
  }

  responses[coverageNaResult.case_id] = {
    request_body: makeRequest("gpt-4o-mini", "audio"),
    baseline_response: baseline,
    channel_response: successResponse
  };

  return {
    CHANNEL_TEMPLATES: channels,
    ENDPOINT_TEMPLATES: [chatEndpoint, messagesEndpoint],
    MOCK_PARAMETER_ORIGINS: parameterOrigins,
    MOCK_RESULTS: [...deepseekResults, coverageNaResult],
    MOCK_RESPONSES: responses
  };
})();
