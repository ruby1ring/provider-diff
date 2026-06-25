window.NOCTUA_CUSTOM_EVAL_MODELS = (() => {
  const STORAGE_KEY = "noctua.customEvalModels.v1";

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function save(models) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(models));
  }

  function normalizeId(value) {
    return window.NOCTUA_MODEL_LOOKUP?.normalizeModelName?.(value) || String(value || "").trim().toLowerCase();
  }

  function emptyProtocols() {
    return {
      chat_completions: false,
      anthropic_messages: false,
      responses_api: false
    };
  }

  function hasModel(modelId) {
    return load().some((item) => item.id === modelId);
  }

  function registerFromLookup(query, lookupResult) {
    const id = lookupResult?.canonical || normalizeId(query);
    if (!id || !lookupResult?.matches?.length) return null;

    const models = load();
    if (models.some((item) => item.id === id)) return id;

    const aliases = new Set([String(query || "").trim(), id].filter(Boolean));
    const platforms = {};

    for (const match of lookupResult.matches) {
      if (!match?.platformId || !match?.apiModelId) continue;
      platforms[match.platformId] = {
        apiModelId: match.apiModelId,
        protocols: { ...(match.protocols || emptyProtocols()) }
      };
      aliases.add(match.apiModelId);
    }

    models.push({
      id,
      aliases: [...aliases],
      platforms,
      sourceQuery: String(query || "").trim(),
      createdAt: new Date().toISOString()
    });
    save(models);
    return id;
  }

  function mergeFromLookup(queryOrId, lookupResult) {
    const id = lookupResult?.canonical || normalizeId(queryOrId);
    if (!id || !lookupResult?.matches?.length) return null;

    const models = load();
    const idx = models.findIndex((item) => item.id === id);
    if (idx < 0) return null;

    let changed = false;
    const aliases = new Set(models[idx].aliases || []);

    for (const match of lookupResult.matches) {
      if (!match?.platformId || !match?.apiModelId) continue;
      const prev = models[idx].platforms?.[match.platformId];
      const nextProtocols = { ...(match.protocols || emptyProtocols()) };
      const shouldUpdate = !prev
        || prev.apiModelId !== match.apiModelId
        || !Object.values(prev.protocols || {}).some(Boolean);
      if (!shouldUpdate) continue;
      models[idx].platforms = models[idx].platforms || {};
      models[idx].platforms[match.platformId] = {
        apiModelId: match.apiModelId,
        protocols: nextProtocols
      };
      changed = true;
      aliases.add(match.apiModelId);
    }

    if (changed) {
      models[idx].aliases = [...aliases];
      save(models);
    }
    return changed ? id : null;
  }

  function getModelIds() {
    return load().map((item) => item.id);
  }

  function getOverlay(platformId) {
    const overlay = {};
    for (const model of load()) {
      const binding = model.platforms?.[platformId];
      if (!binding) continue;
      overlay[model.id] = {
        apiModelId: binding.apiModelId,
        aliases: [...new Set([...(model.aliases || []), binding.apiModelId].filter(Boolean))]
      };
    }
    return overlay;
  }

  function getProtocolForPlatform(modelId, platformId) {
    const model = load().find((item) => item.id === modelId);
    return model?.platforms?.[platformId]?.protocols || null;
  }

  function augmentPlatformModels(platforms, protocolFactory) {
    const customModels = load();
    if (!customModels.length) return platforms;
    const p = protocolFactory || (() => emptyProtocols());
    const hasProtocols = (protocols) => Object.values(protocols || {}).some(Boolean);
    return platforms.map((platform) => ({
      ...platform,
      models: [
        ...(platform.models || []),
        ...customModels
          .filter((model) => {
            const binding = model.platforms?.[platform.id];
            return binding && hasProtocols(binding.protocols);
          })
          .map((model) => ({
            name: model.id,
            protocols: { ...(model.platforms[platform.id].protocols || p(false, false, false)) }
          }))
      ]
    }));
  }

  return {
    load,
    save,
    hasModel,
    registerFromLookup,
    mergeFromLookup,
    getModelIds,
    getOverlay,
    getProtocolForPlatform,
    augmentPlatformModels,
    normalizeId
  };
})();
