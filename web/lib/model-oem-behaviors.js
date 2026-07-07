/**
 * Model OEM reference cases: inject per eval-model vendor, run on all selected channels.
 */
(function initModelOemBehaviors(global) {
  const OEM_CASE_IDS = new Set([
    "deepseek_oem_thinking_sampling_ignored"
  ]);

  const OEM_TARGET_GROUP_BY_CASE_ID = {
    deepseek_oem_thinking_sampling_ignored: "protocol_sampling"
  };

  const VENDOR_PROVIDER = {
    deepseek: "model_behaviors_deepseek"
  };

  const VENDOR_LABEL = {
    deepseek: "DeepSeek 官方"
  };

  function inferEvalModelVendorId(modelId) {
    const infer = global.NOCTUA_CHANNEL_CATALOG?.inferEvalModelVendorId;
    if (typeof infer === "function") return infer(modelId);
    const id = String(modelId || "").trim().toLowerCase();
    if (id.startsWith("deepseek")) return "deepseek";
    return "other";
  }

  function modelBehaviorsProviderId(vendorId) {
    return VENDOR_PROVIDER[vendorId] || "";
  }

  function isOemReferenceCase(testCase) {
    if (!testCase) return false;
    if (testCase.case_scope === "oem_reference") return true;
    if (testCase.expect?.case_scope === "oem_reference") return true;
    return OEM_CASE_IDS.has(String(testCase.case_id || ""));
  }

  function oemTargetGroup(testCase) {
    const fromMeta = String(
      testCase?.target_group
      || testCase?.expect?.target_group
      || ""
    ).trim();
    if (fromMeta) return fromMeta;
    return OEM_TARGET_GROUP_BY_CASE_ID[String(testCase?.case_id || "")] || "";
  }

  function oemVendorId(testCase) {
    return String(testCase?.oem_vendor || testCase?.expect?.oem_vendor || "").trim();
  }

  function oemSource(testCase) {
    return String(testCase?.expect?.oem_source || testCase?.oem_source || "").trim();
  }

  function oemVendorLabel(cases = []) {
    const vendor = oemVendorId(cases[0] || {}) || "deepseek";
    return VENDOR_LABEL[vendor] || vendor;
  }

  function sortCasesInGroup(cases = []) {
    return [...cases].sort((a, b) => {
      const scopeA = isOemReferenceCase(a) ? 1 : 0;
      const scopeB = isOemReferenceCase(b) ? 1 : 0;
      if (scopeA !== scopeB) return scopeA - scopeB;
      return String(a.case_id).localeCompare(String(b.case_id));
    });
  }

  function partitionCasesByScope(cases = []) {
    const common = [];
    const oem = [];
    for (const testCase of cases) {
      if (isOemReferenceCase(testCase)) oem.push(testCase);
      else common.push(testCase);
    }
    return { common, oem };
  }

  function thinkingDialects() {
    return global.THINKING_CHANNEL_DIALECTS || {};
  }

  /**
   * Adapt OEM payload thinking switch for non-OEM channel APIs.
   * @returns {{ payload: object, changed: boolean }}
   */
  function adaptOemCasePayloadForRoute(testCase, channelId) {
    const payload = JSON.parse(JSON.stringify(testCase?.payload || {}));
    if (!payload.thinking || !channelId) {
      return { payload, changed: false };
    }
    const cfg = thinkingDialects()[channelId];
    if (!cfg?.switchField) return { payload, changed: false };

    const thinkingType = payload.thinking?.type;
    const enabled = thinkingType === "enabled" || thinkingType === "adaptive";
    const switchField = cfg.switchField;

    if (switchField === "thinking.type") {
      return { payload, changed: false };
    }

    delete payload.thinking;

    if (switchField === "enable_thinking") {
      payload.enable_thinking = enabled;
      return { payload, changed: true };
    }

    if (switchField === "reasoning") {
      payload.reasoning = { enabled };
      return { payload, changed: true };
    }

    return { payload, changed: false };
  }

  function prepareCaseForRoute(testCase, channelId) {
    if (!isOemReferenceCase(testCase)) return testCase;
    const { payload, changed } = adaptOemCasePayloadForRoute(testCase, channelId);
    if (!changed) return testCase;
    return {
      ...testCase,
      custom: true,
      payload
    };
  }

  function toCustomCaseShape(testCase) {
    return {
      case_id: testCase.case_id,
      title: testCase.title,
      category: testCase.category,
      parameters: testCase.parameters,
      method: testCase.method || "POST",
      path: testCase.path || "/chat/completions",
      payload: testCase.payload,
      expect: testCase.expect
    };
  }

  global.NOCTUA_MODEL_OEM_BEHAVIORS = {
    OEM_CASE_IDS,
    inferEvalModelVendorId,
    modelBehaviorsProviderId,
    isOemReferenceCase,
    oemTargetGroup,
    oemVendorId,
    oemSource,
    oemVendorLabel,
    sortCasesInGroup,
    partitionCasesByScope,
    adaptOemCasePayloadForRoute,
    prepareCaseForRoute,
    toCustomCaseShape
  };
})(typeof window !== "undefined" ? window : globalThis);
