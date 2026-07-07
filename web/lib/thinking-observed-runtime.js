/**
 * Runtime API for web/data/thinking-observed.json
 */
(function initThinkingObservedRuntime(global) {
  function createApi(data = {}) {
    const channels = data.channels || {};

    function getEntry(channelId, protocolId, parameter) {
      if (!channelId || !parameter) return null;
      const protocol = protocolId || "chat_completions";
      return channels[channelId]?.[protocol]?.[parameter] || null;
    }

    function getEffectiveness(channelId, protocolId, parameter) {
      return getEntry(channelId, protocolId, parameter)?.thinking_effectiveness || null;
    }

    function getEffortProfile(channelId, protocolId, parameter) {
      return getEntry(channelId, protocolId, parameter)?.effort_profile || null;
    }

    function getSwitchEquivalence(channelId, protocolId) {
      if (!channelId) return null;
      const protocol = protocolId || "chat_completions";
      return channels[channelId]?.[protocol]?.switch_equivalence || null;
    }

    function isDocumented(channelId, protocolId, parameter) {
      const entry = getEntry(channelId, protocolId, parameter);
      if (!entry) return null;
      return Boolean(entry.documented);
    }

    return {
      data,
      generatedAt: data.generatedAt || null,
      channels,
      getEntry,
      getEffectiveness,
      getEffortProfile,
      getSwitchEquivalence,
      isDocumented
    };
  }

  global.NOCTUA_THINKING_OBSERVED_RUNTIME = { createApi };
})(typeof window !== "undefined" ? window : globalThis);
