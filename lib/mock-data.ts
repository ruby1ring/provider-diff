export type TestStatus = "accepted" | "rejected" | "warning" | "na";

export type ChannelTemplate = {
  channel_id: string;
  name: string;
  emoji: string;
  logo: string;
  description: string;
  summary: string;
  default_base_url: string;
  default_model: string;
  parameters: Record<string, string[]>;
  expected_rejected?: string[];
};

export type MockResult = {
  case_id: string;
  channel_id: string;
  parameter: string;
  category: string;
  status: TestStatus;
  latency_ms: number;
  diff_count: number;
  message: string;
};

const baselineResponse = {
  id: "chatcmpl-openai-baseline",
  object: "chat.completion",
  created: 1764226800,
  model: "gpt-4o-mini",
  choices: [
    {
      index: 0,
      message: { role: "assistant", content: "hi" },
      finish_reason: "stop"
    }
  ],
  usage: {
    prompt_tokens: 9,
    completion_tokens: 2,
    total_tokens: 11
  }
};

const compatibleResponse = {
  id: "chatcmpl-channel-ok",
  object: "chat.completion",
  created: 1764226801,
  model: "deepseek-chat",
  choices: [
    {
      index: 0,
      message: { role: "assistant", content: "hi" },
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
  ...compatibleResponse,
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

const warningResponse = {
  ...compatibleResponse,
  id: "chatcmpl-channel-warning",
  choices: {
    index: 0,
    message: { role: "assistant", content: "hi" },
    finish_reason: "stop"
  },
  usage: {
    prompt_tokens: "9",
    completion_tokens: 2,
    total_tokens: 11
  },
  warnings: ["frequency_penalty ignored by this provider"]
};

const missingUsageResponse = {
  id: "chatcmpl-missing-usage",
  object: "chat.completion",
  created: 1764226801,
  model: "deepseek-chat",
  choices: [
    {
      index: 0,
      message: { role: "assistant", content: "hi" },
      finish_reason: "stop"
    }
  ]
};

const requestFor = (parameter: string) => ({
  model: "deepseek-chat",
  messages: [{ role: "user", content: "Say hi" }],
  [parameter]:
    parameter === "n"
      ? 2
      : parameter === "response_format"
        ? { type: "json_object" }
        : parameter === "tools"
          ? [{ type: "function", function: { name: "lookup", parameters: { type: "object" } } }]
          : true
});

export const CHANNEL_TEMPLATES: ChannelTemplate[] = [
  {
    channel_id: "openai",
    name: "OpenAI Official",
    emoji: "🇺🇸",
    logo: "assets/logos/openai.svg",
    description: "参考基线",
    summary: "25 parameters · the standard",
    default_base_url: "https://api.openai.com/v1",
    default_model: "gpt-4o-mini",
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
  },
  {
    channel_id: "deepseek",
    name: "DeepSeek",
    emoji: "🐳",
    logo: "assets/logos/deepseek.ico",
    description: "DeepSeek 官方",
    summary: "22 个重点参数",
    default_base_url: "https://api.deepseek.com",
    default_model: "deepseek-v4-flash",
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
  },
  {
    channel_id: "aliyun",
    name: "Aliyun Bailian",
    emoji: "☁️",
    logo: "assets/logos/aliyun.svg",
    description: "阿里百炼（DashScope）",
    summary: "30 parameters",
    default_base_url: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    default_model: "qwen-plus",
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
  },
  {
    channel_id: "minimax",
    name: "MiniMax",
    emoji: "🎬",
    logo: "assets/logos/minimax.ico",
    description: "MiniMax 官方",
    summary: "15 parameters",
    default_base_url: "https://api.minimaxi.com/v1",
    default_model: "MiniMax-M2",
    parameters: {
      Sampling: ["temperature", "top_p", "stop"],
      Length: ["max_tokens"],
      Output: ["response_format"],
      Tools: ["tools", "tool_choice"],
      Protocol: ["stream"],
      Metadata: ["user"],
      Extra: ["mask_sensitive_info", "tools_calling_choice"]
    }
  },
  {
    channel_id: "siliconflow",
    name: "SiliconFlow",
    emoji: "🧊",
    logo: "assets/logos/siliconflow-mark.svg",
    description: "硅基流动",
    summary: "20 parameters",
    default_base_url: "https://api.siliconflow.cn/v1",
    default_model: "deepseek-ai/DeepSeek-V3",
    parameters: {
      Sampling: ["temperature", "top_p", "n", "seed", "stop", "frequency_penalty", "presence_penalty"],
      Length: ["max_tokens"],
      Reasoning: ["enable_thinking"],
      Output: ["response_format"],
      Tools: ["tools", "tool_choice", "parallel_tool_calls"],
      Protocol: ["stream", "stream_options"],
      Debug: ["logprobs", "top_logprobs"],
      Metadata: ["user"]
    }
  }
];

export const MOCK_PARAMETER_ORIGINS: Record<string, string> = {
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
  thinking: "deepseek-extension",
  user_id: "deepseek-extension",
  reasoning_content: "deepseek-extension",
  "messages[].prefix": "deepseek-extension",
  "messages[].reasoning_content": "deepseek-extension",
  "tools[].function.strict": "deepseek-extension",
  "tools[].function.parameters": "openai-standard",
  enable_thinking: "qwen-extension",
  preserve_thinking: "qwen-extension",
  thinking_budget: "qwen-extension",
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
  result_format: "dashscope-private",
  incremental_output: "dashscope-private",
  mask_sensitive_info: "minimax-private",
  tools_calling_choice: "minimax-private"
};

export const MOCK_RESULTS: MockResult[] = [
  { case_id: "deepseek:temperature", channel_id: "deepseek", parameter: "temperature", category: "sampling", status: "accepted", latency_ms: 412, diff_count: 0, message: "" },
  { case_id: "deepseek:top_p", channel_id: "deepseek", parameter: "top_p", category: "sampling", status: "accepted", latency_ms: 389, diff_count: 0, message: "" },
  { case_id: "deepseek:stop", channel_id: "deepseek", parameter: "stop", category: "sampling", status: "accepted", latency_ms: 376, diff_count: 0, message: "" },
  { case_id: "deepseek:frequency_penalty", channel_id: "deepseek", parameter: "frequency_penalty", category: "sampling", status: "warning", latency_ms: 430, diff_count: 3, message: "contains hint: ignored" },
  { case_id: "deepseek:presence_penalty", channel_id: "deepseek", parameter: "presence_penalty", category: "sampling", status: "accepted", latency_ms: 417, diff_count: 0, message: "" },
  { case_id: "deepseek:max_tokens", channel_id: "deepseek", parameter: "max_tokens", category: "length", status: "accepted", latency_ms: 398, diff_count: 0, message: "" },
  { case_id: "deepseek:thinking", channel_id: "deepseek", parameter: "thinking", category: "reasoning", status: "accepted", latency_ms: 421, diff_count: 2, message: "may add reasoning_content" },
  { case_id: "deepseek:reasoning_effort", channel_id: "deepseek", parameter: "reasoning_effort", category: "reasoning", status: "accepted", latency_ms: 438, diff_count: 2, message: "supports high/max and compatibility mappings" },
  { case_id: "deepseek:response_format", channel_id: "deepseek", parameter: "response_format", category: "output", status: "accepted", latency_ms: 451, diff_count: 0, message: "" },
  { case_id: "deepseek:tools", channel_id: "deepseek", parameter: "tools", category: "tools", status: "accepted", latency_ms: 506, diff_count: 2, message: "tool call shape differs" },
  { case_id: "deepseek:tool_choice", channel_id: "deepseek", parameter: "tool_choice", category: "tools", status: "accepted", latency_ms: 469, diff_count: 1, message: "adds provider fingerprint" },
  { case_id: "deepseek:stream", channel_id: "deepseek", parameter: "stream", category: "protocol", status: "accepted", latency_ms: 334, diff_count: 0, message: "" },
  { case_id: "deepseek:stream_options", channel_id: "deepseek", parameter: "stream_options", category: "protocol", status: "accepted", latency_ms: 386, diff_count: 0, message: "" },
  { case_id: "deepseek:logprobs", channel_id: "deepseek", parameter: "logprobs", category: "debug", status: "accepted", latency_ms: 512, diff_count: 0, message: "" },
  { case_id: "deepseek:top_logprobs", channel_id: "deepseek", parameter: "top_logprobs", category: "debug", status: "accepted", latency_ms: 444, diff_count: 0, message: "" },
  { case_id: "deepseek:user_id", channel_id: "deepseek", parameter: "user_id", category: "metadata", status: "accepted", latency_ms: 361, diff_count: 0, message: "" },
  { case_id: "coverage:audio", channel_id: "coverage", parameter: "audio", category: "output", status: "na", latency_ms: 0, diff_count: 0, message: "mock coverage for n/a status" }
];

export const MOCK_RESPONSES: Record<string, unknown> = Object.fromEntries(
  MOCK_RESULTS.map((result) => {
    const channel_response =
      result.parameter === "frequency_penalty" || result.parameter === "tools"
          ? warningResponse
          : result.parameter === "stream_options"
            ? missingUsageResponse
            : result.diff_count > 0
              ? extensionResponse
              : compatibleResponse;

    return [
      result.case_id,
      {
        request_body: requestFor(result.parameter),
        baseline_response: baselineResponse,
        channel_response
      }
    ];
  })
);
