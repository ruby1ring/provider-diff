/**
 * Effort enumeration + default/mapping inference for thinking intensity probes.
 * Keep in sync with web/lib/thinking-effort-analysis.js
 */

export const EFFORT_PROBE_LEVELS = ["none", "low", "medium", "high", "xhigh", "max"];

export const EFFORT_PROBE_SPECS = [
  {
    parameter: "reasoning_effort",
    label: "reasoning_effort",
    canonicalLevels: ["high", "max"],
    documentedAliases: {
      low: "high",
      medium: "high",
      xhigh: "max"
    },
    baselineCaseIds: [
      "thinking_reasoning_effort_default",
      "thinking_baseline_default_effort",
      "thinking_baseline_fixed_prompt",
      "thinking_baseline_no_thinking"
    ],
    levelCaseIds: {
      none: ["thinking_reasoning_effort_none"],
      low: [
        "thinking_reasoning_effort_low",
        "deepseek_reasoning_effort_low_alias",
        "ali_reasoning_effort_low_alias"
      ],
      medium: [
        "thinking_reasoning_effort_medium",
        "deepseek_reasoning_effort_medium_alias",
        "ali_reasoning_effort_medium_alias"
      ],
      high: [
        "thinking_reasoning_effort_high",
        "deepseek_reasoning_effort_high"
      ],
      xhigh: [
        "thinking_reasoning_effort_xhigh",
        "deepseek_reasoning_effort_xhigh_alias",
        "ali_reasoning_effort_xhigh_alias",
        "oa_reasoning_effort_xhigh"
      ],
      max: [
        "thinking_reasoning_effort_max",
        "deepseek_reasoning_effort_max",
        "ali_reasoning_effort_max"
      ]
    }
  },
  {
    parameter: "reasoning.effort",
    label: "reasoning.effort",
    canonicalLevels: ["high", "max"],
    documentedAliases: {},
    baselineCaseIds: [
      "thinking_baseline_default_effort",
      "thinking_baseline_fixed_prompt"
    ],
    levelCaseIds: {
      none: ["thinking_reasoning_object_effort_none"],
      medium: ["thinking_reasoning_object_effort_summary"]
    }
  }
];

function assertionPassed(result, name) {
  return (result?.assertions || []).some((a) => a.name === name && a.pass);
}

export function thinkingRequestAccepted(result) {
  if (!result) return false;
  const status = Number(result.http_status || 0);
  return (status >= 200 && status < 300)
    || ["supported", "schema_mismatch", "ignored"].includes(result.support_conclusion);
}

export function thinkingRequestRejected(result) {
  return Boolean(result)
    && ["rejected_400", "request_failed", "permission_limited"].includes(result.support_conclusion);
}

function walkJsonForTokenField(value, field, onCount) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item) => walkJsonForTokenField(item, field, onCount));
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (key.toLowerCase() === field.toLowerCase()) {
      const count = Number(child);
      if (Number.isFinite(count)) onCount(count);
    }
    walkJsonForTokenField(child, field, onCount);
  }
}

export function reasoningTokenCountForResult(result) {
  if (!result) return null;
  const direct = Number(result.reasoning_tokens);
  if (Number.isFinite(direct)) return direct;
  const body = result.response_body;
  if (!body || typeof body !== "object") return null;
  let max = 0;
  let found = false;
  walkJsonForTokenField(body, "reasoning_tokens", (count) => {
    found = true;
    if (count > max) max = count;
  });
  return found ? max : null;
}

function thinkingTokenCountForResult(result) {
  if (!result) return null;
  const direct = Number(result.thinking_tokens);
  if (Number.isFinite(direct)) return direct;
  const body = result.response_body;
  if (!body || typeof body !== "object") return null;
  let max = 0;
  let found = false;
  walkJsonForTokenField(body, "thinking_tokens", (count) => {
    found = true;
    if (count > max) max = count;
  });
  return found ? max : null;
}

function visibleThinkingLengthForResult(result) {
  if (!result?.response_body) return 0;
  const body = result.response_body;
  let total = 0;
  const reasoningContent = body?.choices?.[0]?.message?.reasoning_content;
  if (typeof reasoningContent === "string") total += reasoningContent.length;
  const reasoning = body?.choices?.[0]?.message?.reasoning;
  if (reasoning && typeof reasoning === "object") total += JSON.stringify(reasoning).length;
  const details = body?.choices?.[0]?.message?.reasoning_details;
  if (Array.isArray(details)) total += JSON.stringify(details).length;
  const content = body?.choices?.[0]?.message?.content;
  if (typeof content === "string" && content.includes("<think>")) total += content.length;
  return total;
}

export function effortMetricForResult(result) {
  const reasoning = reasoningTokenCountForResult(result);
  if (reasoning != null) return { kind: "reasoning_tokens", value: reasoning };
  const thinking = thinkingTokenCountForResult(result);
  if (thinking != null) return { kind: "thinking_tokens", value: thinking };
  const visible = visibleThinkingLengthForResult(result);
  if (visible > 0) return { kind: "visible_len", value: visible };
  return { kind: "none", value: 0 };
}

export function effortSignature(result) {
  const metric = effortMetricForResult(result);
  return {
    accepted: thinkingRequestAccepted(result),
    rejected: thinkingRequestRejected(result),
    has_evidence: assertionPassed(result, "thinking_evidence_required")
      || metric.value > 0
      || visibleThinkingLengthForResult(result) > 0,
    metric,
    case_id: result?.case_id || ""
  };
}

export function effortMetricsComparable(a, b) {
  if (!a || !b) return false;
  if (a.kind === "none" || b.kind === "none") return false;
  if (a.kind !== b.kind) return false;
  return true;
}

export function effortMetricsParity(a, b, { toleranceRatio = 0.18, toleranceAbs = 12 } = {}) {
  if (!effortMetricsComparable(a, b)) return false;
  const diff = Math.abs(a.value - b.value);
  const scale = Math.max(a.value, b.value, 1);
  return diff <= toleranceAbs || diff / scale <= toleranceRatio;
}

function pickResultForLevel(byCase, caseIds = []) {
  for (const caseId of caseIds) {
    const result = byCase.get(caseId);
    if (result) return { caseId, result };
  }
  return { caseId: caseIds[0] || "", result: null };
}

function closestCanonicalLevel(baselineMetric, canonicalLevels, levelResults) {
  let best = null;
  for (const level of canonicalLevels) {
    const entry = levelResults[level];
    if (!entry?.result || !thinkingRequestAccepted(entry.result)) continue;
    const metric = effortMetricForResult(entry.result);
    if (!effortMetricsComparable(baselineMetric, metric)) continue;
    const diff = Math.abs(baselineMetric.value - metric.value);
    if (!best || diff < best.diff) best = { level, diff, metric };
  }
  return best;
}

function inferEffectiveLevel(level, signature, canonicalLevels, levelResults, documentedAliases) {
  if (!signature.accepted) return { effective: null, mode: "rejected" };
  if (canonicalLevels.includes(level)) {
    return { effective: level, mode: "direct" };
  }
  const docTarget = documentedAliases[level];
  if (docTarget && levelResults[docTarget]?.result) {
    const targetSig = effortSignature(levelResults[docTarget].result);
    if (effortMetricsParity(signature.metric, targetSig.metric)) {
      return { effective: docTarget, mode: "mapped", mapped_from: level, basis: "token_or_visible_parity" };
    }
  }
  for (const canonical of canonicalLevels) {
    const entry = levelResults[canonical];
    if (!entry?.result) continue;
    const targetSig = effortSignature(entry.result);
    if (effortMetricsParity(signature.metric, targetSig.metric)) {
      return { effective: canonical, mode: "mapped", mapped_from: level, basis: "token_or_visible_parity" };
    }
  }
  if (signature.has_evidence) {
    return { effective: level, mode: "direct_unverified", notes: "有 thinking 证据但未与 canonical 档位对齐" };
  }
  return { effective: null, mode: "accepted_unverified", notes: "2xx 但缺少可对齐的 thinking/token 证据" };
}

export function analyzeEffortProbeSpec(spec, byCase) {
  const baselinePick = pickResultForLevel(byCase, spec.baselineCaseIds);
  const baseline = baselinePick.result;
  const baselineSig = baseline ? effortSignature(baseline) : null;

  const levelResults = {};
  for (const level of EFFORT_PROBE_LEVELS) {
    const ids = spec.levelCaseIds[level];
    if (!ids?.length) continue;
    const picked = pickResultForLevel(byCase, ids);
    levelResults[level] = {
      ...picked,
      level,
      signature: picked.result ? effortSignature(picked.result) : null,
      effective: null,
      mode: "not_run"
    };
  }

  const acceptedValues = [];
  const directValues = [];
  const mappings = [];

  for (const level of EFFORT_PROBE_LEVELS) {
    const entry = levelResults[level];
    if (!entry?.result) continue;
    const sig = entry.signature || effortSignature(entry.result);
    if (!sig.accepted) continue;
    if (level === "none") {
      acceptedValues.push(level);
      entry.effective = "none";
      entry.mode = assertionPassed(entry.result, "thinking_absent") ? "direct" : "accepted_unverified";
      continue;
    }
    acceptedValues.push(level);
    const inferred = inferEffectiveLevel(level, sig, spec.canonicalLevels, levelResults, spec.documentedAliases || {});
    entry.effective = inferred.effective;
    entry.mode = inferred.mode;
    entry.notes = inferred.notes || "";
    if (inferred.mode === "direct" || inferred.mode === "direct_unverified") {
      if (!directValues.includes(level)) directValues.push(level);
    }
    if (inferred.mode === "mapped" && inferred.effective) {
      mappings.push({
        from: level,
        to: inferred.effective,
        basis: inferred.basis || "inferred",
        verified: true,
        case_id: entry.caseId
      });
    }
  }

  let defaultEffort = { value: null, confidence: "unproven", baseline_case_id: baselinePick.caseId || "", notes: "" };
  if (baseline && thinkingRequestAccepted(baseline) && baselineSig?.has_evidence) {
    const closest = closestCanonicalLevel(baselineSig.metric, spec.canonicalLevels, levelResults);
    if (closest) {
      defaultEffort = {
        value: closest.level,
        confidence: closest.diff <= 12 ? "inferred_high" : "inferred",
        baseline_case_id: baselinePick.caseId,
        notes: `baseline ${baselineSig.metric.kind}=${baselineSig.metric.value} 最接近 ${closest.level}（Δ=${closest.diff}）`
      };
    } else {
      defaultEffort = {
        value: null,
        confidence: "unproven",
        baseline_case_id: baselinePick.caseId,
        notes: "baseline 有 thinking 证据，但与 canonical 档位 token/可见长度无法对齐"
      };
    }
  } else if (baseline && thinkingRequestAccepted(baseline)) {
    defaultEffort.notes = "baseline 已接受但无足够 thinking/token 证据，无法推断默认 effort";
  } else {
    defaultEffort.notes = "未运行或未通过 baseline case";
  }

  const canonicalValues = spec.canonicalLevels.filter((level) => {
    const entry = levelResults[level];
    return entry?.signature?.accepted;
  });

  return {
    parameter: spec.parameter,
    label: spec.label,
    baseline_case_id: baselinePick.caseId,
    default_effort: defaultEffort,
    accepted_values: acceptedValues,
    canonical_values: canonicalValues,
    direct_values: directValues,
    mappings,
    documented_aliases: spec.documentedAliases || {},
    levels: levelResults,
    agent_context_note: "复杂 Agent 类请求可能自动提升 effort（如 max）；需专用 agent/tool 探针，本表仅覆盖普通短 prompt。"
  };
}

export function analyzeEffortProbes(byCase) {
  return EFFORT_PROBE_SPECS
    .map((spec) => analyzeEffortProbeSpec(spec, byCase))
    .filter((analysis) =>
      analysis.accepted_values.length > 0
      || analysis.baseline_case_id && byCase.has(analysis.baseline_case_id)
      || Object.values(analysis.levels).some((entry) => entry.result)
    );
}

export function effortEffectivenessLabel(mode) {
  return {
    direct: "直接生效",
    mapped: "映射生效",
    direct_unverified: "可能直接生效",
    accepted_unverified: "接受未验证",
    rejected: "拒绝",
    not_run: "未运行"
  }[mode] || mode || "—";
}

export function formatEffortAnalysisMarkdown(analyses = []) {
  if (!analyses.length) return [];
  const lines = ["### Effort 枚举与映射", ""];
  for (const analysis of analyses) {
    lines.push(`#### ${analysis.label}`);
    lines.push("");
    const defaultLabel = analysis.default_effort.value
      ? `${analysis.default_effort.value}（${analysis.default_effort.confidence}）`
      : "未推断";
    lines.push(`- 默认 effort：${defaultLabel}${analysis.default_effort.notes ? `；${analysis.default_effort.notes}` : ""}`);
    lines.push(`- 接受档位：${analysis.accepted_values.length ? analysis.accepted_values.join("、") : "无"}`);
    lines.push(`- 实测 canonical：${analysis.canonical_values.length ? analysis.canonical_values.join("、") : "未确认"}`);
    lines.push(`- 直接生效：${analysis.direct_values.length ? analysis.direct_values.join("、") : "未确认"}`);
    if (analysis.mappings.length) {
      lines.push(`- 映射推断：${analysis.mappings.map((m) => `${m.from}→${m.to}`).join("；")}`);
    } else {
      lines.push("- 映射推断：未发现可证实的别名映射");
    }
    if (analysis.documented_aliases && Object.keys(analysis.documented_aliases).length) {
      lines.push(`- 文档别名：${Object.entries(analysis.documented_aliases).map(([k, v]) => `${k}→${v}`).join("；")}`);
    }
    lines.push(`- 备注：${analysis.agent_context_note}`);
    lines.push("");
    lines.push("| 档位 | Case | 接受 | thinking证据 | 指标 | 推断生效 | 模式 |");
    lines.push("|---|---|---|---|---|---|---|");
    for (const level of EFFORT_PROBE_LEVELS) {
      const entry = analysis.levels[level];
      if (!entry?.result) continue;
      const sig = entry.signature;
      const metric = sig?.metric;
      const metricText = metric && metric.kind !== "none" ? `${metric.kind}=${metric.value}` : "—";
      lines.push(`| ${level} | \`${entry.caseId}\` | ${sig?.accepted ? "是" : "否"} | ${sig?.has_evidence ? "是" : "否"} | ${metricText} | ${entry.effective || "—"} | ${effortEffectivenessLabel(entry.mode)} |`);
    }
    lines.push("");
  }
  return lines;
}
