window.PROVIDERX_RULES = (() => {
  const PARAMETER_ORIGINS = {
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
    reasoning: "openrouter-extension",
    "reasoning.effort": "openrouter-extension",
    "reasoning.summary": "openrouter-extension",
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
    repetition_penalty: "provider-private",
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
    max_tokens_to_sample: "anthropic-messages",
    system: "anthropic-messages",
    "content[].type=text": "anthropic-messages",
    "content[].type=tool_use": "anthropic-messages",
    "content[].type=tool_result": "anthropic-messages",
    thinking_budget_tokens: "anthropic-messages",
    "anthropic-version": "anthropic-messages"
  };

  const ORIGIN_LABELS = {
    "openai-standard": "OpenAI 标准",
    "provider-private": "非 OpenAI 标准",
    "anthropic-extension": "Anthropic 扩展",
    "qwen-extension": "Qwen 扩展",
    "siliconflow-extension": "非 OpenAI 标准",
    "siliconflow-observability": "SiliconFlow 可观测性",
    "deepseek-extension": "DeepSeek 扩展",
    "dashscope-private": "DashScope 私有",
    "minimax-private": "MiniMax 私有",
    "openrouter-extension": "OpenRouter 扩展",
    "openrouter-routing": "OpenRouter 路由",
    "openrouter-observability": "OpenRouter 可观测性",
    "anthropic-messages": "Anthropic Messages",
    "vllm-extension": "vLLM 扩展"
  };

  const SUPPORT_CONCLUSIONS = {
    supported: {
      label: "支持",
      shortLabel: "支持",
      badgeClass: "supported",
      status: "accepted",
      httpStatus: 200,
      note: "供应商接受该参数，响应结构可继续按当前协议处理。"
    },
    ignored: {
      label: "接受但未证明生效",
      shortLabel: "未证明",
      badgeClass: "ignored",
      status: "warning",
      httpStatus: 200,
      note: "请求不会 400，但参数可能被忽略或只产生供应商特有行为。"
    },
    rejected_400: {
      label: "拒绝",
      shortLabel: "拒绝",
      badgeClass: "rejected-400",
      status: "rejected",
      httpStatus: 400,
      note: "供应商明确拒绝该参数，需要在网关侧过滤、降级或转换。"
    },
    request_failed: {
      label: "请求失败",
      shortLabel: "失败",
      badgeClass: "request-failed",
      status: "rejected",
      httpStatus: 0,
      note: "真实请求未完成，通常是 API Key、代理、网络或供应商临时错误。"
    },
    permission_limited: {
      label: "权限受限",
      shortLabel: "权限",
      badgeClass: "permission-limited",
      status: "warning",
      httpStatus: 403,
      note: "当前 API Key 或模型权限不足，不能据此判断参数不支持。"
    },
    schema_mismatch: {
      label: "断言失败",
      shortLabel: "断言失败",
      badgeClass: "request-failed",
      status: "rejected",
      httpStatus: 200,
      note: "供应商返回了 2xx，但响应结构或参数语义断言未通过。"
    },
    unknown: {
      label: "未覆盖",
      shortLabel: "未知",
      badgeClass: "unknown",
      status: "na",
      httpStatus: 0,
      note: "当前用例没有覆盖到明确结论。"
    }
  };

  const EVIDENCE_LEVELS = {
    asserted: { label: "断言通过", badgeClass: "asserted", copy: "有响应和断言证据。" },
    observed: { label: "已观测", badgeClass: "observed", copy: "有响应证据，但断言较弱。" },
    inferred: { label: "推断", badgeClass: "inferred", copy: "基于预期或预览数据推断。" },
    none: { label: "无证据", badgeClass: "none", copy: "没有可用于判断的有效响应。" }
  };

  const GATEWAY_ACTIONS = {
    pass_through: { label: "放行", copy: "可作为低风险参数继续透传。" },
    strip_or_warn: { label: "提示/过滤", copy: "建议提示风险；必要时在网关侧过滤。" },
    strip_or_transform: { label: "过滤/转换", copy: "建议在网关侧过滤该参数，或转换为该 provider 支持的形态。" },
    adapter_required: { label: "适配", copy: "需要 provider-specific adapter 处理响应或参数语义。" },
    retry_or_review: { label: "重试/复核", copy: "先排查 Key、URL、模型、代理或权限，再做支持性判断。" },
    manual_review: { label: "人工确认", copy: "结论不足，需要补充基线或定向 case。" }
  };

  return {
    PARAMETER_ORIGINS,
    ORIGIN_LABELS,
    SUPPORT_CONCLUSIONS,
    EVIDENCE_LEVELS,
    GATEWAY_ACTIONS,
    REQUIRED_BASELINE_FIELDS: ["id", "object", "choices", "usage", "model"]
  };
})();
