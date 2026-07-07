/**
 * Runtime API for protocol-matrix.json (sources + specs unified).
 */
window.NOCTUA_PROTOCOL_MATRIX_RUNTIME = (() => {
  function formatType(spec) {
    if (!spec?.type) return "—";
    return spec.nullable ? `${spec.type} | null` : spec.type;
  }

  function formatDefault(spec) {
    if (!spec || spec.default === undefined || spec.default === null) return "—";
    return String(spec.default);
  }

  function formatRange(spec) {
    if (!spec?.range) {
      if (spec?.notes && /≤|max|范围/.test(spec.notes)) {
        return spec.notes.includes("≤") ? spec.notes.match(/≤\s*[\d.]+/)?.[0] || "—" : "—";
      }
      return "—";
    }
    const { min, max, minInclusive, maxInclusive } = spec.range;
    const left = minInclusive ? "[" : "(";
    const right = maxInclusive ? "]" : ")";
    const minStr = min !== undefined && min !== null ? min : "—";
    const maxStr = max !== undefined && max !== null ? max : "—";
    if (minStr === "—" && maxStr !== "—") return `≤ ${maxStr}`;
    if (minStr !== "—" && maxStr === "—") return `≥ ${minStr}`;
    return `${left}${minStr}, ${maxStr}${right}`;
  }

  function resolveEnumValues(spec) {
    if (!spec) return null;
    if (Array.isArray(spec.enum) && spec.enum.length) return spec.enum;
    if (spec.type === "boolean") return ["true", "false"];
    return null;
  }

  function formatEnum(spec, parameter) {
    const values = resolveEnumValues(spec);
    if (!values?.length) return "—";
    const joined = values.join("/");
    if (parameter?.includes(".")) {
      const segments = parameter.split(".");
      const leaf = segments.pop();
      const parent = segments.join(".");
      return `{"${parent}": {"${leaf}": "${joined}"}}`;
    }
    return values.join(" · ");
  }

  function formatEffective(spec) {
    if (!spec?.effective || spec.effective === "supported") return "—";
    const labels = {
      ignored: "无效果",
      deprecated: "已废弃",
      "model-dependent": "因模型而异"
    };
    return labels[spec.effective] || spec.effective;
  }

  function formatSpecShort(spec, parameter) {
    if (!spec) return "—";
    const parts = [formatType(spec)];
    const def = formatDefault(spec);
    if (def !== "—") parts.push(`default ${def}`);
    const enumText = formatEnum(spec, parameter);
    if (enumText !== "—") parts.push(enumText);
    const range = formatRange(spec);
    if (range !== "—") parts.push(range);
    const eff = formatEffective(spec);
    if (eff !== "—") parts.push(eff);
    return parts.join(" · ");
  }

  function normalizeEnumKey(spec) {
    const values = resolveEnumValues(spec);
    return values?.length ? values.join("|") : null;
  }

  function normalizeSpec(spec) {
    if (!spec) return null;
    const key = {
      type: spec.type || null,
      nullable: Boolean(spec.nullable),
      default: spec.default !== undefined && spec.default !== null ? spec.default : null,
      range: spec.range
        ? {
            min: spec.range.min ?? null,
            max: spec.range.max ?? null,
            minInclusive: spec.range.minInclusive !== false,
            maxInclusive: spec.range.maxInclusive !== false
          }
        : null,
      effective: spec.effective && spec.effective !== "supported" ? spec.effective : null,
      enum: normalizeEnumKey(spec)
    };
    return JSON.stringify(key);
  }

  function diffFields(specA, specB) {
    if (!specA && !specB) return [];
    if (!specA || !specB) return ["type", "default", "enum", "range", "effective"];
    const fields = [];
    if (formatType(specA) !== formatType(specB)) fields.push("type");
    if (formatDefault(specA) !== formatDefault(specB)) fields.push("default");
    if (normalizeEnumKey(specA) !== normalizeEnumKey(specB)) fields.push("enum");
    if (formatRange(specA) !== formatRange(specB)) fields.push("range");
    if (formatEffective(specA) !== formatEffective(specB)) fields.push("effective");
    return fields;
  }

  function buildSpecConsensus(entries) {
    const documented = entries.filter((item) => item.spec);
    const totalCount = entries.length;
    const documentedCount = documented.length;

    if (!documentedCount) {
      return {
        consensus: null,
        consensusSpec: null,
        groups: [],
        outliers: [],
        documentedCount: 0,
        totalCount,
        consensusCount: 0
      };
    }

    const groupMap = new Map();
    for (const entry of documented) {
      const key = normalizeSpec(entry.spec);
      if (!groupMap.has(key)) {
        groupMap.set(key, { spec: entry.spec, channels: [], count: 0 });
      }
      const group = groupMap.get(key);
      group.channels.push(entry.channelId);
      group.count += 1;
    }

    const groups = [...groupMap.values()].sort((a, b) => b.count - a.count);
    const top = groups[0];
    const hasMajority = top.count >= 2 || (top.count === documentedCount && documentedCount > 0);
    const consensusSpec = hasMajority ? top.spec : null;
    const consensusCount = hasMajority ? top.count : 0;

    const outliers = [];
    if (consensusSpec) {
      for (const entry of documented) {
        const fields = diffFields(consensusSpec, entry.spec);
        if (fields.length) {
          outliers.push({ channelId: entry.channelId, spec: entry.spec, diffFields: fields });
        }
      }
    }

    return {
      consensus: consensusSpec ? formatSpecShort(consensusSpec) : null,
      consensusSpec,
      groups,
      outliers,
      documentedCount,
      totalCount,
      consensusCount
    };
  }

  function isMessageScopedParameter(parameter) {
    const name = String(parameter);
    if (name === "messages") return true;
    return name.startsWith("messages[]") || name.startsWith("messages.");
  }

  function resolveParamDisplayCategory(category, parameter) {
    if (isMessageScopedParameter(parameter)) return "Core";
    if (parameter === "session_id") return "Metadata";
    if (parameter === "logprobs" || parameter === "top_logprobs") return "Debug";
    return category;
  }

  function resolveParamSubgroup(category, parameter) {
    const submatch = /^(Reasoning|Output)\.(\w+)$/i.exec(category || "");
    if (submatch) {
      const base = submatch[1];
      const key = submatch[2].toLowerCase();
      if (base === "Reasoning" && (key === "switch" || key === "intensity" || key === "output")) {
        return { category: "Reasoning", subgroup: key };
      }
      if (base === "Output" && (key === "structure" || key === "modality")) {
        return { category: "Output", subgroup: key };
      }
    }
    const base = String(category || "").split(".")[0];
    const rules = typeof window !== "undefined" ? window.PROVIDERX_RULES : null;
    if (base === "Reasoning") {
      const map = rules?.THINKING_PARAM_SUBGROUPS || {};
      return { category: "Reasoning", subgroup: map[parameter] || "intensity" };
    }
    if (base === "Output") {
      const map = rules?.OUTPUT_PARAM_SUBGROUPS || {};
      return { category: "Output", subgroup: map[parameter] || "structure" };
    }
    return { category, subgroup: null };
  }

  function normalizeFlatParameter(category, parameter, required) {
    const resolved = resolveParamSubgroup(category, parameter);
    const displayCategory = resolveParamDisplayCategory(resolved.category, parameter);
    return {
      category: displayCategory,
      parameter,
      required,
      subgroup: resolved.subgroup
    };
  }

  function createApi(data) {
    const evalChannels = new Set(data.evalChannels || []);

    function resolveEntry(channelId, protocolId) {
      return data.channels?.[channelId]?.[protocolId] || null;
    }

    function getRequiredParameters(channelId, protocolId, entry) {
      if (Array.isArray(entry?.requiredParameters)) return entry.requiredParameters;
      const overrideKey = `${channelId}::${protocolId}`;
      if (data.protocolRequiredOverrides?.[overrideKey]) {
        return data.protocolRequiredOverrides[overrideKey];
      }
      return data.protocolDefaultRequired?.[protocolId] || [];
    }

    return {
      DOC_STATUS: data.docStatus,
      PROTOCOL_DEFAULT_REQUIRED: data.protocolDefaultRequired,
      PROTOCOL_EVAL_CHANNELS: evalChannels,
      channels: data.channels,
      OPENAI_BASELINE: data.openAiBaseline,

      getChannelIdsForProtocol(protocolId) {
        return [...evalChannels].filter((channelId) => {
          const entry = resolveEntry(channelId, protocolId);
          return entry && entry.compare !== false;
        });
      },

      isProtocolEvalChannel(channelId) {
        return evalChannels.has(channelId);
      },

      getParameters(channelId, protocolId) {
        return resolveEntry(channelId, protocolId)?.parameters || null;
      },

      getDocMeta(channelId, protocolId) {
        const entry = resolveEntry(channelId, protocolId);
        if (!entry?.docMeta) return null;
        return entry.docMeta;
      },

      getRequiredParameters,

      flattenEntryParameters(channelId, protocolId) {
        const entry = resolveEntry(channelId, protocolId);
        if (!entry?.parameters) return [];
        const requiredList = getRequiredParameters(channelId, protocolId, entry);
        const requiredSet = new Set(requiredList);
        const seen = new Set();
        const items = [];

        for (const [category, list] of Object.entries(entry.parameters)) {
          for (const parameter of list || []) {
            seen.add(parameter);
            items.push(normalizeFlatParameter(category, parameter, requiredSet.has(parameter)));
          }
        }

        for (const parameter of requiredList) {
          if (!seen.has(parameter)) {
            items.unshift(normalizeFlatParameter("Core", parameter, true));
          }
        }

        return items;
      },

      resolveEntry,

      getSpec(channelId, protocolId, parameter) {
        return resolveEntry(channelId, protocolId)?.specs?.[parameter] ?? null;
      },

      getOpenAiBaseline(protocolId, parameter) {
        return data.openAiBaseline?.[protocolId]?.[parameter] ?? null;
      },

      formatType,
      formatDefault,
      formatRange,
      formatEnum,
      formatEffective,
      formatSpecShort,
      normalizeSpec,
      diffFields,
      buildSpecConsensus
    };
  }

  return { createApi };
})();
