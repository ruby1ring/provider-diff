const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

const CHAT_PROVIDERS = ["openai", "claude", "deepseek", "minimax", "siliconflow", "openrouter", "ali", "vllm"];
const MESSAGE_PROVIDERS = ["claude", "deepseek", "minimax", "siliconflow", "openrouter", "ali"];
const COMMON_CAPACITY_CANDIDATES = [4194304, 2097152, 1048576, 524288, 262144, 131072, 65536, 32768, 16384, 8192, 4096, 2048, 1024];
const DEFAULT_OUTPUT_CANDIDATES = COMMON_CAPACITY_CANDIDATES;
const DEFAULT_CONTEXT_CANDIDATES = COMMON_CAPACITY_CANDIDATES;
const DEFAULT_CONTEXT_SAFETY_MARGIN_RATIO = 0.05;

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

function usage() {
  console.log(`Usage:
  node scripts/probe-capacity.js [options]

Options:
  --providers openai,deepseek     Providers to probe. Default: all chat providers.
  --endpoint-id chat_completions  chat_completions, anthropic_messages, or all. Default: chat_completions.
  --probes output,context         output, context, or both comma-separated. Default: both.
  --config config.yaml            Local config file. Default: config.yaml.
  --output outputs/file.json      Result JSON path. Default: timestamped file under outputs/capacity-probes.
  --model provider=model          Override a provider model. Can be repeated.
  --max-output-candidates list    Descending integer or k/m list. Default: ${formatCandidateList(DEFAULT_OUTPUT_CANDIDATES)}.
  --context-candidates list       Descending integer or k/m list. Default: ${formatCandidateList(DEFAULT_CONTEXT_CANDIDATES)}.
  --context-output-tokens n       Output budget used during context probes. Default: 8.
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
    if (probe !== "output" && probe !== "context") {
      throw new Error(`Unsupported probe "${probe}". Use output, context, or both.`);
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
  ali: ["aliyun-cn", "aliyun-us", "aliyun", "ali"],
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

async function probeDescending(target, label, candidates, makePayload, args, extraAttemptFields = () => ({})) {
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
    attempts.push(attempt);
    console.log(`${result.conclusion} HTTP ${result.http_status} ${result.latency_ms}ms`);
    if (result.conclusion === "supported" && args.stopOnFirstPass) {
      break;
    }
    if (result.conclusion === "supported" && sawNonSupported && !args.exhaustive) {
      stoppedByBoundary = true;
      break;
    }
    if (result.conclusion !== "supported") {
      sawNonSupported = true;
    }
  }
  return { ...summarizeAttempts(candidates, attempts, stoppedByBoundary), attempts };
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

function summarizeAttempts(candidates, attempts, stoppedByBoundary) {
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

  if (args.probes.includes("output")) {
    result.probes.max_output = await probeDescending(
      target,
      "max_output",
      args.outputCandidates,
      (candidate) => outputProbePayload(target, candidate),
      args,
      (candidate) => ({ requested_max_output_tokens: candidate })
    );
  }

  if (args.probes.includes("context")) {
    result.probes.total_context = await probeDescending(
      target,
      "total_context",
      args.contextCandidates,
      (candidate) => contextProbePayload(target, candidate, args.contextOutputTokens, args.contextSafetyMarginRatio),
      args,
      (candidate) => contextProbeSizing(candidate, args.contextOutputTokens, args.contextSafetyMarginRatio)
    );
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
  if (args.probes.includes("output")) console.log(`Max output candidates: ${formatCandidateList(args.outputCandidates)}`);
  if (args.probes.includes("context")) console.log(`Context candidates: ${formatCandidateList(args.contextCandidates)}; context safety margin: ${trimNumber(args.contextSafetyMarginRatio * 100, 1)}%; context output budget: ${args.contextOutputTokens}`);
}

function conclusionLine(target, probeKey, label) {
  const conclusion = displayConclusion(target.probes[probeKey]);
  return conclusion ? `${label}：${conclusion}` : null;
}

function displayConclusion(probe) {
  if (!probe) return null;
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
      conclusionLine(target, "max_output", "最大Max Output"),
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
    context_output_tokens: args.contextOutputTokens,
    context_safety_margin_ratio: args.contextSafetyMarginRatio,
    context_safety_margin_percent: args.contextSafetyMarginRatio * 100,
    retries: args.retries,
    max_concurrency: args.maxConcurrency,
    stop_on_first_pass: args.stopOnFirstPass,
    exhaustive: args.exhaustive,
    stop_after_boundary: !args.exhaustive,
    note: "max_output is an acceptance probe for common output budget tiers, not proof that the provider generated that many output tokens. total_context results are displayed on common candidate tiers, but each request subtracts a safety margin before generating filler text to avoid tokenizer and message-wrapper edge effects; provider usage is recorded when available.",
    targets: []
  };

  report.targets = await runWithConcurrency(targets, args.maxConcurrency, async (target) => {
    const targetResult = await probeTarget(target, args);
    targetResult.capacity_display = {
      "最大Max Output": displayConclusion(targetResult.probes.max_output),
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
