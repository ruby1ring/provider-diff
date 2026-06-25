window.NOCTUA_CHANNEL_CATALOG = (() => {
  const protocolColumns = [
    { id: "chat_completions", label: "OpenAI Chat Completions API" },
    { id: "anthropic_messages", label: "Anthropic Messages API" },
    { id: "responses_api", label: "OpenAI Responses API" }
  ];

  const evalModelIds = [
    "deepseek-v4-flash",
    "deepseek-v4-pro",
    "kimi-k2.7-coder",
    "kimi-k2.6",
    "glm-5.2",
    "glm-5.1",
    "glm-5",
    "MiniMax-M3"
  ];

  /** ISO dates for built-in eval models; used to sort tabs newest-first. */
  const evalModelReleaseAt = {
    "deepseek-v4-pro": "2026-05-28",
    "deepseek-v4-flash": "2026-05-15",
    "kimi-k2.7-coder": "2026-05-20",
    "kimi-k2.6": "2026-01-10",
    "glm-5.2": "2026-06-10",
    "glm-5.1": "2026-04-15",
    "glm-5": "2026-02-20",
    "MiniMax-M3": "2026-03-18"
  };

  function parseModelVersionRank(modelId) {
    const id = String(modelId || "").toLowerCase();
    const semver = id.match(/(?:^|[.-/v])(\d+(?:\.\d+)+)(?:[.-/]|$)/)?.[1]
      || id.match(/(?:^|[.-/v])(\d+(?:\.\d+)?)(?:[.-/]|$)/)?.[1];
    if (!semver) return 0;
    const parts = semver.split(".").map((part) => Number(part) || 0);
    return parts.reduce((rank, part, index) => rank + part * (100 ** (Math.max(parts.length - index - 1, 0))), 0);
  }

  function getEvalModelReleaseTime(modelId) {
    if (evalModelReleaseAt[modelId]) return Date.parse(evalModelReleaseAt[modelId]);
    const custom = window.NOCTUA_CUSTOM_EVAL_MODELS?.load?.()?.find((item) => item.id === modelId);
    if (custom?.createdAt) return Date.parse(custom.createdAt);
    return parseModelVersionRank(modelId);
  }

  function sortEvalModelIdsNewestFirst(modelIds) {
    return [...modelIds].sort((a, b) => {
      const byRelease = getEvalModelReleaseTime(b) - getEvalModelReleaseTime(a);
      if (byRelease !== 0) return byRelease;
      return String(b).localeCompare(String(a), undefined, { numeric: true, sensitivity: "base" });
    });
  }

  const evalModelVendorDefs = [
    { id: "deepseek", label: "DeepSeek", logo: "design-system/assets/logos/deepseek.ico" },
    { id: "moonshot", label: "Moonshot", logo: "design-system/assets/logos/moonshot.ico" },
    { id: "zhipu", label: "智谱", logo: "design-system/assets/logos/zhipu.svg" },
    { id: "minimax", label: "MiniMax", logo: "design-system/assets/logos/minimax.ico" },
    { id: "other", label: "其他", logo: "" }
  ];

  function inferEvalModelVendorId(modelId) {
    const id = String(modelId || "").trim().toLowerCase();
    if (id.startsWith("deepseek")) return "deepseek";
    if (id.startsWith("kimi")) return "moonshot";
    if (id.startsWith("glm")) return "zhipu";
    if (id.startsWith("minimax")) return "minimax";
    return "other";
  }

  function getEvalModelVendorGroups() {
    const customIds = window.NOCTUA_CUSTOM_EVAL_MODELS?.getModelIds?.() || [];
    const byVendor = new Map(evalModelVendorDefs.map((vendor) => [vendor.id, []]));

    for (const modelId of evalModelIds) {
      byVendor.get(inferEvalModelVendorId(modelId))?.push(modelId);
    }
    for (const modelId of customIds) {
      if (evalModelIds.includes(modelId)) continue;
      byVendor.get(inferEvalModelVendorId(modelId))?.push(modelId);
    }

    return evalModelVendorDefs
      .map((vendor) => ({
        ...vendor,
        modelIds: sortEvalModelIdsNewestFirst(byVendor.get(vendor.id) || [])
      }))
      .filter((vendor) => vendor.modelIds.length > 0);
  }

  /** @param {boolean} chat @param {boolean} anthropic @param {boolean} [responses] */
  function p(chat, anthropic, responses = false) {
    return {
      chat_completions: chat,
      anthropic_messages: anthropic,
      responses_api: responses
    };
  }

  function modelRows(protocolMap) {
    return sortEvalModelIdsNewestFirst(evalModelIds).map((name) => ({
      name,
      protocols: protocolMap[name] || p(false, false)
    }));
  }

  // Sources (2026-06):
  // - DeepSeek OEM: docs/api/deepseek.md, api-docs.deepseek.com
  // - Moonshot OEM: platform.kimi.ai / api.moonshot.ai/anthropic
  // - Zhipu OEM: docs.bigmodel.cn/cn/guide/develop/claude/introduction
  // - MiniMax OEM: platform.minimax.io/docs (OpenAI + Anthropic endpoints)
  // - Aliyun: help.aliyun.com/zh/model-studio/anthropic-api-messages (anthropic list)
  //   + help.aliyun.com/zh/model-studio/qwen-api-via-openai-responses (responses: Qwen only)
  //   + chat docs for third-party eval models (MiniMax-M3, kimi-k2.7-coder, etc.)
  // - SiliconFlow CN messages: docs.siliconflow.cn/cn/api-reference/chat-completions/messages
  //   (model field references chat model hub)
  // - SiliconFlow COM messages: docs.siliconflow.com OpenAPI enum (eval models not listed)
  // - OpenRouter: openrouter.ai/api/v1/models + responses overview (openrouter.ai/docs/api/reference/responses/overview)
  const oemProtocols = {
    deepseek: {
      "deepseek-v4-flash": p(true, true),
      "deepseek-v4-pro": p(true, true)
    },
    moonshot: {
      "kimi-k2.7-coder": p(true, true),
      "kimi-k2.6": p(true, true)
    },
    zhipu: {
      "glm-5.2": p(true, true),
      "glm-5.1": p(true, true),
      "glm-5": p(true, true)
    },
    minimax: {
      "MiniMax-M3": p(true, true)
    }
  };

  const aliyunProtocols = {
    "deepseek-v4-flash": p(true, true),
    "deepseek-v4-pro": p(true, true),
    "kimi-k2.7-coder": p(true, false),
    "kimi-k2.6": p(true, true),
    "glm-5.2": p(true, true),
    "glm-5.1": p(true, true),
    "glm-5": p(true, true),
    "MiniMax-M3": p(true, false)
  };

  const aliyunPlatformProtocols = p(true, true, true);

  const siliconflowChatProtocols = {
    "deepseek-v4-flash": p(true, false),
    "deepseek-v4-pro": p(true, false),
    "kimi-k2.7-coder": p(true, false),
    "kimi-k2.6": p(true, false),
    "glm-5.2": p(true, false),
    "glm-5.1": p(true, false),
    "glm-5": p(true, false),
    "MiniMax-M3": p(true, false)
  };

  const siliconflowCnProtocols = {
    "deepseek-v4-flash": p(true, true),
    "deepseek-v4-pro": p(true, true),
    "kimi-k2.7-coder": p(true, true),
    "kimi-k2.6": p(true, true),
    "glm-5.2": p(true, true),
    "glm-5.1": p(true, true),
    "glm-5": p(true, true),
    "MiniMax-M3": p(true, true)
  };

  const openrouterProtocols = {
    "deepseek-v4-flash": p(true, true, true),
    "deepseek-v4-pro": p(true, true, true),
    "kimi-k2.7-coder": p(false, false, false),
    "kimi-k2.6": p(true, true, true),
    "glm-5.2": p(true, true, true),
    "glm-5.1": p(true, true, true),
    "glm-5": p(true, true, true),
    "MiniMax-M3": p(true, true, true)
  };

  // Sources: streamlake.com/document/WANQING/mdptas54hptu5uvllco (model releases)
  const streamlakeProtocols = {
    "deepseek-v4-flash": p(true, true, true),
    "deepseek-v4-pro": p(true, true, true),
    "kimi-k2.7-coder": p(false, false, false),
    "kimi-k2.6": p(true, true, true),
    "glm-5.2": p(true, true, true),
    "glm-5.1": p(true, true, true),
    "glm-5": p(true, true, true),
    "MiniMax-M3": p(false, false, false)
  };

  const oemPlatformProtocols = p(true, true, false);

  const siliconflowCnPlatformProtocols = p(true, true, false);
  const siliconflowComPlatformProtocols = p(true, true, false);
  const openrouterPlatformProtocols = p(true, true, true);
  const streamlakePlatformProtocols = p(true, true, true);

  const oemPlatformsBase = [
    {
      id: "deepseek",
      name: "DeepSeek 开放平台",
      logo: "design-system/assets/logos/deepseek.ico",
      channel_id: "deepseek",
      platformProtocols: oemPlatformProtocols,
      models: modelRows(oemProtocols.deepseek)
    },
    {
      id: "moonshot",
      name: "Moonshot 开放平台",
      logo: "design-system/assets/logos/moonshot.ico",
      channel_id: "moonshot",
      platformProtocols: oemPlatformProtocols,
      models: modelRows(oemProtocols.moonshot)
    },
    {
      id: "zhipu",
      name: "智谱开放平台",
      logo: "design-system/assets/logos/zhipu.svg",
      channel_id: "zhipu",
      platformProtocols: oemPlatformProtocols,
      models: modelRows(oemProtocols.zhipu)
    },
    {
      id: "minimax",
      name: "MiniMax 开放平台",
      logo: "design-system/assets/logos/minimax.ico",
      channel_id: "minimax",
      platformProtocols: oemPlatformProtocols,
      models: modelRows(oemProtocols.minimax)
    }
  ];

  const deployPlatformsBase = [
    {
      id: "aliyun-cn",
      name: "阿里云百炼（中国-华北 2）",
      logo: "design-system/assets/logos/aliyun.svg",
      focus: true,
      channel_id: "aliyun",
      platformProtocols: aliyunPlatformProtocols,
      protocolScopeNote:
        "平台已接入 OpenAI Responses API（POST /compatible-mode/v1/responses）；官方支持模型为千问系列，下表 7 个测评模型请使用 Chat Completions 或 Anthropic Messages。",
      models: modelRows(aliyunProtocols)
    },
    {
      id: "aliyun-us",
      name: "阿里云百炼（美国-弗吉尼亚）",
      logo: "design-system/assets/logos/aliyun.svg",
      focus: true,
      channel_id: "aliyun",
      platformProtocols: aliyunPlatformProtocols,
      protocolScopeNote:
        "平台已接入 OpenAI Responses API（POST /compatible-mode/v1/responses）；官方支持模型为千问系列，下表 7 个测评模型请使用 Chat Completions 或 Anthropic Messages。",
      models: modelRows(aliyunProtocols)
    },
    {
      id: "siliconflow-cn",
      name: "SiliconFlow CN",
      logo: "design-system/assets/logos/siliconflow-mark.svg",
      focus: true,
      channel_id: "siliconflow",
      platformProtocols: siliconflowCnPlatformProtocols,
      models: modelRows(siliconflowCnProtocols)
    },
    {
      id: "siliconflow-com",
      name: "SiliconFlow COM",
      logo: "design-system/assets/logos/siliconflow-mark.svg",
      focus: true,
      channel_id: "siliconflow",
      platformProtocols: siliconflowComPlatformProtocols,
      models: modelRows(siliconflowChatProtocols)
    },
    {
      id: "streamlake-cn",
      name: "快手万擎（StreamLake）",
      logo: "design-system/assets/logos/streamlake.png",
      focus: true,
      channel_id: "streamlake",
      platformProtocols: streamlakePlatformProtocols,
      protocolScopeNote:
        "平台已接入 OpenAI Chat Completions、Anthropic Messages 与 OpenAI Responses API；API 请求中 model 为控制台推理点 ID（ep-xxx），下表按模型发布公告标注测评模型上架情况。",
      models: modelRows(streamlakeProtocols)
    }
  ];

  const routePlatformsBase = [
    {
      id: "openrouter",
      name: "OpenRouter",
      logo: "design-system/assets/logos/openrouter.svg",
      focus: true,
      channel_id: "openrouter",
      platformProtocols: openrouterPlatformProtocols,
      protocolScopeNote:
        "平台已接入 OpenAI Responses API（POST /api/v1/responses，Beta）；下表按 OpenRouter 模型上架情况标注各协议可用性。",
      models: modelRows(openrouterProtocols)
    },
    {
      id: "sf-router-cn",
      name: "SF Silinex CN",
      logo: "design-system/assets/logos/siliconflow-mark.svg",
      focus: true,
      channel_id: "silinex_china",
      platformProtocols: siliconflowCnPlatformProtocols,
      models: modelRows(siliconflowCnProtocols)
    },
    {
      id: "sf-router-com",
      name: "SF Silinex COM",
      logo: "design-system/assets/logos/siliconflow-mark.svg",
      focus: true,
      channel_id: "silinex_overseas",
      platformProtocols: siliconflowComPlatformProtocols,
      models: modelRows(siliconflowChatProtocols)
    }
  ];

  function allEvalModelIds() {
    const custom = window.NOCTUA_CUSTOM_EVAL_MODELS?.getModelIds?.() || [];
    return sortEvalModelIdsNewestFirst([...evalModelIds, ...custom.filter((id) => !evalModelIds.includes(id))]);
  }

  function augmentPlatforms(platforms) {
    return window.NOCTUA_CUSTOM_EVAL_MODELS?.augmentPlatformModels?.(platforms, p) || platforms;
  }

  return {
    protocolColumns,
    evalModelIds,
    getEvalModelIds: allEvalModelIds,
    evalModelVendorDefs,
    inferEvalModelVendorId,
    getEvalModelVendorGroups,
    scopeNote: "当前测评模型范围：DeepSeek、GLM、KIMI、MiniMax。",
    tabCopy: {
      oem: "模型原厂开放平台：渠道名称旁标签为平台已接入的协议；展开后可查看各模型对协议的覆盖情况。",
      deploy: "第三方托管平台：标签表示渠道级协议接入；展开表格为各测评模型在该渠道的协议支持矩阵。",
      route: "路由转发平台：标签表示渠道级协议接入；展开表格为各测评模型在该渠道的协议支持矩阵。"
    },
    get oemPlatforms() {
      return augmentPlatforms(oemPlatformsBase);
    },
    get deployPlatforms() {
      return augmentPlatforms(deployPlatformsBase);
    },
    get routePlatforms() {
      return augmentPlatforms(routePlatformsBase);
    }
  };
})();
