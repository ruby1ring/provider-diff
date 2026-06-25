window.NOCTUA_MODEL_LOOKUP = (() => {
  const catalog = () => window.NOCTUA_CHANNEL_CATALOG || {};
  const channels = () => window.LLM_ROSETTA_DATA?.CHANNEL_TEMPLATES || [];

  function channelDocs(channelId) {
    const ch = channels().find((item) => item.channel_id === channelId);
    return {
      api_docs_url: ch?.api_docs_url || ch?.endpoints?.chat_completions?.api_docs_url || "",
      models_docs_url: ch?.models_docs_url || ""
    };
  }

  const platformDocs = {
    deepseek: {
      models_docs_url: "https://api-docs.deepseek.com/",
      api_docs_url: "https://api-docs.deepseek.com/api/create-chat-completion"
    },
    moonshot: {
      models_docs_url: "https://platform.moonshot.cn/docs/pricing/chat",
      api_docs_url: "https://platform.moonshot.cn/docs/api/chat"
    },
    zhipu: {
      models_docs_url: "https://open.bigmodel.cn/dev/api#model-list",
      api_docs_url: "https://open.bigmodel.cn/dev/api#glm-4"
    },
    minimax: {
      models_docs_url: "https://platform.minimax.io/docs/guides/models-intro",
      api_docs_url: "https://platform.minimax.io/docs/api-reference/text-openai-api"
    },
    aliyun: {
      models_docs_url: "https://help.aliyun.com/zh/model-studio/models",
      api_docs_url: "https://help.aliyun.com/zh/model-studio/qwen-api-via-openai-chat-completions"
    },
    siliconflow: {
      models_docs_url: "https://siliconflow.cn/models",
      api_docs_url: "https://docs.siliconflow.cn/en/api-reference/chat-completions/chat-completions"
    },
    openrouter: {
      models_docs_url: "https://openrouter.ai/models",
      api_docs_url: "https://openrouter.ai/docs/api-reference/chat-completion"
    },
    silinex_china: {
      models_docs_url: "",
      api_docs_url: ""
    },
    silinex_overseas: {
      models_docs_url: "",
      api_docs_url: ""
    }
  };

  const aliasOverlay = {
    deepseek: {
      "deepseek-v4-flash": {
        apiModelId: "deepseek-v4-flash",
        aliases: ["DeepSeek-V4-Flash", "deepseek v4 flash", "DeepSeek V4 Flash"]
      },
      "deepseek-v4-pro": {
        apiModelId: "deepseek-v4-pro",
        aliases: ["DeepSeek-V4-Pro", "deepseek v4 pro", "DeepSeek V4 Pro"]
      }
    },
    moonshot: {
      "kimi-k2.7-coder": {
        apiModelId: "kimi-k2.7-coder",
        aliases: ["kimi k2.7 coder", "Kimi-K2.7-Coder", "kimi-k2-7-coder"]
      },
      "kimi-k2.6": {
        apiModelId: "kimi-k2.6",
        aliases: ["kimi k2.6", "Kimi-K2.6", "kimi-k2-6", "kimi-k2"]
      }
    },
    zhipu: {
      "glm-5.1": {
        apiModelId: "glm-5.1",
        aliases: ["GLM-5.1", "glm 5.1", "glm5.1"]
      },
      "glm-5": {
        apiModelId: "glm-5",
        aliases: ["GLM-5", "glm 5", "glm5"]
      }
    },
    minimax: {
      "MiniMax-M3": {
        apiModelId: "MiniMax-M3",
        aliases: ["minimax-m3", "MiniMax M3", "minimax m3", "MiniMax-M3"]
      }
    },
    "aliyun-cn": {
      "deepseek-v4-flash": { apiModelId: "deepseek-v4-flash", aliases: ["DeepSeek-V4-Flash"] },
      "deepseek-v4-pro": { apiModelId: "deepseek-v4-pro", aliases: ["DeepSeek-V4-Pro"] },
      "kimi-k2.7-coder": { apiModelId: "kimi-k2.7-coder", aliases: ["Kimi-K2.7-Coder"] },
      "kimi-k2.6": { apiModelId: "kimi-k2.6", aliases: ["Kimi-K2.6"] },
      "glm-5.1": { apiModelId: "glm-5.1", aliases: ["GLM-5.1"] },
      "glm-5": { apiModelId: "glm-5", aliases: ["GLM-5"] },
      "MiniMax-M3": { apiModelId: "MiniMax-M3", aliases: ["minimax-m3"] }
    },
    "aliyun-us": {
      "deepseek-v4-flash": { apiModelId: "deepseek-v4-flash", aliases: ["DeepSeek-V4-Flash"] },
      "deepseek-v4-pro": { apiModelId: "deepseek-v4-pro", aliases: ["DeepSeek-V4-Pro"] },
      "kimi-k2.7-coder": { apiModelId: "kimi-k2.7-coder", aliases: ["Kimi-K2.7-Coder"] },
      "kimi-k2.6": { apiModelId: "kimi-k2.6", aliases: ["Kimi-K2.6"] },
      "glm-5.1": { apiModelId: "glm-5.1", aliases: ["GLM-5.1"] },
      "glm-5": { apiModelId: "glm-5", aliases: ["GLM-5"] },
      "MiniMax-M3": { apiModelId: "MiniMax-M3", aliases: ["minimax-m3"] }
    },
    "siliconflow-cn": {
      "deepseek-v4-flash": {
        apiModelId: "deepseek-ai/DeepSeek-V4-Flash",
        aliases: ["Pro/deepseek-ai/DeepSeek-V4-Flash", "DeepSeek-V4-Flash", "deepseek v4 flash"]
      },
      "deepseek-v4-pro": {
        apiModelId: "deepseek-ai/DeepSeek-V4-Pro",
        aliases: ["Pro/deepseek-ai/DeepSeek-V4-Pro", "DeepSeek-V4-Pro"]
      },
      "kimi-k2.7-coder": {
        apiModelId: "moonshotai/Kimi-K2.7-Coder",
        aliases: ["Pro/moonshotai/Kimi-K2.7-Coder", "Kimi-K2.7-Coder", "kimi k2.7 coder"]
      },
      "kimi-k2.6": {
        apiModelId: "moonshotai/Kimi-K2.6",
        aliases: ["Pro/moonshotai/Kimi-K2.6", "moonshotai/Kimi-K2", "Kimi-K2.6"]
      },
      "glm-5.1": {
        apiModelId: "Pro/zai-org/GLM-5.1",
        aliases: ["zai-org/GLM-5.1", "GLM-5.1", "glm 5.1"]
      },
      "glm-5": {
        apiModelId: "Pro/zai-org/GLM-5",
        aliases: ["zai-org/GLM-5", "GLM-5", "glm 5"]
      },
      "MiniMax-M3": {
        apiModelId: "MiniMaxAI/MiniMax-M3",
        aliases: ["minimaxai/MiniMax-M3", "MiniMax-M3", "minimax m3"]
      }
    },
    "siliconflow-com": {
      "deepseek-v4-flash": {
        apiModelId: "deepseek-ai/DeepSeek-V4-Flash",
        aliases: ["Pro/deepseek-ai/DeepSeek-V4-Flash", "DeepSeek-V4-Flash"]
      },
      "deepseek-v4-pro": {
        apiModelId: "deepseek-ai/DeepSeek-V4-Pro",
        aliases: ["Pro/deepseek-ai/DeepSeek-V4-Pro", "DeepSeek-V4-Pro"]
      },
      "kimi-k2.7-coder": {
        apiModelId: "moonshotai/Kimi-K2.7-Coder",
        aliases: ["Pro/moonshotai/Kimi-K2.7-Coder", "Kimi-K2.7-Coder"]
      },
      "kimi-k2.6": {
        apiModelId: "moonshotai/Kimi-K2.6",
        aliases: ["moonshotai/Kimi-K2", "Kimi-K2.6"]
      },
      "glm-5.1": {
        apiModelId: "Pro/zai-org/GLM-5.1",
        aliases: ["zai-org/GLM-5.1", "GLM-5.1"]
      },
      "glm-5": {
        apiModelId: "Pro/zai-org/GLM-5",
        aliases: ["zai-org/GLM-5", "GLM-5"]
      },
      "MiniMax-M3": {
        apiModelId: "MiniMaxAI/MiniMax-M3",
        aliases: ["minimaxai/MiniMax-M3", "MiniMax-M3"]
      }
    },
    openrouter: {
      "deepseek-v4-flash": {
        apiModelId: "deepseek/deepseek-v4-flash",
        aliases: ["deepseek/deepseek-v4-flash", "DeepSeek V4 Flash"]
      },
      "deepseek-v4-pro": {
        apiModelId: "deepseek/deepseek-v4-pro",
        aliases: ["deepseek/deepseek-v4-pro"]
      },
      "kimi-k2.7-coder": {
        apiModelId: "moonshotai/kimi-k2.7-coder",
        aliases: ["moonshotai/kimi-k2.7-coder", "Kimi K2.7 Coder"]
      },
      "kimi-k2.6": {
        apiModelId: "moonshotai/kimi-k2.6",
        aliases: ["moonshotai/kimi-k2.6", "moonshotai/kimi-k2"]
      },
      "glm-5.1": {
        apiModelId: "z-ai/glm-5.1",
        aliases: ["zhipu/glm-5.1", "glm-5.1"]
      },
      "glm-5": {
        apiModelId: "z-ai/glm-5",
        aliases: ["zhipu/glm-5", "glm-5"]
      },
      "MiniMax-M3": {
        apiModelId: "minimax/minimax-m3",
        aliases: ["minimax/MiniMax-M3", "MiniMax-M3"]
      }
    },
    "sf-router-cn": {
      "deepseek-v4-flash": {
        apiModelId: "deepseek-ai/DeepSeek-V4-Flash",
        aliases: ["Pro/deepseek-ai/DeepSeek-V4-Flash"]
      },
      "deepseek-v4-pro": {
        apiModelId: "deepseek-ai/DeepSeek-V4-Pro",
        aliases: ["Pro/deepseek-ai/DeepSeek-V4-Pro"]
      },
      "kimi-k2.7-coder": {
        apiModelId: "moonshotai/Kimi-K2.7-Coder",
        aliases: ["Pro/moonshotai/Kimi-K2.7-Coder"]
      },
      "kimi-k2.6": {
        apiModelId: "moonshotai/Kimi-K2.6",
        aliases: ["moonshotai/Kimi-K2"]
      },
      "glm-5.1": {
        apiModelId: "Pro/zai-org/GLM-5.1",
        aliases: ["zai-org/GLM-5.1"]
      },
      "glm-5": {
        apiModelId: "Pro/zai-org/GLM-5",
        aliases: ["zai-org/GLM-5"]
      },
      "MiniMax-M3": {
        apiModelId: "MiniMaxAI/MiniMax-M3",
        aliases: ["minimaxai/MiniMax-M3"]
      }
    },
    "sf-router-com": {
      "deepseek-v4-flash": {
        apiModelId: "deepseek-ai/DeepSeek-V4-Flash",
        aliases: ["Pro/deepseek-ai/DeepSeek-V4-Flash"]
      },
      "deepseek-v4-pro": {
        apiModelId: "deepseek-ai/DeepSeek-V4-Pro",
        aliases: ["Pro/deepseek-ai/DeepSeek-V4-Pro"]
      },
      "kimi-k2.7-coder": {
        apiModelId: "moonshotai/Kimi-K2.7-Coder",
        aliases: ["Pro/moonshotai/Kimi-K2.7-Coder"]
      },
      "kimi-k2.6": {
        apiModelId: "moonshotai/Kimi-K2.6",
        aliases: ["moonshotai/Kimi-K2"]
      },
      "glm-5.1": {
        apiModelId: "Pro/zai-org/GLM-5.1",
        aliases: ["zai-org/GLM-5.1"]
      },
      "glm-5": {
        apiModelId: "Pro/zai-org/GLM-5",
        aliases: ["zai-org/GLM-5"]
      },
      "MiniMax-M3": {
        apiModelId: "MiniMaxAI/MiniMax-M3",
        aliases: ["minimaxai/MiniMax-M3"]
      }
    }
  };

  const categoryLabels = {
    oem: "模型原厂调用（部署）",
    deploy: "其他平台调用（部署）",
    route: "其他平台调用（仅路由）"
  };

  function normalizeModelName(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[\s_]+/g, "-")
      .replace(/[^a-z0-9.\-/]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function compactModelName(value) {
    return normalizeModelName(value).replace(/[.\-/]/g, "");
  }

  function scoreMatch(queryNorm, queryCompact, candidate) {
    const norm = normalizeModelName(candidate);
    const compact = compactModelName(candidate);
    if (!queryNorm || !norm) return 0;
    if (queryNorm === norm || queryCompact === compact) return 100;
    if (norm.endsWith(queryNorm) || queryNorm.endsWith(norm)) return 92;
    if (compact.includes(queryCompact) || queryCompact.includes(compact)) {
      // Guardrail: avoid mapping different numeric versions, e.g. "GLM5.2" -> "glm-5".
      const queryNums = String(queryNorm).match(/\d+(?:\.\d+)*/g) || [];
      const candNums = String(norm).match(/\d+(?:\.\d+)*/g) || [];
      if (queryNums.length && candNums.length && queryNums.join("_") !== candNums.join("_")) return 0;
      const ratio = Math.min(queryCompact.length, compact.length) / Math.max(queryCompact.length, compact.length);
      return ratio >= 0.72 ? 80 + ratio * 15 : 0;
    }
    return 0;
  }

  function resolvePlatformDocs(platform) {
    const channelId = platform.channel_id || platform.id;
    if (channelId === "silinex_china" || channelId === "silinex_overseas") {
      return { api_docs_url: "", models_docs_url: "" };
    }
    const fromChannel = channelDocs(channelId);
    const fromRegistry = platformDocs[channelId] || platformDocs[platform.id] || {};
    return {
      api_docs_url: platform.api_docs_url || fromRegistry.api_docs_url || fromChannel.api_docs_url || "",
      models_docs_url: platform.models_docs_url || fromRegistry.models_docs_url || fromChannel.models_docs_url || ""
    };
  }

  function buildPlatformIndex() {
    const c = catalog();
    const groups = [
      { category: "oem", platforms: c.oemPlatforms || [] },
      { category: "deploy", platforms: c.deployPlatforms || [] },
      { category: "route", platforms: c.routePlatforms || [] }
    ];
    const index = [];

    for (const group of groups) {
      for (const platform of group.platforms) {
        const overlay = {
          ...(aliasOverlay[platform.id] || {}),
          ...(window.NOCTUA_CUSTOM_EVAL_MODELS?.getOverlay?.(platform.id) || {})
        };
        const docs = resolvePlatformDocs(platform);
        const models = {};

        for (const model of platform.models || []) {
          const extra = overlay[model.name] || {};
          models[model.name] = {
            canonical: model.name,
            apiModelId: extra.apiModelId || model.platformModelId || model.name,
            aliases: extra.aliases || model.aliases || [],
            protocols: model.protocols || {},
            source: "catalog"
          };
        }

        for (const [canonical, extra] of Object.entries(overlay)) {
          if (models[canonical]) continue;
          const catalogModel = (platform.models || []).find((item) => item.name === canonical);
          models[canonical] = {
            canonical,
            apiModelId: extra.apiModelId || canonical,
            aliases: extra.aliases || [],
            protocols: catalogModel?.protocols || {},
            source: "overlay"
          };
        }

        for (const customId of window.NOCTUA_CUSTOM_EVAL_MODELS?.getModelIds?.() || []) {
          if (models[customId]) continue;
          const customProtocols = window.NOCTUA_CUSTOM_EVAL_MODELS?.getProtocolForPlatform?.(customId, platform.id);
          const customExtra = overlay[customId];
          if (!customExtra && !customProtocols) continue;
          models[customId] = {
            canonical: customId,
            apiModelId: customExtra?.apiModelId || customId,
            aliases: customExtra?.aliases || [],
            protocols: customProtocols || {},
            source: "custom"
          };
        }

        index.push({
          id: platform.id,
          name: platform.name,
          logo: platform.logo,
          category: group.category,
          categoryLabel: categoryLabels[group.category] || group.category,
          channel_id: platform.channel_id || null,
          platformProtocols: platform.platformProtocols || null,
          protocolScopeNote: platform.protocolScopeNote || "",
          ...docs,
          models
        });
      }
    }

    return index;
  }

  let platformIndex = null;

  function getPlatformIndex() {
    if (!platformIndex) platformIndex = buildPlatformIndex();
    return platformIndex;
  }

  function hasAnyProtocol(protocols) {
    return Boolean(protocols && Object.values(protocols).some(Boolean));
  }

  /** Model row exists on the channel matrix, but only count as a lookup match when actually available. */
  function isActiveChannelMatch(entry) {
    if (!entry) return false;
    if (hasAnyProtocol(entry.protocols)) return true;
    if (entry.liveOnly || entry.liveSource) return true;
    return false;
  }

  function resolveCanonical(query) {
    const queryNorm = normalizeModelName(query);
    const queryCompact = compactModelName(query);
    if (!queryNorm) return { canonical: null, score: 0 };

    const evalIds = catalog().getEvalModelIds?.() || catalog().evalModelIds || [];
    let best = { canonical: null, score: 0 };

    const candidates = new Map();
    for (const id of evalIds) candidates.set(id, [id]);

    for (const platform of getPlatformIndex()) {
      for (const entry of Object.values(platform.models)) {
        const list = candidates.get(entry.canonical) || [entry.canonical];
        list.push(entry.apiModelId, ...entry.aliases);
        candidates.set(entry.canonical, [...new Set(list.filter(Boolean))]);
      }
    }

    for (const [canonical, names] of candidates.entries()) {
      for (const name of names) {
        const score = scoreMatch(queryNorm, queryCompact, name);
        if (score > best.score) best = { canonical, score };
      }
    }

    return best;
  }

  function lookup(query) {
    const trimmed = String(query || "").trim();
    const queryNorm = normalizeModelName(trimmed);
    const queryCompact = compactModelName(trimmed);

    if (!trimmed) {
      return {
        query: trimmed,
        canonical: null,
        confidence: 0,
        matches: [],
        unsupported: []
      };
    }

    const resolved = resolveCanonical(trimmed);
    const canonical = resolved.score >= 72 ? resolved.canonical : null;
    const matches = [];
    const unsupported = [];

    for (const platform of getPlatformIndex()) {
      let entry = null;
      let matchScore = 0;
      let matchedVia = "";

      if (canonical && platform.models[canonical]) {
        entry = platform.models[canonical];
        matchScore = resolved.score;
        matchedVia = "canonical";
      } else {
        for (const model of Object.values(platform.models)) {
          const names = [model.canonical, model.apiModelId, ...model.aliases];
          for (const name of names) {
            const score = scoreMatch(queryNorm, queryCompact, name);
            if (score > matchScore) {
              matchScore = score;
              entry = model;
              matchedVia = name === model.apiModelId ? "apiModelId" : "alias";
            }
          }
        }
      }

      if (entry && matchScore >= 72 && isActiveChannelMatch(entry)) {
        matches.push({
          platformId: platform.id,
          platformName: platform.name,
          platformLogo: platform.logo,
          category: platform.category,
          categoryLabel: platform.categoryLabel,
          channelId: platform.channel_id,
          canonical: entry.canonical,
          apiModelId: entry.apiModelId,
          protocols: entry.protocols,
          platformProtocols: platform.platformProtocols || null,
          protocolScopeNote: platform.protocolScopeNote || "",
          matchScore,
          matchedVia,
          models_docs_url: platform.models_docs_url,
          api_docs_url: platform.api_docs_url
        });
      } else {
        unsupported.push({
          platformId: platform.id,
          platformName: platform.name,
          categoryLabel: platform.categoryLabel
        });
      }
    }

    matches.sort((a, b) => {
      const categoryOrder = { oem: 0, deploy: 1, route: 2 };
      const byCategory = (categoryOrder[a.category] ?? 9) - (categoryOrder[b.category] ?? 9);
      if (byCategory !== 0) return byCategory;
      return b.matchScore - a.matchScore;
    });

    return {
      query: trimmed,
      canonical: canonical || (matches[0]?.canonical ?? null),
      confidence: canonical ? resolved.score : (matches[0]?.matchScore ?? 0),
      matches,
      unsupported
    };
  }

  function refreshIndex() {
    platformIndex = null;
    return getPlatformIndex();
  }

  const PLATFORM_RUNTIME_CHANNEL = {
    deepseek: "deepseek",
    minimax: "minimax",
    openrouter: "openrouter",
    "aliyun-cn": "aliyun",
    "aliyun-us": "aliyun",
    "siliconflow-cn": "siliconflow",
    "siliconflow-com": "siliconflow",
    "sf-router-cn": "silinex_china",
    "sf-router-com": "silinex_overseas",
    moonshot: null,
    zhipu: null
  };

  const PLATFORM_ENDPOINT_OVERRIDES = {
    deepseek: {
      chat_completions: "https://api.deepseek.com",
      anthropic_messages: "https://api.deepseek.com/anthropic/v1"
    },
    moonshot: {
      chat_completions: "https://api.moonshot.cn/v1",
      anthropic_messages: "https://api.moonshot.cn/anthropic/v1"
    },
    zhipu: {
      chat_completions: "https://open.bigmodel.cn/api/paas/v4/",
      anthropic_messages: "https://open.bigmodel.cn/api/anthropic/v1"
    },
    minimax: {
      chat_completions: "https://api.minimaxi.com/v1",
      anthropic_messages: "https://api.minimaxi.com/anthropic/v1"
    },
    "aliyun-cn": {
      chat_completions: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      anthropic_messages: "https://dashscope.aliyuncs.com/apps/anthropic/v1",
      responses_api: "https://dashscope.aliyuncs.com/compatible-mode/v1"
    },
    "aliyun-us": {
      chat_completions: "https://dashscope-us.aliyuncs.com/compatible-mode/v1",
      anthropic_messages: "https://dashscope-us.aliyuncs.com/apps/anthropic/v1",
      responses_api: "https://dashscope-us.aliyuncs.com/compatible-mode/v1"
    },
    "siliconflow-cn": {
      chat_completions: "https://api.siliconflow.cn/v1",
      anthropic_messages: "https://api.siliconflow.cn/v1"
    },
    "siliconflow-com": {
      chat_completions: "https://api.siliconflow.com/v1",
      anthropic_messages: "https://api.siliconflow.com/v1"
    },
    "sf-router-cn": {
      chat_completions: "https://api.sr.silinex.work",
      anthropic_messages: "https://api.sr.silinex.work",
      responses_api: "https://api.sr.silinex.work"
    },
    "sf-router-com": {
      chat_completions: "https://sr-endpoint.horay.ai",
      anthropic_messages: "https://sr-endpoint.horay.ai",
      responses_api: "https://sr-endpoint.horay.ai"
    },
    openrouter: {
      chat_completions: "https://openrouter.ai/api/v1",
      anthropic_messages: "https://openrouter.ai/api/v1",
      responses_api: "https://openrouter.ai/api/v1"
    }
  };

  function channelTemplates() {
    return window.LLM_ROSETTA_DATA?.CHANNEL_TEMPLATES || [];
  }

  function resolveProviderId(runtimeChannelId, protocolId) {
    if (!runtimeChannelId) return null;
    const channel = channelTemplates().find((item) => item.channel_id === runtimeChannelId);
    const endpoint = channel?.endpoints?.[protocolId];
    if (!endpoint || endpoint.supported === false) return null;
    return endpoint.provider_id || channel.provider_id || null;
  }

  function resolvePlatformEndpoint(platformId, channelId, protocolId) {
    if (PLATFORM_ENDPOINT_OVERRIDES[platformId]?.[protocolId]) {
      return PLATFORM_ENDPOINT_OVERRIDES[platformId][protocolId];
    }
    const runtimeChannelId = PLATFORM_RUNTIME_CHANNEL[platformId] || channelId;
    if (!runtimeChannelId) return "";
    const channel = channelTemplates().find((item) => item.channel_id === runtimeChannelId);
    const endpoint = channel?.endpoints?.[protocolId];
    return endpoint?.default_base_url || channel?.default_base_url || "";
  }

  function isRunnableProtocol(protocolId) {
    return protocolId === "chat_completions" || protocolId === "anthropic_messages";
  }

  function listModelRouteOptions(modelId) {
    const result = lookup(modelId);
    const protocolColumns = catalog().protocolColumns || [];
    const options = [];

    for (const match of result.matches) {
      const runtimeChannelId = PLATFORM_RUNTIME_CHANNEL[match.platformId] || match.channelId;
      for (const column of protocolColumns) {
        if (!match.protocols?.[column.id]) continue;
        const providerId = runtimeChannelId ? resolveProviderId(runtimeChannelId, column.id) : null;
        const runnable = isRunnableProtocol(column.id) && Boolean(providerId);
        options.push({
          key: `${match.platformId}:${column.id}`,
          platformId: match.platformId,
          platformName: match.platformName,
          platformLogo: match.platformLogo,
          categoryLabel: match.categoryLabel,
          protocolId: column.id,
          protocolLabel: column.label,
          channelId: match.channelId,
          runtimeChannelId,
          apiModelId: match.apiModelId,
          endpointUrl: resolvePlatformEndpoint(match.platformId, match.channelId, column.id),
          providerId,
          runnable
        });
      }
    }

    return options;
  }

  const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models";
  let clientOpenRouterCache = null;
  let clientOpenRouterFetchedAt = 0;
  const CLIENT_MODEL_LIST_TTL_MS = 10 * 60 * 1000;

  function defaultLiveProtocols(platform) {
    const platformProtocols = platform?.platformProtocols || {};
    return {
      chat_completions: platformProtocols.chat_completions !== false,
      anthropic_messages: false,
      responses_api: false
    };
  }

  function enrichLiveMatch(liveMatch, platformIndex) {
    const platform = platformIndex.find((item) => item.id === liveMatch.platform_id);
    if (!platform) return null;

    let protocols = defaultLiveProtocols(platform);
    let canonical = null;
    for (const entry of Object.values(platform.models || {})) {
      const names = [entry.canonical, entry.apiModelId, ...entry.aliases];
      for (const name of names) {
        if (normalizeModelName(name) === normalizeModelName(liveMatch.api_model_id)) {
          protocols = hasAnyProtocol(entry.protocols) ? entry.protocols : protocols;
          canonical = entry.canonical;
          break;
        }
      }
      if (canonical) break;
    }

    return {
      platformId: platform.id,
      platformName: platform.name,
      platformLogo: platform.logo,
      category: platform.category,
      categoryLabel: platform.categoryLabel,
      channelId: platform.channel_id,
      canonical,
      apiModelId: liveMatch.api_model_id,
      protocols,
      platformProtocols: platform.platformProtocols || null,
      protocolScopeNote: platform.protocolScopeNote || "",
      matchScore: liveMatch.match_score,
      matchedVia: liveMatch.matched_via,
      liveSource: liveMatch.live_source,
      liveOnly: !canonical,
      models_docs_url: platform.models_docs_url,
      api_docs_url: platform.api_docs_url
    };
  }

  function mergeLiveResults(catalogResult, liveResponse) {
    const platformIndex = getPlatformIndex();
    const byPlatform = new Map();

    for (const match of catalogResult.matches || []) {
      byPlatform.set(match.platformId, { ...match, liveOnly: false });
    }

    for (const liveMatch of liveResponse?.matches || []) {
      const enriched = enrichLiveMatch(liveMatch, platformIndex);
      if (!enriched) continue;

      const existing = byPlatform.get(liveMatch.platform_id);
      if (!existing) {
        byPlatform.set(enriched.platformId, enriched);
        continue;
      }

      byPlatform.set(enriched.platformId, {
        ...existing,
        apiModelId: enriched.apiModelId,
        protocols: hasAnyProtocol(existing.protocols) ? existing.protocols : enriched.protocols,
        matchScore: Math.max(existing.matchScore || 0, enriched.matchScore || 0),
        matchedVia: existing.matchedVia || enriched.matchedVia,
        liveSource: enriched.liveSource,
        liveOnly: existing.liveOnly && !existing.canonical && enriched.liveOnly
      });
    }

    const categoryOrder = { oem: 0, deploy: 1, route: 2 };
    const matches = [...byPlatform.values()].sort((a, b) => {
      const byCategory = (categoryOrder[a.category] ?? 9) - (categoryOrder[b.category] ?? 9);
      if (byCategory !== 0) return byCategory;
      return (b.matchScore || 0) - (a.matchScore || 0);
    });

    const matchedPlatformIds = new Set(matches.map((match) => match.platformId));
    const unsupported = platformIndex
      .filter((platform) => !matchedPlatformIds.has(platform.id))
      .map((platform) => ({
        platformId: platform.id,
        platformName: platform.name,
        categoryLabel: platform.categoryLabel || platform.category
      }));

    return {
      ...catalogResult,
      matches,
      unsupported,
      liveSourceStatus: liveResponse?.source_status || null,
      searchedLive: true
    };
  }

  async function fetchOpenRouterModelsClient() {
    const now = Date.now();
    if (clientOpenRouterCache && now - clientOpenRouterFetchedAt < CLIENT_MODEL_LIST_TTL_MS) {
      return clientOpenRouterCache;
    }
    const response = await fetch(OPENROUTER_MODELS_URL);
    if (!response.ok) {
      throw new Error(`OpenRouter models ${response.status}`);
    }
    const payload = await response.json();
    const models = (payload?.data || []).map((item) => ({
      id: item.id,
      displayName: item.name || ""
    })).filter((item) => item.id);
    clientOpenRouterCache = models;
    clientOpenRouterFetchedAt = now;
    return models;
  }

  function matchClientModels(query, models, platformIds, liveSource) {
    const queryNorm = normalizeModelName(query);
    const queryCompact = compactModelName(query);
    const matches = [];

    for (const platformId of platformIds) {
      let best = null;
      for (const model of models) {
        const names = [model.id, model.displayName].filter(Boolean);
        for (const name of names) {
          const score = scoreMatch(queryNorm, queryCompact, name);
          if (!best || score > best.match_score) {
            best = {
              platform_id: platformId,
              api_model_id: model.id,
              display_name: model.displayName,
              match_score: score,
              matched_via: name === model.id ? "apiModelId" : "displayName",
              live_source: liveSource
            };
          }
        }
      }
      if (best && best.match_score >= 72) matches.push(best);
    }
    return matches;
  }

  async function lookupLive(query, apiBase) {
    const trimmed = String(query || "").trim();
    if (!trimmed) {
      return { query: trimmed, matches: [], source_status: {} };
    }

    if (apiBase) {
      try {
        const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
        const timer = controller ? setTimeout(() => controller.abort(), 25000) : null;
        const response = await fetch(
          `${apiBase}/api/channel-model-lookup?q=${encodeURIComponent(trimmed)}`,
          controller ? { signal: controller.signal } : undefined
        );
        if (timer) clearTimeout(timer);
        if (response.ok) {
          return await response.json();
        }
      } catch {
        // Fall through to client-side OpenRouter lookup.
      }
    }

    const models = await fetchOpenRouterModelsClient();
    return {
      query: trimmed,
      matches: matchClientModels(query, models, ["openrouter"], "openrouter"),
      source_status: { openrouter: "ok:client" }
    };
  }

  function needsLiveLookup(query, catalogResult) {
    const trimmed = String(query || "").trim();
    const evalIds = catalog().getEvalModelIds?.() || catalog().evalModelIds || [];
    if (!evalIds.includes(trimmed)) return true;
    return (catalogResult?.matches?.length || 0) === 0;
  }

  return {
    normalizeModelName,
    compactModelName,
    lookup,
    lookupLive,
    mergeLiveResults,
    needsLiveLookup,
    refreshIndex,
    getPlatformIndex,
    getEvalModelIds: () => catalog().getEvalModelIds?.() || catalog().evalModelIds || [],
    listModelRouteOptions,
    resolvePlatformEndpoint,
    resolveProviderId,
    isRunnableProtocol
  };
})();
