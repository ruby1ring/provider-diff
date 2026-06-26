/**
 * Runtime API for error-code-catalog.json
 */
window.NOCTUA_ERROR_CODE_CATALOG_RUNTIME = (() => {
  function createApi(data) {
    function getDocStatusMeta(statusKey) {
      const meta = data.docStatus?.[statusKey] || data.docStatus?.missing;
      return {
        docStatus: statusKey,
        docStatusLabel: meta?.label || "待补充",
        docStatusClass: meta?.className || "protocol-doc-badge--missing"
      };
    }

    return {
      DOC_STATUS: data.docStatus,
      canonicalShape: data.canonicalShape,
      scenarios: data.scenarios,
      channels: data.channels,
      channelOrder: data.channelOrder,

      getDocStatusMeta,

      getChannelList() {
        return (data.channelOrder || []).map((id) => data.channels[id]).filter(Boolean);
      },

      getScenarioList() {
        return data.scenarios || [];
      },

      getMapping(channelId, scenarioId) {
        const channel = data.channels?.[channelId];
        if (!channel) return null;
        const mapping = channel.mappings?.[scenarioId];
        if (!mapping) return null;
        const scenario = (data.scenarios || []).find((item) => item.id === scenarioId);
        return { channel, scenario, mapping };
      },

      buildOpenAiError(channelId, scenarioId) {
        const channel = data.channels?.[channelId];
        if (!channel) return null;
        const mapping = channel.mappings?.[scenarioId];
        if (!mapping) return null;
        const scenario = (data.scenarios || []).find((item) => item.id === scenarioId);
        if (!scenario) return null;
        return {
          error: {
            message: mapping.nativeMessage || scenario.openai.message,
            type: scenario.openai.type,
            code: scenario.openai.code,
            param: mapping.param || null
          }
        };
      }
    };
  }

  return { createApi };
})();
