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
  //
  // 规则可带可选 models 字段（模型 id 数组，支持 "xxx*" 前缀通配），表示该规则只对列出的模型生效；
  // 不带 models 的规则是厂商通用规则，作为模型级（MODEL_RULES）缺失时的回落来源。
  // modelOemRules(modelId)：先取 MODEL_RULES[modelId]，再取该厂商通用规则，互斥拼接。
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
        source: "https://platform.kimi.com/docs/guide/kimi-k2-6-quickstart",
        models: ["kimi-k2.6", "kimi-k2.7-coder"]
      },
      {
        rule: "kimi-k2.7-code 始终开启思考，传 thinking:{type:\"disabled\"} 报 400；kimi-k2.5 不支持 thinking.keep 字段（报 400）",
        source: "https://platform.kimi.com/docs/api/chat",
        models: ["kimi-k2.6", "kimi-k2.7-coder"]
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

  // 模型级专属规则表：与厂商通用规则不同、只属于某个具体模型 id 的规则。
  // 每出一个新模型，应联网查官方文档把其特殊行为补进这里（再由渠道参数测评工具实测校验）。
  const MODEL_RULES = {
    "kimi-k3": [
      {
        rule: "kimi-k3 采样参数与 k2 行为不同：temperature（取值范围 0–1，>1 报 400「temperature must not be greater than 1.000000」）、top_p、presence_penalty 均正常接受不报错；n>1 在 temperature≤1e-5（默认）时报 400「n should not be greater than 1 when temperature is less than or equal to 1e-5」。即官方 schema 未列这些参数，但运行时实际接受；实测确认（2026-07-17，Noctua，Moonshot 官方 + SiliconFlow COM 一致）",
        source: "https://platform.kimi.com/docs/api/chat"
      },
      {
        rule: "kimi-k3 始终启用思考并开启 Preserved Thinking，无法关闭；不用 thinking 对象，而用顶层 reasoning_effort，且 enum 当前仅支持 \"max\"（默认 max）；文档确认（2026-07-17）",
        source: "https://platform.kimi.com/docs/guide/kimi-k3"
      },
      {
        rule: "kimi-k3 的 max_completion_tokens 默认 131072、最大可设 1048576；文档确认（2026-07-17）",
        source: "https://platform.kimi.com/docs/api/chat"
      },
      {
        rule: "kimi-k3 拒绝 n>1 的边界依赖 temperature：实测默认（temperature≤1e-5）时 n=2 报 400，提示「n should not be greater than 1 when temperature is less than or equal to 1e-5」——暗示 temperature 足够大时可能放开 n>1，待实测确认（2026-07-17 探测中）",
        source: "https://platform.kimi.com/docs/api/chat"
      }
    ]
  };

  function ruleAppliesToModel(rule, modelId) {
    const targets = Array.isArray(rule?.models) ? rule.models : null;
    if (!targets || !targets.length) return true; // 无 models → 厂商通用，命中
    const id = String(modelId || "").trim().toLowerCase();
    return targets.some((target) => {
      const t = String(target || "").trim().toLowerCase();
      if (!t) return false;
      if (t.endsWith("*")) return id.startsWith(t.slice(0, -1));
      return t === id;
    });
  }

  // OEM 原厂参考 case 的模型级限定：case 上的 applicable_models（数组，支持 "xxx*" 通配）。
  // 无 applicable_models → 该厂商通用 case，对所有该厂商模型注入；有 → 仅对列出的模型注入。
  function caseAppliesToModel(testCase, modelId) {
    const targets = Array.isArray(testCase?.applicable_models) ? testCase.applicable_models : null;
    if (!targets || !targets.length) return true;
    const id = String(modelId || "").trim().toLowerCase();
    return targets.some((target) => {
      const t = String(target || "").trim().toLowerCase();
      if (!t) return false;
      if (t.endsWith("*")) return id.startsWith(t.slice(0, -1));
      return t === id;
    });
  }

  function modelOemRules(modelId) {
    const id = String(modelId || "").trim();
    if (!id) return [];
    const vendorId = inferEvalModelVendorId(id);
    if (vendorId === "other") return [];
    const modelSpecific = MODEL_RULES[id] || [];
    const vendorGeneral = (VENDOR_RULES[vendorId] || []).filter((rule) => ruleAppliesToModel(rule, id));
    return [...modelSpecific, ...vendorGeneral];
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
    // OEM 原厂参考用例一律按 custom 内联提交（携带本渠道适配后的 payload），
    // 不再走 case_ids 串号由后端在渠道 provider 里反查——OEM 用例不在任何渠道
    // payloads 目录里，反查必然 "case xxx not found"。后端 runProviderCase 仍会用
    // 请求里的 model 覆盖 payload.model，故内联提交不影响目标模型/渠道的选择。
    const { payload } = adaptOemCasePayloadForRoute(testCase, channelId);
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
    ruleAppliesToModel,
    caseAppliesToModel,
    modelOemRules,
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
