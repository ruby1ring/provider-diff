const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

const CHAT_PROVIDERS = ["openai", "claude", "deepseek", "minimax", "siliconflow", "openrouter", "ali", "vllm"];
const MESSAGE_PROVIDERS = ["claude", "deepseek", "minimax", "siliconflow", "openrouter", "ali"];
const COMMON_CAPACITY_CANDIDATES = [4194304, 2097152, 1048576, 524288, 262144, 131072, 65536, 32768, 16384, 8192, 4096, 2048, 1024];
const DEFAULT_OUTPUT_CANDIDATES = COMMON_CAPACITY_CANDIDATES;
const DEFAULT_CONTEXT_CANDIDATES = COMMON_CAPACITY_CANDIDATES;
const DEFAULT_INPUT_CANDIDATES = COMMON_CAPACITY_CANDIDATES;
const DEFAULT_OUTPUT_EFFECTIVE_CAPS = [512, 64];
const DEFAULT_THINKING_BUDGET_CANDIDATES = [32768, 16384, 8192, 4096, 2048, 1024, 512, 256, 128];
const DEFAULT_CONTEXT_SAFETY_MARGIN_RATIO = 0.05;

const PROBE_KIND_BY_ARG = {
  output: "max_output",
  context: "total_context",
  input: "max_input",
  "output-effective": "max_output_effective",
  "thinking-budget": "thinking_budget"
};
const SUPPORTED_PROBE_ARGS = Object.keys(PROBE_KIND_BY_ARG);

const OUTPUT_PARAM_BY_PROVIDER = {
  openai: "max_completion_tokens",
  claude: "max_completion_tokens",
  deepseek: "max_tokens",
  minimax: "max_completion_tokens",
  siliconflow: "max_tokens",
  openrouter: "max_completion_tokens",
  ali: "max_tokens",
  vllm: "max_tokens"
};

// thinking budget dialect per provider; providers without a token-budget field are skipped.
const THINKING_BUDGET_FIELD_BY_PROVIDER = {
  siliconflow: { field: "thinking_budget", enableThinking: true },
  ali: { field: "thinking_budget", enableThinking: true },
  vllm: { field: "thinking_budget", enableThinking: true },
  deepseek: { field: "thinking.budget_tokens", enableThinking: false },
  claude: { field: "thinking.budget_tokens", enableThinking: false },
  openrouter: { field: "reasoning.max_tokens", enableThinking: false }
};

function forceLongPrompt() {
  return "Write an extremely long and detailed essay about the history of computing, from the abacus to modern AI accelerators. Keep writing continuously with many sections and paragraphs, and do not stop, summarize, or conclude until you are cut off.";
}

function hardReasoningPrompt() {
  return "Think step by step in extensive detail before answering, and show all of your reasoning. "
    + "Carefully work through every case and double-check each step: "
    + "Three friends Alice, Bob, and Carol each pick a distinct integer from 1 to 9. "
    + "The sum of Alice's and Bob's numbers equals twice Carol's number; Bob's number is a prime; "
    + "Alice's number is even; and the product of all three numbers is divisible by 12. "
    + "Enumerate the possibilities exhaustively, explain why each candidate works or fails, then state the final answer.";
}

function usage() {
  console.log(`Usage:
  node scripts/probe-capacity.js [options]

Options:
  --providers openai,deepseek     Providers to probe. Default: all chat providers.
  --endpoint-id chat_completions  chat_completions, anthropic_messages, or all. Default: chat_completions.
  --probes output,context         Comma-separated: ${SUPPORTED_PROBE_ARGS.join(", ")}. Default: output,context.
  --config config.yaml            Local config file. Default: config.yaml.
  --output outputs/file.json      Result JSON path. Default: timestamped file under outputs/capacity-probes.
  --model provider=model          Override a provider model. Can be repeated.
  --max-output-candidates list    Descending integer or k/m list. Default: ${formatCandidateList(DEFAULT_OUTPUT_CANDIDATES)}.
  --context-candidates list       Descending integer or k/m list. Default: ${formatCandidateList(DEFAULT_CONTEXT_CANDIDATES)}.
  --input-candidates list         max_input ladder. Default: ${formatCandidateList(DEFAULT_INPUT_CANDIDATES)}.
  --output-effective-caps list    Small caps for output-effective. Default: ${formatCandidateList(DEFAULT_OUTPUT_EFFECTIVE_CAPS)}.
  --thinking-budget-candidates l  thinking-budget ladder. Default: ${formatCandidateList(DEFAULT_THINKING_BUDGET_CANDIDATES)}.
  --no-context-balanced           Disable balanced context split (use input-heavy context probing).
  --context-output-tokens n       Output budget used during input-heavy context probes. Default: 8.
  --context-safety-margin-ratio n Ratio subtracted from each context tier. Default: ${DEFAULT_CONTEXT_SAFETY_MARGIN_RATIO}.
  --timeout-ms n                  Per-request timeout. Default: 180000.
  --retries n                     Retries for transient 429/5xx/network failures. Default: 2.
  --max-concurrency n             Concurrent provider/model targets. Default: 2.
  --exhaustive                    Test every configured candidate after a boundary is found.
  --stop-on-first-pass            Stop probing after the first supported candidate.
  --continue-after-pass           Deprecated alias for --exhaustive.
  --dry-run                       Print planned targets and candidates without sending requests.

Examples:
  node scripts/probe-capacity.js --providers openai,deepseek
  node scripts/probe-capacity.js --endpoint-id all --providers claude,openrouter
  node scripts/probe-capacity.js --providers vllm --model vllm=Qwen/Qwen3-8B --context-candidates 512k,256k,128k
`);
}

function parseArgs(argv) {
  const args = {
    providers: "",
    endpointId: "chat_completions",
    probes: ["output", "context"],
    config: path.join(root, "config.yaml"),
    output: "",
    modelOverrides: {},
    outputCandidates: DEFAULT_OUTPUT_CANDIDATES,
    contextCandidates: DEFAULT_CONTEXT_CANDIDATES,
    inputCandidates: DEFAULT_INPUT_CANDIDATES,
    outputEffectiveCaps: DEFAULT_OUTPUT_EFFECTIVE_CAPS,
    thinkingBudgetCandidates: DEFAULT_THINKING_BUDGET_CANDIDATES,
    contextBalanced: true,
    contextOutputTokens: 8,
    contextSafetyMarginRatio: DEFAULT_CONTEXT_SAFETY_MARGIN_RATIO,
    timeoutMs: 180000,
    retries: 2,
    maxConcurrency: 2,
    stopOnFirstPass: false,
    exhaustive: false,
    dryRun: false
  };

  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    const next = () => {
      i += 1;
      if (i >= argv.length) throw new Error(`${item} requires a value`);
      return argv[i];
    };
    if (item === "--help" || item === "-h") {
      usage();
      process.exit(0);
    } else if (item === "--providers") {
      args.providers = next();
    } else if (item === "--endpoint-id") {
      args.endpointId = next();
    } else if (item === "--probes") {
      args.probes = splitCSV(next());
    } else if (item === "--config") {
      args.config = path.resolve(root, next());
    } else if (item === "--output") {
      args.output = path.resolve(root, next());
    } else if (item === "--model") {
      const value = next();
      const at = value.indexOf("=");
      if (at <= 0) throw new Error("--model must use provider=model");
      args.modelOverrides[value.slice(0, at).trim()] = value.slice(at + 1).trim();
    } else if (item === "--max-output-candidates") {
      args.outputCandidates = parseCandidateList(next(), "--max-output-candidates");
    } else if (item === "--context-candidates") {
      args.contextCandidates = parseCandidateList(next(), "--context-candidates");
    } else if (item === "--input-candidates") {
      args.inputCandidates = parseCandidateList(next(), "--input-candidates");
    } else if (item === "--output-effective-caps") {
      args.outputEffectiveCaps = parseCandidateList(next(), "--output-effective-caps");
    } else if (item === "--thinking-budget-candidates") {
      args.thinkingBudgetCandidates = parseCandidateList(next(), "--thinking-budget-candidates");
    } else if (item === "--no-context-balanced") {
      args.contextBalanced = false;
    } else if (item === "--context-output-tokens") {
      args.contextOutputTokens = positiveInt(next(), "--context-output-tokens");
    } else if (item === "--context-safety-margin-ratio") {
      args.contextSafetyMarginRatio = ratioValue(next(), "--context-safety-margin-ratio");
    } else if (item === "--timeout-ms") {
      args.timeoutMs = positiveInt(next(), "--timeout-ms");
    } else if (item === "--retries") {
      const retries = Number(next());
      if (!Number.isInteger(retries) || retries < 0) throw new Error("--retries must be a non-negative integer");
      args.retries = retries;
    } else if (item === "--max-concurrency") {
      args.maxConcurrency = positiveInt(next(), "--max-concurrency");
    } else if (item === "--continue-after-pass") {
      args.exhaustive = true;
    } else if (item === "--exhaustive") {
      args.exhaustive = true;
    } else if (item === "--stop-on-first-pass") {
      args.stopOnFirstPass = true;
    } else if (item === "--dry-run") {
      args.dryRun = true;
    } else {
      throw new Error(`Unknown option: ${item}`);
    }
  }

  for (const probe of args.probes) {
    if (!SUPPORTED_PROBE_ARGS.includes(probe)) {
      throw new Error(`Unsupported probe "${probe}". Use one or more of: ${SUPPORTED_PROBE_ARGS.join(", ")}.`);
    }
  }
  if (!["chat_completions", "anthropic_messages", "all"].includes(args.endpointId)) {
    throw new Error("--endpoint-id must be chat_completions, anthropic_messages, or all");
  }
  return args;
}

function splitCSV(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function positiveInt(value, name) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${name} must be a positive integer`);
  return parsed;
}

function ratioValue(value, name) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed >= 1) throw new Error(`${name} must be a number greater than 0 and less than 1`);
  return parsed;
}

function parseTokenSize(value, name) {
  const text = String(value || "").trim().toLowerCase();
  const match = text.match(/^(\d+)([km])?$/);
  if (!match) throw new Error(`${name} values must be positive integers, optionally suffixed with k or m`);
  const amount = Number(match[1]);
  if (!Number.isInteger(amount) || amount <= 0) throw new Error(`${name} values must be positive integers`);
  const unit = match[2] || "";
  if (unit === "k") return amount * 1024;
  if (unit === "m") return amount * 1024 * 1024;
  return amount;
}

function parseCandidateList(value, name) {
  const list = splitCSV(value).map((item) => parseTokenSize(item, name));
  if (!list.length) throw new Error(`${name} cannot be empty`);
  return [...new Set(list)].sort((a, b) => b - a);
}

function readConfig(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  const config = {};
  let current = "";
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const section = line.match(/^([A-Za-z0-9_-]+):$/);
    if (section) {
      current = section[1];
      config[current] = {};
      continue;
    }
    if (!current) continue;
    if (/^https?:\/\//.test(line)) {
      config[current].base_url = line;
    } else if (!config[current].api_key) {
      config[current].api_key = line;
    }
  }
  return config;
}

/** Map probe provider id → config.yaml section ids (测评渠道 platform id first). */
const PROVIDER_CONFIG_KEYS = {
  ali: ["aliyun-cn", "aliyun-us", "aliyun-sg", "aliyun", "ali"],
  siliconflow: ["siliconflow-cn", "siliconflow-com", "siliconflow"],
  openrouter: ["openrouter"],
  deepseek: ["deepseek"],
  minimax: ["minimax"],
  openai: ["openai"],
  claude: ["claude"],
  vllm: ["vllm"]
};

function providerConfig(config, provider) {
  const keys = PROVIDER_CONFIG_KEYS[provider] || [provider];
  for (const key of keys) {
    const entry = config[key];
    if (entry?.api_key && !String(entry.api_key).includes("your-")) return entry;
  }
  return config[provider] || {};
}

function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function manifestFor(provider, endpointId) {
  const dir = endpointId === "anthropic_messages" ? `${provider}_messages` : provider;
  const filePath = path.join(root, "payloads", dir, "manifest.json");
  if (!fs.existsSync(filePath)) return null;
  return readJSON(filePath);
}

function buildTargets(args, config) {
  const endpointIds = args.endpointId === "all" ? ["chat_completions", "anthropic_messages"] : [args.endpointId];
  const requestedProviders = args.providers ? splitCSV(args.providers) : CHAT_PROVIDERS;
  const targets = [];
  for (const endpointId of endpointIds) {
    for (const provider of requestedProviders) {
      if (endpointId === "anthropic_messages" && !MESSAGE_PROVIDERS.includes(provider)) continue;
      const manifest = manifestFor(provider, endpointId);
      if (!manifest) continue;
      const auth = providerConfig(config, provider);
      const endpointAuth = config[manifest.provider] || {};
      const baseUrl = endpointAuth.base_url || (endpointId === "chat_completions" ? auth.base_url : "") || manifest.base_url;
      const apiKey = endpointAuth.api_key || auth.api_key || "";
      const model = args.modelOverrides[provider] || args.modelOverrides[`${provider}:${endpointId}`] || manifest.default_model;
      targets.push({
        provider,
        manifestProvider: manifest.provider,
        endpointId,
        manifest,
        baseUrl,
        endpointUrl: buildEndpointURL(baseUrl, manifest.endpoint),
        apiKey,
        model
      });
    }
  }
  return targets;
}

function buildEndpointURL(baseUrl, endpoint) {
  const trimmedBase = String(baseUrl || "").trim().replace(/\/+$/, "");
  const endpointPath = `/${String(endpoint || "").trim().replace(/^\/+/, "")}`;
  if (!endpoint || trimmedBase.endsWith(endpointPath)) return trimmedBase;
  return `${trimmedBase}${endpointPath}`;
}

function outputParam(target) {
  if (target.endpointId === "anthropic_messages") return "max_tokens";
  return OUTPUT_PARAM_BY_PROVIDER[target.provider] || "max_tokens";
}

function authHeaderName(manifestProvider) {
  if (["ali_messages", "claude_messages", "deepseek_messages", "minimax_messages"].includes(manifestProvider)) {
    return "X-Api-Key";
  }
  return "Authorization";
}

function requestHeaders(target) {
  const headerName = authHeaderName(target.manifestProvider);
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json"
  };
  if (headerName === "X-Api-Key") {
    headers[headerName] = target.apiKey;
  } else {
    headers[headerName] = `Bearer ${target.apiKey}`;
  }
  if (target.endpointId === "anthropic_messages") {
    headers["anthropic-version"] = "2023-06-01";
  }
  return headers;
}

function basePayload(target, userContent, maxOutputTokens) {
  const limitName = outputParam(target);
  if (target.endpointId === "anthropic_messages") {
    return {
      model: target.model,
      max_tokens: maxOutputTokens,
      messages: [{ role: "user", content: userContent }]
    };
  }
  return {
    model: target.model,
    messages: [{ role: "user", content: userContent }],
    [limitName]: maxOutputTokens
  };
}

function outputProbePayload(target, candidate) {
  return basePayload(target, "Reply exactly: OK", candidate);
}

function contextProbePayload(target, totalContextTokens, outputTokens, safetyMarginRatio) {
  const tested = contextProbeSizing(totalContextTokens, outputTokens, safetyMarginRatio);
  const estimatedInputTokens = tested.estimated_input_tokens;
  const content = longPrompt(estimatedInputTokens);
  return basePayload(target, content, outputTokens);
}

function inputProbePayload(target, inputTokens, safetyMarginRatio) {
  const sizing = inputProbeSizing(inputTokens, safetyMarginRatio);
  const content = longPrompt(sizing.estimated_input_tokens);
  return basePayload(target, content, 16);
}

function inputProbeSizing(inputTokens, safetyMarginRatio) {
  const candidate = Math.max(1, Number(inputTokens) || 1);
  const ratio = Math.min(Math.max(0, Number(safetyMarginRatio) || 0), 0.99);
  const margin = Math.round(candidate * ratio);
  const tested = Math.max(1, candidate - margin);
  return {
    estimated_input_tokens: tested,
    tested_total_context_tokens: tested,
    tested_total_context_display: formatTokenUnit(tested),
    applied_context_safety_margin_tokens: candidate - tested,
    requested_max_output_tokens: 16
  };
}

// Balanced context: split a context tier into input/output that each stay under the
// measured caps, so a context that exceeds the input cap can still be reached.
function balancedContextPayload(target, totalContextTokens, maxInput, maxOutput, safetyMarginRatio) {
  const sizing = balancedContextSizing(totalContextTokens, maxInput, maxOutput, safetyMarginRatio);
  const content = longPrompt(sizing.estimated_input_tokens);
  return basePayload(target, content, sizing.requested_max_output_tokens);
}

function balancedContextSizing(totalContextTokens, maxInput, maxOutput, safetyMarginRatio) {
  const candidate = Math.max(2, Number(totalContextTokens) || 2);
  const ratio = Math.min(Math.max(0, Number(safetyMarginRatio) || 0), 0.99);
  const margin = Math.round(candidate * ratio);
  const testedTotal = Math.max(2, candidate - margin);
  let output = Math.min(maxOutput, testedTotal - 1);
  if (output < 1) output = 1;
  let input = testedTotal - output;
  if (input > maxInput) {
    input = maxInput;
    output = Math.max(1, testedTotal - input);
  }
  if (input < 1) input = 1;
  return {
    estimated_input_tokens: input,
    requested_max_output_tokens: output,
    tested_total_context_tokens: testedTotal,
    tested_total_context_display: formatTokenUnit(testedTotal),
    applied_context_safety_margin_tokens: candidate - testedTotal,
    context_method: "balanced"
  };
}

function thinkingBudgetField(target) {
  return THINKING_BUDGET_FIELD_BY_PROVIDER[target.provider] || null;
}

function thinkingBudgetPayload(target, budget) {
  let outputTokens = Math.min(65536, Math.max(2048, budget + 2048));
  const payload = basePayload(target, hardReasoningPrompt(), outputTokens);
  const mapping = thinkingBudgetField(target);
  if (!mapping) return payload;
  if (mapping.field === "thinking.budget_tokens") {
    payload.thinking = { type: "enabled", budget_tokens: budget };
  } else if (mapping.field === "reasoning.max_tokens") {
    payload.reasoning = { max_tokens: budget, enabled: true };
  } else {
    payload.thinking_budget = budget;
    if (mapping.enableThinking) payload.enable_thinking = true;
  }
  return payload;
}

function outputEffectivePayload(target, cap) {
  return basePayload(target, forceLongPrompt(), cap);
}

function contextProbeSizing(totalContextTokens, outputTokens, safetyMarginRatio) {
  const candidate = Math.max(1, Number(totalContextTokens) || 1);
  const output = Math.max(1, Number(outputTokens) || 1);
  const ratio = Math.min(Math.max(0, Number(safetyMarginRatio) || 0), 0.99);
  const appliedMargin = Math.round(candidate * ratio);
  let testedTotal = candidate - appliedMargin;
  const minTotal = output + 1;
  let finalMargin = appliedMargin;
  if (testedTotal < minTotal) {
    testedTotal = minTotal;
    finalMargin = Math.max(0, candidate - testedTotal);
  }
  return {
    tested_total_context_tokens: testedTotal,
    tested_total_context_display: formatTokenUnit(testedTotal),
    applied_context_safety_margin_tokens: finalMargin,
    applied_context_safety_margin_display: formatTokenUnit(finalMargin),
    context_safety_margin_ratio: ratio,
    context_safety_margin_percent: ratio * 100,
    estimated_input_tokens: Math.max(1, testedTotal - output),
    requested_max_output_tokens: output,
    estimated_total_context_tokens: testedTotal
  };
}

function longPrompt(estimatedInputTokens) {
  const prefix = "Capacity probe. Ignore the repeated filler and reply with OK.\n\n";
  const suffix = "\n\nReply exactly: OK";
  const fillerTokens = Math.max(1, estimatedInputTokens - 24);
  return prefix + "x ".repeat(fillerTokens) + suffix;
}

function summarizeUsage(body) {
  const usage = body && typeof body === "object" ? body.usage : null;
  if (!usage || typeof usage !== "object") return null;
  const out = {};
  for (const key of [
    "prompt_tokens",
    "completion_tokens",
    "total_tokens",
    "input_tokens",
    "output_tokens"
  ]) {
    if (Number.isFinite(usage[key])) out[key] = usage[key];
  }
  return Object.keys(out).length ? out : null;
}

function finishReason(body, endpointId) {
  if (!body || typeof body !== "object") return "";
  if (endpointId === "anthropic_messages") return typeof body.stop_reason === "string" ? body.stop_reason : "";
  const choice = Array.isArray(body.choices) ? body.choices[0] : null;
  return choice && typeof choice.finish_reason === "string" ? choice.finish_reason : "";
}

function reasoningTokensFromBody(body) {
  let max = 0;
  let found = false;
  const walk = (value) => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    for (const [key, child] of Object.entries(value)) {
      if (key.toLowerCase() === "reasoning_tokens") {
        const count = Number(child);
        if (Number.isFinite(count)) {
          found = true;
          if (count > max) max = count;
        }
      }
      walk(child);
    }
  };
  walk(body);
  return found ? max : null;
}

const FINISH_REASON_LENGTH = new Set(["length", "max_tokens", "max_output_tokens", "output_limit", "model_length"]);

function finishReasonIsLength(reason) {
  return FINISH_REASON_LENGTH.has(String(reason || "").trim().toLowerCase());
}

function evaluateOutputCapEffective(attempt) {
  const cap = attempt.candidate;
  const ct = Number(attempt.usage?.completion_tokens ?? attempt.usage?.output_tokens ?? 0);
  if (finishReasonIsLength(attempt.finish_reason)) {
    return ct > 0
      ? { effective: true, reason: `finish_reason=${attempt.finish_reason}，completion_tokens=${ct}≈cap ${cap}` }
      : { effective: true, reason: `finish_reason=${attempt.finish_reason}（无 completion_tokens 计数）` };
  }
  if (ct > 0 && cap > 0 && ct >= cap - cap / 5 && ct <= cap + cap / 5) {
    return { effective: true, reason: `completion_tokens=${ct}≈cap ${cap}（finish_reason=${attempt.finish_reason}）` };
  }
  return { effective: false, reason: `未被截断：finish_reason=${attempt.finish_reason || "(空)"}，completion_tokens=${ct}，cap=${cap}（疑似被忽略）` };
}

function providerError(body, text, statusText) {
  if (body && typeof body === "object") {
    if (typeof body.error === "string") return body.error;
    if (body.error && typeof body.error === "object") {
      if (typeof body.error.message === "string") return body.error.message;
      if (typeof body.error.code === "string") return body.error.code;
    }
    if (typeof body.message === "string") return body.message;
  }
  const trimmed = String(text || "").trim();
  if (trimmed) return trimmed.slice(0, 600);
  return statusText || "";
}

function classify(status, error) {
  if (error) return "request_failed";
  if (status >= 200 && status < 300) return "supported";
  if (status === 401 || status === 403) return "auth_or_permission_failed";
  if (status === 429) return "rate_limited";
  if (status === 400 || status === 404 || status === 422) return "rejected";
  if (status >= 500) return "server_error";
  return "request_failed";
}

async function postJSON(target, payload, timeoutMs) {
  const retries = Number.isInteger(target.retries) ? target.retries : 0;
  let last = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    last = await postJSONOnce(target, payload, timeoutMs);
    last.attempt_count = attempt + 1;
    if (!isRetryableResult(last) || attempt === retries) return last;
    await sleep(Math.min(1000 * 2 ** attempt, 8000));
  }
  return last;
}

async function postJSONOnce(target, payload, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();
  try {
    const response = await fetch(target.endpointUrl, {
      method: "POST",
      headers: requestHeaders(target),
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    const text = await response.text();
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = null;
    }
    return {
      http_status: response.status,
      latency_ms: Date.now() - started,
      conclusion: classify(response.status, null),
      usage: summarizeUsage(body),
      finish_reason: finishReason(body, target.endpointId),
      reasoning_tokens: reasoningTokensFromBody(body),
      error: response.ok ? "" : providerError(body, text, response.statusText)
    };
  } catch (error) {
    return {
      http_status: 0,
      latency_ms: Date.now() - started,
      conclusion: "request_failed",
      usage: null,
      finish_reason: "",
      error: error && error.name === "AbortError" ? `request timed out after ${timeoutMs}ms` : String(error && error.message ? error.message : error)
    };
  } finally {
    clearTimeout(timer);
  }
}

function isRetryableResult(result) {
  if (!result) return false;
  if (result.http_status === 429) return true;
  if (result.http_status >= 500) return true;
  return result.http_status === 0;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function probeDescending(target, label, candidates, makePayload, args, extraAttemptFields = () => ({}), options = {}) {
  const kind = options.kind || "";
  const exhaustive = args.exhaustive || options.exhaustive;
  const attempts = [];
  let sawNonSupported = false;
  let stoppedByBoundary = false;
  for (const candidate of candidates) {
    const payload = makePayload(candidate);
    const attempt = {
      case_id: capacityCaseID(target, label, candidate),
      category: "capacity",
      candidate,
      candidate_display: formatTokenUnit(candidate),
      request_bytes: Buffer.byteLength(JSON.stringify(payload)),
      ...extraAttemptFields(candidate)
    };
    process.stdout.write(`${target.provider}/${target.endpointId}/${label}: try ${formatTokenUnit(candidate)} ... `);
    const result = await postJSON(target, payload, args.timeoutMs);
    Object.assign(attempt, result);
    if (kind === "max_output_effective" && result.conclusion === "supported") {
      const evaluated = evaluateOutputCapEffective(attempt);
      attempt.effective = evaluated.effective;
      attempt.effective_reason = evaluated.reason;
    }
    attempts.push(attempt);
    const effNote = attempt.effective === undefined ? "" : ` effective=${attempt.effective}`;
    const rtNote = attempt.reasoning_tokens ? ` reasoning_tokens=${attempt.reasoning_tokens}` : "";
    console.log(`${result.conclusion} HTTP ${result.http_status} ${result.latency_ms}ms${effNote}${rtNote}`);
    if (result.conclusion === "supported" && args.stopOnFirstPass && !exhaustive) {
      break;
    }
    if (result.conclusion === "supported" && sawNonSupported && !exhaustive) {
      stoppedByBoundary = true;
      break;
    }
    if (result.conclusion !== "supported") {
      sawNonSupported = true;
    }
  }
  return { ...summarizeAttempts(candidates, attempts, stoppedByBoundary, kind), attempts };
}

function capacityCaseID(target, label, candidate) {
  const prefix = `capacity_${target.provider}_${target.endpointId}_${target.model}_${label}`;
  return `${prefix}_${candidate}`.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "").toLowerCase();
}

function formatTokenUnit(value) {
  if (!Number.isFinite(value)) return null;
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  const oneM = 1024 * 1024;
  if (abs >= oneM && abs % oneM === 0) return `${sign}${abs / oneM}m`;
  if (abs >= 1024 && abs % 1024 === 0) return `${sign}${abs / 1024}k`;
  if (abs >= oneM) return `${sign}${trimNumber(abs / oneM, 1)}m`;
  if (abs >= 1024) return `${sign}${trimNumber(abs / 1024, 1)}k`;
  return `${value}`;
}

function trimNumber(value, digits = 1) {
  return Number(value.toFixed(digits)).toString();
}

function formatCandidateList(candidates) {
  return candidates.map(formatTokenUnit).join(",");
}

function displayAttempt(attempt) {
  if (!attempt) return null;
  return {
    candidate: attempt.candidate,
    candidate_display: formatTokenUnit(attempt.candidate),
    tested_total_context_tokens: attempt.tested_total_context_tokens,
    tested_total_context_display: attempt.tested_total_context_display,
    conclusion: attempt.conclusion,
    http_status: attempt.http_status,
    error: attempt.error
  };
}

function summarizeAttempts(candidates, attempts, stoppedByBoundary, kind = "") {
  const sortedAttempts = [...attempts].sort((a, b) => b.candidate - a.candidate);
  const supported = attempts.filter((attempt) => attempt.conclusion === "supported");
  const supportedMax = supported.length ? Math.max(...supported.map((attempt) => attempt.candidate)) : null;
  const supportedAttempt = supportedMax === null ? null : attempts.find((attempt) => attempt.candidate === supportedMax && attempt.conclusion === "supported");
  const firstSupportedIndex = supported.length ? sortedAttempts.findIndex((attempt) => attempt.candidate === supportedMax && attempt.conclusion === "supported") : -1;
  const nearestHigherNonSupported = firstSupportedIndex > 0 ? sortedAttempts[firstSupportedIndex - 1] : null;
  const topAttempt = sortedAttempts[0] || null;
  const lowestCandidateAttempted = attempts.length ? attempts[attempts.length - 1].candidate : null;
  const nonMonotonicResults = supportedMax !== null && attempts.some((attempt) => attempt.candidate < supportedMax && attempt.conclusion !== "supported");
  const summary = {
    supported_max: supportedMax,
    supported_max_display: formatTokenUnit(supportedMax),
    supported_tested_total_context_tokens: supportedAttempt?.tested_total_context_tokens,
    supported_tested_total_context_display: supportedAttempt?.tested_total_context_display,
    tested_all_candidates: attempts.length === candidates.length,
    top_candidate: candidates[0] || null,
    top_candidate_display: formatTokenUnit(candidates[0] || null),
    top_candidate_supported: Boolean(topAttempt && topAttempt.conclusion === "supported"),
    upper_bound_found: Boolean(nearestHigherNonSupported && supportedMax !== null),
    boundary_found_by_stop: stoppedByBoundary,
    non_monotonic_results: nonMonotonicResults,
    nearest_higher_non_supported: displayAttempt(nearestHigherNonSupported),
    lowest_candidate_attempted: lowestCandidateAttempted,
    lowest_candidate_attempted_display: formatTokenUnit(lowestCandidateAttempted),
    stop_reason:
      stoppedByBoundary
        ? "stopped_after_boundary_found"
        : attempts.length !== candidates.length
        ? "stopped_on_first_supported_candidate"
        : topAttempt && topAttempt.conclusion === "supported"
          ? "top_candidate_supported_upper_bound_not_found"
          : supportedMax === null
            ? "tested_all_candidates_without_supported_candidate"
            : "tested_all_candidates_with_upper_bound"
  };

  if (kind === "max_output_effective") {
    const effectiveAttempt = attempts.find((attempt) => attempt.effective === true);
    summary.effective = Boolean(effectiveAttempt);
    summary.effective_detail = (effectiveAttempt || attempts.find((a) => a.effective_reason))?.effective_reason || "";
  }
  if (kind === "thinking_budget") {
    const supportedAttempts = attempts.filter((attempt) => attempt.conclusion === "supported");
    let low = null;
    let high = null;
    let budgetRespected = true;
    for (const attempt of supportedAttempts) {
      const rt = Number(attempt.reasoning_tokens || 0);
      if (!high || attempt.candidate > high.candidate) high = { candidate: attempt.candidate, rt };
      if (!low || attempt.candidate < low.candidate) low = { candidate: attempt.candidate, rt };
      if (rt > attempt.candidate) budgetRespected = false;
    }
    summary.budget_accepted = supportedMax !== null;
    summary.budget_max = supportedMax;
    summary.budget_max_display = formatTokenUnit(supportedMax);
    summary.effective = Boolean(high && low && high.candidate > low.candidate && high.rt > low.rt);
    summary.budget_respected = budgetRespected;
    summary.thinking_low_budget = low?.candidate ?? null;
    summary.thinking_high_budget = high?.candidate ?? null;
    summary.thinking_low_reasoning_tokens = low?.rt ?? null;
    summary.thinking_high_reasoning_tokens = high?.rt ?? null;
  }
  return summary;
}

function hostOnly(urlValue) {
  try {
    const url = new URL(urlValue);
    return url.host;
  } catch {
    return "";
  }
}

async function probeTarget(target, args) {
  const result = {
    provider: target.provider,
    manifest_provider: target.manifestProvider,
    endpoint_id: target.endpointId,
    base_url_host: hostOnly(target.baseUrl),
    endpoint_url_host: hostOnly(target.endpointUrl),
    model: target.model,
    output_parameter: outputParam(target),
    skipped: false,
    skip_reason: "",
    probes: {}
  };

  if (!target.apiKey) {
    result.skipped = true;
    result.skip_reason = "missing api_key in config";
    console.log(`${target.provider}/${target.endpointId}: skipped, missing api_key`);
    return result;
  }
  if (!target.model) {
    result.skipped = true;
    result.skip_reason = "missing model";
    console.log(`${target.provider}/${target.endpointId}: skipped, missing model`);
    return result;
  }
  target.retries = args.retries;

  // Order matters: input + output run before context so balanced context can stay
  // under each measured cap; thinking-budget runs on its own ladder.
  if (args.probes.includes("input")) {
    result.probes.max_input = await probeDescending(
      target,
      "max_input",
      args.inputCandidates,
      (candidate) => inputProbePayload(target, candidate, args.contextSafetyMarginRatio),
      args,
      (candidate) => inputProbeSizing(candidate, args.contextSafetyMarginRatio),
      { kind: "max_input" }
    );
  }

  if (args.probes.includes("output")) {
    result.probes.max_output = await probeDescending(
      target,
      "max_output",
      args.outputCandidates,
      (candidate) => outputProbePayload(target, candidate),
      args,
      (candidate) => ({ requested_max_output_tokens: candidate }),
      { kind: "max_output" }
    );
  }

  if (args.probes.includes("output-effective")) {
    result.probes.max_output_effective = await probeDescending(
      target,
      "max_output_effective",
      args.outputEffectiveCaps,
      (candidate) => outputEffectivePayload(target, candidate),
      args,
      (candidate) => ({ requested_max_output_tokens: candidate }),
      { kind: "max_output_effective", exhaustive: true }
    );
  }

  if (args.probes.includes("thinking-budget")) {
    const mapping = thinkingBudgetField(target);
    if (!mapping) {
      result.probes.thinking_budget = {
        skipped: true,
        skip_reason: `provider ${target.provider} has no documented thinking-budget field`,
        budget_accepted: false
      };
    } else {
      result.probes.thinking_budget = await probeDescending(
        target,
        "thinking_budget",
        args.thinkingBudgetCandidates,
        (candidate) => thinkingBudgetPayload(target, candidate),
        args,
        (candidate) => ({ requested_thinking_budget: candidate }),
        { kind: "thinking_budget", exhaustive: true }
      );
      result.probes.thinking_budget.thinking_field = mapping.field;
    }
  }

  if (args.probes.includes("context")) {
    const maxInput = result.probes.max_input?.supported_max || 0;
    const maxOutput = result.probes.max_output?.supported_max || 0;
    const balanced = args.contextBalanced && maxInput > 0 && maxOutput > 0;
    if (balanced) {
      result.probes.total_context = await probeDescending(
        target,
        "total_context",
        args.contextCandidates,
        (candidate) => balancedContextPayload(target, candidate, maxInput, maxOutput, args.contextSafetyMarginRatio),
        args,
        (candidate) => balancedContextSizing(candidate, maxInput, maxOutput, args.contextSafetyMarginRatio),
        { kind: "total_context" }
      );
      result.probes.total_context.context_method = "balanced";
      result.probes.total_context.balanced_max_input_tokens = maxInput;
      result.probes.total_context.balanced_max_output_tokens = maxOutput;
    } else {
      result.probes.total_context = await probeDescending(
        target,
        "total_context",
        args.contextCandidates,
        (candidate) => contextProbePayload(target, candidate, args.contextOutputTokens, args.contextSafetyMarginRatio),
        args,
        (candidate) => contextProbeSizing(candidate, args.contextOutputTokens, args.contextSafetyMarginRatio),
        { kind: "total_context" }
      );
      result.probes.total_context.context_method = "input_heavy";
    }
    result.probes.total_context.context_safety_margin_ratio = args.contextSafetyMarginRatio;
    result.probes.total_context.context_safety_margin_percent = args.contextSafetyMarginRatio * 100;
  }

  return result;
}

function defaultOutputPath() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return path.join(root, "outputs", "capacity-probes", `capacity-probe-${stamp}.json`);
}

function printPlan(targets, args) {
  console.log(`Targets: ${targets.length}`);
  for (const target of targets) {
    console.log(`- ${target.provider}/${target.endpointId} model=${target.model || "(missing)"} host=${hostOnly(target.baseUrl) || "(missing)"}`);
  }
  console.log(`Probes: ${args.probes.join(", ")}`);
  console.log(`Max concurrency: ${args.maxConcurrency}`);
  if (args.probes.includes("input")) console.log(`Max input candidates: ${formatCandidateList(args.inputCandidates)}`);
  if (args.probes.includes("output")) console.log(`Max output candidates: ${formatCandidateList(args.outputCandidates)}`);
  if (args.probes.includes("output-effective")) console.log(`Output-effective caps: ${formatCandidateList(args.outputEffectiveCaps)}`);
  if (args.probes.includes("thinking-budget")) console.log(`Thinking-budget candidates: ${formatCandidateList(args.thinkingBudgetCandidates)}`);
  if (args.probes.includes("context")) console.log(`Context candidates: ${formatCandidateList(args.contextCandidates)}; balanced=${args.contextBalanced}; context safety margin: ${trimNumber(args.contextSafetyMarginRatio * 100, 1)}%; input-heavy output budget: ${args.contextOutputTokens}`);
}

function conclusionLine(target, probeKey, label) {
  const conclusion = displayConclusion(target.probes[probeKey]);
  return conclusion ? `${label}：${conclusion}` : null;
}

function displayConclusion(probe) {
  if (!probe) return null;
  if (probe.skipped) return probe.skip_reason || "未测试";
  if (probe.effective !== undefined && probe.budget_accepted === undefined) {
    // max_output_effective
    if (probe.effective) return `生效${probe.effective_detail ? `（${probe.effective_detail}）` : ""}`;
    return `未生效${probe.effective_detail ? `（${probe.effective_detail}）` : "（参数疑似被忽略）"}`;
  }
  if (probe.budget_accepted !== undefined) {
    // thinking_budget
    if (!probe.budget_accepted) return "不支持该思考预算字段";
    const parts = [`最大可传 ${probe.budget_max_display}`];
    parts.push(probe.effective ? "实测生效" : "接受但未观察到随预算变化");
    if (probe.budget_respected === false) parts.push("reasoning_tokens 曾超出预算");
    return parts.join("；");
  }
  if (probe.upper_bound_found && probe.supported_max_display) {
    const tested = probe.supported_tested_total_context_display ? `按${probe.supported_tested_total_context_display}探测，` : "";
    return `${probe.supported_max_display}（${tested}${probe.nearest_higher_non_supported?.candidate_display || "更高档位"}不支持）`;
  }
  if (probe.top_candidate_supported && probe.supported_max_display) {
    const tested = probe.supported_tested_total_context_display ? `按${probe.supported_tested_total_context_display}探测，` : "";
    return `>= ${probe.supported_max_display}（${tested}最高候选档位已支持）`;
  }
  if (probe.supported_max_display) {
    const tested = probe.supported_tested_total_context_display ? `按${probe.supported_tested_total_context_display}探测，` : "";
    return `${probe.supported_max_display}（${tested}边界未完全括定）`;
  }
  return "当前候选档位内未测到支持项";
}

function printSummary(report) {
  console.log("Capacity summary:");
  for (const target of report.targets) {
    const parts = [
      conclusionLine(target, "max_input", "最大Input"),
      conclusionLine(target, "max_output", "最大Max Output"),
      conclusionLine(target, "max_output_effective", "Max Output 生效"),
      conclusionLine(target, "thinking_budget", "最大Thinking Budget"),
      conclusionLine(target, "total_context", "最大Total Context")
    ].filter(Boolean);
    if (!parts.length) continue;
    console.log(`- ${target.provider}/${target.endpoint_id} ${target.model}: ${parts.join("; ")}`);
  }
}

async function runWithConcurrency(items, maxConcurrency, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;
  const workerCount = Math.min(Math.max(1, maxConcurrency), items.length);
  const workers = Array.from({ length: workerCount }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const config = fs.existsSync(args.config) ? readConfig(args.config) : {};
  const targets = buildTargets(args, config);
  if (!targets.length) throw new Error("No matching targets found");

  printPlan(targets, args);
  if (args.dryRun) return;

  const outputPath = args.output || defaultOutputPath();
  const report = {
    generated_at: new Date().toISOString(),
    probes: args.probes,
    endpoint_id: args.endpointId,
    output_candidates: args.outputCandidates,
    output_candidates_display: args.outputCandidates.map(formatTokenUnit),
    context_candidates: args.contextCandidates,
    context_candidates_display: args.contextCandidates.map(formatTokenUnit),
    input_candidates: args.inputCandidates,
    input_candidates_display: args.inputCandidates.map(formatTokenUnit),
    output_effective_caps: args.outputEffectiveCaps,
    output_effective_caps_display: args.outputEffectiveCaps.map(formatTokenUnit),
    thinking_budget_candidates: args.thinkingBudgetCandidates,
    thinking_budget_candidates_display: args.thinkingBudgetCandidates.map(formatTokenUnit),
    context_balanced: args.contextBalanced,
    context_output_tokens: args.contextOutputTokens,
    context_safety_margin_ratio: args.contextSafetyMarginRatio,
    context_safety_margin_percent: args.contextSafetyMarginRatio * 100,
    retries: args.retries,
    max_concurrency: args.maxConcurrency,
    stop_on_first_pass: args.stopOnFirstPass,
    exhaustive: args.exhaustive,
    stop_after_boundary: !args.exhaustive,
    note: "max_input/max_output/total_context are acceptance probes for common tiers (largest accepted budget), not proof of generated tokens. max_output_effective forces a long generation at small caps to confirm the limit truncates output (finish_reason=length, completion_tokens≈cap). thinking_budget tests the per-provider thinking-budget field for acceptance, max accepted value, and whether reasoning_tokens scale with the budget. total_context defaults to a balanced input/output split so a context that exceeds the input cap can be reached; use --no-context-balanced for input-heavy probing. Provider usage is recorded when available.",
    targets: []
  };

  report.targets = await runWithConcurrency(targets, args.maxConcurrency, async (target) => {
    const targetResult = await probeTarget(target, args);
    targetResult.capacity_display = {
      "最大Input": displayConclusion(targetResult.probes.max_input),
      "最大Max Output": displayConclusion(targetResult.probes.max_output),
      "Max Output 生效": displayConclusion(targetResult.probes.max_output_effective),
      "最大Thinking Budget": displayConclusion(targetResult.probes.thinking_budget),
      "最大Total Context": displayConclusion(targetResult.probes.total_context)
    };
    return targetResult;
  });

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  printSummary(report);
  console.log(`wrote ${outputPath}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
