/**
 * 渠道参数测评报告：case 评测意图（断言型 vs 观测型）与分轨统计。
 * 断言型有明确对错；观测型仅记录现状，不计入「预期外」失败。
 */
window.NOCTUA_CHANNEL_REPORT_INTENT = (() => {
  function explicitIntent(testCase) {
    const raw = testCase?.expect?.evaluation_intent || testCase?.evaluation_intent;
    if (raw === "assert" || raw === "observe") return raw;
    return null;
  }

  function caseId(testCase) {
    return String(testCase?.case_id || "");
  }

  function isCacheHitCase(testCase) {
    if (!testCase) return false;
    const id = caseId(testCase);
    return testCase.category === "cache" || testCase.cache_case === true || id.startsWith("cache_");
  }

  function isCacheHitRateAssertCase(testCase) {
    if (!isCacheHitCase(testCase)) return false;
    const id = caseId(testCase);
    return id.includes("hit_rate_85") || Number(testCase?.min_hit_rate || testCase?.payload?.min_hit_rate || 0) >= 0.85;
  }

  function isProtocolStreamUsageObservedCase(testCase) {
    if (testCase?.category !== "protocol") return false;
    return /_stream_usage_without_include_usage$/.test(caseId(testCase));
  }

  function isProtocolStreamUsageChunkShapeCase(testCase) {
    if (testCase?.category !== "protocol") return false;
    return /_(protocol_stream_usage_chunk_shape|stream_usage_chunk_shape)$/.test(caseId(testCase));
  }

  function isProtocolStreamCaseP0(testCase) {
    if (testCase?.category !== "protocol") return false;
    const id = caseId(testCase);
    return /_(protocol_stream_basic|stream_basic)$/.test(id) || id === "am_protocol_stream";
  }

  function isProtocolStreamCaseP0NonStream(testCase) {
    if (testCase?.category !== "protocol") return false;
    return /_protocol_stream_false$/.test(caseId(testCase)) || caseId(testCase) === "am_protocol_stream_false";
  }

  function isProtocolStreamCaseP1IncludeUsage(testCase) {
    if (testCase?.category !== "protocol") return false;
    if (isProtocolStreamUsageObservedCase(testCase) || isProtocolStreamUsageChunkShapeCase(testCase)) return false;
    if (isProtocolStreamCaseP0(testCase) || isProtocolStreamCaseP0NonStream(testCase)) return false;
    const id = caseId(testCase);
    return /_(protocol_stream_include_usage|stream_include_usage)$/.test(id)
      || id === "oa_stream_with_usage"
      || id === "or_stream_with_usage_deprecated_option";
  }

  function isLengthPrecedenceCase(testCase) {
    if (testCase?.category !== "length") return false;
    return /_length_both_fields_precedence$/.test(caseId(testCase));
  }

  function isLengthFieldEffectiveCase(testCase) {
    if (testCase?.category !== "length") return false;
    return /_length_max_(tokens|completion_tokens)_only_effective$/.test(caseId(testCase));
  }

  function isLengthAcceptanceCase(testCase) {
    if (testCase?.category !== "length") return false;
    const id = caseId(testCase);
    if (isLengthPrecedenceCase(testCase) || isLengthFieldEffectiveCase(testCase)) return false;
    return /_length_max_(tokens|completion_tokens)$/.test(id) && !id.endsWith("_stop");
  }

  function isLengthEdgeOrCapacityCase(testCase) {
    if (testCase?.category === "capacity" || testCase?.capacity_case) return true;
    if (testCase?.category !== "length") return false;
    if (isLengthPrecedenceCase(testCase) || isLengthFieldEffectiveCase(testCase) || isLengthAcceptanceCase(testCase)) return false;
    return true;
  }

  function isConnectivityCase(testCase) {
    const id = caseId(testCase);
    return /_(basic_minimal|messages_minimal)$/.test(id) || id === "am_basic_minimal";
  }

  function isProtocolSamplingCase(testCase) {
    return testCase?.category === "protocol" && /_protocol_sampling_temperature_/.test(caseId(testCase));
  }

  function isProtocolThinkingCase(testCase) {
    const id = caseId(testCase);
    if (id.startsWith("ali_protocol_thinking_") || id.startsWith("am_protocol_thinking_")) return true;
    if (id.startsWith("thinking_")) return true;
    return testCase?.category === "reasoning" && Boolean(testCase?.expect?.thinking_location_probe);
  }

  function isProtocolToolsCase(testCase) {
    const id = caseId(testCase);
    return id.startsWith("tools_") || id.startsWith("am_tools_");
  }

  function isProtocolResponseFormatCase(testCase) {
    const id = caseId(testCase);
    return id.startsWith("response_format_");
  }

  function inferGroupKey(testCase) {
    if (!testCase) return "";
    if (isCacheHitCase(testCase)) return "cache_hit";
    if (isConnectivityCase(testCase)) return "connectivity";
    if (testCase.category === "protocol" && isProtocolStreamCaseP0(testCase)) return "protocol";
    if (testCase.category === "protocol" && isProtocolStreamCaseP0NonStream(testCase)) return "protocol";
    if (testCase.category === "protocol" && (isProtocolStreamUsageObservedCase(testCase) || isProtocolStreamUsageChunkShapeCase(testCase) || isProtocolStreamCaseP1IncludeUsage(testCase))) return "protocol";
    if (isProtocolSamplingCase(testCase)) return "protocol_sampling";
    if (isProtocolThinkingCase(testCase)) return "protocol_thinking";
    if (isProtocolToolsCase(testCase)) return "protocol_tools";
    if (isProtocolResponseFormatCase(testCase)) return "protocol_response_format";
    if (testCase.category === "length" || testCase.category === "capacity") return "output_length";
    return "";
  }

  /**
   * @returns {"assert"|"observe"}
   */
  function caseEvaluationIntent(testCase, groupKey = "") {
    const explicit = explicitIntent(testCase);
    if (explicit) return explicit;
    if (testCase?.optional) return "observe";

    const group = groupKey || inferGroupKey(testCase);

    if (group === "connectivity") return "assert";
    if (group === "protocol_sampling") return "observe";
    if (group === "protocol_thinking") return "observe";
    if (group === "protocol_tools") return "assert";
    if (group === "protocol_response_format") return "assert";

    if (group === "protocol") {
      if (isProtocolStreamUsageObservedCase(testCase) || isProtocolStreamUsageChunkShapeCase(testCase)) return "observe";
      return "assert";
    }

    if (group === "output_length") {
      if (isLengthEdgeOrCapacityCase(testCase)) return "observe";
      if (isLengthPrecedenceCase(testCase) || isLengthFieldEffectiveCase(testCase) || isLengthAcceptanceCase(testCase)) return "assert";
      return "observe";
    }

    if (group === "cache_hit") {
      return isCacheHitRateAssertCase(testCase) ? "assert" : "observe";
    }

    return "assert";
  }

  function resultEvaluationIntent(result, groupKey = "") {
    const sourceCase = result?.source_case || null;
    const key = groupKey || result?.case_group_key || inferGroupKey(sourceCase || { case_id: result?.case_id, category: result?.category });
    return caseEvaluationIntent(sourceCase || { case_id: result?.case_id, category: result?.category }, key);
  }

  function intentLabel(intent) {
    return intent === "observe" ? "观测型" : "断言型";
  }

  function observeResultHealthy(result, deps = {}) {
    const expectedStatus = typeof deps.expectedHTTPStatusForResult === "function"
      ? deps.expectedHTTPStatusForResult(result)
      : Number(result?.expected_http_status || result?.source_case?.expect?.http_status || 200);
    const actualStatus = Number(result?.http_status || 0);
    if (expectedStatus && actualStatus !== expectedStatus) return false;
    if (result?.support_conclusion === "request_failed") return false;
    if (result?.error) return false;
    return true;
  }

  function hasFailedAssertions(result) {
    const assertions = Array.isArray(result?.assertions) ? result.assertions : [];
    return assertions.some((assertion) => assertion && assertion.pass === false);
  }

  function failedAssertionNames(result, limit = 2) {
    const assertions = Array.isArray(result?.assertions) ? result.assertions : [];
    return assertions
      .filter((assertion) => assertion && assertion.pass === false)
      .map((assertion) => assertion.name)
      .filter(Boolean)
      .slice(0, limit);
  }

  /**
   * @returns {"recorded"|"observe_issue"|"observe_assert_fail"}
   */
  function observeReportStatus(result, deps = {}) {
    if (!observeResultHealthy(result, deps)) return "observe_issue";
    if (hasFailedAssertions(result)) return "observe_assert_fail";
    return "recorded";
  }

  function matchesExpectedForReport(result, deps = {}) {
    const intent = resultEvaluationIntent(result);
    if (intent === "observe") {
      return observeReportStatus(result, deps) === "recorded";
    }
    if (typeof deps.matchesExpectedResult === "function") {
      return deps.matchesExpectedResult(result);
    }
    return Boolean(result?.matches_expected);
  }

  function channelReportStats(results = [], deps = {}) {
    let assertPass = 0;
    let assertFail = 0;
    let observeRecorded = 0;
    let observeIssue = 0;
    let observeAssertionFail = 0;
    let structureDiffs = 0;

    for (const raw of results) {
      const result = raw || {};
      const intent = resultEvaluationIntent(result);
      const healthy = matchesExpectedForReport(result, deps);
      if (intent === "observe") {
        const status = observeReportStatus(result, deps);
        if (status === "recorded") observeRecorded += 1;
        else if (status === "observe_assert_fail") observeAssertionFail += 1;
        else observeIssue += 1;
      } else if (healthy) {
        assertPass += 1;
      } else {
        assertFail += 1;
      }
      if (Number(result.diff_count || 0) > 0 && !result.is_baseline) {
        structureDiffs += 1;
      }
    }

    return {
      total: results.length,
      assertPass,
      assertFail,
      assertTotal: assertPass + assertFail,
      observeRecorded,
      observeIssue,
      observeAssertionFail,
      observeTotal: observeRecorded + observeIssue + observeAssertionFail,
      structureDiffs,
      // legacy compat
      expectedPass: assertPass + observeRecorded,
      unexpected: assertFail + observeIssue + observeAssertionFail
    };
  }

  function channelReportPassSummaryText(stats = {}) {
    const assertTotal = stats.assertTotal || 0;
    const assertPass = stats.assertPass || 0;
    const observeTotal = stats.observeTotal || 0;
    const observeRecorded = stats.observeRecorded || 0;
    if (!assertTotal && !observeTotal) return "—";
    const parts = [];
    if (assertTotal) parts.push(`断言 ${assertPass}/${assertTotal}`);
    if (observeTotal) parts.push(`观测 ${observeRecorded}/${observeTotal}`);
    return parts.join(" · ");
  }

  function channelReportIssueSummaryText(stats = {}) {
    const assertFail = stats.assertFail || 0;
    const observeIssue = stats.observeIssue || 0;
    const observeAssertionFail = stats.observeAssertionFail || 0;
    if (!assertFail && !observeIssue && !observeAssertionFail) return "无断言失败";
    const parts = [];
    if (assertFail) parts.push(`${assertFail} 项断言未达标`);
    if (observeAssertionFail) parts.push(`${observeAssertionFail} 项观测断言异常`);
    if (observeIssue) parts.push(`${observeIssue} 项观测请求异常`);
    return parts.join(" · ");
  }

  const CASE_SEVERITY_META = {
    p0: {
      level: "p0",
      label: "P0",
      title: "阻断",
      description: "核心能力不可用，不建议接入。",
      css: "critical"
    },
    p1: {
      level: "p1",
      label: "P1",
      title: "严重",
      description: "关键兼容性断言未通过，需修复或适配后再接入。",
      css: "warning"
    },
    p2: {
      level: "p2",
      label: "P2",
      title: "一般",
      description: "非核心差异或需适配项，可有条件接入。",
      css: "extension"
    },
    p3: {
      level: "p3",
      label: "P3",
      title: "参考",
      description: "观测记录项，供协议对齐与网关设计参考。",
      css: "info"
    }
  };

  const CHANNEL_VERDICT_META = {
    pass: {
      verdict: "pass",
      label: "推荐接入",
      css: "pass"
    },
    caution: {
      verdict: "caution",
      label: "谨慎接入",
      css: "caution"
    },
    warning: {
      verdict: "warning",
      label: "接入有风险",
      css: "warning"
    },
    fail: {
      verdict: "fail",
      label: "不建议接入",
      css: "fail"
    }
  };

  const REPORT_VERDICT_META = {
    pass: {
      verdict: "pass",
      label: "可接入",
      css: "pass",
      headline: "整体达标，测评渠道可满足当前勾选 case 的兼容性要求。"
    },
    caution: {
      verdict: "caution",
      label: "需关注",
      css: "caution",
      headline: "存在一般级差异或观测异常，建议评估适配成本后接入。"
    },
    warning: {
      verdict: "warning",
      label: "有风险",
      css: "warning",
      headline: "存在严重级断言失败，接入前需修复或明确适配方案。"
    },
    fail: {
      verdict: "fail",
      label: "不建议接入",
      css: "fail",
      headline: "存在阻断级失败，当前不建议将测评渠道用于生产流量。"
    }
  };

  const SEVERITY_ORDER = { p0: 0, p1: 1, p2: 2, p3: 3 };

  function caseSeverityMeta(level) {
    return CASE_SEVERITY_META[level] || CASE_SEVERITY_META.p2;
  }

  /**
   * Case 固有风险等级：与是否通过无关，表示失败时的业务影响。
   * @returns {"p0"|"p1"|"p2"|"p3"}
   */
  function caseSeverityLevel(testCase, groupKey = "") {
    const group = groupKey || inferGroupKey(testCase);
    const intent = caseEvaluationIntent(testCase, group);

    if (group === "connectivity") return "p0";
    if (group === "protocol_tools") return "p0";
    if (group === "protocol_response_format") return "p0";

    if (group === "protocol") {
      if (isProtocolStreamCaseP0(testCase) || isProtocolStreamCaseP0NonStream(testCase)) return "p0";
      if (isProtocolStreamUsageChunkShapeCase(testCase)) return "p2";
      if (isProtocolStreamUsageObservedCase(testCase)) return "p3";
      if (isProtocolStreamCaseP1IncludeUsage(testCase)) return "p1";
      return intent === "observe" ? "p3" : "p1";
    }

    if (group === "output_length") {
      if (isLengthPrecedenceCase(testCase) || isLengthFieldEffectiveCase(testCase) || isLengthAcceptanceCase(testCase)) {
        return "p1";
      }
      return "p3";
    }

    if (group === "cache_hit") {
      return isCacheHitRateAssertCase(testCase) ? "p1" : "p3";
    }

    if (group === "protocol_thinking") return "p2";
    if (group === "protocol_sampling") return "p3";
    return intent === "observe" ? "p3" : "p1";
  }

  function matrixRowSummaryHealthy(row, summary) {
    if (!summary) return true;
    if (row.intent === "observe") return summary.report_status === "recorded";
    return summary.report_status === "pass";
  }

  function matrixRowFailedTargets(row, channels = []) {
    const targetChannels = channels.filter((channel) => channel.role !== "baseline");
    const failedChannels = [];
    for (const channel of targetChannels) {
      const summary = row.by_channel?.[channel.key];
      if (!matrixRowSummaryHealthy(row, summary)) {
        failedChannels.push(channel.platformName || channel.key);
      }
    }
    return failedChannels;
  }

  function worstSeverityLevel(levels = []) {
    if (!levels.length) return null;
    return levels.slice().sort((left, right) => (SEVERITY_ORDER[left] ?? 9) - (SEVERITY_ORDER[right] ?? 9))[0];
  }

  function channelVerdictFromIssues(worstSeverity, issueCount) {
    if (!issueCount) return "pass";
    if (worstSeverity === "p0") return "fail";
    if (worstSeverity === "p1") return "warning";
    return "caution";
  }

  function channelIssueSummaryText(entry) {
    if (!entry.issueCount) return "全部 case 达标，推荐接入。";
    const parts = [];
    if (entry.severityFails?.p0) parts.push(`P0 ${entry.severityFails.p0} 项`);
    if (entry.severityFails?.p1) parts.push(`P1 ${entry.severityFails.p1} 项`);
    if (entry.severityFails?.p2) parts.push(`P2 ${entry.severityFails.p2} 项`);
    if (entry.severityFails?.p3) parts.push(`P3 ${entry.severityFails.p3} 项`);
    const detail = parts.length ? `（${parts.join("、")}）` : "";
    return `${entry.issueCount} 项未达标${detail}`;
  }

  function buildChannelRankings(matrix = [], channels = []) {
    const targetChannels = channels.filter((channel) => channel.role !== "baseline");
    const rankings = targetChannels.map((channel) => {
      let totalCases = 0;
      let issueCount = 0;
      let worstSeverity = null;
      const severityFails = { p0: 0, p1: 0, p2: 0, p3: 0 };
      const failedCases = [];

      for (const row of matrix) {
        const summary = row.by_channel?.[channel.key];
        if (!summary) continue;
        totalCases += 1;
        if (matrixRowSummaryHealthy(row, summary)) continue;

        issueCount += 1;
        const sourceCase = {
          case_id: row.case_id,
          category: row.category,
          optional: row.optional,
          expect: row.expect,
          source_case: row.source_case
        };
        const severity = caseSeverityLevel(sourceCase, row.group_key);
        severityFails[severity] = (severityFails[severity] || 0) + 1;
        worstSeverity = worstSeverityLevel([worstSeverity, severity].filter(Boolean));
        failedCases.push({
          case_id: row.case_id,
          title: row.title || row.case_id,
          severity,
          intent: row.intent
        });
      }

      const verdict = channelVerdictFromIssues(worstSeverity, issueCount);
      const entry = {
        key: channel.key,
        platformName: channel.platformName,
        totalCases,
        passCount: totalCases - issueCount,
        issueCount,
        worstSeverity,
        severityFails,
        failedCases,
        verdict,
        verdict_meta: CHANNEL_VERDICT_META[verdict] || CHANNEL_VERDICT_META.pass,
        severity_meta: worstSeverity ? caseSeverityMeta(worstSeverity) : null,
        summary_text: ""
      };
      entry.summary_text = channelIssueSummaryText(entry);
      return entry;
    });

    rankings.sort((left, right) => {
      const verdictOrder = { pass: 0, caution: 1, warning: 2, fail: 3 };
      const verdictDiff = (verdictOrder[left.verdict] ?? 9) - (verdictOrder[right.verdict] ?? 9);
      if (verdictDiff !== 0) return verdictDiff;
      if (left.issueCount !== right.issueCount) return left.issueCount - right.issueCount;
      const leftOrder = left.worstSeverity ? SEVERITY_ORDER[left.worstSeverity] : 9;
      const rightOrder = right.worstSeverity ? SEVERITY_ORDER[right.worstSeverity] : 9;
      if (leftOrder !== rightOrder) return leftOrder - rightOrder;
      return left.platformName.localeCompare(right.platformName, "zh-CN");
    });

    return rankings.map((entry, index) => ({
      ...entry,
      rank: index + 1
    }));
  }

  function channelRankingComparisonText(rankings = []) {
    if (rankings.length < 2) return "";
    const best = rankings[0];
    const worst = rankings[rankings.length - 1];
    if (best.key === worst.key) return "";
    if (best.issueCount === worst.issueCount && best.verdict === worst.verdict) {
      return `各渠道表现接近（均为 ${best.issueCount} 项问题），建议结合下方 case 明细选择。`;
    }
    if (!best.issueCount) {
      return `推荐优先接入 ${best.platformName}（全部达标）`;
    }
    return `相对更优：${best.platformName}（${best.summary_text}） · 相对较弱：${worst.platformName}（${worst.summary_text}）`;
  }

  function channelReportEvaluationSummary(matrix = [], channels = [], stats = {}, deps = {}) {
    const targetChannels = channels.filter((channel) => channel.role !== "baseline");
    const severityCounts = {
      p0: { total: 0, failed: 0 },
      p1: { total: 0, failed: 0 },
      p2: { total: 0, failed: 0 },
      p3: { total: 0, failed: 0 }
    };
    const failingCases = [];
    const channelIssues = new Map();

    for (const channel of targetChannels) {
      channelIssues.set(channel.key, {
        key: channel.key,
        platformName: channel.platformName,
        role: channel.role,
        failedCases: [],
        worstSeverity: null
      });
    }

    for (const row of matrix) {
      const sourceCase = {
        case_id: row.case_id,
        category: row.category,
        optional: row.optional,
        expect: row.expect,
        source_case: row.source_case
      };
      const severity = caseSeverityLevel(sourceCase, row.group_key);
      severityCounts[severity].total += 1;

      const failedChannels = matrixRowFailedTargets(row, channels);
      if (failedChannels.length) {
        severityCounts[severity].failed += 1;
        const failedChannelRepro = {};
        for (const channel of channels) {
          if (channel.role === "baseline") continue;
          const summary = row.by_channel?.[channel.key];
          if (!summary || matrixRowSummaryHealthy(row, summary)) continue;
          if (!summary.repro_verdict) continue;
          failedChannelRepro[channel.platformName || channel.key] = {
            verdict: summary.repro_verdict,
            total: Number(summary.attempts_total || 0),
            failed: Number(summary.attempts_failed || 0)
          };
        }
        failingCases.push({
          case_id: row.case_id,
          title: row.title || row.case_id,
          group_key: row.group_key,
          group_title: row.group_title || "",
          intent: row.intent,
          severity,
          severity_meta: caseSeverityMeta(severity),
          failed_channels: failedChannels,
          failed_channel_repro: failedChannelRepro
        });

        for (const channel of targetChannels) {
          const summary = row.by_channel?.[channel.key];
          if (!matrixRowSummaryHealthy(row, summary)) {
            const entry = channelIssues.get(channel.key);
            if (!entry) continue;
            entry.failedCases.push({
              case_id: row.case_id,
              title: row.title || row.case_id,
              severity,
              intent: row.intent
            });
            entry.worstSeverity = worstSeverityLevel([
              entry.worstSeverity,
              severity
            ].filter(Boolean));
          }
        }
      }
    }

    failingCases.sort((left, right) => {
      const severityDiff = (SEVERITY_ORDER[left.severity] ?? 9) - (SEVERITY_ORDER[right.severity] ?? 9);
      if (severityDiff !== 0) return severityDiff;
      return String(left.title || left.case_id).localeCompare(String(right.title || right.case_id), "zh-CN");
    });

    const channelRankings = buildChannelRankings(matrix, channels);
    const channelSummaries = channelRankings
      .filter((entry) => entry.issueCount > 0)
      .map((entry) => ({
        key: entry.key,
        platformName: entry.platformName,
        role: "target",
        failedCases: entry.failedCases,
        worstSeverity: entry.worstSeverity,
        issueCount: entry.issueCount,
        severity_meta: entry.severity_meta,
        verdict: entry.verdict,
        verdict_meta: entry.verdict_meta
      }));

    let verdict = "pass";
    if (severityCounts.p0.failed > 0) {
      verdict = "fail";
    } else if (severityCounts.p1.failed > 0 || (stats.assertFail || 0) > 0) {
      verdict = "warning";
    } else if (
      severityCounts.p2.failed > 0
      || (stats.observeIssue || 0) > 0
      || (stats.structureDiffs || 0) > 0
      || severityCounts.p3.failed > 0
    ) {
      verdict = "caution";
    }

    const verdictMeta = REPORT_VERDICT_META[verdict] || REPORT_VERDICT_META.pass;
    const issueText = channelReportIssueSummaryText(stats);
    const passText = channelReportPassSummaryText(stats);

    return {
      version: 2,
      verdict,
      verdict_meta: verdictMeta,
      headline: verdictMeta.headline,
      pass_text: passText,
      issue_text: issueText,
      severity_counts: severityCounts,
      failing_cases: failingCases,
      channel_summaries: channelSummaries,
      channel_rankings: channelRankings,
      ranking_comparison_text: channelRankingComparisonText(channelRankings),
      target_count: targetChannels.length,
      case_count: matrix.length
    };
  }

  return {
    caseEvaluationIntent,
    resultEvaluationIntent,
    inferGroupKey,
    intentLabel,
    matchesExpectedForReport,
    observeResultHealthy,
    observeReportStatus,
    hasFailedAssertions,
    failedAssertionNames,
    channelReportStats,
    channelReportPassSummaryText,
    channelReportIssueSummaryText,
    caseSeverityLevel,
    caseSeverityMeta,
    matrixRowFailedTargets,
    buildChannelRankings,
    channelRankingComparisonText,
    channelReportEvaluationSummary
  };
})();
