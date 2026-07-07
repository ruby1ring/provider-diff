/**
 * Runtime API for web/data/model-limits-observed.json
 *
 * Measured per-channel model limits (输入 / 输出 / 输出生效 / 上下文 / 思考预算),
 * produced by scripts/build-model-limits-observed.mjs from capacity-probe reports.
 */
(function initModelLimitsObservedRuntime(global) {
  function normModel(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  }

  function lastSegment(value) {
    const parts = String(value || "").split("/");
    return normModel(parts[parts.length - 1]);
  }

  function createApi(data = {}) {
    const channels = data.channels || {};

    function getEntry(channelId, model) {
      if (!channelId || !model) return null;
      return channels[channelId]?.[model] || null;
    }

    // Loose match: a stored model matches the query when normalized ids overlap
    // or share the same last path segment (handles "Pro/org/Model" vs "model").
    function entriesForModel(query) {
      const want = normModel(query);
      const wantSeg = lastSegment(query);
      if (!want) return [];
      const out = [];
      for (const [channelId, models] of Object.entries(channels)) {
        for (const [model, entry] of Object.entries(models)) {
          const have = normModel(model);
          const haveSeg = lastSegment(model);
          const match = have === want
            || have.includes(want)
            || want.includes(have)
            || (wantSeg && haveSeg && wantSeg === haveSeg);
          if (match) out.push({ channelId, model, ...entry });
        }
      }
      return out;
    }

    return {
      data,
      generatedAt: data.generatedAt || null,
      channels,
      getEntry,
      entriesForModel
    };
  }

  global.NOCTUA_MODEL_LIMITS_OBSERVED_RUNTIME = { createApi };
})(typeof window !== "undefined" ? window : globalThis);
