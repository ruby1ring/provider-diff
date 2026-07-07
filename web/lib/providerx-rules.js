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
    model: "指定要使用的模型，填模型名称或推理接入点 ID（如 deepseek-chat）",
    models: "备选模型列表；主模型不可用或失败时按顺序自动切换",
    messages: "整段对话内容，按顺序排列的消息数组，每条含角色和内容",
    "messages[].role": "这条消息是谁说的：system（设定）/ user（用户）/ assistant（模型）/ tool（工具）",
    "messages[].content": "单条消息的正文，可以是一段文字，也可以是图文等多模态分片数组",
    input: "Responses API 的输入内容，可为一段纯文本或消息数组",
    system: "系统提示词，用来设定模型的身份、风格和规则，放在对话最前面",
    "system[].type": "系统提示分片的类型（Anthropic 把 system 拆成数组时使用）",
    "system[].text": "系统提示分片的文字内容（Anthropic 把 system 拆成数组时使用）",
    temperature: "随机性高低：越大回答越发散有创意，越小越稳定保守（常见 0~2）",
    top_p: "核采样：只在累计概率达到该比例的高概率词里挑，越小越保守（0~1）",
    top_k: "只在概率最高的前 K 个候选词里挑选，K 越小越保守",
    min_p: "过滤掉概率低于该比例的候选词，剔除不靠谱的低概率词",
    top_a: "依据最高概率动态调整候选范围的采样参数",
    do_sample: "是否启用随机采样；关闭则每步都取概率最高的词（贪心、更确定）",
    n: "一次请求让模型生成几条不同回复",
    seed: "随机种子；固定后相同输入尽量得到相同输出，方便复现",
    stop: "停止词；模型生成到这些字符串时立即停下",
    stop_sequences: "停止序列列表（Anthropic 用法），命中任意一个就停止",
    stop_token_ids: "遇到这些 token ID 就停止生成",
    include_stop_str_in_output: "输出里是否保留触发停止的那段字符串",
    frequency_penalty: "出现越频繁的词越被压制，用来减少啰嗦重复",
    presence_penalty: "已出现过的词会被压制，鼓励模型展开新话题",
    repetition_penalty: "重复惩罚系数，整体抑制重复用词，>1 越强",
    logit_bias: "手动调高或调低指定词被选中的概率",
    max_tokens: "本次回复最多生成多少 token（部分新接口改用 max_completion_tokens）",
    max_completion_tokens: "本次回复最多生成多少 token（推荐写法，替代旧的 max_tokens）",
    max_output_tokens: "Responses API 中本次输出最多生成多少 token",
    min_tokens: "至少生成多少 token 后才允许停止",
    reasoning_effort: "思考强度档位（low/medium/high）：越高想得越深但更慢更贵，部分渠道用 none 关闭思考",
    reasnoing_effort: "思考强度（个别渠道的拼写变体，等同 reasoning_effort）",
    thinking: "思考模式配置对象，用来开启或调节深度思考；各家子字段含义不同",
    "thinking.type": "思考开关：控制开启、关闭或自适应（adaptive）思考",
    "thinking.budget_tokens": "思考阶段最多可用多少 token（thinking 子字段）",
    "thinking.clear_thinking": "多轮中是否清除历史思考内容（reasoning_content）",
    thinking_budget: "给思考阶段设定的 token 预算上限",
    thinking_budget_tokens: "Anthropic Messages 中思考阶段的 token 上限",
    preserve_thinking: "多轮对话中是否保留之前的思考内容",
    enable_thinking: "是否开启深度思考/推理模式（开关）",
    reasoning: "推理/思考配置对象，统一管理思考设置；子字段随协议和渠道而异",
    "reasoning.effort": "思考强度档位（reasoning 对象的子字段），如 low/medium/high",
    "reasoning.max_tokens": "思考阶段的 token 上限（reasoning 子字段）",
    "reasoning.summary": "是否在回复里附带一段思考过程摘要",
    "reasoning.exclude": "是否从返回结果中隐藏思考内容",
    include_reasoning: "是否在返回结果里包含模型的思考内容",
    reasoning_content: "模型输出的思考过程文本（与最终回答分开）",
    reasoning_split: "是否把思考过程和最终回答分成两部分返回",
    "chat_template_kwargs.enable_thinking": "通过对话模板参数开启思考模式",
    "usage.completion_tokens_details.reasoning_tokens": "用量统计中思考阶段消耗的 token 数",
    response_format: "指定回复格式，例如普通文本或 JSON",
    "response_format.type": "输出格式类型：text / json_object / json_schema",
    "response_format.type=json_object": "强制模型返回一个合法的 JSON 对象",
    "response_format.type=json_schema": "按你给定的 JSON Schema 严格约束输出结构",
    structured_outputs: "开启严格结构化输出，确保结果完全符合给定结构",
    text: "Responses API 的文本输出配置",
    "text.format.type": "Responses API 文本输出的格式类型，如 text / json_schema",
    modalities: "希望模型输出哪些形态，如文本、音频",
    audio: "音频输出的音色、格式等配置",
    image_config: "图像生成相关配置（部分路由渠道）",
    vl_high_resolution_images: "是否以高分辨率方式理解图片（视觉模型）",
    prediction: "预测式补全：提前给出预计内容作为前缀以加速生成",
    speed: "生成速度档位偏好（部分渠道）",
    tools: "提供给模型可调用的工具/函数清单",
    "tools[].type": "工具类型，例如 function",
    "tools[].name": "工具名称（Anthropic 用法）",
    "tools[].description": "工具用途说明，帮助模型判断什么时候该调用它",
    "tools[].input_schema": "工具入参的 JSON Schema 定义（Anthropic 用法）",
    "tools[].function.name": "函数名称",
    "tools[].function.description": "函数用途说明，帮助模型判断什么时候该调用它",
    "tools[].function.parameters": "函数入参的 JSON Schema 定义",
    "tools[].function.strict": "要求函数入参严格符合声明的 JSON Schema",
    tool_choice: "控制模型是否调用工具、以及调用哪一个",
    tool_stream: "是否对工具调用过程也进行流式输出",
    parallel_tool_calls: "是否允许模型一次并行调用多个工具",
    functions: "旧版函数声明（已被 tools 取代，保留兼容）",
    function_call: "旧版函数调用控制（已被 tool_choice 取代，保留兼容）",
    stop_server_tools_when: "满足设定条件时停止执行服务端工具",
    mcp_servers: "可连接的 MCP 工具服务器列表",
    stream: "是否流式返回，边生成边逐字推送（SSE）",
    stream_options: "流式输出的附加选项",
    "stream_options.include_usage": "流式结束时是否在最后一帧附带用量统计",
    logprobs: "是否返回每个输出词的对数概率",
    top_logprobs: "每个位置额外返回概率最高的前 N 个候选词",
    user: "终端用户标识，便于供应商做滥用监控",
    user_id: "用户标识（部分渠道对 user 的别名）",
    "metadata.user_id": "元数据中的用户标识",
    safety_identifier: "安全/合规用的终端用户标识",
    metadata: "随请求附带的自定义键值信息",
    store: "是否把本次对话保存到供应商服务端",
    service_tier: "服务等级 / 优先级档位",
    session_id: "会话追踪 ID，用于串联同一个会话",
    request_id: "客户端自定义的请求 ID，方便日志排查",
    trace: "分布式链路追踪信息",
    system_fingerprint: "后端配置指纹，用于排查可复现性问题",
    cache_control: "Prompt 缓存策略（Anthropic），复用上下文以降本提速",
    prompt_cache_key: "Prompt 缓存命中所用的键",
    context_management: "上下文管理策略，如自动裁剪过长的历史",
    truncation: "上下文超长时的截断策略",
    instructions: "Responses API 的系统指令，插入上下文最前面",
    previous_response_id: "上一条 Responses 响应的 ID，用于接续多轮对话",
    conversation: "Responses 会话 ID，自动维护多轮上下文",
    container: "Anthropic 代码执行的容器配置",
    inference_geo: "指定推理所在的地理区域",
    output_config: "Anthropic 输出格式的附加配置",
    continue_final_message: "从最后一条 assistant 消息接着往下写",
    add_generation_prompt: "是否在末尾自动追加生成提示模板",
    return_token_ids: "是否在响应里返回 token 的 ID",
    "messages[].prefix": "把这条 assistant 消息当作前缀，让模型接着往下写",
    "messages[].reasoning_content": "消息里携带的思考过程内容",
    "messages[].content[].type=text": "标记该内容分片为文本",
    "messages[].content[].type=image_url": "标记该内容分片为图片",
    "messages[].content[].type=video_url": "标记该内容分片为视频",
    "messages[].content[].type=audio_url": "标记该内容分片为音频",
    "messages[].content[].image_url": "多模态消息里的图片地址",
    "messages[].content[].image_url.url": "图片分片的具体地址（URL 或 data URL）",
    "messages[].content[].image_url.detail": "图片理解清晰度档位（如 low / high）",
    "messages[].content[].video_url": "多模态消息里的视频地址",
    "messages[].content[].video_url.url": "视频分片的具体地址（URL 或 data URL）",
    "messages[].content[].video_url.fps": "视频抽帧帧率，控制每秒取几帧来理解",
    "messages[].content[].audio_url": "多模态消息里的音频地址",
    "messages[].content[].audio_url.url": "音频分片的具体地址（URL 或 data URL）",
    "messages[].content[].input_audio": "直接传入的音频数据（如 base64）",
    "content[].type=text": "Anthropic 文本内容块",
    "content[].type=tool_use": "Anthropic 工具调用内容块",
    "content[].type=tool_result": "Anthropic 工具返回结果内容块",
    provider: "OpenRouter 路由：指定偏好的底层供应商",
    "provider.order": "供应商尝试的优先顺序",
    "provider.only": "只允许使用这些供应商",
    "provider.ignore": "排除这些供应商",
    "provider.require_parameters": "只路由到支持你全部参数的供应商",
    "provider.zdr": "偏好零数据保留（ZDR）的供应商",
    route: "OpenRouter 路由策略别名",
    fallbacks: "失败时的回退模型 / 配置列表",
    plugins: "OpenRouter 插件列表（如联网搜索、时间注入）",
    "openrouter:datetime": "注入当前日期时间作为上下文",
    "openrouter:web_search": "启用联网搜索插件",
    "openrouter:web_fetch": "抓取指定网页内容供模型参考",
    enable_search: "是否启用联网搜索",
    search_options: "联网搜索的配置选项",
    enable_code_interpreter: "是否启用代码解释器工具",
    skill: "调用渠道自定义的技能 / 插件",
    "X-DashScope-DataInspection": "DashScope 内容安全检测开关（请求头）",
    "debug.echo_upstream_body": "调试用：原样回显转发给上游的请求体",
    "anthropic-version": "Anthropic API 版本号（请求头）"
  };

  const PARAMETER_DESCRIPTIONS_BY_PROTOCOL = {
    chat_completions: {
      reasoning: "思考配置对象（OpenRouter 扩展）：用子字段统一控制是否思考、思考强度与摘要"
    },
    responses_api: {
      reasoning: "Responses API 的思考配置对象，用子字段控制思考强度与摘要",
      "reasoning.effort": "思考强度档位（reasoning 子字段），如 low / medium / high"
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

  /** Parameters documented per-channel but omitted from cross-channel protocol matrix comparison. */
  const PROTOCOL_COMPARE_EXCLUDED_PARAMETERS = new Set([
    "enable_search",
    "search_options",
    "skill",
    "X-DashScope-DataInspection",
    "enable_code_interpreter",
    "service_tier",
    "prompt_cache_key",
    "plugins"
  ]);

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
    PROTOCOL_COMPARE_EXCLUDED_PARAMETERS,
    ORIGIN_LABELS,
    SUPPORT_CONCLUSIONS,
    EVIDENCE_LEVELS,
    GATEWAY_ACTIONS,
    REQUIRED_BASELINE_FIELDS: ["id", "object", "choices", "usage", "model"]
  };
})();
