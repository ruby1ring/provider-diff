/**
 * 渠道测评共享：协议定义、路由选项、连接配置（无 DOM 依赖）。
 */
/* global PROTOCOL_CATALOG_DEFS */
window.NOCTUA_CHANNEL_ROUTE_CORE = (() => {
  const SUPPORTED_PROTOCOLS = new Set(["chat_completions", "anthropic_messages"]);

  const CONFIG_PLATFORM_ALIASES = {
    deepseek: ["deepseek"],
    moonshot: ["moonshot"],
    zhipu: ["zhipu"],
    minimax: ["minimax"],
    "aliyun-cn": ["aliyun-cn", "aliyun", "ali"],
    "aliyun-us": ["aliyun-us", "aliyun", "ali"],
    "aliyun-sg": ["aliyun-sg", "aliyun", "ali"],
    "siliconflow-cn": ["siliconflow-cn", "sf-router-cn", "siliconflow"],
    "siliconflow-com": ["siliconflow-com", "sf-router-com", "siliconflow"],
    openrouter: ["openrouter"],
    "sf-router-cn": ["sf-router-cn", "siliconflow-cn", "siliconflow"],
    "sf-router-com": ["sf-router-com", "siliconflow-com", "siliconflow"],
    "streamlake-cn": ["streamlake-cn", "streamlake"],
    "baidu-qifan": ["baidu-qifan", "baidu"]
  };

  function protocolCatalogDefs() {
    return typeof PROTOCOL_CATALOG_DEFS !== "undefined" ? PROTOCOL_CATALOG_DEFS : [];
  }

  function protocolDef(protocolId) {
    return protocolCatalogDefs().find((def) => def.id === protocolId) || null;
  }

  function supportedProtocol(protocolId) {
    return SUPPORTED_PROTOCOLS.has(protocolId);
  }

  function protocolIsRunnable(def) {
    return Boolean(def) && def.evalStatus !== "planned" && supportedProtocol(def.id);
  }

  function listModelRouteOptions(modelId) {
    const lookupApi = window.NOCTUA_MODEL_LOOKUP;
    return lookupApi?.listModelRouteOptions?.(modelId) || [];
  }

  function listProtocolOptions(modelId) {
    const options = listModelRouteOptions(modelId);
    const seen = new Set();
    const result = [];
    for (const option of options) {
      if (!supportedProtocol(option.protocolId) || !option.runnable) continue;
      if (seen.has(option.protocolId)) continue;
      seen.add(option.protocolId);
      const def = protocolDef(option.protocolId);
      if (def && protocolIsRunnable(def)) result.push(def);
    }
    return result;
  }

  function listProtocolPickerItems(modelId) {
    const runnable = listProtocolOptions(modelId);
    const runnableIds = new Set(runnable.map((def) => def.id));
    const planned = protocolCatalogDefs().filter(
      (def) => def.evalStatus === "planned" && !runnableIds.has(def.id)
    );
    return [...runnable, ...planned];
  }

  function channelsForProtocol(routeOptions, protocolId) {
    if (!protocolId || !supportedProtocol(protocolId)) return [];
    return (routeOptions || []).filter((item) => (
      supportedProtocol(item.protocolId)
      && item.protocolId === protocolId
      && item.runnable !== false
    ));
  }

  function routeByKey(routeOptions, routeKey) {
    return (routeOptions || []).find((item) => item.key === routeKey) || null;
  }

  function targetCandidateOptions(routeOptions, baseline) {
    if (!baseline) return [];
    return (routeOptions || []).filter((item) => (
      item.protocolId === baseline.protocolId
      && item.key !== baseline.key
    ));
  }

  function routeOptionLabel(option) {
    return `${option.platformName} · ${option.categoryLabel}`;
  }

  function resolveLocalProvider(platformId, localProviders = {}) {
    const aliasKeys = CONFIG_PLATFORM_ALIASES[platformId] || [platformId];
    for (const key of aliasKeys) {
      const entry = localProviders[key];
      if (entry?.api_key_hint) return entry;
    }
    return null;
  }

  function ensureChannelConfig(bucket, routeKey, route, localProviders = {}) {
    if (!routeKey) return { baseUrl: "", apiKey: "", apiKeyHint: "", useLocalKey: false };
    if (!bucket.channelConfigs) bucket.channelConfigs = {};
    if (!bucket.channelConfigs[routeKey]) {
      const local = route ? resolveLocalProvider(route.platformId, localProviders) : null;
      const useLocalKey = Boolean(local?.api_key_hint);
      bucket.channelConfigs[routeKey] = {
        baseUrl: local?.base_url || route?.endpointUrl || "",
        apiKey: "",
        apiKeyHint: local?.api_key_hint || "",
        useLocalKey
      };
    }
    return bucket.channelConfigs[routeKey];
  }

  function channelApiKeyValue(config) {
    if (!config) return "";
    return config.useLocalKey ? (config.apiKeyHint || "") : (config.apiKey || "");
  }

  function channelHasApiKey(config) {
    if (!config) return false;
    return config.useLocalKey ? Boolean(config.apiKeyHint?.trim()) : Boolean(config.apiKey?.trim());
  }

  function benchmarkEndpointForProtocol(protocolId) {
    if (protocolId === "anthropic_messages") {
      return { backend: "openai-chat", endpoint: "/messages" };
    }
    return { backend: "openai-chat", endpoint: "/v1/chat/completions" };
  }

  function channelRouteDescriptors(baseline, targets = []) {
    const channels = [];
    if (baseline) {
      channels.push({
        key: baseline.key,
        platformName: baseline.platformName,
        protocolLabel: baseline.protocolLabel,
        apiModelId: baseline.apiModelId,
        role: "baseline"
      });
    }
    for (const route of targets) {
      channels.push({
        key: route.key,
        platformName: route.platformName,
        protocolLabel: route.protocolLabel,
        apiModelId: route.apiModelId,
        role: "target"
      });
    }
    return channels;
  }

  function ensureModelId(bucket, modelId) {
    const lookupApi = window.NOCTUA_MODEL_LOOKUP;
    const evalIds = lookupApi?.getEvalModelIds?.() || [];
    if (!bucket.modelId || !evalIds.includes(bucket.modelId)) {
      bucket.modelId = modelId || evalIds[0] || "";
    }
    return bucket.modelId;
  }

  function activeProtocolId(bucket) {
    const protocolId = bucket.protocolId;
    if (!protocolId || !supportedProtocol(protocolId)) return "";
    return protocolId;
  }

  function refreshRouteOptions(bucket) {
    const modelId = ensureModelId(bucket);
    bucket.routeOptions = listModelRouteOptions(modelId);
    return bucket.routeOptions;
  }

  function targetRoutes(bucket) {
    return [...(bucket.targetRouteKeys || new Set())]
      .map((key) => routeByKey(bucket.routeOptions, key))
      .filter(Boolean);
  }

  return {
    CONFIG_PLATFORM_ALIASES,
    SUPPORTED_PROTOCOLS,
    protocolCatalogDefs,
    protocolDef,
    supportedProtocol,
    protocolIsRunnable,
    listModelRouteOptions,
    listProtocolOptions,
    listProtocolPickerItems,
    channelsForProtocol,
    routeByKey,
    targetCandidateOptions,
    routeOptionLabel,
    resolveLocalProvider,
    ensureChannelConfig,
    channelApiKeyValue,
    channelHasApiKey,
    benchmarkEndpointForProtocol,
    channelRouteDescriptors,
    ensureModelId,
    activeProtocolId,
    refreshRouteOptions,
    targetRoutes
  };
})();
