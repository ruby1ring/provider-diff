/* global module */
/**
 * Parameter support policy diagnosis — documented vs undocumented boundary rules.
 * See docs/project/api-doc-update-rules.md
 */
(function initParameterDiagnosis(global) {
  const UNDOCUMENTED_SCENARIOS = {
    silent_ignore: {
      label: "静默忽略",
      operator_note: "传参无报错且不生效，符合未文档化参数的预期。"
    },
    silent_effective: {
      label: "静默生效",
      operator_note: "文档未声明支持，但传参后实际生效，属渠道 API 文档漏洞。"
    },
    reject_on_pass: {
      label: "传参报错",
      operator_note: "文档未声明支持，传参却直接报错，存在兼容性风险。"
    }
  };

  const DIAGNOSTIC_FLAGS = {
    doc_gap: {
      label: "文档漏洞",
      css: "fail",
      operator_note: "文档未写支持该参数，实测却生效。须更新渠道 API 文档并标注实测来源。",
      severity: "p1"
    },
    undocumented_rejected: {
      label: "未文档化拒绝",
      css: "warning",
      operator_note: "文档未写支持该参数，传参却返回 4xx，可能影响 OpenAI 兼容透传。",
      severity: "p2"
    }
  };

  function httpOk(result = {}) {
    const status = Number(result.http_status || result.httpStatus || 0);
    return status >= 200 && status < 300;
  }

  function httpRejected(result = {}) {
    const status = Number(result.http_status || result.httpStatus || 0);
    return status === 400 || status === 422;
  }

  function expectMap(result = {}) {
    return result.source_case?.expect || result.expect || {};
  }

  function docSupport(expect = {}) {
    const explicit = String(expect.doc_support || "").trim().toLowerCase();
    if (explicit === "documented" || explicit === "undocumented") return explicit;
    const scenario = String(expect.undocumented_scenario || "").trim();
    if (scenario) return "undocumented";
    const caseId = String(expect.case_id || "").toLowerCase();
    if (caseId.includes("unknown_") && caseId.includes("_probe")) return "undocumented";
    return "documented";
  }

  function undocumentedScenario(expect = {}) {
    const explicit = String(expect.undocumented_scenario || "").trim();
    if (explicit && UNDOCUMENTED_SCENARIOS[explicit]) return explicit;
    const expected = String(expect.support_conclusion || "").trim();
    if (expected === "rejected_400") return "reject_on_pass";
    if (expected === "ignored") return "silent_ignore";
    return "";
  }

  function assertionByName(result = {}, name) {
    return (result.assertions || []).find((item) => item.name === name) || null;
  }

  function detectParameterEffect(result = {}, expect = {}) {
    if (expect.output_cap_effective === true) return true;
    if (result.output_cap_effective === true) return true;

    const paramAccept = assertionByName(result, "parameter_acceptance");
    if (paramAccept?.pass && String(paramAccept.message || "").includes("已接受且已生效")) {
      return true;
    }

    const thinkingRequired = assertionByName(result, "thinking_required");
    if (thinkingRequired?.pass) return true;

    const thinkingEvidence = assertionByName(result, "thinking_evidence_required");
    if (thinkingEvidence?.pass) return true;

    const thinkingAbsent = assertionByName(result, "thinking_absent");
    if (thinkingAbsent && !thinkingAbsent.pass) return true;

    if (expect.thinking_location_probe && thinkingAbsent && !thinkingAbsent.pass) {
      return true;
    }

    const tokenLimit = assertionByName(result, "token_limit");
    if (tokenLimit?.pass && String(tokenLimit.message || "").includes("生效")) {
      return true;
    }

    return false;
  }

  function matchesExpectedConclusion(result = {}, expect = {}) {
    const expected = String(
      result.expected_support_conclusion
      || expect.support_conclusion
      || "supported"
    ).trim();
    const actual = String(result.support_conclusion || result.conclusion || "unknown").trim();
    if (actual === "request_failed" || actual === "permission_limited") return false;
    return actual === expected;
  }

  function diagnoseUndocumented(result = {}, expect = {}) {
    const scenario = undocumentedScenario(expect);
    const effect = detectParameterEffect(result, expect);

    if (httpRejected(result)) {
      const compliant = scenario === "reject_on_pass";
      return {
        policy: "undocumented",
        scenario: "reject_on_pass",
        compliant,
        flag: compliant ? null : "undocumented_rejected",
        effect: false,
        message: compliant
          ? "文档未声明支持的参数按预期被拒绝。"
          : "文档未声明支持的参数传参后直接报错，存在兼容性风险。"
      };
    }

    if (httpOk(result) && effect) {
      return {
        policy: "undocumented",
        scenario: "silent_effective",
        compliant: false,
        flag: "doc_gap",
        effect: true,
        message: "文档未声明支持的参数传参后静默生效，属渠道 API 文档漏洞，需补充文档。"
      };
    }

    if (httpOk(result) && !effect) {
      const ignoredOk = ["ignored", "supported"].includes(String(result.support_conclusion || ""));
      return {
        policy: "undocumented",
        scenario: "silent_ignore",
        compliant: ignoredOk || scenario === "silent_ignore",
        flag: null,
        effect: false,
        message: "传参无报错且未观察到生效，符合未文档化参数的预期。"
      };
    }

    return {
      policy: "undocumented",
      scenario: scenario || "unknown",
      compliant: null,
      flag: null,
      effect,
      message: "未文档化参数场景证据不足，需补充 case 或复测。"
    };
  }

  function diagnoseDocumented(result = {}, expect = {}) {
    const compliant = matchesExpectedConclusion(result, expect)
      && !(result.assertions || []).some((item) => item.pass === false && item.name !== "optional_capability_mismatch");
    return {
      policy: "documented",
      scenario: null,
      compliant,
      flag: null,
      effect: detectParameterEffect(result, expect),
      message: compliant
        ? "文档已声明支持，实测结论与预期一致。"
        : "文档已声明支持，实测结论与预期不一致，须以复测结果更新文档或判渠道不达标。"
    };
  }

  function diagnoseParameterSupport(result = {}) {
    const expect = expectMap(result);
    const policy = docSupport(expect);
    const base = policy === "undocumented"
      ? diagnoseUndocumented(result, expect)
      : diagnoseDocumented(result, expect);

    const flagMeta = base.flag ? DIAGNOSTIC_FLAGS[base.flag] : null;
    return {
      ...base,
      doc_support: policy,
      flag_meta: flagMeta,
      parameters: result.parameters || expect.parameters || [],
      case_id: result.case_id || "",
      channel_name: result.channel_name || result.channel_id || ""
    };
  }

  function isDocGapDiagnosis(diagnosis = {}) {
    return diagnosis.flag === "doc_gap";
  }

  function isUndocumentedRejectedDiagnosis(diagnosis = {}) {
    return diagnosis.flag === "undocumented_rejected";
  }

  function scanResultsForDocIssues(results = []) {
    const issues = [];
    for (const result of results) {
      const diagnosis = result.parameter_diagnosis || diagnoseParameterSupport(result);
      if (!diagnosis.flag) continue;
      issues.push({
        case_id: result.case_id,
        title: result.title || result.case_id,
        channel_name: result.channel_name || result.channel_id || "",
        flag: diagnosis.flag,
        flag_meta: diagnosis.flag_meta || DIAGNOSTIC_FLAGS[diagnosis.flag],
        message: diagnosis.message,
        http_status: result.http_status,
        support_conclusion: result.support_conclusion,
        parameters: diagnosis.parameters || result.parameters || []
      });
    }
    return issues;
  }

  const api = {
    UNDOCUMENTED_SCENARIOS,
    DIAGNOSTIC_FLAGS,
    docSupport,
    undocumentedScenario,
    detectParameterEffect,
    diagnoseParameterSupport,
    isDocGapDiagnosis,
    isUndocumentedRejectedDiagnosis,
    scanResultsForDocIssues
  };

  global.NOCTUA_PARAMETER_DIAGNOSIS = api;
  if (typeof module !== "undefined") module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
