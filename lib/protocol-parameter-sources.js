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

  const PROTOCOL_EVAL_CHANNELS = new Set([
    "deepseek",
    "aliyun",
    "openrouter",
    "minimax",
    "siliconflow"
  ]);

  const channels = {
    deepseek: {
      chat_completions: {
        docStatus: "verified",
        docUrl: "https://api-docs.deepseek.com/zh-cn/api/create-chat-completion",
        localDoc: "docs/deepseek.md",
        parameters: {
          Sampling: ["temperature", "top_p", "stop"],
          Length: ["max_tokens"],
          Reasoning: ["thinking", "reasoning_effort"],
          Output: ["response_format"],
          Tools: ["tools", "tool_choice", "tools[].function.strict"],
          Protocol: ["stream", "stream_options", "stream_options.include_usage"],
          Debug: ["logprobs", "top_logprobs"],
          Metadata: ["user_id"],
          Beta: ["messages[].prefix", "messages[].reasoning_content"],
          Ignored: ["frequency_penalty", "presence_penalty"]
        },
        notes: "对照 docs/deepseek.md（2026-06-16）。frequency_penalty / presence_penalty 已 deprecated，接受但无效果。"
      },
      anthropic_messages: {
        docStatus: "partial",
        docUrl: "https://api-docs.deepseek.com/zh-cn/quick_start/anthropic_api",
        localDoc: "docs/deepseek.md",
        parameters: {},
        notes: "本地文档仅整理 endpoint 与鉴权；Messages 请求体参数待对照 DeepSeek Anthropic API 文档补充。"
      }
    },
    aliyun: {
      chat_completions: {
        docStatus: "verified",
        docUrl: "https://help.aliyun.com/zh/model-studio/qwen-api-via-openai-chat-completions",
        localDoc: "docs/ali.md",
        parameters: {
          Sampling: ["temperature", "top_p", "top_k", "repetition_penalty", "presence_penalty", "seed", "stop", "n"],
          Length: ["max_tokens", "max_completion_tokens"],
          Reasoning: ["enable_thinking", "thinking", "preserve_thinking", "thinking_budget", "reasoning_effort"],
          Output: ["response_format", "modalities", "vl_high_resolution_images"],
          Tools: ["tools", "tool_choice", "parallel_tool_calls", "tool_stream", "enable_code_interpreter"],
          Protocol: ["stream", "stream_options", "stream_options.include_usage"],
          Debug: ["logprobs", "top_logprobs"],
          Search: ["enable_search", "search_options"],
          Extra: ["skill", "audio", "X-DashScope-DataInspection"]
        },
        notes: "对照 docs/ali.md（2026-06-16）。非 OpenAI 标准参数通过 extra_body 传入；max_tokens 即将废弃，思考模型推荐 max_completion_tokens。"
      },
      anthropic_messages: {
        docStatus: "partial",
        docUrl: "https://help.aliyun.com/zh/model-studio/anthropic-api-messages",
        localDoc: "docs/ali.md",
        parameters: {},
        notes: "本地文档仅整理 endpoint 与鉴权；Messages 请求参数待对照百炼 Anthropic API 文档补充。"
      },
      responses_api: {
        docStatus: "partial",
        docUrl: "https://help.aliyun.com/zh/model-studio/qwen-api-via-openai-responses",
        localDoc: "docs/ali.md",
        parameters: {
          Core: ["model", "input"],
          Sampling: ["temperature", "top_p"],
          Length: ["max_output_tokens"],
          Protocol: ["stream"]
        },
        notes: "Responses 仅文档化千问系列；参数表为摘要，Noctua 暂未纳入跑批。"
      }
    },
    openrouter: {
      chat_completions: {
        docStatus: "verified",
        docUrl: "https://openrouter.ai/docs/api/api-reference/chat/send-chat-completion-request",
        localDoc: "docs/openrouter.md",
        parameters: {
          Core: ["model", "models", "messages"],
          Sampling: ["temperature", "top_p", "top_k", "min_p", "top_a", "seed", "stop", "frequency_penalty", "presence_penalty", "repetition_penalty", "logit_bias"],
          Length: ["max_tokens", "max_completion_tokens"],
          Reasoning: ["reasoning", "reasoning.effort", "reasoning.summary", "reasoning_effort", "include_reasoning"],
          Output: ["response_format", "structured_outputs", "modalities", "prediction", "image_config"],
          Tools: ["tools", "tool_choice", "parallel_tool_calls", "tools[].function.strict", "stop_server_tools_when"],
          Protocol: ["stream", "stream_options"],
          Routing: ["provider", "provider.order", "provider.only", "provider.ignore", "provider.require_parameters", "provider.zdr", "route"],
          Plugins: ["plugins", "openrouter:datetime", "openrouter:web_search", "openrouter:web_fetch"],
          Debug: ["logprobs", "top_logprobs", "debug.echo_upstream_body"],
          Observability: ["metadata", "user", "service_tier", "session_id", "trace", "system_fingerprint", "cache_control"]
        },
        notes: "对照 docs/openrouter.md（2026-06-16）。top_k / min_p / repetition_penalty / reasoning_effort 已入 ChatRequest OpenAPI，上游支持因模型而异；stream_options.include_usage 已废弃。"
      },
      anthropic_messages: {
        docStatus: "missing",
        docUrl: "https://openrouter.ai/docs/api-reference/messages",
        localDoc: null,
        parameters: {},
        notes: "OpenRouter Messages API 尚无本地整理文档，请提供官方参数说明后更新矩阵。"
      },
      responses_api: {
        docStatus: "partial",
        docUrl: "https://openrouter.ai/docs/api/reference/responses/overview",
        localDoc: "docs/openrouter.md",
        parameters: {
          Core: ["model", "input"],
          Sampling: ["temperature", "top_p"],
          Length: ["max_output_tokens"],
          Tools: ["tools", "tool_choice"],
          Protocol: ["stream"]
        },
        notes: "Responses Beta；参数表为摘要，待对照 OpenRouter OpenAPI 完整整理。"
      }
    },
    minimax: {
      chat_completions: {
        docStatus: "verified",
        docUrl: "https://platform.minimax.io/docs/api-reference/text-chat-openai",
        localDoc: "docs/minimax.md",
        parameters: {
          Sampling: ["temperature", "top_p", "n"],
          Length: ["max_completion_tokens", "max_tokens"],
          Reasoning: ["thinking", "reasoning_split"],
          Tools: ["tools", "tool_choice"],
          Protocol: ["stream", "stream_options", "stream_options.include_usage"],
          Multimodal: ["messages[].content[].image_url", "messages[].content[].video_url"],
          Extra: ["service_tier"],
          Ignored: ["presence_penalty", "frequency_penalty", "logit_bias", "function_call"]
        },
        notes: "对照 docs/minimax.md（2026-06-16）。MiniMax-M3 支持多模态与 thinking；M2.x 不可关闭思考。max_tokens 已废弃。"
      },
      anthropic_messages: {
        docStatus: "partial",
        docUrl: "https://platform.minimax.io/docs/api-reference/text-chat-openai",
        localDoc: "docs/minimax.md",
        parameters: {},
        notes: "本地文档仅整理 Messages endpoint 与鉴权；请求参数待补充。"
      }
    },
    siliconflow: {
      chat_completions: {
        docStatus: "verified",
        docUrl: "https://api-docs.siliconflow.cn/docs/api/chat-completions-post",
        localDoc: "docs/siliconflow.md",
        parameters: {
          Sampling: ["temperature", "top_p", "top_k", "min_p", "n", "stop", "frequency_penalty"],
          Length: ["max_tokens"],
          Reasoning: ["enable_thinking", "thinking_budget", "reasoning_effort"],
          Output: ["response_format", "response_format.type=json_schema", "response_format.type=json_object"],
          Tools: ["tools", "tool_choice"],
          Protocol: ["stream"],
          Multimodal: ["messages[].content[].image_url", "messages[].content[].image_url.detail", "messages[].content[].video_url", "messages[].content[].audio_url"]
        },
        notes: "对照 docs/siliconflow.md（2026-06-16）。reasoning_effort 仅 DeepSeek-V4-Flash；enable_thinking 模型列表见本地文档。"
      },
      anthropic_messages: {
        docStatus: "missing",
        docUrl: "https://docs.siliconflow.cn/cn/api-reference/chat-completions/messages",
        localDoc: "docs/siliconflow.md",
        parameters: {},
        notes: "SiliconFlow Messages 端点已接入测评工具，但本地尚无请求参数整理文档。"
      }
    },
    silinex_china: {
      chat_completions: {
        docStatus: "partial",
        docUrl: null,
        localDoc: "a.yaml",
        parameters: SILINEX_CHAT_PARAMETERS,
        notes: "SF Silinex CN 独立 API 逻辑（网关转换规则 a.yaml）；官方 Chat 文档待补充。"
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
        localDoc: "a.yaml",
        parameters: SILINEX_CHAT_PARAMETERS,
        notes: "SF Silinex COM 独立 API 逻辑（网关转换规则 a.yaml）；官方 Chat 文档待补充。"
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
        localDoc: "docs/vllm.md",
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
        notes: "vLLM extra_body 扩展参数见 docs/vllm.md。"
      }
    },
    openai: {
      chat_completions: {
        docStatus: "verified",
        docUrl: "https://platform.openai.com/docs/api-reference/chat/create",
        localDoc: "docs/openai.md",
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
        notes: "参考基线渠道；docs/openai.md 含更多未列入矩阵的字段。"
      }
    },
    claude: {
      chat_completions: {
        docStatus: "verified",
        docUrl: "https://platform.claude.com/docs/en/api/openai-sdk",
        localDoc: "docs/claude.md",
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
        localDoc: "docs/claude.md",
        parameters: {
          Core: ["model", "messages", "max_tokens", "system"],
          Sampling: ["temperature", "top_p", "top_k", "stop_sequences"],
          Reasoning: ["thinking", "thinking_budget_tokens"],
          Tools: ["tools", "tool_choice"],
          Protocol: ["stream"],
          Metadata: ["metadata", "anthropic-version"]
        },
        notes: "Native Messages 参数为 docs/claude.md 摘要；完整 schema 以 Anthropic 官方文档为准。"
      }
    },
    thinking: {
      chat_completions: {
        docStatus: "internal",
        docUrl: null,
        localDoc: "docs/thinking-dialects.md",
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

  function flattenParameters(parameters) {
    if (!parameters) return [];
    return Object.entries(parameters).flatMap(([category, list]) =>
      (list || []).map((parameter) => ({ category, parameter }))
    );
  }

  return {
    DOC_STATUS,
    PROTOCOL_EVAL_CHANNELS,
    channels,
    getChannelIdsForProtocol,
    isProtocolEvalChannel,
    getParameters,
    getDocMeta,
    flattenParameters,
    resolveEntry
  };
})();
