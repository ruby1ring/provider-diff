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
    deepseek: "model_behaviors_deepseek",
    moonshot: "model_behaviors_moonshot",
    zhipu: "model_behaviors_zhipu",
    minimax: "model_behaviors_minimax"
  };

  const VENDOR_LABEL = {
    deepseek: "DeepSeek 官方",
    moonshot: "Moonshot (Kimi) 官方",
    zhipu: "智谱官方",
    minimax: "MiniMax 官方"
  };

  // 各厂商原厂特殊规则摘要：选中该厂商的测评模型时，UI 用它渲染显著提示条。
  // rule 面向运营（一句话说清行为），source 是原厂文档出处。
  const VENDOR_RULES = {
    deepseek: [
      {
        rule: "思考模式下 temperature、top_p、presence_penalty、frequency_penalty 会被接受但不生效（原厂为兼容旧软件不报错）",
        source: "https://api-docs.deepseek.com/zh-cn/guides/thinking_mode"
      },
      {
        rule: "推理强度参数已从顶层 reasoning_effort 移入 thinking.reasoning_effort（取值 high / max）；实测两种写法目前都被接受（2026-07-08）",
        source: "https://api-docs.deepseek.com/zh-cn/api/create-chat-completion"
      }
    ],
    moonshot: [
      {
        rule: "kimi-k2 系列采样参数是锁死的：temperature、top_p、n、presence_penalty 传非默认值会直接报 400（与 DeepSeek「接受但忽略」相反）；实测已确认（2026-07-08）",
        source: "https://platform.kimi.com/docs/guide/kimi-k2-6-quickstart"
      },
      {
        rule: "kimi-k2.7-code 始终开启思考，传 thinking:{type:\"disabled\"} 报 400；kimi-k2.5 不支持 thinking.keep 字段（报 400）",
        source: "https://platform.kimi.com/docs/api/chat"
      }
    ],
    zhipu: [
      {
        rule: "do_sample=false 时 temperature、top_p 被忽略（智谱特有的采样总开关）",
        source: "https://docs.bigmodel.cn/api-reference/%E6%A8%A1%E5%9E%8B-api/%E5%AF%B9%E8%AF%9D%E8%A1%A5%E5%85%A8"
      },
      {
        rule: "官方文档称 stop 仅支持单个停止词，但实测传多个停止词也能生效（2026-07-08，属文档漏洞）；temperature 官方限两位小数，实测传三位小数不报错",
        source: "https://docs.bigmodel.cn/api-reference/%E6%A8%A1%E5%9E%8B-api/%E5%AF%B9%E8%AF%9D%E8%A1%A5%E5%85%A8"
      }
    ],
    minimax: [
      {
        rule: "M2.x 系列思考不可关闭：传 thinking:{type:\"disabled\"} 会被接受但思考照常进行（M3 才允许关闭）",
        source: "https://platform.minimax.io/docs/api-reference/text-chat-openai"
      },
      {
        rule: "官方 schema 未定义 n，实测传 n=2 直接报 400（错误码 2013）；Anthropic 协议下 stop_sequences、top_k 官方明示会被忽略",
        source: "https://platform.minimax.io/docs/api-reference/text-anthropic-api"
      }
    ]
  };

  function vendorRules(vendorId) {
    return VENDOR_RULES[String(vendorId || "").trim()] || [];
  }

  function vendorLabel(vendorId) {
    return VENDOR_LABEL[String(vendorId || "").trim()] || "";
  }

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
    vendorRules,
    vendorLabel,
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
