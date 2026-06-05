const {
  CHANNEL_TEMPLATES,
  ENDPOINT_TEMPLATES,
  MOCK_PARAMETER_ORIGINS,
  MOCK_RESULTS,
  MOCK_RESPONSES
} = window.LLM_ROSETTA_DATA;
const PROVIDERX_RULES = window.PROVIDERX_RULES || {};

const els = {
  viewLinks: Array.from(document.querySelectorAll("[data-view-link]")),
  views: Array.from(document.querySelectorAll("[data-view]")),
  endpointTabs: document.querySelector("#endpointTabs"),
  channelCards: document.querySelector("#channelCards"),
  apiKey: document.querySelector("#apiKey"),
  baseUrlPreset: document.querySelector("#baseUrlPreset"),
  baseUrl: document.querySelector("#baseUrl"),
  modelName: document.querySelector("#modelName"),
  batchModeToggle: document.querySelector("#batchModeToggle"),
  batchTargetsPanel: document.querySelector("#batchTargetsPanel"),
  batchTargetRows: document.querySelector("#batchTargetRows"),
  batchAddTarget: document.querySelector("#batchAddTarget"),
  batchImportTargets: document.querySelector("#batchImportTargets"),
  batchTargets: document.querySelector("#batchTargets"),
  batchConcurrency: document.querySelector("#batchConcurrency"),
  baselineReport: document.querySelector("#baselineReport"),
  proxyEnabled: document.querySelector("#proxyEnabled"),
  proxyUrl: document.querySelector("#proxyUrl"),
  proxyHint: document.querySelector("#proxyHint"),
  toggleSecret: document.querySelector("#toggleSecret"),
  suiteTitle: document.querySelector("#suiteTitle"),
  parameterGroups: document.querySelector("#parameterGroups"),
  caseSelector: document.querySelector("#caseSelector"),
  caseGroups: document.querySelector("#caseGroups"),
  selectedCaseCount: document.querySelector("#selectedCaseCount"),
  caseSelectorHint: document.querySelector("#caseSelectorHint"),
  customPayloadInput: document.querySelector("#customPayloadInput"),
  customPayloadHint: document.querySelector("#customPayloadHint"),
  addCustomPayload: document.querySelector("#addCustomPayload"),
  clearCustomPayload: document.querySelector("#clearCustomPayload"),
  selectAllCases: document.querySelector("#selectAllCases"),
  clearAllCases: document.querySelector("#clearAllCases"),
  runTests: document.querySelector("#runTests"),
  stopTests: document.querySelector("#stopTests"),
  progressPanel: document.querySelector("#progressPanel"),
  progressCount: document.querySelector("#progressCount"),
  progressCase: document.querySelector("#progressCase"),
  progressBar: document.querySelector("#progressBar"),
  runLog: document.querySelector("#runLog"),
  resultsPanel: document.querySelector("#resultsPanel"),
  statPassed: document.querySelector("#statPassed"),
  statWarnings: document.querySelector("#statWarnings"),
  statFailed: document.querySelector("#statFailed"),
  statDiffs: document.querySelector("#statDiffs"),
  capacitySummary: document.querySelector("#capacitySummary"),
  filterTabs: document.querySelector("#filterTabs"),
  resultRows: document.querySelector("#resultRows"),
  exportJson: document.querySelector("#exportJson"),
  exportMarkdown: document.querySelector("#exportMarkdown"),
  rerunTests: document.querySelector("#rerunTests"),
  historyCount: document.querySelector("#historyCount"),
  historySummary: document.querySelector("#historySummary"),
  historyFilters: document.querySelector("#historyFilters"),
  historyList: document.querySelector("#historyList"),
  importHistoryFile: document.querySelector("#importHistoryFile"),
  clearHistory: document.querySelector("#clearHistory"),
  runPerformanceBenchmark: document.querySelector("#runPerformanceBenchmark"),
  fillPerformanceFromRun: document.querySelector("#fillPerformanceFromRun"),
  performanceBackend: document.querySelector("#performanceBackend"),
  performanceBaseUrl: document.querySelector("#performanceBaseUrl"),
  performanceEndpoint: document.querySelector("#performanceEndpoint"),
  performanceModel: document.querySelector("#performanceModel"),
  performanceApiKey: document.querySelector("#performanceApiKey"),
  performanceDatasetName: document.querySelector("#performanceDatasetName"),
  performanceDatasetPath: document.querySelector("#performanceDatasetPath"),
  performanceNumPrompts: document.querySelector("#performanceNumPrompts"),
  performanceRandomInputLen: document.querySelector("#performanceRandomInputLen"),
  performanceRandomOutputLen: document.querySelector("#performanceRandomOutputLen"),
  performanceRandomRangeRatio: document.querySelector("#performanceRandomRangeRatio"),
  performanceRandomPrefixLen: document.querySelector("#performanceRandomPrefixLen"),
  performanceRequestRate: document.querySelector("#performanceRequestRate"),
  performanceBurstiness: document.querySelector("#performanceBurstiness"),
  performanceMaxConcurrency: document.querySelector("#performanceMaxConcurrency"),
  performanceWarmups: document.querySelector("#performanceWarmups"),
  performancePercentileMetrics: document.querySelector("#performancePercentileMetrics"),
  performanceMetricPercentiles: document.querySelector("#performanceMetricPercentiles"),
  performanceGoodput: document.querySelector("#performanceGoodput"),
  performanceMetadata: document.querySelector("#performanceMetadata"),
  performanceExtraArgs: document.querySelector("#performanceExtraArgs"),
  performanceProgressPanel: document.querySelector("#performanceProgressPanel"),
  performanceStatus: document.querySelector("#performanceStatus"),
  performanceCommandHint: document.querySelector("#performanceCommandHint"),
  performanceProgressBar: document.querySelector("#performanceProgressBar"),
  performanceResultsPanel: document.querySelector("#performanceResultsPanel"),
  performanceStats: document.querySelector("#performanceStats"),
  performanceStdout: document.querySelector("#performanceStdout"),
  performanceJson: document.querySelector("#performanceJson"),
  copyPerformanceJson: document.querySelector("#copyPerformanceJson"),
  feishuDocumentUrl: document.querySelector("#feishuDocumentUrl"),
  feishuDocumentMode: document.querySelector("#feishuDocumentMode"),
  feishuTitlePrefix: document.querySelector("#feishuTitlePrefix"),
  feishuAutoPush: document.querySelector("#feishuAutoPush"),
  saveFeishuSettings: document.querySelector("#saveFeishuSettings"),
  pushFeishuNow: document.querySelector("#pushFeishuNow"),
  copyFeishuReport: document.querySelector("#copyFeishuReport"),
  feishuReportPreview: document.querySelector("#feishuReportPreview"),
  feishuStatus: document.querySelector("#feishuStatus"),
  evalscopeFrame: document.querySelector("#evalscopeFrame"),
  reloadEvalscope: document.querySelector("#reloadEvalscope"),
  openEvalscope: document.querySelector("#openEvalscope"),
  opencompassUrl: document.querySelector("#opencompassUrl"),
  opencompassFrame: document.querySelector("#opencompassFrame"),
  saveOpencompassUrl: document.querySelector("#saveOpencompassUrl"),
  reloadOpencompass: document.querySelector("#reloadOpencompass"),
  openOpencompass: document.querySelector("#openOpencompass"),
  toast: document.querySelector("#toast")
};

const state = {
  activeView: "run",
  selectedChannelId: "siliconflow",
  selectedEndpointId: "chat_completions",
  selectedFilter: "all",
  visibleResults: [],
  completedResults: [],
  batchRunRecords: [],
  batchModeEnabled: false,
  providerCases: {},
  selectedBaselineReportId: "",
  customCases: [],
  selectedCaseIds: new Set(),
  expandedCaseId: null,
  expandedHistoryId: null,
  lastRunProxy: null,
  lastReportRecord: null,
  lastPerformanceResult: null,
  historyFilters: {
    channel: "all",
    model: "all",
    endpoint: "all"
  },
  isCaseLoading: false,
  timer: null,
  currentRunAbortController: null,
  isRunning: false
};

const appProtocol = window.location.protocol === "file:" ? "http:" : window.location.protocol;
const appHost = window.location.hostname || "localhost";
const appQuery = new URLSearchParams(window.location.search);
const API_BASE = appQuery.get("apiBase") || window.PROVIDER_DIFF_API_BASE || `${appProtocol}//${appHost}:8080`;
const BACKEND_UNAVAILABLE_MESSAGE = `后端未连接：无法访问 ${API_BASE}。请先启动 Go 后端（默认 8080），再运行测试。`;
const HISTORY_STORAGE_KEY = "noctua-history-v1";
const FEISHU_CONFIG_STORAGE_KEY = "noctua-feishu-config-v1";
const EVALSCOPE_URL_STORAGE_KEY = "noctua-evalscope-url-v1";
const DEFAULT_EVALSCOPE_URL = appQuery.get("evalscopeUrl") || `${appProtocol}//${appHost}:9000/dashboard`;
const OPENCOMPASS_URL_STORAGE_KEY = "noctua-opencompass-url-v1";
const LEGACY_HISTORY_STORAGE_KEYS = ["llm-rosetta-history-v1", "providerx-history-v1"];
const LEGACY_FEISHU_CONFIG_STORAGE_KEYS = ["llm-rosetta-feishu-config-v1", "providerx-feishu-config-v1"];
const LEGACY_EVALSCOPE_URL_STORAGE_KEYS = ["llm-rosetta-evalscope-url-v1", "providerx-evalscope-url-v1"];
const LEGACY_OPENCOMPASS_URL_STORAGE_KEYS = ["llm-rosetta-opencompass-url-v1", "providerx-opencompass-url-v1"];

function readStorageItem(key, legacyKeys = []) {
  let value = localStorage.getItem(key);
  if (value !== null && value !== "") return value;
  for (const legacyKey of legacyKeys) {
    if (!legacyKey) continue;
    const legacyValue = localStorage.getItem(legacyKey);
    if (legacyValue !== null && legacyValue !== "") {
      localStorage.setItem(key, legacyValue);
      return legacyValue;
    }
  }
  return value;
}
const DEFAULT_OPENCOMPASS_URL = appQuery.get("opencompassUrl") || `${appProtocol}//${appHost}:9100/`;
const MAX_HISTORY_ITEMS = 120;
const HISTORY_RAW_RESPONSE_LIMIT = 30000;
const MIN_BATCH_TARGETS = 2;
const MAX_BATCH_TARGETS = 3;
const HISTORY_STRING_LIMIT = 12000;
const runnableProviderByChannel = {
  claude: "claude",
  deepseek: "deepseek",
  minimax: "minimax",
  openrouter: "openrouter",
  thinking: "thinking",
  siliconflow: "siliconflow",
  silinex_overseas: "siliconflow",
  silinex_china: "siliconflow",
  aliyun: "ali"
};

const statusMarks = {
  accepted: "✓",
  rejected: "✗",
  warning: "⚠",
  na: "?"
};

const supportConclusionMeta = PROVIDERX_RULES.SUPPORT_CONCLUSIONS || {
  supported: {
    label: "支持参数",
    shortLabel: "支持",
    badgeClass: "supported",
    status: "accepted",
    httpStatus: 200,
    note: "供应商接受该参数，响应结构基本可按 OpenAI-compatible 协议处理。"
  },
  ignored: {
    label: "不支持参数但不报错",
    shortLabel: "未证明",
    badgeClass: "ignored",
    status: "warning",
    httpStatus: 200,
    note: "请求不会 400，但参数可能被忽略或只产生供应商特有行为，需要在网关侧标记风险。"
  },
  rejected_400: {
    label: "不支持参数且 400",
    shortLabel: "400 报错",
    badgeClass: "rejected-400",
    status: "rejected",
    httpStatus: 400,
    note: "供应商明确拒绝该参数，网关侧需要过滤、降级或转换后再转发。"
  },
  request_failed: {
    label: "请求失败",
    shortLabel: "失败",
    badgeClass: "request-failed",
    status: "rejected",
    httpStatus: 0,
    note: "真实请求未完成，通常是 API Key、代理、网络或供应商临时错误；该结果不等同于参数不支持。"
  },
  permission_limited: {
    label: "账号权限受限",
    shortLabel: "权限受限",
    badgeClass: "permission-limited",
    status: "warning",
    httpStatus: 403,
    note: "case 本身需要特定模型、能力或账号权限；当前 API Key 无法访问，不能据此判断参数不支持。"
  },
  schema_mismatch: {
    label: "响应断言失败",
    shortLabel: "断言失败",
    badgeClass: "request-failed",
    status: "rejected",
    httpStatus: 200,
    note: "供应商返回了 2xx，但响应结构或参数语义断言未通过。"
  },
  unknown: {
    label: "未覆盖",
    shortLabel: "未覆盖",
    badgeClass: "unknown",
    status: "na",
    httpStatus: 0,
    note: "当前用例没有覆盖到明确结论。"
  }
};

const evidenceLevelMeta = PROVIDERX_RULES.EVIDENCE_LEVELS || {
  asserted: { label: "断言通过", badgeClass: "asserted", copy: "有响应和断言证据。" },
  observed: { label: "已观测", badgeClass: "observed", copy: "有响应证据，但断言较弱。" },
  inferred: { label: "推断", badgeClass: "inferred", copy: "基于预期或预览数据推断。" },
  none: { label: "无证据", badgeClass: "none", copy: "没有可用于判断的有效响应。" }
};
const gatewayActionMeta = PROVIDERX_RULES.GATEWAY_ACTIONS || {
  pass_through: { label: "放行", copy: "可作为低风险参数继续透传。" },
  strip_or_warn: { label: "提示/过滤", copy: "建议提示风险；必要时在网关侧过滤。" },
  strip_or_transform: { label: "过滤/转换", copy: "建议在网关侧过滤该参数，或转换为该 provider 支持的形态。" },
  adapter_required: { label: "适配", copy: "需要 provider-specific adapter 处理响应或参数语义。" },
  retry_or_review: { label: "重试/复核", copy: "先排查 Key、URL、模型、代理或权限，再做支持性判断。" },
  manual_review: { label: "人工确认", copy: "结论不足，需要补充 baseline 或定向 case。" }
};
const requiredOpenAiFields = new Set(PROVIDERX_RULES.REQUIRED_BASELINE_FIELDS || ["id", "object", "choices", "usage", "model"]);
const foundationalCaseParameters = new Set(["model", "messages"]);
const PINNED_BASELINE_IDS = {
  "deepseek:chat_completions": "report_original_deepseek_chat_completions_1780044160489",
  "deepseek:anthropic_messages": "report_original_deepseek_anthropic_messages_1780044176834",
  "minimax:chat_completions": "report_original_minimax_chat_completions_1780044268130",
  "minimax:anthropic_messages": "report_original_minimax_anthropic_messages_1780044307399",
  "siliconflow:chat_completions": "report_original_siliconflow_chat_completions_1780044822993",
  "siliconflow:anthropic_messages": "report_original_siliconflow_anthropic_messages_1780044894258",
  "ali:chat_completions": "report_original_ali_chat_completions_1780045286575",
  "ali:anthropic_messages": "report_original_ali_anthropic_messages_1780045326769"
};

const CAPACITY_CANDIDATES = [4194304, 2097152, 1048576, 524288, 262144, 131072, 65536, 32768, 16384, 8192, 4096, 2048, 1024];
const CONTEXT_CAPACITY_SAFETY_MARGIN_RATIO = 0.05;

function formatCapacityTier(value) {
  const oneM = 1024 * 1024;
  if (value >= oneM && value % oneM === 0) return `${value / oneM}m`;
  if (value >= 1024 && value % 1024 === 0) return `${value / 1024}k`;
  if (value >= oneM) return `${trimNumber(value / oneM, 1)}m`;
  if (value >= 1024) return `${trimNumber(value / 1024, 1)}k`;
  return String(value);
}

function trimNumber(value, digits = 1) {
  return Number(value.toFixed(digits)).toString();
}

const caseTitleZh = {
  sf_basic_minimal: "最小 chat completion 请求",
  sf_basic_system_user: "system 和 user 消息",
  sf_basic_multimessage_context: "多条历史消息作为上下文",
  sf_sampling_temperature_low: "temperature 低值采样",
  sf_sampling_top_p: "top_p 采样",
  sf_sampling_top_k: "top_k 扩展采样",
  sf_sampling_min_p: "min_p 扩展采样",
  sf_sampling_frequency_penalty: "frequency_penalty 频率惩罚",
  sf_sampling_n_one: "n=1 单结果生成",
  sf_sampling_stop_string: "stop 字符串停止词",
  sf_sampling_stop_array: "stop 数组停止词",
  sf_sampling_stop_null: "stop=null / None",
  sf_sampling_combo_temperature_top_p: "temperature 与 top_p 组合",
  sf_sampling_combo_top_p_top_k_min_p: "top_p、top_k、min_p 组合",
  sf_sampling_combo_penalty_stop: "frequency_penalty 与 stop 组合",
  sf_length_max_tokens: "max_tokens 限制生成长度",
  sf_length_max_tokens_stop: "max_tokens 与 stop 组合",
  sf_reasoning_enable_thinking: "enable_thinking 推理开关",
  sf_reasoning_thinking_budget: "enable_thinking 与 thinking_budget",
  sf_reasoning_effort_medium: "reasoning_effort=medium",
  sf_reasoning_combo_budget_effort: "推理控制参数组合",
  sf_reasoning_disable_thinking_no_output: "关闭 enable_thinking 不输出推理",
  sf_response_format_text: "response_format=text",
  sf_response_format_json_object: "response_format=json_object",
  sf_response_format_json_schema: "response_format=json_schema",
  sf_tools_auto: "tools 与 tool_choice=auto",
  sf_tools_named_function_hint: "通过提示引导 function call",
  sf_tools_multiturn_tool_result: "带 tool 结果的多轮对话",
  sf_stream_basic: "stream 基础流式返回",
  sf_stream_with_max_tokens: "stream 与 max_tokens 组合",
  sf_stream_with_tools_auto: "stream 与 tools 组合",
  sf_stream_include_usage: "流式返回 usage chunk",
  sf_multiturn_basic: "基础多轮对话",
  sf_multiturn_with_system_policy: "带 system 约束的多轮对话",
  sf_multiturn_json_object: "多轮对话与 json_object",
  sf_multiturn_reasoning: "多轮推理上下文",
  sf_multiturn_tools: "多轮 tools 工作流",
  sf_prefix_completion: "前缀续写",
  sf_observability_trace_header: "x-siliconcloud-trace-id 响应头",
  sf_observability_usage_fields: "非流式 usage 字段完整性",
  sf_multimodal_image_url: "VLM image_url 图像输入",
  sf_multimodal_multi_image_compare: "VLM 多图对比输入",
  am_basic_minimal: "Messages 最小用户请求",
  am_basic_system: "Messages 顶层 system 提示词",
  am_sampling_temperature: "Messages 接口接受 temperature",
  am_sampling_top_p: "Messages 接口接受 top_p",
  am_sampling_top_k: "Messages 接口接受 top_k 扩展参数",
  am_length_max_tokens: "max_tokens 应限制 Messages 输出长度",
  am_sampling_stop_sequences: "stop_sequences 停止词",
  am_tools_auto: "Messages 接口接受 tools",
  am_protocol_stream: "stream=true 应返回 Messages SSE 流",
  am_reasoning_thinking_budget: "推理模型 Messages 接口接受 thinking budget",
  am_reasoning_thinking_disabled: "Messages 接口关闭 thinking"
};

function providerIdForChannel(channelId = state.selectedChannelId) {
  const channel = CHANNEL_TEMPLATES.find((item) => item.channel_id === channelId);
  const endpoint = channel?.endpoints?.[state.selectedEndpointId];
  if (endpoint && endpoint.supported === false) return null;
  return endpoint?.provider_id || channel?.provider_id || runnableProviderByChannel[channelId] || null;
}

function currentProviderId() {
  return providerIdForChannel();
}

function channelForProvider(provider, endpointId = state.selectedEndpointId) {
  const normalizedProvider = String(provider || "").trim();
  if (!normalizedProvider) return null;
  return CHANNEL_TEMPLATES.find((channel) => {
    const endpoint = channel.endpoints?.[endpointId];
    return endpoint?.provider_id === normalizedProvider || channel.provider_id === normalizedProvider || runnableProviderByChannel[channel.channel_id] === normalizedProvider;
  }) || null;
}

function endpointTemplateById(endpointId) {
  return ENDPOINT_TEMPLATES.find((endpoint) => endpoint.endpoint_id === endpointId) || ENDPOINT_TEMPLATES[0];
}

const groupLabelZh = {
  Core: "核心",
  Content: "内容",
  Sampling: "采样",
  Length: "长度",
  Reasoning: "推理",
  Output: "输出",
  Tools: "tools",
  Protocol: "协议",
  Debug: "调试",
  Multimodal: "多模态",
  Metadata: "元数据",
  Extra: "扩展",
  Search: "搜索",
  Routing: "路由",
  Plugins: "插件",
  Observability: "可观测性",
  "Compatibility Probe": "兼容性探针",
  "Expected Rejected": "预期拒绝"
};

const originLabelZh = PROVIDERX_RULES.ORIGIN_LABELS || {
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
  "anthropic-messages": "Anthropic Messages"
};

function getProxyConfig() {
  const enabled = Boolean(els.proxyEnabled?.checked);
  const url = (els.proxyUrl?.value || "").trim();
  return {
    enabled,
    url: enabled ? url : "",
    mode: enabled && url ? "proxy" : "direct"
  };
}

function proxySummary(proxy = getProxyConfig()) {
  if (!proxy.enabled) return "未启用代理，后端请求直连供应商。";
  if (!proxy.url) return "已启用代理，但 Proxy URL 为空。";
  return `已启用代理：${proxy.url}`;
}

function baselineLabel(record) {
  if (!record) return "No baseline";
  return `${record.channel_name || record.channel_id || "historical baseline"} / ${record.endpoint_label || record.endpoint_id || "Endpoint"}`;
}

function providerMatches(record, providerId, channelId) {
  if (!record || (!providerId && !channelId)) return false;
  const recordProvider = record.provider || runnableProviderByChannel[record.channel_id] || record.channel_id;
  return recordProvider === providerId || record.channel_id === channelId;
}

function baselineOptions(providerId = currentProviderId(), endpointId = state.selectedEndpointId) {
  const channelId = state.selectedChannelId;
  return readHistory()
    .filter((record) => record.endpoint_id === endpointId && historyRecordHasBaselinePayload(record))
    .filter((record) => providerMatches(record, providerId, channelId))
    .sort((left, right) => new Date(right.generated_at || 0) - new Date(left.generated_at || 0));
}

function pinnedBaselineId(providerId = currentProviderId(), endpointId = state.selectedEndpointId) {
  if (!providerId) return "";
  return PINNED_BASELINE_IDS[`${providerId}:${endpointId}`] || "";
}

function pinnedBaselineRecord(options = baselineOptions(), providerId = currentProviderId(), endpointId = state.selectedEndpointId) {
  const id = pinnedBaselineId(providerId, endpointId);
  if (!id) return null;
  return options.find((record) => record.id === id) || null;
}

function automaticBaselineRecord() {
  const options = baselineOptions();
  return pinnedBaselineRecord(options) || null;
}

function selectedBaselineRecord() {
  if (!state.selectedBaselineReportId) return automaticBaselineRecord();
  return baselineOptions().find((record) => record.id === state.selectedBaselineReportId) || automaticBaselineRecord();
}

function renderBaselineSelector() {
  if (!els.baselineReport) return;
  const options = baselineOptions();
  const selectedStillExists = options.some((record) => record.id === state.selectedBaselineReportId);
  if (!selectedStillExists) state.selectedBaselineReportId = "";
  const currentEndpointRecords = readHistory()
    .filter((record) => record.endpoint_id === state.selectedEndpointId)
    .filter((record) => providerMatches(record, currentProviderId(), state.selectedChannelId));
  const reportsWithoutPayload = currentEndpointRecords.filter((record) => !historyRecordHasBaselinePayload(record)).length;
  const pinned = pinnedBaselineRecord(options);
  const pinnedId = pinnedBaselineId();
  const defaultLabel = pinned
    ? "Default baseline"
    : reportsWithoutPayload
      ? `No usable baseline · ${reportsWithoutPayload} reports`
      : options.length
        ? "Choose baseline"
        : "No baseline";
  els.baselineReport.innerHTML = [
    `<option value="">${escapeHtml(defaultLabel)}</option>`,
    ...options.map((record) => `
      <option value="${escapeHtml(record.id)}" ${record.id === state.selectedBaselineReportId ? "selected" : ""}>
        ${record.id === pinnedId ? "Default" : "History"} · ${escapeHtml(record.model || "—")} · ${escapeHtml(formatDateTime(record.generated_at))}
      </option>
    `)
  ].join("");
  els.baselineReport.disabled = options.length === 0 || state.isRunning;
}

function renderProxyState() {
  const proxy = getProxyConfig();
  els.proxyUrl.disabled = !proxy.enabled;
  els.proxyHint.textContent = proxySummary(proxy);
}

function renderEndpointTabs() {
  els.endpointTabs.innerHTML = ENDPOINT_TEMPLATES.map((endpoint) => `
    <button class="endpoint-tab ${endpoint.endpoint_id === state.selectedEndpointId ? "is-active" : ""}" type="button" data-endpoint-id="${escapeHtml(endpoint.endpoint_id)}">
      <span>${escapeHtml(endpoint.label)}</span>
      <small>${escapeHtml(endpoint.description)}</small>
    </button>
  `).join("");
}

function getSelectedChannel() {
  return CHANNEL_TEMPLATES.find((channel) => channel.channel_id === state.selectedChannelId) || CHANNEL_TEMPLATES[0];
}

function getSelectedEndpointTemplate() {
  return ENDPOINT_TEMPLATES.find((endpoint) => endpoint.endpoint_id === state.selectedEndpointId) || ENDPOINT_TEMPLATES[0];
}

function getChannelEndpoint(channel = getSelectedChannel()) {
  return channel.endpoints?.[state.selectedEndpointId] || null;
}

function normalizeBaseUrlOption(option) {
  if (typeof option === "string") {
    return { label: option, value: option };
  }
  return {
    label: String(option?.label || option?.value || "").trim(),
    value: String(option?.value || option?.url || "").trim()
  };
}

function baseUrlOptionsForChannel(channel = getSelectedChannel()) {
  const endpoint = getChannelEndpoint(channel);
  const defaultValue = endpoint?.default_base_url || channel.default_base_url || "";
  const rawOptions = endpoint?.base_url_options || channel.base_url_options || [];
  const options = rawOptions.map(normalizeBaseUrlOption).filter((option) => option.value);
  if (defaultValue && !options.some((option) => option.value === defaultValue)) {
    options.unshift({ label: "默认", value: defaultValue });
  }
  return options;
}

function renderBaseUrlPreset(selectedValue = els.baseUrl?.value || "") {
  if (!els.baseUrlPreset) return;
  const options = baseUrlOptionsForChannel();
  const current = String(selectedValue || "").trim();
  const matched = options.find((option) => option.value === current);
  els.baseUrlPreset.disabled = state.isRunning || options.length === 0;
  els.baseUrlPreset.innerHTML = [
    `<option value="">自定义</option>`,
    ...options.map((option) => `<option value="${escapeHtml(option.value)}" ${matched?.value === option.value ? "selected" : ""}>${escapeHtml(option.label)}</option>`)
  ].join("");
  if (!matched) els.baseUrlPreset.value = "";
}

function setBaseUrlValue(value) {
  els.baseUrl.value = value || "";
  renderBaseUrlPreset(els.baseUrl.value);
}

function batchModeActive() {
  return Boolean(state.batchModeEnabled && (hasBatchTargetRows() || els.batchTargets?.value.trim()));
}

function renderBatchMode() {
  if (!els.batchModeToggle || !els.batchTargetsPanel) return;
  els.batchModeToggle.textContent = state.batchModeEnabled ? "关闭" : "开启";
  els.batchModeToggle.setAttribute("aria-pressed", state.batchModeEnabled ? "true" : "false");
  els.batchModeToggle.classList.toggle("is-active", state.batchModeEnabled);
  els.batchTargetsPanel.classList.toggle("is-hidden", !state.batchModeEnabled);
  if (state.batchModeEnabled) ensureBatchTargetRows();
  updateBatchTargetPlaceholders();
  renderBatchTargetControlState();
}

function renderBatchTargetControlState() {
  const disabled = state.isRunning || !state.batchModeEnabled;
  if (els.batchTargets) {
    els.batchTargets.disabled = disabled;
  }
  if (els.batchTargetRows) {
    els.batchTargetRows.querySelectorAll("input, button").forEach((control) => {
      control.disabled = disabled;
    });
  }
  if (els.batchAddTarget) {
    els.batchAddTarget.disabled = disabled || batchTargetDrafts().length >= MAX_BATCH_TARGETS;
  }
  if (els.batchImportTargets) {
    els.batchImportTargets.disabled = disabled;
  }
}

function hasBatchTargetRows() {
  return batchTargetDrafts().some((target) => target.base_url || target.api_key || target.model);
}

function defaultBatchTargetDrafts() {
  return [
    { base_url: "", api_key: "", model: els.modelName?.value.trim() || "" },
    { base_url: "", api_key: "", model: "" }
  ];
}

function ensureBatchTargetRows() {
  if (!els.batchTargetRows || els.batchTargetRows.children.length) return;
  setBatchTargetRows(defaultBatchTargetDrafts());
}

function renderBatchTargetRow(target = {}, index = 0) {
  const placeholders = batchTargetPlaceholders();
  return `
    <div class="batch-target-row" data-batch-target-row>
      <span class="batch-target-row__index">T${index + 1}</span>
      <label class="field batch-target-field batch-target-field--url">
        <span>Base URL <em>可留空</em></span>
        <input class="mono" data-batch-field="base_url" value="${escapeHtml(target.base_url || "")}" placeholder="${escapeHtml(placeholders.base_url)}" />
      </label>
      <label class="field batch-target-field batch-target-field--key">
        <span>API Key <em>可留空</em></span>
        <input class="mono" type="password" data-batch-field="api_key" value="${escapeHtml(target.api_key || "")}" placeholder="${escapeHtml(placeholders.api_key)}" autocomplete="off" />
      </label>
      <label class="field batch-target-field batch-target-field--model">
        <span>Model</span>
        <input class="mono" data-batch-field="model" value="${escapeHtml(target.model || "")}" placeholder="${escapeHtml(placeholders.model)}" />
      </label>
      <button class="icon-button batch-target-remove" type="button" data-remove-batch-target title="移除 target" aria-label="移除 target">×</button>
    </div>
  `;
}

function batchTargetPlaceholders() {
  return {
    base_url: els.baseUrl?.value.trim() || "https://api.siliconflow.cn/v1",
    api_key: els.apiKey?.value.trim() ? "使用上方 API Key" : "sk-...",
    model: els.modelName?.value.trim() || "deepseek-ai/DeepSeek-V4-Pro"
  };
}

function updateBatchTargetPlaceholders() {
  const placeholders = batchTargetPlaceholders();
  els.batchTargetRows?.querySelectorAll('[data-batch-field="base_url"]').forEach((input) => {
    input.placeholder = placeholders.base_url;
  });
  els.batchTargetRows?.querySelectorAll('[data-batch-field="api_key"]').forEach((input) => {
    input.placeholder = placeholders.api_key;
  });
  els.batchTargetRows?.querySelectorAll('[data-batch-field="model"]').forEach((input) => {
    input.placeholder = placeholders.model;
  });
}

function setBatchTargetRows(targets = []) {
  if (!els.batchTargetRows) return;
  const limitedTargets = targets.slice(0, MAX_BATCH_TARGETS);
  els.batchTargetRows.innerHTML = limitedTargets.map(renderBatchTargetRow).join("");
  renderBatchTargetControlState();
}

function batchTargetDrafts() {
  if (!els.batchTargetRows) return [];
  return Array.from(els.batchTargetRows.querySelectorAll("[data-batch-target-row]")).map((row) => ({
    base_url: row.querySelector('[data-batch-field="base_url"]')?.value.trim() || "",
    api_key: row.querySelector('[data-batch-field="api_key"]')?.value.trim() || "",
    model: row.querySelector('[data-batch-field="model"]')?.value.trim() || ""
  }));
}

function addBatchTargetRow(target = {}) {
  const drafts = batchTargetDrafts();
  if (drafts.length >= MAX_BATCH_TARGETS) return;
  setBatchTargetRows([...drafts, target]);
}

function removeBatchTargetRow(row) {
  const rows = Array.from(els.batchTargetRows?.querySelectorAll("[data-batch-target-row]") || []);
  const index = rows.indexOf(row);
  if (index < 0) return;
  const drafts = batchTargetDrafts();
  drafts.splice(index, 1);
  setBatchTargetRows(drafts.length ? drafts : defaultBatchTargetDrafts());
}

function batchTargetsFromRows() {
  const defaultBaseUrl = els.baseUrl?.value.trim() || "";
  return batchTargetDrafts()
    .filter((target) => target.model)
    .map((target, index) => normalizeBatchTarget({
      provider: currentProviderId(),
      base_url: target.base_url || defaultBaseUrl,
      api_key: target.api_key,
      model: target.model
    }, index));
}

function enforceBatchTargetCount(targets) {
  if (targets.length < MIN_BATCH_TARGETS) {
    throw new Error(`Batch 至少填写 ${MIN_BATCH_TARGETS} 个 target；只跑一个请关闭 Batch。`);
  }
  if (targets.length > MAX_BATCH_TARGETS) {
    throw new Error(`Batch 最多填写 ${MAX_BATCH_TARGETS} 个 target。`);
  }
  return targets;
}

function parseBatchTargetsFromText(raw) {
  const text = String(raw || "").trim();
  if (!text) return [];
  if (text.startsWith("[") || text.startsWith("{")) {
    const parsed = JSON.parse(text);
    const items = Array.isArray(parsed) ? parsed : parsed.targets;
    if (!Array.isArray(items)) {
      throw new Error("批量 JSON 需要是数组，或包含 targets 数组。");
    }
    return items.map((item, index) => normalizeBatchTarget(item, index));
  }
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line, index) => {
      const parts = line.includes("|")
        ? line.split("|")
        : line.split(/\t|,/);
      const compact = parts.map((part) => part.trim()).filter(Boolean);
      return parseDelimitedBatchTarget(compact, index);
    });
}

function importBatchTargetsFromText() {
  try {
    const targets = enforceBatchTargetCount(parseBatchTargetsFromText(els.batchTargets?.value || ""));
    setBatchTargetRows(targets);
    showToast(`已导入 ${targets.length} 个 target。`);
  } catch (error) {
    showToast(error.message);
  }
}

function parseBatchTargets() {
  if (!state.batchModeEnabled) return [];
  const rowTargets = batchTargetsFromRows();
  if (rowTargets.length >= MIN_BATCH_TARGETS) return enforceBatchTargetCount(rowTargets);
  const textTargets = parseBatchTargetsFromText(els.batchTargets?.value || "");
  if (textTargets.length) return enforceBatchTargetCount(textTargets);
  if (rowTargets.length) return enforceBatchTargetCount(rowTargets);
  throw new Error("已启用 Batch，请填写 2-3 个 target，或关闭 Batch。");
}

function looksLikeApiKey(value) {
  const text = String(value || "").trim();
  return /^(?:Bearer\s+)?sk-[A-Za-z0-9_-]{8,}$/i.test(text)
    || /^[A-Za-z0-9_-]{32,}$/.test(text);
}

function looksLikeBaseUrl(value) {
  return /^https?:\/\//i.test(String(value || "").trim());
}

function resolveModelAndApiKey(first, second) {
  const firstValue = String(first || "").trim();
  const secondValue = String(second || "").trim();
  const firstIsKey = looksLikeApiKey(firstValue);
  const secondIsKey = looksLikeApiKey(secondValue);
  if (firstIsKey && !secondIsKey) {
    return { api_key: firstValue, model: secondValue };
  }
  if (!firstIsKey && secondIsKey) {
    return { model: firstValue, api_key: secondValue };
  }
  if (!firstIsKey && !secondIsKey && secondValue.includes("/") && !firstValue.includes("/")) {
    return { api_key: firstValue, model: secondValue };
  }
  return { api_key: firstValue, model: secondValue };
}

function parseDelimitedBatchTarget(parts, index) {
  if (parts.length === 3) {
    return normalizeBatchTarget({
      provider: currentProviderId(),
      base_url: parts[0],
      ...resolveModelAndApiKey(parts[1], parts[2])
    }, index);
  }
  if (parts.length >= 4) {
    const firstIsUrl = looksLikeBaseUrl(parts[0]);
    const provider = firstIsUrl ? currentProviderId() : parts[0];
    const baseUrl = firstIsUrl ? parts[0] : parts[1];
    const modelKeyStart = firstIsUrl ? 1 : 2;
    return normalizeBatchTarget({
      provider,
      base_url: baseUrl,
      ...resolveModelAndApiKey(parts[modelKeyStart], parts[modelKeyStart + 1])
    }, index);
  }
  throw new Error(`批量 target 第 ${index + 1} 行格式不对，请使用 base_url | api_key | model。`);
}

function normalizeBatchTarget(item = {}, index = 0) {
  const provider = String(item.provider || item.provider_id || currentProviderId() || "").trim();
  const baseUrl = String(item.base_url || item.baseUrl || els.baseUrl?.value.trim() || "").trim();
  const model = String(item.model || "").trim();
  const apiKey = String(item.api_key || item.apiKey || "").trim();
  if (!provider) {
    throw new Error(`批量 target 第 ${index + 1} 行缺少 provider。`);
  }
  if (!baseUrl) {
    throw new Error(`批量 target 第 ${index + 1} 行缺少 base_url。`);
  }
  if (!model) {
    throw new Error(`批量 target 第 ${index + 1} 行缺少 model。`);
  }
  return {
    provider,
    endpoint_id: String(item.endpoint_id || item.endpointId || state.selectedEndpointId).trim(),
    base_url: baseUrl,
    model,
    api_key: apiKey
  };
}

function batchConcurrency() {
  const value = Number.parseInt(els.batchConcurrency?.value || "3", 10);
  if (!Number.isFinite(value)) return 3;
  return Math.max(1, Math.min(8, value));
}

function currentRunTargets(providerId, apiKey) {
  const batchTargets = parseBatchTargets();
  if (batchTargets.length) {
    const differentProvider = batchTargets.find((target) => target.provider && target.provider !== providerId);
    if (differentProvider) {
      throw new Error(`批量 Targets 当前按同 provider 并跑；请保持 provider=${providerId}，或省略 provider 字段。`);
    }
    return batchTargets.map((target) => ({
      ...target,
      provider: providerId,
      api_key: target.api_key || apiKey,
      endpoint_id: target.endpoint_id || state.selectedEndpointId
    }));
  }
  return [{
    provider: providerId,
    endpoint_id: state.selectedEndpointId,
    base_url: els.baseUrl.value.trim(),
    model: els.modelName.value.trim(),
    api_key: apiKey
  }];
}

function currentCaseCacheKey(providerId = currentProviderId()) {
  return providerId ? `${state.selectedEndpointId}:${providerId}` : "";
}

function endpointQuery() {
  return `endpoint_id=${encodeURIComponent(state.selectedEndpointId)}`;
}

function flattenParameters(channel) {
  const parametersByGroup = getChannelEndpoint(channel)?.parameters || channel.parameters || {};
  return Object.entries(parametersByGroup).flatMap(([category, parameters]) =>
    parameters.map((parameter) => ({ category, parameter }))
  );
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isFetchNetworkError(error) {
  const message = String(error?.message || "");
  return error?.name === "TypeError"
    && /failed to fetch|load failed|networkerror|network request failed/i.test(message);
}

function backendUnavailableError(cause) {
  const error = new Error(BACKEND_UNAVAILABLE_MESSAGE);
  error.isBackendUnavailable = true;
  error.cause = cause;
  return error;
}

async function ensureBackendReady(signal) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  const abortFromRun = () => controller.abort();
  if (signal?.aborted) {
    clearTimeout(timeout);
    const error = new Error("Run canceled");
    error.name = "AbortError";
    throw error;
  }
  signal?.addEventListener("abort", abortFromRun, { once: true });
  try {
    const response = await fetch(`${API_BASE}/healthz`, {
      cache: "no-store",
      signal: controller.signal
    });
    if (!response.ok) {
      throw new Error(`healthz HTTP ${response.status}`);
    }
  } catch (error) {
    if (signal?.aborted) throw error;
    throw backendUnavailableError(error);
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abortFromRun);
  }
}

function typeOf(value) {
  if (Array.isArray(value)) return "array";
  if (value === null) return "null";
  return typeof value;
}

function structuralShape(value, path = "", rows = new Map()) {
  const valueType = typeOf(value);
  if (path) rows.set(path, valueType);

  if (valueType === "object") {
    for (const [key, child] of Object.entries(value)) {
      structuralShape(child, path ? `${path}.${key}` : key, rows);
    }
  }

  if (valueType === "array" && value.length > 0) {
    structuralShape(value[0], `${path}[]`, rows);
  }

  return rows;
}

function compareStructure(baseline, channel) {
  const baseShape = structuralShape(baseline);
  const channelShape = structuralShape(channel);
  const diffs = [];

  for (const [path, expectedType] of baseShape.entries()) {
    if (!channelShape.has(path)) {
      diffs.push({
        kind: "missing",
        prefix: "-",
        path,
        type: expectedType,
        note: path.split(".")[0] === path ? "当前渠道缺失" : "缺失"
      });
      continue;
    }

    const actualType = channelShape.get(path);
    if (actualType !== expectedType) {
      diffs.push({
        kind: "type",
        prefix: "~",
        path,
        type: expectedType,
        note: `类型不一致：预期 ${expectedType}，实际 ${actualType}`
      });
    }
  }

  for (const [path, actualType] of channelShape.entries()) {
    if (!baseShape.has(path)) {
      diffs.push({
        kind: "extra",
        prefix: "+",
        path,
        type: actualType,
        note: "额外字段，baseline 中不存在"
      });
    }
  }

  return diffs;
}

function hasResponseBody(result) {
  return Object.prototype.hasOwnProperty.call(result || {}, "response_body") && result.response_body !== undefined && result.response_body !== null;
}

function matchingBaselineResult(result, baseline = selectedBaselineRecord()) {
  return baseline?.results?.find((item) => item.case_id === result.case_id && hasResponseBody(item)) || null;
}

function baselineResponseForResult(result, baseline = selectedBaselineRecord()) {
  const baselineResult = matchingBaselineResult(result, baseline);
  if (baselineResult) return baselineResult.response_body;
  return null;
}

function canonicalResultFromRaw(result = {}, fallback = {}) {
  const assertions = result.assertions || [];
  const failedAssertions = result.failed_assertions || result.failed || [];
  return {
    case_id: result.case_id || fallback.case_id || "",
    title: result.title || (result.source_case ? caseTitle(result.source_case) : "") || fallback.title || "",
    category: result.category || "case",
    parameters: result.parameters || [],
    parameter: result.parameter || (Array.isArray(result.parameters) && result.parameters.length ? result.parameters.join(" + ") : "payload"),
    support_conclusion: result.support_conclusion || result.conclusion || "unknown",
    status: result.status_label || result.status_text || "",
    http_status: result.http_status || result.status || 0,
    latency_ms: result.latency_ms || result.elapsed_ms || 0,
    diff_count: Number(result.diff_count || 0),
    message: result.message || result.error || "",
    request_headers: result.request_headers || null,
    request_body: result.request_body || null,
    response_body: hasResponseBody(result) ? result.response_body : null,
    raw_response: result.raw_response || "",
    response_headers: result.response_headers || null,
    assertions,
    failed_assertions: failedAssertions,
    source_case: result.source_case || fallback.source_case || null,
    expected_http_status: result.expected_http_status || 0,
    expected_support_conclusion: result.expected_support_conclusion || "",
    capability_status: result.capability_status || result.support_conclusion || result.conclusion || "unknown",
    expectation_result: result.expectation_result || "",
    evidence_level: result.evidence_level || "",
    gateway_action: result.gateway_action || "",
    error: result.error || ""
  };
}

function normalizeHistoryRecord(input, { sourceName = "导入报告" } = {}) {
  if (!input || typeof input !== "object") {
    throw new Error(`${sourceName} 不是 JSON object。`);
  }

  if (Array.isArray(input)) {
    return normalizeHistoryRecord({ results: input }, { sourceName });
  }

  const firstSuite = !Array.isArray(input.results) && Array.isArray(input.suites) ? input.suites[0] : null;
  const source = firstSuite || input;
  const results = Array.isArray(source.results) ? source.results : [];
  if (!results.length) {
    throw new Error(`${sourceName} 没有 results。`);
  }

  const endpointId = input.endpoint_id || source.endpoint_id || state.selectedEndpointId || "chat_completions";
  const endpoint = endpointTemplateById(endpointId);
  const provider = input.provider || source.provider || input.channel_id || source.channel_id || "";
  const channel = CHANNEL_TEMPLATES.find((item) => item.channel_id === (input.channel_id || source.channel_id))
    || channelForProvider(provider, endpointId)
    || getSelectedChannel();
  const channelEndpoint = channel.endpoints?.[endpointId];
  const normalizedResults = results.map((result) => canonicalResultFromRaw(result));
  const generatedAt = input.generated_at || input.finished_at || source.finished_at || input.started_at || source.started_at || new Date().toISOString();
  const idSuffix = `${channel.channel_id}_${endpointId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  return {
    id: input.id || `report_import_${idSuffix}`,
    generated_at: generatedAt,
    imported_at: new Date().toISOString(),
    endpoint_id: endpointId,
    endpoint_label: input.endpoint_label || endpoint.label,
    channel_id: channel.channel_id,
    channel_name: input.channel_name || channel.name || provider || "导入渠道",
    provider: provider || channelEndpoint?.provider_id || channel.provider_id || channel.channel_id,
    base_url: input.base_url || source.base_url || channelEndpoint?.default_base_url || channel.default_base_url || "",
    model: input.model || source.model || channelEndpoint?.default_model || channel.default_model || "",
    baseline_report_id: input.baseline_report_id || input.baseline?.report_id || "",
    baseline_label: input.baseline_label || input.baseline?.label || "",
    proxy: input.proxy || source.proxy || { enabled: false, url: "", mode: "direct" },
    stats: historyStats(normalizedResults),
    results: normalizedResults
  };
}

function historyRecordHasBaselinePayload(record) {
  return (record.results || []).some((result) => hasResponseBody(result));
}

function severityForDiffs(diffs, baselineLabel = "OpenAI") {
  const isOpenAiBaseline = /openai/i.test(baselineLabel);
  const hasMissingRequired = diffs.some((diff) => diff.kind === "missing" && requiredOpenAiFields.has(diff.path.split(".")[0]));
  if (hasMissingRequired) {
    return {
      level: "critical",
      label: "CRITICAL",
      title: "严重程度：CRITICAL",
      copy: isOpenAiBaseline
        ? "缺少 OpenAI-compatible 必需字段，标准 OpenAI SDK 可能无法正常处理。"
        : `缺少 ${baselineLabel} baseline 响应中的关键字段，第三方返回与原厂格式存在明显差距。`
    };
  }

  if (diffs.some((diff) => diff.kind === "extra" || diff.kind === "type")) {
    return {
      level: "extension",
      label: "EXTENSION",
      title: "严重程度：EXTENSION",
      copy: isOpenAiBaseline
        ? "响应大体兼容，但包含非标准字段或类型变化，客户端需要显式容忍。"
        : `响应和 ${baselineLabel} baseline 存在额外字段或类型变化，网关转换时需要显式处理。`
    };
  }

  return {
    level: "compatible",
    label: "COMPATIBLE",
    title: "严重程度：COMPATIBLE",
    copy: `该 case 的响应结构与 ${baselineLabel} baseline 一致。`
  };
}

function conclusionMeta(result) {
  return supportConclusionMeta[result.support_conclusion] || supportConclusionMeta.unknown;
}

function capabilityStatusLabel(result) {
  return conclusionMeta(result).label;
}

function evidenceLevelForResult(result) {
  if (!result || ["request_failed", "permission_limited", "unknown"].includes(result.support_conclusion)) {
    return "none";
  }
  const assertions = result.assertions || [];
  if (assertions.length) {
    return assertions.some((assertion) => !assertion.pass) ? "observed" : "asserted";
  }
  if (hasResponseBody(result) || result.raw_response || result.response_headers) {
    return "observed";
  }
  if (result.source_case || result.expected_support_conclusion || result.expected_http_status) {
    return "inferred";
  }
  return "none";
}

function evidenceMeta(result) {
  return evidenceLevelMeta[evidenceLevelForResult(result)] || evidenceLevelMeta.none;
}

function expectationResult(result) {
  return matchesExpectedResult(result) ? "expected" : "unexpected";
}

function gatewayActionForResult(result) {
  if (!result) return "manual_review";
  if (result.support_conclusion === "supported" && matchesExpectedResult(result) && failedAssertionsForResult(result).length === 0) {
    return result.diff_count > 0 ? "adapter_required" : "pass_through";
  }
  if (result.support_conclusion === "ignored") return "strip_or_warn";
  if (result.support_conclusion === "rejected_400") return "strip_or_transform";
  if (result.support_conclusion === "schema_mismatch") return "adapter_required";
  if (result.support_conclusion === "request_failed" || result.support_conclusion === "permission_limited") return "retry_or_review";
  return "manual_review";
}

function gatewayAction(result) {
  return gatewayActionMeta[gatewayActionForResult(result)] || gatewayActionMeta.manual_review;
}

function enrichResultAxes(result) {
  return {
    ...result,
    capability_status: result.capability_status || result.support_conclusion || "unknown",
    expectation_result: result.expectation_result || expectationResult(result),
    evidence_level: result.evidence_level || evidenceLevelForResult(result),
    gateway_action: result.gateway_action || gatewayActionForResult(result)
  };
}

function inferSiliconFlowConclusion(testCase) {
  const expect = testCase.expect || {};
  if (expect.support_conclusion === "ignored") return "ignored";
  if (expect.support_conclusion === "rejected_400") return "rejected_400";
  if (expect.support_conclusion === "supported") return "supported";
  if (expect.http_status && Number(expect.http_status) >= 400) return "rejected_400";
  return "supported";
}

function inferMockConclusion(result) {
  if (result.status === "rejected") return "rejected_400";
  if (result.status === "warning" || result.message) return "ignored";
  if (result.status === "na") return "unknown";
  return "supported";
}

function assertionSummary(assertions = []) {
  if (!assertions.length) return "未配置额外断言。";
  const passed = assertions.filter((assertion) => assertion.pass).length;
  return `断言 ${passed} / ${assertions.length} 通过。`;
}

function thinkingProbeAnalysisLines(results = []) {
  const probeResults = results.filter((result) => String(result.case_id || "").startsWith("thinking_"));
  if (!probeResults.length) return [];

  const byCase = new Map(probeResults.map((result) => [result.case_id, result]));
  const families = thinkingProbeFamilies();
  const familyAnalyses = families.map((family) => thinkingFamilyAnalysis(family, byCase));
  const openingCases = families.flatMap((family) => family.openCases.map((item) => [item.caseId, item.label]));
  const closingCases = families.flatMap((family) => family.closeCases.map((item) => [item.caseId, item.label, item.openCaseId]));

  const supportedOpenings = familyAnalyses.flatMap((family) => family.openResults.filter((item) => thinkingOpeningWorks(item.result)));
  const supportedClosings = familyAnalyses.flatMap((family) => family.closeResults.filter((item) => thinkingClosingWorks(item.result) && thinkingOpeningWorks(item.openResult)));
  const closingAcceptedWithoutPairedOpen = familyAnalyses.flatMap((family) => family.closeResults.filter((item) => thinkingClosingWorks(item.result) && !thinkingOpeningWorks(item.openResult)));
  const supportedLevels = familyAnalyses.flatMap((family) => family.levelResults.filter((item) => thinkingOpeningWorks(item.result)));
  const acceptedButNoEvidence = familyAnalyses.flatMap((family) => family.openResults.filter((item) => thinkingAcceptedWithoutEvidence(item.result)));
  const rejectedCases = [...openingCases, ...closingCases]
    .map(([caseId, label]) => ({ caseId, label, result: byCase.get(caseId) }))
    .filter((item) => item.result && ["rejected_400", "request_failed", "permission_limited"].includes(item.result.support_conclusion));
  const locations = uniqueStrings(probeResults.flatMap(thinkingLocationsForResult));
  const tokenEvidence = uniqueStrings(probeResults.flatMap(thinkingTokenEvidenceForResult));
  const baseline = byCase.get("thinking_baseline_no_thinking");
  const typoProbe = byCase.get("thinking_reasnoing_effort_typo_probe");
  const baselineHasEvidence = thinkingResultHasEvidence(baseline);
  const confirmedFamilies = familyAnalyses.filter((family) => family.status === "confirmed");
  const observableDefaultFamilies = familyAnalyses.filter((family) => family.status === "default_already_on");
  const acceptedNoEvidenceFamilies = familyAnalyses.filter((family) => family.status === "accepted_no_evidence");
  const preferred = confirmedFamilies[0]?.bestOpen || supportedOpenings[0];
  const capabilitySummary = confirmedFamilies.length
    ? `确认支持 thinking；已证明 ${confirmedFamilies.length} 类开启形态。`
    : baselineHasEvidence
      ? "模型/渠道默认会暴露 thinking 证据；但未确认显式开启参数是否生效。"
      : acceptedNoEvidenceFamilies.length || observableDefaultFamilies.length
        ? "可能支持 thinking；请求被接受，但缺少足够的开启/关闭对照证据。"
        : "未确认支持 thinking；开启类探针没有拿到 thinking 内容或 token 证据。";

  const lines = [
    "## Thinking Probe 结论",
    "",
    `- 能力判定：${capabilitySummary}`,
    `- 推荐打开方式：${preferred ? preferred.label : "未确认；开启类探针没有同时命中 2xx 与 thinking 证据。"}`,
    `- 支持的 thinking 类型：${confirmedFamilies.length ? confirmedFamilies.map((item) => item.name).join("；") : "未确认"}`,
    `- 可正常打开：${supportedOpenings.length ? supportedOpenings.map((item) => item.label).join("；") : "未确认"}`,
    `- 可正常关闭：${supportedClosings.length ? supportedClosings.map((item) => item.label).join("；") : "未确认"}`,
    `- 可设置级别/预算：${supportedLevels.length ? supportedLevels.map((item) => item.label).join("；") : "未确认"}`,
    `- thinking 内容落点：${locations.length ? locations.join("；") : "未发现显式 thinking 内容字段"}`,
    `- token 证据：${tokenEvidence.length ? tokenEvidence.join("；") : "未发现 reasoning_tokens/thinking_tokens > 0"}`,
    `- 默认不传 thinking 参数：${baseline ? thinkingDefaultSummary(baseline) : "未运行 baseline case"}`,
    `- 错拼 reasnoing_effort：${typoProbe ? thinkingCaseShortSummary(typoProbe) : "未运行错拼探针"}`,
    ""
  ];

  lines.push("### Thinking 能力矩阵");
  lines.push("");
  lines.push("| 类型 | 判定 | 打开方式 | 关闭方式 | 级别/预算 | 证据 |");
  lines.push("|---|---|---|---|---|---|");
  lines.push(...familyAnalyses.map((family) =>
    `| ${escapeMarkdownCell(family.name)} | ${escapeMarkdownCell(thinkingFamilyStatusLabel(family.status))} | ${escapeMarkdownCell(thinkingFamilyOpenSummary(family))} | ${escapeMarkdownCell(thinkingFamilyCloseSummary(family))} | ${escapeMarkdownCell(thinkingFamilyLevelSummary(family))} | ${escapeMarkdownCell(thinkingFamilyEvidenceSummary(family))} |`
  ));
  lines.push("");

  if (observableDefaultFamilies.length) {
    lines.push("### 默认已暴露但开关未隔离");
    lines.push("");
    lines.push("这些类型的开启 case 有 thinking 证据，但 baseline 也已经有证据；除非对应关闭 case 通过，否则不能证明这个字段真的负责开启。");
    lines.push("");
    lines.push("| 类型 | 开启方式 | 证据 |");
    lines.push("|---|---|---|");
    lines.push(...observableDefaultFamilies.map((family) =>
      `| ${escapeMarkdownCell(family.name)} | ${escapeMarkdownCell(thinkingFamilyOpenSummary(family))} | ${escapeMarkdownCell(thinkingFamilyEvidenceSummary(family))} |`
    ));
    lines.push("");
  }

  if (acceptedButNoEvidence.length) {
    lines.push("### 2xx 但未证明开启");
    lines.push("");
    lines.push("| Case | 参数 | 结论 | 断言 |");
    lines.push("|---|---|---|---|");
    lines.push(...acceptedButNoEvidence.map((item) =>
      `| \`${item.caseId}\` | ${escapeMarkdownCell(item.label)} | ${conclusionMeta(item.result).label} | ${escapeMarkdownCell(assertionSummary(item.result.assertions))} |`
    ));
    lines.push("");
  }

  if (closingAcceptedWithoutPairedOpen.length) {
    lines.push("### 关闭通过但缺少同类开启证明");
    lines.push("");
    lines.push("这些关闭 case 没有暴露 thinking，但对应开启 case 没有成功证明 thinking 被打开，因此只能说明“响应未出现 thinking”，不能单独证明该字段真的具备关闭能力。");
    lines.push("");
    lines.push("| Case | 关闭参数 | 对应开启 Case | 关闭结论 |");
    lines.push("|---|---|---|---|");
    lines.push(...closingAcceptedWithoutPairedOpen.map((item) =>
      `| \`${item.caseId}\` | ${escapeMarkdownCell(item.label)} | \`${item.openCaseId}\` | ${escapeMarkdownCell(thinkingCaseShortSummary(item.result))} |`
    ));
    lines.push("");
  }

  if (rejectedCases.length) {
    lines.push("### 不可用/被拒绝的开关");
    lines.push("");
    lines.push("| Case | 参数 | 实际结论 | HTTP | 说明 |");
    lines.push("|---|---|---|---|---|");
    lines.push(...rejectedCases.map((item) =>
      `| \`${item.caseId}\` | ${escapeMarkdownCell(item.label)} | ${conclusionMeta(item.result).label} | ${item.result.http_status || conclusionMeta(item.result).httpStatus || "—"} | ${escapeMarkdownCell(item.result.message || assertionSummary(item.result.assertions))} |`
    ));
    lines.push("");
  }

  lines.push("### Thinking 探针明细");
  lines.push("");
  lines.push("| Case | 探测目的 | 实际结论 | HTTP | 关键证据 |");
  lines.push("|---|---|---|---|---|");
  lines.push(...probeResults.map((result) =>
    `| \`${result.case_id}\` | ${escapeMarkdownCell(result.parameter || result.title || "")} | ${conclusionMeta(result).label} | ${result.http_status || conclusionMeta(result).httpStatus || "—"} | ${escapeMarkdownCell(thinkingEvidenceSummary(result))} |`
  ));
  lines.push("");
  return lines;
}

function thinkingProbeFamilies() {
  return [
    {
      name: "OpenAI reasoning_effort",
      openCases: [{ caseId: "thinking_reasoning_effort_medium", label: "reasoning_effort = medium" }],
      closeCases: [{ caseId: "thinking_reasoning_effort_none", label: "reasoning_effort = none", openCaseId: "thinking_reasoning_effort_medium" }],
      levelCases: [{ caseId: "thinking_reasoning_effort_medium", label: "reasoning_effort 级别" }]
    },
    {
      name: "Qwen/SiliconFlow enable_thinking",
      openCases: [{ caseId: "thinking_enable_thinking_true", label: "enable_thinking = true" }],
      closeCases: [{ caseId: "thinking_enable_thinking_false", label: "enable_thinking = false", openCaseId: "thinking_enable_thinking_true" }],
      levelCases: [{ caseId: "thinking_enable_thinking_with_budget", label: "enable_thinking + thinking_budget 预算" }]
    },
    {
      name: "Qwen thinking_budget",
      openCases: [
        { caseId: "thinking_budget_only", label: "thinking_budget = 1000" },
        { caseId: "thinking_enable_thinking_with_budget", label: "enable_thinking = true + thinking_budget = 1000" }
      ],
      closeCases: [{ caseId: "thinking_enable_thinking_false", label: "enable_thinking = false", openCaseId: "thinking_enable_thinking_with_budget" }],
      levelCases: [
        { caseId: "thinking_budget_only", label: "thinking_budget 预算" },
        { caseId: "thinking_enable_thinking_with_budget", label: "enable_thinking + thinking_budget 预算" }
      ]
    },
    {
      name: "DeepSeek/Claude thinking object",
      openCases: [
        { caseId: "thinking_object_enabled", label: "thinking.type = enabled" },
        { caseId: "thinking_object_enabled_budget_tokens", label: "thinking.type = enabled + budget_tokens" }
      ],
      closeCases: [{ caseId: "thinking_object_disabled", label: "thinking.type = disabled", openCaseId: "thinking_object_enabled" }],
      levelCases: [{ caseId: "thinking_object_enabled_budget_tokens", label: "thinking.budget_tokens 预算" }]
    },
    {
      name: "OpenRouter reasoning object",
      openCases: [
        { caseId: "thinking_reasoning_object_effort_summary", label: "reasoning.effort = medium + reasoning.summary = auto" },
        { caseId: "thinking_reasoning_object_enabled", label: "reasoning.enabled = true" }
      ],
      closeCases: [
        { caseId: "thinking_reasoning_object_effort_none", label: "reasoning.effort = none", openCaseId: "thinking_reasoning_object_effort_summary" },
        { caseId: "thinking_reasoning_object_disabled", label: "reasoning.enabled = false", openCaseId: "thinking_reasoning_object_enabled" }
      ],
      levelCases: [{ caseId: "thinking_reasoning_object_effort_summary", label: "reasoning.effort 级别/summary" }]
    },
    {
      name: "vLLM chat_template_kwargs",
      openCases: [{ caseId: "thinking_chat_template_kwargs_enable_true", label: "chat_template_kwargs.enable_thinking = true" }],
      closeCases: [{ caseId: "thinking_chat_template_kwargs_enable_false", label: "chat_template_kwargs.enable_thinking = false", openCaseId: "thinking_chat_template_kwargs_enable_true" }],
      levelCases: []
    },
    {
      name: "MiniMax reasoning_split",
      openCases: [{ caseId: "thinking_reasoning_split_true", label: "reasoning_split = true" }],
      closeCases: [
        { caseId: "thinking_object_disabled", label: "thinking.type = disabled", openCaseId: "thinking_reasoning_split_true" },
        { caseId: "thinking_reasoning_split_false", label: "reasoning_split = false", openCaseId: "thinking_reasoning_split_true" }
      ],
      levelCases: []
    }
  ];
}

function thinkingFamilyAnalysis(family, byCase) {
  const openResults = family.openCases.map((item) => ({ ...item, result: byCase.get(item.caseId) }));
  const closeResults = family.closeCases.map((item) => {
    const explicitOpen = byCase.get(item.openCaseId);
    const fallbackOpen = openResults.find((openItem) => thinkingOpeningWorks(openItem.result))?.result;
    return { ...item, result: byCase.get(item.caseId), openResult: thinkingOpeningWorks(explicitOpen) ? explicitOpen : fallbackOpen || explicitOpen };
  });
  const levelResults = family.levelCases.map((item) => ({ ...item, result: byCase.get(item.caseId) }));
  const baseline = byCase.get("thinking_baseline_no_thinking");
  const baselineHasEvidence = thinkingResultHasEvidence(baseline);
  const bestOpen = openResults.find((item) => thinkingOpeningWorks(item.result)) || null;
  const pairedClose = closeResults.find((item) => thinkingClosingWorks(item.result) && thinkingOpeningWorks(item.openResult)) || null;
  const acceptedNoEvidence = openResults.some((item) => thinkingAcceptedWithoutEvidence(item.result));
  const accepted = openResults.some((item) => thinkingRequestAccepted(item.result));
  const rejected = openResults.some((item) => thinkingRequestRejected(item.result));
  let status = "not_run";
  if (bestOpen && (pairedClose || !baselineHasEvidence)) {
    status = "confirmed";
  } else if (bestOpen && baselineHasEvidence) {
    status = "default_already_on";
  } else if (acceptedNoEvidence || accepted) {
    status = "accepted_no_evidence";
  } else if (rejected) {
    status = "rejected";
  }
  return { ...family, openResults, closeResults, levelResults, status, bestOpen, pairedClose };
}

function thinkingFamilyStatusLabel(status) {
  return {
    confirmed: "确认支持",
    default_already_on: "默认已暴露，开关未隔离",
    accepted_no_evidence: "2xx 但无 thinking 证据",
    rejected: "不可用/被拒绝",
    not_run: "未运行"
  }[status] || "未知";
}

function thinkingFamilyOpenSummary(family) {
  const confirmed = family.openResults.filter((item) => thinkingOpeningWorks(item.result));
  if (confirmed.length) return confirmed.map((item) => item.label).join("；");
  const accepted = family.openResults.filter((item) => thinkingRequestAccepted(item.result));
  if (accepted.length) return `已接受但未证明开启：${accepted.map((item) => item.label).join("；")}`;
  const rejected = family.openResults.filter((item) => thinkingRequestRejected(item.result));
  if (rejected.length) return `被拒绝：${rejected.map((item) => item.label).join("；")}`;
  return "未运行";
}

function thinkingFamilyCloseSummary(family) {
  const confirmed = family.closeResults.filter((item) => thinkingClosingWorks(item.result) && thinkingOpeningWorks(item.openResult));
  if (confirmed.length) return confirmed.map((item) => item.label).join("；");
  const unpaired = family.closeResults.filter((item) => thinkingClosingWorks(item.result));
  if (unpaired.length) return `响应未出现 thinking，但缺少同类开启证明：${unpaired.map((item) => item.label).join("；")}`;
  const rejected = family.closeResults.filter((item) => thinkingRequestRejected(item.result));
  if (rejected.length) return `被拒绝：${rejected.map((item) => item.label).join("；")}`;
  return "未确认";
}

function thinkingFamilyLevelSummary(family) {
  const confirmed = family.levelResults.filter((item) => thinkingOpeningWorks(item.result));
  if (confirmed.length) return confirmed.map((item) => item.label).join("；");
  const accepted = family.levelResults.filter((item) => thinkingRequestAccepted(item.result));
  if (accepted.length) return `已接受但未证明：${accepted.map((item) => item.label).join("；")}`;
  return family.levelResults.length ? "未确认" : "不适用";
}

function thinkingFamilyEvidenceSummary(family) {
  const candidates = [...family.openResults, ...family.closeResults].map((item) => item.result).filter(Boolean);
  const locations = uniqueStrings(candidates.flatMap(thinkingLocationsForResult));
  const tokens = uniqueStrings(candidates.flatMap(thinkingTokenEvidenceForResult));
  const evidence = [...locations, ...tokens];
  if (evidence.length) return evidence.join("；");
  const messages = uniqueStrings(candidates.map((result) => thinkingEvidenceSummary(result)).filter(Boolean));
  return messages.slice(0, 2).join("；") || "无";
}

function thinkingCloseAnalysisLines(results = []) {
  const closeResults = results.filter((result) =>
    !String(result.case_id || "").startsWith("thinking_")
    && Boolean(result.source_case?.expect?.thinking_absent)
  );
  if (!closeResults.length) return [];

  const passed = closeResults.filter((result) => thinkingCloseCaseWorks(result));
  const failed = closeResults.filter((result) => !thinkingCloseCaseWorks(result));
  const locations = uniqueStrings(closeResults.flatMap(thinkingLocationsForResult));
  const summary = passed.length && !failed.length
    ? `可以关闭；${passed.length} 个关闭用例均未输出 thinking 内容。`
    : passed.length
      ? `部分关闭；${passed.length} 个通过，${failed.length} 个仍需检查。`
      : `未确认可关闭；${failed.length} 个关闭用例未通过。`;

  const lines = [
    "## Thinking 关闭检测",
    "",
    `- 结论：${summary}`,
    `- 关闭定义：响应中不出现 reasoning_content、reasoning、reasoning_details、content[] thinking block、content 里的 <think>...</think>，且 usage 中没有 reasoning_tokens/thinking_tokens > 0。`,
    `- 探测到的 thinking 内容落点：${locations.length ? locations.join("；") : "未发现显式 thinking 内容字段"}`,
    "",
    "| Case | 参数 | 测试结果 | 实际结论 | HTTP | 关键证据 |",
    "|---|---|---|---|---|---|",
    ...closeResults.map((result) =>
      `| \`${result.case_id}\` | \`${escapeMarkdownCell(result.parameter || "")}\` | ${expectationLabel(result)} | ${conclusionMeta(result).label} | ${result.http_status || conclusionMeta(result).httpStatus || "—"} | ${escapeMarkdownCell(thinkingEvidenceSummary(result))} |`
    ),
    ""
  ];

  return lines;
}

function thinkingCloseCaseWorks(result) {
  return Boolean(result)
    && thinkingRequestAccepted(result)
    && assertionPassed(result, "thinking_absent")
    && failedThinkingAssertionsForResult(result).length === 0;
}

function thinkingOpeningWorks(result) {
  return Boolean(result)
    && thinkingRequestAccepted(result)
    && assertionPassed(result, "thinking_evidence_required")
    && failedThinkingAssertionsForResult(result).length === 0;
}

function thinkingClosingWorks(result) {
  return Boolean(result)
    && thinkingRequestAccepted(result)
    && assertionPassed(result, "thinking_absent")
    && failedThinkingAssertionsForResult(result).length === 0;
}

function thinkingAcceptedWithoutEvidence(result) {
  return Boolean(result)
    && result.support_conclusion === "schema_mismatch"
    && assertionFailed(result, "thinking_evidence_required");
}

function thinkingResultHasEvidence(result) {
  return Boolean(result)
    && (thinkingLocationsForResult(result).length > 0 || thinkingTokenEvidenceForResult(result).length > 0);
}

function thinkingRequestAccepted(result) {
  if (!result) return false;
  const status = Number(result.http_status || 0);
  return (status >= 200 && status < 300)
    || ["supported", "schema_mismatch", "ignored"].includes(result.support_conclusion);
}

function thinkingRequestRejected(result) {
  return Boolean(result)
    && ["rejected_400", "request_failed", "permission_limited"].includes(result.support_conclusion);
}

function assertionPassed(result, name) {
  return (result.assertions || []).some((assertion) => assertion.name === name && assertion.pass);
}

function assertionFailed(result, name) {
  return (result.assertions || []).some((assertion) => assertion.name === name && !assertion.pass);
}

function assertionMessage(result, name) {
  return (result.assertions || []).find((assertion) => assertion.name === name)?.message || "";
}

function thinkingEvidenceSummary(result) {
  const evidence = assertionMessage(result, "thinking_evidence_required")
    || assertionMessage(result, "thinking_location_probe")
    || assertionMessage(result, "thinking_absent")
    || assertionSummary(result.assertions);
  return evidence || result.message || "无额外证据";
}

function thinkingLocationsForResult(result) {
  return thinkingEvidenceSummary(result)
    .split("；")
    .filter((part) => part.startsWith("thinking 内容位置: "))
    .flatMap((part) => part.replace("thinking 内容位置: ", "").split(", "))
    .map((item) => item.trim())
    .filter(Boolean);
}

function thinkingTokenEvidenceForResult(result) {
  return thinkingEvidenceSummary(result)
    .split("；")
    .filter((part) => part.startsWith("token 证据: "))
    .flatMap((part) => part.replace("token 证据: ", "").split(", "))
    .map((item) => item.trim())
    .filter(Boolean);
}

function thinkingDefaultSummary(result) {
  const locations = thinkingLocationsForResult(result);
  const tokens = thinkingTokenEvidenceForResult(result);
  if (locations.length || tokens.length) {
    return `默认可能开启或暴露 thinking（${[...locations, ...tokens].join("；")}）`;
  }
  return thinkingCaseShortSummary(result);
}

function thinkingCaseShortSummary(result) {
  const failed = failedAssertionsForResult(result).length;
  const suffix = failed ? `，${assertionSummary(result.assertions)}` : "";
  return `${conclusionMeta(result).label}，HTTP ${result.http_status || conclusionMeta(result).httpStatus || "—"}${suffix}`;
}

function uniqueStrings(values = []) {
  return Array.from(new Set(values.filter(Boolean)));
}

function expectedHTTPStatusForResult(result) {
  const status = result.expected_http_status || result.source_case?.expect?.http_status || 0;
  return Number(status) || 0;
}

function expectedSupportConclusionForResult(result) {
  const explicit = result.expected_support_conclusion || result.source_case?.expect?.support_conclusion;
  if (explicit) return explicit;
  const expectedStatus = expectedHTTPStatusForResult(result);
  if (expectedStatus >= 400) return "rejected_400";
  return inferSiliconFlowConclusion(result.source_case || {});
}

function failedAssertionsForResult(result) {
  return (result.assertions || []).filter((assertion) => !assertion.pass);
}

function failedThinkingAssertionsForResult(result) {
  return failedAssertionsForResult(result).filter((assertion) => String(assertion.name || "").startsWith("thinking_"));
}

function matchesExpectedResult(result) {
  const expected = expectedSupportConclusionForResult(result);
  const expectedStatus = expectedHTTPStatusForResult(result);
  const statusMatches = !expectedStatus || Number(result.http_status || 0) === expectedStatus;
  const conclusionMatches = (result.support_conclusion || "unknown") === expected;
  if (!statusMatches || !conclusionMatches) return false;
  if (expected === "rejected_400" || expected === "permission_limited") return true;
  return failedAssertionsForResult(result).length === 0;
}

function expectationLabel(result) {
  return matchesExpectedResult(result) ? "符合预期" : "预期外";
}

function expectationClass(result) {
  return matchesExpectedResult(result) ? "expected" : "unexpected";
}

function expectationSummary(result) {
  const actual = supportConclusionMeta[result.support_conclusion]?.label || supportConclusionMeta.unknown.label;
  const expected = supportConclusionMeta[expectedSupportConclusionForResult(result)]?.label || supportConclusionMeta.supported.label;
  const expectedStatus = expectedHTTPStatusForResult(result);
  const statusText = expectedStatus ? `；预期 HTTP ${expectedStatus}，实际 HTTP ${result.http_status || "—"}` : "";
  return `测试结果：${expectationLabel(result)}；实际结论：${actual}；预期结论：${expected}${statusText}。`;
}

function expectedConclusionText(result) {
  const expected = expectedSupportConclusionForResult(result);
  return supportConclusionMeta[expected]?.label || supportConclusionMeta.supported.label;
}

function categoryLabel(category) {
  const labels = {
    basic: "基础",
    sampling: "采样",
    sampling_combo: "采样组合",
    length: "长度",
    reasoning: "推理",
    output: "输出",
    tools: "tools",
    protocol: "协议",
    multiturn: "多轮对话",
    observability: "可观测性",
    compatibility_probe: "兼容性探针",
    debug: "调试",
    metadata: "元数据",
    extra: "扩展",
    multimodal: "多模态",
    search: "搜索",
    headers: "请求头",
    skill: "技能",
    beta: "Beta",
    capacity: "容量"
  };
  return labels[category] || category;
}

function isCapacityCase(testCase) {
  return testCase.category === "capacity" || testCase.capacity_case;
}

function isVlmCase(testCase) {
  const capability = String(testCase.requires_model_capability || "").toLowerCase();
  return testCase.category === "multimodal"
    || capability.startsWith("vision")
    || (testCase.parameters || []).some((param) => String(param).includes("image_url"));
}

function isOptionalExtensionCase(testCase) {
  return Boolean(testCase.optional) && !isVlmCase(testCase) && !isCapacityCase(testCase);
}

function isDefaultSelectedCase(testCase) {
  return !testCase.optional && !isVlmCase(testCase);
}

function focusParametersForCase(testCase) {
  if (isCapacityCase(testCase)) return [];
  return (testCase.parameters || []).filter((param) => !foundationalCaseParameters.has(param));
}

function foundationalParametersForCase(testCase) {
  return (testCase.parameters || []).filter((param) => foundationalCaseParameters.has(param));
}

function caseRelation(testCase) {
  if (isCapacityCase(testCase)) {
    return {
      type: "scenario",
      label: capacityCaseDisplay(testCase).relation,
      params: testCase.parameters || []
    };
  }
  const focusParams = focusParametersForCase(testCase);
  if (focusParams.length === 1) {
    return {
      type: "single",
      label: `${focusParams[0]} 专项测试`,
      params: focusParams
    };
  }
  if (focusParams.length > 1) {
    return {
      type: "combo",
      label: `${focusParams.join(" + ")} 组合测试`,
      params: focusParams
    };
  }
  const foundational = foundationalParametersForCase(testCase);
  return {
    type: "scenario",
    label: foundational.length ? `${foundational.join(" + ")} 基础协议` : "场景用例",
    params: foundational
  };
}

function capacityCaseDisplay(testCase) {
  const probe = testCase.payload?.__capacity_probe || {};
  const candidates = Array.isArray(probe.candidates) ? probe.candidates : [];
  const range = candidates.length
    ? `${formatCapacityTier(candidates[0])} → ${formatCapacityTier(candidates[candidates.length - 1])}`
    : "常见档位";
  if (probe.kind === "total_context") {
    const ratio = Number(probe.context_safety_margin_ratio || CONTEXT_CAPACITY_SAFETY_MARGIN_RATIO);
    return {
      kind: "total_context",
      title: "最大Total Context",
      relation: "最大Total Context",
      meta: "逐档测试",
      chips: [range, `按档位减 ${trimNumber(ratio * 100, 1)}% 探测`, `保留输出 ${probe.context_output_tokens || 8} tokens`]
    };
  }
  return {
    kind: "max_output",
    title: "最大Max Output",
    relation: "最大Max Output",
    meta: "逐档测试",
    chips: [range, "逐档测试"]
  };
}

function partitionCases(cases = []) {
  const singles = new Map();
  const combos = [];
  const scenarios = [];
  const vlm = [];
  const optional = [];

  for (const testCase of cases) {
    if (isVlmCase(testCase)) {
      vlm.push(testCase);
      continue;
    }
    if (isOptionalExtensionCase(testCase)) {
      optional.push(testCase);
      continue;
    }
    const focusParams = focusParametersForCase(testCase);
    if (focusParams.length === 1) {
      const param = focusParams[0];
      if (!singles.has(param)) singles.set(param, []);
      singles.get(param).push(testCase);
      continue;
    }
    if (focusParams.length > 1) {
      combos.push(testCase);
      continue;
    }
    scenarios.push(testCase);
  }

  return { singles, combos, scenarios, vlm, optional };
}

function capacityCasesForProvider(providerId = currentProviderId()) {
  if (!providerId || state.selectedEndpointId !== "chat_completions") return [];
  if (providerId === "thinking") return [];
  const model = els.modelName?.value.trim() || "";
  const candidateText = CAPACITY_CANDIDATES.map(formatCapacityTier).join("、");
  return [
    {
      case_id: "capacity_max_output_boundary",
      title: "最大Max Output",
      category: "capacity",
      parameters: ["最大Max Output"],
      method: "POST",
      path: "/chat/completions",
      custom: true,
      capacity_case: true,
      payload: {
        model,
        __capacity_probe: {
          kind: "max_output",
          candidates: CAPACITY_CANDIDATES
        }
      },
      expect: { http_status: 200, support_conclusion: "supported" },
      notes: [`按常见档位从高到低测试：${candidateText}`]
    },
    {
      case_id: "capacity_total_context_boundary",
      title: "最大Total Context",
      category: "capacity",
      parameters: ["最大Total Context"],
      method: "POST",
      path: "/chat/completions",
      custom: true,
      capacity_case: true,
      payload: {
        model,
        __capacity_probe: {
          kind: "total_context",
          candidates: CAPACITY_CANDIDATES,
          context_safety_margin_ratio: CONTEXT_CAPACITY_SAFETY_MARGIN_RATIO,
          context_output_tokens: 8
        }
      },
      expect: { http_status: 200, support_conclusion: "supported" },
      notes: [`按常见总上下文档位从高到低测试：${candidateText}；实际请求按每档减 ${trimNumber(CONTEXT_CAPACITY_SAFETY_MARGIN_RATIO * 100, 1)}% 构造，避免 tokenizer 临界误差。`]
    }
  ];
}

function allProviderCases(providerId = currentProviderId()) {
  const cacheKey = currentCaseCacheKey(providerId);
  return [
    ...(providerId ? state.providerCases[cacheKey]?.cases || [] : []),
    ...capacityCasesForProvider(providerId),
    ...state.customCases
  ];
}

function selectedProviderCases(providerId = currentProviderId()) {
  return allProviderCases(providerId).filter((testCase) => state.selectedCaseIds.has(testCase.case_id));
}

function caseIdsForCases(cases = []) {
  return cases.map((testCase) => testCase.case_id);
}

function caseIdsForParameter(parameter, cases = allProviderCases()) {
  return caseIdsForCases(cases.filter((testCase) => focusParametersForCase(testCase).includes(parameter)));
}

function caseIdsForParameters(parameters = [], cases = allProviderCases()) {
  const parameterSet = new Set(parameters);
  return caseIdsForCases(cases.filter((testCase) =>
    focusParametersForCase(testCase).some((parameter) => parameterSet.has(parameter))
  ));
}

function caseIdsDataAttr(caseIds = []) {
  return escapeHtml(JSON.stringify(caseIds));
}

function selectionStats(caseIds = []) {
  const uniqueIds = Array.from(new Set(caseIds));
  const selected = uniqueIds.filter((caseId) => state.selectedCaseIds.has(caseId)).length;
  return {
    total: uniqueIds.length,
    selected,
    checked: uniqueIds.length > 0 && selected === uniqueIds.length,
    indeterminate: selected > 0 && selected < uniqueIds.length
  };
}

function setCaseSelection(caseIds = [], selected) {
  for (const caseId of new Set(caseIds)) {
    if (selected) {
      state.selectedCaseIds.add(caseId);
    } else {
      state.selectedCaseIds.delete(caseId);
    }
  }
}

function renderBulkSelect(caseIds, label, className = "") {
  const stats = selectionStats(caseIds);
  const disabled = state.isRunning || state.isCaseLoading || !stats.total;
  const stateClass = stats.checked ? "is-checked" : stats.indeterminate ? "is-partial" : "";
  return `
    <label class="bulk-select ${className} ${stateClass}" title="${escapeHtml(`${stats.selected} / ${stats.total} 个 case 已选择`)}" onclick="event.stopPropagation()">
      <input type="checkbox" data-case-bulk="${caseIdsDataAttr(caseIds)}" ${stats.checked ? "checked" : ""} ${disabled ? "disabled" : ""} />
      <span>${escapeHtml(label)}</span>
    </label>
  `;
}

function syncBulkCheckboxes(root = document) {
  root.querySelectorAll("input[data-case-bulk]").forEach((input) => {
    const stats = selectionStats(parseCaseIds(input.dataset.caseBulk));
    input.indeterminate = stats.indeterminate;
  });
}

function parseCaseIds(raw) {
  try {
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function refreshCaseSelectionUi() {
  const data = state.providerCases[currentCaseCacheKey()];
  renderParameterCatalog(getSelectedChannel(), data);
  renderCaseSelector(data);
}

function selectedFocusParameterCount(data) {
  const selectedCases = selectedProviderCases();
  return new Set(selectedCases.flatMap(focusParametersForCase)).size;
}

function caseTitle(testCase) {
  return caseTitleZh[testCase.case_id] || testCase.title || testCase.case_id;
}

function resultTitle(result) {
  if (result.source_case) return caseTitle(result.source_case);
  if (result.case_id && caseTitleZh[result.case_id]) return caseTitleZh[result.case_id];
  return result.title || result.case_id || "未命名 case";
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function contextualCaseTitle(title, context = {}) {
  const parameter = context.groupParameter;
  if (!parameter) return title;
  const escapedParameter = escapeRegExp(parameter);
  const withoutPrefix = title
    .replace(new RegExp(`^${escapedParameter}(?:\\s+|=|：|:)`, "i"), "")
    .replace(new RegExp(`^${escapedParameter}`, "i"), "")
    .trim() || title;
  return withoutPrefix
    .replace(new RegExp(`\\s*${escapedParameter}\\s*`, "ig"), "该参数")
    .trim() || title;
}

const caseIntentZh = {
  capacity_max_output_boundary: "从常见档位降档请求，定位该模型可用的 最大Max Output。",
  capacity_total_context_boundary: "从常见档位降档请求，定位该模型可用的 最大Total Context。",
  sf_reasoning_enable_thinking: "开启后应返回 reasoning_content 或 reasoning tokens。",
  sf_reasoning_disable_thinking_no_output: "关闭后不应返回 thinking 内容或 reasoning tokens。",
  sf_reasoning_thinking_budget: "验证 thinking_budget 是否能约束推理预算。",
  sf_reasoning_effort_medium: "验证 OpenAI-style reasoning_effort 是否被接收。",
  sf_reasoning_combo_budget_effort: "验证多种推理控制参数同时传入时是否被接收。",
  sf_prefix_completion: "验证返回内容是否真的从给定 assistant 前缀继续生成，适合 DeepSeek-V4-Pro / Flash。",
  sf_sampling_frequency_penalty: "验证合法范围内的频率惩罚参数是否被接收。",
  sf_length_max_tokens: "验证输出长度限制是否被接收并生效。",
  sf_length_max_tokens_stop: "验证长度限制和停止词同时传入时是否被接收。"
};

function capabilityRequirementText(testCase) {
  if (!testCase.requires_model_capability) return "";
  return `前提：${testCase.requires_model_capability} 模型。`;
}

function capacityIntentText(capacityDisplay) {
  const [range, margin, outputBudget] = capacityDisplay.chips || [];
  if (capacityDisplay.kind === "total_context") {
    return `按 ${range || "常见档位"} 递进探测，${margin || "按档位预留安全余量"}，${outputBudget || "保留少量输出"}。`;
  }
  return `按 ${range || "常见档位"} 递进探测，记录可用 最大Max Output。`;
}

function caseIntentText(testCase, context = {}, capacityDisplay = null, title = "") {
  if (capacityDisplay) return capacityIntentText(capacityDisplay);
  const explicit = caseIntentZh[testCase.case_id];
  const base = explicit || (context.groupParameter ? `验证${title}。` : "");
  return [base, capabilityRequirementText(testCase)].filter(Boolean).join(" ");
}

function groupLabel(group) {
  return groupLabelZh[group] || categoryLabel(String(group).toLowerCase());
}

function originLabel(origin) {
  return originLabelZh[origin] || origin;
}

function clonePayload(payload) {
  return JSON.parse(JSON.stringify(payload || {}));
}

function parseCustomPayload() {
  const raw = els.customPayloadInput.value.trim();
  if (!raw) throw new Error("payload 不能为空。");
  const payload = JSON.parse(raw);
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("payload 必须是 JSON object。");
  }
  return payload;
}

function inferPayloadParameters(payload) {
  return Object.keys(payload || {}).filter((key) => key !== "model" && key !== "messages");
}

function addCustomPayloadCase() {
  let payload;
  try {
    payload = parseCustomPayload();
  } catch (error) {
    showToast(`自定义 payload 无效：${error.message}`);
    return;
  }

  const index = state.customCases.length + 1;
  const caseID = `custom_payload_${String(index).padStart(2, "0")}`;
  const parameters = inferPayloadParameters(payload);
  const testCase = {
    case_id: caseID,
    title: `自定义 payload ${index}`,
    category: "custom",
    parameters: parameters.length ? parameters : ["payload"],
    method: "POST",
    payload,
    expect: { http_status: 200 },
    custom: true
  };
  state.customCases.push(testCase);
  state.selectedCaseIds.add(caseID);
  els.customPayloadInput.value = "";
  els.customPayloadHint.textContent = `已添加 ${state.customCases.length} 个自定义 payload。`;
  renderCaseSelector(state.providerCases[currentCaseCacheKey()]);
  showToast(`${caseID} 已添加。`);
}

function buildEndpointUrl(baseUrl, endpoint) {
  const trimmedBase = String(baseUrl || "").trim().replace(/\/+$/, "");
  const trimmedEndpoint = String(endpoint || "").trim();
  if (!trimmedEndpoint) return trimmedBase;
  const endpointPath = `/${trimmedEndpoint.replace(/^\/+/, "")}`;
  if (trimmedBase.endsWith(endpointPath)) return trimmedBase;
  return `${trimmedBase}${endpointPath}`;
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function buildCaseCurl(testCase) {
  const data = state.providerCases[currentCaseCacheKey()] || {};
  const payload = clonePayload(testCase.payload);
  const model = els.modelName.value.trim();
  if (model) payload.model = model;

  const url = buildEndpointUrl(testCase.base_url || els.baseUrl.value, data.endpoint || "/chat/completions");
  const apiKey = els.apiKey.value.trim();
  const providerId = currentProviderId();
  const providerEnvKeys = {
    ali: "DASHSCOPE_API_KEY",
    ali_messages: "DASHSCOPE_API_KEY",
    deepseek: "DEEPSEEK_API_KEY",
    deepseek_messages: "DEEPSEEK_API_KEY",
    minimax: "MINIMAX_API_KEY",
    minimax_messages: "MINIMAX_API_KEY",
    claude: "ANTHROPIC_API_KEY",
    claude_messages: "ANTHROPIC_API_KEY",
    openai: "OPENAI_API_KEY",
    openrouter: "OPENROUTER_API_KEY",
    openrouter_messages: "OPENROUTER_API_KEY",
    siliconflow: "SILICONFLOW_API_KEY",
    siliconflow_messages: "SILICONFLOW_API_KEY"
  };
  const envKey = providerEnvKeys[providerId] || "PROVIDER_API_KEY";
  const authHeaderName = ["ali_messages", "claude_messages", "deepseek_messages", "minimax_messages"].includes(providerId) ? "X-Api-Key" : "Authorization";
  const authHeaderValue = authHeaderName === "X-Api-Key"
    ? (apiKey || `\${${envKey}}`)
    : `Bearer ${apiKey || `\${${envKey}}`}`;
  const authHeader = apiKey
    ? shellQuote(`${authHeaderName}: ${authHeaderValue}`)
    : `"${authHeaderName}: ${authHeaderValue}"`;
  const body = JSON.stringify(payload, null, 2);

  return [
    `curl -sS -X ${testCase.method || data.method || "POST"} ${shellQuote(url)} \\`,
    `  -H ${authHeader} \\`,
    `  -H ${shellQuote("Content-Type: application/json")} \\`,
    `  -H ${shellQuote("Accept: application/json, text/event-stream")} \\`,
    ...(state.selectedEndpointId === "anthropic_messages" ? [`  -H ${shellQuote("anthropic-version: 2023-06-01")} \\`] : []),
    ...Object.entries(testCase.headers || {}).map(([key, value]) => `  -H ${shellQuote(`${key}: ${value}`)} \\`),
    `  --data-raw ${shellQuote(body)}`
  ].join("\n");
}

function ensureSelectedChannelSupportsEndpoint() {
  if (providerIdForChannel()) return;
  const fallback = CHANNEL_TEMPLATES.find((channel) => providerIdForChannel(channel.channel_id));
  if (fallback) state.selectedChannelId = fallback.channel_id;
}

function diffNoteZh(note) {
  const notes = {
    "(missing in this channel)": "（当前渠道缺失）",
    "(missing)": "（缺失）",
    "(extra, not in OpenAI standard)": "（额外字段，非 OpenAI 标准）",
    "(extra, not in baseline)": "（额外字段，baseline 中不存在）",
    "当前渠道缺失": "当前渠道缺失",
    "缺失": "缺失",
    "额外字段，非 OpenAI 标准": "额外字段，非 OpenAI 标准",
    [`额外字段，${"基"}${"准"}中不存在`]: "额外字段，baseline 中不存在"
  };
  if (notes[note]) return notes[note];
  const typeMatch = note.match(/^\(type mismatch: expected (.+), got (.+)\)$/);
  if (typeMatch) return `（类型不一致：预期 ${typeMatch[1]}，实际 ${typeMatch[2]}）`;
  return note;
}

function renderChannels() {
  els.channelCards.innerHTML = CHANNEL_TEMPLATES.map((channel) => {
    const endpoint = channel.endpoints?.[state.selectedEndpointId];
    const isSupported = endpoint?.supported !== false;
    const count = flattenParameters(channel).length;
    const modeText = isSupported
      ? (providerIdForChannel(channel.channel_id) ? "真实测试" : "预览")
      : "不支持该端点";
    return `
      <div class="channel-card ${channel.channel_id === state.selectedChannelId ? "is-active" : ""} ${isSupported ? "" : "is-disabled"}" data-channel-id="${channel.channel_id}">
        <button class="channel-card__select" type="button" data-channel-id="${channel.channel_id}" aria-label="选择 ${escapeHtml(channel.name)}" ${isSupported ? "" : "disabled"}></button>
        <span class="channel-card__top">
          <span class="channel-card__logo-wrap">
            <img class="channel-card__logo" src="${escapeHtml(channel.logo)}" alt="${escapeHtml(channel.name)} logo" />
          </span>
          <span class="channel-card__count">${escapeHtml(modeText)}${isSupported ? ` · ${count} 个参数` : ""}</span>
        </span>
        <strong>${escapeHtml(channel.name)}</strong>
        <a class="channel-card__docs" href="${escapeHtml(endpoint?.api_docs_url || channel.api_docs_url)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(channel.name)} 官方 API 文档">API 文档</a>
        <p>${escapeHtml(channel.summary)}</p>
      </div>
    `;
  }).join("");
}

function renderSelectedChannel() {
  const channel = getSelectedChannel();
  const endpoint = getChannelEndpoint(channel);
  renderBaselineSelector();
  if (!endpoint || endpoint.supported === false) {
    setBaseUrlValue("");
    renderBaseUrlPreset("");
    els.modelName.value = "";
    els.suiteTitle.textContent = `测试套件：${channel.name}（${getSelectedEndpointTemplate().label} 不支持）`;
    document.querySelector(".account-button span:nth-child(2)").textContent = "不支持";
    renderParameterCatalog(channel);
    loadCaseSelectorForChannel();
    return;
  }
  setBaseUrlValue(endpoint.default_base_url || channel.default_base_url);
  els.modelName.value = endpoint.default_model || channel.default_model;
  els.suiteTitle.textContent = `测试套件：${channel.name} / ${getSelectedEndpointTemplate().label}（${flattenParameters(channel).length} 个重点参数）`;
  document.querySelector(".account-button span:nth-child(2)").textContent = providerIdForChannel(channel.channel_id) ? "真实测试" : "预览模式";
  renderParameterCatalog(channel);

  loadCaseSelectorForChannel();
}

function renderParameterCatalog(channel, data = null) {
  const caseCounts = new Map();
  const comboCounts = new Map();
  const availableCases = data?.cases || [];
  if (data?.cases) {
    for (const testCase of data.cases) {
      const focusParams = focusParametersForCase(testCase);
      for (const param of focusParams) {
        caseCounts.set(param, (caseCounts.get(param) || 0) + 1);
        if (focusParams.length > 1) comboCounts.set(param, (comboCounts.get(param) || 0) + 1);
      }
    }
  }

  const endpoint = getChannelEndpoint(channel);
  if (endpoint?.supported === false) {
    els.parameterGroups.innerHTML = `
      <div class="case-error">
        <strong>${escapeHtml(channel.name)} 不支持 ${escapeHtml(getSelectedEndpointTemplate().label)}</strong>
        <span>${escapeHtml(endpoint.unavailable_reason || "该渠道没有当前端点。")}</span>
      </div>
    `;
    return;
  }
  const parametersByGroup = endpoint?.parameters || channel.parameters || {};
  const parameterHtml = Object.entries(parametersByGroup).map(([group, parameters]) => `
    <div class="parameter-group">
      <div class="parameter-group__name">
        <span>${escapeHtml(groupLabel(group))}</span>
        ${renderBulkSelect(caseIdsForParameters(parameters, availableCases), "本组", "suite-bulk-select")}
      </div>
      <div class="coverage-grid">
        ${parameters.map((parameter) => {
          const isExpectedReject = channel.expected_rejected?.includes(parameter);
          const origin = MOCK_PARAMETER_ORIGINS[parameter] || "provider-private";
          const count = caseCounts.get(parameter) || 0;
          const comboCount = comboCounts.get(parameter) || 0;
          const parameterCaseIds = caseIdsForParameter(parameter, availableCases);
          const stats = selectionStats(parameterCaseIds);
          const countText = data ? `${count} 个 case${comboCount ? ` · ${comboCount} 个组合` : ""}` : "等待 case 统计";
          return `
            <label class="coverage-card parameter-select-card ${isExpectedReject ? "is-expected-reject" : ""} ${stats.checked ? "is-checked" : stats.indeterminate ? "is-partial" : ""}" title="${escapeHtml(`选择 ${parameter} 对应的 ${stats.total} 个 case`)}">
              <input type="checkbox" data-case-bulk="${caseIdsDataAttr(parameterCaseIds)}" ${stats.checked ? "checked" : ""} ${state.isRunning || state.isCaseLoading || !stats.total ? "disabled" : ""} />
              <span class="coverage-card__body">
                <code>${escapeHtml(parameter)}</code>
                <em>${escapeHtml(originLabel(origin))}</em>
                <small>${escapeHtml(countText)}${stats.total ? ` · 已选 ${stats.selected}` : ""}</small>
              </span>
            </label>
          `;
        }).join("")}
      </div>
    </div>
  `).join("");
  const capacityCases = capacityCasesForProvider();
  const capacityIds = caseIdsForCases(capacityCases);
  const capacityHtml = capacityCases.length ? `
    <div class="parameter-group parameter-group--capacity">
      <div class="parameter-group__name">
        <span>最大Max Output / 最大Total Context</span>
        ${renderBulkSelect(capacityIds, "本组", "suite-bulk-select")}
      </div>
      <div class="coverage-grid">
        ${capacityCases.map((testCase) => `
          <label class="coverage-card parameter-select-card ${state.selectedCaseIds.has(testCase.case_id) ? "is-checked" : ""}" title="${escapeHtml(`选择 ${caseTitle(testCase)}`)}">
            <input type="checkbox" data-case-bulk="${caseIdsDataAttr([testCase.case_id])}" ${state.selectedCaseIds.has(testCase.case_id) ? "checked" : ""} ${state.isRunning || state.isCaseLoading ? "disabled" : ""} />
            <span class="coverage-card__body">
              <code>${escapeHtml(testCase.parameters[0])}</code>
              <em>capacity</em>
              <small>${escapeHtml(caseTitle(testCase))}</small>
            </span>
          </label>
        `).join("")}
      </div>
    </div>
  ` : "";
  els.parameterGroups.innerHTML = parameterHtml + capacityHtml;
  syncBulkCheckboxes(els.parameterGroups);
}

async function loadCaseSelectorForChannel() {
  const channel = getSelectedChannel();
  const channelId = channel.channel_id;
  const providerId = providerIdForChannel(channelId);
  const cacheKey = currentCaseCacheKey(providerId);
  state.selectedCaseIds = new Set();
  state.expandedCaseId = null;

  if (!providerId) {
    state.isCaseLoading = false;
    els.caseSelector.classList.add("is-hidden");
    els.caseSelectorHint.textContent = getChannelEndpoint(channel)?.unavailable_reason || "当前渠道不支持这个 endpoint。";
    updateRunAvailability();
    return;
  }

  els.caseSelector.classList.remove("is-hidden");
  state.isCaseLoading = true;
  els.caseGroups.innerHTML = '<div class="case-loading">正在从后端加载 cases...</div>';
  els.selectedCaseCount.textContent = "已选 0 个";
  els.caseSelectorHint.textContent = "正在加载测试用例...";
  updateRunAvailability();

  try {
    const response = await fetch(`${API_BASE}/api/providers/${providerId}/cases?${endpointQuery()}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (state.selectedChannelId !== channelId) return;
    state.providerCases[cacheKey] = data;
    state.selectedCaseIds = new Set(data.cases.filter(isDefaultSelectedCase).map((testCase) => testCase.case_id));
    const endpoint = getChannelEndpoint(channel);
    setBaseUrlValue(endpoint?.default_base_url || data.base_url || channel.default_base_url);
    els.modelName.value = endpoint?.default_model || data.default_model || channel.default_model;
    const vlmCount = (data.cases || []).filter(isVlmCase).length;
    const vlmText = vlmCount ? ` · VLM ${vlmCount} 个可选 case` : "";
    const optionalCount = (data.cases || []).filter(isOptionalExtensionCase).length;
    const optionalText = optionalCount ? ` · 扩展 ${optionalCount} 个可选 case` : "";
    const capacityCount = capacityCasesForProvider(providerId).length;
    const capacityText = capacityCount ? ` · 最大Max Output / 最大Total Context 测试 ${capacityCount} 个可选 case` : "";
    els.suiteTitle.textContent = `测试套件：${channel.name} / ${getSelectedEndpointTemplate().label}（${flattenParameters(channel).length} 个重点参数 · ${data.cases.length} 个 case${optionalText}${vlmText}${capacityText}）`;
    els.caseSelectorHint.textContent = "默认勾选常规 case，扩展、VLM 和 最大Max Output / 最大Total Context 测试按需开启。";
    state.isCaseLoading = false;
    renderParameterCatalog(channel, data);
    renderCaseSelector(data);
  } catch (error) {
    if (state.selectedChannelId !== channelId) return;
    state.isCaseLoading = false;
    state.providerCases[cacheKey] = null;
    els.caseGroups.innerHTML = `
      <div class="case-error">
        <strong>后端不可用</strong>
        <span>请先启动 8080 端口上的 Go 后端，再运行 ${escapeHtml(channel.name)} 用例。</span>
      </div>
    `;
    els.caseSelectorHint.textContent = `测试用例加载失败：${error.message}`;
    renderSelectedCaseCount();
  } finally {
    if (state.selectedChannelId === channelId) {
      state.isCaseLoading = false;
      updateRunAvailability();
    }
  }
}

function renderCaseSelector(data) {
  if (!data) {
    els.caseGroups.innerHTML = renderCustomCaseSection();
    syncBulkCheckboxes(els.caseGroups);
    renderSelectedCaseCount();
    return;
  }
  const partition = partitionCases(data.cases || []);
  const capacityCases = capacityCasesForProvider();
  els.caseGroups.innerHTML = [
    renderCaseOverview(data, partition),
    renderOptionalCaseSection(partition.optional),
    renderVlmCaseSection(partition.vlm),
    renderCapacityCaseSection(capacityCases),
    renderCustomCaseSection(),
    renderSingleParameterSection(partition.singles),
    renderCaseSection("参数组合用例", "一个 case 同时验证多个参数是否能共同工作。组合 case 会影响多个参数的兼容性判断。", partition.combos),
    renderCaseSection("基础协议与场景用例", "这些 case 主要验证 model、messages、多轮对话、工具链路或响应头，不只对应某一个参数。", partition.scenarios)
  ].join("");
  syncBulkCheckboxes(els.caseGroups);
  renderSelectedCaseCount();
}

function renderOptionalCaseSection(cases) {
  if (!cases.length) return "";
  return renderCaseSection(
    "可选扩展用例",
    "这些 case 会验证 provider 或模型扩展能力，例如前缀续写、stream 与 tools 组合；默认不选。",
    cases
  );
}

function renderVlmCaseSection(cases) {
  if (!cases.length) return "";
  return renderCaseSection(
    "VLM 图像用例（可选）",
    "这部分会使用图像输入，需要视觉模型。默认不选；切到 VLM 模型后再开启。",
    cases
  );
}

function renderCapacityCaseSection(cases) {
  if (!cases.length) return "";
  return renderCaseSection(
    "最大Max Output / 最大Total Context 测试（可选）",
    "分别探测 最大Max Output 和 最大Total Context；同一模型内逐档串行，不同 target 可并发。默认不选，避免额外消耗额度。",
    cases
  );
}

function renderCaseTable(cases) {
  if (!cases.length) return '<div class="case-empty">暂无 case</div>';
  return `
    <div class="case-table" role="list" aria-label="测试用例">
      <div class="case-table__body">
        ${cases.map((testCase) => renderCaseItem(testCase)).join("")}
      </div>
    </div>
  `;
}

function renderContextualCaseTable(cases, context = {}) {
  if (!cases.length) return '<div class="case-empty">暂无 case</div>';
  return `
    <div class="case-table" role="list" aria-label="测试用例">
      <div class="case-table__body">
        ${cases.map((testCase) => renderCaseItem(testCase, context)).join("")}
      </div>
    </div>
  `;
}

function renderCaseOverview(data, partition) {
  const singleCount = Array.from(partition.singles.values()).reduce((sum, cases) => sum + cases.length, 0);
  const focusParamCount = new Set((data.cases || []).flatMap(focusParametersForCase)).size;
  const vlmText = partition.vlm.length ? `，VLM ${partition.vlm.length} 个可选` : "";
  return `
    <div class="case-overview">
      <div>
        <strong>先选参数，再微调用例</strong>
        <p>单参数 ${singleCount} 个，组合 ${partition.combos.length} 个，基础场景 ${partition.scenarios.length} 个${vlmText}；默认勾选常规 case，VLM 和 最大Max Output / 最大Total Context 测试按需开启。</p>
      </div>
      <span class="mono">${focusParamCount} 个重点参数有对应 case</span>
    </div>
  `;
}

function renderCustomCaseSection() {
  if (!state.customCases.length) return "";
  return renderCaseSection("自定义 payload", "这些 case 只保存在当前页面会话中，可直接复制 curl 或与内置用例一起运行。", state.customCases);
}

function renderSingleParameterSection(singleMap) {
  const orderedEntries = Array.from(singleMap.entries()).sort(([left], [right]) => left.localeCompare(right));
  const total = orderedEntries.reduce((sum, [, cases]) => sum + cases.length, 0);
  const allSingleCaseIds = orderedEntries.flatMap(([, cases]) => caseIdsForCases(cases));
  return `
    <details class="case-group parameter-case-group">
      <summary>
        <span class="case-group__summary-main">
          <span class="case-group__summary-title">单参数用例</span>
          ${renderBulkSelect(allSingleCaseIds, "本部分", "case-group__select")}
        </span>
        <span class="muted mono">${total} 个 case</span>
      </summary>
      <div class="parameter-case-list">
        ${orderedEntries.map(([parameter, cases]) => `
          <section class="parameter-case-block">
            <div class="parameter-case-block__head">
              <code>${escapeHtml(parameter)}</code>
              <span class="parameter-case-block__meta">
                ${renderBulkSelect(caseIdsForCases(cases), "本参数", "case-group__select")}
                <span>${cases.length} 个 case</span>
              </span>
            </div>
            ${renderContextualCaseTable(cases, { groupParameter: parameter })}
          </section>
        `).join("")}
      </div>
    </details>
  `;
}

function renderCaseSection(title, description, cases) {
  return `
    <details class="case-group">
      <summary>
        <span class="case-group__summary-main">
          <span class="case-group__summary-title">${escapeHtml(title)}</span>
          ${renderBulkSelect(caseIdsForCases(cases), "本部分", "case-group__select")}
        </span>
        <span class="muted mono">${cases.length} 个 case</span>
      </summary>
      <p class="case-section-note">${escapeHtml(description)}</p>
      ${renderCaseTable(cases)}
    </details>
  `;
}

function renderCaseItem(testCase, context = {}) {
  const checked = state.selectedCaseIds.has(testCase.case_id) ? "checked" : "";
  const capacityDisplay = isCapacityCase(testCase) ? capacityCaseDisplay(testCase) : null;
  const focusParams = focusParametersForCase(testCase);
  const foundationalParams = foundationalParametersForCase(testCase);
  const displayParams = capacityDisplay
    ? testCase.parameters || []
    : [...focusParams, ...foundationalParams];
  const params = displayParams.map((param) => {
    const chipClass = foundationalParams.includes(param) ? "is-foundational" : "is-focus";
    return `<span class="${chipClass}">${escapeHtml(param)}</span>`;
  }).join("");
  const parameterChips = params;
  const title = contextualCaseTitle(capacityDisplay?.title || caseTitle(testCase), context);
  const intent = caseIntentText(testCase, context, capacityDisplay, title);

  return `
    <div class="case-row" role="listitem">
      <label class="case-row__select" aria-label="选择 ${escapeHtml(testCase.case_id)}">
        <input type="checkbox" data-case-id="${escapeHtml(testCase.case_id)}" ${checked} ${state.isRunning ? "disabled" : ""} />
      </label>
      <div class="case-row__main">
        <div class="case-row__case">
          <strong class="case-row__title" title="${escapeHtml(title)}">${escapeHtml(title)}</strong>
          ${intent ? `<span class="case-row__intent">${escapeHtml(intent)}</span>` : ""}
          ${parameterChips ? `<div class="case-row__chips">
            ${parameterChips}
          </div>` : ""}
        </div>
      </div>
      <div class="case-row__actions">
        <button class="case-copy-curl" type="button" data-action="copy-case-curl" data-case-id="${escapeHtml(testCase.case_id)}" title="复制 curl">curl</button>
        <button class="case-copy-curl" type="button" data-action="toggle-case-payload" data-case-id="${escapeHtml(testCase.case_id)}" title="查看 payload">payload</button>
        ${testCase.custom && !testCase.capacity_case ? `<button class="case-copy-curl danger" type="button" data-action="remove-custom-case" data-case-id="${escapeHtml(testCase.case_id)}" title="删除自定义 case">删</button>` : ""}
      </div>
      <div class="case-payload is-hidden" data-case-payload="${escapeHtml(testCase.case_id)}">
        ${testCase.headers ? `<p class="case-section-note">请求 Headers</p>` : ""}
        ${testCase.headers ? `<pre class="case-payload__code">${syntaxJson(testCase.headers)}</pre>` : ""}
        <p class="case-section-note">请求 Body</p>
        <pre class="case-payload__code">${syntaxJson(testCase.payload)}</pre>
      </div>
    </div>
  `;
}

function renderSelectedCaseCount() {
  const data = state.providerCases[currentCaseCacheKey()];
  const cases = allProviderCases();
  const total = cases.length;
  const selected = cases.filter((testCase) => state.selectedCaseIds.has(testCase.case_id)).length;
  const focusCount = selectedFocusParameterCount(data);
  const focusTotal = new Set(cases.flatMap(focusParametersForCase)).size;
  const customText = state.customCases.length ? ` · 自定义 ${state.customCases.length} 个` : "";
  els.selectedCaseCount.textContent = `已选 ${selected} / ${total} 个 case · 覆盖 ${focusCount} / ${focusTotal} 个重点参数${customText}`;
  updateRunAvailability();
}

function updateRunAvailability() {
  if (!els.runTests) return;
  renderBaselineSelector();
  renderBatchMode();
  renderBaseUrlPreset(els.baseUrl?.value || "");
  const providerId = currentProviderId();
  const cases = allProviderCases(providerId);
  const caseControlsDisabled = state.isRunning || state.isCaseLoading || !providerId || !cases.length;
  els.selectAllCases.disabled = caseControlsDisabled;
  els.clearAllCases.disabled = caseControlsDisabled;
  els.addCustomPayload.disabled = state.isRunning || state.isCaseLoading || !providerId;
  els.clearCustomPayload.disabled = state.isRunning || state.isCaseLoading || !providerId;
  if (els.batchTargets) {
    els.batchTargets.disabled = state.isRunning || !state.batchModeEnabled;
  }
  if (els.batchConcurrency) {
    els.batchConcurrency.disabled = state.isRunning;
  }
  if (els.batchModeToggle) {
    els.batchModeToggle.disabled = state.isRunning;
  }
  if (els.stopTests) {
    els.stopTests.disabled = !state.isRunning;
  }

  if (state.isRunning) {
    els.runTests.disabled = true;
    return;
  }
  if (providerId) {
    els.runTests.disabled = state.isCaseLoading || !cases.length || state.selectedCaseIds.size === 0;
    return;
  }
  els.runTests.disabled = state.selectedEndpointId === "anthropic_messages";
}

function getResultsForChannel() {
  const proxy = getProxyConfig();
  const providerId = currentProviderId();
  if (providerId) {
    if (!allProviderCases(providerId).length || !state.selectedCaseIds.size) return [];
    return selectedProviderCases(providerId)
      .map((testCase, index) => {
        const parameters = testCase.parameters?.length ? testCase.parameters : ["payload"];
        const supportConclusion = inferSiliconFlowConclusion(testCase);
        const meta = supportConclusionMeta[supportConclusion];
        const isExtension = parameters.some((param) => ["top_k", "min_p", "repetition_penalty", "enable_thinking", "thinking", "thinking.budget_tokens", "thinking_budget", "preserve_thinking", "reasoning", "reasoning.enabled", "reasoning.effort", "reasoning.summary", "reasoning_effort", "reasnoing_effort", "reasoning_split", "chat_template_kwargs.enable_thinking", "tool_stream", "enable_code_interpreter", "enable_search", "search_options", "skill", "user_id", "reasoning_content", "messages[].prefix", "messages[].reasoning_content", "tools[].function.strict", "tools[].function.parameters", "stream_options.include_usage", "x-siliconcloud-trace-id", "X-DashScope-DataInspection"].includes(param));
        const isStream = parameters.includes("stream");
        const diffCount = isExtension ? 2 : isStream ? 1 : 0;
        return {
          case_id: testCase.case_id,
          channel_id: state.selectedChannelId,
          parameter: parameters.join(" + "),
          category: testCase.category || "case",
          support_conclusion: supportConclusion,
          status: meta.status,
          http_status: meta.httpStatus,
          latency_ms: 300 + ((index * 41) % 240),
          diff_count: diffCount,
          message: meta.note,
          proxy,
          source_case: testCase
        };
      });
  }

  if (state.selectedChannelId === "deepseek") {
    return MOCK_RESULTS
      .filter((result) => result.channel_id === "deepseek")
      .map((result) => {
        const supportConclusion = inferMockConclusion(result);
        const meta = supportConclusionMeta[supportConclusion];
        return {
          ...result,
          support_conclusion: supportConclusion,
          http_status: meta.httpStatus,
          proxy,
          message: result.message || meta.note
        };
      });
  }

  const channel = getSelectedChannel();
  const params = flattenParameters(channel);
  return params.map(({ parameter, category }, index) => ({
    case_id: `${channel.channel_id}:${parameter}`,
    channel_id: channel.channel_id,
    parameter,
    category: category.toLowerCase(),
    support_conclusion: index % 9 === 0 ? "ignored" : "supported",
    status: index % 9 === 0 ? "warning" : "accepted",
    http_status: 200,
    latency_ms: 320 + ((index * 37) % 190),
    diff_count: index % 5 === 0 ? 1 : 0,
    message: index % 9 === 0 ? supportConclusionMeta.ignored.note : supportConclusionMeta.supported.note,
    proxy
  }));
}

async function readRunStream(response, onEvent) {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("当前浏览器不支持流式读取测试结果。");
  }
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      onEvent(JSON.parse(trimmed));
    }
    if (done) break;
  }
  const tail = buffer.trim();
  if (tail) onEvent(JSON.parse(tail));
}

function responseForResult(result) {
  const existing = MOCK_RESPONSES[result.case_id];
  const hasRealRunResponse = hasResponseBody(result) || result.raw_response || result.request_body || result.response_headers;
  if (existing && !hasRealRunResponse) return existing;

  const selectedBaseline = selectedBaselineRecord();
  const baselineResult = matchingBaselineResult(result, selectedBaseline);
  const baseline = baselineResponseForResult(result, selectedBaseline);
  const realResponse = result.response_body || result.raw_response || (result.error ? { error: { message: result.error } } : null);
  const channelResponse = realResponse || (result.diff_count
    ? {
      ...MOCK_RESPONSES["deepseek:thinking"].channel_response,
      model: els.modelName.value
    }
    : {
      ...MOCK_RESPONSES["deepseek:temperature"].channel_response,
      model: els.modelName.value
    });

  return {
    request_body: result.request_body || result.source_case?.payload || {
      model: els.modelName.value,
      messages: [{ role: "user", content: "Say hi" }],
      [result.parameter]: true
    },
    request_headers: result.request_headers || result.source_case?.headers || null,
    baseline_response: baseline,
    baseline_label: baseline
      ? baselineLabel(selectedBaseline)
      : `${baselineLabel(selectedBaseline)}（无匹配 case）`,
    baseline_meta: baselineResult ? {
      report_id: selectedBaseline.id,
      channel_name: selectedBaseline.channel_name,
      model: selectedBaseline.model,
      generated_at: selectedBaseline.generated_at,
      http_status: baselineResult.http_status
    } : null,
    channel_response: channelResponse
  };
}

function baselineStateForResult(result, baseline = selectedBaselineRecord()) {
  if (!baseline) {
    return { status: "missing", label: "No baseline" };
  }
  if (!historyRecordHasBaselinePayload(baseline)) {
    return { status: "no_payload", label: "baseline 无响应体" };
  }
  if (!matchingBaselineResult(result, baseline)) {
    return { status: "case_missing", label: "baseline 无同名 case" };
  }
  return { status: "ready", label: "baseline 命中" };
}

function diffSummaryForResult(result) {
  const stateForBaseline = baselineStateForResult(result);
  if (stateForBaseline.status !== "ready") {
    return stateForBaseline.label;
  }
  return result.diff_count ? `${result.diff_count} 处差异` : "结构一致";
}

function historyStats(results = []) {
  const expectedResults = results.filter(matchesExpectedResult);
  const unexpectedResults = results.filter((result) => !matchesExpectedResult(result));
  return {
    total: results.length,
    expectedPass: expectedResults.length,
    unexpected: unexpectedResults.length,
    unexpectedRejected: unexpectedResults.filter((result) => result.support_conclusion === "rejected_400").length,
    unexpectedRequestFailed: unexpectedResults.filter((result) => result.support_conclusion === "request_failed").length,
    unexpectedSchemaMismatch: unexpectedResults.filter((result) => result.support_conclusion === "schema_mismatch").length,
    supported: results.filter((result) => result.support_conclusion === "supported").length,
    ignored: results.filter((result) => result.support_conclusion === "ignored").length,
    permissionLimited: results.filter((result) => result.support_conclusion === "permission_limited").length,
    rejected: results.filter((result) => result.support_conclusion === "rejected_400").length,
    requestFailed: results.filter((result) => result.support_conclusion === "request_failed").length,
    schemaMismatch: results.filter((result) => result.support_conclusion === "schema_mismatch").length,
    diffs: results.filter((result) => result.diff_count > 0).length,
    baselineReady: results.filter((result) => hasResponseBody(result)).length
  };
}

function createEmptyAggregateStats() {
  return {
    reports: 0,
    total: 0,
    expectedPass: 0,
    unexpected: 0,
    unexpectedRejected: 0,
    unexpectedRequestFailed: 0,
    unexpectedSchemaMismatch: 0,
    supported: 0,
    ignored: 0,
    permissionLimited: 0,
    rejected: 0,
    requestFailed: 0,
    schemaMismatch: 0,
    diffs: 0,
    baselineReady: 0,
    providers: new Map(),
    models: new Set(),
    latestAt: null
  };
}

function aggregateHistory(items = []) {
  const aggregate = createEmptyAggregateStats();
  aggregate.reports = items.length;
  for (const record of items) {
    const stats = record.stats || historyStats(record.results || []);
    const derivedStats = historyStats(record.results || []);
    aggregate.total += stats.total || 0;
    aggregate.expectedPass += stats.expectedPass ?? derivedStats.expectedPass;
    aggregate.unexpected += stats.unexpected ?? derivedStats.unexpected;
    aggregate.unexpectedRejected += stats.unexpectedRejected ?? derivedStats.unexpectedRejected;
    aggregate.unexpectedRequestFailed += stats.unexpectedRequestFailed ?? derivedStats.unexpectedRequestFailed;
    aggregate.unexpectedSchemaMismatch += stats.unexpectedSchemaMismatch ?? derivedStats.unexpectedSchemaMismatch;
    aggregate.supported += stats.supported || 0;
    aggregate.ignored += stats.ignored || 0;
    aggregate.permissionLimited += stats.permissionLimited || 0;
    aggregate.rejected += stats.rejected || 0;
    aggregate.requestFailed += stats.requestFailed || 0;
    aggregate.schemaMismatch += stats.schemaMismatch || 0;
    aggregate.diffs += stats.diffs || 0;
    aggregate.baselineReady += stats.baselineReady || 0;
    const providerName = record.channel_name || record.channel_id || "未知渠道";
    aggregate.providers.set(providerName, (aggregate.providers.get(providerName) || 0) + 1);
    if (record.model) aggregate.models.add(record.model);
    if (record.generated_at && (!aggregate.latestAt || new Date(record.generated_at) > new Date(aggregate.latestAt))) {
      aggregate.latestAt = record.generated_at;
    }
  }
  return aggregate;
}

function historyChannelLabel(record = {}) {
  return record.channel_name || record.channel_id || record.provider || "未知渠道";
}

function historyChannelKey(record = {}) {
  return record.channel_id || record.provider || historyChannelLabel(record);
}

function historyModelLabel(record = {}) {
  return record.model || "未记录模型";
}

function historyModelKey(record = {}) {
  return record.model || "__missing_model";
}

function historyEndpointLabel(record = {}) {
  return record.endpoint_label || record.endpoint_id || "Chat Completions";
}

function historyEndpointKey(record = {}) {
  return record.endpoint_id || record.endpoint_label || "__missing_endpoint";
}

function historyFilterMeta(type, record) {
  if (type === "channel") {
    return { key: historyChannelKey(record), label: historyChannelLabel(record) };
  }
  if (type === "model") {
    return { key: historyModelKey(record), label: historyModelLabel(record) };
  }
  return { key: historyEndpointKey(record), label: historyEndpointLabel(record) };
}

function historyFilterOptions(items = [], type) {
  const options = new Map();
  for (const record of items) {
    const meta = historyFilterMeta(type, record);
    const current = options.get(meta.key) || { ...meta, count: 0 };
    current.count += 1;
    options.set(meta.key, current);
  }
  return Array.from(options.values()).sort((left, right) =>
    right.count - left.count || left.label.localeCompare(right.label)
  );
}

function historyMatchesFilters(record) {
  return ["channel", "model", "endpoint"].every((type) => {
    const selected = state.historyFilters[type] || "all";
    return selected === "all" || historyFilterMeta(type, record).key === selected;
  });
}

function filteredHistoryItems(items = []) {
  return items.filter(historyMatchesFilters);
}

function normalizeHistoryFilters(items = []) {
  for (const type of ["channel", "model", "endpoint"]) {
    const selected = state.historyFilters[type] || "all";
    if (selected === "all") continue;
    const exists = items.some((record) => historyFilterMeta(type, record).key === selected);
    if (!exists) state.historyFilters[type] = "all";
  }
}

function renderHistoryFilters(items = [], filteredItems = items) {
  if (!els.historyFilters) return;
  const groups = [
    ["channel", "渠道"],
    ["model", "模型"],
    ["endpoint", "Endpoint"]
  ];
  els.historyFilters.innerHTML = `
    <div class="history-filter-head">
      <span class="mono">${filteredItems.length} / ${items.length}</span>
      <span class="muted">筛选后报告</span>
      <button class="history-filter-reset" type="button" data-history-filter-reset ${Object.values(state.historyFilters).every((value) => value === "all") ? "disabled" : ""}>重置</button>
    </div>
    ${groups.map(([type, label]) => {
      const options = historyFilterOptions(items, type);
      const selected = state.historyFilters[type] || "all";
      return `
        <div class="history-filter-group">
          <span>${escapeHtml(label)}</span>
          <div class="history-filter-buttons">
            <button class="history-filter-button ${selected === "all" ? "is-active" : ""}" type="button" data-history-filter="${type}" data-history-filter-value="all">全部 <em>${items.length}</em></button>
            ${options.map((option) => `
              <button class="history-filter-button ${selected === option.key ? "is-active" : ""}" type="button" data-history-filter="${type}" data-history-filter-value="${escapeHtml(option.key)}">
                ${escapeHtml(option.label)} <em>${option.count}</em>
              </button>
            `).join("")}
          </div>
        </div>
      `;
    }).join("")}
  `;
}

function percentText(value, total) {
  if (!total) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}

function renderHistorySummary(items) {
  const aggregate = aggregateHistory(items);
  const providerText = Array.from(aggregate.providers.entries())
    .sort((left, right) => right[1] - left[1])
    .map(([name, count]) => `${name} ${count}`)
    .join(" · ") || "—";
  const latestText = aggregate.latestAt ? formatDateTime(aggregate.latestAt) : "—";
  els.historySummary.innerHTML = `
    <div class="report-summary-grid">
      <article class="report-summary-card">
        <span>运行次数</span>
        <strong>${aggregate.reports}</strong>
        <small>${escapeHtml(providerText)}</small>
      </article>
      <article class="report-summary-card">
        <span>总 case</span>
        <strong>${aggregate.total}</strong>
        <small>模型 ${aggregate.models.size} 个 · 最近 ${escapeHtml(latestText)}</small>
      </article>
      <article class="report-summary-card report-summary-card--pass">
        <span>符合预期</span>
        <strong>${aggregate.expectedPass}</strong>
        <small>${percentText(aggregate.expectedPass, aggregate.total)}</small>
      </article>
      <article class="report-summary-card report-summary-card--warn">
        <span>接受未证明/权限</span>
        <strong>${aggregate.ignored}</strong>
        <small>${percentText(aggregate.ignored, aggregate.total)}</small>
      </article>
      <article class="report-summary-card report-summary-card--fail">
        <span>预期外</span>
        <strong>${aggregate.unexpected}</strong>
        <small>400 ${aggregate.unexpectedRejected} · 失败 ${aggregate.unexpectedRequestFailed} · 断言 ${aggregate.unexpectedSchemaMismatch}</small>
      </article>
      <article class="report-summary-card report-summary-card--diff">
        <span>可作 baseline</span>
        <strong>${aggregate.baselineReady}</strong>
        <small>差异 ${aggregate.diffs} · ${percentText(aggregate.baselineReady, aggregate.total)}</small>
      </article>
    </div>
  `;
}

function readHistory() {
  try {
    const parsed = JSON.parse(readStorageItem(HISTORY_STORAGE_KEY, LEGACY_HISTORY_STORAGE_KEYS) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeHistory(items) {
  const deduped = [];
  const seen = new Set();
  for (const item of items) {
    if (!item?.id || seen.has(item.id)) continue;
    seen.add(item.id);
    deduped.push(item);
  }
  const candidates = deduped.slice(0, MAX_HISTORY_ITEMS);
  const attempts = [
    { items: candidates, compacted: false },
    { items: candidates.map(compactHistoryRecord), compacted: true },
    { items: candidates.slice(0, 60).map(compactHistoryRecord), compacted: true },
    { items: candidates.slice(0, 30).map(compactHistoryRecord), compacted: true },
    { items: candidates.slice(0, 10).map(compactHistoryRecord), compacted: true },
    { items: candidates.slice(0, 1).map(compactHistoryRecord), compacted: true }
  ];

  let lastError = null;
  for (const attempt of attempts) {
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(attempt.items));
      return {
        saved: true,
        compacted: attempt.compacted,
        savedCount: attempt.items.length,
        droppedCount: Math.max(0, candidates.length - attempt.items.length)
      };
    } catch (error) {
      lastError = error;
    }
  }

  console.warn("Failed to persist run history", lastError);
  return {
    saved: false,
    compacted: true,
    savedCount: 0,
    droppedCount: candidates.length,
    error: lastError
  };
}

function truncateHistoryString(value, limit = HISTORY_STRING_LIMIT) {
  if (typeof value !== "string" || value.length <= limit) return value;
  return `${value.slice(0, limit)}\n\n[truncated ${value.length - limit} chars for local history storage]`;
}

function compactHistoryValue(value, depth = 0) {
  if (typeof value === "string") return truncateHistoryString(value);
  if (!value || typeof value !== "object") return value;
  if (depth > 8) return "[truncated nested object for local history storage]";
  if (Array.isArray(value)) {
    return value.map((item) => compactHistoryValue(item, depth + 1));
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, compactHistoryValue(item, depth + 1)])
  );
}

function compactHistoryResult(result = {}) {
  const responseBody = hasResponseBody(result) ? compactHistoryValue(result.response_body) : null;
  return {
    ...result,
    request_body: compactHistoryValue(result.request_body),
    response_body: responseBody,
    raw_response: responseBody ? "" : truncateHistoryString(result.raw_response || "", HISTORY_RAW_RESPONSE_LIMIT),
    response_headers: compactHistoryValue(result.response_headers),
    request_headers: compactHistoryValue(result.request_headers)
  };
}

function compactHistoryRecord(record = {}) {
  return {
    ...record,
    results: (record.results || []).map(compactHistoryResult)
  };
}

function createHistoryRecord(context = null, sourceResults = state.completedResults, idSuffix = "") {
  const channel = context?.channel_id
    ? CHANNEL_TEMPLATES.find((item) => item.channel_id === context.channel_id) || getSelectedChannel()
    : getSelectedChannel();
  const results = sourceResults.map((rawResult) => {
    const result = enrichResultAxes(rawResult);
    return {
      ...result,
    title: resultTitle(result),
    response_body: result.response_body,
    raw_response: result.raw_response,
    response_headers: result.response_headers,
    source_case: result.source_case ? {
      case_id: result.source_case.case_id,
      title: caseTitle(result.source_case),
      category: result.source_case.category,
      parameters: result.source_case.parameters,
      custom: Boolean(result.source_case.custom),
      payload: result.source_case.payload,
      expect: result.source_case.expect
    } : null
    };
  });
  const normalizedResults = results.map((result) => canonicalResultFromRaw(result));
  const generatedAt = new Date().toISOString();
  const endpoint = context?.endpoint_id ? endpointTemplateById(context.endpoint_id) : getSelectedEndpointTemplate();
  const baseline = selectedBaselineRecord();
  const baselineReady = baseline && historyRecordHasBaselinePayload(baseline);
  return {
    id: `report_${Date.now()}${idSuffix}`,
    generated_at: generatedAt,
    endpoint_id: context?.endpoint_id || state.selectedEndpointId,
    endpoint_label: context?.endpoint_label || endpoint.label,
    channel_id: context?.channel_id || channel.channel_id,
    channel_name: context?.channel_name || channel.name,
    provider: context?.provider || currentProviderId() || channel.provider_id || runnableProviderByChannel[channel.channel_id] || channel.channel_id,
    base_url: context?.base_url || els.baseUrl.value.trim(),
    model: context?.model || els.modelName.value.trim(),
    baseline_report_id: baseline?.id || "",
    baseline_label: baselineLabel(baseline),
    baseline_ready: Boolean(baselineReady),
    baseline_status: baselineReady ? "ready" : "exploratory",
    proxy: state.lastRunProxy || getProxyConfig(),
    stats: historyStats(normalizedResults),
    results: normalizedResults
  };
}

function saveHistoryRecord(sourceResults = state.completedResults, batchRunRecords = state.batchRunRecords) {
  if (!sourceResults.length) return null;
  const items = readHistory();
  const records = batchRunRecords.length
    ? batchRunRecords.map((entry, index) => createHistoryRecord(entry.context, entry.results, `_batch_${index + 1}`))
    : [createHistoryRecord(null, sourceResults)];
  const record = records[0];
  state.lastReportRecord = record;
  const writeResult = writeHistory([...records, ...items]);
  renderHistory();
  if (!writeResult.saved) {
    showToast("本次结果已展示，但历史报告写入失败：浏览器本地存储空间不足。");
  } else if (writeResult.compacted || writeResult.droppedCount > 0) {
    showToast(writeResult.droppedCount > 0
      ? `本次结果已保存；本地历史空间不足，已保留最近 ${writeResult.savedCount} 条。`
      : "本次结果已保存；较大的响应内容已压缩。");
  } else if (records.length > 1) {
    showToast(`批量测试已保存 ${records.length} 份历史报告。`);
  }
  return record;
}

function mergeImportedHistory(records) {
  const existing = readHistory();
  const existingIds = new Set(existing.map((record) => record.id));
  const newRecords = records.filter((record) => !existingIds.has(record.id));
  writeHistory([...records, ...existing]);
  renderHistory();
  return newRecords.length;
}

function importedRecordsFromPayload(parsed, sourceName) {
  if (Array.isArray(parsed?.records)) {
    return parsed.records.map((record, index) => normalizeHistoryRecord(record, { sourceName: `${sourceName}#${index + 1}` }));
  }
  if (Array.isArray(parsed?.suites)) {
    return parsed.suites.map((suite, index) => normalizeHistoryRecord({
      ...suite,
      generated_at: parsed.finished_at || parsed.started_at,
      imported_from: sourceName
    }, { sourceName: `${sourceName}#${index + 1}` }));
  }
  return [normalizeHistoryRecord(parsed, { sourceName })];
}

function toastImportedRecords(records, importedCount) {
  const baselineReadyCount = records.filter(historyRecordHasBaselinePayload).length;
  showToast(`已导入 ${importedCount || records.length} 份报告；其中 ${baselineReadyCount} 份可作为结构 baseline。`);
}

async function autoImportOriginalBaselines() {
  try {
    const response = await fetch("./outputs/original-baselines.import.json", { cache: "no-store" });
    if (!response.ok) return;
    const parsed = await response.json();
    const records = importedRecordsFromPayload(parsed, "original-baselines.import.json");
    const importedCount = mergeImportedHistory(records);
    if (importedCount > 0) showToast(`已自动载入 ${importedCount} 份原厂 baseline 报告。`);
  } catch {
    // 原厂 baseline 文件不存在或格式不完整时，不影响页面正常使用。
  }
}

async function importHistoryFiles(files) {
  const records = [];
  const failures = [];
  for (const file of Array.from(files || [])) {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      records.push(...importedRecordsFromPayload(parsed, file.name));
    } catch (error) {
      failures.push(`${file.name}: ${error.message}`);
    }
  }
  if (records.length) toastImportedRecords(records, mergeImportedHistory(records));
  if (failures.length) {
    showToast(`部分报告导入失败：${failures.slice(0, 2).join("；")}`);
  }
}

function historyRecordMarkdown(record) {
  const stats = { ...historyStats(record.results || []), ...(record.stats || {}) };
  const lines = [
    `# Noctua 历史测试报告：${record.channel_name}`,
    "",
    `时间：${formatDateTime(record.generated_at)}`,
    `Endpoint：${record.endpoint_label || record.endpoint_id || "Chat Completions"}`,
    `Base URL：${record.base_url || "—"}`,
    `Model：${record.model || "—"}`,
    `baseline：${record.baseline_label || "未选择历史 baseline"}`,
    `代理配置：${proxySummary(record.proxy)}`,
    "",
    `总计：${stats.total}；符合预期：${stats.expectedPass}；预期外：${stats.unexpected}；支持：${stats.supported}；接受未证明：${stats.ignored}；400：${stats.rejected}；请求失败：${stats.requestFailed}；断言失败：${stats.schemaMismatch || 0}；结构差异：${stats.diffs}`,
    "",
    ...capacitySummaryMarkdownLines(record.results || []),
    ...thinkingProbeAnalysisLines(record.results || []),
    ...thinkingCloseAnalysisLines(record.results || []),
    "| Case | 参数 | 分类 | 测试结果 | 实际结论 | HTTP 状态 | 结构差异 |",
    "|---|---|---|---|---|---|---|",
    ...record.results.map((result) =>
      `| \`${result.case_id}\` | \`${result.parameter}\` | ${categoryLabel(result.category)} | ${expectationLabel(result)} | ${conclusionMeta(result).label} | ${result.http_status || conclusionMeta(result).httpStatus || "—"} | ${result.diff_count ? `${result.diff_count} 个字段差异` : "—"} |`
    ),
    "",
    ...originalChannelReportMarkdown(record)
  ];
  return lines.join("\n");
}

function currentRunMarkdown(record) {
  if (!record) return "";
  const stats = { ...historyStats(record.results || []), ...(record.stats || {}) };
  const unexpectedResults = (record.results || []).filter((result) => !matchesExpectedResult(result));
  const diffResults = (record.results || []).filter((result) => result.diff_count > 0);
  const topUnexpected = unexpectedResults.slice(0, 12);
  const lines = [
    `# ${record.channel_name || record.provider || "Provider"} 评测结果`,
    "",
    "## 概览",
    "",
    `- 报告 ID：${record.id}`,
    `- 生成时间：${formatDateTime(record.generated_at)}`,
    `- Endpoint：${record.endpoint_label || record.endpoint_id || "Chat Completions"}`,
    `- Provider：${record.provider || record.channel_id || "—"}`,
    `- Base URL：${record.base_url || "—"}`,
    `- Model：${record.model || "—"}`,
    `- baseline：${record.baseline_label || "未选择历史 baseline"}`,
    `- 代理配置：${proxySummary(record.proxy)}`,
    "",
    "## 汇总",
    "",
    `- 总计：${stats.total || 0}`,
    `- 符合预期：${stats.expectedPass || 0}`,
    `- 预期外：${stats.unexpected || 0}`,
    `- 支持：${stats.supported || 0}`,
    `- 接受未证明/权限受限：${(stats.ignored || 0) + (stats.permissionLimited || 0)}`,
    `- 400 拒绝：${stats.rejected || 0}`,
    `- 请求失败/断言失败：${(stats.requestFailed || 0) + (stats.schemaMismatch || 0)}`,
    `- 结构差异：${stats.diffs || 0}`,
    "",
    ...capacitySummaryMarkdownLines(record.results || []),
    ...thinkingProbeAnalysisLines(record.results || []),
    ...thinkingCloseAnalysisLines(record.results || []),
    "## 预期外明细",
    ""
  ];
  if (topUnexpected.length) {
    lines.push("| Case | 参数 | 实际结论 | HTTP | 说明 |");
    lines.push("|---|---|---|---|---|");
    lines.push(...topUnexpected.map((result) =>
      `| \`${result.case_id}\` | \`${result.parameter}\` | ${conclusionMeta(result).label} | ${result.http_status || conclusionMeta(result).httpStatus || "—"} | ${escapeMarkdownCell(result.message || assertionSummary(result.assertions))} |`
    ));
    if (unexpectedResults.length > topUnexpected.length) {
      lines.push("");
      lines.push(`还有 ${unexpectedResults.length - topUnexpected.length} 条预期外结果，请在 Noctua 历史报告中查看。`);
    }
  } else {
    lines.push("本次评测未发现预期外结果。");
  }
  lines.push("");
  lines.push("## 结构差异");
  lines.push("");
  if (diffResults.length) {
    lines.push("| Case | 参数 | 差异数量 |");
    lines.push("|---|---|---|");
    lines.push(...diffResults.slice(0, 20).map((result) =>
      `| \`${result.case_id}\` | \`${result.parameter}\` | ${result.diff_count} |`
    ));
    if (diffResults.length > 20) {
      lines.push("");
      lines.push(`还有 ${diffResults.length - 20} 条结构差异结果，请在 Noctua 历史报告中查看。`);
    }
  } else {
    lines.push("本次评测未发现结构差异。");
  }
  lines.push("");
  lines.push("## 全量结果");
  lines.push("");
  lines.push("| Case | 参数 | 分类 | 测试结果 | 实际结论 | HTTP | 结构差异 |");
  lines.push("|---|---|---|---|---|---|---|");
  lines.push(...(record.results || []).map((result) =>
    `| \`${result.case_id}\` | \`${result.parameter}\` | ${categoryLabel(result.category)} | ${expectationLabel(result)} | ${conclusionMeta(result).label} | ${result.http_status || conclusionMeta(result).httpStatus || "—"} | ${result.diff_count ? `${result.diff_count} 个字段差异` : "—"} |`
  ));
  lines.push("");
  lines.push(...originalChannelReportMarkdown(record));
  return lines.join("\n");
}

function escapeMarkdownCell(value) {
  return String(value || "—").replace(/\|/g, "\\|").replace(/\n/g, " ").slice(0, 180);
}

function originalChannelReportMarkdown(record) {
  const lines = [
    "## 原始渠道测试报告",
    "",
    `渠道：${historyChannelLabel(record)}`,
    `模型：${historyModelLabel(record)}`,
    `Endpoint：${historyEndpointLabel(record)}`,
    `Base URL：${record.base_url || "—"}`,
    ""
  ];
  for (const result of record.results || []) {
    const meta = conclusionMeta(result);
    const sourceCase = result.source_case || {};
    lines.push(`### ${resultTitle(result)}`);
    lines.push("");
    lines.push(`- Case ID：\`${result.case_id}\``);
    lines.push(`- 参数：\`${result.parameter || "payload"}\``);
    lines.push(`- 分类：${categoryLabel(result.category)}`);
    lines.push(`- 测试结果：${expectationLabel(result)}`);
    lines.push(`- 实际结论：${meta.label}`);
    lines.push(`- HTTP：${result.http_status || meta.httpStatus || "—"}`);
    lines.push(`- 延迟：${result.latency_ms ? `${result.latency_ms}ms` : "—"}`);
    lines.push(`- 消息：${result.message || result.error || "—"}`);
    lines.push("");
    lines.push("#### 请求 Body");
    lines.push(markdownFence(result.request_body || sourceCase.payload || null, "json"));
    if (result.request_headers || sourceCase.headers) {
      lines.push("");
      lines.push("#### 请求 Headers");
      lines.push(markdownFence(result.request_headers || sourceCase.headers, "json"));
    }
    if (sourceCase.expect) {
      lines.push("");
      lines.push("#### 预期断言");
      lines.push(markdownFence(sourceCase.expect, "json"));
    }
    lines.push("");
    lines.push(`#### ${historyChannelLabel(record)} 原始响应`);
    if (hasResponseBody(result)) {
      lines.push(markdownFence(result.response_body, "json"));
    } else {
      lines.push(markdownFence(result.raw_response || null, result.raw_response ? "text" : "json"));
    }
    if (result.raw_response && hasResponseBody(result)) {
      lines.push("");
      lines.push("#### Raw Response");
      lines.push(markdownFence(result.raw_response, "text"));
    }
    if (result.response_headers) {
      lines.push("");
      lines.push("#### 响应 Headers");
      lines.push(markdownFence(result.response_headers, "json"));
    }
    lines.push("");
    lines.push("#### 真实断言结果");
    lines.push(markdownFence(result.assertions || [], "json"));
    lines.push("");
  }
  return lines;
}

function markdownFence(value, language = "json") {
  const content = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  return `\`\`\`${language}\n${String(content ?? "null").replace(/```/g, "`\\`\\`")}\n\`\`\``;
}

function readFeishuConfig() {
  try {
    const parsed = JSON.parse(readStorageItem(FEISHU_CONFIG_STORAGE_KEY, LEGACY_FEISHU_CONFIG_STORAGE_KEYS) || "{}");
    return {
      documentUrl: String(parsed.documentUrl || "").trim(),
      documentMode: String(parsed.documentMode || "append").trim() === "overwrite" ? "overwrite" : "append",
      titlePrefix: String(parsed.titlePrefix || "Noctua 评测完成").trim() || "Noctua 评测完成",
      autoPush: Boolean(parsed.autoPush)
    };
  } catch {
    return {
      documentUrl: "",
      documentMode: "append",
      titlePrefix: "Noctua 评测完成",
      autoPush: false
    };
  }
}

function writeFeishuConfig() {
  const config = {
    documentUrl: els.feishuDocumentUrl.value.trim(),
    documentMode: els.feishuDocumentMode.value === "overwrite" ? "overwrite" : "append",
    titlePrefix: els.feishuTitlePrefix.value.trim() || "Noctua 评测完成",
    autoPush: Boolean(els.feishuAutoPush.checked)
  };
  localStorage.setItem(FEISHU_CONFIG_STORAGE_KEY, JSON.stringify(config));
  renderFeishuStatus();
  return config;
}

function loadFeishuConfig() {
  const config = readFeishuConfig();
  if (els.feishuDocumentUrl) els.feishuDocumentUrl.value = config.documentUrl;
  if (els.feishuDocumentMode) els.feishuDocumentMode.value = config.documentMode;
  if (els.feishuTitlePrefix) els.feishuTitlePrefix.value = config.titlePrefix;
  if (els.feishuAutoPush) els.feishuAutoPush.checked = config.autoPush;
  renderFeishuStatus();
}

function renderFeishuStatus(message) {
  if (!els.feishuStatus) return;
  if (message) {
    els.feishuStatus.textContent = message;
    return;
  }
  const config = readFeishuConfig();
  const currentDocumentUrl = els.feishuDocumentUrl?.value.trim() || "";
  const currentDocumentMode = els.feishuDocumentMode?.value === "overwrite" ? "overwrite" : "append";
  const currentTitlePrefix = els.feishuTitlePrefix?.value.trim() || "Noctua 评测完成";
  const currentAutoPush = Boolean(els.feishuAutoPush?.checked);
  const hasUnsavedConfig = currentDocumentUrl !== config.documentUrl || currentDocumentMode !== config.documentMode || currentTitlePrefix !== config.titlePrefix || currentAutoPush !== config.autoPush;
  const report = feishuReportMarkdown();
  if (!currentDocumentUrl) {
    els.feishuStatus.textContent = "尚未配置文档地址；请先运行 lark-cli config init --new，再填写飞书文档或 Wiki 链接。";
    return;
  }
  const configText = hasUnsavedConfig
    ? "配置有未保存改动；手动写入会自动保存"
    : config.autoPush ? "已开启自动写入" : "已保存文档地址，可手动写入";
  els.feishuStatus.textContent = `${configText}；当前文档 ${report ? `${report.length} 字符` : "尚未生成"}。`;
}

function renderFeishuReport(record = state.lastReportRecord) {
  if (!els.feishuReportPreview) return;
  const markdown = currentRunMarkdown(record);
  els.feishuReportPreview.value = markdown;
  renderFeishuStatus();
}

function feishuReportMarkdown() {
  return els.feishuReportPreview?.value.trim() || currentRunMarkdown(state.lastReportRecord);
}

function feishuReportTitle(record = state.lastReportRecord) {
  const config = readFeishuConfig();
  const provider = record?.channel_name || record?.provider || getSelectedChannel()?.name || "Provider";
  return `${config.titlePrefix}：${provider}`;
}

async function pushFeishuReport(record = state.lastReportRecord, { auto = false } = {}) {
  const config = auto ? readFeishuConfig() : writeFeishuConfig();
  if (!config.documentUrl) {
    showToast("请先配置飞书文档或 Wiki 地址。");
    setActiveView("feishu");
    return false;
  }
  const markdown = feishuReportMarkdown();
  if (!markdown) {
    showToast("暂无可写入的评测文档。");
    setActiveView("feishu");
    return false;
  }
  renderFeishuStatus("正在通过 lark-cli 写入飞书文档 ...");
  try {
    const response = await fetch(`${API_BASE}/api/feishu/document`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        document_url: config.documentUrl,
        document_mode: config.documentMode,
        title: feishuReportTitle(record),
        markdown
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }
    const successText = auto ? "评测完成，已自动写入飞书文档。" : "评测文档已写入飞书。";
    renderFeishuStatus(successText);
    showToast(successText);
    return true;
  } catch (error) {
    const failureText = `飞书文档写入失败：${error.message}`;
    renderFeishuStatus(failureText);
    showToast(failureText);
    return false;
  }
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "—";
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
}

function renderHistoryDetailRow(record, stats) {
  const capacityHtml = capacitySummaryHtml(record.results || [], "历史报告");
  return `
    <tr class="history-detail-row" data-history-detail="${escapeHtml(record.id)}">
      <td colspan="9">
        <div class="history-detail-panel">
          <div class="history-meta">
            <span>${escapeHtml(historyEndpointLabel(record))}</span>
            <span class="mono">${escapeHtml(record.base_url || "—")}</span>
            <span>${escapeHtml(proxySummary(record.proxy))}</span>
            <span>总计 <strong>${stats.total}</strong></span>
            <span>符合预期 <strong>${stats.expectedPass}</strong></span>
            <span>预期外 <strong>${stats.unexpected}</strong></span>
            <span>支持 <strong>${stats.supported}</strong></span>
            <span>接受未证明 <strong>${stats.ignored}</strong></span>
            <span>400 <strong>${stats.rejected}</strong></span>
            <span>请求失败 <strong>${stats.requestFailed}</strong></span>
            <span>断言失败 <strong>${stats.schemaMismatch || 0}</strong></span>
            <span>差异 <strong>${stats.diffs}</strong></span>
            <span>可作 baseline <strong>${stats.baselineReady || 0}</strong></span>
          </div>
          ${capacityHtml ? `<section class="capacity-summary history-capacity-summary">${capacityHtml}</section>` : ""}
          <div class="history-original-report">
            <div class="history-original-head">
              <div>
                <strong>原始渠道测试报告</strong>
                <span>${escapeHtml(historyChannelLabel(record))} / ${escapeHtml(historyModelLabel(record))} / ${escapeHtml(historyEndpointLabel(record))}</span>
              </div>
              <button class="secondary-button compact-button" type="button" data-history-action="copy" data-history-id="${escapeHtml(record.id)}">复制完整报告</button>
            </div>
            <div class="history-result-list">
              ${(record.results || []).map((result) => renderHistoryRawCase(result, record)).join("")}
            </div>
          </div>
        </div>
      </td>
    </tr>
  `;
}

function renderHistoryRawCase(result, record) {
  const meta = conclusionMeta(result);
  const responseBody = hasResponseBody(result) ? result.response_body : null;
  const rawResponse = result.raw_response || "";
  const sourceCase = result.source_case || null;
  const assertions = result.assertions || [];
  const requestBody = result.request_body || sourceCase?.payload || null;
  const requestHeaders = result.request_headers || sourceCase?.headers || null;
  const responseHeaders = result.response_headers || null;
  const caseCode = isCapacityResult(result) ? "" : result.case_id;
  const responseBlock = responseBody !== null
    ? `<pre class="code-block">${syntaxJson(responseBody)}</pre>`
    : rawResponse
      ? `<pre class="code-block">${escapeHtml(rawResponse)}</pre>`
      : `<pre class="code-block">null</pre>`;
  return `
    <details class="history-raw-case">
      <summary>
        <span class="history-result-case">
          <strong title="${escapeHtml(resultTitle(result))}">${escapeHtml(resultTitle(result))}</strong>
          ${caseCode ? `<code>${escapeHtml(caseCode)}</code>` : ""}
        </span>
        <span class="mono history-result-params">${escapeHtml(result.parameter || "payload")}</span>
        <span class="support-badge ${meta.badgeClass}">${escapeHtml(meta.label)}</span>
        <span class="expectation-badge ${expectationClass(result)}">${escapeHtml(expectationLabel(result))}</span>
        <span class="mono muted">HTTP ${escapeHtml(result.http_status || meta.httpStatus || "—")} · ${escapeHtml(result.latency_ms ? `${result.latency_ms}ms` : "—")}</span>
      </summary>
      <div class="history-raw-grid">
        <section class="history-raw-pane">
          <p class="detail-title">请求 Body</p>
          <pre class="code-block">${syntaxJson(requestBody)}</pre>
          ${requestHeaders ? `
            <p class="detail-title">请求 Headers</p>
            <pre class="code-block">${syntaxJson(requestHeaders)}</pre>
          ` : ""}
          ${sourceCase?.expect ? `
            <p class="detail-title">预期断言</p>
            <pre class="code-block">${syntaxJson(sourceCase.expect)}</pre>
          ` : ""}
        </section>
        <section class="history-raw-pane">
          <p class="detail-title">${escapeHtml(historyChannelLabel(record))} 原始响应</p>
          ${responseBlock}
          ${rawResponse && responseBody !== null ? `
            <p class="detail-title">Raw Response</p>
            <pre class="code-block">${escapeHtml(rawResponse)}</pre>
          ` : ""}
          ${responseHeaders ? `
            <p class="detail-title">响应 Headers</p>
            <pre class="code-block">${syntaxJson(responseHeaders)}</pre>
          ` : ""}
        </section>
        <section class="history-raw-pane">
          <p class="detail-title">真实断言结果</p>
          ${assertions.length ? `
            <div class="assertion-list">
              ${assertions.map((assertion) => `
                <span class="assertion-item ${assertion.pass ? "pass" : "fail"}">
                  <strong>${assertion.pass ? "✓" : "✗"} ${escapeHtml(assertion.name)}</strong>
                  <span>${escapeHtml(assertion.message || (assertion.pass ? "通过" : "未通过"))}</span>
                </span>
              `).join("")}
            </div>
          ` : `<pre class="code-block">[]</pre>`}
          <p class="detail-title">运行消息</p>
          <pre class="code-block">${escapeHtml(result.message || result.error || "—")}</pre>
        </section>
      </div>
    </details>
  `;
}

function renderHistory() {
  const items = readHistory();
  normalizeHistoryFilters(items);
  const visibleItems = filteredHistoryItems(items);
  if (!state.lastReportRecord && items.length) {
    state.lastReportRecord = items[0];
    renderFeishuReport(items[0]);
  }
  if (state.expandedHistoryId && !visibleItems.some((record) => record.id === state.expandedHistoryId)) {
    state.expandedHistoryId = null;
  }
  els.historyCount.textContent = visibleItems.length === items.length ? `${items.length} 条` : `${visibleItems.length} / ${items.length} 条`;
  els.clearHistory.disabled = items.length === 0;
  renderBaselineSelector();
  renderHistorySummary(visibleItems);
  renderHistoryFilters(items, visibleItems);
  if (!items.length) {
    els.historyList.innerHTML = `
      <div class="history-empty">
        <strong>暂无历史报告</strong>
        <span>测试完成后会自动保存在这里。</span>
      </div>
    `;
    return;
  }
  if (!visibleItems.length) {
    els.historyList.innerHTML = `
      <div class="history-empty">
        <strong>当前筛选没有报告</strong>
        <span>切换渠道、模型或 Endpoint 筛选后再查看。</span>
      </div>
    `;
    return;
  }

  els.historyList.innerHTML = `
    <div class="history-table-wrap">
      <table class="history-table">
        <thead>
          <tr>
            <th>Report ID</th>
            <th>Provider / Model</th>
            <th>Endpoint</th>
            <th>Cases</th>
            <th>Expected</th>
            <th>Behavior</th>
            <th>Diffs</th>
            <th>Created At</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${visibleItems.map((record) => {
            const derivedStats = historyStats(record.results || []);
            const stats = { ...derivedStats, ...(record.stats || {}) };
            return `
              <tr class="history-row" data-history-id="${escapeHtml(record.id)}">
                <td class="mono history-report-id">${escapeHtml(record.id.replace(/^report_/, "run/"))}</td>
                <td>
                  <div class="history-provider-cell">
                    <strong>${escapeHtml(record.channel_name)}</strong>
                    <span class="mono muted">${escapeHtml(record.model || "—")}</span>
                    <span class="muted">baseline 响应：${stats.baselineReady || 0} / ${stats.total || 0}</span>
                    ${record.baseline_label ? `<span class="muted">baseline：${escapeHtml(record.baseline_label)}</span>` : ""}
                  </div>
                </td>
                <td class="mono">${escapeHtml(record.endpoint_label || record.endpoint_id || "Chat Completions")}</td>
                <td class="mono">${stats.total || 0}</td>
                <td>
                  <span class="history-stat-pill visible">${stats.expectedPass || 0} / ${percentText(stats.expectedPass || 0, stats.total || 0)}</span>
                </td>
                <td>
                  <span class="history-stat-pill ${stats.unexpected ? "warning" : ""}">
                    ${(stats.ignored || 0) + (stats.permissionLimited || 0)} / ${stats.rejected || 0} / ${(stats.requestFailed || 0) + (stats.schemaMismatch || 0)}
                  </span>
                </td>
                <td class="mono">${stats.diffs || 0}</td>
                <td class="mono">${escapeHtml(formatDateTime(record.generated_at))}</td>
                <td>
                  <div class="history-actions">
                    <button class="history-icon-button" type="button" data-history-action="toggle" data-history-id="${escapeHtml(record.id)}" title="查看明细" aria-label="查看明细">⊙</button>
                    <button class="history-icon-button" type="button" data-history-action="copy" data-history-id="${escapeHtml(record.id)}" title="复制 Markdown" aria-label="复制 Markdown">♧</button>
                    <button class="history-icon-button" type="button" data-history-action="feishu" data-history-id="${escapeHtml(record.id)}" title="写入飞书文档" aria-label="写入飞书文档">↗</button>
                    <button class="history-icon-button danger" type="button" data-history-action="delete" data-history-id="${escapeHtml(record.id)}" title="删除报告" aria-label="删除报告">⌫</button>
                  </div>
                </td>
              </tr>
              ${state.expandedHistoryId === record.id ? renderHistoryDetailRow(record, stats) : ""}
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function resetRunUi() {
  state.completedResults = [];
  state.batchRunRecords = [];
  state.expandedCaseId = null;
  els.runLog.innerHTML = "";
  els.progressBar.style.width = "0%";
  els.progressCount.textContent = "0 / 0";
  els.progressCase.textContent = "等待中";
  els.capacitySummary?.classList.add("is-hidden");
  if (els.capacitySummary) els.capacitySummary.innerHTML = "";
  els.resultsPanel.classList.add("is-hidden");
}

function runTests() {
  if (currentProviderId()) {
    runProviderTests();
    return;
  }
  runPreviewTests();
}

async function runProviderTests() {
  clearTimeout(state.timer);
  resetRunUi();
  renderProxyState();
  const proxy = getProxyConfig();
  const channel = getSelectedChannel();
  const providerId = currentProviderId();
  if (proxy.enabled && !proxy.url) {
    showToast("已启用代理，但 Proxy URL 为空。");
    updateRunAvailability();
    return;
  }
  const results = getResultsForChannel();
  if (!results.length) {
    updateRunAvailability();
    const hasCases = Boolean(providerId && state.providerCases[currentCaseCacheKey(providerId)]?.cases?.length);
    showToast(hasCases ? `至少选择一个 ${channel.name} 用例。` : `请先启动 Go 后端并加载 ${channel.name} 用例。`);
    return;
  }
  const apiKey = els.apiKey.value.trim();
  let targets = [];
  try {
    targets = currentRunTargets(providerId, apiKey);
  } catch (error) {
    showToast(error.message);
    updateRunAvailability();
    return;
  }
  if (targets.some((target) => !target.api_key)) {
    showToast("真实测试需要填写 API Key，或在每个批量 target 行内提供 api_key。");
    updateRunAvailability();
    return;
  }

  state.lastRunProxy = proxy;
  state.visibleResults = [];
  state.completedResults = [];
  state.batchRunRecords = [];
  state.currentRunAbortController = new AbortController();
  state.isRunning = true;
  updateRunAvailability();
  els.progressPanel.classList.remove("is-hidden");
  const selectedCases = selectedProviderCases(providerId);
  const totalRuns = selectedCases.length * targets.length;
  els.progressCount.textContent = `0 / ${totalRuns}`;
  els.progressCase.textContent = "— 正在请求后端执行真实测试 ...";

  try {
    appendRunText(`→ 检查后端连接：${API_BASE}`);
    await ensureBackendReady(state.currentRunAbortController?.signal);
    appendRunText("→ 后端已连接，开始真实测试");

    state.visibleResults = targets.flatMap((target, targetIndex) => {
      const context = runContextForTarget(target);
      return selectedCases.map((testCase, caseIndex) => ({
        result_uid: resultUid(context, testCase, caseIndex),
        case_id: testCase.case_id,
        channel_id: context.channel_id,
        channel_name: context.channel_name,
        provider: context.provider,
        endpoint_id: context.endpoint_id,
        endpoint_label: context.endpoint_label,
        base_url: context.base_url,
        model: context.model,
        target_label: `${context.channel_name || context.provider} / ${context.model}`,
        parameter: (testCase.parameters?.length ? testCase.parameters : ["payload"]).join(" + "),
        category: testCase.category,
        support_conclusion: "unknown",
        status: "na",
        http_status: 0,
        latency_ms: 0,
        diff_count: 0,
        message: `等待真实请求执行（target ${targetIndex + 1}）。`,
        proxy,
        source_case: testCase
      }));
    });

    const batchTextPresent = batchModeActive();
    const runConcurrency = batchConcurrency();
    const capacitySelected = selectedCases.filter(isCapacityCase);
    if (capacitySelected.length) {
      appendRunText(`→ 含 最大Max Output / 最大Total Context 测试 ${capacitySelected.length} 个：会逐档发真实请求，可能需要数分钟；已完成 case 会实时显示。`);
    }
    if (batchTextPresent) {
      const selectedBuiltInCaseIds = selectedCases.filter((testCase) => !testCase.custom).map((testCase) => testCase.case_id);
      const selectedCustomCases = selectedCases.filter((testCase) => testCase.custom);
      const targetContexts = targets.map((target) => runContextForTarget(target));
      state.batchRunRecords = targetContexts.map((context) => ({ context, results: [] }));
      const targetProgress = targets.map((target, index) => ({
        completed: 0,
        total: selectedCases.length,
        label: `${target.provider} / ${target.model || `target ${index + 1}`}`
      }));
      appendRunText(`→ 批量启动 ${targets.length} 个 target，并发 ${runConcurrency}，每个 target ${selectedCases.length} 个 case，实时返回结果`);
      targets.forEach((target, index) => appendRunText(`→ target ${index + 1}: ${target.provider} / ${target.model}`));
      const response = await fetch(`${API_BASE}/api/run-batch-stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: state.currentRunAbortController?.signal,
        body: JSON.stringify({
          targets,
          endpoint_id: state.selectedEndpointId,
          case_ids: selectedBuiltInCaseIds,
          custom_cases: selectedCustomCases,
          proxy,
          max_concurrency: runConcurrency
        })
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${response.status}`);
      }
      if (!state.isRunning) return;
      let count = 0;
      let streamTotal = totalRuns;
      let sawEnd = false;
      await readRunStream(response, (event) => {
        if (!state.isRunning) return;
        if (event.type === "start") {
          streamTotal = event.total || totalRuns;
          els.progressCount.textContent = `0 / ${streamTotal}`;
          els.progressCase.textContent = `— 后端已开始执行 ${targets.length} 个 target，等待首个 case 完成 ...`;
          return;
        }
        if (event.type === "target_start") {
          const targetNumber = Number.isInteger(event.target_index) ? event.target_index + 1 : "?";
          appendRunText(`→ target ${targetNumber} 开始：${event.target_label || "target"}，${event.target_total || selectedCases.length} 个 case`);
          return;
        }
        if (event.type === "target_error") {
          const targetNumber = Number.isInteger(event.target_index) ? event.target_index + 1 : "?";
          appendRunText(`✗ target ${targetNumber} 失败：${event.error || "unknown error"}`);
          return;
        }
        if (event.type === "target_end") {
          const targetNumber = Number.isInteger(event.target_index) ? event.target_index + 1 : "?";
          const progress = targetProgress[event.target_index];
          appendRunText(`✓ target ${targetNumber} 完成：${event.target_label || progress?.label || "target"}`);
          return;
        }
        if (event.type === "error") {
          throw new Error(event.error || "batch stream run failed");
        }
        if (event.type === "end") {
          sawEnd = true;
          return;
        }
        if (event.type !== "result" || !event.result) return;
        const targetIndex = Number.isInteger(event.target_index) ? event.target_index : 0;
        const context = targetContexts[targetIndex] || targetContexts[0] || runContextForTarget(targets[0]);
        const mapped = mapRunResult(event.result, context, Number.isInteger(event.index) ? event.index : count);
        state.completedResults.push(mapped);
        if (!state.batchRunRecords[targetIndex]) {
          state.batchRunRecords[targetIndex] = { context, results: [] };
        }
        state.batchRunRecords[targetIndex].results.push(mapped);
        appendLog(mapped);
        count += 1;
        if (targetProgress[targetIndex]) targetProgress[targetIndex].completed += 1;
        const targetStatus = targetProgress
          .map((item, index) => `T${index + 1} ${item.completed}/${item.total}`)
          .join(" · ");
        els.progressCount.textContent = `${count} / ${streamTotal}`;
        els.progressCase.textContent = `— 已完成 ${count}/${streamTotal}: T${targetIndex + 1} ${resultTitle(mapped)} · ${targetStatus}`;
        els.progressBar.style.width = `${Math.round((count / streamTotal) * 100)}%`;
        renderStats();
        renderTabs();
        renderResults();
        els.resultsPanel.classList.remove("is-hidden");
      });
      if (!sawEnd && count < streamTotal && state.isRunning) {
        throw new Error(`batch stream ended early: ${count}/${streamTotal}`);
      }
    } else {
      const target = targets[0];
      const context = runContextForTarget(target);
      appendRunText(`→ ${target.provider} / ${target.model || "model"} 开始请求 ${selectedCases.length} 个 case，并发 ${runConcurrency}，实时返回结果`);
      const response = await fetch(`${API_BASE}/api/run-stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: state.currentRunAbortController?.signal,
        body: JSON.stringify({
          provider: target.provider,
          endpoint_id: target.endpoint_id,
          case_ids: selectedCases.filter((testCase) => !testCase.custom).map((testCase) => testCase.case_id),
          custom_cases: selectedCases.filter((testCase) => testCase.custom),
          api_key: target.api_key,
          base_url: target.base_url,
          model: target.model,
          proxy,
          max_concurrency: runConcurrency
        })
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${response.status}`);
      }
      if (!state.isRunning) return;
      let count = 0;
      let streamTotal = selectedCases.length;
      let sawEnd = false;
      await readRunStream(response, (event) => {
        if (!state.isRunning) return;
        if (event.type === "start") {
          streamTotal = event.total || selectedCases.length;
          els.progressCount.textContent = `0 / ${streamTotal}`;
          els.progressCase.textContent = "— 后端已开始执行，等待首个 case 完成 ...";
          return;
        }
        if (event.type === "error") {
          throw new Error(event.error || "stream run failed");
        }
        if (event.type === "end") {
          sawEnd = true;
          return;
        }
        if (event.type !== "result" || !event.result) return;
        const mapped = mapRunResult(event.result, context, Number.isInteger(event.index) ? event.index : count);
        state.completedResults.push(mapped);
        appendLog(mapped);
        count += 1;
        els.progressCount.textContent = `${count} / ${streamTotal}`;
        els.progressCase.textContent = `— 已完成 ${count}/${streamTotal}: ${resultTitle(mapped)}`;
        els.progressBar.style.width = `${Math.round((count / streamTotal) * 100)}%`;
        renderStats();
        renderTabs();
        renderResults();
        els.resultsPanel.classList.remove("is-hidden");
      });
      if (!sawEnd && count < streamTotal && state.isRunning) {
        throw new Error(`stream ended early: ${count}/${streamTotal}`);
      }
    }
    if (!state.isRunning) return;
    els.progressCase.textContent = batchTextPresent ? "— 批量真实测试完成" : "— 真实测试完成";
    els.progressBar.style.width = "100%";
    finishRun();
  } catch (error) {
    state.currentRunAbortController = null;
    state.isRunning = false;
    updateRunAvailability();
    if (error.name === "AbortError") {
      els.progressCase.textContent = "— 真实测试已取消";
      showToast("真实测试已取消，后端会停止未完成请求。");
      return;
    }
    const backendUnavailable = error.isBackendUnavailable || isFetchNetworkError(error);
    if (backendUnavailable) {
      els.progressCase.textContent = "— 后端连接失败";
      appendRunText(`✗ ${BACKEND_UNAVAILABLE_MESSAGE}`);
      showToast(BACKEND_UNAVAILABLE_MESSAGE);
      return;
    }
    els.progressCase.textContent = "— 真实测试失败";
    showToast(`真实测试失败：${error.message}`);
  } finally {
    if (!state.isRunning) {
      state.currentRunAbortController = null;
    }
  }
}

function runPreviewTests() {
  clearTimeout(state.timer);
  resetRunUi();
  renderProxyState();
  const proxy = getProxyConfig();
  if (proxy.enabled && !proxy.url) {
    showToast("已启用代理，但 Proxy URL 为空。");
    updateRunAvailability();
    return;
  }
  state.lastRunProxy = proxy;
  const results = getResultsForChannel();
  if (!results.length) {
    updateRunAvailability();
    showToast("当前渠道没有可运行 case。");
    return;
  }
  state.visibleResults = results;
  state.isRunning = true;
  updateRunAvailability();
  els.progressPanel.classList.remove("is-hidden");

  const runStep = (index) => {
    if (!state.isRunning) return;
    if (index >= results.length) {
      finishRun();
      return;
    }
    const result = results[index];
    state.completedResults.push(result);
    appendLog(result);
    const count = index + 1;
    els.progressCount.textContent = `${count} / ${results.length}`;
    els.progressCase.textContent = `— 正在测试 ${result.parameter} ...`;
    els.progressBar.style.width = `${Math.round((count / results.length) * 100)}%`;
    state.timer = setTimeout(() => runStep(index + 1), 300 + Math.round(Math.random() * 200));
  };

  state.timer = setTimeout(() => runStep(0), 280);
}

function runContextForTarget(target = {}) {
  const provider = target.provider || currentProviderId();
  const endpointId = target.endpoint_id || state.selectedEndpointId;
  const channel = channelForProvider(provider, endpointId) || getSelectedChannel();
  return {
    provider,
    endpoint_id: endpointId,
    endpoint_label: endpointTemplateById(endpointId)?.label || endpointId,
    channel_id: channel.channel_id,
    channel_name: channel.name,
    base_url: target.base_url || els.baseUrl.value.trim(),
    model: target.model || els.modelName.value.trim()
  };
}

function resultUid(context = {}, result = {}, index = 0) {
  return [
    context.provider || "provider",
    context.endpoint_id || state.selectedEndpointId,
    context.model || "model",
    result.case_id || "case",
    index
  ].map((part) => String(part).replace(/\s+/g, "_")).join("::");
}

function mapRunResult(result, context = runContextForTarget(), index = 0) {
  const testCase = allProviderCases().find((item) => item.case_id === result.case_id);
  const parameters = result.parameters?.length ? result.parameters : testCase?.parameters || ["payload"];
  const responseBody = result.response_body || null;
  const rawResponse = result.raw_response || "";
  const baseline = selectedBaselineRecord();
  const baselineResponse = baselineResponseForResult(result, baseline);
  const supportConclusion = result.support_conclusion || inferSiliconFlowConclusion(testCase || {});
  const meta = supportConclusionMeta[supportConclusion] || supportConclusionMeta.unknown;
  const diffCount = baselineResponse && responseBody && typeof responseBody === "object"
    ? compareStructure(baselineResponse, responseBody).length
    : result.error ? 1 : 0;
  return enrichResultAxes({
    result_uid: resultUid(context, result, index),
    case_id: result.case_id,
    title: testCase ? caseTitle(testCase) : result.title || "",
    channel_id: context.channel_id || state.selectedChannelId,
    channel_name: context.channel_name || getSelectedChannel().name,
    provider: context.provider || currentProviderId(),
    endpoint_id: context.endpoint_id || state.selectedEndpointId,
    endpoint_label: context.endpoint_label || getSelectedEndpointTemplate().label,
    base_url: context.base_url || els.baseUrl.value.trim(),
    model: context.model || els.modelName.value.trim(),
    target_label: `${context.channel_name || context.provider || "target"} / ${context.model || "model"}`,
    parameter: parameters.join(" + "),
    category: result.category || testCase?.category || "case",
    support_conclusion: supportConclusion,
    status: meta.status,
    http_status: result.http_status || meta.httpStatus,
    latency_ms: result.latency_ms || 0,
    diff_count: diffCount,
    message: result.error || meta.note,
    proxy: state.lastRunProxy || getProxyConfig(),
    source_case: testCase,
    request_headers: result.request_headers,
    request_body: result.request_body,
    response_body: responseBody,
    raw_response: rawResponse,
    response_headers: result.response_headers,
    assertions: result.assertions || [],
    expected_http_status: result.expected_http_status,
    expected_support_conclusion: result.expected_support_conclusion,
    error: result.error || ""
  });
}

function stopTests() {
  if (!state.isRunning) return;
  state.currentRunAbortController?.abort();
  state.isRunning = false;
  clearTimeout(state.timer);
  updateRunAvailability();
  els.progressCase.textContent = "— 用户已停止";
  showToast("测试已停止，保留部分日志。");
}

function runAfterPaint(callback) {
  const schedule = window.requestAnimationFrame || ((fn) => window.setTimeout(fn, 0));
  schedule(() => window.setTimeout(callback, 0));
}

function snapshotBatchRunRecords(records = state.batchRunRecords) {
  return records.map((entry) => ({
    context: { ...(entry.context || {}) },
    results: [...(entry.results || [])]
  }));
}

function finishRunPostProcessing(completedResults, batchRunRecords) {
  try {
    updateRunAvailability();
    const record = saveHistoryRecord(completedResults, batchRunRecords);
    const feishuConfig = readFeishuConfig();
    if (record && (state.activeView === "feishu" || feishuConfig.autoPush)) {
      renderFeishuReport(record);
    }
    if (record && feishuConfig.autoPush) {
      pushFeishuReport(record, { auto: true });
    }
  } catch (error) {
    console.error("Run post-processing failed", error);
    showToast(`测试已完成，但报告保存/生成失败：${error.message}`);
  }
}

function finishRun() {
  const completedResults = [...state.completedResults];
  const batchRunRecords = snapshotBatchRunRecords();
  state.isRunning = false;
  state.currentRunAbortController = null;
  clearTimeout(state.timer);
  if (els.stopTests) els.stopTests.disabled = true;
  if (els.runTests) els.runTests.disabled = false;
  if (els.batchTargets) els.batchTargets.disabled = !state.batchModeEnabled;
  if (els.batchConcurrency) els.batchConcurrency.disabled = false;
  if (els.batchModeToggle) els.batchModeToggle.disabled = false;
  els.progressCase.textContent = "— 完成";
  els.progressBar.style.width = "100%";
  try {
    renderStats();
    renderTabs();
    renderResults();
    els.resultsPanel.classList.remove("is-hidden");
  } catch (error) {
    console.error("Run result rendering failed", error);
    showToast(`测试已完成，但结果渲染失败：${error.message}`);
  }
  runAfterPaint(() => finishRunPostProcessing(completedResults, batchRunRecords));
}

function appendLog(result) {
  result = enrichResultAxes(result);
  const line = document.createElement("span");
  const meta = conclusionMeta(result);
  const evidence = evidenceMeta(result);
  const expected = matchesExpectedResult(result);
  line.className = `log-line ${expected ? "accepted" : meta.status}`;
  const mark = expected ? statusMarks.accepted : statusMarks[meta.status];
  const httpStatus = result.http_status || meta.httpStatus || "—";
  const latency = result.latency_ms ? `${result.latency_ms}ms` : "—";
  line.textContent = `${mark} ${result.parameter.padEnd(28)} 支持:${meta.label.padEnd(8)} 预期:${expectationLabel(result).padEnd(6)} 证据:${evidence.label.padEnd(6)} HTTP ${String(httpStatus).padEnd(3)} ${latency.padEnd(7)} ${result.message || ""}`;
  els.runLog.appendChild(line);
  els.runLog.scrollTop = els.runLog.scrollHeight;
}

function appendRunText(text) {
  const line = document.createElement("span");
  line.className = "log-line";
  line.textContent = text;
  els.runLog.appendChild(line);
  els.runLog.scrollTop = els.runLog.scrollHeight;
}

function filteredResults() {
  const results = state.completedResults.length ? state.completedResults : state.visibleResults;
  if (state.selectedFilter === "unsupported_400") return results.filter((result) => result.support_conclusion === "rejected_400");
  if (state.selectedFilter === "ignored") return results.filter((result) => result.support_conclusion === "ignored" || result.support_conclusion === "permission_limited");
  if (state.selectedFilter === "request_failed") return results.filter((result) => !matchesExpectedResult(result));
  if (state.selectedFilter === "diffs") return results.filter((result) => result.diff_count > 0);
  return results;
}

function renderStats() {
  const results = state.completedResults;
  els.statPassed.textContent = results.filter(matchesExpectedResult).length;
  els.statWarnings.textContent = results.filter((result) => result.support_conclusion === "ignored" || result.support_conclusion === "permission_limited").length;
  els.statFailed.textContent = results.filter((result) => !matchesExpectedResult(result)).length;
  els.statDiffs.textContent = results.filter((result) => result.diff_count > 0).length;
}

function renderTabs() {
  const results = state.completedResults;
  const tabs = [
    ["all", `全部 (${results.length})`],
    ["unsupported_400", `400 拒绝 (${results.filter((result) => result.support_conclusion === "rejected_400").length})`],
    ["ignored", `未证明/权限 (${results.filter((result) => result.support_conclusion === "ignored" || result.support_conclusion === "permission_limited").length})`],
    ["request_failed", `预期外 (${results.filter((result) => !matchesExpectedResult(result)).length})`],
    ["diffs", `结构差异 (${results.filter((result) => result.diff_count > 0).length})`]
  ];

  els.filterTabs.innerHTML = tabs.map(([id, label]) => `
    <button class="tab-button ${state.selectedFilter === id ? "is-active" : ""}" type="button" data-filter="${id}">
      ${escapeHtml(label)}
    </button>
  `).join("");
}

function capacityKindFromResult(result = {}) {
  const bodyKind = result.response_body?.kind;
  if (bodyKind === "max_output" || bodyKind === "total_context") return bodyKind;
  if (String(result.case_id || "").includes("capacity_max_output")) return "max_output";
  if (String(result.case_id || "").includes("capacity_total_context")) return "total_context";
  return "";
}

function isCapacityResult(result = {}) {
  return result.category === "capacity" || capacityKindFromResult(result) !== "";
}

function capacityHostLabel(value = "") {
  try {
    return new URL(value).host || value;
  } catch {
    return String(value || "").replace(/^https?:\/\//, "").replace(/\/.*$/, "") || "custom url";
  }
}

function capacityTargetKey(result = {}) {
  return [
    result.provider || result.channel_id || "provider",
    result.base_url || "",
    result.model || "model"
  ].join("|");
}

function capacityTargetLabel(result = {}) {
  const model = result.model || "model";
  const host = capacityHostLabel(result.base_url || "");
  return host ? `${model} · ${host}` : model;
}

function capacityDisplayName(kind) {
  return kind === "total_context" ? "最大Total Context" : "最大Max Output";
}

function capacityResultValue(result = {}, kind = capacityKindFromResult(result)) {
  const body = result.response_body || {};
  const supported = Number(body.supported_max || 0);
  if (supported > 0 && body.supported_max_display) {
    return body.top_candidate_supported ? `≥ ${body.supported_max_display}` : body.supported_max_display;
  }
  if (supported > 0) {
    return body.top_candidate_supported ? `≥ ${formatCapacityTier(supported)}` : formatCapacityTier(supported);
  }
  return "未测到";
}

function capacityResultLevel(result = {}) {
  const body = result.response_body || {};
  if (Number(body.supported_max || 0) <= 0) return "fail";
  if (body.upper_bound_found) return "pass";
  return "warn";
}

function capacityResultStatus(result = {}) {
  const body = result.response_body || {};
  if (Number(body.supported_max || 0) <= 0) {
    return result.error ? "请求失败" : "未测到支持项";
  }
  if (body.upper_bound_found) return "边界已确认";
  if (body.top_candidate_supported) return "至少支持该档";
  return "边界未完全括定";
}

function capacityResultDetail(result = {}, kind = capacityKindFromResult(result)) {
  const body = result.response_body || {};
  const supported = Number(body.supported_max || 0);
  const nearest = body.nearest_higher_non_supported;
  if (supported > 0 && nearest?.candidate_display) {
    return `${capacityResultValue(result, kind)} 可用；${nearest.candidate_display} 不支持。`;
  }
  if (supported > 0 && body.top_candidate_supported) {
    return `最高候选 ${body.top_candidate_display || capacityResultValue(result, kind)} 已通过，实际可能更高。`;
  }
  if (supported > 0) {
    return `候选范围内最大可用档位是 ${capacityResultValue(result, kind)}。`;
  }
  return result.error || result.message || "当前候选档位内没有拿到可用上限。";
}

function formatCapacityLatency(ms) {
  const value = Number(ms || 0);
  if (!Number.isFinite(value) || value <= 0) return "";
  if (value >= 60000) return `${(value / 60000).toFixed(value >= 600000 ? 0 : 1)}min`;
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}s`;
  return `${Math.round(value)}ms`;
}

function capacitySummaryGroups(results = []) {
  const groups = new Map();
  for (const rawResult of results) {
    if (!isCapacityResult(rawResult)) continue;
    const result = enrichResultAxes(rawResult);
    const kind = capacityKindFromResult(result);
    if (!kind) continue;
    const key = capacityTargetKey(result);
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        label: capacityTargetLabel(result),
        results: {}
      });
    }
    groups.get(key).results[kind] = result;
  }
  return [...groups.values()];
}

function capacitySummaryMarkdownLines(results = []) {
  const groups = capacitySummaryGroups(results);
  if (!groups.length) return [];
  const lines = [
    "## 容量上限",
    "",
    "| Target | 指标 | 可用上限 | 结论 | 探测 | 说明 |",
    "|---|---|---|---|---|---|"
  ];
  for (const group of groups) {
    for (const kind of ["max_output", "total_context"]) {
      const result = group.results[kind];
      if (!result) {
        lines.push(`| ${escapeMarkdownCell(group.label)} | ${capacityDisplayName(kind)} | — | 未测试 | — | — |`);
        continue;
      }
      const attempts = Array.isArray(result.response_body?.attempts) ? result.response_body.attempts.length : 0;
      const latency = formatCapacityLatency(result.latency_ms);
      const probeText = [attempts ? `${attempts} 次` : "", latency].filter(Boolean).join(" / ") || "—";
      lines.push(`| ${escapeMarkdownCell(group.label)} | ${capacityDisplayName(kind)} | ${capacityResultValue(result, kind)} | ${capacityResultStatus(result)} | ${probeText} | ${escapeMarkdownCell(capacityResultDetail(result, kind))} |`);
    }
  }
  lines.push("");
  return lines;
}

function capacitySummaryHtml(results = [], scopeLabel = "") {
  const groups = capacitySummaryGroups(results);
  if (!groups.length) return "";
  const cards = groups.flatMap((group) => ["max_output", "total_context"].map((kind) => {
    const result = group.results[kind];
    if (!result) {
      return `
        <article class="capacity-metric-card empty">
          <div class="capacity-metric-card__top">
            <span>${escapeHtml(capacityDisplayName(kind))}</span>
            <small>${escapeHtml(group.label)}</small>
          </div>
          <strong>—</strong>
          <p>本次没有运行该容量探测。</p>
          <div class="capacity-metric-card__meta">
            <span>未测试</span>
          </div>
        </article>
      `;
    }
    const level = capacityResultLevel(result);
    const attempts = Array.isArray(result.response_body?.attempts) ? result.response_body.attempts.length : 0;
    const latency = formatCapacityLatency(result.latency_ms);
    return `
      <article class="capacity-metric-card ${level}">
        <div class="capacity-metric-card__top">
          <span>${escapeHtml(capacityDisplayName(kind))}</span>
          <small>${escapeHtml(group.label)}</small>
        </div>
        <strong>${escapeHtml(capacityResultValue(result, kind))}</strong>
        <p>${escapeHtml(capacityResultDetail(result, kind))}</p>
        <div class="capacity-metric-card__meta">
          <span class="capacity-status ${level}">${escapeHtml(capacityResultStatus(result))}</span>
          <span>${attempts ? `探测 ${attempts} 次` : "无探测明细"}</span>
          ${latency ? `<span>${escapeHtml(latency)}</span>` : ""}
        </div>
      </article>
    `;
  }));

  return `
    <div class="capacity-summary__head">
      <div>
        <span>容量上限</span>
        <strong>模型可用边界</strong>
      </div>
      <small>${escapeHtml(scopeLabel || (groups.length > 1 ? `${groups.length} 个 target` : "当前 target"))}</small>
    </div>
    <div class="capacity-summary__grid">
      ${cards.join("")}
    </div>
  `;
}

function renderCapacitySummary() {
  if (!els.capacitySummary) return;
  const html = capacitySummaryHtml(state.completedResults);
  if (!html) {
    els.capacitySummary.classList.add("is-hidden");
    els.capacitySummary.innerHTML = "";
    return;
  }
  els.capacitySummary.innerHTML = html;
  els.capacitySummary.classList.remove("is-hidden");
}

function renderResults() {
  renderCapacitySummary();
  const rows = filteredResults();
  els.resultRows.innerHTML = rows.map((rawResult) => {
    const result = enrichResultAxes(rawResult);
    const meta = conclusionMeta(result);
    const evidence = evidenceMeta(result);
    const diffText = diffSummaryForResult(result);
    const diffState = baselineStateForResult(result).status;
    const rowId = result.result_uid || result.case_id;
    const caseCode = isCapacityResult(result) ? "" : result.case_id;
    const detail = state.expandedCaseId === rowId ? renderDetailRow(result) : "";
    return `
      <tr class="result-row" data-result-id="${escapeHtml(rowId)}">
        <td>
          <div class="result-case-cell">
            <strong title="${escapeHtml(resultTitle(result))}">${escapeHtml(resultTitle(result))}</strong>
            ${caseCode ? `<span class="mono muted">${escapeHtml(caseCode)}</span>` : ""}
            ${result.target_label ? `<span class="mono muted">${escapeHtml(result.target_label)}</span>` : ""}
            <span class="mono">${escapeHtml(result.parameter)}</span>
          </div>
        </td>
        <td class="muted">${escapeHtml(categoryLabel(result.category))}</td>
        <td>
          <span class="support-badge ${meta.badgeClass}">${escapeHtml(meta.label)}</span>
        </td>
        <td><span class="expectation-badge ${expectationClass(result)}">${escapeHtml(expectationLabel(result))}</span></td>
        <td><span class="evidence-badge ${evidence.badgeClass}">${escapeHtml(evidence.label)}</span></td>
        <td class="mono muted">${result.http_status || meta.httpStatus || "—"}</td>
        <td><span class="diff-text ${result.diff_count ? "" : "clean"} ${diffState}">${escapeHtml(diffText)}</span></td>
      </tr>
      ${detail}
    `;
  }).join("");
}

function syntaxJson(value, highlightedKey) {
  const escaped = escapeHtml(JSON.stringify(value, null, 2));
  if (!highlightedKey) return escaped;
  const keyPattern = new RegExp(`(&quot;${highlightedKey}&quot;:\\s[^\\n]+)`);
  return escaped.replace(keyPattern, '<span class="highlight-param">$1</span>');
}

function renderDetailRow(result) {
  result = enrichResultAxes(result);
  const response = responseForResult(result);
  const canDiff = response.baseline_response && response.channel_response && typeof response.channel_response === "object" && !Array.isArray(response.channel_response);
  const diffs = canDiff ? compareStructure(response.baseline_response, response.channel_response) : [];
  const severity = response.baseline_response
    ? severityForDiffs(diffs, response.baseline_label)
    : {
      level: "unknown",
      label: "NO BASELINE",
      title: "未找到匹配 baseline",
      copy: "选择的历史 baseline 中没有这个 case_id，已跳过结构差异对比。"
    };
  const meta = conclusionMeta(result);
  const evidence = evidenceMeta(result);
  const action = gatewayAction(result);
  const proxy = result.proxy || getProxyConfig();
  const channelName = result.channel_name || getSelectedChannel().name;
  const modelName = result.model || els.modelName.value;

  return `
    <tr class="detail-row">
      <td colspan="7">
        <div class="case-detail">
          <div class="support-summary ${meta.badgeClass}">
            <span class="support-badge ${meta.badgeClass}">${escapeHtml(meta.label)}</span>
            <div>
              <strong>${escapeHtml(result.parameter)}</strong>
              <p>${escapeHtml(result.message || meta.note)}</p>
              <div class="result-axis-grid">
                <span><strong>支持性</strong>${escapeHtml(capabilityStatusLabel(result))}</span>
                <span><strong>预期</strong>${escapeHtml(expectationLabel(result))}</span>
                <span><strong>证据</strong>${escapeHtml(evidence.label)}</span>
                <span><strong>建议动作</strong>${escapeHtml(action.label)}</span>
              </div>
              <p>${escapeHtml(expectationSummary(result))}；${escapeHtml(assertionSummary(result.assertions))}；${escapeHtml(action.copy)}</p>
            </div>
          </div>

          <p class="detail-title">请求 Body</p>
          <pre class="code-block">${syntaxJson(response.request_body, result.parameter)}</pre>

          ${response.request_headers ? `
            <p class="detail-title">请求 Headers</p>
            <pre class="code-block">${syntaxJson(response.request_headers)}</pre>
          ` : ""}

          <p class="detail-title">请求代理</p>
          <div class="proxy-detail">
            <span class="mono">${escapeHtml(proxy.mode || "direct")}</span>
            <span>${escapeHtml(proxySummary(proxy))}</span>
          </div>

          ${result.source_case?.expect ? `
            <p class="detail-title">预期断言</p>
            <pre class="code-block">${syntaxJson(result.source_case.expect)}</pre>
          ` : ""}

          ${result.assertions?.length ? `
            <p class="detail-title">真实断言结果</p>
            <div class="assertion-list">
              ${result.assertions.map((assertion) => `
                <span class="assertion-item ${assertion.pass ? "pass" : "fail"}">
                  <strong>${assertion.pass ? "✓" : "✗"} ${escapeHtml(assertion.name)}</strong>
                  <span>${escapeHtml(assertion.message || (assertion.pass ? "通过" : "未通过"))}</span>
                </span>
              `).join("")}
            </div>
          ` : ""}

          <div class="response-grid">
            <div class="response-pane">
              <p class="detail-title">${escapeHtml(response.baseline_label || "baseline 响应")}</p>
              <div class="response-meta">
                <span>${escapeHtml(response.baseline_meta?.model || response.baseline_meta?.channel_name || "—")}</span>
                <span>${escapeHtml(response.baseline_meta?.http_status || "—")}</span>
                <span>${response.baseline_meta ? escapeHtml(formatDateTime(response.baseline_meta.generated_at)) : "未命中"}</span>
              </div>
              <pre class="code-block">${syntaxJson(response.baseline_response)}</pre>
            </div>
            <div class="response-pane">
              <p class="detail-title">${escapeHtml(channelName)}（当前渠道）</p>
              <div class="response-meta">
                <span>${escapeHtml(modelName)}</span>
                <span>${result.http_status || meta.httpStatus || "—"}</span>
                <span>${result.latency_ms || 0}ms</span>
              </div>
              <pre class="code-block">${syntaxJson(response.channel_response)}</pre>
              ${result.raw_response && !result.response_body ? `
                <p class="detail-title">原始响应</p>
                <pre class="code-block">${escapeHtml(result.raw_response)}</pre>
              ` : ""}
            </div>
          </div>

          ${result.response_headers ? `
            <p class="detail-title">响应 Headers</p>
            <pre class="code-block">${syntaxJson(result.response_headers)}</pre>
          ` : ""}

          <p class="detail-title">结构差异</p>
          <div class="diff-summary-card">${escapeHtml(canDiff ? diffSummarySentence(diffs) : (response.baseline_response ? "当前响应不是 JSON object，无法做结构 diff。" : "缺少同名 baseline，无法做结构 diff。"))}</div>
          <div class="diff-block">${canDiff ? renderDiffLines(diffs) : `<span class="diff-line"><span>?</span><span>response</span><span>text</span><span>${response.baseline_response ? "非 JSON 响应，跳过结构 diff" : "baseline 缺少同名 case，跳过结构 diff"}</span></span>`}</div>

          <div class="severity ${severity.level}">
            <span class="badge ${severity.level === "critical" ? "rejected" : severity.level === "extension" ? "warning" : "accepted"}">${severity.label}</span>
            <div>
              <strong>${severity.title}</strong>
              <p>${severity.copy}</p>
            </div>
          </div>

          <div class="detail-actions">
            <button class="secondary-button" type="button" data-action="copy-diff" data-result-id="${escapeHtml(result.result_uid || result.case_id)}">复制 diff</button>
            <button class="secondary-button" type="button" data-action="copy-reply" data-result-id="${escapeHtml(result.result_uid || result.case_id)}">复制结论</button>
            <button class="secondary-button" type="button" data-action="save-case" data-result-id="${escapeHtml(result.result_uid || result.case_id)}">保存 case</button>
          </div>
        </div>
      </td>
    </tr>
  `;
}

function renderDiffLines(diffs) {
  if (!diffs.length) {
    return '<span class="diff-line"><span>✓</span><span>structure</span><span>object</span><span>（兼容）</span></span>';
  }

  return diffs.map((diff) => `
    <span class="diff-line ${diff.kind}">
      <span>${diff.prefix}</span>
      <span>${escapeHtml(diff.path)}</span>
      <span>${escapeHtml(diff.type)}</span>
      <span>${escapeHtml(diffNoteZh(diff.note))}</span>
    </span>
  `).join("");
}

function diffSummarySentence(diffs) {
  if (!diffs.length) {
    return "结构一致：没有发现字段缺失、额外字段或类型不一致。";
  }
  const missing = diffs.filter((diff) => diff.kind === "missing");
  const extra = diffs.filter((diff) => diff.kind === "extra");
  const type = diffs.filter((diff) => diff.kind === "type");
  const important = missing.find((diff) => requiredOpenAiFields.has(diff.path.split(".")[0])) || missing[0] || type[0] || extra[0];
  const parts = [
    missing.length ? `缺失 ${missing.length} 个字段` : "",
    extra.length ? `新增 ${extra.length} 个字段` : "",
    type.length ? `类型不一致 ${type.length} 个` : ""
  ].filter(Boolean);
  return `${parts.join("，")}。最重要：${important.prefix} ${important.path}（${diffNoteZh(important.note)}）。`;
}

function diffMarkdown(result) {
  const response = responseForResult(result);
  if (!response.baseline_response) return `### ${result.parameter}\n\n${response.baseline_label || "baseline"} 没有匹配的 case，跳过结构差异对比。`;
  const diffs = compareStructure(response.baseline_response, response.channel_response);
  if (!diffs.length) return `### ${result.parameter}\n\n与 ${response.baseline_label || "baseline"} 无结构差异。`;
  return [
    `### ${result.parameter}`,
    "",
    `baseline：${response.baseline_label || "baseline"}`,
    `摘要：${diffSummarySentence(diffs)}`,
    "",
    "```text",
    ...diffs.map((diff) => `${diff.prefix} ${diff.path.padEnd(28)} ${diff.type.padEnd(10)} ${diff.note}`),
    "```"
  ].join("\n");
}

function customerReply(result) {
  const meta = conclusionMeta(result);
  const proxyText = proxySummary(result.proxy || getProxyConfig());
  if (result.support_conclusion === "rejected_400") {
    return `${getSelectedChannel().name} 当前不支持 ${result.parameter} 参数。建议在网关侧过滤该参数，或为该渠道配置参数降级策略。代理配置：${proxyText}`;
  }
  if (result.support_conclusion === "request_failed" || result.support_conclusion === "schema_mismatch") {
    return `${getSelectedChannel().name} 的 ${result.parameter} 真实请求失败，暂不能判定参数支持性。请先检查 API Key、Base URL、Model 和代理配置。代理配置：${proxyText}`;
  }
  if (result.support_conclusion === "ignored") {
    return `${getSelectedChannel().name} 对 ${result.parameter} 不 400，但缺少生效证据或只作为供应商扩展处理。建议在网关侧标记为“可转发但需风险提示”。代理配置：${proxyText}`;
  }
  return `${getSelectedChannel().name} 的 ${result.parameter} 结论：${meta.label}。可作为低风险参数继续放行。代理配置：${proxyText}`;
}

async function copyText(text, label) {
  try {
    await navigator.clipboard.writeText(text);
    showToast(`${label} 已复制。`);
  } catch {
    showToast(`${label}: ${text.slice(0, 120)}`);
  }
}

function exportJson() {
  const baseline = selectedBaselineRecord();
  const payload = {
    channel: getSelectedChannel(),
    baseline: {
      report_id: baseline?.id || "",
      label: baselineLabel(baseline),
      ready: Boolean(baseline && historyRecordHasBaselinePayload(baseline)),
      status: baseline && historyRecordHasBaselinePayload(baseline) ? "ready" : "exploratory"
    },
    proxy: state.lastRunProxy || getProxyConfig(),
    results: state.completedResults.map((result) => ({
      ...enrichResultAxes(result),
      support_conclusion_label: conclusionMeta(result).label,
      evidence_label: evidenceMeta(result).label,
      gateway_action_label: gatewayAction(result).label
    })),
    generated_at: new Date().toISOString()
  };
  copyText(JSON.stringify(payload, null, 2), "JSON 导出");
}

function exportMarkdown() {
  const proxy = state.lastRunProxy || getProxyConfig();
  const baseline = selectedBaselineRecord();
  const lines = [
    `# Noctua 参数支持报告：${getSelectedChannel().name}`,
    "",
    `baseline：${baselineLabel(baseline)}`,
    `代理配置：${proxySummary(proxy)}`,
    "",
    ...capacitySummaryMarkdownLines(state.completedResults),
    ...thinkingProbeAnalysisLines(state.completedResults),
    ...thinkingCloseAnalysisLines(state.completedResults),
    "| 参数 | 分类 | 支持性 | 预期 | 证据 | 建议动作 | HTTP | 结构差异 |",
    "|---|---|---|---|---|---|---|---|",
    ...state.completedResults.map((rawResult) => {
      const result = enrichResultAxes(rawResult);
      return `| \`${result.parameter}\` | ${categoryLabel(result.category)} | ${conclusionMeta(result).label} | ${expectationLabel(result)} | ${evidenceMeta(result).label} | ${gatewayAction(result).label} | ${result.http_status || conclusionMeta(result).httpStatus || "—"} | ${diffSummaryForResult(result)} |`;
    }
    )
  ];
  copyText(lines.join("\n"), "Markdown 导出");
}

function numberInputValue(input, fallback = 0) {
  const value = Number(input?.value);
  return Number.isFinite(value) ? value : fallback;
}

function integerInputValue(input, fallback = 0) {
  return Math.max(0, Math.trunc(numberInputValue(input, fallback)));
}

function splitListInput(value) {
  return String(value || "")
    .split(/[,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseKeyValueInput(value) {
  return splitListInput(value).reduce((out, item) => {
    const index = item.indexOf("=");
    if (index > 0) {
      out[item.slice(0, index).trim()] = item.slice(index + 1).trim();
    }
    return out;
  }, {});
}

function splitCliArgs(value) {
  const text = String(value || "").trim();
  if (!text) return [];
  const args = [];
  const pattern = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let match;
  while ((match = pattern.exec(text))) {
    args.push(match[1] ?? match[2] ?? match[3]);
  }
  return args;
}

function fillPerformanceFromRunConfig() {
  const endpoint = getSelectedEndpointTemplate();
  if (els.performanceBaseUrl) els.performanceBaseUrl.value = els.baseUrl?.value.trim() || "";
  if (els.performanceModel) els.performanceModel.value = els.modelName?.value.trim() || "";
  if (els.performanceApiKey) els.performanceApiKey.value = els.apiKey?.value.trim() || "";
  if (els.performanceEndpoint) {
    els.performanceEndpoint.value = endpoint.endpoint_id === "anthropic_messages" ? "/messages" : "/v1/chat/completions";
  }
  showToast("已填入运行页的 Base URL、Model 和 API Key。");
}

function performanceRequestPayload() {
  return {
    backend: els.performanceBackend?.value || "openai-chat",
    base_url: els.performanceBaseUrl?.value.trim() || "",
    endpoint: els.performanceEndpoint?.value.trim() || "/v1/chat/completions",
    model: els.performanceModel?.value.trim() || "",
    api_key: els.performanceApiKey?.value.trim() || "",
    dataset_name: els.performanceDatasetName?.value || "random",
    dataset_path: els.performanceDatasetPath?.value.trim() || "",
    num_prompts: integerInputValue(els.performanceNumPrompts, 100),
    random_input_len: integerInputValue(els.performanceRandomInputLen, 1024),
    random_output_len: integerInputValue(els.performanceRandomOutputLen, 128),
    random_range_ratio: numberInputValue(els.performanceRandomRangeRatio, 1),
    random_prefix_len: integerInputValue(els.performanceRandomPrefixLen, 0),
    request_rate: els.performanceRequestRate?.value.trim() || "inf",
    burstiness: numberInputValue(els.performanceBurstiness, 1),
    max_concurrency: integerInputValue(els.performanceMaxConcurrency, 0),
    num_warmup_requests: integerInputValue(els.performanceWarmups, 0),
    percentile_metrics: els.performancePercentileMetrics?.value.trim() || "ttft,tpot,itl",
    metric_percentiles: els.performanceMetricPercentiles?.value.trim() || "99",
    goodput: splitListInput(els.performanceGoodput?.value),
    metadata: parseKeyValueInput(els.performanceMetadata?.value),
    extra_args: splitCliArgs(els.performanceExtraArgs?.value),
    disable_tqdm: true,
    proxy: getProxyConfig()
  };
}

async function runPerformanceBenchmark() {
  const payload = performanceRequestPayload();
  if (!payload.base_url) {
    showToast("性能测试需要填写 Base URL。");
    return;
  }
  if (!payload.model) {
    showToast("性能测试需要填写 Model。");
    return;
  }
  if (payload.dataset_name !== "random" && !payload.dataset_path) {
    showToast("sharegpt/sonnet 数据集需要填写本地文件路径。");
    return;
  }
  if (payload.proxy.enabled && !payload.proxy.url) {
    showToast("已启用代理，但 Proxy URL 为空。");
    return;
  }

  state.lastPerformanceResult = null;
  els.runPerformanceBenchmark.disabled = true;
  els.performanceProgressPanel.classList.remove("is-hidden");
  els.performanceResultsPanel.classList.add("is-hidden");
  els.performanceStatus.textContent = "运行中";
  els.performanceCommandHint.textContent = `${payload.backend} · ${payload.num_prompts} prompts · ${payload.request_rate} req/s`;
  els.performanceProgressBar.style.width = "35%";
  els.performanceStdout.textContent = "";
  els.performanceJson.textContent = "";

  try {
    const response = await fetch(`${API_BASE}/api/performance/benchmark`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    els.performanceProgressBar.style.width = "78%";
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }
    state.lastPerformanceResult = data.result || {};
    renderPerformanceResult(data);
    els.performanceStatus.textContent = "完成";
    els.performanceProgressBar.style.width = "100%";
  } catch (error) {
    els.performanceStatus.textContent = "失败";
    els.performanceProgressBar.style.width = "100%";
    showToast(`性能测试失败：${error.message}`);
  } finally {
    els.runPerformanceBenchmark.disabled = false;
  }
}

function renderPerformanceResult(data = {}) {
  const result = data.result || {};
  const cards = [
    ["成功请求", result.completed ?? "0"],
    ["失败请求", result.failed ?? "0"],
    ["耗时 s", formatMetricValue(result.benchmark_duration)],
    ["Req/s", formatMetricValue(result.request_throughput)],
    ["输出 tok/s", formatMetricValue(result.output_throughput)],
    ["总 tok/s", formatMetricValue(result.total_token_throughput)],
    ["Mean TTFT ms", formatMetricValue(result.mean_ttft_ms)],
    ["P99 TTFT ms", formatMetricValue(result.p99_ttft_ms)],
    ["Mean TPOT ms", formatMetricValue(result.mean_tpot_ms)],
    ["P99 TPOT ms", formatMetricValue(result.p99_tpot_ms)],
    ["Mean ITL ms", formatMetricValue(result.mean_itl_ms)],
    ["P99 ITL ms", formatMetricValue(result.p99_itl_ms)]
  ];
  if (result.goodput !== null && result.goodput !== undefined) {
    cards.push(["Goodput", formatMetricValue(result.goodput)]);
  }
  els.performanceStats.innerHTML = cards.map(([label, value]) => `
    <article class="performance-stat-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(String(value))}</strong>
    </article>
  `).join("");
  els.performanceStdout.textContent = data.stdout || "";
  els.performanceJson.textContent = JSON.stringify(result, null, 2);
  els.performanceResultsPanel.classList.remove("is-hidden");
}

function formatMetricValue(value) {
  if (value === null || value === undefined || value === "") return "—";
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value);
  return number.toFixed(2);
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("is-visible");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => els.toast.classList.remove("is-visible"), 2400);
}

function storageLegacyKeys(storageKey) {
  if (storageKey === EVALSCOPE_URL_STORAGE_KEY) return LEGACY_EVALSCOPE_URL_STORAGE_KEYS;
  if (storageKey === OPENCOMPASS_URL_STORAGE_KEY) return LEGACY_OPENCOMPASS_URL_STORAGE_KEYS;
  return [];
}

function normalizeEmbedUrl(value, fallbackUrl) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return fallbackUrl;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `http://${trimmed}`;
}

function applyEmbedUrl(config, { reload = true } = {}) {
  const sourceUrl = config.input
    ? config.input.value
    : config.frame?.src || readStorageItem(config.storageKey, storageLegacyKeys(config.storageKey)) || config.defaultUrl;
  const url = normalizeEmbedUrl(sourceUrl, config.defaultUrl);
  if (config.input) config.input.value = url;
  localStorage.setItem(config.storageKey, url);
  if (reload || config.frame.src !== url) {
    config.frame.src = url;
  }
  return url;
}

function loadEmbedUrl(config) {
  if (!config.input) {
    const url = normalizeEmbedUrl(
      readStorageItem(config.storageKey, config.legacyStorageKeys || []) || config.defaultUrl,
      config.defaultUrl
    );
    config.frame.src = url;
    localStorage.setItem(config.storageKey, url);
    return;
  }
  const storedUrl = normalizeEmbedUrl(
    readStorageItem(config.storageKey, storageLegacyKeys(config.storageKey)) || config.defaultUrl,
    config.defaultUrl
  );
  const legacyLocalEvalscopeUrls = ["http://127.0.0.1:9000", "http://127.0.0.1:9000/dashboard", "http://localhost:9000/dashboard"];
  const legacyOpencompassUrls = ["https://rank.opencompass.org.cn/home", "https://hub.opencompass.org.cn/home"];
  const url = config.storageKey === EVALSCOPE_URL_STORAGE_KEY && legacyLocalEvalscopeUrls.includes(storedUrl)
    ? DEFAULT_EVALSCOPE_URL
    : config.storageKey === OPENCOMPASS_URL_STORAGE_KEY && legacyOpencompassUrls.includes(storedUrl)
      ? DEFAULT_OPENCOMPASS_URL
    : storedUrl;
  if (config.input) config.input.value = url;
  config.frame.src = url;
  if (url !== storedUrl) localStorage.setItem(config.storageKey, url);
}

function reloadEmbed(config) {
  const url = config.input ? applyEmbedUrl(config, { reload: false }) : config.defaultUrl;
  config.frame.src = url;
}

function openEmbed(config) {
  const url = config.input ? applyEmbedUrl(config, { reload: false }) : config.defaultUrl;
  window.open(url, "_blank", "noopener,noreferrer");
}

const embedConfigs = {
  evalscope: {
    input: null,
    frame: els.evalscopeFrame,
    storageKey: EVALSCOPE_URL_STORAGE_KEY,
    legacyStorageKeys: LEGACY_EVALSCOPE_URL_STORAGE_KEYS,
    defaultUrl: DEFAULT_EVALSCOPE_URL,
    label: "EvalScope"
  },
  opencompass: {
    input: els.opencompassUrl,
    frame: els.opencompassFrame,
    storageKey: OPENCOMPASS_URL_STORAGE_KEY,
    legacyStorageKeys: LEGACY_OPENCOMPASS_URL_STORAGE_KEYS,
    defaultUrl: DEFAULT_OPENCOMPASS_URL,
    label: "OpenCompass"
  }
};

function setActiveView(view) {
  state.activeView = ["run", "reports", "performance", "feishu", "evalscope", "opencompass"].includes(view) ? view : "run";
  els.views.forEach((viewNode) => {
    viewNode.classList.toggle("is-hidden", viewNode.dataset.view !== state.activeView);
  });
  els.viewLinks.forEach((link) => {
    link.classList.toggle("is-active", link.dataset.viewLink === state.activeView);
  });
  if (state.activeView === "reports") renderHistory();
  if (state.activeView === "feishu") renderFeishuReport();
}

function initialViewFromHash() {
  if (window.location.hash === "#reports" || window.location.hash === "#historyPanel") return "reports";
  if (window.location.hash === "#performance" || window.location.hash === "#performanceView") return "performance";
  if (window.location.hash === "#feishu" || window.location.hash === "#feishuView") return "feishu";
  if (window.location.hash === "#evalscope" || window.location.hash === "#evalscopeView") return "evalscope";
  if (window.location.hash === "#opencompass" || window.location.hash === "#opencompassView") return "opencompass";
  return "run";
}

function bindEvents() {
  els.viewLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      setActiveView(link.dataset.viewLink);
      history.replaceState(null, "", link.getAttribute("href"));
    });
  });

  window.addEventListener("hashchange", () => {
    setActiveView(initialViewFromHash());
  });

  els.channelCards.addEventListener("click", (event) => {
    const button = event.target.closest("[data-channel-id]");
    if (!button || state.isRunning || button.disabled) return;
    state.selectedChannelId = button.dataset.channelId;
    state.selectedBaselineReportId = "";
    state.expandedCaseId = null;
    renderChannels();
    renderSelectedChannel();
    els.resultsPanel.classList.add("is-hidden");
  });

  els.endpointTabs.addEventListener("click", (event) => {
    const button = event.target.closest("[data-endpoint-id]");
    if (!button || state.isRunning) return;
    state.selectedEndpointId = button.dataset.endpointId;
    ensureSelectedChannelSupportsEndpoint();
    state.selectedBaselineReportId = "";
    state.expandedCaseId = null;
    state.customCases = [];
    renderEndpointTabs();
    renderChannels();
    renderSelectedChannel();
    els.resultsPanel.classList.add("is-hidden");
  });

  els.toggleSecret.addEventListener("click", () => {
    const isPassword = els.apiKey.type === "password";
    els.apiKey.type = isPassword ? "text" : "password";
    els.toggleSecret.textContent = isPassword ? "隐藏" : "显示";
    els.toggleSecret.setAttribute("aria-label", isPassword ? "隐藏 API Key" : "显示 API Key");
    els.toggleSecret.setAttribute("title", isPassword ? "隐藏 API Key" : "显示 API Key");
  });

  els.baseUrlPreset?.addEventListener("change", () => {
    if (!els.baseUrlPreset.value) return;
    els.baseUrl.value = els.baseUrlPreset.value;
    updateBatchTargetPlaceholders();
  });

  els.baseUrl?.addEventListener("input", () => {
    renderBaseUrlPreset(els.baseUrl.value);
    updateBatchTargetPlaceholders();
  });

  els.apiKey?.addEventListener("input", updateBatchTargetPlaceholders);
  els.modelName?.addEventListener("input", updateBatchTargetPlaceholders);

  els.batchTargetRows?.addEventListener("click", (event) => {
    const removeButton = event.target.closest("[data-remove-batch-target]");
    if (!removeButton || state.isRunning) return;
    removeBatchTargetRow(removeButton.closest("[data-batch-target-row]"));
  });

  els.batchTargetRows?.addEventListener("input", renderBatchTargetControlState);

  els.batchAddTarget?.addEventListener("click", () => {
    addBatchTargetRow();
  });

  els.batchImportTargets?.addEventListener("click", importBatchTargetsFromText);

  els.batchTargets?.addEventListener("input", () => {
    if (!state.batchModeEnabled) return;
    renderBatchTargetControlState();
  });

  els.runTests.addEventListener("click", runTests);
  els.stopTests.addEventListener("click", stopTests);
  els.rerunTests.addEventListener("click", runTests);
  els.exportJson.addEventListener("click", exportJson);
  els.exportMarkdown.addEventListener("click", exportMarkdown);
  els.saveFeishuSettings.addEventListener("click", () => {
    writeFeishuConfig();
    showToast("飞书文档配置已保存。");
  });
  els.pushFeishuNow.addEventListener("click", () => pushFeishuReport(state.lastReportRecord));
  els.copyFeishuReport.addEventListener("click", () => {
    const markdown = feishuReportMarkdown();
    if (!markdown) {
      showToast("暂无可复制的评测文档。");
      return;
    }
    copyText(markdown, "本次评测文档");
  });
  els.feishuDocumentUrl.addEventListener("input", renderFeishuStatus);
  els.feishuDocumentMode.addEventListener("change", renderFeishuStatus);
  els.feishuTitlePrefix.addEventListener("input", renderFeishuStatus);
  els.feishuReportPreview.addEventListener("input", renderFeishuStatus);
  els.feishuAutoPush.addEventListener("change", () => {
    writeFeishuConfig();
    showToast(els.feishuAutoPush.checked ? "已开启评测完成自动写入。" : "已关闭自动写入。");
  });
  els.reloadEvalscope.addEventListener("click", () => reloadEmbed(embedConfigs.evalscope));
  els.openEvalscope.addEventListener("click", () => openEmbed(embedConfigs.evalscope));
  els.saveOpencompassUrl.addEventListener("click", () => {
    const url = applyEmbedUrl(embedConfigs.opencompass);
    showToast(`OpenCompass 地址已应用：${url}`);
  });
  els.reloadOpencompass.addEventListener("click", () => reloadEmbed(embedConfigs.opencompass));
  els.openOpencompass.addEventListener("click", () => openEmbed(embedConfigs.opencompass));
  els.opencompassUrl.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const url = applyEmbedUrl(embedConfigs.opencompass);
    showToast(`OpenCompass 地址已应用：${url}`);
  });
  document.querySelectorAll("[data-opencompass-preset]").forEach((button) => {
    button.addEventListener("click", () => {
      els.opencompassUrl.value = button.dataset.opencompassPreset === "local"
        ? DEFAULT_OPENCOMPASS_URL
        : button.dataset.opencompassPreset;
      const url = applyEmbedUrl(embedConfigs.opencompass);
      showToast(`OpenCompass 地址已应用：${url}`);
    });
  });
  els.clearHistory.addEventListener("click", () => {
    writeHistory([]);
    state.expandedHistoryId = null;
    renderHistory();
    showToast("历史报告已清空。");
  });
  els.importHistoryFile?.addEventListener("change", async () => {
    await importHistoryFiles(els.importHistoryFile.files);
    els.importHistoryFile.value = "";
  });
  els.fillPerformanceFromRun?.addEventListener("click", fillPerformanceFromRunConfig);
  els.runPerformanceBenchmark?.addEventListener("click", runPerformanceBenchmark);
  els.performanceBackend?.addEventListener("change", () => {
    if (!els.performanceEndpoint) return;
    els.performanceEndpoint.value = els.performanceBackend.value === "openai"
      ? "/v1/completions"
      : "/v1/chat/completions";
  });
  els.copyPerformanceJson?.addEventListener("click", () => {
    if (!state.lastPerformanceResult) {
      showToast("还没有可复制的性能测试结果。");
      return;
    }
    copyText(JSON.stringify(state.lastPerformanceResult, null, 2), "性能 JSON");
  });

  els.historyFilters?.addEventListener("click", (event) => {
    const reset = event.target.closest("[data-history-filter-reset]");
    if (reset) {
      state.historyFilters = { channel: "all", model: "all", endpoint: "all" };
      state.expandedHistoryId = null;
      renderHistory();
      return;
    }
    const button = event.target.closest("[data-history-filter]");
    if (!button) return;
    state.historyFilters[button.dataset.historyFilter] = button.dataset.historyFilterValue || "all";
    state.expandedHistoryId = null;
    renderHistory();
  });

  els.proxyEnabled.addEventListener("change", renderProxyState);
  els.proxyUrl.addEventListener("input", renderProxyState);
  els.batchModeToggle?.addEventListener("click", () => {
    state.batchModeEnabled = !state.batchModeEnabled;
    renderBatchMode();
    updateRunAvailability();
  });
  els.baselineReport?.addEventListener("change", () => {
    state.selectedBaselineReportId = els.baselineReport.value;
    if (state.completedResults.length) {
      state.completedResults = state.completedResults.map((result) => {
        const responseBody = result.response_body || null;
        const baseline = selectedBaselineRecord();
        const baselineResponse = baselineResponseForResult(result, baseline);
        return {
          ...result,
          diff_count: baselineResponse && responseBody && typeof responseBody === "object"
            ? compareStructure(baselineResponse, responseBody).length
            : result.error ? 1 : 0
        };
      });
      renderStats();
      renderTabs();
      renderResults();
    }
  });
  els.addCustomPayload.addEventListener("click", addCustomPayloadCase);
  els.clearCustomPayload.addEventListener("click", () => {
    els.customPayloadInput.value = "";
    state.customCases = [];
    els.customPayloadHint.textContent = state.customCases.length
      ? `已添加 ${state.customCases.length} 个自定义 payload。`
      : "粘贴 JSON object 后添加为临时 case。";
    renderCaseSelector(state.providerCases[currentCaseCacheKey()]);
  });

  els.parameterGroups.addEventListener("change", (event) => {
    const input = event.target.closest("input[data-case-bulk]");
    if (!input || state.isRunning || state.isCaseLoading) return;
    setCaseSelection(parseCaseIds(input.dataset.caseBulk), input.checked);
    refreshCaseSelectionUi();
  });

  els.caseGroups.addEventListener("change", (event) => {
    const bulkInput = event.target.closest("input[data-case-bulk]");
    if (bulkInput && !state.isRunning && !state.isCaseLoading) {
      setCaseSelection(parseCaseIds(bulkInput.dataset.caseBulk), bulkInput.checked);
      refreshCaseSelectionUi();
      return;
    }

    const input = event.target.closest("input[data-case-id]");
    if (!input || state.isRunning) return;
    if (input.checked) {
      state.selectedCaseIds.add(input.dataset.caseId);
    } else {
      state.selectedCaseIds.delete(input.dataset.caseId);
    }
    refreshCaseSelectionUi();
  });

  els.caseGroups.addEventListener("click", (event) => {
    const copyButton = event.target.closest('[data-action="copy-case-curl"]');
    const payloadButton = event.target.closest('[data-action="toggle-case-payload"]');
    const removeButton = event.target.closest('[data-action="remove-custom-case"]');
    const actionButton = copyButton || payloadButton || removeButton;
    if (!actionButton) return;
    event.preventDefault();
    event.stopPropagation();
    if (copyButton) {
      const testCase = allProviderCases().find((item) => item.case_id === copyButton.dataset.caseId);
      if (!testCase) return;
      copyText(buildCaseCurl(testCase), "curl");
      return;
    }
    if (payloadButton) {
      const payload = els.caseGroups.querySelector(`[data-case-payload="${CSS.escape(payloadButton.dataset.caseId)}"]`);
      if (payload) payload.classList.toggle("is-hidden");
      return;
    }
    state.customCases = state.customCases.filter((item) => item.case_id !== removeButton.dataset.caseId);
    state.selectedCaseIds.delete(removeButton.dataset.caseId);
    els.customPayloadHint.textContent = state.customCases.length
      ? `已添加 ${state.customCases.length} 个自定义 payload。`
      : "粘贴 JSON object 后添加为临时 case。";
    renderCaseSelector(state.providerCases[currentCaseCacheKey()]);
  });

  els.selectAllCases.addEventListener("click", () => {
    const cases = allProviderCases();
    state.selectedCaseIds = new Set(cases.map((testCase) => testCase.case_id));
    renderCaseSelector(state.providerCases[currentCaseCacheKey()]);
  });

  els.clearAllCases.addEventListener("click", () => {
    state.selectedCaseIds = new Set();
    renderCaseSelector(state.providerCases[currentCaseCacheKey()]);
  });

  els.filterTabs.addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter]");
    if (!button) return;
    state.selectedFilter = button.dataset.filter;
    state.expandedCaseId = null;
    renderTabs();
    renderResults();
  });

  els.resultRows.addEventListener("click", (event) => {
    const actionButton = event.target.closest("[data-action]");
    if (actionButton) {
      const result = state.completedResults.find((item) => (item.result_uid || item.case_id) === actionButton.dataset.resultId);
      if (!result) return;
      if (actionButton.dataset.action === "copy-diff") copyText(diffMarkdown(result), "结构差异");
      if (actionButton.dataset.action === "copy-reply") copyText(customerReply(result), "结论");
      if (actionButton.dataset.action === "save-case") showToast(`${result.parameter} 已保存为模拟用例。`);
      return;
    }

    const row = event.target.closest("[data-result-id]");
    if (!row) return;
    state.expandedCaseId = state.expandedCaseId === row.dataset.resultId ? null : row.dataset.resultId;
    renderResults();
  });

  els.historyList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-history-action]");
    if (!button) return;
    const items = readHistory();
    const record = items.find((item) => item.id === button.dataset.historyId);
    if (!record) return;
    if (button.dataset.historyAction === "copy") {
      copyText(historyRecordMarkdown(record), "历史报告");
      return;
    }
    if (button.dataset.historyAction === "feishu") {
      state.lastReportRecord = record;
      renderFeishuReport(record);
      pushFeishuReport(record);
      return;
    }
    if (button.dataset.historyAction === "toggle") {
      state.expandedHistoryId = state.expandedHistoryId === record.id ? null : record.id;
      renderHistory();
      return;
    }
    if (button.dataset.historyAction === "delete") {
      writeHistory(items.filter((item) => item.id !== record.id));
      if (state.expandedHistoryId === record.id) state.expandedHistoryId = null;
      renderHistory();
      showToast("历史报告已删除。");
    }
  });
}

renderChannels();
renderEndpointTabs();
renderSelectedChannel();
bindEvents();
renderProxyState();
loadFeishuConfig();
loadEmbedUrl(embedConfigs.evalscope);
loadEmbedUrl(embedConfigs.opencompass);
renderHistory();
autoImportOriginalBaselines();
setActiveView(initialViewFromHash());
