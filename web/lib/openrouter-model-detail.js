window.NOCTUA_OPENROUTER_MODEL_DETAIL = (() => {
  const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models";
  const CACHE_TTL_MS = 10 * 60 * 1000;

  let modelCache = null;
  let modelCacheAt = 0;

  function normalizeModelName(value) {
    return window.NOCTUA_MODEL_LOOKUP?.normalizeModelName?.(value)
      || String(value || "").trim().toLowerCase();
  }

  function compactModelName(value) {
    return normalizeModelName(value).replace(/[.\-_/]/g, "");
  }

  async function fetchAllModels({ force = false } = {}) {
    const now = Date.now();
    if (!force && modelCache && now - modelCacheAt < CACHE_TTL_MS) {
      return modelCache;
    }
    const response = await fetch(OPENROUTER_MODELS_URL);
    if (!response.ok) {
      throw new Error(`OpenRouter models ${response.status}`);
    }
    const payload = await response.json();
    modelCache = Array.isArray(payload?.data) ? payload.data : [];
    modelCacheAt = now;
    return modelCache;
  }

  function scoreCandidate(queryNorm, queryCompact, candidate) {
    const norm = normalizeModelName(candidate);
    const compact = compactModelName(candidate);
    if (!queryNorm || !norm) return 0;
    if (norm === queryNorm || compact === queryCompact) return 100;
    if (norm.includes(queryNorm) || queryNorm.includes(norm)) return 70;
    if (compact.includes(queryCompact) || queryCompact.includes(compact)) return 60;
    return 0;
  }

  function pickBestModel(models, { query, hintId }) {
    if (!models?.length) return null;
    if (hintId) {
      const hinted = models.find((model) => model.id === hintId);
      if (hinted) return hinted;
    }
    const queryNorm = normalizeModelName(query);
    const queryCompact = compactModelName(query);
    let best = null;
    let bestScore = 0;
    for (const model of models) {
      const candidates = [
        model.id,
        model.canonical_slug,
        model.name,
        model.hugging_face_id
      ].filter(Boolean);
      for (const candidate of candidates) {
        const score = scoreCandidate(queryNorm, queryCompact, candidate);
        if (score > bestScore) {
          bestScore = score;
          best = model;
        }
      }
    }
    return bestScore >= 60 ? best : null;
  }

  async function searchModels(query) {
    const trimmed = String(query || "").trim();
    if (!trimmed) return [];
    const response = await fetch(`${OPENROUTER_MODELS_URL}?q=${encodeURIComponent(trimmed)}`);
    if (!response.ok) return [];
    const payload = await response.json();
    return Array.isArray(payload?.data) ? payload.data : [];
  }

  async function resolveModel({ query, hintId } = {}) {
    const models = await fetchAllModels();
    let model = pickBestModel(models, { query, hintId });
    if (!model) {
      const searched = await searchModels(query);
      model = pickBestModel(searched, { query, hintId });
    }
    return model;
  }

  function formatPricePerMillion(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    return `$${(n * 1_000_000).toFixed(4)} / M tokens`;
  }

  function formatContext(length) {
    const n = Number(length);
    if (!Number.isFinite(n) || n <= 0) return null;
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2).replace(/\.00$/, "")}M tokens`;
    if (n >= 1000) return `${Math.round(n / 1000)}K tokens`;
    return `${n} tokens`;
  }

  function formatEpochDate(epoch) {
    const n = Number(epoch);
    if (!Number.isFinite(n) || n <= 0) return null;
    return new Date(n * 1000).toISOString().slice(0, 10);
  }

  function openRouterModelPage(model) {
    const slug = model?.canonical_slug || model?.id;
    return slug ? `https://openrouter.ai/${slug}` : "https://openrouter.ai/models";
  }

  return {
    fetchAllModels,
    resolveModel,
    formatPricePerMillion,
    formatContext,
    formatEpochDate,
    openRouterModelPage
  };
})();
