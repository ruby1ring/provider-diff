/**
 * Shared thinking probe family analysis (used by build-thinking-observed.mjs).
 * Keep in sync with web/main.js thinkingProbeFamilies + analysis helpers.
 */
import { analyzeEffortProbes } from "./thinking-effort-analysis.mjs";

export function thinkingProbeFamilies() {
  return [
    {
      name: "OpenAI reasoning_effort",
      parameters: ["reasoning_effort"],
      openCases: [{ caseId: "thinking_reasoning_effort_medium", label: "reasoning_effort = medium" }],
      closeCases: [{ caseId: "thinking_reasoning_effort_none", label: "reasoning_effort = none", openCaseId: "thinking_reasoning_effort_medium" }],
      intensityPairs: [{
        parameter: "reasoning_effort",
        lowCaseId: "thinking_reasoning_effort_low",
        highCaseId: "thinking_reasoning_effort_high",
        label: "reasoning_effort low vs high"
      }]
    },
    {
      name: "Qwen/SiliconFlow enable_thinking",
      parameters: ["enable_thinking"],
      openCases: [{ caseId: "thinking_enable_thinking_true", label: "enable_thinking = true" }],
      closeCases: [{ caseId: "thinking_enable_thinking_false", label: "enable_thinking = false", openCaseId: "thinking_enable_thinking_true" }],
      intensityPairs: []
    },
    {
      name: "Qwen thinking_budget",
      parameters: ["thinking_budget"],
      openCases: [
        { caseId: "thinking_budget_only", label: "thinking_budget = 1000" },
        { caseId: "thinking_enable_thinking_with_budget", label: "enable_thinking = true + thinking_budget = 1000" }
      ],
      closeCases: [{ caseId: "thinking_enable_thinking_false", label: "enable_thinking = false", openCaseId: "thinking_enable_thinking_with_budget" }],
      intensityPairs: [{
        parameter: "thinking_budget",
        lowCaseId: "thinking_thinking_budget_low",
        highCaseId: "thinking_thinking_budget_high",
        label: "thinking_budget 128 vs 4096"
      }]
    },
    {
      name: "DeepSeek/Claude thinking object",
      parameters: ["thinking"],
      openCases: [
        { caseId: "thinking_object_enabled", label: "thinking.type = enabled" },
        { caseId: "thinking_object_enabled_budget_tokens", label: "thinking.type = enabled + budget_tokens" }
      ],
      closeCases: [{ caseId: "thinking_object_disabled", label: "thinking.type = disabled", openCaseId: "thinking_object_enabled" }],
      intensityPairs: []
    },
    {
      name: "OpenRouter reasoning object",
      parameters: ["reasoning"],
      openCases: [
        { caseId: "thinking_reasoning_object_effort_summary", label: "reasoning.effort = medium + reasoning.summary = auto" },
        { caseId: "thinking_reasoning_object_enabled", label: "reasoning.enabled = true" }
      ],
      closeCases: [
        { caseId: "thinking_reasoning_object_effort_none", label: "reasoning.effort = none", openCaseId: "thinking_reasoning_object_effort_summary" },
        { caseId: "thinking_reasoning_object_disabled", label: "reasoning.enabled = false", openCaseId: "thinking_reasoning_object_enabled" }
      ],
      intensityPairs: []
    },
    {
      name: "vLLM chat_template_kwargs",
      parameters: ["chat_template_kwargs"],
      openCases: [{ caseId: "thinking_chat_template_kwargs_enable_true", label: "chat_template_kwargs.enable_thinking = true" }],
      closeCases: [{ caseId: "thinking_chat_template_kwargs_enable_false", label: "chat_template_kwargs.enable_thinking = false", openCaseId: "thinking_chat_template_kwargs_enable_true" }],
      intensityPairs: []
    },
    {
      name: "MiniMax reasoning_split",
      parameters: ["reasoning_split"],
      openCases: [{ caseId: "thinking_reasoning_split_true", label: "reasoning_split = true" }],
      closeCases: [
        { caseId: "thinking_object_disabled", label: "thinking.type = disabled", openCaseId: "thinking_reasoning_split_true" },
        { caseId: "thinking_reasoning_split_false", label: "reasoning_split = false", openCaseId: "thinking_reasoning_split_true" }
      ],
      intensityPairs: []
    }
  ];
}

function assertionPassed(result, name) {
  return (result?.assertions || []).some((a) => a.name === name && a.pass);
}

function assertionFailed(result, name) {
  return (result?.assertions || []).some((a) => a.name === name && !a.pass);
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

function thinkingOpeningWorks(result) {
  return Boolean(result)
    && thinkingRequestAccepted(result)
    && assertionPassed(result, "thinking_evidence_required");
}

function thinkingClosingWorks(result) {
  return Boolean(result)
    && thinkingRequestAccepted(result)
    && assertionPassed(result, "thinking_absent");
}

function thinkingAcceptedWithoutEvidence(result) {
  return Boolean(result)
    && result.support_conclusion === "schema_mismatch"
    && assertionFailed(result, "thinking_evidence_required");
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
  if (Array.isArray(body?.content)) {
    for (const block of body.content) {
      if (block?.type === "thinking" && typeof block.thinking === "string") total += block.thinking.length;
    }
  }
  return total;
}

function thinkingEvidenceSummary(result) {
  const assertions = result?.assertions || [];
  const pick = (name) => assertions.find((a) => a.name === name)?.message || "";
  return pick("thinking_evidence_required") || pick("thinking_location_probe") || pick("thinking_absent") || "";
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
  const fromAssertion = thinkingEvidenceSummary(result)
    .split("；")
    .filter((part) => part.startsWith("token 证据: "))
    .flatMap((part) => part.replace("token 证据: ", "").split(", "))
    .map((item) => item.trim())
    .filter(Boolean);
  if (fromAssertion.length) return fromAssertion;
  const tokens = [];
  const reasoning = reasoningTokenCountForResult(result);
  const thinking = thinkingTokenCountForResult(result);
  if (reasoning != null && reasoning > 0) tokens.push(`reasoning_tokens=${reasoning}`);
  if (thinking != null && thinking > 0) tokens.push(`thinking_tokens=${thinking}`);
  return tokens;
}

function thinkingResultHasEvidence(result) {
  return Boolean(result)
    && (thinkingLocationsForResult(result).length > 0 || thinkingTokenEvidenceForResult(result).length > 0);
}

function thinkingEvidenceScore(result) {
  if (!result) return 0;
  const reasoningTokens = reasoningTokenCountForResult(result);
  const thinkingTokens = thinkingTokenCountForResult(result);
  const tokenScore = Math.max(reasoningTokens ?? 0, thinkingTokens ?? 0);
  const visibleScore = visibleThinkingLengthForResult(result);
  return tokenScore > 0 ? tokenScore : visibleScore;
}

function thinkingIntensityPairAnalysis(pair, byCase) {
  const low = byCase.get(pair.lowCaseId);
  const high = byCase.get(pair.highCaseId);
  const lowAccepted = thinkingRequestAccepted(low);
  const highAccepted = thinkingRequestAccepted(high);
  let thinking_effectiveness = "unproven";
  let notes = "";
  if (!low || !high) {
    return { ...pair, lowCaseId: pair.lowCaseId, highCaseId: pair.highCaseId, thinking_effectiveness: "unproven", notes: "强度配对 case 未完整运行" };
  }
  if (!lowAccepted || !highAccepted) {
    thinking_effectiveness = thinkingRequestRejected(low) || thinkingRequestRejected(high) ? "rejected" : "unproven";
    notes = "强度配对未同时被接受";
    return { ...pair, thinking_effectiveness, notes, lowTokens: reasoningTokenCountForResult(low), highTokens: reasoningTokenCountForResult(high) };
  }
  const lowTokens = reasoningTokenCountForResult(low);
  const highTokens = reasoningTokenCountForResult(high);
  const lowVisible = visibleThinkingLengthForResult(low);
  const highVisible = visibleThinkingLengthForResult(high);
  const tokenDelta = lowTokens != null && highTokens != null && highTokens > lowTokens;
  const visibleDelta = highVisible > lowVisible;
  if (tokenDelta || visibleDelta) {
    thinking_effectiveness = "effective";
    notes = tokenDelta
      ? `reasoning_tokens ${lowTokens} → ${highTokens}`
      : `可见 thinking 长度 ${lowVisible} → ${highVisible}`;
  } else {
    thinking_effectiveness = "accepted_ineffective";
    notes = lowTokens != null && highTokens != null
      ? `reasoning_tokens 无差异（${lowTokens} vs ${highTokens}）`
      : "请求接受但高强度未产生更多 thinking 证据";
  }
  return { ...pair, thinking_effectiveness, notes, lowTokens, highTokens };
}

function thinkingSwitchEffectiveness(family, baseline) {
  const bestOpen = family.openResults.find((item) => thinkingOpeningWorks(item.result)) || null;
  const pairedClose = family.closeResults.find((item) => thinkingClosingWorks(item.result) && thinkingOpeningWorks(item.openResult)) || null;
  const baselineScore = thinkingEvidenceScore(baseline);
  const openScore = thinkingEvidenceScore(bestOpen?.result);
  if (family.status === "confirmed" && bestOpen && pairedClose && openScore > baselineScore) return "effective";
  if (family.status === "default_already_on") return "default_on";
  if (family.status === "rejected") return "rejected";
  if (family.status === "accepted_no_evidence") return "accepted_ineffective";
  if (family.status === "confirmed") return "effective";
  return "unproven";
}

export function thinkingFamilyAnalysis(family, byCase) {
  const openResults = family.openCases.map((item) => ({ ...item, result: byCase.get(item.caseId) }));
  const closeResults = family.closeCases.map((item) => {
    const explicitOpen = byCase.get(item.openCaseId);
    const fallbackOpen = openResults.find((openItem) => thinkingOpeningWorks(openItem.result))?.result;
    return { ...item, result: byCase.get(item.caseId), openResult: thinkingOpeningWorks(explicitOpen) ? explicitOpen : fallbackOpen || explicitOpen };
  });
  const intensityResults = (family.intensityPairs || []).map((pair) => thinkingIntensityPairAnalysis(pair, byCase));
  const baseline = byCase.get("thinking_baseline_fixed_prompt") || byCase.get("thinking_baseline_no_thinking");
  const baselineHasEvidence = thinkingResultHasEvidence(baseline);
  const bestOpen = openResults.find((item) => thinkingOpeningWorks(item.result)) || null;
  const pairedClose = closeResults.find((item) => thinkingClosingWorks(item.result) && thinkingOpeningWorks(item.openResult)) || null;
  const acceptedNoEvidence = openResults.some((item) => thinkingAcceptedWithoutEvidence(item.result));
  const accepted = openResults.some((item) => thinkingRequestAccepted(item.result));
  const rejected = openResults.some((item) => thinkingRequestRejected(item.result));
  let status = "not_run";
  if (bestOpen && (pairedClose || !baselineHasEvidence)) status = "confirmed";
  else if (bestOpen && baselineHasEvidence) status = "default_already_on";
  else if (acceptedNoEvidence || accepted) status = "accepted_no_evidence";
  else if (rejected) status = "rejected";
  const partial = { ...family, openResults, closeResults, intensityResults, status, bestOpen, pairedClose, baseline };
  const thinking_effectiveness = thinkingSwitchEffectiveness(partial, baseline);
  return { ...partial, thinking_effectiveness };
}

export function collectThinkingEvidence(result) {
  return {
    locations: thinkingLocationsForResult(result),
    tokens: thinkingTokenEvidenceForResult(result),
    reasoning_tokens: reasoningTokenCountForResult(result),
    thinking_tokens: thinkingTokenCountForResult(result)
  };
}

function documentedParamsForChannel(protocolMatrix, channelId, protocolId) {
  const entry = protocolMatrix?.channels?.[channelId]?.[protocolId];
  const set = new Set();
  if (!entry?.parameters) return set;
  for (const list of Object.values(entry.parameters)) {
    for (const param of list || []) set.add(param);
  }
  return set;
}

const SWITCH_EQUIVALENCE_SPECS = [
  {
    group: "reasoning_switch_open",
    referenceCaseId: "thinking_enable_thinking_true",
    alternateCaseId: "thinking_switch_alt_thinking_enabled",
    primaryParam: "enable_thinking",
    alternateParam: "thinking",
    mode: "open"
  },
  {
    group: "reasoning_switch_close",
    referenceCaseId: "thinking_enable_thinking_false",
    alternateCaseId: "thinking_switch_alt_thinking_disabled",
    primaryParam: "enable_thinking",
    alternateParam: "thinking",
    mode: "close"
  }
];

function formatEvidenceDelta(reference, alternate) {
  const refScore = thinkingEvidenceScore(reference);
  const altScore = thinkingEvidenceScore(alternate);
  const refTokens = reasoningTokenCountForResult(reference);
  const altTokens = reasoningTokenCountForResult(alternate);
  if (refTokens != null || altTokens != null) {
    return `主方言 reasoning_tokens=${refTokens ?? 0}，备选 ${altTokens ?? 0}`;
  }
  return `主方言证据分 ${refScore}，备选 ${altScore}`;
}

function analyzeSwitchConflict(byCase) {
  const specs = [
    {
      caseId: "thinking_switch_conflict_enable_off_thinking_on",
      label: "enable_thinking=false 且 thinking.type=enabled",
      openWinner: "thinking",
      closeWinner: "enable_thinking",
      openNote: "冲突时 thinking.type=enabled 生效（忽略 enable_thinking=false）",
      closeNote: "冲突时 enable_thinking=false 生效（thinking 未产生证据）"
    },
    {
      caseId: "thinking_switch_conflict_enable_on_thinking_off",
      label: "enable_thinking=true 且 thinking.type=disabled",
      openWinner: "enable_thinking",
      closeWinner: "thinking",
      openNote: "冲突时 enable_thinking=true 生效（忽略 thinking.type=disabled）",
      closeNote: "冲突时 thinking.type=disabled 生效（无 thinking 证据）"
    }
  ];
  const conflicts = specs.map((spec) => {
    const result = byCase.get(spec.caseId);
    if (!result) return null;
    const hasEvidence = thinkingResultHasEvidence(result);
    const winner = hasEvidence ? spec.openWinner : spec.closeWinner;
    return {
      case_id: spec.caseId,
      label: spec.label,
      winner,
      has_thinking_evidence: hasEvidence,
      notes: hasEvidence ? spec.openNote : spec.closeNote
    };
  }).filter(Boolean);
  return conflicts.length ? conflicts : null;
}

export function thinkingDialectEquivalenceAnalysis(byCase, protocolMatrix, channelId, protocolId = "chat_completions") {
  void protocolMatrix;
  void channelId;
  void protocolId;
  const baseline = byCase.get("thinking_baseline_fixed_prompt") || byCase.get("thinking_baseline_no_thinking");
  const baselineScore = thinkingEvidenceScore(baseline);
  const rows = [];
  const paramUpdates = {};

  for (const spec of SWITCH_EQUIVALENCE_SPECS) {
    const reference = byCase.get(spec.referenceCaseId);
    const alternate = byCase.get(spec.alternateCaseId);
    if (!reference && !alternate) continue;

    let primaryEffectiveness = "unproven";
    let alternateEffectiveness = "unproven";
    let notes = "";

    if (spec.mode === "open") {
      const primaryWorks = thinkingOpeningWorks(reference);
      const altWorks = thinkingOpeningWorks(alternate);
      const altAccepted = thinkingRequestAccepted(alternate);
      const primaryScore = thinkingEvidenceScore(reference);
      const altScore = thinkingEvidenceScore(alternate);

      if (primaryWorks && primaryScore > baselineScore) primaryEffectiveness = "effective";
      else if (reference && thinkingRequestRejected(reference)) primaryEffectiveness = "rejected";
      else if (reference && thinkingRequestAccepted(reference)) primaryEffectiveness = "accepted_ineffective";

      if (altWorks && altScore > baselineScore) alternateEffectiveness = "effective";
      else if (alternate && altAccepted && !altWorks) alternateEffectiveness = "accepted_ineffective";
      else if (alternate && thinkingRequestRejected(alternate)) alternateEffectiveness = "rejected";

      if (primaryEffectiveness === "effective" && alternateEffectiveness === "accepted_ineffective") {
        notes = "主方言开启有效，备选方言 HTTP 接受但无 thinking 证据";
      } else if (primaryEffectiveness === "effective" && alternateEffectiveness === "effective") {
        notes = "主方言与备选方言均可开启 thinking";
      } else if (!reference || !alternate) {
        notes = "等价对照 case 未完整运行";
      }
    } else {
      const primaryWorks = thinkingClosingWorks(reference);
      const altWorks = thinkingClosingWorks(alternate);
      const altAccepted = thinkingRequestAccepted(alternate);

      if (primaryWorks) primaryEffectiveness = "effective";
      else if (reference && thinkingRequestRejected(reference)) primaryEffectiveness = "rejected";
      else if (reference && thinkingRequestAccepted(reference)) primaryEffectiveness = "accepted_ineffective";

      if (altWorks) alternateEffectiveness = "effective";
      else if (alternate && altAccepted && !altWorks) alternateEffectiveness = "accepted_ineffective";
      else if (alternate && thinkingRequestRejected(alternate)) alternateEffectiveness = "rejected";

      if (primaryEffectiveness === "effective" && alternateEffectiveness === "accepted_ineffective") {
        notes = "主方言关闭有效，备选方言 HTTP 接受但未关闭 thinking";
      } else if (primaryEffectiveness === "effective" && alternateEffectiveness === "effective") {
        notes = "主方言与备选方言均可关闭 thinking";
      }
    }

    rows.push({
      group: spec.group,
      mode: spec.mode,
      primary_param: spec.primaryParam,
      alternate_param: spec.alternateParam,
      reference_case_id: spec.referenceCaseId,
      alternate_case_id: spec.alternateCaseId,
      primary_effectiveness: primaryEffectiveness,
      alternate_effectiveness: alternateEffectiveness,
      evidence_delta: reference && alternate ? formatEvidenceDelta(reference, alternate) : "",
      notes
    });

    if (spec.mode === "open") {
      paramUpdates[spec.primaryParam] = {
        ...(paramUpdates[spec.primaryParam] || {}),
        role: "primary",
        thinking_effectiveness: primaryEffectiveness
      };
      paramUpdates[spec.alternateParam] = {
        ...(paramUpdates[spec.alternateParam] || {}),
        role: "alternate",
        reference: spec.referenceCaseId,
        thinking_effectiveness: alternateEffectiveness,
        evidence_delta: reference && alternate ? formatEvidenceDelta(reference, alternate) : ""
      };
    }
  }

  const conflicts = analyzeSwitchConflict(byCase);
  if (!rows.length && !conflicts?.length) return null;

  return {
    rows,
    conflicts,
    param_updates: paramUpdates
  };
}

export function formatSwitchEquivalenceMarkdown(equiv) {
  if (!equiv?.rows?.length && !equiv?.conflicts?.length) return [];
  const lines = ["### 开关方言等价对照", ""];
  if (equiv.rows.length) {
    lines.push("| 语义 | 主方言参数 | 主方言实测 | 备选参数 | 备选实测 | 证据对比 | 说明 |");
    lines.push("|---|---|---|---|---|---|---|");
    for (const row of equiv.rows) {
      const label = row.mode === "open" ? "开启" : "关闭";
      lines.push(
        `| ${label} | \`${row.primary_param}\` | ${row.primary_effectiveness} | \`${row.alternate_param}\` | ${row.alternate_effectiveness} | ${row.evidence_delta || "—"} | ${row.notes || "—"} |`
      );
    }
    lines.push("");
  }
  for (const conflict of equiv.conflicts || []) {
    lines.push(`- 冲突探针（${conflict.label}）：以 **${conflict.winner}** 为准；${conflict.notes}`);
  }
  if (equiv.conflicts?.length) lines.push("");
  return lines;
}

export function buildObservedChannel(protocolMatrix, channelId, protocolId, probeResults, providerResults = []) {
  const allResults = [...probeResults, ...providerResults];
  const thinkingResults = allResults.filter((r) =>
    String(r.case_id || "").startsWith("thinking_")
    || (r.category === "reasoning" && (r.parameters || []).some((p) =>
      ["enable_thinking", "thinking_budget", "reasoning_effort", "thinking", "reasoning", "reasoning_split", "chat_template_kwargs"].includes(p)
    ))
  );
  if (!thinkingResults.length) return null;

  const byCase = new Map(thinkingResults.map((r) => [r.case_id, r]));
  const families = thinkingProbeFamilies().map((family) => thinkingFamilyAnalysis(family, byCase));
  const docSet = documentedParamsForChannel(protocolMatrix, channelId, protocolId);

  const channel = { };
  for (const family of families) {
    for (const param of family.parameters || []) {
      const documented = docSet.has(param);
      let effectiveness = family.thinking_effectiveness;
      const intensity = (family.intensityResults || []).find((item) => item.parameter === param);
      if (intensity) effectiveness = intensity.thinking_effectiveness;
      if (!documented && effectiveness === "effective") effectiveness = "doc_gap";
      const evidence = uniqueStrings(
        [...family.openResults, ...family.closeResults]
          .map((item) => item.result)
          .filter(Boolean)
          .flatMap((r) => [...thinkingLocationsForResult(r), ...thinkingTokenEvidenceForResult(r)])
      );
      const caseIds = uniqueStrings([
        ...family.openCases.map((c) => c.caseId),
        ...family.closeCases.map((c) => c.caseId),
        ...(family.intensityPairs || []).flatMap((p) => [p.lowCaseId, p.highCaseId])
      ].filter((id) => byCase.has(id)));

      channel[param] = {
        documented,
        thinking_effectiveness: effectiveness,
        family: family.name,
        evidence,
        case_ids: caseIds,
        notes: intensity?.notes || ""
      };
    }
  }

  for (const effort of analyzeEffortProbes(byCase)) {
    const param = effort.parameter;
    const documented = docSet.has(param);
    let effectiveness = effort.direct_values.length ? "effective" : effort.accepted_values.length ? "accepted_ineffective" : "unproven";
    if (!documented && effectiveness === "effective") effectiveness = "doc_gap";
    channel[param] = {
      ...(channel[param] || {}),
      documented,
      thinking_effectiveness: channel[param]?.thinking_effectiveness || effectiveness,
      effort_profile: {
        default_effort: effort.default_effort,
        accepted_values: effort.accepted_values,
        canonical_values: effort.canonical_values,
        direct_values: effort.direct_values,
        mappings: effort.mappings,
        documented_aliases: effort.documented_aliases,
        agent_context_note: effort.agent_context_note
      },
      case_ids: uniqueStrings([
        ...(channel[param]?.case_ids || []),
        effort.baseline_case_id,
        ...Object.values(effort.levels).map((entry) => entry.caseId)
      ].filter(Boolean))
    };
  }

  const equivalence = thinkingDialectEquivalenceAnalysis(byCase, protocolMatrix, channelId, protocolId);
  if (equivalence) {
    channel.switch_equivalence = equivalence;
    for (const [param, update] of Object.entries(equivalence.param_updates || {})) {
      channel[param] = {
        ...(channel[param] || {}),
        documented: docSet.has(param),
        ...update,
        case_ids: uniqueStrings([
          ...(channel[param]?.case_ids || []),
          ...SWITCH_EQUIVALENCE_SPECS.flatMap((spec) => [spec.referenceCaseId, spec.alternateCaseId])
        ].filter((id) => byCase.has(id)))
      };
      if (!channel[param].documented && channel[param].thinking_effectiveness === "effective") {
        channel[param].thinking_effectiveness = "doc_gap";
      }
    }
  }

  return Object.keys(channel).length ? channel : null;
}

function uniqueStrings(values) {
  return [...new Set(values.filter(Boolean))];
}

export function buildThinkingObserved({ reports = [], protocolMatrix, generatedAt = new Date().toISOString() }) {
  const channels = {};
  for (const report of reports) {
    const channelId = report.channel_id || report.provider;
    const protocolId = report.endpoint_id || report.protocol_id || "chat_completions";
    if (!channelId) continue;
    const built = buildObservedChannel(
      protocolMatrix,
      channelId,
      protocolId,
      report.results || [],
      []
    );
    if (!built) continue;
    channels[channelId] = channels[channelId] || {};
    channels[channelId][protocolId] = { ...channels[channelId][protocolId], ...built };
  }
  return { generatedAt, channels };
}
