/**
 * 渠道测评报告：case 评测意图（断言型 vs 观测型）与分轨统计。
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
    const id = caseId(testCase);
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

  function matchesExpectedForReport(result, deps = {}) {
    const intent = resultEvaluationIntent(result);
    if (intent === "observe") {
      return observeResultHealthy(result, deps);
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
    let structureDiffs = 0;

    for (const raw of results) {
      const result = raw || {};
      const intent = resultEvaluationIntent(result);
      const healthy = matchesExpectedForReport(result, deps);
      if (intent === "observe") {
        if (healthy) observeRecorded += 1;
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
      observeTotal: observeRecorded + observeIssue,
      structureDiffs,
      // legacy compat
      expectedPass: assertPass + observeRecorded,
      unexpected: assertFail + observeIssue
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
    if (!assertFail && !observeIssue) return "无断言失败";
    const parts = [];
    if (assertFail) parts.push(`${assertFail} 项断言未达标`);
    if (observeIssue) parts.push(`${observeIssue} 项观测请求异常`);
    return parts.join(" · ");
  }

  return {
    caseEvaluationIntent,
    resultEvaluationIntent,
    inferGroupKey,
    intentLabel,
    matchesExpectedForReport,
    observeResultHealthy,
    channelReportStats,
    channelReportPassSummaryText,
    channelReportIssueSummaryText
  };
})();
