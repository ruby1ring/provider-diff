/**
 * 渠道性能测评：benchmark 请求构建、结果摘要、跨渠道对比与报告 schema。
 */
window.NOCTUA_CHANNEL_PERFORMANCE = (() => {
  const ROUTE_CORE = () => window.NOCTUA_CHANNEL_ROUTE_CORE;

  const DEFAULT_BENCHMARK = {
    dataset_name: "random",
    dataset_path: "",
    num_prompts: 100,
    random_input_len: 1024,
    random_output_len: 128,
    random_range_ratio: 1,
    random_prefix_len: 0,
    request_rate: "inf",
    burstiness: 1,
    max_concurrency: 0,
    num_warmup_requests: 0,
    percentile_metrics: "ttft,tpot,itl,e2el",
    metric_percentiles: "50,90,95,99",
    goodput: [],
    metadata: {},
    extra_args: [],
    disable_tqdm: true
  };

  const PERFORMANCE_METRIC_LABELS = {
    completed: "成功请求",
    failed: "失败请求",
    benchmark_duration: "耗时 s",
    request_throughput: "Req/s",
    output_throughput: "输出 tok/s",
    total_token_throughput: "总 tok/s",
    mean_ttft_ms: "Mean TTFT ms",
    p99_ttft_ms: "P99 TTFT ms",
    mean_tpot_ms: "Mean TPOT ms",
    p99_tpot_ms: "P99 TPOT ms",
    mean_itl_ms: "Mean ITL ms",
    p99_itl_ms: "P99 ITL ms",
    goodput: "Goodput"
  };

  const COMPARISON_METRICS = [
    { key: "output_throughput", label: "输出 tok/s", mode: "max" },
    { key: "request_throughput", label: "Req/s", mode: "max" },
    { key: "mean_ttft_ms", label: "Mean TTFT ms", mode: "min" },
    { key: "p99_ttft_ms", label: "P99 TTFT ms", mode: "min" },
    { key: "mean_tpot_ms", label: "Mean TPOT ms", mode: "min" },
    { key: "goodput", label: "Goodput", mode: "max" }
  ];

  function formatMetricValue(value) {
    if (value === null || value === undefined || value === "") return "—";
    const number = Number(value);
    if (!Number.isFinite(number)) return String(value);
    return number.toFixed(2);
  }

  function splitListInput(value) {
    return String(value || "")
      .split(/[,\s]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function parseKeyValueInput(value) {
    return splitListInput(value).reduce((out, item) => {
      const index = item.indexOf("=");
      if (index > 0) {
        out[item.slice(0, index).trim()] = item.slice(index + 1).trim();
      }
      return out;
    }, {});
  }

  function splitCliArgs(value) {
    const text = String(value || "").trim();
    if (!text) return [];
    const args = [];
    const pattern = /"([^"]*)"|'([^']*)'|(\S+)/g;
    let match;
    while ((match = pattern.exec(text))) {
      args.push(match[1] ?? match[2] ?? match[3]);
    }
    return args;
  }

  function sanitizeBaseUrlHost(baseUrl) {
    try {
      const parsed = new URL(baseUrl);
      return parsed.host || baseUrl;
    } catch {
      return String(baseUrl || "").replace(/^https?:\/\//, "").split("/")[0] || "";
    }
  }

  function summarizeBenchmarkResult(result = {}) {
    const summary = {};
    for (const key of Object.keys(PERFORMANCE_METRIC_LABELS)) {
      if (result[key] !== undefined && result[key] !== null) {
        summary[key] = result[key];
      }
    }
    return summary;
  }

  function statCardsFromSummary(summary = {}) {
    const cards = [
      ["成功请求", summary.completed ?? "0"],
      ["失败请求", summary.failed ?? "0"],
      ["耗时 s", formatMetricValue(summary.benchmark_duration)],
      ["Req/s", formatMetricValue(summary.request_throughput)],
      ["输出 tok/s", formatMetricValue(summary.output_throughput)],
      ["总 tok/s", formatMetricValue(summary.total_token_throughput)],
      ["Mean TTFT ms", formatMetricValue(summary.mean_ttft_ms)],
      ["P99 TTFT ms", formatMetricValue(summary.p99_ttft_ms)],
      ["Mean TPOT ms", formatMetricValue(summary.mean_tpot_ms)],
      ["P99 TPOT ms", formatMetricValue(summary.p99_tpot_ms)],
      ["Mean ITL ms", formatMetricValue(summary.mean_itl_ms)],
      ["P99 ITL ms", formatMetricValue(summary.p99_itl_ms)]
    ];
    if (summary.goodput !== null && summary.goodput !== undefined) {
      cards.push(["Goodput", formatMetricValue(summary.goodput)]);
    }
    return cards;
  }

  function buildBenchmarkRequest({
    route,
    config,
    protocolId,
    modelId,
    benchmark = {},
    proxy = { enabled: false, url: "", mode: "direct" }
  }) {
    const core = ROUTE_CORE();
    const endpointMeta = core.benchmarkEndpointForProtocol(protocolId);
    const merged = { ...DEFAULT_BENCHMARK, ...benchmark };
    const apiKey = core.channelApiKeyValue(config);
    const model = route?.apiModelId || modelId || "";
    const baseUrl = String(config?.baseUrl || "").trim();

    return {
      backend: endpointMeta.backend,
      base_url: baseUrl,
      endpoint: endpointMeta.endpoint,
      model,
      api_key: apiKey,
      dataset_name: merged.dataset_name || "random",
      dataset_path: merged.dataset_path || "",
      num_prompts: Number(merged.num_prompts) || 100,
      random_input_len: Number(merged.random_input_len) || 1024,
      random_output_len: Number(merged.random_output_len) || 128,
      random_range_ratio: Number(merged.random_range_ratio ?? 1),
      random_prefix_len: Number(merged.random_prefix_len) || 0,
      request_rate: merged.request_rate || "inf",
      burstiness: Number(merged.burstiness ?? 1),
      max_concurrency: Number(merged.max_concurrency) || 0,
      num_warmup_requests: Number(merged.num_warmup_requests) || 0,
      percentile_metrics: merged.percentile_metrics || "ttft,tpot,itl,e2el",
      metric_percentiles: merged.metric_percentiles || "50,90,95,99",
      goodput: Array.isArray(merged.goodput) ? merged.goodput : splitListInput(merged.goodput),
      metadata: merged.metadata && typeof merged.metadata === "object"
        ? merged.metadata
        : parseKeyValueInput(merged.metadata),
      extra_args: Array.isArray(merged.extra_args) ? merged.extra_args : splitCliArgs(merged.extra_args),
      disable_tqdm: merged.disable_tqdm !== false,
      proxy
    };
  }

  function buildPerformanceComparison(channelResults = []) {
    const comparison = {};
    for (const metric of COMPARISON_METRICS) {
      let best = null;
      for (const entry of channelResults) {
        const raw = entry.summary?.[metric.key];
        const value = Number(raw);
        if (!Number.isFinite(value)) continue;
        if (!best) {
          best = { channel_key: entry.channel_key, platformName: entry.platformName, value };
          continue;
        }
        const isBetter = metric.mode === "max" ? value > best.value : value < best.value;
        if (isBetter) {
          best = { channel_key: entry.channel_key, platformName: entry.platformName, value };
        }
      }
      if (best) {
        comparison[metric.mode === "max" ? `best_${metric.key}` : `lowest_${metric.key}`] = best;
      }
    }
    return comparison;
  }

  function compactChannelResultForStorage(entry) {
    return {
      channel_key: entry.channel_key,
      role: entry.role,
      platformName: entry.platformName,
      protocolLabel: entry.protocolLabel,
      base_url_host: entry.base_url_host || "",
      summary: entry.summary || {},
      result: entry.result || {},
      stdout_preview: entry.stdout_preview || ""
    };
  }

  function createChannelPerformanceReportRecord(ctx = {}) {
    const {
      modelId = "",
      protocolId = "",
      benchmark = {},
      baseline = null,
      targets = [],
      channelResults = [],
      startedAt = null,
      finishedAt = null
    } = ctx;

    const core = ROUTE_CORE();
    const comparison = buildPerformanceComparison(channelResults);
    const baselineLabel = baseline
      ? `${baseline.platformName} / ${baseline.protocolLabel}`
      : "";
    const targetLabels = targets.map((route) => `${route.platformName} / ${route.protocolLabel}`);

    return {
      id: `channel_perf_report_${Date.now()}`,
      generated_at: new Date().toISOString(),
      started_at: startedAt || new Date().toISOString(),
      finished_at: finishedAt || new Date().toISOString(),
      tool: "channel-performance",
      report_version: 1,
      model_id: modelId,
      protocol_id: protocolId,
      benchmark: { ...DEFAULT_BENCHMARK, ...benchmark },
      baseline_label: baselineLabel,
      target_labels: targetLabels,
      baseline: baseline ? {
        key: baseline.key,
        platformName: baseline.platformName,
        protocolLabel: baseline.protocolLabel,
        apiModelId: baseline.apiModelId
      } : null,
      targets: targets.map((route) => ({
        key: route.key,
        platformName: route.platformName,
        protocolLabel: route.protocolLabel,
        apiModelId: route.apiModelId
      })),
      channels: core.channelRouteDescriptors(baseline, targets),
      results: channelResults.map(compactChannelResultForStorage),
      comparison
    };
  }

  function comparisonTableRows(record) {
    const results = record?.results || [];
    const channels = results.map((entry) => ({
      key: entry.channel_key,
      label: entry.platformName || entry.channel_key
    }));
    const rows = COMPARISON_METRICS.map((metric) => ({
      metricKey: metric.key,
      label: metric.label,
      cells: channels.map((channel) => {
        const entry = results.find((item) => item.channel_key === channel.key);
        return formatMetricValue(entry?.summary?.[metric.key]);
      })
    }));
    return { channels, rows };
  }

  return {
    DEFAULT_BENCHMARK,
    PERFORMANCE_METRIC_LABELS,
    COMPARISON_METRICS,
    formatMetricValue,
    splitListInput,
    parseKeyValueInput,
    splitCliArgs,
    sanitizeBaseUrlHost,
    summarizeBenchmarkResult,
    statCardsFromSummary,
    buildBenchmarkRequest,
    buildPerformanceComparison,
    createChannelPerformanceReportRecord,
    comparisonTableRows
  };
})();
