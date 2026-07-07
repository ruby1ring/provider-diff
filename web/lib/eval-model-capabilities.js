/**
 * Eval model capability probes (OpenRouter metadata + catalog fallback).
 */
(function initEvalModelCapabilities(global) {
  function catalogFallback(modelId) {
    const catalog = global.NOCTUA_CHANNEL_CATALOG;
    const fallback = catalog?.evalModelToolCapableFallback?.[modelId];
    if (fallback != null) return fallback;
    const custom = global.NOCTUA_CUSTOM_EVAL_MODELS?.load?.()?.find((item) => item.id === modelId);
    if (custom?.supportsTools != null) return Boolean(custom.supportsTools);
    return null;
  }

  async function evalModelSupportsTools(modelId) {
    const trimmed = String(modelId || "").trim();
    if (!trimmed) {
      return { supported: false, source: "empty" };
    }
    const detailApi = global.NOCTUA_OPENROUTER_MODEL_DETAIL;
    if (detailApi?.resolveModel) {
      try {
        const model = await detailApi.resolveModel({ query: trimmed });
        if (Array.isArray(model?.supported_parameters)) {
          const supported = model.supported_parameters.includes("tools");
          return { supported, source: "openrouter", modelId: model.id || null };
        }
      } catch {
        // fall through to catalog fallback
      }
    }
    const fallback = catalogFallback(trimmed);
    if (fallback != null) {
      return { supported: fallback, source: "catalog" };
    }
    return { supported: false, source: "unknown" };
  }

  global.NOCTUA_EVAL_MODEL_CAPABILITIES = {
    evalModelSupportsTools
  };
})(typeof window !== "undefined" ? window : globalThis);
