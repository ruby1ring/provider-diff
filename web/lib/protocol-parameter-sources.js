/**
 * Protocol parameter matrix — grounded in docs/*.md and official API references.
 * docStatus: verified | partial | inherited | missing | internal
 */
window.NOCTUA_PROTOCOL_PARAMETER_SOURCES = (() => {
  const DOC_STATUS = {
    verified: { label: "已对照文档", className: "protocol-doc-badge--verified" },
    partial: { label: "文档不完整", className: "protocol-doc-badge--partial" },
    inherited: { label: "继承参考", className: "protocol-doc-badge--inherited" },
    missing: { label: "待补充 API 文档", className: "protocol-doc-badge--missing" },
    internal: { label: "内部探针", className: "protocol-doc-badge--internal" }
  };

  const SILINEX_CHAT_PARAMETERS = {
    Core: ["model", "messages"],
    Sampling: ["temperature", "top_p", "frequency_penalty", "presence_penalty", "logit_bias", "seed", "n", "stop"],
    Length: ["max_tokens", "max_completion_tokens"],
    Reasoning: ["enable_thinking", "thinking_budget", "reasoning_effort"],
    Output: ["response_format", "modalities", "prediction"],
    Tools: ["tools", "tool_choice"],
    Protocol: ["stream", "stream_options"],
    Debug: ["logprobs", "top_logprobs"],
    Metadata: ["user", "metadata", "store", "service_tier"],
    Extra: ["audio"]
  };

  /** Per-protocol required body fields when entry.requiredParameters is omitted. */
  const PROTOCOL_DEFAULT_REQUIRED = {
    chat_completions: ["model", "messages"],
    anthropic_messages: ["model", "messages", "max_tokens"],
    responses_api: ["model", "input"]
  };

  /** channelId::protocolId → requiredParameters when defaults do not apply. */
  const PROTOCOL_REQUIRED_OVERRIDES = {
    "openrouter::chat_completions": ["messages"]
  };

  const PROTOCOL_EVAL_CHANNELS = new Set([
    "deepseek",
    "moonshot",
    "zhipu",
    "aliyun",
    "openrouter",
    "minimax",
    "siliconflow",
    "streamlake"
  ]);

  const channels = {
    deepseek: {
      chat_completions: {
        docStatus: "verified",
        docUrl: "https://api-docs.deepseek.com/zh-cn/api/create-chat-completion",
        localDoc: "docs/api/deepseek.md",
        parameters: {
          Sampling: ["temperature", "top_p", "stop", "frequency_penalty", "presence_penalty"],
          Length: ["max_tokens"],
          Reasoning: ["thinking", "reasoning_effort"],
          Output: ["response_format"],
          Tools: ["tools", "tool_choice", "tools[].function.strict"],
          Protocol: ["stream", "stream_options", "stream_options.include_usage"],
          Debug: ["logprobs", "top_logprobs"],
          Metadata: ["user_id"],
          Beta: ["messages[].prefix", "messages[].reasoning_content"]
        },
        notes: "对照 docs/api/deepseek.md（2026-06-16）。frequency_penalty / presence_penalty 已 deprecated，接受但无效果。"
      },
      anthropic_messages: {
        docStatus: "verified",
        docUrl: "https://api-docs.deepseek.com/zh-cn/guides/anthropic_api",
        localDoc: "docs/api/deepseek-message.md",
        parameters: {
          Core: ["model", "messages", "max_tokens", "system"],
          Sampling: ["temperature", "top_p", "stop_sequences"],
          Reasoning: ["thinking", "output_config"],
          Tools: ["tools", "tools[].name", "tools[].input_schema", "tool_choice"],
          Protocol: ["stream"],
          Metadata: ["metadata", "metadata.user_id"],
          Unsupported: ["top_k", "container", "mcp_servers", "service_tier"]
        },
        notes: "对照 docs/api/deepseek-message.md（2026-06-16）。temperature [0,2]；thinking.budget_tokens Ignored。"
      }
    },
    moonshot: {
      chat_completions: {
        docStatus: "verified",
        docUrl: "https://platform.moonshot.cn/docs/api/chat",
        localDoc: "docs/api/moonshot-chat.md",
        parameters: {
          Sampling: ["temperature", "top_p", "n", "stop", "presence_penalty", "frequency_penalty"],
          Length: ["max_tokens", "max_completion_tokens"],
          Output: ["response_format"],
          Tools: ["tools", "tool_choice"],
          Protocol: ["stream", "stream_options", "stream_options.include_usage"]
        },
        notes: "对照 docs/api/moonshot-chat.md（2026-06-25）。temperature 范围 [0,1]（非 OpenAI [0,2]）；max_tokens 已弃用。"
      },
      anthropic_messages: {
        docStatus: "missing",
        docUrl: null,
        localDoc: null,
        compare: false,
        parameters: {},
        notes: "Moonshot 不提供 Anthropic Messages 兼容端点，不纳入协议对比。"
      }
    },
    zhipu: {
      chat_completions: {
        docStatus: "verified",
        docUrl: "https://open.bigmodel.cn/dev/api#glm-4",
        localDoc: "docs/api/zhipu-chat.md",
        parameters: {
          Sampling: ["temperature", "top_p", "stop"],
          Length: ["max_tokens"],
          Reasoning: ["thinking", "thinking.clear_thinking", "reasoning_effort"],
          Output: ["response_format"],
          Tools: ["tools", "tool_choice", "tool_stream"],
          Protocol: ["stream", "do_sample"]
        },
        notes: "对照 docs/api/zhipu-chat.md（2026-06-25）。temperature 范围 [0,1]；reasoning_effort 仅 GLM-5.2。"
      },
      anthropic_messages: {
        docStatus: "partial",
        docUrl: "https://open.bigmodel.cn/dev/api#glm-4",
        localDoc: null,
        parameters: {
          Core: ["model", "messages", "max_tokens", "system"],
          Sampling: ["temperature", "top_p", "stop_sequences"],
          Tools: ["tools", "tool_choice"],
          Protocol: ["stream"]
        },
        notes: "智谱已接入 Anthropic Messages 兼容端点；请求参数待对照官方文档补充。"
      }
    },
    aliyun: {
      chat_completions: {
        docStatus: "verified",
        docUrl: "https://help.aliyun.com/zh/model-studio/qwen-api-via-openai-chat-completions",
        localDoc: "docs/api/ali-chat.md",
        parameters: {
          Sampling: ["temperature", "top_p", "presence_penalty", "seed", "stop", "n"],
          Length: ["max_tokens", "max_completion_tokens"],
          Output: ["response_format", "modalities", "audio"],
          Tools: ["tools", "tool_choice", "parallel_tool_calls"],
          Protocol: ["stream", "stream_options", "stream_options.include_usage"],
          Multimodal: ["messages[].content[].image_url", "messages[].content[].video_url"],
          Debug: ["logprobs", "top_logprobs"]
        },
        notes: "对照 docs/api/ali-chat.md（2026-06-25）。矩阵仅收录 OpenAI 兼容参数；DashScope 私有扩展（extra_body / 头部）见本地文档。"
      },
      anthropic_messages: {
        docStatus: "verified",
        docUrl: "https://help.aliyun.com/zh/model-studio/anthropic-api-messages",
        localDoc: "docs/api/ali-message.md",
        parameters: {
          Core: ["model", "messages", "max_tokens", "system"],
          Sampling: ["temperature", "top_p", "top_k", "stop_sequences"],
          Reasoning: ["thinking", "thinking.budget_tokens", "reasoning_effort"],
          Tools: ["tools", "tool_choice"],
          Protocol: ["stream"],
          Output: ["output_config"]
        },
        notes: "对照 docs/api/ali-message.md（2026-06-25）。temperature 范围 [0,2)（非 Anthropic 官方 [0,1]）。"
      },
      responses_api: {
        docStatus: "verified",
        docUrl: "https://help.aliyun.com/zh/model-studio/qwen-api-via-openai-responses",
        localDoc: "docs/api/ali-response.md",
        parameters: {
          Core: ["model", "input"],
          Sampling: ["temperature", "top_p"],
          Length: ["max_output_tokens"],
          Protocol: ["stream"]
        },
        notes: "对照 docs/api/ali-response.md（2026-06-25）。仅文档化参数生效；background 异步不支持。"
      }
    },
    openrouter: {
      chat_completions: {
        docStatus: "verified",
        docUrl: "https://openrouter.ai/docs/api/api-reference/chat/send-chat-completion-request",
        localDoc: "docs/api/openrouter-chat.md",
        parameters: {
          Core: ["model", "models", "messages"],
          Sampling: ["temperature", "top_p", "top_k", "min_p", "top_a", "seed", "stop", "frequency_penalty", "presence_penalty", "repetition_penalty", "logit_bias"],
          Length: ["max_tokens", "max_completion_tokens"],
          Reasoning: ["reasoning", "reasoning.effort", "reasoning.summary", "reasoning_effort", "include_reasoning"],
          Output: ["response_format", "structured_outputs", "modalities", "image_config"],
          Tools: ["tools", "tool_choice", "parallel_tool_calls", "tools[].function.strict", "stop_server_tools_when"],
          Protocol: ["stream", "stream_options"],
          Routing: ["provider", "provider.order", "provider.only", "provider.ignore", "provider.require_parameters", "provider.zdr", "route"],
          Plugins: ["plugins", "openrouter:datetime", "openrouter:web_search", "openrouter:web_fetch"],
          Debug: ["logprobs", "top_logprobs", "debug.echo_upstream_body"],
          Observability: ["metadata", "user", "service_tier", "session_id", "trace", "system_fingerprint", "cache_control"]
        },
        notes: "对照 docs/api/openrouter-chat.md（2026-06-25）。OpenAPI 全文见 docs/archive/openrouter-chat-raw.openapi.md。",
        requiredParameters: ["messages"]
      },
      anthropic_messages: {
        docStatus: "verified",
        docUrl: "https://openrouter.ai/docs/api/api-reference/anthropic-messages/create-messages",
        localDoc: "docs/api/openrouter-message.md",
        parameters: {
          Core: ["model", "messages", "max_tokens", "system"],
          Sampling: ["temperature", "top_p", "top_k", "stop_sequences"],
          Reasoning: ["thinking"],
          Tools: ["tools", "tool_choice"],
          Protocol: ["stream"],
          Routing: ["models", "fallbacks", "provider", "session_id"],
          Extra: ["output_config", "metadata", "user", "cache_control", "plugins"]
        },
        notes: "对照 docs/api/openrouter-message.md（2026-06-25）。"
      },
      responses_api: {
        docStatus: "verified",
        docUrl: "https://openrouter.ai/docs/api/reference/responses/overview",
        localDoc: "docs/api/openrouter-response.md",
        parameters: {
          Core: ["model", "input"],
          Sampling: ["temperature", "top_p"],
          Length: ["max_output_tokens"],
          Tools: ["tools", "tool_choice"],
          Protocol: ["stream"]
        },
        notes: "对照 docs/api/openrouter-response.md（2026-06-25）。"
      }
    },
    minimax: {
      chat_completions: {
        docStatus: "verified",
        docUrl: "https://platform.minimax.io/docs/api-reference/text-chat-openai",
        localDoc: "docs/api/minimax-chat.md",
        parameters: {
          Sampling: ["temperature", "top_p", "n", "frequency_penalty", "presence_penalty", "logit_bias"],
          Length: ["max_completion_tokens", "max_tokens"],
          Reasoning: ["thinking", "reasoning_split"],
          Tools: ["tools", "tool_choice"],
          Protocol: ["stream", "stream_options", "stream_options.include_usage"],
          Multimodal: [
            "messages[].content[].image_url",
            "messages[].content[].image_url.detail",
            "messages[].content[].video_url"
          ],
          Extra: ["service_tier"]
        },
        notes: "对照 docs/api/minimax-chat.md（2026-06-25）。"
      },
      anthropic_messages: {
        docStatus: "verified",
        docUrl: "https://platform.minimax.io/docs/api-reference/text-chat-openai",
        localDoc: "docs/api/minimax-message.md",
        parameters: {
          Core: ["model", "messages", "max_tokens", "system"],
          Sampling: ["temperature", "top_p"],
          Reasoning: ["thinking", "thinking.type"],
          Tools: ["tools", "tool_choice"],
          Protocol: ["stream"],
          Extra: ["service_tier", "metadata"]
        },
        notes: "对照 docs/api/minimax-message.md（2026-06-25）。"
      },
      responses_api: {
        docStatus: "verified",
        docUrl: "https://platform.minimax.io/docs/api-reference/text-chat-openai",
        localDoc: "docs/api/minimax-response.md",
        parameters: {
          Core: ["model", "input"],
          Sampling: ["temperature", "top_p"],
          Length: ["max_output_tokens"],
          Reasoning: ["reasoning", "reasoning.effort"],
          Tools: ["tools", "tool_choice"],
          Protocol: ["stream"],
          Output: ["instructions", "text", "text.format.type"],
          Extra: ["service_tier", "metadata", "prompt_cache_key", "parallel_tool_calls", "store", "truncation"]
        },
        notes: "对照 docs/api/minimax-response.md（2026-06-16）。temperature/top_p 范围 (0,1]，非 OpenAI Responses 标准。"
      }
    },
    siliconflow: {
      chat_completions: {
        docStatus: "verified",
        docUrl: "https://docs.siliconflow.cn/cn/api-reference/chat-completions/chat-completions",
        localDoc: "docs/api/siliconflow-chat.md",
        parameters: {
          Core: ["model", "messages", "messages[].role", "messages[].content"],
          Sampling: ["temperature", "top_p", "top_k", "min_p", "n", "stop", "frequency_penalty"],
          Length: ["max_tokens"],
          Reasoning: ["enable_thinking", "thinking_budget", "reasoning_effort"],
          Output: ["response_format", "response_format.type"],
          Tools: ["tools", "tools[].type", "tools[].function.name", "tools[].function.parameters", "tools[].function.strict"],
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
        notes: "对照 docs/api/siliconflow-chat.md（2026-06-16）；OpenAPI 见 archive。"
      },
      anthropic_messages: {
        docStatus: "verified",
        docUrl: "https://docs.siliconflow.cn/cn/api-reference/chat-completions/messages",
        localDoc: "docs/api/siliconflow-message.md",
        parameters: {
          Core: ["model", "messages", "messages[].role", "messages[].content", "max_tokens", "system"],
          Sampling: ["temperature", "top_p", "top_k", "stop_sequences"],
          Tools: ["tools", "tools[].name", "tools[].input_schema", "tool_choice"],
          Protocol: ["stream"]
        },
        notes: "对照 docs/api/siliconflow-message.md（2026-06-16）。"
      }
    },
    streamlake: {
      chat_completions: {
        docStatus: "verified",
        docUrl: "https://www.streamlake.com/document/WANQING/mq6k66r6xgqwnfbd8t",
        localDoc: "docs/api/streamlake-chat.md",
        parameters: {
          Core: ["model", "messages"],
          Sampling: ["temperature", "top_p", "top_k", "presence_penalty", "seed", "stop", "n"],
          Length: ["max_tokens", "max_completion_tokens"],
          Reasoning: ["enable_thinking"],
          Output: ["response_format", "modalities", "audio"],
          Tools: ["tools", "tool_choice", "parallel_tool_calls"],
          Protocol: ["stream", "stream_options", "stream_options.include_usage"],
          Debug: ["logprobs", "top_logprobs"]
        },
        notes: "对照 docs/api/streamlake-chat.md（2026-06-25）。model 为推理点 ID（ep-xxx）。"
      },
      anthropic_messages: {
        docStatus: "verified",
        docUrl: "https://www.streamlake.com/document/WANQING/mq6k6xfnbs4vn99zggq",
        localDoc: "docs/api/streamlake-message.md",
        parameters: {
          Core: ["model", "messages", "max_tokens", "system"],
          Sampling: ["temperature", "top_p", "stop_sequences"],
          Reasoning: ["thinking"],
          Tools: ["tools", "tool_choice"],
          Protocol: ["stream"],
          Metadata: ["metadata", "cache_control", "service_tier"],
          Extra: ["container", "inference_geo", "output_config"]
        },
        notes: "对照 docs/api/streamlake-message.md（2026-06-25）。"
      },
      responses_api: {
        docStatus: "verified",
        docUrl: "https://www.streamlake.com/document/WANQING/mq6k6jmxvq9ngxkozfl",
        localDoc: "docs/api/streamlake-response.md",
        parameters: {
          Core: ["model", "input"],
          Sampling: ["temperature", "top_p"],
          Length: ["max_output_tokens"],
          Reasoning: ["reasoning", "enable_thinking"],
          Tools: ["tools", "tool_choice"],
          Protocol: ["stream"],
          Metadata: ["instructions", "previous_response_id", "conversation"]
        },
        notes: "对照 docs/api/streamlake-response.md（2026-06-25）。"
      }
    },
    silinex_china: {
      chat_completions: {
        docStatus: "partial",
        docUrl: null,
        localDoc: "config/rules/silinex-gateway.yaml",
        parameters: SILINEX_CHAT_PARAMETERS,
        notes: "SF Silinex CN 独立 API 逻辑（网关转换规则 config/rules/silinex-gateway.yaml）；官方 Chat 文档待补充。"
      },
      anthropic_messages: {
        docStatus: "missing",
        docUrl: null,
        localDoc: null,
        compare: false,
        parameters: {},
        notes: "Anthropic Messages 官方文档待提供，暂不纳入协议对比。"
      },
      responses_api: {
        docStatus: "missing",
        docUrl: null,
        localDoc: null,
        compare: false,
        parameters: {},
        notes: "Responses 官方文档待提供，暂不纳入协议对比。"
      }
    },
    silinex_overseas: {
      chat_completions: {
        docStatus: "partial",
        docUrl: null,
        localDoc: "config/rules/silinex-gateway.yaml",
        parameters: SILINEX_CHAT_PARAMETERS,
        notes: "SF Silinex COM 独立 API 逻辑（网关转换规则 config/rules/silinex-gateway.yaml）；官方 Chat 文档待补充。"
      },
      anthropic_messages: {
        docStatus: "missing",
        docUrl: null,
        localDoc: null,
        compare: false,
        parameters: {},
        notes: "Anthropic Messages 官方文档待提供，暂不纳入协议对比。"
      },
      responses_api: {
        docStatus: "missing",
        docUrl: null,
        localDoc: null,
        compare: false,
        parameters: {},
        notes: "Responses 官方文档待提供，暂不纳入协议对比。"
      }
    },
    vllm: {
      chat_completions: {
        docStatus: "verified",
        docUrl: "https://docs.vllm.ai/en/latest/serving/online_serving/openai_compatible_server/",
        localDoc: "docs/api/vllm.md",
        parameters: {
          Sampling: ["temperature", "top_p", "top_k", "min_p", "repetition_penalty", "stop", "stop_token_ids", "include_stop_str_in_output", "min_tokens"],
          Length: ["max_tokens", "max_completion_tokens"],
          Reasoning: ["reasoning_effort", "chat_template_kwargs.enable_thinking"],
          Output: ["response_format", "structured_outputs"],
          Tools: ["tools", "tool_choice", "parallel_tool_calls"],
          Protocol: ["stream", "stream_options", "stream_options.include_usage"],
          Template: ["continue_final_message", "add_generation_prompt"],
          Debug: ["return_token_ids", "request_id"]
        },
        notes: "vLLM extra_body 扩展参数见 docs/api/vllm.md。"
      }
    },
    openai: {
      chat_completions: {
        docStatus: "verified",
        docUrl: "https://platform.openai.com/docs/api-reference/chat/create",
        localDoc: "docs/api/openai.md",
        parameters: {
          Sampling: ["temperature", "top_p", "n", "seed", "stop", "frequency_penalty", "presence_penalty", "logit_bias"],
          Length: ["max_tokens", "max_completion_tokens"],
          Reasoning: ["reasoning_effort"],
          Output: ["response_format"],
          Tools: ["tools", "tool_choice", "parallel_tool_calls"],
          Protocol: ["stream", "stream_options", "stream_options.include_usage"],
          Debug: ["logprobs", "top_logprobs"],
          Metadata: ["user", "metadata", "store"],
          Extra: ["service_tier", "prediction", "audio"]
        },
        notes: "参考基线渠道；docs/api/openai.md 含更多未列入矩阵的字段。"
      }
    },
    claude: {
      chat_completions: {
        docStatus: "verified",
        docUrl: "https://platform.claude.com/docs/en/api/openai-sdk",
        localDoc: "docs/api/claude.md",
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
        },
        notes: "OpenAI SDK 兼容层；多项参数文档标注为 accepted but ignored。"
      },
      anthropic_messages: {
        docStatus: "partial",
        docUrl: "https://platform.claude.com/docs/en/api/messages",
        localDoc: "docs/api/claude.md",
        parameters: {
          Core: ["model", "messages", "max_tokens", "system"],
          Sampling: ["temperature", "top_p", "top_k", "stop_sequences"],
          Reasoning: ["thinking", "thinking_budget_tokens"],
          Tools: ["tools", "tool_choice"],
          Protocol: ["stream"],
          Metadata: ["metadata", "anthropic-version"]
        },
        notes: "Native Messages 参数为 docs/api/claude.md 摘要；完整 schema 以 Anthropic 官方文档为准。"
      }
    },
    thinking: {
      chat_completions: {
        docStatus: "internal",
        docUrl: null,
        localDoc: "docs/api/thinking-dialects.md",
        parameters: {
          Reasoning: [
            "reasoning_effort",
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
        },
        notes: "跨渠道推理方言探针，非单一供应商 API 文档。"
      }
    }
  };

  function resolveEntry(channelId, protocolId) {
    const entry = channels[channelId]?.[protocolId];
    if (!entry) return null;
    if (entry.inheritsFrom && !entry.parameters) {
      const parent = channels[entry.inheritsFrom]?.[protocolId];
      if (!parent) return entry;
      return {
        ...parent,
        ...entry,
        parameters: entry.parameters || parent.parameters,
        docStatus: entry.docStatus,
        notes: entry.notes || parent.notes
      };
    }
    return entry;
  }

  function getChannelIdsForProtocol(protocolId) {
    return [...PROTOCOL_EVAL_CHANNELS].filter((channelId) => {
      const entry = channels[channelId]?.[protocolId];
      return entry && entry.compare !== false;
    });
  }

  function isProtocolEvalChannel(channelId) {
    return PROTOCOL_EVAL_CHANNELS.has(channelId);
  }

  function getParameters(channelId, protocolId) {
    const entry = resolveEntry(channelId, protocolId);
    return entry?.parameters || null;
  }

  function getDocMeta(channelId, protocolId) {
    const entry = resolveEntry(channelId, protocolId);
    if (!entry) return null;
    const status = DOC_STATUS[entry.docStatus] || DOC_STATUS.missing;
    return {
      docStatus: entry.docStatus,
      docStatusLabel: status.label,
      docStatusClass: status.className,
      docUrl: entry.docUrl,
      localDoc: entry.localDoc,
      notes: entry.notes || "",
      inheritsFrom: entry.inheritsFrom || null
    };
  }

  function getRequiredParameters(channelId, protocolId, entry) {
    if (Array.isArray(entry?.requiredParameters)) return entry.requiredParameters;
    const overrideKey = `${channelId}::${protocolId}`;
    if (PROTOCOL_REQUIRED_OVERRIDES[overrideKey]) return PROTOCOL_REQUIRED_OVERRIDES[overrideKey];
    return PROTOCOL_DEFAULT_REQUIRED[protocolId] || [];
  }

  function flattenParameters(parameters, { channelId, protocolId, entry } = {}) {
    if (!parameters) return [];
    const requiredSet = new Set(getRequiredParameters(channelId, protocolId, entry));
    return Object.entries(parameters).flatMap(([category, list]) =>
      (list || []).map((parameter) => ({
        category,
        parameter,
        required: requiredSet.has(parameter)
      }))
    );
  }

  /** Flatten listed parameters plus any documented required fields missing from the lists. */
  function flattenEntryParameters(channelId, protocolId) {
    const entry = resolveEntry(channelId, protocolId);
    if (!entry?.parameters) return [];
    const requiredList = getRequiredParameters(channelId, protocolId, entry);
    const requiredSet = new Set(requiredList);
    const seen = new Set();
    const items = [];

    for (const [category, list] of Object.entries(entry.parameters)) {
      for (const parameter of list || []) {
        seen.add(parameter);
        items.push({
          category,
          parameter,
          required: requiredSet.has(parameter)
        });
      }
    }

    for (const parameter of requiredList) {
      if (!seen.has(parameter)) {
        items.unshift({ category: "Core", parameter, required: true });
      }
    }

    return items;
  }

  return {
    DOC_STATUS,
    PROTOCOL_DEFAULT_REQUIRED,
    PROTOCOL_EVAL_CHANNELS,
    channels,
    getChannelIdsForProtocol,
    isProtocolEvalChannel,
    getParameters,
    getDocMeta,
    getRequiredParameters,
    flattenParameters,
    flattenEntryParameters,
    resolveEntry
  };
})();
