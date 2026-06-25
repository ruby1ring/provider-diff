/**
 * Per-channel parameter constraints (type / default / range / effective).
 * Grounded in docs/*.md — used by protocol matrix constraint drawer.
 */
window.NOCTUA_PROTOCOL_PARAMETER_SPECS = (() => {
  const OPENAI_BASELINE = {
    chat_completions: {
      temperature: { type: "number", range: { min: 0, max: 2, minInclusive: true, maxInclusive: true } },
      top_p: { type: "number" },
      n: { type: "integer" },
      seed: { type: "integer" },
      stop: { type: "string", notes: "string 或 array<string>，最多 4 个" },
      frequency_penalty: { type: "number", range: { min: -2, max: 2, minInclusive: true, maxInclusive: true } },
      presence_penalty: { type: "number", range: { min: -2, max: 2, minInclusive: true, maxInclusive: true } },
      max_tokens: { type: "integer" },
      max_completion_tokens: { type: "integer" },
      stream: { type: "boolean", default: false },
      tools: { type: "array" },
      tool_choice: { type: "string" },
      parallel_tool_calls: { type: "boolean" }
    },
    anthropic_messages: {
      model: { type: "string" },
      messages: { type: "array" },
      max_tokens: { type: "integer" },
      system: { type: "string" },
      temperature: { type: "number", range: { min: 0, max: 1, minInclusive: true, maxInclusive: true } },
      top_p: { type: "number", range: { min: 0, max: 1, minInclusive: false, maxInclusive: true } },
      stop_sequences: { type: "array" },
      stream: { type: "boolean", default: false }
    },
    responses_api: {
      model: { type: "string" },
      input: { type: "string" },
      temperature: { type: "number", range: { min: 0, max: 2, minInclusive: true, maxInclusive: true } },
      top_p: { type: "number" },
      max_output_tokens: { type: "integer" },
      stream: { type: "boolean", default: false }
    }
  };

  const SPECS = {
    chat_completions: {
      deepseek: {
        temperature: {
          type: "number",
          default: 1,
          range: { min: 0, max: 2, minInclusive: true, maxInclusive: true },
          nullable: true,
          notes: "thinking 模式下接受但无效果"
        },
        top_p: {
          type: "number",
          default: 1,
          range: { min: 0, max: 1, minInclusive: true, maxInclusive: true },
          nullable: true,
          notes: "thinking 模式下接受但无效果"
        },
        stop: { type: "string", nullable: true, notes: "string 或 array，最多 16 个" },
        frequency_penalty: { type: "number", effective: "ignored", notes: "deprecated，接受但无效果" },
        presence_penalty: { type: "number", effective: "ignored", notes: "deprecated，接受但无效果" },
        max_tokens: { type: "integer", nullable: true },
        stream: { type: "boolean", default: false, nullable: true },
        stream_options: { type: "object", nullable: true, notes: "仅 stream=true 时有效" },
        "stream_options.include_usage": { type: "boolean" },
        tools: { type: "array", nullable: true, notes: "最多 128 个 function" },
        logprobs: { type: "boolean", nullable: true },
        top_logprobs: { type: "integer", range: { min: 0, max: 20, minInclusive: true, maxInclusive: true }, notes: "需 logprobs=true" },
        response_format: { type: "object", nullable: true, notes: "text 或 json_object" }
      },
      aliyun: {
        temperature: {
          type: "number",
          range: { min: 0, max: 2, minInclusive: true, maxInclusive: false },
          notes: "模型默认各异"
        },
        top_p: {
          type: "number",
          range: { min: 0, max: 1, minInclusive: false, maxInclusive: true }
        },
        presence_penalty: {
          type: "number",
          range: { min: -2, max: 2, minInclusive: true, maxInclusive: true }
        },
        seed: {
          type: "integer",
          range: { min: 0, max: 2147483647, minInclusive: true, maxInclusive: true }
        },
        stop: { type: "string", notes: "string 或 array；不可混用 token_id 与 string" },
        n: {
          type: "integer",
          range: { min: 1, max: 4, minInclusive: true, maxInclusive: true },
          notes: "有 tools 时必须为 1"
        },
        max_tokens: { type: "integer", effective: "deprecated", notes: "即将废弃，推荐 max_completion_tokens" },
        max_completion_tokens: { type: "integer" },
        stream: { type: "boolean", default: false },
        "stream_options.include_usage": { type: "boolean", notes: "仅 stream=true" },
        tools: { type: "array" },
        tool_choice: { type: "string", default: "auto" },
        parallel_tool_calls: { type: "boolean", default: false },
        logprobs: { type: "boolean", default: false },
        top_logprobs: { type: "integer", range: { min: 0, max: 5, minInclusive: true, maxInclusive: true }, notes: "需 logprobs=true；thinking reasoning_content 不计入" },
        response_format: { type: "object", default: "text", notes: "text 或 json_object" }
      },
      openrouter: {
        temperature: {
          type: "number",
          default: 1,
          range: { min: 0, max: 2, minInclusive: true, maxInclusive: true }
        },
        top_p: {
          type: "number",
          default: 1,
          range: { min: 0, max: 1, minInclusive: true, maxInclusive: true }
        },
        n: { type: "integer" },
        seed: { type: "integer" },
        stop: { type: "string", notes: "string 或 array，OpenAPI 最多 4 个" },
        frequency_penalty: {
          type: "number",
          default: 0,
          range: { min: -2, max: 2, minInclusive: true, maxInclusive: true }
        },
        presence_penalty: {
          type: "number",
          default: 0,
          range: { min: -2, max: 2, minInclusive: true, maxInclusive: true }
        },
        max_tokens: { type: "integer", effective: "deprecated" },
        max_completion_tokens: { type: "integer" },
        stream: { type: "boolean", default: false },
        stream_options: { type: "object" },
        tools: { type: "array" },
        tool_choice: { type: "string" },
        parallel_tool_calls: { type: "boolean" },
        logprobs: { type: "boolean" },
        top_logprobs: { type: "integer", range: { min: 0, max: 20, minInclusive: true, maxInclusive: true }, notes: "需 logprobs=true" }
      },
      minimax: {
        temperature: {
          type: "number",
          default: 1,
          range: { min: 0, max: 2, minInclusive: true, maxInclusive: true },
          notes: "越界报错"
        },
        top_p: {
          type: "number",
          range: { min: 0, max: 1, minInclusive: true, maxInclusive: true },
          modelDependent: true,
          notes: "M3 默认 0.95；M2.x 默认 0.9"
        },
        n: { type: "integer", default: 1, notes: "仅支持 1" },
        frequency_penalty: { type: "number", effective: "ignored" },
        presence_penalty: { type: "number", effective: "ignored" },
        logit_bias: { type: "object", effective: "ignored" },
        max_tokens: { type: "integer", effective: "deprecated" },
        max_completion_tokens: { type: "integer", modelDependent: true, notes: "M3 推荐 131072；M2.x 推荐 65536" },
        stream: { type: "boolean", default: false },
        "stream_options.include_usage": { type: "boolean" },
        tools: { type: "array" },
        tool_choice: { type: "string" }
      },
      siliconflow: {
        temperature: {
          type: "number",
          range: { min: 0, max: 2, minInclusive: true, maxInclusive: true },
          notes: "文档仅标注 ≤ 2"
        },
        top_p: {
          type: "number",
          range: { min: 0.1, max: 1, minInclusive: true, maxInclusive: true }
        },
        n: { type: "integer", default: 1 },
        stop: { type: "string", notes: "最多 4 个 stop 序列" },
        frequency_penalty: {
          type: "number",
          range: { min: -2, max: 2, minInclusive: true, maxInclusive: true }
        },
        max_tokens: { type: "integer", notes: "勿设为上下文上限，需预留输入开销" },
        stream: { type: "boolean" },
        tools: { type: "array", notes: "最多 128 个 function" },
        tool_choice: { type: "string", default: "auto" }
      },
      streamlake: {
        temperature: {
          type: "number",
          range: { min: 0, max: 2, minInclusive: true, maxInclusive: true }
        },
        top_p: {
          type: "number",
          range: { min: 0, max: 1, minInclusive: true, maxInclusive: true }
        },
        n: { type: "integer" },
        seed: { type: "integer" },
        stop: { type: "string" },
        presence_penalty: { type: "number" },
        max_tokens: { type: "integer", effective: "deprecated", notes: "推荐 max_completion_tokens" },
        max_completion_tokens: { type: "integer" },
        stream: { type: "boolean" },
        "stream_options.include_usage": { type: "boolean" },
        tools: { type: "array" },
        tool_choice: { type: "string" },
        parallel_tool_calls: { type: "boolean" },
        logprobs: { type: "boolean" },
        top_logprobs: { type: "integer" },
        response_format: { type: "object" }
      }
    },
    moonshot: {
      chat_completions: {
        temperature: {
          type: "number",
          default: 0,
          range: { min: 0, max: 1, minInclusive: true, maxInclusive: true },
          notes: "范围 [0,1]，非 OpenAI [0,2]"
        },
        top_p: {
          type: "number",
          default: 1,
          range: { min: 0, max: 1, minInclusive: true, maxInclusive: true }
        },
        n: { type: "integer", default: 1, range: { min: 1, max: 5, minInclusive: true, maxInclusive: true } },
        presence_penalty: { type: "number", default: 0, range: { min: -2, max: 2, minInclusive: true, maxInclusive: true } },
        frequency_penalty: { type: "number", default: 0, range: { min: -2, max: 2, minInclusive: true, maxInclusive: true } },
        max_tokens: { type: "integer", effective: "deprecated" },
        max_completion_tokens: { type: "integer", notes: "默认约 1024" },
        stop: { type: "string", notes: "最多 5 个，每个 ≤32 字节" },
        stream: { type: "boolean", default: false },
        "stream_options.include_usage": { type: "boolean", default: false },
        tools: { type: "array", notes: "max 128" },
        tool_choice: { type: "string" },
        response_format: { type: "object", default: "text" }
      }
    },
    zhipu: {
      chat_completions: {
        temperature: {
          type: "number",
          default: 1,
          range: { min: 0, max: 1, minInclusive: true, maxInclusive: true }
        },
        top_p: {
          type: "number",
          default: 0.95,
          range: { min: 0.01, max: 1, minInclusive: true, maxInclusive: true }
        },
        max_tokens: { type: "integer", range: { min: 1, max: 131072, minInclusive: true, maxInclusive: true } },
        stop: { type: "array", notes: "max 4" },
        stream: { type: "boolean", default: false },
        do_sample: { type: "boolean", default: true, notes: "false 时忽略 temperature/top_p" },
        thinking: { type: "object" },
        "thinking.type": { type: "string", default: "enabled" },
        reasoning_effort: { type: "string", default: "max", notes: "仅 GLM-5.2" },
        tools: { type: "array", notes: "max 128" },
        tool_choice: { type: "string", default: "auto" },
        tool_stream: { type: "boolean", default: false },
        response_format: { type: "object", default: "text" }
      }
    },
    anthropic_messages: {
      deepseek: {
        model: { type: "string", notes: "deepseek-v4-pro / deepseek-v4-flash；claude 名自动映射" },
        messages: { type: "array" },
        max_tokens: { type: "integer" },
        system: { type: "string" },
        temperature: {
          type: "number",
          range: { min: 0, max: 2, minInclusive: true, maxInclusive: true },
          notes: "DeepSeek Anthropic API [0,2] 非官方 Anthropic [0,1]"
        },
        top_p: { type: "number" },
        top_k: { type: "integer", effective: "ignored" },
        stop_sequences: { type: "array" },
        stream: { type: "boolean" },
        thinking: { type: "object", notes: "budget_tokens Ignored" },
        "thinking.budget_tokens": { type: "integer", effective: "ignored" },
        output_config: { type: "object", notes: "仅 effort 支持" },
        tools: { type: "array" },
        tool_choice: { type: "object" },
        "metadata.user_id": { type: "string", notes: "其余 metadata 字段 Ignored" }
      },
      aliyun: {
        model: { type: "string" },
        messages: { type: "array" },
        max_tokens: { type: "integer" },
        system: { type: "string" },
        temperature: {
          type: "number",
          range: { min: 0, max: 2, minInclusive: true, maxInclusive: false },
          notes: "百炼 [0,2) 非 Anthropic [0,1]"
        },
        top_p: { type: "number" },
        top_k: { type: "integer" },
        stop_sequences: { type: "array" },
        stream: { type: "boolean", default: false },
        thinking: { type: "object" },
        "thinking.budget_tokens": { type: "integer" },
        reasoning_effort: { type: "string", default: "max", notes: "DeepSeek-V4 系列" },
        tools: { type: "array" },
        tool_choice: { type: "object", default: "auto" },
        output_config: { type: "object" }
      },
      minimax: {
        model: { type: "string" },
        messages: { type: "array" },
        max_tokens: { type: "integer", modelDependent: true, notes: "M3 推荐 131072；M2.x 推荐 65536" },
        system: { type: "string" },
        temperature: {
          type: "number",
          default: 1,
          range: { min: 0, max: 2, minInclusive: true, maxInclusive: true }
        },
        top_p: {
          type: "number",
          range: { min: 0, max: 1, minInclusive: true, maxInclusive: true },
          modelDependent: true,
          notes: "M3 默认 0.95；M2.x 默认 0.9"
        },
        thinking: { type: "object", default: "disabled" },
        "thinking.type": { type: "string", default: "disabled", notes: "M3: disabled/adaptive；M2.x 无法关闭" },
        stream: { type: "boolean", default: false },
        tools: { type: "array" },
        tool_choice: { type: "object" },
        service_tier: { type: "string", default: "standard" }
      },
      openrouter: {
        model: { type: "string" },
        messages: { type: "array" },
        max_tokens: { type: "integer" },
        system: { type: "string" },
        temperature: { type: "number", range: { min: 0, max: 1, minInclusive: true, maxInclusive: true }, notes: "Anthropic 标准范围" },
        top_p: { type: "number", range: { min: 0, max: 1, minInclusive: false, maxInclusive: true } },
        top_k: { type: "integer" },
        stop_sequences: { type: "array" },
        stream: { type: "boolean" },
        thinking: { type: "object" },
        tools: { type: "array" },
        tool_choice: { type: "object" },
        models: { type: "array", notes: "OpenRouter 多模型路由" },
        fallbacks: { type: "array", notes: "最多 3 项" },
        provider: { type: "object" },
        session_id: { type: "string", notes: "max 256" }
      },
      streamlake: {
        model: { type: "string", notes: "推理点 ID（ep-xxx）" },
        messages: { type: "array" },
        max_tokens: { type: "integer" },
        system: { type: "string" },
        temperature: { type: "number", range: { min: 0, max: 2, minInclusive: true, maxInclusive: false }, notes: "网关 [0,2) 非 Anthropic [0,1]" },
        top_p: { type: "number", range: { min: 0, max: 1, minInclusive: false, maxInclusive: true } },
        stop_sequences: { type: "array" },
        stream: { type: "boolean" },
        tools: { type: "array" },
        tool_choice: { type: "object" }
      },
      siliconflow: {
        model: { type: "string" },
        messages: { type: "array" },
        max_tokens: { type: "integer" },
        system: { type: "string" },
        temperature: { type: "number", range: { min: 0, max: 2, minInclusive: true, maxInclusive: true } },
        top_p: { type: "number", range: { min: 0.1, max: 1, minInclusive: true, maxInclusive: true } },
        top_k: { type: "number", range: { min: 0, max: 50, minInclusive: true, maxInclusive: true } },
        stop_sequences: { type: "array" },
        stream: { type: "boolean" },
        tools: { type: "array" },
        tool_choice: { type: "object" }
      },
      zhipu: {
        model: { type: "string" },
        messages: { type: "array" },
        max_tokens: { type: "integer" },
        system: { type: "string" },
        temperature: { type: "number", range: { min: 0, max: 1, minInclusive: true, maxInclusive: true }, notes: "Anthropic 标准范围" },
        top_p: { type: "number", range: { min: 0, max: 1, minInclusive: false, maxInclusive: true }, notes: "Anthropic 标准范围" },
        stop_sequences: { type: "array" },
        stream: { type: "boolean" },
        tools: { type: "array" },
        tool_choice: { type: "object" }
      }
    },
    responses_api: {
      aliyun: {
        model: { type: "string" },
        input: { type: "string" },
        temperature: { type: "number", range: { min: 0, max: 1, minInclusive: true, maxInclusive: true }, notes: "Anthropic 标准范围" },
        top_p: { type: "number", range: { min: 0, max: 1, minInclusive: false, maxInclusive: true }, notes: "Anthropic 标准范围" },
        max_output_tokens: { type: "integer" },
        stream: { type: "boolean" },
        tools: { type: "array" },
        tool_choice: { type: "string" }
      },
      openrouter: {
        model: { type: "string" },
        input: { type: "string" },
        temperature: { type: "number", range: { min: 0, max: 1, minInclusive: true, maxInclusive: true }, notes: "Anthropic 标准范围" },
        top_p: { type: "number", range: { min: 0, max: 1, minInclusive: false, maxInclusive: true }, notes: "Anthropic 标准范围" },
        max_output_tokens: { type: "integer" },
        stream: { type: "boolean" },
        tools: { type: "array" },
        tool_choice: { type: "string" }
      },
      streamlake: {
        model: { type: "string", notes: "推理点 ID（ep-xxx）" },
        input: { type: "string" },
        temperature: { type: "number", range: { min: 0, max: 1, minInclusive: true, maxInclusive: true }, notes: "Anthropic 标准范围" },
        top_p: { type: "number", range: { min: 0, max: 1, minInclusive: false, maxInclusive: true }, notes: "Anthropic 标准范围" },
        max_output_tokens: { type: "integer" },
        stream: { type: "boolean" },
        tools: { type: "array" },
        tool_choice: { type: "string" }
      },
      minimax: {
        model: { type: "string" },
        input: { type: "string", notes: "string 或 InputItem[]" },
        temperature: {
          type: "number",
          default: 1,
          range: { min: 0, max: 1, minInclusive: false, maxInclusive: true },
          notes: "(0,1] 非 OpenAI Responses"
        },
        top_p: {
          type: "number",
          default: 0.95,
          range: { min: 0, max: 1, minInclusive: false, maxInclusive: true }
        },
        max_output_tokens: { type: "integer" },
        stream: { type: "boolean", default: false },
        reasoning: { type: "object", default: "none" },
        "reasoning.effort": {
          type: "string",
          default: "none",
          notes: "none/minimal/low/medium/high；M2.x 无法关闭"
        },
        tools: { type: "array" },
        tool_choice: { type: "string", notes: "none | auto" },
        instructions: { type: "string" },
        service_tier: { type: "string", default: "standard" }
      }
    }
  };

  function getSpec(channelId, protocolId, parameter) {
    return SPECS[protocolId]?.[channelId]?.[parameter] ?? null;
  }

  function getOpenAiBaseline(protocolId, parameter) {
    return OPENAI_BASELINE[protocolId]?.[parameter] ?? null;
  }

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
      if (spec?.notes && /≤|max|范围/.test(spec.notes)) return spec.notes.includes("≤") ? spec.notes.match(/≤\s*[\d.]+/)?.[0] || "—" : "—";
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

  function formatEffective(spec) {
    if (!spec?.effective || spec.effective === "supported") return "—";
    const labels = {
      ignored: "无效果",
      deprecated: "已废弃",
      "model-dependent": "因模型而异"
    };
    return labels[spec.effective] || spec.effective;
  }

  function formatSpecShort(spec) {
    if (!spec) return "—";
    const parts = [formatType(spec)];
    const def = formatDefault(spec);
    if (def !== "—") parts.push(`default ${def}`);
    const range = formatRange(spec);
    if (range !== "—") parts.push(range);
    const eff = formatEffective(spec);
    if (eff !== "—") parts.push(eff);
    return parts.join(" · ");
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
      effective: spec.effective && spec.effective !== "supported" ? spec.effective : null
    };
    return JSON.stringify(key);
  }

  function diffFields(specA, specB) {
    if (!specA && !specB) return [];
    if (!specA || !specB) return ["type", "default", "range", "effective"];
    const fields = [];
    if (formatType(specA) !== formatType(specB)) fields.push("type");
    if (formatDefault(specA) !== formatDefault(specB)) fields.push("default");
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

  return {
    SPECS,
    OPENAI_BASELINE,
    getSpec,
    getOpenAiBaseline,
    formatType,
    formatDefault,
    formatRange,
    formatEffective,
    formatSpecShort,
    normalizeSpec,
    diffFields,
    buildSpecConsensus
  };
})();
