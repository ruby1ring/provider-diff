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

  const PARAMETER_DESCRIPTIONS = {
    model: "要调用的模型 ID 或推理点 ID",
    models: "候选模型列表，用于路由或回退",
    messages: "对话消息数组（role + content）",
    input: "Responses API 的输入，可为纯文本或消息数组",
    system: "系统指令，置于上下文起始位置",
    temperature: "采样温度，越高输出越随机",
    top_p: "核采样阈值，控制候选 token 累积概率",
    top_k: "仅从概率最高的 K 个 token 中采样",
    min_p: "丢弃概率低于阈值的 token",
    top_a: "动态调整 top_p 的辅助采样参数",
    n: "一次请求生成的回复条数",
    seed: "随机种子，用于尽量复现相同输出",
    stop: "遇到指定字符串时停止生成",
    stop_sequences: "Anthropic Messages 的停止序列列表",
    frequency_penalty: "按 token 出现频率惩罚，降低重复",
    presence_penalty: "按 token 是否已出现惩罚，鼓励新话题",
    repetition_penalty: "重复惩罚系数，抑制重复措辞",
    logit_bias: "对指定 token 的 logit 加减偏置",
    max_tokens: "最大生成 token 数（部分渠道已废弃）",
    max_completion_tokens: "最大输出 token 数（推荐替代 max_tokens）",
    max_output_tokens: "Responses API 的最大输出 token 数",
    reasoning_effort: "推理强度档位（如 low / medium / high）；部分渠道 none 兼作关闭",
    thinking: "思考模式配置对象（各家子字段语义不同）",
    "thinking.type": "思考模式开/关或 adaptive 类型",
    "thinking.clear_thinking": "是否剥离历史 reasoning_content",
    thinking_budget: "思考阶段可用 token 预算",
    preserve_thinking: "多轮对话是否保留历史思考内容",
    thinking_budget_tokens: "Anthropic Messages 思考 token 上限",
    enable_thinking: "是否开启深度思考/推理模式",
    reasoning: "推理/思考配置对象（子字段因协议与渠道而异）",
    "reasoning.effort": "推理强度子字段（多见于 Responses API 的 reasoning 对象）",
    "reasoning.summary": "是否在响应中返回推理摘要",
    include_reasoning: "是否在响应中包含推理内容",
    reasoning_content: "助手消息中的推理过程文本",
    reasoning_split: "是否将推理与最终回复分开展示",
    "chat_template_kwargs.enable_thinking": "通过 chat template 开启思考",
    "usage.completion_tokens_details.reasoning_tokens": "输出中推理阶段消耗的 token 数",
    response_format: "规定输出格式，如 text 或 json_object",
    "response_format.type=json_object": "强制返回 JSON 对象",
    "response_format.type=json_schema": "按 JSON Schema 约束结构化输出",
    structured_outputs: "启用严格结构化输出模式",
    modalities: "输出模态列表，如 text、audio",
    audio: "音频输出音色与格式配置",
    image_config: "图像生成相关配置（部分路由渠道）",
    prediction: "预测式补全的前缀内容",
    tools: "可供模型调用的函数/工具声明列表",
    tool_choice: "控制模型是否/如何调用工具",
    parallel_tool_calls: "是否允许并行发起多个工具调用",
    "tools[].function.strict": "要求函数参数严格符合 JSON Schema",
    functions: "旧版 function 声明（兼容字段）",
    function_call: "旧版 function 调用控制（兼容字段）",
    stop_server_tools_when: "满足条件时停止服务端工具执行",
    stream: "是否以流式（SSE）返回",
    stream_options: "流式输出附加选项",
    "stream_options.include_usage": "流式最后一个 chunk 是否附带 usage",
    logprobs: "是否返回输出 token 的对数概率",
    top_logprobs: "每个位置返回 top-N 个 token 概率",
    user: "终端用户标识，用于滥用追踪",
    user_id: "用户 ID（部分渠道的命名变体）",
    metadata: "随请求附带的自定义元数据",
    store: "是否将对话存入供应商侧存储",
    service_tier: "服务层级或优先级档位",
    session_id: "会话追踪 ID",
    trace: "分布式追踪关联信息",
    system_fingerprint: "后端配置指纹，用于复现性排查",
    cache_control: "Prompt 缓存策略（Anthropic）",
    instructions: "Responses API 插入上下文开头的系统指令",
    previous_response_id: "上一轮 Responses 响应 ID，用于多轮对话",
    conversation: "Responses 会话 ID，自动维护上下文",
    container: "Anthropic 代码执行容器配置",
    inference_geo: "指定推理地理区域",
    output_config: "Anthropic 输出格式附加配置",
    "messages[].prefix": "将该条 assistant 消息作为生成前缀续写",
    "messages[].reasoning_content": "消息中携带的推理内容字段",
    "messages[].content[].image_url": "多模态消息中的图片 URL",
    "messages[].content[].image_url.detail": "图片理解精度（如 low / high）",
    "messages[].content[].video_url": "多模态消息中的视频 URL",
    "messages[].content[].audio_url": "多模态消息中的音频 URL",
    "messages[].content[].input_audio": "输入音频数据（base64 等）",
    "content[].type=text": "Anthropic 文本内容块",
    "content[].type=tool_use": "Anthropic 工具调用内容块",
    "content[].type=tool_result": "Anthropic 工具结果内容块",
    provider: "OpenRouter 路由：指定底层供应商偏好",
    "provider.order": "供应商优先级排序列表",
    "provider.only": "仅允许使用的供应商列表",
    "provider.ignore": "排除的供应商列表",
    "provider.require_parameters": "仅路由到支持全部参数的供应商",
    "provider.zdr": "零数据保留路由偏好",
    route: "OpenRouter 路由策略别名",
    plugins: "OpenRouter 插件列表（搜索、时间等）",
    "openrouter:datetime": "注入当前日期时间上下文",
    "openrouter:web_search": "启用网页搜索插件",
    "openrouter:web_fetch": "抓取指定网页内容",
    "debug.echo_upstream_body": "调试：回显转发给上游的请求体",
    min_tokens: "最少生成 token 数",
    stop_token_ids: "遇到指定 token ID 时停止",
    include_stop_str_in_output: "是否在输出中保留触发 stop 的字符串",
    continue_final_message: "从最后一条 assistant 消息续写",
    add_generation_prompt: "是否追加生成提示模板",
    return_token_ids: "是否在响应中返回 token ID",
    request_id: "客户端自定义请求 ID",
    reasnoing_effort: "推理强度（部分渠道拼写变体）",
    "anthropic-version": "Anthropic API 版本号请求头"
  };

  const PARAMETER_DESCRIPTIONS_BY_PROTOCOL = {
    chat_completions: {
      reasoning: "Chat Completions 推理配置对象（OpenRouter 扩展；子字段如 effort、summary）"
    },
    responses_api: {
      reasoning: "Responses API 推理配置对象",
      "reasoning.effort": "推理强度档位（reasoning 子字段）"
    }
  };

  const OUTPUT_PARAM_SUBGROUPS = {
    response_format: "structure",
    "response_format.type": "structure",
    structured_outputs: "structure",
    prediction: "structure",
    output_config: "structure",
    instructions: "structure",
    text: "structure",
    "text.format.type": "structure",
    modalities: "modality",
    audio: "modality",
    vl_high_resolution_images: "modality",
    image_config: "modality"
  };

  const OUTPUT_SUBGROUP_ORDER = ["structure", "modality"];

  const OUTPUT_SUBGROUP_LABELS = {
    structure: "输出控制-结构 Structure",
    modality: "输出控制-模态 Modality"
  };

  const OUTPUT_SUBGROUP_HINTS = {
    structure: "规定输出格式、结构化约束或文本形态",
    modality: "声明非文本输出模态（音频、图像等）"
  };

  const THINKING_PARAM_SUBGROUPS = {
    enable_thinking: "switch",
    thinking: "switch",
    "thinking.type": "switch",
    "chat_template_kwargs.enable_thinking": "switch",
    reasoning: "switch",
    "reasoning.enabled": "switch",
    reasoning_effort: "intensity",
    thinking_budget: "intensity",
    "thinking.budget_tokens": "intensity",
    thinking_budget_tokens: "intensity",
    "reasoning.effort": "intensity",
    "reasoning.max_tokens": "intensity",
    preserve_thinking: "output",
    "thinking.clear_thinking": "output",
    reasoning_split: "output",
    "reasoning.summary": "output",
    include_reasoning: "output",
    "reasoning.exclude": "output"
  };

  const THINKING_PARAM_ROLES = {
    reasoning_effort: "dual",
    reasoning: "composite",
    thinking: "composite"
  };

  const THINKING_ROLE_LABELS = {
    switch: "开关 Switch",
    intensity: "强度 Intensity",
    output: "可见性 Output",
    dual: "开关+强度 Switch+Intensity",
    composite: "对象字段 Object"
  };

  const THINKING_SUBGROUP_ORDER = ["switch", "intensity", "output"];

  const THINKING_SUBGROUP_LABELS = {
    switch: "思考模式开关 Switch",
    intensity: "思考强度控制 Intensity",
    output: "输出与可见性 Output"
  };

  const THINKING_SUBGROUP_HINTS = {
    switch: "控制模型是否进入思考阶段",
    intensity: "控制思考深度、档位或 token 预算",
    output: "控制思考内容是否返回、如何展示或多轮保留"
  };

  /** Per eval-channel thinking control fields for Chat Completions matrix header. */
  const THINKING_CHANNEL_FIELD_SUMMARY = [
    { channelId: "aliyun", switchField: "enable_thinking", intensityField: "thinking_budget", note: "hybrid 可关；thinking-only 不可关" },
    { channelId: "deepseek", switchField: "thinking.type", intensityField: "reasoning_effort", note: "默认 thinking 开启" },
    { channelId: "zhipu", switchField: "thinking.type", intensityField: "reasoning_effort", note: "reasoning_effort 仅 GLM-5.2" },
    { channelId: "minimax", switchField: "thinking.type", intensityField: "—", note: "reasoning_split 只管输出格式" },
    { channelId: "streamlake", switchField: "enable_thinking", intensityField: "—", note: "文档仅列开关" },
    { channelId: "openrouter", switchField: "reasoning", intensityField: "reasoning.effort / max_tokens", note: "统一 reasoning 对象" },
    { channelId: "siliconflow", switchField: "enable_thinking", intensityField: "thinking_budget", note: "模型列表限定" }
  ];

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
    PARAMETER_DESCRIPTIONS,
    PARAMETER_DESCRIPTIONS_BY_PROTOCOL,
    OUTPUT_PARAM_SUBGROUPS,
    OUTPUT_SUBGROUP_ORDER,
    OUTPUT_SUBGROUP_LABELS,
    OUTPUT_SUBGROUP_HINTS,
    THINKING_PARAM_SUBGROUPS,
    THINKING_PARAM_ROLES,
    THINKING_ROLE_LABELS,
    THINKING_SUBGROUP_ORDER,
    THINKING_SUBGROUP_LABELS,
    THINKING_SUBGROUP_HINTS,
    THINKING_CHANNEL_FIELD_SUMMARY,
    ORIGIN_LABELS,
    SUPPORT_CONCLUSIONS,
    EVIDENCE_LEVELS,
    GATEWAY_ACTIONS,
    REQUIRED_BASELINE_FIELDS: ["id", "object", "choices", "usage", "model"]
  };
})();
