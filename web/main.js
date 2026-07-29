const {
  CHANNEL_TEMPLATES,
  ENDPOINT_TEMPLATES,
  MOCK_PARAMETER_ORIGINS,
  MOCK_PARAMETER_DESCRIPTIONS,
  MOCK_RESULTS,
  MOCK_RESPONSES
} = window.LLM_ROSETTA_DATA;
const PROVIDERX_RULES = window.PROVIDERX_RULES || {};
const CHANNEL_REPORT_INTENT = window.NOCTUA_CHANNEL_REPORT_INTENT || {};

function channelReportIntentDeps() {
  return {
    matchesExpectedResult,
    expectedHTTPStatusForResult
  };
}

function matchesExpectedForReport(result) {
  if (CHANNEL_REPORT_INTENT.matchesExpectedForReport) {
    return CHANNEL_REPORT_INTENT.matchesExpectedForReport(result, channelReportIntentDeps());
  }
  return matchesExpectedResult(result);
}

function resultReportIntent(result) {
  if (CHANNEL_REPORT_INTENT.resultEvaluationIntent) {
    return CHANNEL_REPORT_INTENT.resultEvaluationIntent(result);
  }
  return "assert";
}

function channelReportStatsForResults(results = []) {
  if (CHANNEL_REPORT_INTENT.channelReportStats) {
    return CHANNEL_REPORT_INTENT.channelReportStats(results, channelReportIntentDeps());
  }
  return historyStats(results);
}

function ensureChannelReportEvaluation(record) {
  if (record?.evaluation?.version === 2) return record.evaluation;
  const matrix = ensureChannelReportMatrix(record);
  const channels = ensureChannelReportChannels(record);
  const stats = record.stats || channelReportStatsForResults(record.results || []);
  if (CHANNEL_REPORT_INTENT.channelReportEvaluationSummary) {
    return CHANNEL_REPORT_INTENT.channelReportEvaluationSummary(matrix, channels, stats, channelReportIntentDeps());
  }
  return null;
}

function caseSeverityMetaForRow(row = {}) {
  const sourceCase = {
    case_id: row.case_id,
    category: row.category,
    optional: row.optional,
    expect: row.expect
  };
  const level = CHANNEL_REPORT_INTENT.caseSeverityLevel?.(sourceCase, row.group_key) || "p2";
  return CHANNEL_REPORT_INTENT.caseSeverityMeta?.(level) || { level, label: level.toUpperCase(), title: level, css: "extension" };
}

function renderSeverityLevelBadge(level, { compact = false, description = "", title = "" } = {}) {
  if (!level) return "";
  const meta = CHANNEL_REPORT_INTENT.caseSeverityMeta?.(level) || {
    level,
    label: String(level).toUpperCase(),
    title: title || level,
    description,
    css: "extension"
  };
  const label = compact ? meta.label : `${meta.label} ${meta.title}`;
  return `<span class="case-severity case-severity--${meta.css}" title="${escapeHtml(meta.description || description || meta.title)}">${escapeHtml(label)}</span>`;
}

function splitCaseDisplayTitle(title = "", caseId = "") {
  const text = String(title || caseId || "").trim();
  const colon = text.indexOf("：");
  if (colon > 0) {
    return { name: text.slice(0, colon).trim(), desc: text.slice(colon + 1).trim() };
  }
  const enColon = text.indexOf(":");
  if (enColon > 0) {
    return { name: text.slice(0, enColon).trim(), desc: text.slice(enColon + 1).trim() };
  }
  return { name: text || caseId, desc: "" };
}

function renderChannelIssueCard(entry) {
  return `
    <article class="channel-eval-channel-card channel-eval-channel-card--${escapeHtml(entry.severity_meta?.css || "extension")}">
      <header class="channel-eval-channel-card__head">
        <strong>${escapeHtml(entry.platformName)}</strong>
        ${entry.severity_meta ? renderSeverityLevelBadge(entry.worstSeverity, { compact: true }) : ""}
      </header>
      <p class="channel-eval-channel-card__count">${entry.issueCount} 项未达标</p>
      <ul class="channel-eval-channel-card__cases">
        ${entry.failedCases.map((item) => {
    const parts = splitCaseDisplayTitle(item.title, item.case_id);
    return `<li class="channel-eval-channel-card__case">
            <strong class="mono fs-xs">${escapeHtml(parts.name)}</strong>
            ${parts.desc ? `<span class="muted fs-xs channel-eval-channel-card__case-desc">${escapeHtml(parts.desc)}</span>` : ""}
          </li>`;
  }).join("")}
      </ul>
    </article>`;
}

function renderChannelIssueDetailSection(channelSummaries = []) {
  if (!channelSummaries.length) return "";
  const body = channelSummaries.length === 1
    ? `<div class="channel-issue-tabs__single">${renderChannelIssueCard(channelSummaries[0])}</div>`
    : `
      <div class="channel-issue-tabs">
        <div class="channel-issue-tabs__nav tabs" role="tablist">
          ${channelSummaries.map((entry, index) => `
            <button
              type="button"
              class="${index === 0 ? "on" : ""}"
              role="tab"
              aria-selected="${index === 0 ? "true" : "false"}"
              data-channel-issue-tab="${index}"
            >
              <span class="channel-issue-tabs__label">${escapeHtml(entry.platformName)}</span>
              <span class="count">${entry.issueCount}</span>
            </button>
          `).join("")}
        </div>
        <div class="channel-issue-tabs__panels">
          ${channelSummaries.map((entry, index) => `
            <div
              class="channel-issue-tabs__panel${index === 0 ? "" : " is-hidden"}"
              role="tabpanel"
              data-channel-issue-panel="${index}"
            >${renderChannelIssueCard(entry)}</div>
          `).join("")}
        </div>
      </div>`;

  return `
    <details class="channel-report-evaluation__channels">
      <summary>各渠道问题明细（${channelSummaries.length} 个渠道有问题）</summary>
      ${body}
    </details>`;
}

function activateTabSwitcher(root, tabId, { tabSelector, panelSelector, tabKey, panelKey }) {
  root.querySelectorAll(tabSelector).forEach((button) => {
    const active = button.dataset[tabKey] === String(tabId);
    button.classList.toggle("on", active);
    button.setAttribute("aria-selected", active ? "true" : "false");
  });
  root.querySelectorAll(panelSelector).forEach((panel) => {
    panel.classList.toggle("is-hidden", panel.dataset[panelKey] !== String(tabId));
  });
}

function renderChannelReportEvaluationSummary(record) {
  const evaluation = ensureChannelReportEvaluation(record);
  if (!evaluation) return "";
  const stats = record.stats || channelReportStatsForResults(record.results || []);
  const verdict = evaluation.verdict_meta || {};
  const failingCases = evaluation.failing_cases || [];
  const channelRankings = evaluation.channel_rankings || [];
  const channelSummaries = (evaluation.channel_summaries || []).filter((entry) => entry.issueCount > 0);
  const docGapIssues = (window.NOCTUA_PARAMETER_DIAGNOSIS?.scanResultsForDocIssues(record.results || []) || []);
  const severityLevels = ["p0", "p1", "p2", "p3"]
    .map((level) => {
      const meta = CHANNEL_REPORT_INTENT.caseSeverityMeta?.(level) || { label: level, title: level, css: "extension" };
      const counts = evaluation.severity_counts?.[level] || { total: 0, failed: 0 };
      if (!counts.total) return null;
      return { level, meta, counts };
    })
    .filter(Boolean);

  const statChips = [
    { label: "断言达标", value: `${stats.assertPass || 0}/${stats.assertTotal || 0}`, tone: stats.assertFail ? "warn" : "ok" },
    { label: "观测记录", value: `${stats.observeRecorded || 0}/${stats.observeTotal || 0}`, tone: (stats.observeAssertionFail || stats.observeIssue) ? "warn" : "neutral" },
    { label: "结构差异", value: String(stats.structureDiffs || 0), tone: stats.structureDiffs ? "warn" : "neutral" },
    ...(docGapIssues.length ? [{ label: "文档漏洞", value: String(docGapIssues.length), tone: "warn" }] : [])
  ];

  return `
    <section class="channel-report-evaluation channel-report-evaluation--${escapeHtml(verdict.css || evaluation.verdict || "pass")}">
      <header class="channel-report-evaluation__banner">
        <div class="channel-report-evaluation__banner-main">
          <p class="eyebrow">整体评测结论</p>
          <div class="channel-report-evaluation__verdict-row">
            <span class="channel-report-verdict channel-report-verdict--${escapeHtml(verdict.css || "pass")}">${escapeHtml(verdict.label || "—")}</span>
            <p class="channel-report-evaluation__headline">${escapeHtml(evaluation.headline || verdict.headline || "")}</p>
          </div>
        </div>
        <div class="channel-eval-stat-chips">
          ${statChips.map((chip) => `
            <div class="channel-eval-stat-chip channel-eval-stat-chip--${chip.tone}">
              <span class="channel-eval-stat-chip__label">${escapeHtml(chip.label)}</span>
              <strong class="channel-eval-stat-chip__value">${escapeHtml(chip.value)}</strong>
            </div>
          `).join("")}
        </div>
      </header>

      <details class="channel-report-evaluation__glossary" open>
        <summary>术语说明（运营可读）</summary>
        <dl class="channel-eval-glossary">
          <div><dt>推荐接入</dt><dd>该渠道在当前 case 下全部达标，可优先考虑。</dd></div>
          <div><dt>不建议接入</dt><dd>存在阻断级（P0）失败，暂不建议用于生产流量。</dd></div>
          <div><dt>断言达标</dt><dd>必须通过的兼容性检查项已通过。</dd></div>
          <div><dt>观测记录</dt><dd>仅记录行为、不作为阻断的探针项。</dd></div>
          <div><dt>文档漏洞</dt><dd>渠道文档未声明支持某参数，但实测传参后静默生效，须更新 API 文档。</dd></div>
          <div><dt>未文档化拒绝</dt><dd>文档未声明支持的参数传参后直接报错，可能影响 OpenAI 兼容透传。</dd></div>
          <div><dt>Baseline</dt><dd>对照用的原厂或 OpenAI 标准响应，用于结构 diff。</dd></div>
          <div><dt>必现</dt><dd>该 case 失败后已自动复跑，多次全部失败——问题稳定存在，属渠道侧问题，可直接反馈渠道。</dd></div>
          <div><dt>偶发</dt><dd>首跑失败、自动复跑后通过——多为网络或服务端瞬时抖动，无需按渠道缺陷处理。</dd></div>
        </dl>
      </details>

      ${severityLevels.length ? `
        <div class="channel-eval-severity-bar">
          ${severityLevels.map(({ meta, counts }) => `
            <div class="channel-eval-severity-chip channel-eval-severity-chip--${meta.css}${counts.failed ? " has-fail" : ""}">
              <span class="case-severity case-severity--${meta.css}">${escapeHtml(meta.label)}</span>
              <span class="channel-eval-severity-chip__title">${escapeHtml(meta.title)}</span>
              <span class="channel-eval-severity-chip__stat">${counts.failed ? `${counts.failed} 项未达标` : "全部达标"} · ${counts.total} case</span>
            </div>
          `).join("")}
        </div>
      ` : ""}

      ${channelRankings.length ? `
        <div class="channel-report-evaluation__section">
          <h4 class="channel-report-evaluation__section-title">渠道接入建议 <span class="muted">（按表现排序）</span></h4>
          <div class="channel-eval-ranking-list">
            ${channelRankings.map((entry) => `
              <article class="channel-eval-ranking-item channel-eval-ranking-item--${escapeHtml(entry.verdict_meta?.css || entry.verdict || "pass")}">
                <div class="channel-eval-ranking-item__rank" aria-hidden="true">#${entry.rank}</div>
                <div class="channel-eval-ranking-item__main">
                  <div class="channel-eval-ranking-item__head">
                    <strong>${escapeHtml(entry.platformName)}</strong>
                    <span class="channel-report-verdict channel-report-verdict--${escapeHtml(entry.verdict_meta?.css || entry.verdict || "pass")}">${escapeHtml(entry.verdict_meta?.label || "—")}</span>
                  </div>
                  <p class="muted fs-xs channel-eval-ranking-item__summary">${escapeHtml(entry.summary_text || "")}</p>
                </div>
                <div class="channel-eval-ranking-item__stats">
                  <span class="channel-eval-ranking-item__pass">${entry.passCount}/${entry.totalCases} 达标</span>
                  ${entry.issueCount ? `<span class="channel-eval-ranking-item__issues">${entry.issueCount} 项问题</span>` : ""}
                </div>
              </article>
            `).join("")}
          </div>
          ${evaluation.ranking_comparison_text ? `<p class="muted fs-xs channel-eval-ranking-note">${escapeHtml(evaluation.ranking_comparison_text)}</p>` : ""}
        </div>
      ` : ""}

      ${failingCases.length ? `
        <div class="channel-report-evaluation__section">
          <h4 class="channel-report-evaluation__section-title">待处理问题 <span class="muted">(${failingCases.length})</span></h4>
          <div class="table-wrap">
            <table class="rtable channel-eval-issue-table">
              <thead>
                <tr>
                  <th>严重度</th>
                  <th>Case</th>
                  <th>未达标渠道</th>
                </tr>
              </thead>
              <tbody>
                ${failingCases.map((item) => {
    const parts = splitCaseDisplayTitle(item.title, item.case_id);
    return `
                  <tr class="channel-eval-issue-row channel-eval-issue-row--${escapeHtml(item.severity_meta?.css || item.severity || "extension")}">
                    <td>${renderSeverityLevelBadge(item.severity, { compact: true })}</td>
                    <td class="channel-eval-issue-case">
                      <strong class="mono">${escapeHtml(parts.name)}</strong>
                      ${parts.desc ? `<span class="muted fs-xs channel-eval-issue-case__desc">${escapeHtml(parts.desc)}</span>` : ""}
                    </td>
                    <td class="channel-eval-issue-channels">
                      ${(item.failed_channels || []).map((name) => {
    const repro = item.failed_channel_repro?.[name] || null;
    const reproTag = repro?.verdict === "consistent"
      ? `<b class="channel-eval-channel-tag__repro" title="复跑 ${repro.total} 次全部失败，稳定复现">必现</b>`
      : repro?.verdict === "flaky_recovered"
        ? `<b class="channel-eval-channel-tag__repro channel-eval-channel-tag__repro--flaky" title="首跑失败、复跑通过，疑似瞬时抖动">偶发</b>`
        : "";
    return `<span class="channel-eval-channel-tag">${escapeHtml(name)}${reproTag}</span>`;
  }).join("")}
                    </td>
                  </tr>`;
  }).join("")}
              </tbody>
            </table>
          </div>
        </div>
      ` : `<p class="muted fs-sm channel-report-evaluation__all-pass">所有测评 case 在渠道侧均达标。</p>`}

      ${docGapIssues.length ? `
        <div class="channel-report-evaluation__section channel-report-evaluation__section--doc-gap">
          <h4 class="channel-report-evaluation__section-title">文档漏洞 <span class="muted">(${docGapIssues.length})</span></h4>
          <p class="muted fs-xs channel-eval-doc-gap-intro">以下问题属渠道 API 文档与实测不一致：文档未声明支持，但传参后实际生效。须以实测为准更新 API 文档并标注来源。</p>
          <div class="table-wrap">
            <table class="rtable channel-eval-doc-gap-table">
              <thead>
                <tr>
                  <th>渠道</th>
                  <th>Case</th>
                  <th>参数</th>
                  <th>说明</th>
                </tr>
              </thead>
              <tbody>
                ${docGapIssues.map((issue) => {
    const parts = splitCaseDisplayTitle(issue.title, issue.case_id);
    return `
                <tr>
                  <td>${escapeHtml(issue.channel_name || "—")}</td>
                  <td class="channel-eval-issue-case">
                    <strong class="mono">${escapeHtml(parts.name)}</strong>
                    ${parts.desc ? `<span class="muted fs-xs">${escapeHtml(parts.desc)}</span>` : ""}
                  </td>
                  <td class="mono fs-xs">${escapeHtml((issue.parameters || []).join(", ") || "—")}</td>
                  <td class="fs-xs">${escapeHtml(issue.message || issue.flag_meta?.operator_note || "")}</td>
                </tr>`;
  }).join("")}
              </tbody>
            </table>
          </div>
        </div>
      ` : ""}

      ${renderChannelIssueDetailSection(channelSummaries)}
    </section>`;
}

const RUN_V02_GROUP_TITLES = {
  connectivity: "连通性",
  protocol: "流式/非流式",
  protocol_sampling: "采样参数",
  protocol_thinking: "思考模式",
  protocol_tools: "工具调用",
  protocol_response_format: "输出控制",
  output_length: "输出长度",
  cache_hit: "缓存命中率"
};

function getProtocolMatrix() {
  return window.NOCTUA_PROTOCOL_MATRIX || null;
}

const els = {
  viewLinks: Array.from(document.querySelectorAll("[data-view-link]")),
  views: Array.from(document.querySelectorAll("[data-view]")),
  endpointTabs: document.querySelector("#endpointTabs"),
  channelCards: document.querySelector("#channelCards"),
  apiKey: document.querySelector("#apiKey"),
  baseUrlPreset: document.querySelector("#baseUrlPreset"),
  baseUrl: document.querySelector("#baseUrl"),
  modelName: document.querySelector("#modelName"),
  batchModeToggle: document.querySelector("#batchModeToggle"),
  batchTargetsPanel: document.querySelector("#batchTargetsPanel"),
  batchTargetRows: document.querySelector("#batchTargetRows"),
  batchAddTarget: document.querySelector("#batchAddTarget"),
  batchImportTargets: document.querySelector("#batchImportTargets"),
  batchTargets: document.querySelector("#batchTargets"),
  batchConcurrency: document.querySelector("#batchConcurrency"),
  baselineReport: document.querySelector("#baselineReport"),
  proxyEnabled: document.querySelector("#proxyEnabled"),
  proxyUrl: document.querySelector("#proxyUrl"),
  proxyHint: document.querySelector("#proxyHint"),
  toggleSecret: document.querySelector("#toggleSecret"),
  suiteTitle: document.querySelector("#suiteTitle"),
  parameterGroups: document.querySelector("#parameterGroups"),
  caseSelector: document.querySelector("#caseSelector"),
  caseGroups: document.querySelector("#caseGroups"),
  selectedCaseCount: document.querySelector("#selectedCaseCount"),
  caseSelectorHint: document.querySelector("#caseSelectorHint"),
  customPayloadInput: document.querySelector("#customPayloadInput"),
  customPayloadHint: document.querySelector("#customPayloadHint"),
  addCustomPayload: document.querySelector("#addCustomPayload"),
  clearCustomPayload: document.querySelector("#clearCustomPayload"),
  selectAllCases: document.querySelector("#selectAllCases"),
  clearAllCases: document.querySelector("#clearAllCases"),
  runTests: document.querySelector("#runTests"),
  stopTests: document.querySelector("#stopTests"),
  progressPanel: document.querySelector("#progressPanel"),
  progressCount: document.querySelector("#progressCount"),
  progressCase: document.querySelector("#progressCase"),
  progressBar: document.querySelector("#progressBar"),
  runLog: document.querySelector("#runLog"),
  resultsPanel: document.querySelector("#resultsPanel"),
  statPassed: document.querySelector("#statPassed"),
  statWarnings: document.querySelector("#statWarnings"),
  statFailed: document.querySelector("#statFailed"),
  statDiffs: document.querySelector("#statDiffs"),
  capacitySummary: document.querySelector("#capacitySummary"),
  filterTabs: document.querySelector("#filterTabs"),
  resultRows: document.querySelector("#resultRows"),
  exportJson: document.querySelector("#exportJson"),
  exportMarkdown: document.querySelector("#exportMarkdown"),
  rerunTests: document.querySelector("#rerunTests"),
  historyCount: document.querySelector("#historyCount"),
  historySummary: document.querySelector("#historySummary"),
  historyFilters: document.querySelector("#historyFilters"),
  historyList: document.querySelector("#historyList"),
  importHistoryFile: document.querySelector("#importHistoryFile"),
  clearHistory: document.querySelector("#clearHistory"),
  channelReportsCount: document.querySelector("#channelReportsCount"),
  channelReportsList: document.querySelector("#channelReportsList"),
  clearChannelReports: document.querySelector("#clearChannelReports"),
  exportChannelReportsJson: document.querySelector("#exportChannelReportsJson"),
  channelReportRunPanel: document.querySelector("#channelReportRunPanel"),
  channelReportRunMeta: document.querySelector("#channelReportRunMeta"),
  channelPerfModelSelect: document.querySelector("#channelPerfModelSelect"),
  channelPerfModelControl: document.querySelector("#channelPerfModelControl"),
  channelPerfModelInput: document.querySelector("#channelPerfModelInput"),
  channelPerfModelMenu: document.querySelector("#channelPerfModelMenu"),
  channelPerfModelOptions: document.querySelector("#channelPerfModelOptions"),
  channelPerfProtocolPanel: document.querySelector("#channelPerfProtocolPanel"),
  channelPerfProtocolPicker: document.querySelector("#channelPerfProtocolPicker"),
  channelPerfProtocolMeta: document.querySelector("#channelPerfProtocolMeta"),
  channelPerfProtocolHint: document.querySelector("#channelPerfProtocolHint"),
  channelPerfChannelPanel: document.querySelector("#channelPerfChannelPanel"),
  channelPerfRouteHint: document.querySelector("#channelPerfRouteHint"),
  channelPerfBaselineSelect: document.querySelector("#channelPerfBaselineSelect"),
  channelPerfBaselineControl: document.querySelector("#channelPerfBaselineControl"),
  channelPerfBaselineInput: document.querySelector("#channelPerfBaselineInput"),
  channelPerfBaselineMenu: document.querySelector("#channelPerfBaselineMenu"),
  channelPerfBaselineOptions: document.querySelector("#channelPerfBaselineOptions"),
  channelPerfTargetSelect: document.querySelector("#channelPerfTargetSelect"),
  channelPerfTargetControl: document.querySelector("#channelPerfTargetControl"),
  channelPerfTargetTags: document.querySelector("#channelPerfTargetTags"),
  channelPerfTargetInput: document.querySelector("#channelPerfTargetInput"),
  channelPerfTargetMenu: document.querySelector("#channelPerfTargetMenu"),
  channelPerfTargetOptions: document.querySelector("#channelPerfTargetOptions"),
  channelPerfConfigPanel: document.querySelector("#channelPerfConfigPanel"),
  channelPerfSelectedRoute: document.querySelector("#channelPerfSelectedRoute"),
  channelPerfChannelConfigs: document.querySelector("#channelPerfChannelConfigs"),
  channelPerfBenchmarkPanel: document.querySelector("#channelPerfBenchmarkPanel"),
  channelPerfNumPrompts: document.querySelector("#channelPerfNumPrompts"),
  channelPerfRandomInputLen: document.querySelector("#channelPerfRandomInputLen"),
  channelPerfRandomOutputLen: document.querySelector("#channelPerfRandomOutputLen"),
  channelPerfRequestRate: document.querySelector("#channelPerfRequestRate"),
  channelPerfMaxConcurrency: document.querySelector("#channelPerfMaxConcurrency"),
  channelPerfPercentileMetrics: document.querySelector("#channelPerfPercentileMetrics"),
  channelPerfMetricPercentiles: document.querySelector("#channelPerfMetricPercentiles"),
  channelPerfGoodput: document.querySelector("#channelPerfGoodput"),
  channelPerfRandomRangeRatio: document.querySelector("#channelPerfRandomRangeRatio"),
  channelPerfRandomPrefixLen: document.querySelector("#channelPerfRandomPrefixLen"),
  channelPerfBurstiness: document.querySelector("#channelPerfBurstiness"),
  channelPerfWarmups: document.querySelector("#channelPerfWarmups"),
  channelPerfMetadata: document.querySelector("#channelPerfMetadata"),
  channelPerfExtraArgs: document.querySelector("#channelPerfExtraArgs"),
  runChannelPerfBenchmark: document.querySelector("#runChannelPerfBenchmark"),
  channelPerfReportRunPanel: document.querySelector("#channelPerfReportRunPanel"),
  channelPerfReportRunMeta: document.querySelector("#channelPerfReportRunMeta"),
  channelPerfStopBenchmark: document.querySelector("#channelPerfStopBenchmark"),
  channelPerfProgressCount: document.querySelector("#channelPerfProgressCount"),
  channelPerfProgressLabel: document.querySelector("#channelPerfProgressLabel"),
  channelPerfProgressBar: document.querySelector("#channelPerfProgressBar"),
  channelPerfRunLog: document.querySelector("#channelPerfRunLog"),
  channelPerfReportsCount: document.querySelector("#channelPerfReportsCount"),
  channelPerfReportsList: document.querySelector("#channelPerfReportsList"),
  clearChannelPerfReports: document.querySelector("#clearChannelPerfReports"),
  feishuDocumentUrl: document.querySelector("#feishuDocumentUrl"),
  feishuDocumentMode: document.querySelector("#feishuDocumentMode"),
  feishuTitlePrefix: document.querySelector("#feishuTitlePrefix"),
  feishuAutoPush: document.querySelector("#feishuAutoPush"),
  saveFeishuSettings: document.querySelector("#saveFeishuSettings"),
  pushFeishuNow: document.querySelector("#pushFeishuNow"),
  copyFeishuReport: document.querySelector("#copyFeishuReport"),
  feishuReportPreview: document.querySelector("#feishuReportPreview"),
  feishuStatus: document.querySelector("#feishuStatus"),
  evalscopeFrame: document.querySelector("#evalscopeFrame"),
  reloadEvalscope: document.querySelector("#reloadEvalscope"),
  openEvalscope: document.querySelector("#openEvalscope"),
  opencompassUrl: document.querySelector("#opencompassUrl"),
  opencompassFrame: document.querySelector("#opencompassFrame"),
  saveOpencompassUrl: document.querySelector("#saveOpencompassUrl"),
  reloadOpencompass: document.querySelector("#reloadOpencompass"),
  openOpencompass: document.querySelector("#openOpencompass"),
  themeToggle: document.querySelector("#themeToggle"),
  themeLabel: document.querySelector("#themeLabel"),
  accountMode: document.querySelector("#accountMode"),
  runV02ModelSelect: document.querySelector("#runV02ModelSelect"),
  runV02ModelControl: document.querySelector("#runV02ModelControl"),
  runV02ModelInput: document.querySelector("#runV02ModelInput"),
  runV02ModelMenu: document.querySelector("#runV02ModelMenu"),
  runV02ModelOptions: document.querySelector("#runV02ModelOptions"),
  runV02RouteSelect: document.querySelector("#runV02BaselineSelect"),
  runV02RouteControl: document.querySelector("#runV02BaselineControl"),
  runV02RouteInput: document.querySelector("#runV02BaselineInput"),
  runV02RouteMenu: document.querySelector("#runV02BaselineMenu"),
  runV02RouteOptions: document.querySelector("#runV02BaselineOptions"),
  runV02BaselineSelect: document.querySelector("#runV02BaselineSelect"),
  runV02BaselineControl: document.querySelector("#runV02BaselineControl"),
  runV02BaselineInput: document.querySelector("#runV02BaselineInput"),
  runV02BaselineMenu: document.querySelector("#runV02BaselineMenu"),
  runV02BaselineOptions: document.querySelector("#runV02BaselineOptions"),
  runV02TargetSelect: document.querySelector("#runV02TargetSelect"),
  runV02TargetControl: document.querySelector("#runV02TargetControl"),
  runV02TargetTags: document.querySelector("#runV02TargetTags"),
  runV02TargetInput: document.querySelector("#runV02TargetInput"),
  runV02TargetMenu: document.querySelector("#runV02TargetMenu"),
  runV02TargetOptions: document.querySelector("#runV02TargetOptions"),
  runV02RouteHint: document.querySelector("#runV02RouteHint"),
  runV02ProtocolPanel: document.querySelector("#runV02ProtocolPanel"),
  runV02ProtocolPicker: document.querySelector("#runV02ProtocolPicker"),
  runV02ProtocolMeta: document.querySelector("#runV02ProtocolMeta"),
  runV02ProtocolHint: document.querySelector("#runV02ProtocolHint"),
  runV02ChannelPanel: document.querySelector("#runV02ChannelPanel"),
  runV02ConfigPanel: document.querySelector("#runV02ConfigPanel"),
  runV02ChannelConfigs: document.querySelector("#runV02ChannelConfigs"),
  runV02CasePanel: document.querySelector("#runV02CasePanel"),
  runV02OemRuleBanner: document.querySelector("#runV02OemRuleBanner"),
  runV02SelectedRoute: document.querySelector("#runV02SelectedRoute"),
  runV02CaseGroupPicker: document.querySelector("#runV02CaseGroupPicker"),
  runV02CaseGroups: document.querySelector("#runV02CaseGroups"),
  runV02SelectedCaseCount: document.querySelector("#runV02SelectedCaseCount"),
  runV02CaseHint: document.querySelector("#runV02CaseHint"),
  runV02Tests: document.querySelector("#runV02Tests"),
  runV02StopTests: document.querySelector("#runV02StopTests"),
  runV02ProgressCount: document.querySelector("#runV02ProgressCount"),
  runV02ProgressCase: document.querySelector("#runV02ProgressCase"),
  runV02ProgressBar: document.querySelector("#runV02ProgressBar"),
  runV02RunLog: document.querySelector("#runV02RunLog"),
  proxySwitch: document.querySelector("#proxySwitch"),
  toast: document.querySelector("#toast"),
  channelCatalog: document.querySelector("#channelCatalog"),
  channelScopeNote: document.querySelector("#channelScopeNote"),
  protocolCatalog: document.querySelector("#protocolCatalog"),
  protocolScopeNote: document.querySelector("#protocolScopeNote"),
  modelLookup: document.querySelector("#modelLookup"),
  modelLookupAddTabModal: document.querySelector("#modelLookupAddTabModal"),
  modelLookupAddTabSummary: document.querySelector("#modelLookupAddTabSummary"),
  modelLookupAddTabBody: document.querySelector("#modelLookupAddTabBody"),
  modelLookupAddTabConfirm: document.querySelector("#modelLookupAddTabConfirm"),
  modelLookupAddTabDismiss: document.querySelector("#modelLookupAddTabDismiss"),
  protocolParamDrawer: document.querySelector("#protocolParamDrawer"),
  protocolParamDrawerTitle: document.querySelector("#protocolParamDrawerTitle"),
  protocolParamDrawerSummary: document.querySelector("#protocolParamDrawerSummary"),
  protocolParamDrawerBody: document.querySelector("#protocolParamDrawerBody"),
  errorCodeGuide: document.querySelector("#errorCodeGuide"),
  errorChannelScopeNote: document.querySelector("#errorChannelScopeNote"),
  errorCodeChannelCatalog: document.querySelector("#errorCodeChannelCatalog"),
  errorMappingScopeNote: document.querySelector("#errorMappingScopeNote"),
  errorCodeMappingCatalog: document.querySelector("#errorCodeMappingCatalog"),
  errorCodeMappingDrawer: document.querySelector("#errorCodeMappingDrawer"),
  errorCodeMappingDrawerTitle: document.querySelector("#errorCodeMappingDrawerTitle"),
  errorCodeMappingDrawerSummary: document.querySelector("#errorCodeMappingDrawerSummary"),
  errorCodeMappingDrawerBody: document.querySelector("#errorCodeMappingDrawerBody"),
  modelIntroDrawer: document.querySelector("#modelIntroDrawer"),
  modelIntroDrawerTitle: document.querySelector("#modelIntroDrawerTitle"),
  modelIntroDrawerSummary: document.querySelector("#modelIntroDrawerSummary"),
  modelIntroDrawerBody: document.querySelector("#modelIntroDrawerBody")
};

const state = {
  activeView: "run",
  activeViewKey: "run-v02",
  runToolVersion: "v0.2",
  channelCatalogTab: "oem",
  channelCatalogExpanded: false,
  protocolCatalogTab: "chat_completions",
  protocolCompareChannels: {},
  protocolCompareChannelOrder: {},
  protocolMatrices: {},
  protocolParamDrawerOpen: false,
  protocolParamCollapse: new Set(),
  protocolParamTreeExpand: new Set(),
  errorCodeChannelTab: "deepseek",
  errorCodeCompareChannels: null,
  errorCodeMappingDrawerOpen: false,
  errorCodeMappingDrawerContext: null,
  modelIntroDrawerOpen: false,
  modelLookupQuery: "",
  modelLookupVendorId: "",
  modelLookupAddMode: false,
  modelLookupResult: null,
  modelLookupLoading: false,
  modelLookupRequestId: 0,
  modelLookupAddTabPrompt: null,
  modelLookupAddTabDismissed: loadModelLookupAddTabDismissed(),
  selectedChannelId: "siliconflow",
  selectedEndpointId: "chat_completions",
  selectedFilter: "all",
  visibleResults: [],
  completedResults: [],
  batchRunRecords: [],
  batchModeEnabled: false,
  providerCases: {},
  selectedBaselineReportId: "",
  customCases: [],
  selectedCaseIds: new Set(),
  expandedCaseId: null,
  expandedHistoryId: null,
  expandedChannelReportId: null,
  lastRunProxy: null,
  lastReportRecord: null,
  expandedChannelPerfReportId: null,
  historyFilters: {
    channel: "all",
    model: "all",
    endpoint: "all"
  },
  isCaseLoading: false,
  timer: null,
  currentRunAbortController: null,
  isRunning: false,
  runV02: {
    modelId: "",
    protocolId: "",
    modelCapabilities: {
      tools: null
    },
    routeOptions: [],
    baselineRouteKey: "",
    baselineRoute: null,
    targetRouteKeys: new Set(),
    channelConfigs: {},
    baselineResults: {},
    cases: [],
    activeCaseGroupKey: "",
    selectedCaseIdsByGroup: {},
    modelSearch: "",
    baselineSearch: "",
    baselineMenuOpen: false,
    targetSearch: "",
    targetMenuOpen: false,
    isCaseLoading: false,
    isRunning: false,
    completedResults: [],
    currentRunAbortController: null,
    runProgress: { count: 0, total: 0, label: "准备中" },
    runMeta: null,
    localConfigProviders: {}
  },
  channelPerf: {
    modelId: "",
    protocolId: "",
    routeOptions: [],
    baselineRouteKey: "",
    baselineRoute: null,
    targetRouteKeys: new Set(),
    channelConfigs: {},
    benchmark: { ...window.NOCTUA_CHANNEL_PERFORMANCE?.DEFAULT_BENCHMARK },
    localConfigProviders: {},
    modelSearch: "",
    baselineSearch: "",
    baselineMenuOpen: false,
    targetSearch: "",
    targetMenuOpen: false,
    modelMenuOpen: false,
    isRunning: false,
    completedResults: [],
    currentRunAbortController: null,
    runProgress: { count: 0, total: 0, label: "准备中" },
    runMeta: null,
    startedAt: null
  }
};

const appProtocol = window.location.protocol === "file:" ? "http:" : window.location.protocol;
const appHost = window.location.hostname || "localhost";
const appQuery = new URLSearchParams(window.location.search);
const API_BASE = appQuery.get("apiBase") || window.PROVIDER_DIFF_API_BASE || `${appProtocol}//${appHost}:8080`;
const BACKEND_UNAVAILABLE_MESSAGE = `后端未连接：无法访问 ${API_BASE}。请先启动 Go 后端（默认 8080），再运行测试。`;
const HISTORY_STORAGE_KEY = "noctua-history-v1";
const CHANNEL_REPORTS_STORAGE_KEY = "noctua-channel-reports-v1";
const CHANNEL_PERF_REPORTS_STORAGE_KEY = "noctua-channel-performance-reports-v1";
const FEISHU_CONFIG_STORAGE_KEY = "noctua-feishu-config-v1";
const EVALSCOPE_URL_STORAGE_KEY = "noctua-evalscope-url-v1";
const DEFAULT_EVALSCOPE_URL = appQuery.get("evalscopeUrl") || `${appProtocol}//${appHost}:9000/dashboard`;
const OPENCOMPASS_URL_STORAGE_KEY = "noctua-opencompass-url-v1";
const LEGACY_HISTORY_STORAGE_KEYS = ["llm-rosetta-history-v1", "providerx-history-v1"];
const LEGACY_FEISHU_CONFIG_STORAGE_KEYS = ["llm-rosetta-feishu-config-v1", "providerx-feishu-config-v1"];
const LEGACY_EVALSCOPE_URL_STORAGE_KEYS = ["llm-rosetta-evalscope-url-v1", "providerx-evalscope-url-v1"];
const LEGACY_OPENCOMPASS_URL_STORAGE_KEYS = ["llm-rosetta-opencompass-url-v1", "providerx-opencompass-url-v1"];

function readStorageItem(key, legacyKeys = []) {
  let value = localStorage.getItem(key);
  if (value !== null && value !== "") return value;
  for (const legacyKey of legacyKeys) {
    if (!legacyKey) continue;
    const legacyValue = localStorage.getItem(legacyKey);
    if (legacyValue !== null && legacyValue !== "") {
      localStorage.setItem(key, legacyValue);
      return legacyValue;
    }
  }
  return value;
}
const DEFAULT_OPENCOMPASS_URL = appQuery.get("opencompassUrl") || `${appProtocol}//${appHost}:9100/`;
const MAX_HISTORY_ITEMS = 120;
const HISTORY_RAW_RESPONSE_LIMIT = 30000;
const MIN_BATCH_TARGETS = 2;
const MAX_BATCH_TARGETS = 3;
const HISTORY_STRING_LIMIT = 12000;
const runnableProviderByChannel = {
  claude: "claude",
  deepseek: "deepseek",
  minimax: "minimax",
  openrouter: "openrouter",
  thinking: "thinking",
  siliconflow: "siliconflow",
  silinex_overseas: "siliconflow",
  silinex_china: "siliconflow",
  aliyun: "ali",
  baidu: "baidu"
};

const statusMarks = {
  accepted: "✓",
  rejected: "✗",
  warning: "⚠",
  na: "?"
};

const supportConclusionMeta = PROVIDERX_RULES.SUPPORT_CONCLUSIONS || {
  supported: {
    label: "支持参数",
    shortLabel: "支持",
    badgeClass: "supported",
    status: "accepted",
    httpStatus: 200,
    note: "供应商接受该参数，响应结构基本可按 OpenAI-compatible 协议处理。"
  },
  ignored: {
    label: "不支持参数但不报错",
    shortLabel: "未证明",
    badgeClass: "ignored",
    status: "warning",
    httpStatus: 200,
    note: "请求不会 400，但参数可能被忽略或只产生供应商特有行为，需要在网关侧标记风险。"
  },
  rejected_400: {
    label: "不支持参数且 400",
    shortLabel: "400 报错",
    badgeClass: "rejected-400",
    status: "rejected",
    httpStatus: 400,
    note: "供应商明确拒绝该参数，网关侧需要过滤、降级或转换后再转发。"
  },
  request_failed: {
    label: "请求失败",
    shortLabel: "失败",
    badgeClass: "request-failed",
    status: "rejected",
    httpStatus: 0,
    note: "真实请求未完成，通常是 API Key、代理、网络或供应商临时错误；该结果不等同于参数不支持。"
  },
  permission_limited: {
    label: "账号权限受限",
    shortLabel: "权限受限",
    badgeClass: "permission-limited",
    status: "warning",
    httpStatus: 403,
    note: "case 本身需要特定模型、能力或账号权限；当前 API Key 无法访问，不能据此判断参数不支持。"
  },
  schema_mismatch: {
    label: "响应断言失败",
    shortLabel: "断言失败",
    badgeClass: "request-failed",
    status: "rejected",
    httpStatus: 200,
    note: "供应商返回了 2xx，但响应结构或参数语义断言未通过。"
  },
  unknown: {
    label: "未覆盖",
    shortLabel: "未覆盖",
    badgeClass: "unknown",
    status: "na",
    httpStatus: 0,
    note: "当前用例没有覆盖到明确结论。"
  }
};

const evidenceLevelMeta = PROVIDERX_RULES.EVIDENCE_LEVELS || {
  asserted: { label: "断言通过", badgeClass: "asserted", copy: "有响应和断言证据。" },
  observed: { label: "已观测", badgeClass: "observed", copy: "有响应证据，但断言较弱。" },
  inferred: { label: "推断", badgeClass: "inferred", copy: "基于预期或预览数据推断。" },
  none: { label: "无证据", badgeClass: "none", copy: "没有可用于判断的有效响应。" }
};
const gatewayActionMeta = PROVIDERX_RULES.GATEWAY_ACTIONS || {
  pass_through: { label: "放行", copy: "可作为低风险参数继续透传。" },
  strip_or_warn: { label: "提示/过滤", copy: "建议提示风险；必要时在网关侧过滤。" },
  strip_or_transform: { label: "过滤/转换", copy: "建议在网关侧过滤该参数，或转换为该 provider 支持的形态。" },
  adapter_required: { label: "适配", copy: "需要 provider-specific adapter 处理响应或参数语义。" },
  retry_or_review: { label: "重试/复核", copy: "先排查 Key、URL、模型、代理或权限，再做支持性判断。" },
  manual_review: { label: "人工确认", copy: "结论不足，需要补充 baseline 或定向 case。" }
};
const requiredOpenAiFields = new Set(PROVIDERX_RULES.REQUIRED_BASELINE_FIELDS || ["id", "object", "choices", "usage", "model"]);
const protocolCompareExcludedParameters = PROVIDERX_RULES.PROTOCOL_COMPARE_EXCLUDED_PARAMETERS || new Set();
const foundationalCaseParameters = new Set(["model", "messages"]);
const PINNED_BASELINE_IDS = {
  "deepseek:chat_completions": "report_original_deepseek_chat_completions_1780044160489",
  "deepseek:anthropic_messages": "report_original_deepseek_anthropic_messages_1780044176834",
  "minimax:chat_completions": "report_original_minimax_chat_completions_1780044268130",
  "minimax:anthropic_messages": "report_original_minimax_anthropic_messages_1780044307399",
  "siliconflow:chat_completions": "report_original_siliconflow_chat_completions_1780044822993",
  "siliconflow:anthropic_messages": "report_original_siliconflow_anthropic_messages_1780044894258",
  "ali:chat_completions": "report_original_ali_chat_completions_1780045286575",
  "ali:anthropic_messages": "report_original_ali_anthropic_messages_1780045326769"
};

const CAPACITY_CANDIDATES = [4194304, 2097152, 1048576, 524288, 262144, 131072, 65536, 32768, 16384, 8192, 4096, 2048, 1024];
const CONTEXT_CAPACITY_SAFETY_MARGIN_RATIO = 0.05;
const OUTPUT_EFFECTIVE_CAPS = [512, 64];
const THINKING_BUDGET_CANDIDATES = [32768, 16384, 8192, 4096, 2048, 1024, 512, 256, 128];

// thinking-budget dialect per 测评渠道 platform id; null = no token-budget field.
function thinkingBudgetFieldForProvider(providerId = "") {
  const id = String(providerId || "").toLowerCase();
  if (id.startsWith("minimax")) return null;
  if (id.startsWith("openrouter")) return { field: "reasoning.max_tokens", enableThinking: false };
  if (id.startsWith("deepseek")) return { field: "thinking.budget_tokens", enableThinking: false };
  if (id.startsWith("zhipu")) return { field: "thinking.budget_tokens", enableThinking: false };
  if (id.startsWith("claude")) return { field: "thinking.budget_tokens", enableThinking: false };
  // Qwen / SiliconFlow / 阿里百炼 / Kimi / StreamLake / vLLM style.
  return { field: "thinking_budget", enableThinking: true };
}

function formatCapacityTier(value) {
  const oneM = 1024 * 1024;
  if (value >= oneM && value % oneM === 0) return `${value / oneM}m`;
  if (value >= 1024 && value % 1024 === 0) return `${value / 1024}k`;
  if (value >= oneM) return `${trimNumber(value / oneM, 1)}m`;
  if (value >= 1024) return `${trimNumber(value / 1024, 1)}k`;
  return String(value);
}

function trimNumber(value, digits = 1) {
  return Number(value.toFixed(digits)).toString();
}

const RUN_V02_CONNECTIVITY_CASE_TITLE = '连通性检查：发"Hello"，确认该渠道能否调通。';
const RUN_V02_CONNECTIVITY_CASE_TOOLTIP =
  "该 Case 目的是用这个协议、这个 endpoint、这个模型，发一个最小合法请求，看能不能调通（HTTP 200 + 基本响应结构）。";

const RUN_V02_PROTOCOL_STREAM_BASIC_TITLE = "流式检查：开启流式（stream=true），确认能正常收到流式数据。";
const RUN_V02_PROTOCOL_STREAM_FALSE_TITLE = "非流式检查：显式关闭流式（stream=false），确认返回普通 JSON。";
const RUN_V02_PROTOCOL_STREAM_USAGE_TITLE = "流式用量：include_usage=true 时最后一包应返回 usage。";
const RUN_V02_PROTOCOL_STREAM_USAGE_OBSERVED_TITLE = "流式用量：不传 include_usage 时是否仍返回 usage。";
const RUN_V02_PROTOCOL_STREAM_USAGE_CHUNK_SHAPE_TITLE = "流式用量 chunk 结构：usage 应在独立 chunk（choices:[]）中返回。";
const RUN_V02_PROTOCOL_STREAM_BASIC_TOOLTIP =
  "该 Case 在 stream=true 时验证是否返回 SSE（流式推送）数据、chunk（数据块）结构是否符合预期（如 choices[].delta，即增量内容），并检查至少 2 个增量 chunk（content 正文或 reasoning_content 思考过程内容，防伪流式）；默认探测 1 次。";
const RUN_V02_PROTOCOL_STREAM_FALSE_TOOLTIP =
  "该 Case 在 stream=false 时验证响应为普通 JSON（非 SSE 流式推送），结构含 choices / usage 等字段。";
const RUN_V02_PROTOCOL_STREAM_USAGE_TOOLTIP =
  "该 Case 在 stream_options.include_usage=true（让流式响应带 token 用量统计）时验证流式最后一包必须包含 usage（用量统计）字段；用于与「不传 include_usage」观测 case 成对对比各渠道行为。";
const RUN_V02_PROTOCOL_STREAM_USAGE_OBSERVED_TOOLTIP =
  "该 Case 在 stream=true 且未传 stream_options.include_usage（让流式响应带 token 用量统计的开关）时观测 SSE（流式推送）响应是否含 usage（始终 pass，结果中查看「流式 usage：有/无」）；用于对比阿里等需显式开启的渠道与始终返回 usage 的渠道。";
const RUN_V02_PROTOCOL_STREAM_USAGE_CHUNK_SHAPE_TOOLTIP =
  "该 Case 在 stream_options.include_usage=true（让流式响应带 token 用量统计）时严格验证 usage 分片结构：规范实现应在 finish_reason（结束原因）chunk（数据块）之后、data: [DONE] 之前单独返回 choices:[] + usage 的 chunk；若 usage 与 finish_reason 合并在同一 chunk（如 DS 官方 API）则 fail。结果中可查看「流式 usage 分片」分类。";

const RUN_V02_PROTOCOL_SAMPLING_TOOLTIP =
  "对照该渠道官方文档中 temperature 的类型与取值范围；JSON integer（整数写法 1、2）与 float（小数写法 1.0、2.0）是否等价由实测判定。";

const RUN_V02_PROTOCOL_THINKING_TOOLTIP =
  "对照思考开关字段是否被接受；开启 case 预期响应含 reasoning/thinking（思考过程）内容且 usage 中 reasoning_tokens 或 thinking_tokens > 0；关闭 case 预期无 thinking 内容与正数 token 计量。";

const RUN_V02_PROTOCOL_TOOLS_TOOLTIP =
  "探测渠道是否接受 tools 参数并能真正发起工具调用。";

const RUN_V02_TOOLS_AUTO_TITLE = "tools + tool_choice auto · 渠道应接受 tools 参数（模型可直接回答，不强制调用）";
const RUN_V02_TOOLS_REQUIRED_TITLE = "tool_choice required/any · 必须返回 tool_calls 或 tool_use";
const RUN_V02_TOOLS_MULTITURN_TITLE = "多轮回放：messages 已含 assistant 的 tool_calls + role=tool 执行结果，接口应能继续生成";
const RUN_V02_TOOLS_CHOICE_NONE_TITLE = "tool_choice none · 传入 tools 但禁止调用，不应返回 tool_calls";
const RUN_V02_TOOLS_NAMED_FUNCTION_TITLE = "tool_choice 指定函数名 · 必须调用 compatibility_status（不能只调别的工具）";
const RUN_V02_TOOLS_PARALLEL_FALSE_TITLE = "parallel_tool_calls=false · 渠道应接受该参数";
const RUN_V02_TOOLS_REASONING_CONTENT_REPLAY_TITLE = "思考模式 + 工具调用：messages 须原样回传 assistant 的 reasoning_content";

const RUN_V02_TOOLS_AUTO_TOOLTIP =
  "传入 tools 列表与 tool_choice=auto。只验证接口是否接受参数并返回 200；模型可以选择直接文字回答，也可以返回 tool_calls。";
const RUN_V02_TOOLS_REQUIRED_TOOLTIP =
  "tool_choice 设为 required（Chat）或 any（Messages），强制模型必须发起一次工具调用。通过与否看响应里是否出现 tool_calls / tool_use——这是「渠道是否真正支持工具调用」的核心探针。";
const RUN_V02_TOOLS_MULTITURN_TOOLTIP =
  "模拟 Agent 第 2 轮请求：messages 里已经写好完整工具调用历史——用户提问 → assistant 返回 tool_calls → 你用 role=tool 消息带回执行结果（含 tool_call_id）→ 再请模型总结。本 case 不发 tools 字段，只验证渠道是否接受这种多轮历史并能继续生成回复。";
const RUN_V02_TOOLS_CHOICE_NONE_TOOLTIP =
  "同时传 tools 与 tool_choice=none，要求模型不要调用工具。验证渠道是否支持「有工具声明但禁用调用」，且响应中不应出现 tool_calls。";
const RUN_V02_TOOLS_NAMED_FUNCTION_TOOLTIP =
  "tool_choice 不只写 required，而是精确指定函数名（Chat: {type:function, function:{name:...}}；Messages: {type:tool, name:...}）。验证渠道是否按名称路由到 compatibility_status，而不是随便调别的工具或直接文字回答。";
const RUN_V02_TOOLS_PARALLEL_FALSE_TOOLTIP =
  "在 tools 请求中额外传 parallel_tool_calls=false。验证渠道文档列出的该参数是否被接受。";
const RUN_V02_TOOLS_REASONING_CONTENT_REPLAY_TOOLTIP =
  "模拟思考模式下的 Agent 第 2 轮：上一轮 assistant 同时返回 reasoning_content（思考过程内容）与 tool_calls，你在后续请求的 messages 里必须原样带回这段 reasoning_content（不能只留 tool_calls）。DeepSeek 等文档明确：缺了会 400；本 case 验证正确回传时接口能否继续生成。";

const RUN_V02_RESPONSE_FORMAT_TEXT_TITLE = "response_format=text · 渠道应接受 text 输出格式";
const RUN_V02_RESPONSE_FORMAT_JSON_OBJECT_TITLE = "response_format=json_object · 渠道应接受并返回合法 JSON";
const RUN_V02_RESPONSE_FORMAT_JSON_SCHEMA_TITLE = "response_format=json_schema · 渠道应接受并按 schema 返回 JSON";

const RUN_V02_RESPONSE_FORMAT_TEXT_TOOLTIP =
  "传 response_format.type=text，验证接口是否接受该参数并正常返回 200。";
const RUN_V02_RESPONSE_FORMAT_JSON_OBJECT_TOOLTIP =
  "传 response_format.type=json_object，并在 prompt 中要求 JSON；验证接受性与 assistant content 是否为合法 JSON。";
const RUN_V02_RESPONSE_FORMAT_JSON_SCHEMA_TOOLTIP =
  "传 response_format.type=json_schema 与 strict schema；验证接受性、JSON 合法性及 required 字段是否齐全。";
const RUN_V02_PROTOCOL_RESPONSE_FORMAT_TOOLTIP =
  "探测各渠道对 response_format 的接受性与 JSON 输出质量；不含 structured_outputs 等其他输出控制参数。";

const RUN_V02_OUTPUT_LENGTH_ACCEPT_MAX_TOKENS_TITLE = "接受性：传 max_tokens 限制输出，接口应正常返回。";
const RUN_V02_OUTPUT_LENGTH_ACCEPT_MAX_COMPLETION_TITLE = "接受性：传 max_completion_tokens 限制输出，接口应正常返回。";
const RUN_V02_OUTPUT_LENGTH_EFFECTIVE_MAX_TOKENS_TITLE = "生效性：仅 max_tokens=64 强制长输出，应被截断。";
const RUN_V02_OUTPUT_LENGTH_EFFECTIVE_MAX_COMPLETION_TITLE = "生效性：仅 max_completion_tokens=64 强制长输出，应被截断。";
const RUN_V02_OUTPUT_LENGTH_PRECEDENCE_TITLE = "双参优先级：max_tokens=64 vs max_completion_tokens=512，观测谁控制输出截断。";
const RUN_V02_OUTPUT_LENGTH_STOP_MAX_TOKENS_TITLE = "组合：max_tokens 与 stop 同时传入是否可用。";
const RUN_V02_OUTPUT_LENGTH_STOP_MAX_COMPLETION_TITLE = "组合：max_completion_tokens 与 stop 同时传入是否可用。";
const RUN_V02_OUTPUT_LENGTH_EDGE_DEPRECATED_MAX_TOKENS_TITLE = "边缘：废弃字段 max_tokens 是否仍接受。";
const RUN_V02_OUTPUT_LENGTH_EDGE_MAX_TOKENS_NULL_TITLE = "边缘：max_tokens=null 是否接受。";
const RUN_V02_OUTPUT_LENGTH_EDGE_MAX_COMPLETION_COMPAT_TITLE = "边缘：max_completion_tokens 兼容别名是否接受。";
const RUN_V02_OUTPUT_LENGTH_CAPACITY_INPUT_TITLE = "容量：探测最大可接受输入长度。";
const RUN_V02_OUTPUT_LENGTH_CAPACITY_OUTPUT_TITLE = "容量：探测最大可接受输出上限（对照 Max completion）。";
const RUN_V02_OUTPUT_LENGTH_CAPACITY_CONTEXT_TITLE = "容量：探测最大总上下文（对照 Context）。";
const RUN_V02_OUTPUT_LENGTH_ACCEPT_MAX_TOKENS_TOOLTIP = "仅传 max_tokens，验证接口是否正常接受。";
const RUN_V02_OUTPUT_LENGTH_ACCEPT_MAX_COMPLETION_TOOLTIP = "仅传 max_completion_tokens，验证接口是否正常接受。";
const RUN_V02_OUTPUT_LENGTH_EFFECTIVE_MAX_TOKENS_TOOLTIP = "仅传 max_tokens=64 强制长输出，验证是否真限制输出（finish_reason 结束原因=length，即因达到长度上限被截断）。";
const RUN_V02_OUTPUT_LENGTH_EFFECTIVE_MAX_COMPLETION_TOOLTIP = "仅传 max_completion_tokens=64 强制长输出，验证是否真限制输出。";
const RUN_V02_OUTPUT_LENGTH_PRECEDENCE_TOOLTIP = "双参同时传入并强制长输出，观测哪个字段控制输出截断（输出上限字段）。";
const RUN_V02_OUTPUT_LENGTH_STOP_MAX_TOKENS_TOOLTIP = "同时传 max_tokens 与 stop，验证组合是否被接受。";
const RUN_V02_OUTPUT_LENGTH_STOP_MAX_COMPLETION_TOOLTIP = "同时传 max_completion_tokens 与 stop，验证组合是否被接受。";
const RUN_V02_OUTPUT_LENGTH_EDGE_DEPRECATED_TOOLTIP = "文档推荐 max_completion_tokens 的渠道，探测废弃字段 max_tokens 是否仍接受。";
const RUN_V02_OUTPUT_LENGTH_EDGE_NULL_TOOLTIP = "传 max_tokens=null，验证空值处理。";
const RUN_V02_OUTPUT_LENGTH_EDGE_COMPAT_TOOLTIP = "max_tokens 渠道探测 max_completion_tokens 是否作为兼容别名被接受。";
const RUN_V02_OUTPUT_LENGTH_CAPACITY_TOOLTIP =
  "按档位爬升探测输入/输出/总上下文上限，耗时较长；可与模型介绍 OpenRouter 基线对照。";

const LENGTH_AXIS_ORDER = ["accept", "effective", "precedence", "stop_combo", "edge", "capacity"];
const LENGTH_AXIS_LABELS = {
  accept: "接受性",
  effective: "生效性",
  precedence: "双参优先级",
  stop_combo: "与 stop 组合",
  edge: "兼容 / 边缘",
  capacity: "容量边界"
};
const LENGTH_AXIS_HINTS = {
  accept: "各字段单独传参，验证接口是否接受（HTTP 200）",
  effective: "小 cap + 强制长输出，验证参数是否真限制输出",
  precedence: "两字段同时传入且取值冲突，观测谁控制截断",
  stop_combo: "输出上限字段与 stop 同时传入是否可用",
  edge: "废弃字段、空值、兼容别名等边缘行为",
  capacity: "探测最大输入/输出/上下文，默认不勾选"
};

// Legacy aliases for caseTitleZh entries that still reference old constant names.
const RUN_V02_OUTPUT_LENGTH_ACCEPTANCE_MAX_TOKENS_TITLE = RUN_V02_OUTPUT_LENGTH_ACCEPT_MAX_TOKENS_TITLE;
const RUN_V02_OUTPUT_LENGTH_ACCEPTANCE_MAX_COMPLETION_TOKENS_TITLE = RUN_V02_OUTPUT_LENGTH_ACCEPT_MAX_COMPLETION_TITLE;
const RUN_V02_OUTPUT_LENGTH_DEPRECATED_MAX_TOKENS_TITLE = RUN_V02_OUTPUT_LENGTH_EDGE_DEPRECATED_MAX_TOKENS_TITLE;
const RUN_V02_OUTPUT_LENGTH_MAX_TOKENS_NULL_TITLE = RUN_V02_OUTPUT_LENGTH_EDGE_MAX_TOKENS_NULL_TITLE;
const RUN_V02_OUTPUT_LENGTH_MAX_TOKENS_STOP_TITLE = RUN_V02_OUTPUT_LENGTH_STOP_MAX_TOKENS_TITLE;
const RUN_V02_OUTPUT_LENGTH_MAX_COMPLETION_STOP_TITLE = RUN_V02_OUTPUT_LENGTH_STOP_MAX_COMPLETION_TITLE;
const RUN_V02_OUTPUT_LENGTH_MAX_COMPLETION_COMPAT_TITLE = RUN_V02_OUTPUT_LENGTH_EDGE_MAX_COMPLETION_COMPAT_TITLE;
const RUN_V02_OUTPUT_LENGTH_MAX_TOKENS_ONLY_EFFECTIVE_TITLE = RUN_V02_OUTPUT_LENGTH_EFFECTIVE_MAX_TOKENS_TITLE;
const RUN_V02_OUTPUT_LENGTH_MAX_COMPLETION_ONLY_EFFECTIVE_TITLE = RUN_V02_OUTPUT_LENGTH_EFFECTIVE_MAX_COMPLETION_TITLE;

const RUN_V02_CACHE_PASSIVE_TITLE = "被动缓存：长固定前缀重复请求 · 第二次相同请求 usage 中 cached_tokens 或 prompt_cache_hit_tokens > 0";
const RUN_V02_CACHE_PROMPT_KEY_TITLE = "显式缓存：prompt_cache_key · 第二次相同键请求 usage 中 cached_tokens 或 prompt_cache_hit_tokens > 0";
const RUN_V02_CACHE_CONTROL_TITLE = "显式缓存：cache_control ephemeral · 第二次相同请求 usage 中 cached_tokens 或 prompt_cache_hit_tokens > 0";
const RUN_V02_CACHE_PASSIVE_TOOLTIP =
  "发送相同的长固定前缀请求 2 次（间隔约 400ms）：第 1 次预热，第 2 次从 usage 读取 cached_tokens / prompt_cache_hit_tokens 并计算命中率；用于对比同一模型在不同渠道的被动缓存效果。";
const RUN_V02_CACHE_PROMPT_KEY_TOOLTIP =
  "在长前缀请求上附加稳定 prompt_cache_key，重复 2 次后测量命中率；适用于 OpenAI 等支持 prompt cache key 的渠道。";
const RUN_V02_CACHE_CONTROL_TOOLTIP =
  "在可缓存内容块上设置 cache_control.type=ephemeral，重复 2 次后测量命中率；适用于 Anthropic Messages 与 Chat Completions 显式缓存方言。";

const RUN_V02_CACHE_PASSIVE_HIT_RATE_85_TITLE = "被动缓存：长固定前缀重复请求 · 第二次相同请求缓存命中率 ≥ 85%";
const RUN_V02_CACHE_PROMPT_KEY_HIT_RATE_85_TITLE = "显式缓存：prompt_cache_key · 第二次相同键请求缓存命中率 ≥ 85%";
const RUN_V02_CACHE_CONTROL_HIT_RATE_85_TITLE = "显式缓存：cache_control ephemeral · 第二次相同请求缓存命中率 ≥ 85%";
const RUN_V02_CACHE_HIT_RATE_85_TOOLTIP =
  "与对应观测 case 相同请求，但断言第二次请求的缓存命中率必须 ≥ 85%；未达标或无缓存统计字段判为预期外（fail），默认不勾选。";

const CACHE_CASE_TITLES = {
  cache_passive_long_prompt: RUN_V02_CACHE_PASSIVE_TITLE,
  cache_prompt_cache_key: RUN_V02_CACHE_PROMPT_KEY_TITLE,
  cache_control_ephemeral: RUN_V02_CACHE_CONTROL_TITLE,
  cache_passive_hit_rate_85: RUN_V02_CACHE_PASSIVE_HIT_RATE_85_TITLE,
  cache_prompt_cache_key_hit_rate_85: RUN_V02_CACHE_PROMPT_KEY_HIT_RATE_85_TITLE,
  cache_control_ephemeral_hit_rate_85: RUN_V02_CACHE_CONTROL_HIT_RATE_85_TITLE
};

/** V0.2 协议/思考模式：跨渠道 canonical 组合探针（payloads/thinking）。 */
const PROTOCOL_THINKING_CANONICAL_CASE_IDS = new Set([
  "thinking_enable_thinking_true",
  "thinking_enable_thinking_false",
  "thinking_switch_alt_thinking_enabled",
  "thinking_switch_alt_thinking_disabled",
  "thinking_switch_conflict_enable_off_thinking_on",
  "thinking_switch_conflict_enable_on_thinking_off",
  "thinking_budget_only",
  "thinking_thinking_budget_low",
  "thinking_thinking_budget_high",
  "thinking_enable_thinking_with_budget",
  "thinking_enable_thinking_budget_effort",
  "thinking_object_enabled",
  "thinking_object_disabled",
  "thinking_object_adaptive",
  "thinking_object_enabled_budget_tokens",
  "thinking_reasoning_effort_medium",
  "thinking_reasoning_effort_default",
  "thinking_reasoning_effort_none",
  "thinking_reasoning_effort_low",
  "thinking_reasoning_effort_high",
  "thinking_reasoning_effort_xhigh",
  "thinking_reasoning_effort_max",
  "thinking_reasoning_object_effort_summary",
  "thinking_reasoning_object_effort_none",
  "thinking_reasoning_object_enabled",
  "thinking_reasoning_object_disabled",
  "thinking_reasoning_split_true",
  "thinking_reasoning_split_false"
]);

/** V0.2 协议/工具调用：跨渠道 canonical 组合探针（payloads/tools）。 */
const PROTOCOL_TOOLS_CANONICAL_CASE_IDS = new Set([
  "tools_auto",
  "tools_choice_required",
  "tools_multiturn_tool_result",
  "tools_choice_none",
  "tools_named_function",
  "tools_parallel_false",
  "tools_reasoning_content_replay"
]);

/** V0.2 协议/输出控制：跨渠道 canonical response_format 探针（payloads/response_format）。 */
const PROTOCOL_RESPONSE_FORMAT_CANONICAL_CASE_IDS = new Set([
  "response_format_text",
  "response_format_json_object",
  "response_format_json_schema"
]);

/** 与 080/081 同语义、不同 prompt 的旧 case；协议分组统一用 080/081。 */
const LEGACY_SWITCH_CASE_IDS = new Set([
  "thinking_object_enabled",
  "thinking_object_disabled"
]);

const UNIVERSAL_SWITCH_FIELD_ORDER = ["enable_thinking", "thinking.type"];

/**
 * 各测评渠道官方文档的思考模式方言：用于 UI 分区展示与报告标注。
 * 不以文档矩阵裁剪 canonical case——含枚举值参数在内的探针全量展示，以跑批实测为准。
 */
const THINKING_CHANNEL_DIALECTS = {
  aliyun: {
    switchDialect: "qwen_enable_thinking", switchField: "enable_thinking", switchValues: ["true", "false"],
    alternateSwitchDialects: [
      { dialect: "thinking_object", field: "thinking.type", values: ["enabled", "disabled"] }
    ],
    intensityDialect: "qwen_enable_thinking", intensityField: "thinking_budget"
  },
  siliconflow: {
    switchDialect: "qwen_enable_thinking", switchField: "enable_thinking", switchValues: ["true", "false"],
    intensityDialect: "qwen_enable_thinking", intensityField: "thinking_budget"
  },
  streamlake: {
    switchDialect: "qwen_enable_thinking", switchField: "enable_thinking", switchValues: ["true", "false"]
  },
  deepseek: {
    switchDialect: "thinking_object", switchField: "thinking.type", switchValues: ["enabled", "disabled"],
    intensityDialect: "reasoning_effort", intensityField: "reasoning_effort"
  },
  zhipu: {
    switchDialect: "thinking_object", switchField: "thinking.type", switchValues: ["enabled", "disabled"],
    intensityDialect: "reasoning_effort", intensityField: "reasoning_effort"
  },
  minimax: {
    switchDialect: "thinking_object", switchField: "thinking.type", switchValues: ["adaptive", "disabled"],
    outputDialect: "reasoning_split", outputField: "reasoning_split"
  },
  openrouter: {
    switchDialect: "reasoning_object", switchField: "reasoning", switchValues: ["enabled", "disabled"],
    intensityDialect: "reasoning_object", intensityField: "reasoning.effort"
  }
};

function oemBehaviorsApi() {
  return window.NOCTUA_MODEL_OEM_BEHAVIORS || {};
}

const THINKING_AXIS_ORDER = ["switch", "switch_equiv", "switch_conflict", "intensity", "output"];

const THINKING_AXIS_LABELS = {
  switch: "思考开关",
  switch_equiv: "开关备选方言（等价对照）",
  switch_conflict: "开关冲突探针",
  intensity: "思考强度 / 预算",
  output: "思考输出格式"
};

const THINKING_AXIS_HINTS = {
  switch: "开启 / 关闭思考模式（开启应有 thinking 内容与 usage token 计量；关闭应无）",
  switch_equiv: "与主方言同 prompt 对照，检测「接受但不生效」",
  switch_conflict: "双参矛盾时观察渠道以哪个字段为准",
  intensity: "控制思考档位或 token 预算（应有 thinking 内容与 usage tokens；低档/高档可配对比对）",
  output: "控制 thinking 内容是否分离返回（reasoning_content/reasoning_details 等）"
};

const caseTitleZh = {
  ali_basic_minimal: RUN_V02_CONNECTIVITY_CASE_TITLE,
  ali_protocol_stream_basic: RUN_V02_PROTOCOL_STREAM_BASIC_TITLE,
  ali_protocol_stream_false: RUN_V02_PROTOCOL_STREAM_FALSE_TITLE,
  ali_protocol_stream_include_usage: RUN_V02_PROTOCOL_STREAM_USAGE_TITLE,
  ali_protocol_stream_usage_without_include_usage: RUN_V02_PROTOCOL_STREAM_USAGE_OBSERVED_TITLE,
  ali_protocol_stream_usage_chunk_shape: RUN_V02_PROTOCOL_STREAM_USAGE_CHUNK_SHAPE_TITLE,
  ali_length_max_tokens: RUN_V02_OUTPUT_LENGTH_ACCEPTANCE_MAX_TOKENS_TITLE,
  ali_length_max_completion_tokens: RUN_V02_OUTPUT_LENGTH_ACCEPTANCE_MAX_COMPLETION_TOKENS_TITLE,
  ali_length_max_tokens_stop: RUN_V02_OUTPUT_LENGTH_MAX_TOKENS_STOP_TITLE,
  ali_length_max_completion_tokens_stop: RUN_V02_OUTPUT_LENGTH_MAX_COMPLETION_STOP_TITLE,
  ali_length_both_fields_precedence: RUN_V02_OUTPUT_LENGTH_PRECEDENCE_TITLE,
  ali_length_max_tokens_only_effective: RUN_V02_OUTPUT_LENGTH_MAX_TOKENS_ONLY_EFFECTIVE_TITLE,
  ali_length_max_completion_tokens_only_effective: RUN_V02_OUTPUT_LENGTH_MAX_COMPLETION_ONLY_EFFECTIVE_TITLE,
  oa_length_max_completion_tokens: RUN_V02_OUTPUT_LENGTH_ACCEPTANCE_MAX_COMPLETION_TOKENS_TITLE,
  oa_length_deprecated_max_tokens: RUN_V02_OUTPUT_LENGTH_DEPRECATED_MAX_TOKENS_TITLE,
  oa_length_both_fields_precedence: RUN_V02_OUTPUT_LENGTH_PRECEDENCE_TITLE,
  oa_length_max_tokens_only_effective: RUN_V02_OUTPUT_LENGTH_MAX_TOKENS_ONLY_EFFECTIVE_TITLE,
  oa_length_max_completion_tokens_only_effective: RUN_V02_OUTPUT_LENGTH_MAX_COMPLETION_ONLY_EFFECTIVE_TITLE,
  oa_length_max_completion_tokens_stop: RUN_V02_OUTPUT_LENGTH_MAX_COMPLETION_STOP_TITLE,
  claude_length_max_completion_tokens: RUN_V02_OUTPUT_LENGTH_ACCEPTANCE_MAX_COMPLETION_TOKENS_TITLE,
  claude_length_max_tokens: RUN_V02_OUTPUT_LENGTH_DEPRECATED_MAX_TOKENS_TITLE,
  claude_length_both_fields_precedence: RUN_V02_OUTPUT_LENGTH_PRECEDENCE_TITLE,
  claude_length_max_tokens_only_effective: RUN_V02_OUTPUT_LENGTH_MAX_TOKENS_ONLY_EFFECTIVE_TITLE,
  claude_length_max_completion_tokens_only_effective: RUN_V02_OUTPUT_LENGTH_MAX_COMPLETION_ONLY_EFFECTIVE_TITLE,
  claude_length_max_completion_tokens_stop: RUN_V02_OUTPUT_LENGTH_MAX_COMPLETION_STOP_TITLE,
  minimax_length_max_completion_tokens: RUN_V02_OUTPUT_LENGTH_ACCEPTANCE_MAX_COMPLETION_TOKENS_TITLE,
  minimax_length_legacy_max_tokens_probe: RUN_V02_OUTPUT_LENGTH_DEPRECATED_MAX_TOKENS_TITLE,
  minimax_length_both_fields_precedence: RUN_V02_OUTPUT_LENGTH_PRECEDENCE_TITLE,
  minimax_length_max_tokens_only_effective: RUN_V02_OUTPUT_LENGTH_MAX_TOKENS_ONLY_EFFECTIVE_TITLE,
  minimax_length_max_completion_tokens_only_effective: RUN_V02_OUTPUT_LENGTH_MAX_COMPLETION_ONLY_EFFECTIVE_TITLE,
  minimax_length_max_completion_tokens_stop: RUN_V02_OUTPUT_LENGTH_MAX_COMPLETION_STOP_TITLE,
  or_length_max_completion_tokens: RUN_V02_OUTPUT_LENGTH_ACCEPTANCE_MAX_COMPLETION_TOKENS_TITLE,
  or_length_deprecated_max_tokens: RUN_V02_OUTPUT_LENGTH_DEPRECATED_MAX_TOKENS_TITLE,
  or_length_both_fields_precedence: RUN_V02_OUTPUT_LENGTH_PRECEDENCE_TITLE,
  openrouter_length_max_tokens_only_effective: RUN_V02_OUTPUT_LENGTH_MAX_TOKENS_ONLY_EFFECTIVE_TITLE,
  openrouter_length_max_completion_tokens_only_effective: RUN_V02_OUTPUT_LENGTH_MAX_COMPLETION_ONLY_EFFECTIVE_TITLE,
  or_length_max_completion_tokens_stop: RUN_V02_OUTPUT_LENGTH_MAX_COMPLETION_STOP_TITLE,
  deepseek_length_max_tokens: RUN_V02_OUTPUT_LENGTH_ACCEPTANCE_MAX_TOKENS_TITLE,
  deepseek_length_max_completion_tokens: RUN_V02_OUTPUT_LENGTH_ACCEPTANCE_MAX_COMPLETION_TOKENS_TITLE,
  deepseek_length_max_tokens_null: RUN_V02_OUTPUT_LENGTH_MAX_TOKENS_NULL_TITLE,
  deepseek_length_max_tokens_only_effective: RUN_V02_OUTPUT_LENGTH_MAX_TOKENS_ONLY_EFFECTIVE_TITLE,
  deepseek_length_max_completion_tokens_only_effective: RUN_V02_OUTPUT_LENGTH_MAX_COMPLETION_ONLY_EFFECTIVE_TITLE,
  deepseek_length_max_completion_tokens_stop: RUN_V02_OUTPUT_LENGTH_MAX_COMPLETION_STOP_TITLE,
  sf_length_max_tokens: RUN_V02_OUTPUT_LENGTH_ACCEPTANCE_MAX_TOKENS_TITLE,
  sf_length_max_completion_tokens: RUN_V02_OUTPUT_LENGTH_ACCEPTANCE_MAX_COMPLETION_TOKENS_TITLE,
  sf_length_max_tokens_stop: RUN_V02_OUTPUT_LENGTH_MAX_TOKENS_STOP_TITLE,
  sf_length_max_completion_tokens_stop: RUN_V02_OUTPUT_LENGTH_MAX_COMPLETION_STOP_TITLE,
  sf_length_max_tokens_only_effective: RUN_V02_OUTPUT_LENGTH_MAX_TOKENS_ONLY_EFFECTIVE_TITLE,
  sf_length_max_completion_tokens_only_effective: RUN_V02_OUTPUT_LENGTH_MAX_COMPLETION_ONLY_EFFECTIVE_TITLE,
  vllm_length_max_tokens: RUN_V02_OUTPUT_LENGTH_ACCEPTANCE_MAX_TOKENS_TITLE,
  vllm_length_max_completion_tokens: RUN_V02_OUTPUT_LENGTH_MAX_COMPLETION_COMPAT_TITLE,
  vllm_length_both_fields_precedence: RUN_V02_OUTPUT_LENGTH_PRECEDENCE_TITLE,
  vllm_length_max_tokens_only_effective: RUN_V02_OUTPUT_LENGTH_MAX_TOKENS_ONLY_EFFECTIVE_TITLE,
  vllm_length_max_completion_tokens_only_effective: RUN_V02_OUTPUT_LENGTH_MAX_COMPLETION_ONLY_EFFECTIVE_TITLE,
  vllm_length_max_completion_tokens_stop: RUN_V02_OUTPUT_LENGTH_MAX_COMPLETION_STOP_TITLE,
  capacity_max_input_boundary: RUN_V02_OUTPUT_LENGTH_CAPACITY_INPUT_TITLE,
  capacity_max_output_boundary: RUN_V02_OUTPUT_LENGTH_CAPACITY_OUTPUT_TITLE,
  capacity_total_context_boundary: RUN_V02_OUTPUT_LENGTH_CAPACITY_CONTEXT_TITLE,
  tools_auto: RUN_V02_TOOLS_AUTO_TITLE,
  tools_choice_required: RUN_V02_TOOLS_REQUIRED_TITLE,
  tools_multiturn_tool_result: RUN_V02_TOOLS_MULTITURN_TITLE,
  tools_choice_none: RUN_V02_TOOLS_CHOICE_NONE_TITLE,
  tools_named_function: RUN_V02_TOOLS_NAMED_FUNCTION_TITLE,
  tools_parallel_false: RUN_V02_TOOLS_PARALLEL_FALSE_TITLE,
  tools_reasoning_content_replay: RUN_V02_TOOLS_REASONING_CONTENT_REPLAY_TITLE,
  response_format_text: RUN_V02_RESPONSE_FORMAT_TEXT_TITLE,
  response_format_json_object: RUN_V02_RESPONSE_FORMAT_JSON_OBJECT_TITLE,
  response_format_json_schema: RUN_V02_RESPONSE_FORMAT_JSON_SCHEMA_TITLE,
  sf_basic_minimal: RUN_V02_CONNECTIVITY_CASE_TITLE,
  sf_basic_system_user: "system 和 user 消息",
  sf_basic_multimessage_context: "多条历史消息作为上下文",
  sf_sampling_temperature_low: "temperature 低值采样",
  sf_sampling_top_p: "top_p 采样",
  sf_sampling_top_k: "top_k 扩展采样",
  sf_sampling_min_p: "min_p 扩展采样",
  sf_sampling_frequency_penalty: "frequency_penalty 频率惩罚",
  sf_sampling_n_one: "n=1 单结果生成",
  sf_sampling_stop_string: "stop 字符串停止词",
  sf_sampling_stop_array: "stop 数组停止词",
  sf_sampling_stop_null: "stop=null / None",
  sf_sampling_combo_temperature_top_p: "temperature 与 top_p 组合",
  sf_sampling_combo_top_p_top_k_min_p: "top_p、top_k、min_p 组合",
  sf_sampling_combo_penalty_stop: "frequency_penalty 与 stop 组合",
  sf_reasoning_enable_thinking: "enable_thinking 推理开关",
  sf_reasoning_thinking_budget: "enable_thinking 与 thinking_budget",
  sf_reasoning_effort_medium: "reasoning_effort=medium",
  sf_reasoning_combo_budget_effort: "推理控制参数组合",
  sf_reasoning_disable_thinking_no_output: "关闭 enable_thinking 不输出推理",
  sf_response_format_text: "response_format=text",
  sf_response_format_json_object: "response_format=json_object",
  sf_response_format_json_schema: "response_format=json_schema",
  sf_tools_auto: "tools 与 tool_choice=auto",
  sf_tools_named_function_hint: "通过提示引导 function call",
  sf_tools_multiturn_tool_result: "带 tool 结果的多轮对话",
  sf_stream_basic: RUN_V02_PROTOCOL_STREAM_BASIC_TITLE,
  sf_protocol_stream_false: RUN_V02_PROTOCOL_STREAM_FALSE_TITLE,
  sf_stream_with_max_tokens: "stream 与 max_tokens 组合",
  sf_stream_with_tools_auto: "stream 与 tools 组合",
  sf_stream_include_usage: RUN_V02_PROTOCOL_STREAM_USAGE_TITLE,
  sf_stream_usage_chunk_shape: RUN_V02_PROTOCOL_STREAM_USAGE_CHUNK_SHAPE_TITLE,
  sf_multiturn_basic: "基础多轮对话",
  sf_multiturn_with_system_policy: "带 system 约束的多轮对话",
  sf_multiturn_json_object: "多轮对话与 json_object",
  sf_multiturn_reasoning: "多轮推理上下文",
  sf_multiturn_tools: "多轮 tools 工作流",
  sf_prefix_completion: "前缀续写",
  sf_observability_trace_header: "x-siliconcloud-trace-id 响应头",
  sf_observability_usage_fields: "非流式 usage 字段完整性",
  sf_multimodal_image_url: "VLM image_url 图像输入",
  sf_multimodal_multi_image_compare: "VLM 多图对比输入",
  am_basic_minimal: RUN_V02_CONNECTIVITY_CASE_TITLE,
  am_protocol_stream: RUN_V02_PROTOCOL_STREAM_BASIC_TITLE,
  am_protocol_stream_false: RUN_V02_PROTOCOL_STREAM_FALSE_TITLE,
  ali_protocol_sampling_temperature_1: "temperature=1（JSON integer），是否能请求成功",
  ali_protocol_sampling_temperature_2: "temperature=2（JSON integer），是否能请求成功",
  ali_protocol_sampling_temperature_1_0: "temperature=1.0（JSON float），是否能请求成功",
  ali_protocol_sampling_temperature_2_0: "temperature=2.0（JSON float），是否能请求成功",
  am_protocol_sampling_temperature_1: "temperature=1（JSON integer），是否能请求成功",
  am_protocol_sampling_temperature_2: "temperature=2（JSON integer），是否能请求成功",
  am_protocol_sampling_temperature_1_0: "temperature=1.0（JSON float），是否能请求成功",
  am_protocol_sampling_temperature_2_0: "temperature=2.0（JSON float），是否能请求成功",
  am_sampling_temperature: "Messages 接口接受 temperature",
  am_sampling_top_p: "Messages 接口接受 top_p",
  am_sampling_top_k: "Messages 接口接受 top_k 扩展参数",
  am_length_max_tokens: "max_tokens 应限制 Messages 输出长度",
  am_sampling_stop_sequences: "stop_sequences 停止词",
  am_tools_auto: "Messages 接口接受 tools",
  am_basic_system: "Messages 顶层 system 提示词",
  am_reasoning_thinking_budget: "推理模型 Messages 接口接受 thinking budget",
  am_reasoning_thinking_disabled: "Messages 接口关闭 thinking"
};

function providerIdForChannel(channelId = state.selectedChannelId) {
  const channel = CHANNEL_TEMPLATES.find((item) => item.channel_id === channelId);
  const endpoint = channel?.endpoints?.[state.selectedEndpointId];
  if (endpoint && endpoint.supported === false) return null;
  return endpoint?.provider_id || channel?.provider_id || runnableProviderByChannel[channelId] || null;
}

function currentProviderId() {
  return providerIdForChannel();
}

function channelForProvider(provider, endpointId = state.selectedEndpointId) {
  const normalizedProvider = String(provider || "").trim();
  if (!normalizedProvider) return null;
  return CHANNEL_TEMPLATES.find((channel) => {
    const endpoint = channel.endpoints?.[endpointId];
    return endpoint?.provider_id === normalizedProvider || channel.provider_id === normalizedProvider || runnableProviderByChannel[channel.channel_id] === normalizedProvider;
  }) || null;
}

function endpointTemplateById(endpointId) {
  return ENDPOINT_TEMPLATES.find((endpoint) => endpoint.endpoint_id === endpointId) || ENDPOINT_TEMPLATES[0];
}

const groupLabelZh = {
  Core: "核心参数",
  Content: "内容",
  Sampling: "采样参数",
  Length: "输出长度",
  Reasoning: "思考模式",
  Output: "输出控制",
  Tools: "工具调用",
  Protocol: "输出方式",
  Debug: "输出概率",
  Multimodal: "多模态",
  Metadata: "元数据",
  Extra: "扩展",
  Search: "搜索",
  Routing: "路由策略",
  Plugins: "插件",
  Observability: "可观测性",
  "Compatibility Probe": "兼容性探针",
  "Expected Rejected": "预期拒绝",
  Ignored: "文档标注忽略",
  Beta: "Beta",
  Template: "模板"
};

const groupHintZh = {
  Core: "指定用哪个模型、传入对话或输入内容",
  Sampling: "控制回复随机性与措辞风格，如 temperature、top_p",
  Length: "限制生成内容的长度上限",
  Reasoning: "控制是否思考、思考深度，以及思考内容如何返回；各渠道使用的参数字段不同",
  Output: "规定返回格式、结构化约束，以及音频/图像等非文本输出模态",
  Tools: "声明模型可调用的外部函数，以及调用方式",
  Protocol: "流式与非流式返回方式，以及 stream_options 等流式选项",
  Multimodal: "图片、音频等非纯文本输入相关字段",
  Search: "是否联网搜索及检索相关选项",
  Metadata: "用户标识、会话元数据、存储策略等旁路信息",
  Debug: "控制是否在响应中返回输出 token 的对数概率（logprobs / top_logprobs）",
  Extra: "平台特有或较少使用的扩展字段",
  Beta: "实验性参数，文档或行为可能变更",
  Template: "聊天模板与续写提示相关控制",
  Routing: "指定请求路由到哪家底层模型供应商",
  Plugins: "网页搜索、时间注入等增强插件能力",
  Observability: "追踪 ID、指纹、推理 token 统计等可观测字段",
  Ignored: "接口接受但文档标注为无实际效果",
  "Compatibility Probe": "跨渠道思考参数字段与能力差异探测",
  "Expected Rejected": "用于验证错误处理与拒绝逻辑的探针",
  Content: "消息内容与结构相关字段"
};

const originLabelZh = PROVIDERX_RULES.ORIGIN_LABELS || {
  "openai-standard": "OpenAI 标准",
  "provider-private": "非 OpenAI 标准",
  "anthropic-extension": "Anthropic 扩展",
  "qwen-extension": "Qwen 扩展",
  "siliconflow-extension": "非 OpenAI 标准",
  "siliconflow-observability": "SiliconFlow 可观测性",
  "deepseek-extension": "DeepSeek 扩展",
  "dashscope-private": "DashScope 私有",
  "minimax-private": "MiniMax 私有",
  "openrouter-extension": "OpenRouter 扩展",
  "openrouter-routing": "OpenRouter 路由",
  "openrouter-observability": "OpenRouter 可观测性",
  "anthropic-messages": "Anthropic Messages"
};

function getProxyConfig() {
  const enabled = Boolean(els.proxyEnabled?.checked);
  const url = (els.proxyUrl?.value || "").trim();
  return {
    enabled,
    url: enabled ? url : "",
    mode: enabled && url ? "proxy" : "direct"
  };
}

function proxySummary(proxy = getProxyConfig()) {
  if (!proxy.enabled) return "未启用代理，后端请求直连供应商。";
  if (!proxy.url) return "已启用代理，但 Proxy URL 为空。";
  return `已启用代理：${proxy.url}`;
}

function baselineLabel(record) {
  if (!record) return "No baseline";
  return `${record.channel_name || record.channel_id || "historical baseline"} / ${record.endpoint_label || record.endpoint_id || "Endpoint"}`;
}

function providerMatches(record, providerId, channelId) {
  if (!record || (!providerId && !channelId)) return false;
  const recordProvider = record.provider || runnableProviderByChannel[record.channel_id] || record.channel_id;
  return recordProvider === providerId || record.channel_id === channelId;
}

function baselineOptions(providerId = currentProviderId(), endpointId = state.selectedEndpointId) {
  const channelId = state.selectedChannelId;
  return readHistory()
    .filter((record) => record.endpoint_id === endpointId && historyRecordHasBaselinePayload(record))
    .filter((record) => providerMatches(record, providerId, channelId))
    .sort((left, right) => new Date(right.generated_at || 0) - new Date(left.generated_at || 0));
}

function pinnedBaselineId(providerId = currentProviderId(), endpointId = state.selectedEndpointId) {
  if (!providerId) return "";
  return PINNED_BASELINE_IDS[`${providerId}:${endpointId}`] || "";
}

function pinnedBaselineRecord(options = baselineOptions(), providerId = currentProviderId(), endpointId = state.selectedEndpointId) {
  const id = pinnedBaselineId(providerId, endpointId);
  if (!id) return null;
  return options.find((record) => record.id === id) || null;
}

function automaticBaselineRecord() {
  const options = baselineOptions();
  return pinnedBaselineRecord(options) || null;
}

function selectedBaselineRecord() {
  if (!state.selectedBaselineReportId) return automaticBaselineRecord();
  return baselineOptions().find((record) => record.id === state.selectedBaselineReportId) || automaticBaselineRecord();
}

function renderBaselineSelector() {
  if (!els.baselineReport) return;
  const options = baselineOptions();
  const selectedStillExists = options.some((record) => record.id === state.selectedBaselineReportId);
  if (!selectedStillExists) state.selectedBaselineReportId = "";
  const currentEndpointRecords = readHistory()
    .filter((record) => record.endpoint_id === state.selectedEndpointId)
    .filter((record) => providerMatches(record, currentProviderId(), state.selectedChannelId));
  const reportsWithoutPayload = currentEndpointRecords.filter((record) => !historyRecordHasBaselinePayload(record)).length;
  const pinned = pinnedBaselineRecord(options);
  const pinnedId = pinnedBaselineId();
  const defaultLabel = pinned
    ? "Default baseline"
    : reportsWithoutPayload
      ? `No usable baseline · ${reportsWithoutPayload} reports`
      : options.length
        ? "Choose baseline"
        : "No baseline";
  els.baselineReport.innerHTML = [
    `<option value="">${escapeHtml(defaultLabel)}</option>`,
    ...options.map((record) => `
      <option value="${escapeHtml(record.id)}" ${record.id === state.selectedBaselineReportId ? "selected" : ""}>
        ${record.id === pinnedId ? "Default" : "History"} · ${escapeHtml(record.model || "—")} · ${escapeHtml(formatDateTime(record.generated_at))}
      </option>
    `)
  ].join("");
  els.baselineReport.disabled = options.length === 0 || state.isRunning;
}

function renderProxyState() {
  const proxy = getProxyConfig();
  if (els.proxyEnabled) els.proxyEnabled.checked = proxy.enabled;
  if (els.proxySwitch) els.proxySwitch.classList.toggle("on", proxy.enabled);
  els.proxyUrl.disabled = !proxy.enabled;
  els.proxyHint.textContent = proxySummary(proxy);
}

function initTheme() {
  if (!els.themeToggle) return;
  const root = document.documentElement;
  const saved = localStorage.getItem("noctua-ds-theme");
  if (saved) root.setAttribute("data-theme", saved);
  const sync = () => {
    if (els.themeLabel) {
      els.themeLabel.textContent = root.getAttribute("data-theme") === "dark" ? "Light" : "Dark";
    }
  };
  sync();
  els.themeToggle.addEventListener("click", () => {
    const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    localStorage.setItem("noctua-ds-theme", next);
    sync();
  });
}

function renderEndpointTabs() {
  els.endpointTabs.innerHTML = ENDPOINT_TEMPLATES.map((endpoint) => `
    <button class="${endpoint.endpoint_id === state.selectedEndpointId ? "on" : ""}" type="button" data-endpoint-id="${escapeHtml(endpoint.endpoint_id)}">
      ${escapeHtml(endpoint.label)}
    </button>
  `).join("");
}

function getSelectedChannel() {
  return CHANNEL_TEMPLATES.find((channel) => channel.channel_id === state.selectedChannelId) || CHANNEL_TEMPLATES[0];
}

function getSelectedEndpointTemplate() {
  return ENDPOINT_TEMPLATES.find((endpoint) => endpoint.endpoint_id === state.selectedEndpointId) || ENDPOINT_TEMPLATES[0];
}

function getChannelEndpoint(channel = getSelectedChannel()) {
  return channel.endpoints?.[state.selectedEndpointId] || null;
}

function normalizeBaseUrlOption(option) {
  if (typeof option === "string") {
    return { label: option, value: option };
  }
  return {
    label: String(option?.label || option?.value || "").trim(),
    value: String(option?.value || option?.url || "").trim()
  };
}

function baseUrlOptionsForChannel(channel = getSelectedChannel()) {
  const endpoint = getChannelEndpoint(channel);
  const defaultValue = endpoint?.default_base_url || channel.default_base_url || "";
  const rawOptions = endpoint?.base_url_options || channel.base_url_options || [];
  const options = rawOptions.map(normalizeBaseUrlOption).filter((option) => option.value);
  if (defaultValue && !options.some((option) => option.value === defaultValue)) {
    options.unshift({ label: "默认", value: defaultValue });
  }
  return options;
}

function renderBaseUrlPreset(selectedValue = els.baseUrl?.value || "") {
  if (!els.baseUrlPreset) return;
  const options = baseUrlOptionsForChannel();
  const current = String(selectedValue || "").trim();
  const matched = options.find((option) => option.value === current);
  els.baseUrlPreset.disabled = state.isRunning || options.length === 0;
  els.baseUrlPreset.innerHTML = [
    `<option value="">自定义</option>`,
    ...options.map((option) => `<option value="${escapeHtml(option.value)}" ${matched?.value === option.value ? "selected" : ""}>${escapeHtml(option.label)}</option>`)
  ].join("");
  if (!matched) els.baseUrlPreset.value = "";
}

function setBaseUrlValue(value) {
  els.baseUrl.value = value || "";
  renderBaseUrlPreset(els.baseUrl.value);
}

function batchModeActive() {
  return Boolean(state.batchModeEnabled && (hasBatchTargetRows() || els.batchTargets?.value.trim()));
}

function renderBatchMode() {
  if (!els.batchModeToggle || !els.batchTargetsPanel) return;
  els.batchModeToggle.textContent = state.batchModeEnabled ? "关闭" : "开启";
  els.batchModeToggle.setAttribute("aria-pressed", state.batchModeEnabled ? "true" : "false");
  els.batchModeToggle.classList.toggle("on", state.batchModeEnabled);
  els.batchTargetsPanel.classList.toggle("is-hidden", !state.batchModeEnabled);
  if (state.batchModeEnabled) ensureBatchTargetRows();
  updateBatchTargetPlaceholders();
  renderBatchTargetControlState();
}

function renderBatchTargetControlState() {
  const disabled = state.isRunning || !state.batchModeEnabled;
  if (els.batchTargets) {
    els.batchTargets.disabled = disabled;
  }
  if (els.batchTargetRows) {
    els.batchTargetRows.querySelectorAll("input, button").forEach((control) => {
      control.disabled = disabled;
    });
  }
  if (els.batchAddTarget) {
    els.batchAddTarget.disabled = disabled || batchTargetDrafts().length >= MAX_BATCH_TARGETS;
  }
  if (els.batchImportTargets) {
    els.batchImportTargets.disabled = disabled;
  }
}

function hasBatchTargetRows() {
  return batchTargetDrafts().some((target) => target.base_url || target.api_key || target.model);
}

function defaultBatchTargetDrafts() {
  return [
    { base_url: "", api_key: "", model: els.modelName?.value.trim() || "" },
    { base_url: "", api_key: "", model: "" }
  ];
}

function ensureBatchTargetRows() {
  if (!els.batchTargetRows || els.batchTargetRows.children.length) return;
  setBatchTargetRows(defaultBatchTargetDrafts());
}

function renderBatchTargetRow(target = {}, index = 0) {
  const placeholders = batchTargetPlaceholders();
  return `
    <div class="batch-target-row" data-batch-target-row>
      <span class="batch-target-row__index">T${index + 1}</span>
      <label class="fld batch-target-field batch-target-field--url">
        <span>Base URL <em>可留空</em></span>
        <input class="inp mono" data-batch-field="base_url" value="${escapeHtml(target.base_url || "")}" placeholder="${escapeHtml(placeholders.base_url)}" />
      </label>
      <label class="fld batch-target-field batch-target-field--key">
        <span>API Key <em>可留空</em></span>
        <input class="inp mono" type="password" data-batch-field="api_key" value="${escapeHtml(target.api_key || "")}" placeholder="${escapeHtml(placeholders.api_key)}" autocomplete="off" />
      </label>
      <label class="fld batch-target-field batch-target-field--model">
        <span>Model</span>
        <input class="inp mono" data-batch-field="model" value="${escapeHtml(target.model || "")}" placeholder="${escapeHtml(placeholders.model)}" />
      </label>
      <button class="btn btn-ghost btn-xs batch-target-remove" type="button" data-remove-batch-target title="移除 target" aria-label="移除 target">×</button>
    </div>
  `;
}

function batchTargetPlaceholders() {
  return {
    base_url: els.baseUrl?.value.trim() || "https://api.siliconflow.cn/v1",
    api_key: els.apiKey?.value.trim() ? "使用上方 API Key" : "sk-...",
    model: els.modelName?.value.trim() || "deepseek-ai/DeepSeek-V4-Pro"
  };
}

function updateBatchTargetPlaceholders() {
  const placeholders = batchTargetPlaceholders();
  els.batchTargetRows?.querySelectorAll('[data-batch-field="base_url"]').forEach((input) => {
    input.placeholder = placeholders.base_url;
  });
  els.batchTargetRows?.querySelectorAll('[data-batch-field="api_key"]').forEach((input) => {
    input.placeholder = placeholders.api_key;
  });
  els.batchTargetRows?.querySelectorAll('[data-batch-field="model"]').forEach((input) => {
    input.placeholder = placeholders.model;
  });
}

function setBatchTargetRows(targets = []) {
  if (!els.batchTargetRows) return;
  const limitedTargets = targets.slice(0, MAX_BATCH_TARGETS);
  els.batchTargetRows.innerHTML = limitedTargets.map(renderBatchTargetRow).join("");
  renderBatchTargetControlState();
}

function batchTargetDrafts() {
  if (!els.batchTargetRows) return [];
  return Array.from(els.batchTargetRows.querySelectorAll("[data-batch-target-row]")).map((row) => ({
    base_url: row.querySelector('[data-batch-field="base_url"]')?.value.trim() || "",
    api_key: row.querySelector('[data-batch-field="api_key"]')?.value.trim() || "",
    model: row.querySelector('[data-batch-field="model"]')?.value.trim() || ""
  }));
}

function addBatchTargetRow(target = {}) {
  const drafts = batchTargetDrafts();
  if (drafts.length >= MAX_BATCH_TARGETS) return;
  setBatchTargetRows([...drafts, target]);
}

function removeBatchTargetRow(row) {
  const rows = Array.from(els.batchTargetRows?.querySelectorAll("[data-batch-target-row]") || []);
  const index = rows.indexOf(row);
  if (index < 0) return;
  const drafts = batchTargetDrafts();
  drafts.splice(index, 1);
  setBatchTargetRows(drafts.length ? drafts : defaultBatchTargetDrafts());
}

function batchTargetsFromRows() {
  const defaultBaseUrl = els.baseUrl?.value.trim() || "";
  return batchTargetDrafts()
    .filter((target) => target.model)
    .map((target, index) => normalizeBatchTarget({
      provider: currentProviderId(),
      base_url: target.base_url || defaultBaseUrl,
      api_key: target.api_key,
      model: target.model
    }, index));
}

function enforceBatchTargetCount(targets) {
  if (targets.length < MIN_BATCH_TARGETS) {
    throw new Error(`Batch 至少填写 ${MIN_BATCH_TARGETS} 个 target；只跑一个请关闭 Batch。`);
  }
  if (targets.length > MAX_BATCH_TARGETS) {
    throw new Error(`Batch 最多填写 ${MAX_BATCH_TARGETS} 个 target。`);
  }
  return targets;
}

function parseBatchTargetsFromText(raw) {
  const text = String(raw || "").trim();
  if (!text) return [];
  if (text.startsWith("[") || text.startsWith("{")) {
    const parsed = JSON.parse(text);
    const items = Array.isArray(parsed) ? parsed : parsed.targets;
    if (!Array.isArray(items)) {
      throw new Error("批量 JSON 需要是数组，或包含 targets 数组。");
    }
    return items.map((item, index) => normalizeBatchTarget(item, index));
  }
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line, index) => {
      const parts = line.includes("|")
        ? line.split("|")
        : line.split(/\t|,/);
      const compact = parts.map((part) => part.trim()).filter(Boolean);
      return parseDelimitedBatchTarget(compact, index);
    });
}

function importBatchTargetsFromText() {
  try {
    const targets = enforceBatchTargetCount(parseBatchTargetsFromText(els.batchTargets?.value || ""));
    setBatchTargetRows(targets);
    showToast(`已导入 ${targets.length} 个 target。`);
  } catch (error) {
    showToast(error.message);
  }
}

function parseBatchTargets() {
  if (!state.batchModeEnabled) return [];
  const rowTargets = batchTargetsFromRows();
  if (rowTargets.length >= MIN_BATCH_TARGETS) return enforceBatchTargetCount(rowTargets);
  const textTargets = parseBatchTargetsFromText(els.batchTargets?.value || "");
  if (textTargets.length) return enforceBatchTargetCount(textTargets);
  if (rowTargets.length) return enforceBatchTargetCount(rowTargets);
  throw new Error("已启用 Batch，请填写 2-3 个 target，或关闭 Batch。");
}

function looksLikeApiKey(value) {
  const text = String(value || "").trim();
  return /^(?:Bearer\s+)?sk-[A-Za-z0-9_-]{8,}$/i.test(text)
    || /^[A-Za-z0-9_-]{32,}$/.test(text);
}

function looksLikeBaseUrl(value) {
  return /^https?:\/\//i.test(String(value || "").trim());
}

function resolveModelAndApiKey(first, second) {
  const firstValue = String(first || "").trim();
  const secondValue = String(second || "").trim();
  const firstIsKey = looksLikeApiKey(firstValue);
  const secondIsKey = looksLikeApiKey(secondValue);
  if (firstIsKey && !secondIsKey) {
    return { api_key: firstValue, model: secondValue };
  }
  if (!firstIsKey && secondIsKey) {
    return { model: firstValue, api_key: secondValue };
  }
  if (!firstIsKey && !secondIsKey && secondValue.includes("/") && !firstValue.includes("/")) {
    return { api_key: firstValue, model: secondValue };
  }
  return { api_key: firstValue, model: secondValue };
}

function parseDelimitedBatchTarget(parts, index) {
  if (parts.length === 3) {
    return normalizeBatchTarget({
      provider: currentProviderId(),
      base_url: parts[0],
      ...resolveModelAndApiKey(parts[1], parts[2])
    }, index);
  }
  if (parts.length >= 4) {
    const firstIsUrl = looksLikeBaseUrl(parts[0]);
    const provider = firstIsUrl ? currentProviderId() : parts[0];
    const baseUrl = firstIsUrl ? parts[0] : parts[1];
    const modelKeyStart = firstIsUrl ? 1 : 2;
    return normalizeBatchTarget({
      provider,
      base_url: baseUrl,
      ...resolveModelAndApiKey(parts[modelKeyStart], parts[modelKeyStart + 1])
    }, index);
  }
  throw new Error(`批量 target 第 ${index + 1} 行格式不对，请使用 base_url | api_key | model。`);
}

function normalizeBatchTarget(item = {}, index = 0) {
  const provider = String(item.provider || item.provider_id || currentProviderId() || "").trim();
  const baseUrl = String(item.base_url || item.baseUrl || els.baseUrl?.value.trim() || "").trim();
  const model = String(item.model || "").trim();
  const apiKey = String(item.api_key || item.apiKey || "").trim();
  if (!provider) {
    throw new Error(`批量 target 第 ${index + 1} 行缺少 provider。`);
  }
  if (!baseUrl) {
    throw new Error(`批量 target 第 ${index + 1} 行缺少 base_url。`);
  }
  if (!model) {
    throw new Error(`批量 target 第 ${index + 1} 行缺少 model。`);
  }
  return {
    provider,
    endpoint_id: String(item.endpoint_id || item.endpointId || state.selectedEndpointId).trim(),
    base_url: baseUrl,
    model,
    api_key: apiKey
  };
}

function batchConcurrency() {
  const value = Number.parseInt(els.batchConcurrency?.value || "3", 10);
  if (!Number.isFinite(value)) return 3;
  return Math.max(1, Math.min(8, value));
}

function currentRunTargets(providerId, apiKey) {
  const batchTargets = parseBatchTargets();
  if (batchTargets.length) {
    const differentProvider = batchTargets.find((target) => target.provider && target.provider !== providerId);
    if (differentProvider) {
      throw new Error(`批量 Targets 当前按同 provider 并跑；请保持 provider=${providerId}，或省略 provider 字段。`);
    }
    return batchTargets.map((target) => ({
      ...target,
      provider: providerId,
      api_key: target.api_key || apiKey,
      endpoint_id: target.endpoint_id || state.selectedEndpointId
    }));
  }
  return [{
    provider: providerId,
    endpoint_id: state.selectedEndpointId,
    base_url: els.baseUrl.value.trim(),
    model: els.modelName.value.trim(),
    api_key: apiKey
  }];
}

function currentCaseCacheKey(providerId = currentProviderId()) {
  return providerId ? `${state.selectedEndpointId}:${providerId}` : "";
}

function endpointQuery() {
  return `endpoint_id=${encodeURIComponent(state.selectedEndpointId)}`;
}

function flattenParameters(channel) {
  const parametersByGroup = getChannelEndpoint(channel)?.parameters || channel.parameters || {};
  return Object.entries(parametersByGroup).flatMap(([category, parameters]) =>
    parameters.map((parameter) => ({ category, parameter }))
  );
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const NOCTUA_ICON_PATHS = {
  "chevron-down": "<path d=\"m6 9 6 6 6-6\"/>",
  "trash-2": "<path d=\"M3 6h18\"/><path d=\"M8 6V4h8v2\"/><path d=\"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6\"/><path d=\"M10 11v6\"/><path d=\"M14 11v6\"/>",
  copy: "<rect width=\"14\" height=\"14\" x=\"8\" y=\"8\" rx=\"2\" ry=\"2\"/><path d=\"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2\"/>",
  "external-link": "<path d=\"M15 3h6v6\"/><path d=\"M10 14 21 3\"/><path d=\"M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6\"/>",
  download: "<path d=\"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4\"/><path d=\"m7 10 5 5 5-5\"/><path d=\"M12 15V3\"/>",
  "file-text": "<path d=\"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z\"/><path d=\"M14 2v4a2 2 0 0 0 2 2h4\"/><path d=\"M10 9H8\"/><path d=\"M16 13H8\"/><path d=\"M16 17H8\"/>"
};

function renderIcon(name, { size = 16, className = "" } = {}) {
  const paths = NOCTUA_ICON_PATHS[name];
  if (!paths) return "";
  const classes = ["icon", className].filter(Boolean).join(" ");
  return `<svg class="${classes}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
}

function renderHiconButton({
  icon,
  extraClass = "",
  isOpen = false,
  title = "",
  ariaLabel = "",
  dataAttrs = {}
}) {
  const attrs = Object.entries(dataAttrs)
    .map(([key, value]) => `${key}="${escapeHtml(value)}"`)
    .join(" ");
  const label = ariaLabel || title;
  return `<button class="hicon ${extraClass}${isOpen ? " is-open" : ""}" type="button" ${attrs} title="${escapeHtml(title)}" aria-label="${escapeHtml(label)}">${renderIcon(icon)}</button>`;
}

function isFetchNetworkError(error) {
  const message = String(error?.message || "");
  return error?.name === "TypeError"
    && /failed to fetch|load failed|networkerror|network request failed/i.test(message);
}

function backendUnavailableError(cause) {
  const error = new Error(BACKEND_UNAVAILABLE_MESSAGE);
  error.isBackendUnavailable = true;
  error.cause = cause;
  return error;
}

async function ensureBackendReady(signal) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  const abortFromRun = () => controller.abort();
  if (signal?.aborted) {
    clearTimeout(timeout);
    const error = new Error("Run canceled");
    error.name = "AbortError";
    throw error;
  }
  signal?.addEventListener("abort", abortFromRun, { once: true });
  try {
    const response = await fetch(`${API_BASE}/healthz`, {
      cache: "no-store",
      signal: controller.signal
    });
    if (!response.ok) {
      throw new Error(`healthz HTTP ${response.status}`);
    }
  } catch (error) {
    if (signal?.aborted) throw error;
    throw backendUnavailableError(error);
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abortFromRun);
  }
}

function typeOf(value) {
  if (Array.isArray(value)) return "array";
  if (value === null) return "null";
  return typeof value;
}

function structuralShape(value, path = "", rows = new Map()) {
  const valueType = typeOf(value);
  if (path) rows.set(path, valueType);

  if (valueType === "object") {
    for (const [key, child] of Object.entries(value)) {
      structuralShape(child, path ? `${path}.${key}` : key, rows);
    }
  }

  if (valueType === "array" && value.length > 0) {
    structuralShape(value[0], `${path}[]`, rows);
  }

  return rows;
}

function compareStructure(baseline, channel) {
  const baseShape = structuralShape(baseline);
  const channelShape = structuralShape(channel);
  const diffs = [];

  for (const [path, expectedType] of baseShape.entries()) {
    if (!channelShape.has(path)) {
      diffs.push({
        kind: "missing",
        prefix: "-",
        path,
        type: expectedType,
        note: path.split(".")[0] === path ? "当前渠道缺失" : "缺失"
      });
      continue;
    }

    const actualType = channelShape.get(path);
    if (actualType !== expectedType) {
      diffs.push({
        kind: "type",
        prefix: "~",
        path,
        type: expectedType,
        note: `类型不一致：预期 ${expectedType}，实际 ${actualType}`
      });
    }
  }

  for (const [path, actualType] of channelShape.entries()) {
    if (!baseShape.has(path)) {
      diffs.push({
        kind: "extra",
        prefix: "+",
        path,
        type: actualType,
        note: "额外字段，baseline 中不存在"
      });
    }
  }

  return diffs;
}

function hasResponseBody(result) {
  return Object.prototype.hasOwnProperty.call(result || {}, "response_body") && result.response_body !== undefined && result.response_body !== null;
}

function matchingBaselineResult(result, baseline = selectedBaselineRecord()) {
  return baseline?.results?.find((item) => item.case_id === result.case_id && hasResponseBody(item)) || null;
}

function baselineResponseForResult(result, baseline = selectedBaselineRecord()) {
  const baselineResult = matchingBaselineResult(result, baseline);
  if (baselineResult) return baselineResult.response_body;
  return null;
}

function canonicalResultFromRaw(result = {}, fallback = {}) {
  const assertions = result.assertions || [];
  const failedAssertions = result.failed_assertions || result.failed || [];
  return {
    case_id: result.case_id || fallback.case_id || "",
    title: result.title || (result.source_case ? caseTitle(result.source_case) : "") || fallback.title || "",
    category: result.category || "case",
    parameters: result.parameters || [],
    parameter: result.parameter || (Array.isArray(result.parameters) && result.parameters.length ? result.parameters.join(" + ") : "payload"),
    support_conclusion: result.support_conclusion || result.conclusion || "unknown",
    status: result.status_label || result.status_text || "",
    http_status: result.http_status || result.status || 0,
    latency_ms: result.latency_ms || result.elapsed_ms || 0,
    diff_count: Number(result.diff_count || 0),
    message: result.message || result.error || "",
    request_headers: result.request_headers || null,
    request_body: result.request_body || null,
    response_body: hasResponseBody(result) ? result.response_body : null,
    raw_response: result.raw_response || "",
    response_headers: result.response_headers || null,
    assertions,
    failed_assertions: failedAssertions,
    source_case: result.source_case || fallback.source_case || null,
    expected_http_status: result.expected_http_status || 0,
    expected_support_conclusion: result.expected_support_conclusion || "",
    capability_status: result.capability_status || result.support_conclusion || result.conclusion || "unknown",
    expectation_result: result.expectation_result || "",
    evidence_level: result.evidence_level || "",
    gateway_action: result.gateway_action || "",
    error: result.error || "",
    reasoning_tokens: result.reasoning_tokens ?? null,
    thinking_tokens: result.thinking_tokens ?? null,
    stream_metrics: result.stream_metrics || null,
    stream_probe_attempts: result.stream_probe_attempts || null,
    stream_usage_present: result.stream_usage_present ?? null,
    stream_usage_chunk_profile: result.stream_usage_chunk_profile ?? null,
    stream_done_marker_present: result.stream_done_marker_present ?? null,
    output_length_cap_precedence: result.output_length_cap_precedence ?? null,
    output_cap_effective: result.output_cap_effective ?? null,
    channel_id: result.channel_id || fallback.channel_id || "",
    channel_name: result.channel_name || fallback.channel_name || "",
    channel_route_key: result.channel_route_key || fallback.channel_route_key || "",
    is_baseline: Boolean(result.is_baseline),
    provider: result.provider || fallback.provider || "",
    endpoint_id: result.endpoint_id || fallback.endpoint_id || "",
    endpoint_label: result.endpoint_label || fallback.endpoint_label || "",
    base_url: result.base_url || fallback.base_url || "",
    model: result.model || fallback.model || "",
    cache_hit_summary: result.cache_hit_summary || "",
    case_group_key: result.case_group_key || fallback.case_group_key || "",
    case_group_title: result.case_group_title || fallback.case_group_title || ""
  };
}

function normalizeHistoryRecord(input, { sourceName = "导入报告" } = {}) {
  if (!input || typeof input !== "object") {
    throw new Error(`${sourceName} 不是 JSON object。`);
  }

  if (Array.isArray(input)) {
    return normalizeHistoryRecord({ results: input }, { sourceName });
  }

  const firstSuite = !Array.isArray(input.results) && Array.isArray(input.suites) ? input.suites[0] : null;
  const source = firstSuite || input;
  const results = Array.isArray(source.results) ? source.results : [];
  if (!results.length) {
    throw new Error(`${sourceName} 没有 results。`);
  }

  const endpointId = input.endpoint_id || source.endpoint_id || state.selectedEndpointId || "chat_completions";
  const endpoint = endpointTemplateById(endpointId);
  const provider = input.provider || source.provider || input.channel_id || source.channel_id || "";
  const channel = CHANNEL_TEMPLATES.find((item) => item.channel_id === (input.channel_id || source.channel_id))
    || channelForProvider(provider, endpointId)
    || getSelectedChannel();
  const channelEndpoint = channel.endpoints?.[endpointId];
  const normalizedResults = results.map((result) => canonicalResultFromRaw(result));
  const generatedAt = input.generated_at || input.finished_at || source.finished_at || input.started_at || source.started_at || new Date().toISOString();
  const idSuffix = `${channel.channel_id}_${endpointId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  return {
    id: input.id || `report_import_${idSuffix}`,
    generated_at: generatedAt,
    imported_at: new Date().toISOString(),
    endpoint_id: endpointId,
    endpoint_label: input.endpoint_label || endpoint.label,
    channel_id: channel.channel_id,
    channel_name: input.channel_name || channel.name || provider || "导入渠道",
    provider: provider || channelEndpoint?.provider_id || channel.provider_id || channel.channel_id,
    base_url: input.base_url || source.base_url || channelEndpoint?.default_base_url || channel.default_base_url || "",
    model: input.model || source.model || channelEndpoint?.default_model || channel.default_model || "",
    baseline_report_id: input.baseline_report_id || input.baseline?.report_id || "",
    baseline_label: input.baseline_label || input.baseline?.label || "",
    proxy: input.proxy || source.proxy || { enabled: false, url: "", mode: "direct" },
    stats: historyStats(normalizedResults),
    results: normalizedResults
  };
}

function historyRecordHasBaselinePayload(record) {
  return (record.results || []).some((result) => hasResponseBody(result));
}

function severityForDiffs(diffs, baselineLabel = "OpenAI") {
  const isOpenAiBaseline = /openai/i.test(baselineLabel);
  const hasMissingRequired = diffs.some((diff) => diff.kind === "missing" && requiredOpenAiFields.has(diff.path.split(".")[0]));
  if (hasMissingRequired) {
    return {
      level: "critical",
      label: "CRITICAL",
      title: "严重程度：CRITICAL",
      copy: isOpenAiBaseline
        ? "缺少 OpenAI-compatible 必需字段，标准 OpenAI SDK 可能无法正常处理。"
        : `缺少 ${baselineLabel} baseline 响应中的关键字段，第三方返回与原厂格式存在明显差距。`
    };
  }

  if (diffs.some((diff) => diff.kind === "extra" || diff.kind === "type")) {
    return {
      level: "extension",
      label: "EXTENSION",
      title: "严重程度：EXTENSION",
      copy: isOpenAiBaseline
        ? "响应大体兼容，但包含非标准字段或类型变化，客户端需要显式容忍。"
        : `响应和 ${baselineLabel} baseline 存在额外字段或类型变化，网关转换时需要显式处理。`
    };
  }

  return {
    level: "compatible",
    label: "COMPATIBLE",
    title: "严重程度：COMPATIBLE",
    copy: `该 case 的响应结构与 ${baselineLabel} baseline 一致。`
  };
}

function conclusionMeta(result) {
  return supportConclusionMeta[result.support_conclusion] || supportConclusionMeta.unknown;
}

function capabilityStatusLabel(result) {
  return conclusionMeta(result).label;
}

function evidenceLevelForResult(result) {
  if (!result || ["request_failed", "permission_limited", "unknown"].includes(result.support_conclusion)) {
    return "none";
  }
  const assertions = result.assertions || [];
  if (assertions.length) {
    return assertions.some((assertion) => !assertion.pass) ? "observed" : "asserted";
  }
  if (hasResponseBody(result) || result.raw_response || result.response_headers) {
    return "observed";
  }
  if (result.source_case || result.expected_support_conclusion || result.expected_http_status) {
    return "inferred";
  }
  return "none";
}

function evidenceMeta(result) {
  return evidenceLevelMeta[evidenceLevelForResult(result)] || evidenceLevelMeta.none;
}

function expectationResult(result) {
  return matchesExpectedResult(result) ? "expected" : "unexpected";
}

function gatewayActionForResult(result) {
  if (!result) return "manual_review";
  if (result.support_conclusion === "supported" && matchesExpectedResult(result) && failedAssertionsForResult(result).length === 0) {
    return result.diff_count > 0 ? "adapter_required" : "pass_through";
  }
  if (result.support_conclusion === "ignored") return "strip_or_warn";
  if (result.support_conclusion === "rejected_400") return "strip_or_transform";
  if (result.support_conclusion === "schema_mismatch") return "adapter_required";
  if (result.support_conclusion === "request_failed" || result.support_conclusion === "permission_limited") return "retry_or_review";
  return "manual_review";
}

function gatewayAction(result) {
  return gatewayActionMeta[gatewayActionForResult(result)] || gatewayActionMeta.manual_review;
}

function enrichResultAxes(result) {
  return {
    ...result,
    capability_status: result.capability_status || result.support_conclusion || "unknown",
    expectation_result: result.expectation_result || expectationResult(result),
    evidence_level: result.evidence_level || evidenceLevelForResult(result),
    gateway_action: result.gateway_action || gatewayActionForResult(result)
  };
}

function inferSiliconFlowConclusion(testCase) {
  const expect = testCase.expect || {};
  if (expect.support_conclusion === "ignored") return "ignored";
  if (expect.support_conclusion === "rejected_400") return "rejected_400";
  if (expect.support_conclusion === "supported") return "supported";
  if (expect.http_status && Number(expect.http_status) >= 400) return "rejected_400";
  return "supported";
}

function inferMockConclusion(result) {
  if (result.status === "rejected") return "rejected_400";
  if (result.status === "warning" || result.message) return "ignored";
  if (result.status === "na") return "unknown";
  return "supported";
}

function formatStreamMetricsSummary(metrics) {
  if (!metrics || typeof metrics !== "object") return "";
  const parts = [
    `SSE ${metrics.sse_chunk_count ?? "—"} 包`,
    `content ${metrics.content_chunk_count ?? "—"} 包`
  ];
  if (metrics.reasoning_chunk_count > 0) {
    parts.push(`reasoning ${metrics.reasoning_chunk_count} 包`);
  }
  parts.push(`首包 ${metrics.first_chunk_ms ?? "—"}ms`);
  if (metrics.chunk_spread_ms != null) {
    parts.push(`跨度 ${metrics.chunk_spread_ms}ms`);
  }
  return parts.join(" · ");
}

function formatStreamUsagePresent(result) {
  if (result?.stream_usage_present == null) return "";
  return result.stream_usage_present ? "有" : "无";
}

function formatStreamUsageChunkProfile(result) {
  const profile = result?.stream_usage_chunk_profile;
  if (!profile) return "";
  const labels = {
    dedicated: "独立",
    merged_finish_reason: "合并 finish_reason",
    missing: "缺失",
    other: "其他"
  };
  return labels[profile] || profile;
}

function formatOutputLengthCapPrecedence(result) {
  const profile = result?.output_length_cap_precedence;
  if (!profile) return "";
  const labels = {
    max_tokens: "max_tokens",
    max_completion_tokens: "max_completion_tokens",
    min_wins: "取较小上限",
    rejected: "双参被拒绝",
    single_field_only: "仅单字段",
    inconclusive: "未能判定"
  };
  return labels[profile] || profile;
}

function formatOutputCapEffective(result) {
  if (result?.output_cap_effective == null) return "";
  return result.output_cap_effective ? "是" : "否";
}

function renderStreamMetricsBlock(result) {
  const metrics = result.stream_metrics;
  const attempts = result.stream_probe_attempts;
  const usageLine = formatStreamUsagePresent(result);
  const usageProfileLine = formatStreamUsageChunkProfile(result);
  const outputPrecedenceLine = formatOutputLengthCapPrecedence(result);
  const outputEffectiveLine = formatOutputCapEffective(result);
  if (!metrics && !attempts?.length && !usageLine && !usageProfileLine && !outputPrecedenceLine && !outputEffectiveLine) return "";
  const attemptRows = (attempts || []).map((attempt) => {
    const summary = formatStreamMetricsSummary(attempt.stream_metrics);
    const status = attempt.error
      ? `失败：${attempt.error}`
      : summary || "—";
    return `<li>第 ${attempt.attempt} 次 · HTTP ${attempt.http_status || "—"} · ${attempt.latency_ms || 0}ms · ${escapeHtml(status)}</li>`;
  }).join("");
  return `
    <p class="detail-title">流式指标</p>
    <div class="stream-metrics-block">
      ${metrics ? `<p class="muted fs-sm">汇总：${escapeHtml(formatStreamMetricsSummary(metrics))}</p>` : ""}
      ${usageLine ? `<p class="muted fs-sm">流式 usage：${escapeHtml(usageLine)}</p>` : ""}
      ${usageProfileLine ? `<p class="muted fs-sm">流式 usage 分片：${escapeHtml(usageProfileLine)}</p>` : ""}
      ${outputPrecedenceLine ? `<p class="muted fs-sm">输出上限字段：${escapeHtml(outputPrecedenceLine)}</p>` : ""}
      ${outputEffectiveLine ? `<p class="muted fs-sm">输出 cap 生效：${escapeHtml(outputEffectiveLine)}</p>` : ""}
      ${attemptRows ? `<ul class="stream-metrics-attempts">${attemptRows}</ul>` : ""}
    </div>
  `;
}

function assertionSummary(assertions = []) {
  if (!assertions.length) return "未配置额外断言。";
  const passed = assertions.filter((assertion) => assertion.pass).length;
  return `断言 ${passed} / ${assertions.length} 通过。`;
}

function thinkingProbeAnalysisLines(results = [], options = {}) {
  const probeResults = results.filter((result) => String(result.case_id || "").startsWith("thinking_"));
  if (!probeResults.length) return [];

  const byCase = new Map(probeResults.map((result) => [result.case_id, result]));
  const families = thinkingProbeFamilies();
  const familyAnalyses = families.map((family) => thinkingFamilyAnalysis(family, byCase));
  const openingCases = families.flatMap((family) => family.openCases.map((item) => [item.caseId, item.label]));
  const closingCases = families.flatMap((family) => family.closeCases.map((item) => [item.caseId, item.label, item.openCaseId]));

  const supportedOpenings = familyAnalyses.flatMap((family) => family.openResults.filter((item) => thinkingOpeningWorks(item.result)));
  const supportedClosings = familyAnalyses.flatMap((family) => family.closeResults.filter((item) => thinkingClosingWorks(item.result) && thinkingOpeningWorks(item.openResult)));
  const closingAcceptedWithoutPairedOpen = familyAnalyses.flatMap((family) => family.closeResults.filter((item) => thinkingClosingWorks(item.result) && !thinkingOpeningWorks(item.openResult)));
  const supportedLevels = familyAnalyses.flatMap((family) => family.levelResults.filter((item) => thinkingOpeningWorks(item.result)));
  const acceptedButNoEvidence = familyAnalyses.flatMap((family) => family.openResults.filter((item) => thinkingAcceptedWithoutEvidence(item.result)));
  const rejectedCases = [...openingCases, ...closingCases]
    .map(([caseId, label]) => ({ caseId, label, result: byCase.get(caseId) }))
    .filter((item) => item.result && ["rejected_400", "request_failed", "permission_limited"].includes(item.result.support_conclusion));
  const locations = uniqueStrings(probeResults.flatMap(thinkingLocationsForResult));
  const tokenEvidence = uniqueStrings(probeResults.flatMap(thinkingTokenEvidenceForResult));
  const baseline = byCase.get("thinking_baseline_fixed_prompt") || byCase.get("thinking_baseline_no_thinking");
  const baselineHasEvidence = thinkingResultHasEvidence(baseline);
  const confirmedFamilies = familyAnalyses.filter((family) => family.status === "confirmed");
  const observableDefaultFamilies = familyAnalyses.filter((family) => family.status === "default_already_on");
  const acceptedNoEvidenceFamilies = familyAnalyses.filter((family) => family.status === "accepted_no_evidence");
  const preferred = confirmedFamilies[0]?.bestOpen || supportedOpenings[0];
  const capabilitySummary = confirmedFamilies.length
    ? `确认支持 thinking；已证明 ${confirmedFamilies.length} 类开启形态。`
    : baselineHasEvidence
      ? "模型/渠道默认会暴露 thinking 证据；但未确认显式开启参数是否生效。"
      : acceptedNoEvidenceFamilies.length || observableDefaultFamilies.length
        ? "可能支持 thinking；请求被接受，但缺少足够的开启/关闭对照证据。"
        : "未确认支持 thinking；开启类探针没有拿到 thinking 内容或 token 证据。";

  const lines = [
    "## Thinking Probe 结论",
    "",
    `- 能力判定：${capabilitySummary}`,
    `- 推荐打开方式：${preferred ? preferred.label : "未确认；开启类探针没有同时命中 2xx 与 thinking 证据。"}`,
    `- 支持的 thinking 类型：${confirmedFamilies.length ? confirmedFamilies.map((item) => item.name).join("；") : "未确认"}`,
    `- 可正常打开：${supportedOpenings.length ? supportedOpenings.map((item) => item.label).join("；") : "未确认"}`,
    `- 可正常关闭：${supportedClosings.length ? supportedClosings.map((item) => item.label).join("；") : "未确认"}`,
    `- 可设置级别/预算：${supportedLevels.length ? supportedLevels.map((item) => item.label).join("；") : "未确认"}`,
    `- thinking 内容落点：${locations.length ? locations.join("；") : "未发现显式 thinking 内容字段"}`,
    `- token 证据：${tokenEvidence.length ? tokenEvidence.join("；") : "未发现 reasoning_tokens/thinking_tokens > 0"}`,
    `- 默认不传 thinking 参数：${baseline ? thinkingDefaultSummary(baseline) : "未运行 baseline case"}`,
    ""
  ];

  lines.push("### Thinking 能力矩阵");
  lines.push("");
  lines.push("| 类型 | 判定 | 开关实测 | 打开方式 | 关闭方式 | 级别/预算 | 证据 |");
  lines.push("|---|---|---|---|---|---|---|");
  lines.push(...familyAnalyses.map((family) =>
    `| ${escapeMarkdownCell(family.name)} | ${escapeMarkdownCell(thinkingFamilyStatusLabel(family.status))} | ${escapeMarkdownCell(thinkingEffectivenessLabel(family.thinking_effectiveness))} | ${escapeMarkdownCell(thinkingFamilyOpenSummary(family))} | ${escapeMarkdownCell(thinkingFamilyCloseSummary(family))} | ${escapeMarkdownCell(thinkingFamilyLevelSummary(family))} | ${escapeMarkdownCell(thinkingFamilyEvidenceSummary(family))} |`
  ));
  lines.push("");

  const intensityRows = familyAnalyses.flatMap((family) =>
    (family.intensityResults || []).map((item) => ({ family, item }))
  );
  if (intensityRows.length) {
    lines.push("### Thinking 强度配对");
    lines.push("");
    lines.push("| 类型 | 参数 | 低档 | 高档 | 强度实测 | 说明 |");
    lines.push("|---|---|---|---|---|---|");
    lines.push(...intensityRows.map(({ family, item }) =>
      `| ${escapeMarkdownCell(family.name)} | ${escapeMarkdownCell(item.parameter || "")} | \`${item.lowCaseId}\` | \`${item.highCaseId}\` | ${escapeMarkdownCell(thinkingEffectivenessLabel(item.thinking_effectiveness))} | ${escapeMarkdownCell(item.notes || "")} |`
    ));
    lines.push("");
  }

  const effortAnalyses = analyzeThinkingEffortProbes(byCase);
  if (effortAnalyses.length) {
    lines.push(...formatThinkingEffortAnalysisMarkdown(effortAnalyses));
  }

  const channelId = options.channelId
    || options.channel_id
    || runV02ProtocolEvalChannelId(state.runV02?.baselineRoute)
    || getSelectedChannel()?.channel_id
    || getSelectedChannel()?.id
    || currentProviderId();
  const protocolId = options.protocolId || options.endpoint_id || state.selectedEndpointId || "chat_completions";
  const switchEquiv = thinkingDialectEquivalenceAnalysis(byCase, channelId, protocolId);
  if (switchEquiv) {
    lines.push(...formatSwitchEquivalenceMarkdown(switchEquiv));
  }

  if (observableDefaultFamilies.length) {
    lines.push("### 默认已暴露但开关未隔离");
    lines.push("");
    lines.push("这些类型的开启 case 有 thinking 证据，但 baseline 也已经有证据；除非对应关闭 case 通过，否则不能证明这个字段真的负责开启。");
    lines.push("");
    lines.push("| 类型 | 开启方式 | 证据 |");
    lines.push("|---|---|---|");
    lines.push(...observableDefaultFamilies.map((family) =>
      `| ${escapeMarkdownCell(family.name)} | ${escapeMarkdownCell(thinkingFamilyOpenSummary(family))} | ${escapeMarkdownCell(thinkingFamilyEvidenceSummary(family))} |`
    ));
    lines.push("");
  }

  if (acceptedButNoEvidence.length) {
    lines.push("### 2xx 但未证明开启");
    lines.push("");
    lines.push("| Case | 参数 | 结论 | 断言 |");
    lines.push("|---|---|---|---|");
    lines.push(...acceptedButNoEvidence.map((item) =>
      `| \`${item.caseId}\` | ${escapeMarkdownCell(item.label)} | ${conclusionMeta(item.result).label} | ${escapeMarkdownCell(assertionSummary(item.result.assertions))} |`
    ));
    lines.push("");
  }

  if (closingAcceptedWithoutPairedOpen.length) {
    lines.push("### 关闭通过但缺少同类开启证明");
    lines.push("");
    lines.push("这些关闭 case 没有暴露 thinking，但对应开启 case 没有成功证明 thinking 被打开，因此只能说明“响应未出现 thinking”，不能单独证明该字段真的具备关闭能力。");
    lines.push("");
    lines.push("| Case | 关闭参数 | 对应开启 Case | 关闭结论 |");
    lines.push("|---|---|---|---|");
    lines.push(...closingAcceptedWithoutPairedOpen.map((item) =>
      `| \`${item.caseId}\` | ${escapeMarkdownCell(item.label)} | \`${item.openCaseId}\` | ${escapeMarkdownCell(thinkingCaseShortSummary(item.result))} |`
    ));
    lines.push("");
  }

  if (rejectedCases.length) {
    lines.push("### 不可用/被拒绝的开关");
    lines.push("");
    lines.push("| Case | 参数 | 实际结论 | HTTP | 说明 |");
    lines.push("|---|---|---|---|---|");
    lines.push(...rejectedCases.map((item) =>
      `| \`${item.caseId}\` | ${escapeMarkdownCell(item.label)} | ${conclusionMeta(item.result).label} | ${item.result.http_status || conclusionMeta(item.result).httpStatus || "—"} | ${escapeMarkdownCell(item.result.message || assertionSummary(item.result.assertions))} |`
    ));
    lines.push("");
  }

  lines.push("### Thinking 探针明细");
  lines.push("");
  lines.push("| Case | 探测目的 | 实际结论 | HTTP | 关键证据 |");
  lines.push("|---|---|---|---|---|");
  lines.push(...probeResults.map((result) =>
    `| \`${result.case_id}\` | ${escapeMarkdownCell(result.parameter || result.title || "")} | ${conclusionMeta(result).label} | ${result.http_status || conclusionMeta(result).httpStatus || "—"} | ${escapeMarkdownCell(thinkingEvidenceSummary(result))} |`
  ));
  lines.push("");
  return lines;
}

function analyzeThinkingEffortProbes(byCase) {
  return window.NOCTUA_THINKING_EFFORT_ANALYSIS?.analyzeEffortProbes(byCase) || [];
}

function formatThinkingEffortAnalysisMarkdown(analyses) {
  return window.NOCTUA_THINKING_EFFORT_ANALYSIS?.formatEffortAnalysisMarkdown(analyses) || [];
}

function thinkingProbeFamilies() {
  return [
    {
      name: "OpenAI reasoning_effort",
      parameters: ["reasoning_effort"],
      openCases: [{ caseId: "thinking_reasoning_effort_medium", label: "reasoning_effort = medium" }],
      closeCases: [{ caseId: "thinking_reasoning_effort_none", label: "reasoning_effort = none", openCaseId: "thinking_reasoning_effort_medium" }],
      levelCases: [{ caseId: "thinking_reasoning_effort_medium", label: "reasoning_effort 级别" }],
      intensityPairs: [{
        parameter: "reasoning_effort",
        lowCaseId: "thinking_reasoning_effort_low",
        highCaseId: "thinking_reasoning_effort_high",
        label: "reasoning_effort low vs high"
      }]
    },
    {
      name: "Qwen/SiliconFlow enable_thinking",
      parameters: ["enable_thinking"],
      openCases: [{ caseId: "thinking_enable_thinking_true", label: "enable_thinking = true" }],
      closeCases: [{ caseId: "thinking_enable_thinking_false", label: "enable_thinking = false", openCaseId: "thinking_enable_thinking_true" }],
      levelCases: [{ caseId: "thinking_enable_thinking_with_budget", label: "enable_thinking + thinking_budget 预算" }],
      intensityPairs: []
    },
    {
      name: "Qwen thinking_budget",
      parameters: ["thinking_budget"],
      openCases: [
        { caseId: "thinking_budget_only", label: "thinking_budget = 1000" },
        { caseId: "thinking_enable_thinking_with_budget", label: "enable_thinking = true + thinking_budget = 1000" }
      ],
      closeCases: [{ caseId: "thinking_enable_thinking_false", label: "enable_thinking = false", openCaseId: "thinking_enable_thinking_with_budget" }],
      levelCases: [
        { caseId: "thinking_budget_only", label: "thinking_budget 预算" },
        { caseId: "thinking_enable_thinking_with_budget", label: "enable_thinking + thinking_budget 预算" }
      ],
      intensityPairs: [{
        parameter: "thinking_budget",
        lowCaseId: "thinking_thinking_budget_low",
        highCaseId: "thinking_thinking_budget_high",
        label: "thinking_budget 128 vs 4096"
      }]
    },
    {
      name: "DeepSeek/Claude thinking object",
      parameters: ["thinking"],
      openCases: [
        { caseId: "thinking_object_enabled", label: "thinking.type = enabled" },
        { caseId: "thinking_object_enabled_budget_tokens", label: "thinking.type = enabled + budget_tokens" }
      ],
      closeCases: [{ caseId: "thinking_object_disabled", label: "thinking.type = disabled", openCaseId: "thinking_object_enabled" }],
      levelCases: [{ caseId: "thinking_object_enabled_budget_tokens", label: "thinking.budget_tokens 预算" }],
      intensityPairs: []
    },
    {
      name: "OpenRouter reasoning object",
      parameters: ["reasoning"],
      openCases: [
        { caseId: "thinking_reasoning_object_effort_summary", label: "reasoning.effort = medium + reasoning.summary = auto" },
        { caseId: "thinking_reasoning_object_enabled", label: "reasoning.enabled = true" }
      ],
      closeCases: [
        { caseId: "thinking_reasoning_object_effort_none", label: "reasoning.effort = none", openCaseId: "thinking_reasoning_object_effort_summary" },
        { caseId: "thinking_reasoning_object_disabled", label: "reasoning.enabled = false", openCaseId: "thinking_reasoning_object_enabled" }
      ],
      levelCases: [{ caseId: "thinking_reasoning_object_effort_summary", label: "reasoning.effort 级别/summary" }],
      intensityPairs: []
    },
    {
      name: "vLLM chat_template_kwargs",
      parameters: ["chat_template_kwargs"],
      openCases: [{ caseId: "thinking_chat_template_kwargs_enable_true", label: "chat_template_kwargs.enable_thinking = true" }],
      closeCases: [{ caseId: "thinking_chat_template_kwargs_enable_false", label: "chat_template_kwargs.enable_thinking = false", openCaseId: "thinking_chat_template_kwargs_enable_true" }],
      levelCases: [],
      intensityPairs: []
    },
    {
      name: "MiniMax reasoning_split",
      parameters: ["reasoning_split"],
      openCases: [{ caseId: "thinking_reasoning_split_true", label: "reasoning_split = true" }],
      closeCases: [
        { caseId: "thinking_object_disabled", label: "thinking.type = disabled", openCaseId: "thinking_reasoning_split_true" },
        { caseId: "thinking_reasoning_split_false", label: "reasoning_split = false", openCaseId: "thinking_reasoning_split_true" }
      ],
      levelCases: [],
      intensityPairs: []
    }
  ];
}

function reasoningTokenCountForResult(result) {
  if (!result) return null;
  const direct = Number(result.reasoning_tokens);
  if (Number.isFinite(direct)) return direct;
  const body = result.response_body;
  if (!body || typeof body !== "object") return null;
  let max = 0;
  let found = false;
  walkJsonForTokenField(body, "reasoning_tokens", (count) => {
    found = true;
    if (count > max) max = count;
  });
  return found ? max : null;
}

function thinkingTokenCountForResult(result) {
  if (!result) return null;
  const direct = Number(result.thinking_tokens);
  if (Number.isFinite(direct)) return direct;
  const body = result.response_body;
  if (!body || typeof body !== "object") return null;
  let max = 0;
  let found = false;
  walkJsonForTokenField(body, "thinking_tokens", (count) => {
    found = true;
    if (count > max) max = count;
  });
  return found ? max : null;
}

function walkJsonForTokenField(value, field, onCount) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item) => walkJsonForTokenField(item, field, onCount));
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (key.toLowerCase() === field.toLowerCase()) {
      const count = Number(child);
      if (Number.isFinite(count)) onCount(count);
    }
    walkJsonForTokenField(child, field, onCount);
  }
}

function visibleThinkingLengthForResult(result) {
  if (!result?.response_body) return 0;
  const body = result.response_body;
  let total = 0;
  const reasoningContent = body?.choices?.[0]?.message?.reasoning_content;
  if (typeof reasoningContent === "string") total += reasoningContent.length;
  const reasoning = body?.choices?.[0]?.message?.reasoning;
  if (reasoning && typeof reasoning === "object") {
    total += JSON.stringify(reasoning).length;
  }
  const details = body?.choices?.[0]?.message?.reasoning_details;
  if (Array.isArray(details)) total += JSON.stringify(details).length;
  const content = body?.choices?.[0]?.message?.content;
  if (typeof content === "string" && content.includes("<think>")) {
    total += content.length;
  }
  if (Array.isArray(body?.content)) {
    for (const block of body.content) {
      if (block?.type === "thinking" && typeof block.thinking === "string") {
        total += block.thinking.length;
      }
    }
  }
  return total;
}

function thinkingEvidenceScore(result) {
  if (!result) return 0;
  const reasoningTokens = reasoningTokenCountForResult(result);
  const thinkingTokens = thinkingTokenCountForResult(result);
  const tokenScore = Math.max(reasoningTokens ?? 0, thinkingTokens ?? 0);
  const visibleScore = visibleThinkingLengthForResult(result);
  return tokenScore > 0 ? tokenScore : visibleScore;
}

function thinkingIntensityPairAnalysis(pair, byCase) {
  const low = byCase.get(pair.lowCaseId);
  const high = byCase.get(pair.highCaseId);
  const lowAccepted = thinkingRequestAccepted(low);
  const highAccepted = thinkingRequestAccepted(high);
  let thinking_effectiveness = "unproven";
  let notes = "";
  if (!low || !high) {
    return { ...pair, low, high, thinking_effectiveness: "unproven", notes: "强度配对 case 未完整运行" };
  }
  if (!lowAccepted || !highAccepted) {
    thinking_effectiveness = thinkingRequestRejected(low) || thinkingRequestRejected(high) ? "rejected" : "unproven";
    notes = "强度配对未同时被接受";
    return { ...pair, low, high, thinking_effectiveness, notes, lowTokens: reasoningTokenCountForResult(low), highTokens: reasoningTokenCountForResult(high) };
  }
  const lowTokens = reasoningTokenCountForResult(low);
  const highTokens = reasoningTokenCountForResult(high);
  const lowVisible = visibleThinkingLengthForResult(low);
  const highVisible = visibleThinkingLengthForResult(high);
  const tokenDelta = lowTokens != null && highTokens != null && highTokens > lowTokens;
  const visibleDelta = highVisible > lowVisible;
  if (tokenDelta || visibleDelta) {
    thinking_effectiveness = "effective";
    notes = tokenDelta
      ? `reasoning_tokens ${lowTokens} → ${highTokens}`
      : `可见 thinking 长度 ${lowVisible} → ${highVisible}`;
  } else {
    thinking_effectiveness = "accepted_ineffective";
    notes = lowTokens != null && highTokens != null
      ? `reasoning_tokens 无差异（${lowTokens} vs ${highTokens}）`
      : "请求接受但高强度未产生更多 thinking 证据";
  }
  return { ...pair, low, high, thinking_effectiveness, notes, lowTokens, highTokens, lowVisible, highVisible };
}

function thinkingSwitchEffectiveness(family, baseline) {
  const bestOpen = family.openResults.find((item) => thinkingOpeningWorks(item.result)) || null;
  const pairedClose = family.closeResults.find((item) => thinkingClosingWorks(item.result) && thinkingOpeningWorks(item.openResult)) || null;
  const baselineScore = thinkingEvidenceScore(baseline);
  const openScore = thinkingEvidenceScore(bestOpen?.result);
  if (family.status === "confirmed" && bestOpen && pairedClose && openScore > baselineScore) {
    return "effective";
  }
  if (family.status === "default_already_on") return "default_on";
  if (family.status === "rejected") return "rejected";
  if (family.status === "accepted_no_evidence") return "accepted_ineffective";
  if (family.status === "confirmed") return "effective";
  return "unproven";
}

const SWITCH_EQUIVALENCE_SPECS = [
  {
    group: "reasoning_switch_open",
    referenceCaseId: "thinking_enable_thinking_true",
    alternateCaseId: "thinking_switch_alt_thinking_enabled",
    primaryParam: "enable_thinking",
    alternateParam: "thinking",
    mode: "open"
  },
  {
    group: "reasoning_switch_close",
    referenceCaseId: "thinking_enable_thinking_false",
    alternateCaseId: "thinking_switch_alt_thinking_disabled",
    primaryParam: "enable_thinking",
    alternateParam: "thinking",
    mode: "close"
  }
];

function formatSwitchEvidenceDelta(reference, alternate) {
  const refScore = thinkingEvidenceScore(reference);
  const altScore = thinkingEvidenceScore(alternate);
  const refTokens = reasoningTokenCountForResult(reference);
  const altTokens = reasoningTokenCountForResult(alternate);
  if (refTokens != null || altTokens != null) {
    return `主方言 reasoning_tokens=${refTokens ?? 0}，备选 ${altTokens ?? 0}`;
  }
  return `主方言证据分 ${refScore}，备选 ${altScore}`;
}

function analyzeSwitchConflictProbe(byCase) {
  const specs = [
    {
      caseId: "thinking_switch_conflict_enable_off_thinking_on",
      label: "enable_thinking=false 且 thinking.type=enabled",
      openWinner: "thinking",
      closeWinner: "enable_thinking",
      openNote: "冲突时 thinking.type=enabled 生效（忽略 enable_thinking=false）",
      closeNote: "冲突时 enable_thinking=false 生效（thinking 未产生证据）"
    },
    {
      caseId: "thinking_switch_conflict_enable_on_thinking_off",
      label: "enable_thinking=true 且 thinking.type=disabled",
      openWinner: "enable_thinking",
      closeWinner: "thinking",
      openNote: "冲突时 enable_thinking=true 生效（忽略 thinking.type=disabled）",
      closeNote: "冲突时 thinking.type=disabled 生效（无 thinking 证据）"
    }
  ];
  const conflicts = specs.map((spec) => {
    const result = byCase.get(spec.caseId);
    if (!result) return null;
    const hasEvidence = thinkingResultHasEvidence(result);
    const winner = hasEvidence ? spec.openWinner : spec.closeWinner;
    return {
      case_id: spec.caseId,
      label: spec.label,
      winner,
      notes: hasEvidence ? spec.openNote : spec.closeNote
    };
  }).filter(Boolean);
  if (!conflicts.length) return null;
  return conflicts;
}

function thinkingDialectEquivalenceAnalysis(byCase, channelId, protocolId = "chat_completions") {
  void channelId;
  void protocolId;

  const baseline = byCase.get("thinking_baseline_fixed_prompt") || byCase.get("thinking_baseline_no_thinking");
  const baselineScore = thinkingEvidenceScore(baseline);
  const rows = [];

  for (const spec of SWITCH_EQUIVALENCE_SPECS) {
    const reference = byCase.get(spec.referenceCaseId);
    const alternate = byCase.get(spec.alternateCaseId);
    if (!reference && !alternate) continue;

    let primaryEffectiveness = "unproven";
    let alternateEffectiveness = "unproven";
    let notes = "";

    if (spec.mode === "open") {
      const primaryWorks = thinkingOpeningWorks(reference);
      const altWorks = thinkingOpeningWorks(alternate);
      const altAccepted = thinkingRequestAccepted(alternate);
      const primaryScore = thinkingEvidenceScore(reference);
      const altScore = thinkingEvidenceScore(alternate);

      if (primaryWorks && primaryScore > baselineScore) primaryEffectiveness = "effective";
      else if (reference && thinkingRequestRejected(reference)) primaryEffectiveness = "rejected";
      else if (reference && thinkingRequestAccepted(reference)) primaryEffectiveness = "accepted_ineffective";

      if (altWorks && altScore > baselineScore) alternateEffectiveness = "effective";
      else if (alternate && altAccepted && !altWorks) alternateEffectiveness = "accepted_ineffective";
      else if (alternate && thinkingRequestRejected(alternate)) alternateEffectiveness = "rejected";

      if (primaryEffectiveness === "effective" && alternateEffectiveness === "accepted_ineffective") {
        notes = "主方言开启有效，备选方言 HTTP 接受但无 thinking 证据";
      } else if (primaryEffectiveness === "effective" && alternateEffectiveness === "effective") {
        notes = "主方言与备选方言均可开启 thinking";
      } else if (!reference || !alternate) {
        notes = "等价对照 case 未完整运行";
      }
    } else {
      const primaryWorks = thinkingClosingWorks(reference);
      const altWorks = thinkingClosingWorks(alternate);
      const altAccepted = thinkingRequestAccepted(alternate);

      if (primaryWorks) primaryEffectiveness = "effective";
      else if (reference && thinkingRequestRejected(reference)) primaryEffectiveness = "rejected";
      else if (reference && thinkingRequestAccepted(reference)) primaryEffectiveness = "accepted_ineffective";

      if (altWorks) alternateEffectiveness = "effective";
      else if (alternate && altAccepted && !altWorks) alternateEffectiveness = "accepted_ineffective";
      else if (alternate && thinkingRequestRejected(alternate)) alternateEffectiveness = "rejected";

      if (primaryEffectiveness === "effective" && alternateEffectiveness === "accepted_ineffective") {
        notes = "主方言关闭有效，备选方言 HTTP 接受但未关闭 thinking";
      } else if (primaryEffectiveness === "effective" && alternateEffectiveness === "effective") {
        notes = "主方言与备选方言均可关闭 thinking";
      }
    }

    rows.push({
      group: spec.group,
      mode: spec.mode,
      primary_param: spec.primaryParam,
      alternate_param: spec.alternateParam,
      reference_case_id: spec.referenceCaseId,
      alternate_case_id: spec.alternateCaseId,
      primary_effectiveness: primaryEffectiveness,
      alternate_effectiveness: alternateEffectiveness,
      evidence_delta: reference && alternate ? formatSwitchEvidenceDelta(reference, alternate) : "",
      notes
    });
  }

  const conflicts = analyzeSwitchConflictProbe(byCase);
  if (!rows.length && !conflicts?.length) return null;
  return { rows, conflicts };
}

function formatSwitchEquivalenceMarkdown(equiv) {
  if (!equiv?.rows?.length && !equiv?.conflicts?.length) return [];
  const lines = ["### 开关方言等价对照", ""];
  if (equiv.rows.length) {
    lines.push("| 语义 | 主方言参数 | 主方言实测 | 备选参数 | 备选实测 | 证据对比 | 说明 |");
    lines.push("|---|---|---|---|---|---|---|");
    for (const row of equiv.rows) {
      const label = row.mode === "open" ? "开启" : "关闭";
      lines.push(
        `| ${label} | \`${row.primary_param}\` | ${escapeMarkdownCell(thinkingEffectivenessLabel(row.primary_effectiveness))} | \`${row.alternate_param}\` | ${escapeMarkdownCell(thinkingEffectivenessLabel(row.alternate_effectiveness))} | ${escapeMarkdownCell(row.evidence_delta || "—")} | ${escapeMarkdownCell(row.notes || "—")} |`
      );
    }
    lines.push("");
  }
  for (const conflict of equiv.conflicts || []) {
    lines.push(`- 冲突探针（${conflict.label}）：以 **${conflict.winner}** 为准；${conflict.notes}`);
  }
  if (equiv.conflicts?.length) lines.push("");
  return lines;
}

function thinkingEffectivenessLabel(value) {
  return {
    effective: "实测有效",
    accepted_ineffective: "接受无效",
    rejected: "被拒绝",
    unproven: "未证明",
    default_on: "默认开启",
    doc_gap: "文档未列但有效"
  }[value] || value || "—";
}

function thinkingFamilyAnalysis(family, byCase) {
  const openResults = family.openCases.map((item) => ({ ...item, result: byCase.get(item.caseId) }));
  const closeResults = family.closeCases.map((item) => {
    const explicitOpen = byCase.get(item.openCaseId);
    const fallbackOpen = openResults.find((openItem) => thinkingOpeningWorks(openItem.result))?.result;
    return { ...item, result: byCase.get(item.caseId), openResult: thinkingOpeningWorks(explicitOpen) ? explicitOpen : fallbackOpen || explicitOpen };
  });
  const levelResults = family.levelCases.map((item) => ({ ...item, result: byCase.get(item.caseId) }));
  const intensityResults = (family.intensityPairs || []).map((pair) => thinkingIntensityPairAnalysis(pair, byCase));
  const baseline = byCase.get("thinking_baseline_fixed_prompt") || byCase.get("thinking_baseline_no_thinking");
  const baselineHasEvidence = thinkingResultHasEvidence(baseline);
  const bestOpen = openResults.find((item) => thinkingOpeningWorks(item.result)) || null;
  const pairedClose = closeResults.find((item) => thinkingClosingWorks(item.result) && thinkingOpeningWorks(item.openResult)) || null;
  const acceptedNoEvidence = openResults.some((item) => thinkingAcceptedWithoutEvidence(item.result));
  const accepted = openResults.some((item) => thinkingRequestAccepted(item.result));
  const rejected = openResults.some((item) => thinkingRequestRejected(item.result));
  let status = "not_run";
  if (bestOpen && (pairedClose || !baselineHasEvidence)) {
    status = "confirmed";
  } else if (bestOpen && baselineHasEvidence) {
    status = "default_already_on";
  } else if (acceptedNoEvidence || accepted) {
    status = "accepted_no_evidence";
  } else if (rejected) {
    status = "rejected";
  }
  const partial = { ...family, openResults, closeResults, levelResults, intensityResults, status, bestOpen, pairedClose, baseline };
  const thinking_effectiveness = thinkingSwitchEffectiveness(partial, baseline);
  return { ...partial, thinking_effectiveness };
}

function thinkingFamilyStatusLabel(status) {
  return {
    confirmed: "确认支持",
    default_already_on: "默认已暴露，开关未隔离",
    accepted_no_evidence: "2xx 但无 thinking 证据",
    rejected: "不可用/被拒绝",
    not_run: "未运行"
  }[status] || "未知";
}

function thinkingFamilyOpenSummary(family) {
  const confirmed = family.openResults.filter((item) => thinkingOpeningWorks(item.result));
  if (confirmed.length) return confirmed.map((item) => item.label).join("；");
  const accepted = family.openResults.filter((item) => thinkingRequestAccepted(item.result));
  if (accepted.length) return `已接受但未证明开启：${accepted.map((item) => item.label).join("；")}`;
  const rejected = family.openResults.filter((item) => thinkingRequestRejected(item.result));
  if (rejected.length) return `被拒绝：${rejected.map((item) => item.label).join("；")}`;
  return "未运行";
}

function thinkingFamilyCloseSummary(family) {
  const confirmed = family.closeResults.filter((item) => thinkingClosingWorks(item.result) && thinkingOpeningWorks(item.openResult));
  if (confirmed.length) return confirmed.map((item) => item.label).join("；");
  const unpaired = family.closeResults.filter((item) => thinkingClosingWorks(item.result));
  if (unpaired.length) return `响应未出现 thinking，但缺少同类开启证明：${unpaired.map((item) => item.label).join("；")}`;
  const rejected = family.closeResults.filter((item) => thinkingRequestRejected(item.result));
  if (rejected.length) return `被拒绝：${rejected.map((item) => item.label).join("；")}`;
  return "未确认";
}

function thinkingFamilyLevelSummary(family) {
  const confirmed = family.levelResults.filter((item) => thinkingOpeningWorks(item.result));
  if (confirmed.length) return confirmed.map((item) => item.label).join("；");
  const accepted = family.levelResults.filter((item) => thinkingRequestAccepted(item.result));
  if (accepted.length) return `已接受但未证明：${accepted.map((item) => item.label).join("；")}`;
  return family.levelResults.length ? "未确认" : "不适用";
}

function thinkingFamilyEvidenceSummary(family) {
  const candidates = [...family.openResults, ...family.closeResults].map((item) => item.result).filter(Boolean);
  const locations = uniqueStrings(candidates.flatMap(thinkingLocationsForResult));
  const tokens = uniqueStrings(candidates.flatMap(thinkingTokenEvidenceForResult));
  const evidence = [...locations, ...tokens];
  if (evidence.length) return evidence.join("；");
  const messages = uniqueStrings(candidates.map((result) => thinkingEvidenceSummary(result)).filter(Boolean));
  return messages.slice(0, 2).join("；") || "无";
}

function thinkingCloseAnalysisLines(results = []) {
  const closeResults = results.filter((result) =>
    !String(result.case_id || "").startsWith("thinking_")
    && Boolean(result.source_case?.expect?.thinking_absent)
  );
  if (!closeResults.length) return [];

  const passed = closeResults.filter((result) => thinkingCloseCaseWorks(result));
  const failed = closeResults.filter((result) => !thinkingCloseCaseWorks(result));
  const locations = uniqueStrings(closeResults.flatMap(thinkingLocationsForResult));
  const summary = passed.length && !failed.length
    ? `可以关闭；${passed.length} 个关闭用例均未输出 thinking 内容。`
    : passed.length
      ? `部分关闭；${passed.length} 个通过，${failed.length} 个仍需检查。`
      : `未确认可关闭；${failed.length} 个关闭用例未通过。`;

  const lines = [
    "## Thinking 关闭检测",
    "",
    `- 结论：${summary}`,
    `- 关闭定义：响应中不出现 reasoning_content、reasoning、reasoning_details、content[] thinking block、content 里的 <think>...</think>，且 usage 中没有 reasoning_tokens/thinking_tokens > 0。`,
    `- 探测到的 thinking 内容落点：${locations.length ? locations.join("；") : "未发现显式 thinking 内容字段"}`,
    "",
    "| Case | 参数 | 测试结果 | 实际结论 | HTTP | 关键证据 |",
    "|---|---|---|---|---|---|",
    ...closeResults.map((result) =>
      `| \`${result.case_id}\` | \`${escapeMarkdownCell(result.parameter || "")}\` | ${expectationLabel(result)} | ${conclusionMeta(result).label} | ${result.http_status || conclusionMeta(result).httpStatus || "—"} | ${escapeMarkdownCell(thinkingEvidenceSummary(result))} |`
    ),
    ""
  ];

  return lines;
}

function thinkingCloseCaseWorks(result) {
  return Boolean(result)
    && thinkingRequestAccepted(result)
    && assertionPassed(result, "thinking_absent")
    && failedThinkingAssertionsForResult(result).length === 0;
}

function thinkingOpeningWorks(result) {
  return Boolean(result)
    && thinkingRequestAccepted(result)
    && assertionPassed(result, "thinking_evidence_required")
    && failedThinkingAssertionsForResult(result).length === 0;
}

function thinkingClosingWorks(result) {
  return Boolean(result)
    && thinkingRequestAccepted(result)
    && assertionPassed(result, "thinking_absent")
    && failedThinkingAssertionsForResult(result).length === 0;
}

function thinkingAcceptedWithoutEvidence(result) {
  return Boolean(result)
    && result.support_conclusion === "schema_mismatch"
    && assertionFailed(result, "thinking_evidence_required");
}

function thinkingResultHasEvidence(result) {
  return Boolean(result)
    && (thinkingLocationsForResult(result).length > 0 || thinkingTokenEvidenceForResult(result).length > 0);
}

function thinkingRequestAccepted(result) {
  if (!result) return false;
  const status = Number(result.http_status || 0);
  return (status >= 200 && status < 300)
    || ["supported", "schema_mismatch", "ignored"].includes(result.support_conclusion);
}

function thinkingRequestRejected(result) {
  return Boolean(result)
    && ["rejected_400", "request_failed", "permission_limited"].includes(result.support_conclusion);
}

function assertionPassed(result, name) {
  return (result.assertions || []).some((assertion) => assertion.name === name && assertion.pass);
}

function assertionFailed(result, name) {
  return (result.assertions || []).some((assertion) => assertion.name === name && !assertion.pass);
}

function assertionMessage(result, name) {
  return (result.assertions || []).find((assertion) => assertion.name === name)?.message || "";
}

function thinkingEvidenceSummary(result) {
  const evidence = assertionMessage(result, "thinking_evidence_required")
    || assertionMessage(result, "thinking_location_probe")
    || assertionMessage(result, "thinking_absent")
    || assertionSummary(result.assertions);
  return evidence || result.message || "无额外证据";
}

function thinkingLocationsForResult(result) {
  return thinkingEvidenceSummary(result)
    .split("；")
    .filter((part) => part.startsWith("thinking 内容位置: "))
    .flatMap((part) => part.replace("thinking 内容位置: ", "").split(", "))
    .map((item) => item.trim())
    .filter(Boolean);
}

function thinkingTokenEvidenceForResult(result) {
  const fromAssertion = thinkingEvidenceSummary(result)
    .split("；")
    .filter((part) => part.startsWith("token 证据: "))
    .flatMap((part) => part.replace("token 证据: ", "").split(", "))
    .map((item) => item.trim())
    .filter(Boolean);
  if (fromAssertion.length) return fromAssertion;
  const tokens = [];
  const reasoning = reasoningTokenCountForResult(result);
  const thinking = thinkingTokenCountForResult(result);
  if (reasoning != null && reasoning > 0) tokens.push(`reasoning_tokens=${reasoning}`);
  if (thinking != null && thinking > 0) tokens.push(`thinking_tokens=${thinking}`);
  return tokens;
}

function thinkingDefaultSummary(result) {
  const locations = thinkingLocationsForResult(result);
  const tokens = thinkingTokenEvidenceForResult(result);
  if (locations.length || tokens.length) {
    return `默认可能开启或暴露 thinking（${[...locations, ...tokens].join("；")}）`;
  }
  return thinkingCaseShortSummary(result);
}

function thinkingCaseShortSummary(result) {
  const failed = failedAssertionsForResult(result).length;
  const suffix = failed ? `，${assertionSummary(result.assertions)}` : "";
  return `${conclusionMeta(result).label}，HTTP ${result.http_status || conclusionMeta(result).httpStatus || "—"}${suffix}`;
}

function uniqueStrings(values = []) {
  return Array.from(new Set(values.filter(Boolean)));
}

function expectedHTTPStatusForResult(result) {
  const status = result.expected_http_status || result.source_case?.expect?.http_status || 0;
  return Number(status) || 0;
}

function expectedSupportConclusionForResult(result) {
  const explicit = result.expected_support_conclusion || result.source_case?.expect?.support_conclusion;
  if (explicit) return explicit;
  const expectedStatus = expectedHTTPStatusForResult(result);
  if (expectedStatus >= 400) return "rejected_400";
  return inferSiliconFlowConclusion(result.source_case || {});
}

function failedAssertionsForResult(result) {
  return (result.assertions || []).filter((assertion) => !assertion.pass);
}

function failedThinkingAssertionsForResult(result) {
  return failedAssertionsForResult(result).filter((assertion) => String(assertion.name || "").startsWith("thinking_"));
}

function matchesExpectedResult(result) {
  const expected = expectedSupportConclusionForResult(result);
  const expectedStatus = expectedHTTPStatusForResult(result);
  const statusMatches = !expectedStatus || Number(result.http_status || 0) === expectedStatus;
  if (isCacheHitCase(result.source_case || { case_id: result.case_id, category: result.category })) {
    if (!statusMatches) return false;
    if (result.support_conclusion === "request_failed") return false;
    return failedAssertionsForResult(result).every((assertion) => assertion.pass);
  }
  const conclusionMatches = (result.support_conclusion || "unknown") === expected;
  if (!statusMatches || !conclusionMatches) return false;
  if (expected === "rejected_400" || expected === "permission_limited") return true;
  return failedAssertionsForResult(result).length === 0;
}

function expectationLabel(result) {
  return matchesExpectedResult(result) ? "符合预期" : "预期外";
}

function expectationClass(result) {
  return matchesExpectedResult(result) ? "expected" : "unexpected";
}

function expectationSummary(result) {
  const actual = supportConclusionMeta[result.support_conclusion]?.label || supportConclusionMeta.unknown.label;
  const expected = supportConclusionMeta[expectedSupportConclusionForResult(result)]?.label || supportConclusionMeta.supported.label;
  const expectedStatus = expectedHTTPStatusForResult(result);
  const statusText = expectedStatus ? `；预期 HTTP ${expectedStatus}，实际 HTTP ${result.http_status || "—"}` : "";
  return `测试结果：${expectationLabel(result)}；实际结论：${actual}；预期结论：${expected}${statusText}。`;
}

function categoryLabel(category) {
  const labels = {
    basic: "基础",
    sampling: "采样",
    sampling_combo: "采样组合",
    length: "长度",
    reasoning: "推理",
    output: "输出",
    tools: "tools",
    protocol: "协议",
    multiturn: "多轮对话",
    observability: "可观测性",
    compatibility_probe: "兼容性探针",
    debug: "调试",
    metadata: "元数据",
    extra: "扩展",
    multimodal: "多模态",
    search: "搜索",
    headers: "请求头",
    skill: "技能",
    beta: "Beta",
    capacity: "容量",
    cache: "缓存"
  };
  return labels[category] || category;
}

function isCapacityCase(testCase) {
  return testCase.category === "capacity" || testCase.capacity_case;
}

function isVlmCase(testCase) {
  const capability = String(testCase.requires_model_capability || "").toLowerCase();
  return testCase.category === "multimodal"
    || capability.startsWith("vision")
    || (testCase.parameters || []).some((param) => String(param).includes("image_url"));
}

function isOptionalExtensionCase(testCase) {
  return Boolean(testCase.optional) && !isVlmCase(testCase) && !isCapacityCase(testCase);
}

function isDefaultSelectedCase(testCase) {
  return !testCase.optional && !isVlmCase(testCase);
}

function isConnectivityCase(testCase) {
  const caseId = String(testCase?.case_id || "");
  // 连通性：每个协议只保留一条最小冒烟请求，验证 endpoint + 模型能否 200 返回。
  return /_(basic_minimal|messages_minimal)$/.test(caseId) || caseId === "am_basic_minimal";
}

function isProtocolStreamCaseP0(testCase) {
  if (testCase?.category !== "protocol") return false;
  const caseId = String(testCase?.case_id || "");
  return /_(protocol_stream_basic|stream_basic)$/.test(caseId) || caseId === "am_protocol_stream";
}

function isProtocolStreamCaseP0NonStream(testCase) {
  if (testCase?.category !== "protocol") return false;
  const caseId = String(testCase?.case_id || "");
  return /_protocol_stream_false$/.test(caseId) || caseId === "am_protocol_stream_false";
}

function isProtocolStreamUsageObservedCase(testCase) {
  if (testCase?.category !== "protocol") return false;
  const caseId = String(testCase?.case_id || "");
  return /_stream_usage_without_include_usage$/.test(caseId);
}

function isProtocolStreamUsageChunkShapeCase(testCase) {
  if (testCase?.category !== "protocol") return false;
  const caseId = String(testCase?.case_id || "");
  return /_(protocol_stream_usage_chunk_shape|stream_usage_chunk_shape)$/.test(caseId);
}

function isProtocolStreamCaseP1IncludeUsage(testCase) {
  if (testCase?.category !== "protocol") return false;
  if (isProtocolStreamCaseP0(testCase) || isProtocolStreamCaseP0NonStream(testCase) || isProtocolStreamUsageObservedCase(testCase) || isProtocolStreamUsageChunkShapeCase(testCase)) {
    return false;
  }
  const caseId = String(testCase?.case_id || "");
  return /_(protocol_stream_include_usage|stream_include_usage)$/.test(caseId)
    || caseId === "oa_stream_with_usage"
    || caseId === "or_stream_with_usage_deprecated_option";
}

function isProtocolStreamCaseP1(testCase) {
  return isProtocolStreamUsageObservedCase(testCase) || isProtocolStreamCaseP1IncludeUsage(testCase);
}

function isProtocolStreamCase(testCase) {
  return isProtocolStreamCaseP0(testCase)
    || isProtocolStreamCaseP0NonStream(testCase)
    || isProtocolStreamCaseP1(testCase)
    || isProtocolStreamUsageChunkShapeCase(testCase);
}

function isLengthPrecedenceCase(testCase) {
  const caseId = String(testCase?.case_id || "");
  if (testCase?.category !== "length") return false;
  return /_length_both_fields_precedence$/.test(caseId);
}

function isLengthStopComboCase(testCase) {
  const caseId = String(testCase?.case_id || "");
  if (testCase?.category !== "length") return false;
  return caseId.endsWith("_length_max_tokens_stop") || caseId.endsWith("_length_max_completion_tokens_stop");
}

function isLengthEdgeCase(testCase) {
  const caseId = String(testCase?.case_id || "");
  if (testCase?.category !== "length") return false;
  if (isLengthPrecedenceCase(testCase) || isLengthStopComboCase(testCase)) return false;
  if (caseId === "vllm_length_max_completion_tokens") return true;
  if (caseId === "or_length_deprecated_max_tokens") return true;
  if (caseId === "oa_length_deprecated_max_tokens") return true;
  if (caseId.endsWith("_length_max_tokens_null")) return true;
  if (caseId.endsWith("_length_legacy_max_tokens_probe")) return true;
  if (caseId === "claude_length_max_tokens") return true;
  return false;
}

function isLengthLegacyCase(testCase) {
  return isLengthEdgeCase(testCase) || isLengthStopComboCase(testCase);
}

function lengthCaseAxisGroup(testCase) {
  if (isOutputLengthCapacityCase(testCase)) return "capacity";
  if (isLengthPrecedenceCase(testCase)) return "precedence";
  if (isLengthFieldEffectiveCase(testCase)) return "effective";
  if (isLengthAcceptanceCase(testCase)) return "accept";
  if (isLengthStopComboCase(testCase)) return "stop_combo";
  if (isLengthEdgeCase(testCase)) return "edge";
  return "";
}

function lengthCaseFieldRank(testCase) {
  const caseId = String(testCase?.case_id || "");
  if (caseId.includes("max_completion_tokens")) return 1;
  if (caseId.includes("max_tokens")) return 0;
  return 2;
}

function sortOutputLengthCases(cases = []) {
  return [...cases].sort((left, right) => {
    const axisLeft = LENGTH_AXIS_ORDER.indexOf(lengthCaseAxisGroup(left));
    const axisRight = LENGTH_AXIS_ORDER.indexOf(lengthCaseAxisGroup(right));
    if (axisLeft !== axisRight) return axisLeft - axisRight;
    const fieldLeft = lengthCaseFieldRank(left);
    const fieldRight = lengthCaseFieldRank(right);
    if (fieldLeft !== fieldRight) return fieldLeft - fieldRight;
    return String(left.case_id || "").localeCompare(String(right.case_id || ""));
  });
}

function partitionOutputLengthForDisplay(cases = []) {
  const buckets = new Map(LENGTH_AXIS_ORDER.map((axis) => [axis, []]));
  for (const testCase of cases) {
    const axis = lengthCaseAxisGroup(testCase);
    if (!axis || !buckets.has(axis)) continue;
    buckets.get(axis).push(testCase);
  }
  return LENGTH_AXIS_ORDER
    .filter((axis) => buckets.get(axis)?.length)
    .map((axis) => [axis, sortOutputLengthCases(buckets.get(axis))]);
}

function isLengthFieldEffectiveCase(testCase) {
  if (testCase?.category !== "length") return false;
  const caseId = String(testCase.case_id || "");
  return /_length_max_(tokens|completion_tokens)_only_effective$/.test(caseId);
}

function isLengthAcceptanceCase(testCase) {
  if (testCase?.category !== "length") return false;
  if (isLengthEdgeCase(testCase) || isLengthStopComboCase(testCase) || isLengthPrecedenceCase(testCase) || isLengthFieldEffectiveCase(testCase)) return false;
  const caseId = String(testCase.case_id || "");
  return /_length_max_(completion_)?tokens$/.test(caseId);
}

function isOutputLengthCapacityCase(testCase) {
  if (!isCapacityCase(testCase)) return false;
  const probeKind = testCase?.payload?.__capacity_probe?.kind;
  if (["max_input", "max_output", "total_context"].includes(probeKind)) {
    return true;
  }
  return [
    "capacity_max_input_boundary",
    "capacity_max_output_boundary",
    "capacity_total_context_boundary"
  ].includes(String(testCase?.case_id || ""));
}

function isOutputLengthCase(testCase) {
  return isLengthAcceptanceCase(testCase)
    || isLengthLegacyCase(testCase)
    || isLengthPrecedenceCase(testCase)
    || isLengthFieldEffectiveCase(testCase)
    || isOutputLengthCapacityCase(testCase);
}

function outputLengthCaseTitle(testCase) {
  if (!testCase) return "";
  const caseId = String(testCase.case_id || "");
  const params = testCase.parameters || [];

  if (caseId.endsWith("_length_deprecated_max_tokens") || caseId.endsWith("_length_legacy_max_tokens_probe") || caseId === "claude_length_max_tokens") {
    return RUN_V02_OUTPUT_LENGTH_EDGE_DEPRECATED_MAX_TOKENS_TITLE;
  }
  if (caseId.endsWith("_length_max_tokens_null")) {
    return RUN_V02_OUTPUT_LENGTH_EDGE_MAX_TOKENS_NULL_TITLE;
  }
  if (caseId.endsWith("_length_max_tokens_stop")) {
    return RUN_V02_OUTPUT_LENGTH_STOP_MAX_TOKENS_TITLE;
  }
  if (caseId.endsWith("_length_max_completion_tokens_stop")) {
    return RUN_V02_OUTPUT_LENGTH_STOP_MAX_COMPLETION_TITLE;
  }
  if (caseId === "vllm_length_max_completion_tokens") {
    return RUN_V02_OUTPUT_LENGTH_EDGE_MAX_COMPLETION_COMPAT_TITLE;
  }
  if (caseId.endsWith("_length_both_fields_precedence")) {
    return RUN_V02_OUTPUT_LENGTH_PRECEDENCE_TITLE;
  }
  if (caseId.endsWith("_length_max_tokens_only_effective")) {
    return RUN_V02_OUTPUT_LENGTH_EFFECTIVE_MAX_TOKENS_TITLE;
  }
  if (caseId.endsWith("_length_max_completion_tokens_only_effective")) {
    return RUN_V02_OUTPUT_LENGTH_EFFECTIVE_MAX_COMPLETION_TITLE;
  }
  if (caseId === "capacity_max_input_boundary") {
    return RUN_V02_OUTPUT_LENGTH_CAPACITY_INPUT_TITLE;
  }
  if (caseId === "capacity_max_output_boundary") {
    return RUN_V02_OUTPUT_LENGTH_CAPACITY_OUTPUT_TITLE;
  }
  if (caseId === "capacity_total_context_boundary") {
    return RUN_V02_OUTPUT_LENGTH_CAPACITY_CONTEXT_TITLE;
  }
  if (isLengthAcceptanceCase(testCase)) {
    if (params.includes("max_completion_tokens") && !params.includes("max_tokens")) {
      return RUN_V02_OUTPUT_LENGTH_ACCEPT_MAX_COMPLETION_TITLE;
    }
    if (params.includes("max_tokens")) {
      return RUN_V02_OUTPUT_LENGTH_ACCEPT_MAX_TOKENS_TITLE;
    }
    if (testCase.payload?.max_completion_tokens != null) {
      return RUN_V02_OUTPUT_LENGTH_ACCEPT_MAX_COMPLETION_TITLE;
    }
    return RUN_V02_OUTPUT_LENGTH_ACCEPT_MAX_TOKENS_TITLE;
  }
  return "";
}

function outputLengthCaseTooltip(testCase) {
  if (!testCase) return "";
  const caseId = String(testCase.case_id || "");
  if (isOutputLengthCapacityCase(testCase)) return RUN_V02_OUTPUT_LENGTH_CAPACITY_TOOLTIP;
  if (caseId.endsWith("_length_deprecated_max_tokens") || caseId.endsWith("_length_legacy_max_tokens_probe") || caseId === "claude_length_max_tokens") {
    return RUN_V02_OUTPUT_LENGTH_EDGE_DEPRECATED_TOOLTIP;
  }
  if (caseId.endsWith("_length_max_tokens_null")) return RUN_V02_OUTPUT_LENGTH_EDGE_NULL_TOOLTIP;
  if (caseId.endsWith("_length_max_tokens_stop")) return RUN_V02_OUTPUT_LENGTH_STOP_MAX_TOKENS_TOOLTIP;
  if (caseId.endsWith("_length_max_completion_tokens_stop")) return RUN_V02_OUTPUT_LENGTH_STOP_MAX_COMPLETION_TOOLTIP;
  if (caseId === "vllm_length_max_completion_tokens") return RUN_V02_OUTPUT_LENGTH_EDGE_COMPAT_TOOLTIP;
  if (caseId.endsWith("_length_both_fields_precedence")) return RUN_V02_OUTPUT_LENGTH_PRECEDENCE_TOOLTIP;
  if (caseId.endsWith("_length_max_tokens_only_effective")) return RUN_V02_OUTPUT_LENGTH_EFFECTIVE_MAX_TOKENS_TOOLTIP;
  if (caseId.endsWith("_length_max_completion_tokens_only_effective")) {
    return RUN_V02_OUTPUT_LENGTH_EFFECTIVE_MAX_COMPLETION_TOOLTIP;
  }
  if (isLengthAcceptanceCase(testCase)) {
    const params = testCase.parameters || [];
    if (params.includes("max_completion_tokens") && !params.includes("max_tokens")) {
      return RUN_V02_OUTPUT_LENGTH_ACCEPT_MAX_COMPLETION_TOOLTIP;
    }
    if (testCase.payload?.max_completion_tokens != null && testCase.payload?.max_tokens == null) {
      return RUN_V02_OUTPUT_LENGTH_ACCEPT_MAX_COMPLETION_TOOLTIP;
    }
    return RUN_V02_OUTPUT_LENGTH_ACCEPT_MAX_TOKENS_TOOLTIP;
  }
  return "";
}

function isProtocolSamplingCase(testCase) {
  if (testCase?.category !== "protocol") return false;
  const caseId = String(testCase?.case_id || "");
  return /_protocol_sampling_temperature_/.test(caseId);
}

function isProtocolThinkingCase(testCase) {
  if (!testCase) return false;
  const caseId = String(testCase.case_id || "");
  if (caseId.startsWith("ali_protocol_thinking_") || caseId.startsWith("am_protocol_thinking_")) return true;
  return PROTOCOL_THINKING_CANONICAL_CASE_IDS.has(caseId);
}

function isProtocolToolsCase(testCase) {
  if (!testCase) return false;
  return PROTOCOL_TOOLS_CANONICAL_CASE_IDS.has(String(testCase.case_id || ""));
}

function isProtocolResponseFormatCase(testCase) {
  if (!testCase) return false;
  return PROTOCOL_RESPONSE_FORMAT_CANONICAL_CASE_IDS.has(String(testCase.case_id || ""));
}

function isCacheHitCase(testCase) {
  if (!testCase) return false;
  const caseId = String(testCase.case_id || "");
  return testCase.category === "cache" || testCase.cache_case === true || caseId.startsWith("cache_");
}

function thinkingCaseMeta(testCase) {
  return testCase?.expect || {};
}

function thinkingCaseAxisGroup(axis) {
  if (axis === "switch_on" || axis === "switch_off") return "switch";
  if (axis === "switch_equiv_on" || axis === "switch_equiv_off") return "switch_equiv";
  if (axis === "switch_conflict") return "switch_conflict";
  return axis || "";
}

function thinkingChannelFieldForGroup(cfg, group) {
  if (!cfg) return "";
  if (group === "switch") return cfg.switchField || "";
  if (group === "switch_equiv") {
    const alts = cfg.alternateSwitchDialects || [];
    return alts.map((item) => item.field).filter(Boolean).join(" / ") || "thinking.type";
  }
  if (group === "switch_conflict") {
    return [cfg.switchField, ...(cfg.alternateSwitchDialects || []).map((item) => item.field)].filter(Boolean).join(" + ");
  }
  if (group === "intensity") return cfg.intensityField || "";
  if (group === "output") return cfg.outputField || "";
  return "";
}

/** canonical thinking case 不以渠道文档裁剪；仅排除废弃的 legacy 开关 case。 */
function thinkingCasesForChannel(cases = []) {
  return cases.filter((testCase) => !LEGACY_SWITCH_CASE_IDS.has(testCase.case_id));
}

function thinkingCaseSortKey(testCase) {
  const meta = thinkingCaseMeta(testCase);
  const group = thinkingCaseAxisGroup(meta.axis);
  const groupRank = THINKING_AXIS_ORDER.indexOf(group);
  const within = meta.axis === "switch_off" || meta.axis === "switch_equiv_off" ? 1 : 0;
  const optional = testCase.optional ? 1 : 0;
  return (groupRank < 0 ? 99 : groupRank) * 100 + within * 10 + optional;
}

function partitionProtocolThinkingByAxis(cases = []) {
  const byAxis = new Map();
  for (const testCase of cases) {
    const group = thinkingCaseAxisGroup(thinkingCaseMeta(testCase).axis);
    if (!THINKING_AXIS_ORDER.includes(group)) continue;
    if (!byAxis.has(group)) byAxis.set(group, []);
    byAxis.get(group).push(testCase);
  }
  for (const list of byAxis.values()) {
    list.sort((a, b) => thinkingCaseSortKey(a) - thinkingCaseSortKey(b));
  }
  return THINKING_AXIS_ORDER.filter((group) => byAxis.has(group)).map((group) => [group, byAxis.get(group)]);
}

/** 将 switch + switch_equiv 合并为同一「思考开关」展示分区。 */
function partitionProtocolThinkingForDisplay(cases = []) {
  const axes = partitionProtocolThinkingByAxis(cases);
  const switchCases = [];
  const otherAxes = [];
  for (const [group, groupCases] of axes) {
    if (group === "switch" || group === "switch_equiv") {
      switchCases.push(...groupCases);
    } else {
      otherAxes.push([group, groupCases]);
    }
  }
  const merged = [];
  if (switchCases.length) {
    switchCases.sort((a, b) => thinkingCaseSortKey(a) - thinkingCaseSortKey(b));
    merged.push(["switch", switchCases]);
  }
  merged.push(...otherAxes);
  return merged;
}

function thinkingCaseSwitchFieldTag(testCase) {
  const caseId = testCase.case_id;
  if (caseId === "thinking_enable_thinking_true" || caseId === "thinking_enable_thinking_false") {
    return "enable_thinking";
  }
  if (caseId === "thinking_switch_alt_thinking_enabled" || caseId === "thinking_switch_alt_thinking_disabled") {
    return "thinking.type";
  }
  if (caseId === "thinking_switch_conflict_enable_off_thinking_on"
    || caseId === "thinking_switch_conflict_enable_on_thinking_off") {
    return "enable_thinking + thinking.type";
  }
  const meta = thinkingCaseMeta(testCase);
  if (meta.dialect === "qwen_enable_thinking") return "enable_thinking";
  if (meta.dialect === "thinking_object") return "thinking.type";
  return "";
}

function thinkingSwitchFieldTags() {
  return [...UNIVERSAL_SWITCH_FIELD_ORDER];
}

function groupThinkingCasesBySwitchField(cases) {
  const buckets = new Map(UNIVERSAL_SWITCH_FIELD_ORDER.map((field) => [field, []]));
  for (const testCase of cases) {
    const field = thinkingCaseSwitchFieldTag(testCase);
    if (!field || field.includes(" + ")) continue;
    if (!buckets.has(field)) buckets.set(field, []);
    buckets.get(field).push(testCase);
  }
  return UNIVERSAL_SWITCH_FIELD_ORDER
    .filter((field) => buckets.get(field)?.length)
    .map((field) => ({ field, cases: buckets.get(field) }));
}

/** canonical tools case 全量展示，不以 protocol-matrix 是否列出 parallel_tool_calls 裁剪。 */
function toolsCasesForChannel(cases = []) {
  return cases;
}

/** canonical response_format case 全量展示 P0 三件套，不以渠道文档是否列出参数或枚举值裁剪。 */
function responseFormatCasesForChannel(cases = []) {
  return cases;
}

function protocolResponseFormatCaseTooltip(testCase) {
  const caseId = String(testCase?.case_id || "");
  if (caseId === "response_format_text") return RUN_V02_RESPONSE_FORMAT_TEXT_TOOLTIP;
  if (caseId === "response_format_json_object") return RUN_V02_RESPONSE_FORMAT_JSON_OBJECT_TOOLTIP;
  if (caseId === "response_format_json_schema") return RUN_V02_RESPONSE_FORMAT_JSON_SCHEMA_TOOLTIP;
  return RUN_V02_PROTOCOL_RESPONSE_FORMAT_TOOLTIP;
}

function protocolToolsCaseTooltip(testCase) {
  const caseId = String(testCase?.case_id || "");
  if (caseId === "tools_auto") return RUN_V02_TOOLS_AUTO_TOOLTIP;
  if (caseId === "tools_choice_required") return RUN_V02_TOOLS_REQUIRED_TOOLTIP;
  if (caseId === "tools_multiturn_tool_result") return RUN_V02_TOOLS_MULTITURN_TOOLTIP;
  if (caseId === "tools_choice_none") return RUN_V02_TOOLS_CHOICE_NONE_TOOLTIP;
  if (caseId === "tools_named_function") return RUN_V02_TOOLS_NAMED_FUNCTION_TOOLTIP;
  if (caseId === "tools_parallel_false") return RUN_V02_TOOLS_PARALLEL_FALSE_TOOLTIP;
  if (caseId === "tools_reasoning_content_replay") return RUN_V02_TOOLS_REASONING_CONTENT_REPLAY_TOOLTIP;
  return RUN_V02_PROTOCOL_TOOLS_TOOLTIP;
}

function runV02ModelSupportsTools() {
  return state.runV02.modelCapabilities?.tools?.supported === true;
}

async function refreshRunV02ModelToolsCapability() {
  const modelId = ensureRunV02ModelId();
  if (!modelId) {
    state.runV02.modelCapabilities.tools = { supported: false, source: "empty" };
    return state.runV02.modelCapabilities.tools;
  }
  state.runV02.modelCapabilities.tools = { supported: false, source: "loading" };
  const api = window.NOCTUA_EVAL_MODEL_CAPABILITIES;
  if (!api?.evalModelSupportsTools) {
    state.runV02.modelCapabilities.tools = { supported: false, source: "missing_api" };
    return state.runV02.modelCapabilities.tools;
  }
  const result = await api.evalModelSupportsTools(modelId);
  if (state.runV02.modelId !== modelId) return state.runV02.modelCapabilities.tools;
  state.runV02.modelCapabilities.tools = result;
  return result;
}

function protocolSamplingCaseTitle(testCase) {
  return caseTitleZh[testCase?.case_id] || testCase?.title || testCase?.case_id || "";
}

function runV02ProtocolEvalChannelId(route) {
  if (!route) return null;
  const sources = getProtocolMatrix();
  const candidates = [route.runtimeChannelId, route.platformId, route.channelId].filter(Boolean);
  for (const id of candidates) {
    if (sources?.isProtocolEvalChannel?.(id)) return id;
    if (id === "aliyun-cn" || id === "aliyun-us" || id === "aliyun-sg") return "aliyun";
  }
  return null;
}

function runV02CaseGroupHint(group) {
  if (!group) return "先选择测评分组，再勾选该分组内的 case。";
  if (group.key === "connectivity") {
    return `当前分组：${group.title}。发一句 Hello，验证该协议能否成功请求当前模型。`;
  }
  if (group.key === "protocol") {
    return `当前分组：${group.title}。验证流式与非流式：stream=true 应增量返回多个 chunk（数据块，内容为 content 正文或 reasoning_content 思考过程，探测 1 次）；不传 include_usage（让流式响应带 token 用量统计的开关）时观测各渠道是否仍返回 usage；传 include_usage=true 时必须有 usage；stream=false 返回普通 JSON。`;
  }
  if (group.key === "protocol_sampling") {
    const oemCount = group.cases.filter((testCase) => oemBehaviorsApi().isOemReferenceCase?.(testCase)).length;
    const oemNote = oemCount
      ? ` 下方「原厂参考」子区含 ${oemCount} 个按测评模型 OEM 文档补充的 case，对所有已选渠道各跑一遍。`
      : "";
    return `当前分组：${group.title}。验证 temperature 在 JSON integer（整数写法 1、2）与 float（小数写法 1.0、2.0）下各渠道的实际行为是否与官方文档一致。${oemNote}`;
  }
  if (group.key === "protocol_thinking") {
    return `当前分组：${group.title}。全渠道展示 canonical 思考模式探针（含各枚举档位与多方言字段），不以 protocol-matrix 文档裁剪；以跑批实测发现文档未写或与文档不一致的行为。`;
  }
  if (group.key === "protocol_tools") {
    const cap = state.runV02.modelCapabilities?.tools;
    if (cap?.source === "loading") {
      return `当前分组：${group.title}。正在从 OpenRouter 解析模型是否支持 tools…`;
    }
    if (!runV02ModelSupportsTools()) {
      return `当前测评模型未标注 tools 支持（来源：${cap?.source || "unknown"}），不展示工具调用 case。`;
    }
    return `当前分组：${group.title}。对支持 tools 的测评模型，验证各渠道是否接受 tools 参数、能否真正发起工具调用，以及多轮 tool 消息是否可用。`;
  }
  if (group.key === "protocol_response_format") {
    return `当前分组：${group.title}。仅测 response_format（text / json_object / json_schema），不含 structured_outputs 等其他输出控制参数；全量展示三件套，以跑批实测为准。`;
  }
  if (group.key === "cache_hit") {
    return `当前分组：${group.title}。每个 case 对同一模型发 2 次相同请求（预热 + 测量），对比各渠道 usage 中的缓存命中 tokens 与命中率；0% 命中记为 warning，不因未命中判 fail。`;
  }
  if (group.key === "output_length") {
    return `当前分组：${group.title}。核心三轴：接受性（各字段能否传）→ 生效性（是否真截断）→ 双参优先级（同时传谁说了算）；对比两字段单参结果可判断含义是否一致。组合/边缘/容量 case 默认不勾选。`;
  }
  return `当前分组：${group.title}。仅运行本分组内已勾选的 case。`;
}

function updateRunV02CaseGroupHint() {
  if (!els.runV02CaseHint) return;
  els.runV02CaseHint.textContent = runV02CaseGroupHint(runV02ActiveCaseGroup());
}

function focusParametersForCase(testCase) {
  if (isCapacityCase(testCase)) return [];
  return (testCase.parameters || []).filter((param) => !foundationalCaseParameters.has(param));
}

function foundationalParametersForCase(testCase) {
  return (testCase.parameters || []).filter((param) => foundationalCaseParameters.has(param));
}

function capacityCaseDisplay(testCase) {
  const probe = testCase.payload?.__capacity_probe || {};
  const candidates = Array.isArray(probe.candidates) ? probe.candidates : [];
  const range = candidates.length
    ? `${formatCapacityTier(candidates[0])} → ${formatCapacityTier(candidates[candidates.length - 1])}`
    : "常见档位";
  if (probe.kind === "total_context") {
    const ratio = Number(probe.context_safety_margin_ratio || CONTEXT_CAPACITY_SAFETY_MARGIN_RATIO);
    return {
      kind: "total_context",
      title: "最大Total Context",
      relation: "最大Total Context",
      meta: "逐档测试",
      chips: [range, `按档位减 ${trimNumber(ratio * 100, 1)}% 探测`, `保留输出 ${probe.context_output_tokens || 8} tokens`]
    };
  }
  if (probe.kind === "max_input") {
    return {
      kind: "max_input",
      title: "最大Input",
      relation: "最大Input",
      meta: "逐档测试",
      chips: [range, "固定输出 16 tokens", "找最大输入档位"]
    };
  }
  if (probe.kind === "max_output_effective") {
    return {
      kind: "max_output_effective",
      title: "Max Output 生效",
      relation: "Max Output 生效",
      meta: "强制长输出",
      chips: [range, "小 cap 强制长输出", "检查 finish_reason=length"]
    };
  }
  if (probe.kind === "thinking_budget") {
    return {
      kind: "thinking_budget",
      title: "最大Thinking Budget",
      relation: "最大Thinking Budget",
      meta: "逐档测试",
      chips: [range, probe.thinking_field || "thinking_budget", "接受 / 生效 / 上限"]
    };
  }
  return {
    kind: "max_output",
    title: "最大Max Output",
    relation: "最大Max Output",
    meta: "逐档测试",
    chips: [range, "逐档测试"]
  };
}

function partitionCases(cases = []) {
  const singles = new Map();
  const combos = [];
  const scenarios = [];
  const vlm = [];
  const optional = [];

  for (const testCase of cases) {
    if (isVlmCase(testCase)) {
      vlm.push(testCase);
      continue;
    }
    if (isOptionalExtensionCase(testCase)) {
      optional.push(testCase);
      continue;
    }
    const focusParams = focusParametersForCase(testCase);
    if (focusParams.length === 1) {
      const param = focusParams[0];
      if (!singles.has(param)) singles.set(param, []);
      singles.get(param).push(testCase);
      continue;
    }
    if (focusParams.length > 1) {
      combos.push(testCase);
      continue;
    }
    scenarios.push(testCase);
  }

  return { singles, combos, scenarios, vlm, optional };
}

function reportGroupForResult(result = {}) {
  const sourceCase = result.source_case || null;
  const category = result.category || sourceCase?.category || "case";
  if ((sourceCase && isCapacityCase(sourceCase)) || category === "capacity" || isCapacityResult(result)) {
    return {
      key: "capacity",
      order: 60,
      title: "容量上限测试",
      description: "看这个模型在最大输出长度和上下文长度上能撑到哪里，方便判断是否适合长文本或批量任务。"
    };
  }
  if (sourceCase?.custom || category === "custom") {
    return {
      key: "custom",
      order: 70,
      title: "自定义检查项",
      description: "临时补充的 payload，用来验证这次评测里的特殊问题或业务场景。"
    };
  }
  if ((sourceCase && isVlmCase(sourceCase)) || category === "multimodal") {
    return {
      key: "vlm",
      order: 50,
      title: "图像输入能力",
      description: "验证模型是否能理解图片、多图对比等视觉输入，非视觉模型通常不需要看这一组。"
    };
  }
  if (sourceCase && isProtocolThinkingCase(sourceCase)) {
    return {
      key: "protocol_thinking",
      order: 35,
      title: "协议 / 思考模式",
      description: "按当前渠道官方方言（开关 / 强度 / 输出）验证思考模式字段是否被接受，以及开启、关闭、不同强度档下响应中的 thinking 内容与 token 证据是否符合预期。"
    };
  }
  if (sourceCase && isProtocolResponseFormatCase(sourceCase)) {
    return {
      key: "protocol_response_format",
      order: 36,
      title: "协议 / 输出控制",
      description: "验证 response_format 参数（text / json_object / json_schema）是否被接受，以及 JSON 模式下的输出是否合法。"
    };
  }
  if (sourceCase && isOptionalExtensionCase(sourceCase)) {
    return {
      key: "optional",
      order: 40,
      title: "可选扩展能力",
      description: "验证 provider 或模型的增强能力，例如流式 usage、前缀续写、搜索或厂商扩展参数。"
    };
  }
  const focusParams = sourceCase ? focusParametersForCase(sourceCase) : [];
  if (focusParams.length === 1) {
    const parameter = focusParams[0];
    return {
      key: `single:${parameter}`,
      order: 20,
      title: `${parameter} 单参数能力`,
      description: `集中查看 ${parameter} 相关请求是否被正确接受，响应是否符合预期。`
    };
  }
  if (focusParams.length > 1) {
    return {
      key: "combo",
      order: 30,
      title: "参数组合能力",
      description: "验证多个参数同时出现时是否还能稳定工作，适合发现单参数测试看不出的兼容问题。"
    };
  }
  if (["basic", "protocol", "multiturn", "tools", "headers"].includes(category)) {
    return {
      key: "scenario",
      order: 10,
      title: "基础协议与场景",
      description: "确认最基础的请求结构、消息上下文、工具调用和响应格式是否能正常跑通。"
    };
  }
  return {
    key: `category:${category}`,
    order: 35,
    title: `${categoryLabel(category)}能力`,
    description: "同一类检查项放在一起看，方便判断问题集中在哪个能力面。"
  };
}

function reportGroupStats(results = []) {
  const stats = historyStats(results);
  const unexpected = results.filter((result) => !matchesExpectedResult(result)).length;
  const diffs = results.reduce((sum, result) => sum + Number(result.diff_count || 0), 0);
  return {
    ...stats,
    unexpected,
    diffs
  };
}

function reportGroupTone(stats = {}) {
  if (stats.unexpected || stats.requestFailed || stats.schemaMismatch) return "fail";
  if (stats.ignored || stats.permissionLimited || stats.rejected || stats.diffs) return "warn";
  return "pass";
}

function reportGroupSummaryText(stats = {}) {
  const total = stats.total || 0;
  const expectedPass = stats.expectedPass || 0;
  const unexpected = stats.unexpected || 0;
  const issueParts = [
    stats.ignored ? `接受未证明 ${stats.ignored}` : "",
    stats.permissionLimited ? `权限受限 ${stats.permissionLimited}` : "",
    stats.rejected ? `400 ${stats.rejected}` : "",
    stats.requestFailed ? `请求失败 ${stats.requestFailed}` : "",
    stats.schemaMismatch ? `断言失败 ${stats.schemaMismatch}` : "",
    stats.diffs ? `结构差异 ${stats.diffs}` : ""
  ].filter(Boolean);
  const issueText = issueParts.length ? issueParts.join(" · ") : "无明显异常";
  return `达标 ${expectedPass}/${total}；预期外 ${unexpected}；${issueText}`;
}

function historyPassSummaryText(stats = {}) {
  const total = stats.total || 0;
  const expectedPass = stats.expectedPass || 0;
  return `${expectedPass} 个达标，占 ${percentText(expectedPass, total)}`;
}

function historyIssueSummaryText(stats = {}) {
  const pending = (stats.ignored || 0) + (stats.permissionLimited || 0);
  const rejected = stats.rejected || 0;
  const failed = (stats.requestFailed || 0) + (stats.schemaMismatch || 0);
  if (!pending && !rejected && !failed) return "无明显异常";
  return [
    pending ? `${pending} 个结果需要人工确认` : "",
    rejected ? `${rejected} 个请求被接口拒绝` : "",
    failed ? `${failed} 个请求失败或断言未通过` : ""
  ].filter(Boolean).join(" · ");
}

function historyDiffSummaryText(stats = {}) {
  const diffs = stats.diffs || 0;
  return diffs ? `${diffs} 处差异` : "无结构差异";
}

function groupReportResults(results = []) {
  const groups = new Map();
  results.forEach((rawResult, index) => {
    const result = enrichResultAxes(rawResult);
    const meta = reportGroupForResult(result);
    const existing = groups.get(meta.key);
    if (existing) {
      existing.results.push(result);
      return;
    }
    groups.set(meta.key, {
      ...meta,
      firstIndex: index,
      results: [result]
    });
  });
  const built = Array.from(groups.values());
  for (const group of built) {
    if (group.key === "protocol_thinking") {
      group.results.sort((left, right) =>
        thinkingCaseSortKey(left.source_case || {}) - thinkingCaseSortKey(right.source_case || {}));
    }
  }
  return built.sort((left, right) =>
    left.order - right.order || left.firstIndex - right.firstIndex || left.title.localeCompare(right.title)
  );
}

function capacityCasesForProvider(providerId = currentProviderId(), modelOverride = undefined) {
  if (!providerId || state.selectedEndpointId !== "chat_completions") return [];
  if (providerId === "thinking") return [];
  const model = modelOverride !== undefined ? String(modelOverride || "").trim() : (els.modelName?.value.trim() || "");
  const candidateText = CAPACITY_CANDIDATES.map(formatCapacityTier).join("、");
  const budgetText = THINKING_BUDGET_CANDIDATES.map(formatCapacityTier).join("、");
  const capsText = OUTPUT_EFFECTIVE_CAPS.map(formatCapacityTier).join("、");
  const thinkingMapping = thinkingBudgetFieldForProvider(providerId);
  const cases = [
    {
      case_id: "capacity_max_input_boundary",
      title: "最大Input",
      category: "capacity",
      parameters: ["最大Input"],
      method: "POST",
      path: "/chat/completions",
      custom: true,
      capacity_case: true,
      payload: {
        model,
        __capacity_probe: {
          kind: "max_input",
          candidates: CAPACITY_CANDIDATES,
          context_safety_margin_ratio: CONTEXT_CAPACITY_SAFETY_MARGIN_RATIO
        }
      },
      expect: { http_status: 200, support_conclusion: "supported" },
      notes: [`按常见输入档位从高到低测试：${candidateText}；输出固定 16 tokens，定位最大可接受输入长度。`]
    },
    {
      case_id: "capacity_max_output_boundary",
      title: "最大Max Output",
      category: "capacity",
      parameters: ["最大Max Output"],
      method: "POST",
      path: "/chat/completions",
      custom: true,
      capacity_case: true,
      payload: {
        model,
        __capacity_probe: {
          kind: "max_output",
          candidates: CAPACITY_CANDIDATES
        }
      },
      expect: { http_status: 200, support_conclusion: "supported" },
      notes: [`按常见档位从高到低测试：${candidateText}`]
    },
    {
      case_id: "capacity_max_output_effective",
      title: "Max Output 生效",
      category: "capacity",
      parameters: ["Max Output 生效"],
      method: "POST",
      path: "/chat/completions",
      custom: true,
      capacity_case: true,
      payload: {
        model,
        __capacity_probe: {
          kind: "max_output_effective",
          candidates: OUTPUT_EFFECTIVE_CAPS
        }
      },
      expect: { http_status: 200, support_conclusion: "supported" },
      notes: [`在小 cap（${capsText}）下强制长输出，检查是否被截断（finish_reason=length 且 completion_tokens≈cap），判断 max_tokens 是否真生效。`]
    },
    {
      case_id: "capacity_total_context_boundary",
      title: "最大Total Context",
      category: "capacity",
      parameters: ["最大Total Context"],
      method: "POST",
      path: "/chat/completions",
      custom: true,
      capacity_case: true,
      payload: {
        model,
        __capacity_probe: {
          kind: "total_context",
          candidates: CAPACITY_CANDIDATES,
          context_safety_margin_ratio: CONTEXT_CAPACITY_SAFETY_MARGIN_RATIO,
          context_output_tokens: 8
        }
      },
      expect: { http_status: 200, support_conclusion: "supported" },
      notes: [`按常见总上下文档位从高到低测试：${candidateText}；实际请求按每档减 ${trimNumber(CONTEXT_CAPACITY_SAFETY_MARGIN_RATIO * 100, 1)}% 构造，避免 tokenizer 临界误差。`]
    }
  ];
  if (thinkingMapping) {
    cases.push({
      case_id: "capacity_thinking_budget_boundary",
      title: "最大Thinking Budget",
      category: "capacity",
      parameters: ["最大Thinking Budget"],
      method: "POST",
      path: "/chat/completions",
      custom: true,
      capacity_case: true,
      requires_model_capability: "reasoning",
      payload: {
        model,
        __capacity_probe: {
          kind: "thinking_budget",
          candidates: THINKING_BUDGET_CANDIDATES,
          thinking_field: thinkingMapping.field,
          enable_thinking: thinkingMapping.enableThinking
        }
      },
      expect: { http_status: 200, support_conclusion: "supported" },
      notes: [`仅推理模型有效。用 ${thinkingMapping.field} 按档位（${budgetText}）测试是否被接受、最大可传值，以及 reasoning_tokens 是否随预算变化（生效）。`]
    });
  }
  return cases;
}

function outputLengthCapacityCasesForRunV02(protocolId, modelId = "") {
  if (protocolId !== "chat_completions") return [];
  const providerId = runV02CaseProviderId(state.runV02.baselineRoute);
  if (!providerId || providerId === "thinking") return [];
  return capacityCasesForProvider(providerId, modelId).filter((testCase) => (
    testCase.case_id !== "capacity_thinking_budget_boundary"
    && testCase.case_id !== "capacity_max_output_effective"
  ));
}

function cacheCasesForRunV02(protocolId, modelId = "") {
  if (!protocolId || !modelId) return [];
  const model = String(modelId).trim();
  if (!model) return [];
  const baseProbe = { warmup_delay_ms: 400 };
  const defs = [
    {
      case_id: "cache_passive_long_prompt",
      title: RUN_V02_CACHE_PASSIVE_TITLE,
      kind: "passive",
      protocols: new Set(["chat_completions", "anthropic_messages"]),
      optional: false
    },
    {
      case_id: "cache_prompt_cache_key",
      title: RUN_V02_CACHE_PROMPT_KEY_TITLE,
      kind: "prompt_cache_key",
      protocols: new Set(["chat_completions"]),
      optional: false
    },
    {
      case_id: "cache_control_ephemeral",
      title: RUN_V02_CACHE_CONTROL_TITLE,
      kind: "cache_control",
      protocols: new Set(["chat_completions", "anthropic_messages"]),
      optional: true
    },
    {
      case_id: "cache_passive_hit_rate_85",
      title: RUN_V02_CACHE_PASSIVE_HIT_RATE_85_TITLE,
      kind: "passive",
      protocols: new Set(["chat_completions", "anthropic_messages"]),
      optional: true,
      min_hit_rate: 0.85
    },
    {
      case_id: "cache_prompt_cache_key_hit_rate_85",
      title: RUN_V02_CACHE_PROMPT_KEY_HIT_RATE_85_TITLE,
      kind: "prompt_cache_key",
      protocols: new Set(["chat_completions"]),
      optional: true,
      min_hit_rate: 0.85
    },
    {
      case_id: "cache_control_ephemeral_hit_rate_85",
      title: RUN_V02_CACHE_CONTROL_HIT_RATE_85_TITLE,
      kind: "cache_control",
      protocols: new Set(["chat_completions", "anthropic_messages"]),
      optional: true,
      min_hit_rate: 0.85
    }
  ];
  return defs
    .filter((def) => def.protocols.has(protocolId))
    .map((def) => ({
      case_id: def.case_id,
      title: def.title,
      category: "cache",
      parameters: ["缓存命中率"],
      custom: true,
      cache_case: true,
      optional: def.optional,
      method: "POST",
      path: protocolId === "anthropic_messages" ? "/v1/messages" : "/chat/completions",
      payload: {
        model,
        __cache_probe: {
          ...baseProbe,
          kind: def.kind,
          ...(def.min_hit_rate ? { min_hit_rate: def.min_hit_rate } : {})
        }
      },
      expect: { http_status: 200, support_conclusion: "supported" }
    }));
}

function allProviderCases(providerId = currentProviderId()) {
  const cacheKey = currentCaseCacheKey(providerId);
  return [
    ...(providerId ? state.providerCases[cacheKey]?.cases || [] : []),
    ...capacityCasesForProvider(providerId),
    ...state.customCases
  ];
}

function selectedProviderCases(providerId = currentProviderId()) {
  return allProviderCases(providerId).filter((testCase) => state.selectedCaseIds.has(testCase.case_id));
}

function caseIdsForCases(cases = []) {
  return cases.map((testCase) => testCase.case_id);
}

function caseIdsForParameter(parameter, cases = allProviderCases()) {
  return caseIdsForCases(cases.filter((testCase) => focusParametersForCase(testCase).includes(parameter)));
}

function caseIdsForParameters(parameters = [], cases = allProviderCases()) {
  const parameterSet = new Set(parameters);
  return caseIdsForCases(cases.filter((testCase) =>
    focusParametersForCase(testCase).some((parameter) => parameterSet.has(parameter))
  ));
}

function caseIdsDataAttr(caseIds = []) {
  return escapeHtml(JSON.stringify(caseIds));
}

function selectionStats(caseIds = []) {
  const uniqueIds = Array.from(new Set(caseIds));
  const selected = uniqueIds.filter((caseId) => state.selectedCaseIds.has(caseId)).length;
  return {
    total: uniqueIds.length,
    selected,
    checked: uniqueIds.length > 0 && selected === uniqueIds.length,
    indeterminate: selected > 0 && selected < uniqueIds.length
  };
}

function setCaseSelection(caseIds = [], selected) {
  for (const caseId of new Set(caseIds)) {
    if (selected) {
      state.selectedCaseIds.add(caseId);
    } else {
      state.selectedCaseIds.delete(caseId);
    }
  }
}

function renderBulkSelect(caseIds, label, className = "") {
  const stats = selectionStats(caseIds);
  const disabled = state.isRunning || state.isCaseLoading || !stats.total;
  const stateClass = stats.checked ? "is-checked" : stats.indeterminate ? "is-partial" : "";
  return `
    <label class="bulk-select ${className} ${stateClass}" title="${escapeHtml(`${stats.selected} / ${stats.total} 个 case 已选择`)}" onclick="event.stopPropagation()">
      <input type="checkbox" data-case-bulk="${caseIdsDataAttr(caseIds)}" ${stats.checked ? "checked" : ""} ${disabled ? "disabled" : ""} />
      <span>${escapeHtml(label)}</span>
    </label>
  `;
}

function syncBulkCheckboxes(root = document) {
  root.querySelectorAll("input[data-case-bulk]").forEach((input) => {
    const stats = selectionStats(parseCaseIds(input.dataset.caseBulk));
    input.indeterminate = stats.indeterminate;
  });
}

function parseCaseIds(raw) {
  try {
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function refreshCaseSelectionUi() {
  const data = state.providerCases[currentCaseCacheKey()];
  renderParameterCatalog(getSelectedChannel(), data);
  renderCaseSelector(data);
}

function selectedFocusParameterCount(data) {
  const selectedCases = selectedProviderCases();
  return new Set(selectedCases.flatMap(focusParametersForCase)).size;
}

function caseTitle(testCase) {
  if (isConnectivityCase(testCase)) return RUN_V02_CONNECTIVITY_CASE_TITLE;
  if (isProtocolStreamCaseP0(testCase)) return RUN_V02_PROTOCOL_STREAM_BASIC_TITLE;
  if (isProtocolStreamCaseP0NonStream(testCase)) return RUN_V02_PROTOCOL_STREAM_FALSE_TITLE;
  if (isProtocolStreamUsageObservedCase(testCase)) return RUN_V02_PROTOCOL_STREAM_USAGE_OBSERVED_TITLE;
  if (isProtocolStreamCaseP1IncludeUsage(testCase)) return RUN_V02_PROTOCOL_STREAM_USAGE_TITLE;
  if (isProtocolStreamUsageChunkShapeCase(testCase)) return RUN_V02_PROTOCOL_STREAM_USAGE_CHUNK_SHAPE_TITLE;
  if (isOutputLengthCase(testCase)) return outputLengthCaseTitle(testCase) || testCase.title || testCase.case_id;
  if (isProtocolSamplingCase(testCase)) return protocolSamplingCaseTitle(testCase);
  if (isCacheHitCase(testCase)) return CACHE_CASE_TITLES[testCase.case_id] || testCase.title || testCase.case_id;
  return caseTitleZh[testCase.case_id] || testCase.title || testCase.case_id;
}

function resultTitle(result) {
  if (result.source_case) return caseTitle(result.source_case);
  if (result.case_id && caseTitleZh[result.case_id]) return caseTitleZh[result.case_id];
  return result.title || result.case_id || "未命名 case";
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function contextualCaseTitle(title, context = {}) {
  const parameter = context.groupParameter;
  if (!parameter) return title;
  const escapedParameter = escapeRegExp(parameter);
  const withoutPrefix = title
    .replace(new RegExp(`^${escapedParameter}(?:\\s+|=|：|:)`, "i"), "")
    .replace(new RegExp(`^${escapedParameter}`, "i"), "")
    .trim() || title;
  return withoutPrefix
    .replace(new RegExp(`\\s*${escapedParameter}\\s*`, "ig"), "该参数")
    .trim() || title;
}

const caseIntentZh = {
  capacity_max_input_boundary: "从常见档位降档请求，定位该模型可接受的 最大Input 长度。",
  capacity_max_output_boundary: "从常见档位降档请求，定位该模型可用的 最大Max Output。",
  capacity_total_context_boundary: "从常见档位降档请求，定位该模型可用的 最大Total Context。",
  capacity_thinking_budget_boundary: "按档位测试思考预算字段是否被接受、最大可传值，以及 reasoning_tokens 是否随预算变化。",
  sf_reasoning_enable_thinking: "开启后应返回 reasoning_content 或 reasoning tokens。",
  sf_reasoning_disable_thinking_no_output: "关闭后不应返回 thinking 内容或 reasoning tokens。",
  sf_reasoning_thinking_budget: "验证 thinking_budget 是否能约束推理预算。",
  sf_reasoning_effort_medium: "验证 OpenAI-style reasoning_effort 是否被接收。",
  sf_reasoning_combo_budget_effort: "验证多种推理控制参数同时传入时是否被接收。",
  sf_prefix_completion: "验证返回内容是否真的从给定 assistant 前缀继续生成，适合 DeepSeek-V4-Pro / Flash。",
  sf_sampling_frequency_penalty: "验证合法范围内的频率惩罚参数是否被接收。",
  sf_length_max_tokens: "验证输出长度限制是否被接收并生效。",
  sf_length_max_tokens_stop: "验证长度限制和停止词同时传入时是否被接收。"
};

function capabilityRequirementText(testCase) {
  if (!testCase.requires_model_capability) return "";
  return `前提：${testCase.requires_model_capability} 模型。`;
}

function capacityIntentText(capacityDisplay) {
  const [range, margin, outputBudget] = capacityDisplay.chips || [];
  if (capacityDisplay.kind === "total_context") {
    return `按 ${range || "常见档位"} 递进探测，${margin || "按档位预留安全余量"}，${outputBudget || "保留少量输出"}。`;
  }
  if (capacityDisplay.kind === "max_input") {
    return `按 ${range || "常见档位"} 递进探测输入长度，输出固定为少量 token，定位 最大Input。`;
  }
  if (capacityDisplay.kind === "max_output_effective") {
    return `在小 cap（${range || "如 512、64"}）下强制长输出，检查是否被截断以判断 max_tokens 是否真生效。`;
  }
  if (capacityDisplay.kind === "thinking_budget") {
    return `用 ${margin || "思考预算字段"} 按 ${range || "常见档位"} 测试是否被接受、最大可传值，以及 reasoning_tokens 是否随预算变化。`;
  }
  return `按 ${range || "常见档位"} 递进探测，记录可用 最大Max Output。`;
}

function caseIntentText(testCase, context = {}, capacityDisplay = null, title = "") {
  if (capacityDisplay) return capacityIntentText(capacityDisplay);
  const explicit = caseIntentZh[testCase.case_id];
  const base = explicit || (context.groupParameter ? `验证${title}。` : "");
  return [base, capabilityRequirementText(testCase)].filter(Boolean).join(" ");
}

function paramSubgroupRank(category, subgroup) {
  if (category === "Reasoning") return thinkingSubgroupRank(subgroup);
  if (category === "Output") {
    const order = PROVIDERX_RULES.OUTPUT_SUBGROUP_ORDER || ["structure", "modality"];
    const index = order.indexOf(subgroup);
    return index === -1 ? 99 : index;
  }
  return 99;
}

function paramSubgroupLabel(category, subgroup) {
  if (category === "Reasoning") return thinkingSubgroupLabel(subgroup);
  if (category === "Output") {
    return PROVIDERX_RULES.OUTPUT_SUBGROUP_LABELS?.[subgroup] || subgroup || "";
  }
  return subgroup || "";
}

function paramSubgroupHint(category, subgroup) {
  if (category === "Reasoning") return thinkingSubgroupHint(subgroup);
  if (category === "Output") {
    return PROVIDERX_RULES.OUTPUT_SUBGROUP_HINTS?.[subgroup] || "";
  }
  return "";
}

function thinkingSubgroupRank(subgroup) {
  const order = PROVIDERX_RULES.THINKING_SUBGROUP_ORDER || ["switch", "intensity", "output"];
  const index = order.indexOf(subgroup);
  return index === -1 ? 99 : index;
}

function thinkingSubgroupLabel(subgroup) {
  return PROVIDERX_RULES.THINKING_SUBGROUP_LABELS?.[subgroup] || subgroup || "";
}

function thinkingSubgroupHint(subgroup) {
  return PROVIDERX_RULES.THINKING_SUBGROUP_HINTS?.[subgroup] || "";
}

function renderProtocolParamSubgroupHeading(category, subgroup) {
  const label = paramSubgroupLabel(category, subgroup);
  const hint = paramSubgroupHint(category, subgroup);
  if (!hint) {
    return `<span class="protocol-param-subgroup-label">${escapeHtml(label)}</span>`;
  }
  return `
    <span class="protocol-param-subgroup-label">${escapeHtml(label)}</span>
    <span class="protocol-param-group-sep" aria-hidden="true">—</span>
    <span class="protocol-param-subgroup-hint">${escapeHtml(hint)}</span>
  `;
}

function renderThinkingDialectSummary(channels, protocolId) {
  if (protocolId !== "chat_completions") return "";
  const summary = PROVIDERX_RULES.THINKING_CHANNEL_FIELD_SUMMARY || [];
  const channelById = new Map(channels.map((channel) => [channel.channel_id, channel]));
  const rows = summary
    .filter((item) => channelById.has(item.channelId))
    .map((item) => {
      const channel = channelById.get(item.channelId);
      return `
        <tr>
          <th scope="row">${escapeHtml(channel.name)}</th>
          <td><code>${escapeHtml(item.switchField)}</code></td>
          <td><code>${escapeHtml(item.intensityField)}</code></td>
          <td>${escapeHtml(item.note || "")}</td>
        </tr>
      `;
    })
    .join("");
  if (!rows) return "";
  const collapsedClass = protocolParamSectionCollapsedClass(protocolId, "Reasoning");
  return `
    <tr class="protocol-thinking-dialect-row ${collapsedClass}" data-protocol-section-category="Reasoning" data-protocol-section-subgroup="">
      <td colspan="100">
        <details class="protocol-thinking-dialect">
          <summary>各渠道思考模式字段对照（开关 × 强度）</summary>
          <p class="protocol-thinking-dialect-note">同一请求通常只应使用当前渠道文档列出的一组字段；下表汇总各测评渠道官方文档中的主路径。</p>
          <table class="protocol-thinking-dialect-table">
            <thead>
              <tr>
                <th scope="col">渠道</th>
                <th scope="col">开关字段 Switch</th>
                <th scope="col">强度 / 预算 Intensity</th>
                <th scope="col">备注</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </details>
      </td>
    </tr>
  `;
}

function groupLabel(group) {
  const submatch = /^(Reasoning|Output)\.(\w+)$/i.exec(String(group || ""));
  if (submatch) {
    const parentKey = submatch[1];
    const parent = groupLabelZh[parentKey] || parentKey;
    const child = paramSubgroupLabel(parentKey, submatch[2].toLowerCase());
    return child ? `${parent} · ${child}` : parent;
  }
  return groupLabelZh[group] || categoryLabel(String(group).toLowerCase());
}

function groupHint(group) {
  return groupHintZh[group] || "";
}

function getProtocolParamCollapseSet() {
  if (!state.protocolParamCollapse) state.protocolParamCollapse = new Set();
  return state.protocolParamCollapse;
}

const PROTOCOL_UI_STORAGE_PREFIX = "noctua:protocol-ui:";
let protocolUiPersistTimer = null;

function protocolUiStorageKey(protocolId) {
  return `${PROTOCOL_UI_STORAGE_PREFIX}${protocolId}`;
}

function protocolIdFromUiKey(key) {
  return String(key || "").split("::")[0] || "";
}

function loadProtocolUiState(protocolId) {
  if (!protocolId) return;
  try {
    const raw = sessionStorage.getItem(protocolUiStorageKey(protocolId));
    if (!raw) return;
    const data = JSON.parse(raw);
    const collapse = getProtocolParamCollapseSet();
    const expand = getProtocolParamTreeExpandSet();
    const prefix = `${protocolId}::`;
    const treePrefix = `${protocolId}::tree::`;
    for (const key of [...collapse]) {
      if (key.startsWith(prefix)) collapse.delete(key);
    }
    for (const key of [...expand]) {
      if (key.startsWith(treePrefix)) expand.delete(key);
    }
    for (const key of data.collapsed || []) collapse.add(key);
    for (const key of data.treeExpanded || []) expand.add(key);
  } catch (_) {
    /* ignore corrupt session snapshot */
  }
}

function persistProtocolUiState(protocolId) {
  if (!protocolId) return;
  clearTimeout(protocolUiPersistTimer);
  protocolUiPersistTimer = setTimeout(() => {
    try {
      const prefix = `${protocolId}::`;
      const treePrefix = `${protocolId}::tree::`;
      const collapsed = [...getProtocolParamCollapseSet()].filter((key) => key.startsWith(prefix));
      const treeExpanded = [...getProtocolParamTreeExpandSet()].filter((key) => key.startsWith(treePrefix));
      sessionStorage.setItem(protocolUiStorageKey(protocolId), JSON.stringify({ collapsed, treeExpanded }));
    } catch (_) {
      /* ignore quota / private mode */
    }
  }, 120);
}

function persistProtocolUiStateForKey(sectionOrTreeKey) {
  persistProtocolUiState(protocolIdFromUiKey(sectionOrTreeKey));
}

function protocolParamCategorySectionKey(protocolId, category) {
  return `${protocolId}::${category}`;
}

function protocolParamSubgroupSectionKey(protocolId, category, subgroup) {
  return `${protocolId}::${category}::${subgroup}`;
}

function isProtocolParamSectionCollapsed(sectionKey) {
  return getProtocolParamCollapseSet().has(sectionKey);
}

function protocolParamSectionCollapsedClass(protocolId, category, subgroup = "") {
  if (isProtocolParamSectionCollapsed(protocolParamCategorySectionKey(protocolId, category))) {
    return "is-section-collapsed";
  }
  if (subgroup && isProtocolParamSectionCollapsed(protocolParamSubgroupSectionKey(protocolId, category, subgroup))) {
    return "is-section-collapsed";
  }
  return "";
}

function renderProtocolParamSectionToggleButton(sectionKey, labelHtml, { level = "category" } = {}) {
  const collapsed = isProtocolParamSectionCollapsed(sectionKey);
  return `
    <button
      type="button"
      class="protocol-param-section-toggle protocol-param-section-toggle--${level}"
      data-protocol-param-section-toggle
      data-section-key="${escapeHtml(sectionKey)}"
      aria-expanded="${collapsed ? "false" : "true"}"
    >
      <span class="protocol-param-section-chevron${collapsed ? " is-collapsed" : ""}" aria-hidden="true">›</span>
      <span class="protocol-param-section-toggle-label">${labelHtml}</span>
    </button>
  `;
}

function syncProtocolParamSectionVisibility(panel) {
  if (!panel) return;
  const protocolId = panel.dataset.protocolPanel;
  if (!protocolId) return;

  panel.querySelectorAll("[data-protocol-section-category]").forEach((row) => {
    const category = row.dataset.protocolSectionCategory;
    const subgroup = row.dataset.protocolSectionSubgroup || "";
    const isGroupHeader = row.classList.contains("protocol-param-group-row");
    const isSubgroupHeader = row.classList.contains("protocol-param-subgroup-row");
    const categoryCollapsed = isProtocolParamSectionCollapsed(protocolParamCategorySectionKey(protocolId, category));

    if (isGroupHeader) {
      row.classList.remove("is-section-collapsed");
      return;
    }
    if (categoryCollapsed) {
      row.classList.add("is-section-collapsed");
      return;
    }
    if (isSubgroupHeader) {
      row.classList.remove("is-section-collapsed");
      return;
    }
    if (subgroup) {
      const subgroupCollapsed = isProtocolParamSectionCollapsed(
        protocolParamSubgroupSectionKey(protocolId, category, subgroup)
      );
      row.classList.toggle("is-section-collapsed", subgroupCollapsed);
      return;
    }
    row.classList.remove("is-section-collapsed");
  });

  panel.querySelectorAll("[data-protocol-param-section-toggle]").forEach((button) => {
    const collapsed = isProtocolParamSectionCollapsed(button.dataset.sectionKey);
    button.setAttribute("aria-expanded", collapsed ? "false" : "true");
    button.querySelector(".protocol-param-section-chevron")?.classList.toggle("is-collapsed", collapsed);
  });
  syncProtocolParamTreeVisibility(panel);
}

function toggleProtocolParamSection(sectionKey) {
  const set = getProtocolParamCollapseSet();
  if (set.has(sectionKey)) set.delete(sectionKey);
  else set.add(sectionKey);
  persistProtocolUiStateForKey(sectionKey);
  const protocolId = protocolIdFromUiKey(sectionKey);
  const panel = els.protocolCatalog?.querySelector(`[data-protocol-panel="${protocolId}"]`);
  syncProtocolParamSectionVisibility(panel);
}

function getProtocolParamTreeExpandSet() {
  if (!state.protocolParamTreeExpand) state.protocolParamTreeExpand = new Set();
  return state.protocolParamTreeExpand;
}

function protocolParamTreeSectionKey(protocolId, parameter) {
  return `${protocolId}::tree::${parameter}`;
}

function isProtocolParameterTreeExpanded(protocolId, parameter) {
  return getProtocolParamTreeExpandSet().has(protocolParamTreeSectionKey(protocolId, parameter));
}

function isProtocolParameterDescendant(child, parent) {
  if (!child || !parent || child === parent) return false;
  if (child.startsWith(`${parent}.`)) return true;
  const arrayPrefix = parent.endsWith("[]") ? parent : `${parent}[]`;
  return child.startsWith(`${arrayPrefix}.`) || child.startsWith(`${arrayPrefix}[`);
}

function buildProtocolParameterParentsSet(parameterNames) {
  const parents = new Set();
  for (const parent of parameterNames) {
    for (const child of parameterNames) {
      if (isProtocolParameterDescendant(child, parent)) {
        parents.add(parent);
        break;
      }
    }
  }
  return parents;
}

function buildProtocolParameterAncestorsMap(parameterNames) {
  const map = new Map();
  for (const name of parameterNames) {
    map.set(name, parameterNames.filter((candidate) => isProtocolParameterDescendant(name, candidate)));
  }
  return map;
}

function isProtocolParameterDirectChild(child, parent, parameterNames) {
  if (!isProtocolParameterDescendant(child, parent)) return false;
  return !parameterNames.some((mid) =>
    mid !== parent
    && mid !== child
    && isProtocolParameterDescendant(mid, parent)
    && isProtocolParameterDescendant(child, mid)
  );
}

function buildProtocolParameterDirectChildrenMap(parameterNames) {
  const map = new Map();
  for (const parent of parameterNames) {
    map.set(parent, parameterNames.filter((child) => isProtocolParameterDirectChild(child, parent, parameterNames)));
  }
  return map;
}

function expandAllProtocolParameterTrees(protocolId, parentParameters) {
  const set = getProtocolParamTreeExpandSet();
  for (const parameter of parentParameters) {
    set.add(protocolParamTreeSectionKey(protocolId, parameter));
  }
  persistProtocolUiState(protocolId);
  const panel = els.protocolCatalog?.querySelector(`[data-protocol-panel="${protocolId}"]`);
  syncProtocolParamTreeVisibility(panel);
}

function collapseAllProtocolParameterTrees(protocolId) {
  const set = getProtocolParamTreeExpandSet();
  const prefix = `${protocolId}::tree::`;
  for (const key of [...set]) {
    if (key.startsWith(prefix)) set.delete(key);
  }
  persistProtocolUiState(protocolId);
  const panel = els.protocolCatalog?.querySelector(`[data-protocol-panel="${protocolId}"]`);
  syncProtocolParamTreeVisibility(panel);
}

function toggleAllProtocolParamSections(protocolId, categories) {
  const set = getProtocolParamCollapseSet();
  const keys = categories.map((category) => protocolParamCategorySectionKey(protocolId, category));
  const allCollapsed = keys.length > 0 && keys.every((key) => set.has(key));
  for (const key of keys) {
    if (allCollapsed) set.delete(key);
    else set.add(key);
  }
  persistProtocolUiState(protocolId);
  const panel = els.protocolCatalog?.querySelector(`[data-protocol-panel="${protocolId}"]`);
  syncProtocolParamSectionVisibility(panel);
}

function renderProtocolParamMatrixToolbar(protocolId, matrix) {
  const categories = [...new Set(matrix.parameters.map((item) => item.category))];
  const parentCount = matrix.parameters.filter((item) =>
    matrix.parameters.some((other) => isProtocolParameterDescendant(other.parameter, item.parameter))
  ).length;
  if (!parentCount && !categories.length) return "";
  return `
    <div class="protocol-param-toolbar" data-protocol-param-toolbar data-protocol-id="${escapeHtml(protocolId)}">
      ${parentCount ? `
        <button type="button" class="btn btn-ghost btn-xs" data-protocol-matrix-action="expand-trees">展开子字段</button>
        <button type="button" class="btn btn-ghost btn-xs" data-protocol-matrix-action="collapse-trees">收起子字段</button>
      ` : ""}
      ${categories.length ? `
        <button type="button" class="btn btn-ghost btn-xs" data-protocol-matrix-action="toggle-sections">展开/收起全部分组</button>
      ` : ""}
    </div>
  `;
}

function bindProtocolParamMatrixToolbar() {
  if (!els.protocolCatalog) return;
  els.protocolCatalog.querySelectorAll("[data-protocol-param-toolbar]").forEach((toolbar) => {
    const protocolId = toolbar.dataset.protocolId;
    if (!protocolId) return;
    const matrix = state.protocolMatrices?.[protocolId];
    if (!matrix) return;
    const parentParameters = matrix.parameters
      .map((item) => item.parameter)
      .filter((parameter, _, list) => list.some((other) => isProtocolParameterDescendant(other, parameter)));
    const categories = [...new Set(matrix.parameters.map((item) => item.category))];

    toolbar.querySelectorAll("[data-protocol-matrix-action]").forEach((button) => {
      button.addEventListener("click", () => {
        const action = button.dataset.protocolMatrixAction;
        if (action === "expand-trees") expandAllProtocolParameterTrees(protocolId, parentParameters);
        else if (action === "collapse-trees") collapseAllProtocolParameterTrees(protocolId);
        else if (action === "toggle-sections") toggleAllProtocolParamSections(protocolId, categories);
      });
    });
  });
}

function syncProtocolParamTreeVisibility(panel) {
  if (!panel) return;
  const protocolId = panel.dataset.protocolPanel;
  if (!protocolId) return;

  panel.querySelectorAll("[data-protocol-param-row]").forEach((row) => {
    const ancestors = (row.dataset.protocolTreeAncestors || "").split(",").filter(Boolean);
    const category = row.dataset.protocolSectionCategory;
    const subgroup = row.dataset.protocolSectionSubgroup || "";
    const categoryCollapsed = isProtocolParamSectionCollapsed(protocolParamCategorySectionKey(protocolId, category));
    const subgroupCollapsed = subgroup
      && isProtocolParamSectionCollapsed(protocolParamSubgroupSectionKey(protocolId, category, subgroup));
    const treeCollapsed = ancestors.some((ancestor) => !isProtocolParameterTreeExpanded(protocolId, ancestor));
    row.classList.toggle("is-tree-collapsed", !categoryCollapsed && !subgroupCollapsed && treeCollapsed);
  });

  panel.querySelectorAll("[data-protocol-param-tree-toggle]").forEach((button) => {
    const parameter = button.dataset.parameter;
    if (!parameter) return;
    const expanded = isProtocolParameterTreeExpanded(protocolId, parameter);
    button.setAttribute("aria-expanded", expanded ? "true" : "false");
    button.querySelector(".protocol-param-tree-chevron")?.classList.toggle("is-collapsed", !expanded);
  });
}

function toggleProtocolParameterTree(protocolId, parameter) {
  const key = protocolParamTreeSectionKey(protocolId, parameter);
  const set = getProtocolParamTreeExpandSet();
  if (set.has(key)) set.delete(key);
  else set.add(key);
  persistProtocolUiState(protocolId);
  const panel = els.protocolCatalog?.querySelector(`[data-protocol-panel="${protocolId}"]`);
  syncProtocolParamTreeVisibility(panel);
}

function bindProtocolParamTreeToggles() {
  if (!els.protocolCatalog) return;
  els.protocolCatalog.querySelectorAll("[data-protocol-param-tree-toggle]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const protocolId = button.dataset.protocolId;
      const parameter = button.dataset.parameter;
      if (protocolId && parameter) toggleProtocolParameterTree(protocolId, parameter);
    });
  });
  els.protocolCatalog.querySelectorAll("[data-protocol-panel]").forEach((panel) => {
    syncProtocolParamTreeVisibility(panel);
  });
}

function bindProtocolParamSectionToggles() {
  if (!els.protocolCatalog) return;
  els.protocolCatalog.querySelectorAll("[data-protocol-param-section-toggle]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const sectionKey = button.dataset.sectionKey;
      if (sectionKey) toggleProtocolParamSection(sectionKey);
    });
  });
  els.protocolCatalog.querySelectorAll("[data-protocol-panel]").forEach((panel) => {
    syncProtocolParamSectionVisibility(panel);
  });
}

function renderProtocolParamGroupHeading(category, { showHint = true } = {}) {
  const label = groupLabel(category);
  const hint = showHint ? groupHint(category) : "";
  if (!hint) {
    return `<span class="protocol-param-group-label">${escapeHtml(label)}</span>`;
  }
  return `
    <span class="protocol-param-group-label">${escapeHtml(label)}</span>
    <span class="protocol-param-group-sep" aria-hidden="true">—</span>
    <span class="protocol-param-group-hint">${escapeHtml(hint)}</span>
  `;
}

function originLabel(origin) {
  return originLabelZh[origin] || origin;
}

function parameterDescription(parameter, protocolId = "") {
  const byProtocol = protocolId && PROVIDERX_RULES.PARAMETER_DESCRIPTIONS_BY_PROTOCOL?.[protocolId]?.[parameter];
  if (byProtocol) return byProtocol;
  return MOCK_PARAMETER_DESCRIPTIONS?.[parameter]
    || PROVIDERX_RULES.PARAMETER_DESCRIPTIONS?.[parameter]
    || "";
}

function clonePayload(payload) {
  return JSON.parse(JSON.stringify(payload || {}));
}

function parseCustomPayload() {
  const raw = els.customPayloadInput.value.trim();
  if (!raw) throw new Error("payload 不能为空。");
  const payload = JSON.parse(raw);
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("payload 必须是 JSON object。");
  }
  return payload;
}

function inferPayloadParameters(payload) {
  return Object.keys(payload || {}).filter((key) => key !== "model" && key !== "messages");
}

function addCustomPayloadCase() {
  let payload;
  try {
    payload = parseCustomPayload();
  } catch (error) {
    showToast(`自定义 payload 无效：${error.message}`);
    return;
  }

  const index = state.customCases.length + 1;
  const caseID = `custom_payload_${String(index).padStart(2, "0")}`;
  const parameters = inferPayloadParameters(payload);
  const testCase = {
    case_id: caseID,
    title: `自定义 payload ${index}`,
    category: "custom",
    parameters: parameters.length ? parameters : ["payload"],
    method: "POST",
    payload,
    expect: { http_status: 200 },
    custom: true
  };
  state.customCases.push(testCase);
  state.selectedCaseIds.add(caseID);
  els.customPayloadInput.value = "";
  els.customPayloadHint.textContent = `已添加 ${state.customCases.length} 个自定义 payload。`;
  renderCaseSelector(state.providerCases[currentCaseCacheKey()]);
  showToast(`${caseID} 已添加。`);
}

function buildEndpointUrl(baseUrl, endpoint) {
  const trimmedBase = String(baseUrl || "").trim().replace(/\/+$/, "");
  const trimmedEndpoint = String(endpoint || "").trim();
  if (!trimmedEndpoint) return trimmedBase;
  const endpointPath = `/${trimmedEndpoint.replace(/^\/+/, "")}`;
  if (trimmedBase.endsWith(endpointPath)) return trimmedBase;
  return `${trimmedBase}${endpointPath}`;
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function buildCaseCurl(testCase) {
  const data = state.providerCases[currentCaseCacheKey()] || {};
  const payload = clonePayload(testCase.payload);
  const model = els.modelName.value.trim();
  if (model) payload.model = model;

  const url = buildEndpointUrl(testCase.base_url || els.baseUrl.value, data.endpoint || "/chat/completions");
  const apiKey = els.apiKey.value.trim();
  const providerId = currentProviderId();
  const providerEnvKeys = {
    ali: "DASHSCOPE_API_KEY",
    ali_messages: "DASHSCOPE_API_KEY",
    deepseek: "DEEPSEEK_API_KEY",
    deepseek_messages: "DEEPSEEK_API_KEY",
    minimax: "MINIMAX_API_KEY",
    minimax_messages: "MINIMAX_API_KEY",
    claude: "ANTHROPIC_API_KEY",
    claude_messages: "ANTHROPIC_API_KEY",
    openai: "OPENAI_API_KEY",
    openrouter: "OPENROUTER_API_KEY",
    openrouter_messages: "OPENROUTER_API_KEY",
    siliconflow: "SILICONFLOW_API_KEY",
    siliconflow_messages: "SILICONFLOW_API_KEY",
    baidu: "QIANFAN_API_KEY"
  };
  const envKey = providerEnvKeys[providerId] || "PROVIDER_API_KEY";
  const authHeaderName = ["ali_messages", "claude_messages", "deepseek_messages", "minimax_messages"].includes(providerId) ? "X-Api-Key" : "Authorization";
  const authHeaderValue = authHeaderName === "X-Api-Key"
    ? (apiKey || `\${${envKey}}`)
    : `Bearer ${apiKey || `\${${envKey}}`}`;
  const authHeader = apiKey
    ? shellQuote(`${authHeaderName}: ${authHeaderValue}`)
    : `"${authHeaderName}: ${authHeaderValue}"`;
  const body = JSON.stringify(payload, null, 2);

  return [
    `curl -sS -X ${testCase.method || data.method || "POST"} ${shellQuote(url)} \\`,
    `  -H ${authHeader} \\`,
    `  -H ${shellQuote("Content-Type: application/json")} \\`,
    `  -H ${shellQuote("Accept: application/json, text/event-stream")} \\`,
    ...(state.selectedEndpointId === "anthropic_messages" ? [`  -H ${shellQuote("anthropic-version: 2023-06-01")} \\`] : []),
    ...Object.entries(testCase.headers || {}).map(([key, value]) => `  -H ${shellQuote(`${key}: ${value}`)} \\`),
    `  --data-raw ${shellQuote(body)}`
  ].join("\n");
}

function ensureSelectedChannelSupportsEndpoint() {
  if (providerIdForChannel()) return;
  const fallback = CHANNEL_TEMPLATES.find((channel) => providerIdForChannel(channel.channel_id));
  if (fallback) state.selectedChannelId = fallback.channel_id;
}

function diffNoteZh(note) {
  const notes = {
    "(missing in this channel)": "（当前渠道缺失）",
    "(missing)": "（缺失）",
    "(extra, not in OpenAI standard)": "（额外字段，非 OpenAI 标准）",
    "(extra, not in baseline)": "（额外字段，baseline 中不存在）",
    "当前渠道缺失": "当前渠道缺失",
    "缺失": "缺失",
    "额外字段，非 OpenAI 标准": "额外字段，非 OpenAI 标准",
    [`额外字段，${"基"}${"准"}中不存在`]: "额外字段，baseline 中不存在"
  };
  if (notes[note]) return notes[note];
  const typeMatch = note.match(/^\(type mismatch: expected (.+), got (.+)\)$/);
  if (typeMatch) return `（类型不一致：预期 ${typeMatch[1]}，实际 ${typeMatch[2]}）`;
  return note;
}

function renderChannels() {
  els.channelCards.innerHTML = CHANNEL_TEMPLATES.map((channel) => {
    const endpoint = channel.endpoints?.[state.selectedEndpointId];
    const isSupported = endpoint?.supported !== false;
    const count = flattenParameters(channel).length;
    const modeText = isSupported
      ? (providerIdForChannel(channel.channel_id) ? "真实测试" : "预览")
      : "不支持该端点";
    return `
      <div class="chan-wrap">
        <button type="button" class="chan-card ${channel.channel_id === state.selectedChannelId ? "sel" : ""} ${isSupported ? "" : "is-disabled"}" data-channel-id="${channel.channel_id}" aria-label="选择 ${escapeHtml(channel.name)}" ${isSupported ? "" : "disabled"}>
          <span class="pick"></span>
          <span class="logo"><img src="${escapeHtml(channel.logo)}" alt="${escapeHtml(channel.name)} logo" /></span>
          <span class="cname">${escapeHtml(channel.name)}</span>
          <span class="cdesc">${escapeHtml(channel.summary)}</span>
          <span class="cparams">${escapeHtml(modeText)}${isSupported ? ` · ${count} 个参数` : ""}</span>
        </button>
        <a class="chan-card__docs" href="${escapeHtml(endpoint?.api_docs_url || channel.api_docs_url)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(channel.name)} 官方 API 文档">API 文档</a>
      </div>
    `;
  }).join("");
}

function renderSelectedChannel() {
  const channel = getSelectedChannel();
  const endpoint = getChannelEndpoint(channel);
  renderBaselineSelector();
  if (!endpoint || endpoint.supported === false) {
    setBaseUrlValue("");
    renderBaseUrlPreset("");
    els.modelName.value = "";
    els.suiteTitle.textContent = `测试套件：${channel.name}（${getSelectedEndpointTemplate().label} 不支持）`;
    if (els.accountMode) els.accountMode.textContent = "不支持";
    renderParameterCatalog(channel);
    loadCaseSelectorForChannel();
    return;
  }
  setBaseUrlValue(endpoint.default_base_url || channel.default_base_url);
  els.modelName.value = endpoint.default_model || channel.default_model;
  els.suiteTitle.textContent = `测试套件：${channel.name} / ${getSelectedEndpointTemplate().label}（${flattenParameters(channel).length} 个重点参数）`;
  if (els.accountMode) els.accountMode.textContent = providerIdForChannel(channel.channel_id) ? "真实测试" : "预览模式";
  renderParameterCatalog(channel);

  loadCaseSelectorForChannel();
}

function renderParameterCatalog(channel, data = null) {
  const caseCounts = new Map();
  const comboCounts = new Map();
  const availableCases = data?.cases || [];
  if (data?.cases) {
    for (const testCase of data.cases) {
      const focusParams = focusParametersForCase(testCase);
      for (const param of focusParams) {
        caseCounts.set(param, (caseCounts.get(param) || 0) + 1);
        if (focusParams.length > 1) comboCounts.set(param, (comboCounts.get(param) || 0) + 1);
      }
    }
  }

  const endpoint = getChannelEndpoint(channel);
  if (endpoint?.supported === false) {
    els.parameterGroups.innerHTML = `
      <div class="case-error">
        <strong>${escapeHtml(channel.name)} 不支持 ${escapeHtml(getSelectedEndpointTemplate().label)}</strong>
        <span>${escapeHtml(endpoint.unavailable_reason || "该渠道没有当前端点。")}</span>
      </div>
    `;
    return;
  }
  const parametersByGroup = endpoint?.parameters || channel.parameters || {};
  const parameterHtml = Object.entries(parametersByGroup).map(([group, parameters]) => `
    <div class="parameter-group">
      <div class="parameter-group__name">
        <span>${escapeHtml(groupLabel(group))}</span>
        ${renderBulkSelect(caseIdsForParameters(parameters, availableCases), "本组", "suite-bulk-select")}
      </div>
      <div class="coverage-grid">
        ${parameters.map((parameter) => {
          const isExpectedReject = channel.expected_rejected?.includes(parameter);
          const origin = MOCK_PARAMETER_ORIGINS[parameter] || "provider-private";
          const count = caseCounts.get(parameter) || 0;
          const comboCount = comboCounts.get(parameter) || 0;
          const parameterCaseIds = caseIdsForParameter(parameter, availableCases);
          const stats = selectionStats(parameterCaseIds);
          const countText = data ? `${count} 个 case${comboCount ? ` · ${comboCount} 个组合` : ""}` : "等待 case 统计";
          return `
            <label class="coverage-card parameter-select-card ${isExpectedReject ? "is-expected-reject" : ""} ${stats.checked ? "is-checked" : stats.indeterminate ? "is-partial" : ""}" title="${escapeHtml(`选择 ${parameter} 对应的 ${stats.total} 个 case`)}">
              <input type="checkbox" data-case-bulk="${caseIdsDataAttr(parameterCaseIds)}" ${stats.checked ? "checked" : ""} ${state.isRunning || state.isCaseLoading || !stats.total ? "disabled" : ""} />
              <span class="coverage-card__body">
                <code>${escapeHtml(parameter)}</code>
                <em>${escapeHtml(originLabel(origin))}</em>
                <small>${escapeHtml(countText)}${stats.total ? ` · 已选 ${stats.selected}` : ""}</small>
              </span>
            </label>
          `;
        }).join("")}
      </div>
    </div>
  `).join("");
  const capacityCases = capacityCasesForProvider();
  const capacityIds = caseIdsForCases(capacityCases);
  const capacityHtml = capacityCases.length ? `
    <div class="parameter-group parameter-group--capacity">
      <div class="parameter-group__name">
        <span>模型限制实测（输入 / 输出 / 上下文 / 思考预算）</span>
        ${renderBulkSelect(capacityIds, "本组", "suite-bulk-select")}
      </div>
      <div class="coverage-grid">
        ${capacityCases.map((testCase) => `
          <label class="coverage-card parameter-select-card ${state.selectedCaseIds.has(testCase.case_id) ? "is-checked" : ""}" title="${escapeHtml(`选择 ${caseTitle(testCase)}`)}">
            <input type="checkbox" data-case-bulk="${caseIdsDataAttr([testCase.case_id])}" ${state.selectedCaseIds.has(testCase.case_id) ? "checked" : ""} ${state.isRunning || state.isCaseLoading ? "disabled" : ""} />
            <span class="coverage-card__body">
              <code>${escapeHtml(testCase.parameters[0])}</code>
              <em>capacity</em>
              <small>${escapeHtml(caseTitle(testCase))}</small>
            </span>
          </label>
        `).join("")}
      </div>
    </div>
  ` : "";
  els.parameterGroups.innerHTML = parameterHtml + capacityHtml;
  syncBulkCheckboxes(els.parameterGroups);
}

async function loadCaseSelectorForChannel() {
  const channel = getSelectedChannel();
  const channelId = channel.channel_id;
  const providerId = providerIdForChannel(channelId);
  const cacheKey = currentCaseCacheKey(providerId);
  state.selectedCaseIds = new Set();
  state.expandedCaseId = null;

  if (!providerId) {
    state.isCaseLoading = false;
    els.caseSelector.classList.add("is-hidden");
    els.caseSelectorHint.textContent = getChannelEndpoint(channel)?.unavailable_reason || "当前渠道不支持这个 endpoint。";
    updateRunAvailability();
    return;
  }

  els.caseSelector.classList.remove("is-hidden");
  state.isCaseLoading = true;
  els.caseGroups.innerHTML = '<div class="case-loading">正在从后端加载 cases...</div>';
  els.selectedCaseCount.textContent = "已选 0 个";
  els.caseSelectorHint.textContent = "正在加载测试用例...";
  updateRunAvailability();

  try {
    const response = await fetch(`${API_BASE}/api/providers/${providerId}/cases?${endpointQuery()}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (state.selectedChannelId !== channelId) return;
    state.providerCases[cacheKey] = data;
    state.selectedCaseIds = new Set(data.cases.filter(isDefaultSelectedCase).map((testCase) => testCase.case_id));
    const endpoint = getChannelEndpoint(channel);
    setBaseUrlValue(endpoint?.default_base_url || data.base_url || channel.default_base_url);
    els.modelName.value = endpoint?.default_model || data.default_model || channel.default_model;
    const vlmCount = (data.cases || []).filter(isVlmCase).length;
    const vlmText = vlmCount ? ` · VLM ${vlmCount} 个可选 case` : "";
    const optionalCount = (data.cases || []).filter(isOptionalExtensionCase).length;
    const optionalText = optionalCount ? ` · 扩展 ${optionalCount} 个可选 case` : "";
    const capacityCount = capacityCasesForProvider(providerId).length;
    const capacityText = capacityCount ? ` · 模型限制实测（输入/输出/上下文/思考预算） ${capacityCount} 个可选 case` : "";
    els.suiteTitle.textContent = `测试套件：${channel.name} / ${getSelectedEndpointTemplate().label}（${flattenParameters(channel).length} 个重点参数 · ${data.cases.length} 个 case${optionalText}${vlmText}${capacityText}）`;
    els.caseSelectorHint.textContent = "默认勾选常规 case，扩展、VLM 和 模型限制实测（输入/输出/上下文/思考预算）按需开启。";
    state.isCaseLoading = false;
    renderParameterCatalog(channel, data);
    renderCaseSelector(data);
  } catch (error) {
    if (state.selectedChannelId !== channelId) return;
    state.isCaseLoading = false;
    state.providerCases[cacheKey] = null;
    els.caseGroups.innerHTML = `
      <div class="case-error">
        <strong>后端不可用</strong>
        <span>请先启动 8080 端口上的 Go 后端，再运行 ${escapeHtml(channel.name)} 用例。</span>
      </div>
    `;
    els.caseSelectorHint.textContent = `测试用例加载失败：${error.message}`;
    renderSelectedCaseCount();
  } finally {
    if (state.selectedChannelId === channelId) {
      state.isCaseLoading = false;
      updateRunAvailability();
    }
  }
}

function renderCaseSelector(data) {
  if (!data) {
    els.caseGroups.innerHTML = renderCustomCaseSection();
    syncBulkCheckboxes(els.caseGroups);
    renderSelectedCaseCount();
    return;
  }
  const partition = partitionCases(data.cases || []);
  const capacityCases = capacityCasesForProvider();
  els.caseGroups.innerHTML = [
    renderCaseOverview(data, partition),
    renderOptionalCaseSection(partition.optional),
    renderVlmCaseSection(partition.vlm),
    renderCapacityCaseSection(capacityCases),
    renderCustomCaseSection(),
    renderSingleParameterSection(partition.singles),
    renderCaseSection("参数组合用例", "一个 case 同时验证多个参数是否能共同工作。组合 case 会影响多个参数的兼容性判断。", partition.combos),
    renderCaseSection("基础协议与场景用例", "这些 case 主要验证 model、messages、多轮对话、工具链路或响应头，不只对应某一个参数。", partition.scenarios)
  ].join("");
  syncBulkCheckboxes(els.caseGroups);
  renderSelectedCaseCount();
}

function renderOptionalCaseSection(cases) {
  if (!cases.length) return "";
  return renderCaseSection(
    "可选扩展用例",
    "这些 case 会验证 provider 或模型扩展能力，例如前缀续写、stream 与 tools 组合；默认不选。",
    cases
  );
}

function renderVlmCaseSection(cases) {
  if (!cases.length) return "";
  return renderCaseSection(
    "VLM 图像用例（可选）",
    "这部分会使用图像输入，需要视觉模型。默认不选；切到 VLM 模型后再开启。",
    cases
  );
}

function renderCapacityCaseSection(cases) {
  if (!cases.length) return "";
  return renderCaseSection(
    "模型限制实测（输入/输出/上下文/思考预算）（可选）",
    "分别探测 最大Input、最大Max Output（含是否真生效）、最大Total Context、最大Thinking Budget；同一模型内逐档串行，不同 target 可并发。默认不选，避免额外消耗额度。",
    cases
  );
}

function renderCaseTable(cases) {
  if (!cases.length) return '<div class="case-empty">暂无 case</div>';
  return `
    <div class="case-table" role="list" aria-label="测试用例">
      <div class="case-table__body">
        ${cases.map((testCase) => renderCaseItem(testCase)).join("")}
      </div>
    </div>
  `;
}

function renderContextualCaseTable(cases, context = {}) {
  if (!cases.length) return '<div class="case-empty">暂无 case</div>';
  return `
    <div class="case-table" role="list" aria-label="测试用例">
      <div class="case-table__body">
        ${cases.map((testCase) => renderCaseItem(testCase, context)).join("")}
      </div>
    </div>
  `;
}

function renderCaseOverview(data, partition) {
  const singleCount = Array.from(partition.singles.values()).reduce((sum, cases) => sum + cases.length, 0);
  const focusParamCount = new Set((data.cases || []).flatMap(focusParametersForCase)).size;
  const vlmText = partition.vlm.length ? `，VLM ${partition.vlm.length} 个可选` : "";
  return `
    <div class="case-overview">
      <div>
        <strong>先选参数，再微调用例</strong>
        <p>单参数 ${singleCount} 个，组合 ${partition.combos.length} 个，基础场景 ${partition.scenarios.length} 个${vlmText}；默认勾选常规 case，VLM 和 模型限制实测（输入/输出/上下文/思考预算）按需开启。</p>
      </div>
      <span class="mono">${focusParamCount} 个重点参数有对应 case</span>
    </div>
  `;
}

function renderCustomCaseSection() {
  if (!state.customCases.length) return "";
  return renderCaseSection("自定义 payload", "这些 case 只保存在当前页面会话中，可直接复制 curl 或与内置用例一起运行。", state.customCases);
}

function renderSingleParameterSection(singleMap) {
  const orderedEntries = Array.from(singleMap.entries()).sort(([left], [right]) => left.localeCompare(right));
  const total = orderedEntries.reduce((sum, [, cases]) => sum + cases.length, 0);
  const allSingleCaseIds = orderedEntries.flatMap(([, cases]) => caseIdsForCases(cases));
  return `
    <details class="case-group parameter-case-group">
      <summary>
        <span class="case-group__summary-main">
          <span class="case-group__summary-title">单参数用例</span>
          ${renderBulkSelect(allSingleCaseIds, "本部分", "case-group__select")}
        </span>
        <span class="muted mono">${total} 个 case</span>
      </summary>
      <div class="parameter-case-list">
        ${orderedEntries.map(([parameter, cases]) => `
          <section class="parameter-case-block">
            <div class="parameter-case-block__head">
              <code>${escapeHtml(parameter)}</code>
              <span class="parameter-case-block__meta">
                ${renderBulkSelect(caseIdsForCases(cases), "本参数", "case-group__select")}
                <span>${cases.length} 个 case</span>
              </span>
            </div>
            ${renderContextualCaseTable(cases, { groupParameter: parameter })}
          </section>
        `).join("")}
      </div>
    </details>
  `;
}

function renderCaseSection(title, description, cases) {
  return `
    <details class="case-group">
      <summary>
        <span class="case-group__summary-main">
          <span class="case-group__summary-title">${escapeHtml(title)}</span>
          ${renderBulkSelect(caseIdsForCases(cases), "本部分", "case-group__select")}
        </span>
        <span class="muted mono">${cases.length} 个 case</span>
      </summary>
      <p class="case-section-note">${escapeHtml(description)}</p>
      ${renderCaseTable(cases)}
    </details>
  `;
}

function renderCaseItem(testCase, context = {}) {
  const checked = state.selectedCaseIds.has(testCase.case_id) ? "checked" : "";
  const capacityDisplay = isCapacityCase(testCase) ? capacityCaseDisplay(testCase) : null;
  const focusParams = focusParametersForCase(testCase);
  const foundationalParams = foundationalParametersForCase(testCase);
  const displayParams = capacityDisplay
    ? testCase.parameters || []
    : [...focusParams, ...foundationalParams];
  const params = displayParams.map((param) => {
    const chipClass = foundationalParams.includes(param) ? "is-foundational" : "is-focus";
    return `<span class="${chipClass}">${escapeHtml(param)}</span>`;
  }).join("");
  const parameterChips = params;
  const title = contextualCaseTitle(capacityDisplay?.title || caseTitle(testCase), context);
  const intent = caseIntentText(testCase, context, capacityDisplay, title);

  return `
    <div class="case-row" role="listitem">
      <label class="case-row__select" aria-label="选择 ${escapeHtml(testCase.case_id)}">
        <input type="checkbox" data-case-id="${escapeHtml(testCase.case_id)}" ${checked} ${state.isRunning ? "disabled" : ""} />
      </label>
      <div class="case-row__main">
        <div class="case-row__case">
          <strong class="case-row__title" title="${escapeHtml(title)}">${escapeHtml(title)}</strong>
          ${intent ? `<span class="case-row__intent">${escapeHtml(intent)}</span>` : ""}
          ${parameterChips ? `<div class="case-row__chips">
            ${parameterChips}
          </div>` : ""}
        </div>
      </div>
      <div class="case-row__actions">
        <button class="case-copy-curl" type="button" data-action="copy-case-curl" data-case-id="${escapeHtml(testCase.case_id)}" title="复制 curl">curl</button>
        <button class="case-copy-curl" type="button" data-action="toggle-case-payload" data-case-id="${escapeHtml(testCase.case_id)}" title="查看 payload">payload</button>
        ${testCase.custom && !testCase.capacity_case ? `<button class="case-copy-curl danger" type="button" data-action="remove-custom-case" data-case-id="${escapeHtml(testCase.case_id)}" title="删除自定义 case">删</button>` : ""}
      </div>
      <div class="case-payload is-hidden" data-case-payload="${escapeHtml(testCase.case_id)}">
        ${testCase.headers ? `<p class="case-section-note">请求 Headers</p>` : ""}
        ${testCase.headers ? `<pre class="case-payload__code">${syntaxJson(testCase.headers)}</pre>` : ""}
        <p class="case-section-note">请求 Body</p>
        <pre class="case-payload__code">${syntaxJson(testCase.payload)}</pre>
      </div>
    </div>
  `;
}

function renderSelectedCaseCount() {
  const data = state.providerCases[currentCaseCacheKey()];
  const cases = allProviderCases();
  const total = cases.length;
  const selected = cases.filter((testCase) => state.selectedCaseIds.has(testCase.case_id)).length;
  const focusCount = selectedFocusParameterCount(data);
  const focusTotal = new Set(cases.flatMap(focusParametersForCase)).size;
  const customText = state.customCases.length ? ` · 自定义 ${state.customCases.length} 个` : "";
  els.selectedCaseCount.textContent = `已选 ${selected} / ${total} 个 case · 覆盖 ${focusCount} / ${focusTotal} 个重点参数${customText}`;
  updateRunAvailability();
}

function updateRunAvailability() {
  if (!els.runTests) return;
  renderBaselineSelector();
  renderBatchMode();
  renderBaseUrlPreset(els.baseUrl?.value || "");
  const providerId = currentProviderId();
  const cases = allProviderCases(providerId);
  const caseControlsDisabled = state.isRunning || state.isCaseLoading || !providerId || !cases.length;
  els.selectAllCases.disabled = caseControlsDisabled;
  els.clearAllCases.disabled = caseControlsDisabled;
  els.addCustomPayload.disabled = state.isRunning || state.isCaseLoading || !providerId;
  els.clearCustomPayload.disabled = state.isRunning || state.isCaseLoading || !providerId;
  if (els.batchTargets) {
    els.batchTargets.disabled = state.isRunning || !state.batchModeEnabled;
  }
  if (els.batchConcurrency) {
    els.batchConcurrency.disabled = state.isRunning;
  }
  if (els.batchModeToggle) {
    els.batchModeToggle.disabled = state.isRunning;
  }
  if (els.stopTests) {
    els.stopTests.disabled = !state.isRunning;
  }

  if (state.isRunning) {
    els.runTests.disabled = true;
    return;
  }
  if (providerId) {
    els.runTests.disabled = state.isCaseLoading || !cases.length || state.selectedCaseIds.size === 0;
    return;
  }
  els.runTests.disabled = state.selectedEndpointId === "anthropic_messages";
}

function getResultsForChannel() {
  const proxy = getProxyConfig();
  const providerId = currentProviderId();
  if (providerId) {
    if (!allProviderCases(providerId).length || !state.selectedCaseIds.size) return [];
    return selectedProviderCases(providerId)
      .map((testCase, index) => {
        const parameters = testCase.parameters?.length ? testCase.parameters : ["payload"];
        const supportConclusion = inferSiliconFlowConclusion(testCase);
        const meta = supportConclusionMeta[supportConclusion];
        const isExtension = parameters.some((param) => ["top_k", "min_p", "repetition_penalty", "enable_thinking", "thinking", "thinking.budget_tokens", "thinking_budget", "preserve_thinking", "reasoning", "reasoning.enabled", "reasoning.effort", "reasoning.summary", "reasoning_effort", "reasnoing_effort", "reasoning_split", "chat_template_kwargs.enable_thinking", "tool_stream", "enable_code_interpreter", "enable_search", "search_options", "skill", "user_id", "reasoning_content", "messages[].prefix", "messages[].reasoning_content", "tools[].function.strict", "tools[].function.parameters", "stream_options.include_usage", "x-siliconcloud-trace-id", "X-DashScope-DataInspection"].includes(param));
        const isStream = parameters.includes("stream");
        const diffCount = isExtension ? 2 : isStream ? 1 : 0;
        return {
          case_id: testCase.case_id,
          channel_id: state.selectedChannelId,
          parameter: parameters.join(" + "),
          category: testCase.category || "case",
          support_conclusion: supportConclusion,
          status: meta.status,
          http_status: meta.httpStatus,
          latency_ms: 300 + ((index * 41) % 240),
          diff_count: diffCount,
          message: meta.note,
          proxy,
          source_case: testCase
        };
      });
  }

  if (state.selectedChannelId === "deepseek") {
    return MOCK_RESULTS
      .filter((result) => result.channel_id === "deepseek")
      .map((result) => {
        const supportConclusion = inferMockConclusion(result);
        const meta = supportConclusionMeta[supportConclusion];
        return {
          ...result,
          support_conclusion: supportConclusion,
          http_status: meta.httpStatus,
          proxy,
          message: result.message || meta.note
        };
      });
  }

  const channel = getSelectedChannel();
  const params = flattenParameters(channel);
  return params.map(({ parameter, category }, index) => ({
    case_id: `${channel.channel_id}:${parameter}`,
    channel_id: channel.channel_id,
    parameter,
    category: category.toLowerCase(),
    support_conclusion: index % 9 === 0 ? "ignored" : "supported",
    status: index % 9 === 0 ? "warning" : "accepted",
    http_status: 200,
    latency_ms: 320 + ((index * 37) % 190),
    diff_count: index % 5 === 0 ? 1 : 0,
    message: index % 9 === 0 ? supportConclusionMeta.ignored.note : supportConclusionMeta.supported.note,
    proxy
  }));
}

async function readRunStream(response, onEvent) {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("当前浏览器不支持流式读取测试结果。");
  }
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      onEvent(JSON.parse(trimmed));
    }
    if (done) break;
  }
  const tail = buffer.trim();
  if (tail) onEvent(JSON.parse(tail));
}

function responseForResult(result) {
  const existing = MOCK_RESPONSES[result.case_id];
  const hasRealRunResponse = hasResponseBody(result) || result.raw_response || result.request_body || result.response_headers;
  if (existing && !hasRealRunResponse) return existing;

  const selectedBaseline = selectedBaselineRecord();
  const baselineResult = matchingBaselineResult(result, selectedBaseline);
  const baseline = baselineResponseForResult(result, selectedBaseline);
  const realResponse = result.response_body || result.raw_response || (result.error ? { error: { message: result.error } } : null);
  const channelResponse = realResponse || (result.diff_count
    ? {
      ...MOCK_RESPONSES["deepseek:thinking"].channel_response,
      model: els.modelName.value
    }
    : {
      ...MOCK_RESPONSES["deepseek:temperature"].channel_response,
      model: els.modelName.value
    });

  return {
    request_body: result.request_body || result.source_case?.payload || {
      model: els.modelName.value,
      messages: [{ role: "user", content: "Say hi" }],
      [result.parameter]: true
    },
    request_headers: result.request_headers || result.source_case?.headers || null,
    baseline_response: baseline,
    baseline_label: baseline
      ? baselineLabel(selectedBaseline)
      : `${baselineLabel(selectedBaseline)}（无匹配 case）`,
    baseline_meta: baselineResult ? {
      report_id: selectedBaseline.id,
      channel_name: selectedBaseline.channel_name,
      model: selectedBaseline.model,
      generated_at: selectedBaseline.generated_at,
      http_status: baselineResult.http_status
    } : null,
    channel_response: channelResponse
  };
}

function baselineStateForResult(result, baseline = selectedBaselineRecord()) {
  if (!baseline) {
    return { status: "missing", label: "No baseline" };
  }
  if (!historyRecordHasBaselinePayload(baseline)) {
    return { status: "no_payload", label: "baseline 无响应体" };
  }
  if (!matchingBaselineResult(result, baseline)) {
    return { status: "case_missing", label: "baseline 无同名 case" };
  }
  return { status: "ready", label: "baseline 命中" };
}

function diffSummaryForResult(result) {
  const stateForBaseline = baselineStateForResult(result);
  if (stateForBaseline.status !== "ready") {
    return stateForBaseline.label;
  }
  return result.diff_count ? `${result.diff_count} 处差异` : "结构一致";
}

function historyStats(results = []) {
  const expectedResults = results.filter(matchesExpectedResult);
  const unexpectedResults = results.filter((result) => !matchesExpectedResult(result));
  return {
    total: results.length,
    expectedPass: expectedResults.length,
    unexpected: unexpectedResults.length,
    unexpectedRejected: unexpectedResults.filter((result) => result.support_conclusion === "rejected_400").length,
    unexpectedRequestFailed: unexpectedResults.filter((result) => result.support_conclusion === "request_failed").length,
    unexpectedSchemaMismatch: unexpectedResults.filter((result) => result.support_conclusion === "schema_mismatch").length,
    supported: results.filter((result) => result.support_conclusion === "supported").length,
    ignored: results.filter((result) => result.support_conclusion === "ignored").length,
    permissionLimited: results.filter((result) => result.support_conclusion === "permission_limited").length,
    rejected: results.filter((result) => result.support_conclusion === "rejected_400").length,
    requestFailed: results.filter((result) => result.support_conclusion === "request_failed").length,
    schemaMismatch: results.filter((result) => result.support_conclusion === "schema_mismatch").length,
    diffs: results.filter((result) => result.diff_count > 0).length,
    baselineReady: results.filter((result) => hasResponseBody(result)).length
  };
}

function createEmptyAggregateStats() {
  return {
    reports: 0,
    total: 0,
    expectedPass: 0,
    unexpected: 0,
    unexpectedRejected: 0,
    unexpectedRequestFailed: 0,
    unexpectedSchemaMismatch: 0,
    supported: 0,
    ignored: 0,
    permissionLimited: 0,
    rejected: 0,
    requestFailed: 0,
    schemaMismatch: 0,
    diffs: 0,
    baselineReady: 0,
    providers: new Map(),
    models: new Set(),
    latestAt: null
  };
}

function aggregateHistory(items = []) {
  const aggregate = createEmptyAggregateStats();
  aggregate.reports = items.length;
  for (const record of items) {
    const stats = record.stats || historyStats(record.results || []);
    const derivedStats = historyStats(record.results || []);
    aggregate.total += stats.total || 0;
    aggregate.expectedPass += stats.expectedPass ?? derivedStats.expectedPass;
    aggregate.unexpected += stats.unexpected ?? derivedStats.unexpected;
    aggregate.unexpectedRejected += stats.unexpectedRejected ?? derivedStats.unexpectedRejected;
    aggregate.unexpectedRequestFailed += stats.unexpectedRequestFailed ?? derivedStats.unexpectedRequestFailed;
    aggregate.unexpectedSchemaMismatch += stats.unexpectedSchemaMismatch ?? derivedStats.unexpectedSchemaMismatch;
    aggregate.supported += stats.supported || 0;
    aggregate.ignored += stats.ignored || 0;
    aggregate.permissionLimited += stats.permissionLimited || 0;
    aggregate.rejected += stats.rejected || 0;
    aggregate.requestFailed += stats.requestFailed || 0;
    aggregate.schemaMismatch += stats.schemaMismatch || 0;
    aggregate.diffs += stats.diffs || 0;
    aggregate.baselineReady += stats.baselineReady || 0;
    const providerName = record.channel_name || record.channel_id || "未知渠道";
    aggregate.providers.set(providerName, (aggregate.providers.get(providerName) || 0) + 1);
    if (record.model) aggregate.models.add(record.model);
    if (record.generated_at && (!aggregate.latestAt || new Date(record.generated_at) > new Date(aggregate.latestAt))) {
      aggregate.latestAt = record.generated_at;
    }
  }
  return aggregate;
}

function historyChannelLabel(record = {}) {
  return record.channel_name || record.channel_id || record.provider || "未知渠道";
}

function resultChannelLabel(result = {}, fallbackRecord = {}) {
  const name = result.channel_name || result.channel_id || historyChannelLabel(fallbackRecord);
  if (result.is_baseline) return `${name} · Baseline`;
  return name;
}

function historyChannelKey(record = {}) {
  return record.channel_id || record.provider || historyChannelLabel(record);
}

function historyModelLabel(record = {}) {
  return record.model || "未记录模型";
}

function historyModelKey(record = {}) {
  return record.model || "__missing_model";
}

function historyEndpointLabel(record = {}) {
  return record.endpoint_label || record.endpoint_id || "Chat Completions";
}

function historyEndpointKey(record = {}) {
  return record.endpoint_id || record.endpoint_label || "__missing_endpoint";
}

function historyFilterMeta(type, record) {
  if (type === "channel") {
    return { key: historyChannelKey(record), label: historyChannelLabel(record) };
  }
  if (type === "model") {
    return { key: historyModelKey(record), label: historyModelLabel(record) };
  }
  return { key: historyEndpointKey(record), label: historyEndpointLabel(record) };
}

function historyFilterOptions(items = [], type) {
  const options = new Map();
  for (const record of items) {
    const meta = historyFilterMeta(type, record);
    const current = options.get(meta.key) || { ...meta, count: 0 };
    current.count += 1;
    options.set(meta.key, current);
  }
  return Array.from(options.values()).sort((left, right) =>
    right.count - left.count || left.label.localeCompare(right.label)
  );
}

function historyMatchesFilters(record) {
  return ["channel", "model", "endpoint"].every((type) => {
    const selected = state.historyFilters[type] || "all";
    return selected === "all" || historyFilterMeta(type, record).key === selected;
  });
}

function filteredHistoryItems(items = []) {
  return items.filter(historyMatchesFilters);
}

function normalizeHistoryFilters(items = []) {
  for (const type of ["channel", "model", "endpoint"]) {
    const selected = state.historyFilters[type] || "all";
    if (selected === "all") continue;
    const exists = items.some((record) => historyFilterMeta(type, record).key === selected);
    if (!exists) state.historyFilters[type] = "all";
  }
}

function renderHistoryFilters(items = [], filteredItems = items) {
  if (!els.historyFilters) return;
  const groups = [
    ["channel", "渠道"],
    ["model", "模型"],
    ["endpoint", "接口类型"]
  ];
  els.historyFilters.innerHTML = `
    <div class="history-filter-head">
      <div class="history-filter-total">
        <span class="mono">${filteredItems.length} / ${items.length}</span>
        <span class="muted">筛选后报告</span>
      </div>
      <button class="btn btn-ghost btn-xs" type="button" data-history-filter-reset ${Object.values(state.historyFilters).every((value) => value === "all") ? "disabled" : ""}>重置</button>
    </div>
    ${groups.map(([type, label]) => {
      const options = historyFilterOptions(items, type);
      const selected = state.historyFilters[type] || "all";
      return `
        <div class="filter-row">
          <span class="flabel">${escapeHtml(label)}</span>
          <button class="fchip ${selected === "all" ? "on" : ""}" type="button" data-history-filter="${type}" data-history-filter-value="all">全部 <em>${items.length}</em></button>
          ${options.map((option) => `
            <button class="fchip ${selected === option.key ? "on" : ""}" type="button" data-history-filter="${type}" data-history-filter-value="${escapeHtml(option.key)}">
              ${escapeHtml(option.label)} <em>${option.count}</em>
            </button>
          `).join("")}
        </div>
      `;
    }).join("")}
  `;
}

function percentText(value, total) {
  if (!total) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}

function renderHistorySummary(items) {
  const aggregate = aggregateHistory(items);
  const providerText = Array.from(aggregate.providers.entries())
    .sort((left, right) => right[1] - left[1])
    .map(([name, count]) => `${name} ${count}`)
    .join(" · ") || "—";
  const latestText = aggregate.latestAt ? formatDateTime(aggregate.latestAt) : "—";
  els.historySummary.innerHTML = `
      <article class="rep-card">
        <span class="lbl">运行次数</span>
        <span class="num">${aggregate.reports}</span>
        <span class="sub">${escapeHtml(providerText)}</span>
      </article>
      <article class="rep-card">
        <span class="lbl">总 case</span>
        <span class="num">${aggregate.total}</span>
        <span class="sub">模型 ${aggregate.models.size} 个 · 最近 ${escapeHtml(latestText)}</span>
      </article>
      <article class="rep-card pass">
        <span class="lbl"><span class="mk" style="background:var(--status-success)"></span>符合预期</span>
        <span class="num">${aggregate.expectedPass}</span>
        <span class="sub">${percentText(aggregate.expectedPass, aggregate.total)}</span>
      </article>
      <article class="rep-card warn">
        <span class="lbl"><span class="mk" style="background:var(--status-warning)"></span>接受未证明 / 权限</span>
        <span class="num">${aggregate.ignored}</span>
        <span class="sub">${percentText(aggregate.ignored, aggregate.total)}</span>
      </article>
      <article class="rep-card fail">
        <span class="lbl"><span class="mk" style="background:var(--status-danger)"></span>预期外</span>
        <span class="num">${aggregate.unexpected}</span>
        <span class="sub">400 ${aggregate.unexpectedRejected} · 失败 ${aggregate.unexpectedRequestFailed} · 断言 ${aggregate.unexpectedSchemaMismatch}</span>
      </article>
      <article class="rep-card">
        <span class="lbl"><span class="mk" style="background:var(--status-info)"></span>结构差异 / baseline</span>
        <span class="num">${aggregate.diffs}</span>
        <span class="sub">可作 baseline ${aggregate.baselineReady} · ${percentText(aggregate.baselineReady, aggregate.total)}</span>
      </article>
  `;
}

function readHistory() {
  try {
    const parsed = JSON.parse(readStorageItem(HISTORY_STORAGE_KEY, LEGACY_HISTORY_STORAGE_KEYS) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeHistory(items) {
  const deduped = [];
  const seen = new Set();
  for (const item of items) {
    if (!item?.id || seen.has(item.id)) continue;
    seen.add(item.id);
    deduped.push(item);
  }
  const candidates = deduped.slice(0, MAX_HISTORY_ITEMS);
  const attempts = [
    { items: candidates, compacted: false },
    { items: candidates.map(compactHistoryRecord), compacted: true },
    { items: candidates.slice(0, 60).map(compactHistoryRecord), compacted: true },
    { items: candidates.slice(0, 30).map(compactHistoryRecord), compacted: true },
    { items: candidates.slice(0, 10).map(compactHistoryRecord), compacted: true },
    { items: candidates.slice(0, 1).map(compactHistoryRecord), compacted: true }
  ];

  let lastError = null;
  for (const attempt of attempts) {
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(attempt.items));
      return {
        saved: true,
        compacted: attempt.compacted,
        savedCount: attempt.items.length,
        droppedCount: Math.max(0, candidates.length - attempt.items.length)
      };
    } catch (error) {
      lastError = error;
    }
  }

  console.warn("Failed to persist run history", lastError);
  return {
    saved: false,
    compacted: true,
    savedCount: 0,
    droppedCount: candidates.length,
    error: lastError
  };
}

function truncateHistoryString(value, limit = HISTORY_STRING_LIMIT) {
  if (typeof value !== "string" || value.length <= limit) return value;
  return `${value.slice(0, limit)}\n\n[truncated ${value.length - limit} chars for local history storage]`;
}

function compactHistoryValue(value, depth = 0) {
  if (typeof value === "string") return truncateHistoryString(value);
  if (!value || typeof value !== "object") return value;
  if (depth > 8) return "[truncated nested object for local history storage]";
  if (Array.isArray(value)) {
    return value.map((item) => compactHistoryValue(item, depth + 1));
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, compactHistoryValue(item, depth + 1)])
  );
}

function compactHistoryResult(result = {}) {
  const responseBody = hasResponseBody(result) ? compactHistoryValue(result.response_body) : null;
  return {
    ...result,
    request_body: compactHistoryValue(result.request_body),
    response_body: responseBody,
    raw_response: responseBody ? "" : truncateHistoryString(result.raw_response || "", HISTORY_RAW_RESPONSE_LIMIT),
    response_headers: compactHistoryValue(result.response_headers),
    request_headers: compactHistoryValue(result.request_headers)
  };
}

function compactHistoryRecord(record = {}) {
  return {
    ...record,
    results: (record.results || []).map(compactHistoryResult)
  };
}

function createHistoryRecord(context = null, sourceResults = state.completedResults, idSuffix = "") {
  const channel = context?.channel_id
    ? CHANNEL_TEMPLATES.find((item) => item.channel_id === context.channel_id) || getSelectedChannel()
    : getSelectedChannel();
  const results = sourceResults.map((rawResult) => {
    const result = enrichResultAxes(rawResult);
    return {
      ...result,
    title: resultTitle(result),
    response_body: result.response_body,
    raw_response: result.raw_response,
    response_headers: result.response_headers,
    source_case: result.source_case ? {
      case_id: result.source_case.case_id,
      title: caseTitle(result.source_case),
      category: result.source_case.category,
      parameters: result.source_case.parameters,
      custom: Boolean(result.source_case.custom),
      payload: result.source_case.payload,
      expect: result.source_case.expect
    } : null
    };
  });
  const normalizedResults = results.map((result) => canonicalResultFromRaw(result));
  const generatedAt = new Date().toISOString();
  const endpoint = context?.endpoint_id ? endpointTemplateById(context.endpoint_id) : getSelectedEndpointTemplate();
  const baseline = selectedBaselineRecord();
  const baselineReady = baseline && historyRecordHasBaselinePayload(baseline);
  return {
    id: `report_${Date.now()}${idSuffix}`,
    generated_at: generatedAt,
    endpoint_id: context?.endpoint_id || state.selectedEndpointId,
    endpoint_label: context?.endpoint_label || endpoint.label,
    channel_id: context?.channel_id || channel.channel_id,
    channel_name: context?.channel_name || channel.name,
    provider: context?.provider || currentProviderId() || channel.provider_id || runnableProviderByChannel[channel.channel_id] || channel.channel_id,
    base_url: context?.base_url || els.baseUrl.value.trim(),
    model: context?.model || els.modelName.value.trim(),
    baseline_report_id: baseline?.id || "",
    baseline_label: baselineLabel(baseline),
    baseline_ready: Boolean(baselineReady),
    baseline_status: baselineReady ? "ready" : "exploratory",
    proxy: state.lastRunProxy || getProxyConfig(),
    stats: historyStats(normalizedResults),
    results: normalizedResults
  };
}

function saveHistoryRecord(sourceResults = state.completedResults, batchRunRecords = state.batchRunRecords) {
  if (!sourceResults.length) return null;
  const items = readHistory();
  const records = batchRunRecords.length
    ? batchRunRecords.map((entry, index) => createHistoryRecord(entry.context, entry.results, `_batch_${index + 1}`))
    : [createHistoryRecord(null, sourceResults)];
  const record = records[0];
  state.lastReportRecord = record;
  const writeResult = writeHistory([...records, ...items]);
  renderHistory();
  if (!writeResult.saved) {
    showToast("本次结果已展示，但历史报告写入失败：浏览器本地存储空间不足。");
  } else if (writeResult.compacted || writeResult.droppedCount > 0) {
    showToast(writeResult.droppedCount > 0
      ? `本次结果已保存；本地历史空间不足，已保留最近 ${writeResult.savedCount} 条。`
      : "本次结果已保存；较大的响应内容已压缩。");
  } else if (records.length > 1) {
    showToast(`批量测试已保存 ${records.length} 份历史报告。`);
  }
  return record;
}

function mergeImportedHistory(records) {
  const existing = readHistory();
  const existingIds = new Set(existing.map((record) => record.id));
  const newRecords = records.filter((record) => !existingIds.has(record.id));
  writeHistory([...records, ...existing]);
  renderHistory();
  return newRecords.length;
}

function importedRecordsFromPayload(parsed, sourceName) {
  if (Array.isArray(parsed?.records)) {
    return parsed.records.map((record, index) => normalizeHistoryRecord(record, { sourceName: `${sourceName}#${index + 1}` }));
  }
  if (Array.isArray(parsed?.suites)) {
    return parsed.suites.map((suite, index) => normalizeHistoryRecord({
      ...suite,
      generated_at: parsed.finished_at || parsed.started_at,
      imported_from: sourceName
    }, { sourceName: `${sourceName}#${index + 1}` }));
  }
  return [normalizeHistoryRecord(parsed, { sourceName })];
}

function toastImportedRecords(records, importedCount) {
  const baselineReadyCount = records.filter(historyRecordHasBaselinePayload).length;
  showToast(`已导入 ${importedCount || records.length} 份报告；其中 ${baselineReadyCount} 份可作为结构 baseline。`);
}

async function autoImportOriginalBaselines() {
  try {
    const response = await fetch("/outputs/original-baselines.import.json", { cache: "no-store" });
    if (!response.ok) return;
    const parsed = await response.json();
    const records = importedRecordsFromPayload(parsed, "original-baselines.import.json");
    const importedCount = mergeImportedHistory(records);
    if (importedCount > 0) showToast(`已自动载入 ${importedCount} 份原厂 baseline 报告。`);
  } catch {
    // 原厂 baseline 文件不存在或格式不完整时，不影响页面正常使用。
  }
}

async function importHistoryFiles(files) {
  const records = [];
  const failures = [];
  for (const file of Array.from(files || [])) {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      records.push(...importedRecordsFromPayload(parsed, file.name));
    } catch (error) {
      failures.push(`${file.name}: ${error.message}`);
    }
  }
  if (records.length) toastImportedRecords(records, mergeImportedHistory(records));
  if (failures.length) {
    showToast(`部分报告导入失败：${failures.slice(0, 2).join("；")}`);
  }
}

function historyRecordMarkdown(record) {
  const stats = { ...historyStats(record.results || []), ...(record.stats || {}) };
  const lines = [
    `# Noctua 历史测试报告：${record.channel_name}`,
    "",
    `时间：${formatDateTime(record.generated_at)}`,
    `Endpoint：${record.endpoint_label || record.endpoint_id || "Chat Completions"}`,
    `Base URL：${record.base_url || "—"}`,
    `Model：${record.model || "—"}`,
    `baseline：${record.baseline_label || "未选择历史 baseline"}`,
    `代理配置：${proxySummary(record.proxy)}`,
    "",
    `总计：${stats.total}；符合预期：${stats.expectedPass}；预期外：${stats.unexpected}；支持：${stats.supported}；接受未证明：${stats.ignored}；400：${stats.rejected}；请求失败：${stats.requestFailed}；断言失败：${stats.schemaMismatch || 0}；结构差异：${stats.diffs}`,
    "",
    ...capacitySummaryMarkdownLines(record.results || []),
    ...thinkingProbeAnalysisLines(record.results || [], {
      channelId: record.channel_id || record.provider,
      protocolId: record.endpoint_id || record.protocol_id
    }),
    ...thinkingCloseAnalysisLines(record.results || []),
    "| Case | 参数 | 分类 | 测试结果 | 实际结论 | HTTP 状态 | 结构差异 |",
    "|---|---|---|---|---|---|---|",
    ...record.results.map((result) =>
      `| \`${result.case_id}\` | \`${result.parameter}\` | ${categoryLabel(result.category)} | ${expectationLabel(result)} | ${conclusionMeta(result).label} | ${result.http_status || conclusionMeta(result).httpStatus || "—"} | ${result.diff_count ? `${result.diff_count} 个字段差异` : "—"} |`
    ),
    "",
    ...originalChannelReportMarkdown(record)
  ];
  return lines.join("\n");
}

function currentRunMarkdown(record) {
  if (!record) return "";
  const stats = { ...historyStats(record.results || []), ...(record.stats || {}) };
  const unexpectedResults = (record.results || []).filter((result) => !matchesExpectedResult(result));
  const diffResults = (record.results || []).filter((result) => result.diff_count > 0);
  const topUnexpected = unexpectedResults.slice(0, 12);
  const lines = [
    `# ${record.channel_name || record.provider || "Provider"} 评测结果`,
    "",
    "## 概览",
    "",
    `- 报告 ID：${record.id}`,
    `- 生成时间：${formatDateTime(record.generated_at)}`,
    `- Endpoint：${record.endpoint_label || record.endpoint_id || "Chat Completions"}`,
    `- Provider：${record.provider || record.channel_id || "—"}`,
    `- Base URL：${record.base_url || "—"}`,
    `- Model：${record.model || "—"}`,
    `- baseline：${record.baseline_label || "未选择历史 baseline"}`,
    `- 代理配置：${proxySummary(record.proxy)}`,
    "",
    "## 汇总",
    "",
    `- 总计：${stats.total || 0}`,
    `- 符合预期：${stats.expectedPass || 0}`,
    `- 预期外：${stats.unexpected || 0}`,
    `- 支持：${stats.supported || 0}`,
    `- 接受未证明/权限受限：${(stats.ignored || 0) + (stats.permissionLimited || 0)}`,
    `- 400 拒绝：${stats.rejected || 0}`,
    `- 请求失败/断言失败：${(stats.requestFailed || 0) + (stats.schemaMismatch || 0)}`,
    `- 结构差异：${stats.diffs || 0}`,
    "",
    ...capacitySummaryMarkdownLines(record.results || []),
    ...thinkingProbeAnalysisLines(record.results || [], {
      channelId: record.channel_id || record.provider,
      protocolId: record.endpoint_id || record.protocol_id
    }),
    ...thinkingCloseAnalysisLines(record.results || []),
    "## 预期外明细",
    ""
  ];
  if (topUnexpected.length) {
    lines.push("| Case | 参数 | 实际结论 | HTTP | 说明 |");
    lines.push("|---|---|---|---|---|");
    lines.push(...topUnexpected.map((result) =>
      `| \`${result.case_id}\` | \`${result.parameter}\` | ${conclusionMeta(result).label} | ${result.http_status || conclusionMeta(result).httpStatus || "—"} | ${escapeMarkdownCell(result.message || assertionSummary(result.assertions))} |`
    ));
    if (unexpectedResults.length > topUnexpected.length) {
      lines.push("");
      lines.push(`还有 ${unexpectedResults.length - topUnexpected.length} 条预期外结果，请在 Noctua 历史报告中查看。`);
    }
  } else {
    lines.push("本次评测未发现预期外结果。");
  }
  lines.push("");
  lines.push("## 结构差异");
  lines.push("");
  if (diffResults.length) {
    lines.push("| Case | 参数 | 差异数量 |");
    lines.push("|---|---|---|");
    lines.push(...diffResults.slice(0, 20).map((result) =>
      `| \`${result.case_id}\` | \`${result.parameter}\` | ${result.diff_count} |`
    ));
    if (diffResults.length > 20) {
      lines.push("");
      lines.push(`还有 ${diffResults.length - 20} 条结构差异结果，请在 Noctua 历史报告中查看。`);
    }
  } else {
    lines.push("本次评测未发现结构差异。");
  }
  lines.push("");
  lines.push("## 全量结果");
  lines.push("");
  lines.push("| Case | 参数 | 分类 | 测试结果 | 实际结论 | HTTP | 结构差异 |");
  lines.push("|---|---|---|---|---|---|---|");
  lines.push(...(record.results || []).map((result) =>
    `| \`${result.case_id}\` | \`${result.parameter}\` | ${categoryLabel(result.category)} | ${expectationLabel(result)} | ${conclusionMeta(result).label} | ${result.http_status || conclusionMeta(result).httpStatus || "—"} | ${result.diff_count ? `${result.diff_count} 个字段差异` : "—"} |`
  ));
  lines.push("");
  lines.push(...originalChannelReportMarkdown(record));
  return lines.join("\n");
}

function escapeMarkdownCell(value) {
  return String(value || "—").replace(/\|/g, "\\|").replace(/\n/g, " ").slice(0, 180);
}

function channelReportMarkdown(record) {
  const stats = record.stats || channelReportStatsForResults(record.results || []);
  const evaluation = ensureChannelReportEvaluation(record);
  const matrix = ensureChannelReportMatrix(record);
  const lines = [
    "## 渠道参数测评报告",
    "",
    `- 模型：${record.model_id || "—"}`,
    `- 协议：${record.protocol_id || "—"}`,
    `- Baseline：${record.baseline_label || "—"}`,
    `- 测评渠道：${(record.target_labels || []).join("、") || "—"}`,
    `- 生成时间：${formatDateTime(record.generated_at)}`,
    `- 整体结论：${evaluation?.verdict_meta?.label || "—"} · ${evaluation?.headline || "—"}`,
    `- 断言达标：${stats.assertPass || 0}/${stats.assertTotal || 0}`,
    `- 观测记录：${stats.observeRecorded || 0}/${stats.observeTotal || 0}`,
    `- 结构差异：${stats.structureDiffs || 0}`,
    ""
  ];
  if (evaluation?.severity_counts) {
    lines.push("### Case 严重度分布");
    for (const level of ["p0", "p1", "p2", "p3"]) {
      const meta = CHANNEL_REPORT_INTENT.caseSeverityMeta?.(level);
      const counts = evaluation.severity_counts[level];
      if (!counts?.total) continue;
      lines.push(`- ${meta?.label || level} ${meta?.title || ""}：${counts.total} case，${counts.failed} 项未达标`);
    }
    lines.push("");
  }
  if (evaluation?.channel_summaries?.length) {
    const issueChannels = evaluation.channel_summaries.filter((entry) => entry.issueCount > 0);
    if (issueChannels.length) {
      lines.push("### 问题渠道");
      for (const entry of issueChannels) {
        lines.push(`- ${entry.platformName}：${entry.issueCount} 项未达标（最高 ${entry.severity_meta?.label || "—"}）`);
      }
      lines.push("");
    }
  }
  for (const row of matrix) {
    const severity = CHANNEL_REPORT_INTENT.caseSeverityLevel?.({ case_id: row.case_id }, row.group_key) || "p2";
    const severityMeta = CHANNEL_REPORT_INTENT.caseSeverityMeta?.(severity);
    lines.push(`### ${row.title || row.case_id}（${severityMeta?.label || severity} ${severityMeta?.title || ""} · ${CHANNEL_REPORT_INTENT.intentLabel?.(row.intent) || row.intent}）`);
    for (const [channelKey, summary] of Object.entries(row.by_channel || {})) {
      if (!summary) continue;
      const status = row.intent === "observe"
        ? (summary.report_status === "observe_issue"
          ? "请求异常"
          : summary.report_status === "observe_assert_fail"
            ? `断言异常${summary.failed_assertion_summary ? ` · ${summary.failed_assertion_summary}` : ""}`
            : "已记录")
        : (summary.report_status === "pass" ? "达标" : "未达标");
      lines.push(`- ${summary.channel_name || channelKey}：${status} · ${summary.support_label || summary.support_conclusion} · HTTP ${summary.http_status}${summary.diff_count ? ` · diff ${summary.diff_count}` : ""}${summary.cache_hit_summary ? ` · ${summary.cache_hit_summary}` : ""}`);
    }
    lines.push("");
  }
  lines.push(...originalChannelReportMarkdown(record));
  return lines;
}

function channelReportFilename(record, ext) {
  const id = String(record.id || "report").replace(/^channel_report_/, "run-");
  const model = String(record.model_id || "model").replace(/[^\w.-]+/g, "_").slice(0, 48);
  return `${model}_${id}.${ext}`;
}

function downloadTextFile(filename, content, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function downloadChannelReportMarkdown(record) {
  const content = channelReportMarkdown(record).join("\n");
  downloadTextFile(channelReportFilename(record, "md"), content, "text/markdown;charset=utf-8");
  showToast("Markdown 报告已下载。");
}

function exportDocGapScanBundle() {
  const channelReports = readChannelReports();
  const historyReports = readHistory();
  const payload = {
    exported_at: new Date().toISOString(),
    channel_reports: channelReports,
    history_reports: historyReports
  };
  downloadTextFile(
    "channel-reports-export.json",
    JSON.stringify(payload, null, 2),
    "application/json;charset=utf-8"
  );
  showToast(`已导出 ${channelReports.length} 份渠道报告 + ${historyReports.length} 份历史报告，供 npm run scan:doc-gaps 使用。`);
}

function channelReportPdfCellText(summary, intent) {
  if (!summary) return "—";
  if (intent === "observe") {
    if (summary.report_status === "observe_issue") {
      return `请求异常 · ${summary.support_label || summary.support_conclusion || "—"} · HTTP ${summary.http_status || "—"}`;
    }
    if (summary.report_status === "observe_assert_fail") {
      const parts = [
        "断言异常",
        summary.support_label || summary.support_conclusion || "—"
      ];
      if (summary.failed_assertion_summary) parts.push(summary.failed_assertion_summary);
      parts.push(`HTTP ${summary.http_status || "—"}`);
      return parts.join(" · ");
    }
    return `已记录 · ${summary.support_label || summary.support_conclusion || "—"} · HTTP ${summary.http_status || "—"}`;
  }
  const status = summary.report_status === "pass" ? "达标" : "未达标";
  const parts = [
    status,
    summary.support_label || summary.support_conclusion || "—",
    `HTTP ${summary.http_status || "—"}`
  ];
  if (summary.cache_hit_summary) parts.push(summary.cache_hit_summary);
  return parts.join(" · ");
}

function renderChannelReportPdfMatrixSection(record, groupKey, rows, channels) {
  if (!rows.length) return "";
  const baselineChannel = channels.find((channel) => channel.role === "baseline");
  const targetChannels = channels.filter((channel) => channel.role !== "baseline");
  const title = escapeHtml(rows[0].group_title || RUN_V02_GROUP_TITLES[groupKey] || groupKey);
  const headerCols = [
    "<th style=\"padding:6px 8px;border:1px solid #ddd;text-align:left\">Case</th>",
    "<th style=\"padding:6px 8px;border:1px solid #ddd;text-align:left\">类型</th>",
    baselineChannel ? `<th style="padding:6px 8px;border:1px solid #ddd;text-align:left">${escapeHtml(baselineChannel.platformName)} (Baseline)</th>` : "",
    ...targetChannels.map((channel) => `<th style="padding:6px 8px;border:1px solid #ddd;text-align:left">${escapeHtml(channel.platformName)}</th>`),
    "<th style=\"padding:6px 8px;border:1px solid #ddd;text-align:left\">结构差异</th>"
  ].join("");
  const bodyRows = rows.map((row) => {
    const diffParts = targetChannels.map((channel) => {
      const summary = row.by_channel?.[channel.key];
      if (!summary || summary.diff_count <= 0) return "";
      return `${channel.platformName} ${summary.diff_count}`;
    }).filter(Boolean);
    const cellStyle = "padding:6px 8px;border:1px solid #ddd;vertical-align:top";
    return `<tr>
      <td style="${cellStyle}">${escapeHtml(row.title || row.case_id)}</td>
      <td style="${cellStyle}">${escapeHtml(CHANNEL_REPORT_INTENT.intentLabel?.(row.intent) || row.intent)}</td>
      ${baselineChannel ? `<td style="${cellStyle}">${escapeHtml(channelReportPdfCellText(row.by_channel?.[baselineChannel.key], row.intent))}</td>` : ""}
      ${targetChannels.map((channel) => `<td style="${cellStyle}">${escapeHtml(channelReportPdfCellText(row.by_channel?.[channel.key], row.intent))}</td>`).join("")}
      <td style="${cellStyle}">${escapeHtml(diffParts.length ? diffParts.join(" · ") : "—")}</td>
    </tr>`;
  }).join("");
  return `
    <section style="margin-top:20px">
      <h3 style="font-size:14px;margin:0 0 8px">${title}</h3>
      <table style="width:100%;border-collapse:collapse;font-size:11px">
        <thead><tr style="background:#f4f4f5">${headerCols}</tr></thead>
        <tbody>${bodyRows}</tbody>
      </table>
    </section>`;
}

function channelReportPdfBodyHtml(record) {
  const stats = record.stats || channelReportStatsForResults(record.results || []);
  const channels = ensureChannelReportChannels(record);
  const matrix = ensureChannelReportMatrix(record);
  const protocolLabel = channelReportProtocolLabel(record.protocol_id);
  const grouped = new Map();
  for (const row of matrix) {
    const key = row.group_key || "other";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(row);
  }
  const groupOrder = Object.keys(RUN_V02_GROUP_TITLES);
  const sections = groupOrder
    .filter((key) => grouped.has(key))
    .map((key) => renderChannelReportPdfMatrixSection(record, key, grouped.get(key), channels))
    .join("");
  const extraSections = [...grouped.keys()]
    .filter((key) => !groupOrder.includes(key))
    .map((key) => renderChannelReportPdfMatrixSection(record, key, grouped.get(key), channels))
    .join("");
  const metaRow = (label, value) => `
    <tr>
      <td style="padding:3px 12px 3px 0;font-weight:600;white-space:nowrap;vertical-align:top">${escapeHtml(label)}</td>
      <td style="padding:3px 0">${escapeHtml(value)}</td>
    </tr>`;
  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111;padding:16px;max-width:800px;background:#fff">
      <h1 style="font-size:20px;margin:0 0 4px">渠道参数测评报告</h1>
      <p style="font-size:12px;color:#666;margin:0 0 16px">${escapeHtml(formatDateTime(record.generated_at))}</p>
      <table style="width:100%;font-size:12px;margin-bottom:16px">
        ${metaRow("模型", record.model_id || "—")}
        ${metaRow("协议", protocolLabel)}
        ${metaRow("Baseline", record.baseline_label || "—")}
        ${metaRow("测评渠道", (record.target_labels || []).join("、") || "—")}
        ${metaRow("断言达标", `${stats.assertPass || 0}/${stats.assertTotal || 0}`)}
        ${metaRow("观测记录", `${stats.observeRecorded || 0}/${stats.observeTotal || 0}`)}
        ${metaRow("结构差异", String(stats.structureDiffs || 0))}
      </table>
      ${sections}${extraSections}
    </div>`;
}

let html2PdfLoader = null;

function loadHtml2Pdf() {
  if (window.html2pdf) return Promise.resolve(window.html2pdf);
  if (!html2PdfLoader) {
    html2PdfLoader = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
      script.async = true;
      script.onload = () => resolve(window.html2pdf);
      script.onerror = () => reject(new Error("无法加载 PDF 生成库"));
      document.head.appendChild(script);
    });
  }
  return html2PdfLoader;
}

async function downloadChannelReportPdf(record) {
  showToast("正在生成 PDF…");
  let container = null;
  try {
    const html2pdf = await loadHtml2Pdf();
    container = document.createElement("div");
    container.innerHTML = channelReportPdfBodyHtml(record);
    container.style.cssText = "position:fixed;left:-10000px;top:0;width:800px;background:#fff";
    document.body.appendChild(container);
    await html2pdf().set({
      margin: [10, 10, 10, 10],
      filename: channelReportFilename(record, "pdf"),
      image: { type: "jpeg", quality: 0.92 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["avoid-all", "css", "legacy"] }
    }).from(container).save();
    showToast("PDF 报告已下载。");
  } catch (error) {
    showToast(`PDF 生成失败：${error.message}`);
  } finally {
    container?.remove();
  }
}

function renderChannelReportDownloadMenu(record) {
  return `
    <details class="channel-report-download-menu">
      <summary class="btn btn-secondary btn-sm channel-report-download-menu__trigger">
        ${renderIcon("download", { size: 14, className: "icon--inline" })}
        <span>下载报告</span>
      </summary>
      <div class="channel-report-download-menu__panel" role="menu">
        <button class="channel-report-download-menu__item" type="button" data-channel-report-action="download-md" data-channel-report-id="${escapeHtml(record.id)}" role="menuitem">
          ${renderIcon("file-text", { size: 14, className: "icon--inline" })}
          <span>Markdown (.md)</span>
        </button>
        <button class="channel-report-download-menu__item" type="button" data-channel-report-action="download-pdf" data-channel-report-id="${escapeHtml(record.id)}" role="menuitem">
          ${renderIcon("download", { size: 14, className: "icon--inline" })}
          <span>PDF (.pdf)</span>
        </button>
      </div>
    </details>`;
}

function originalChannelReportMarkdown(record) {
  const lines = [
    "## 原始渠道测试报告",
    "",
    `渠道：${historyChannelLabel(record)}`,
    `模型：${historyModelLabel(record)}`,
    `Endpoint：${historyEndpointLabel(record)}`,
    `Base URL：${record.base_url || "—"}`,
    ""
  ];
  for (const result of record.results || []) {
    const meta = conclusionMeta(result);
    const sourceCase = result.source_case || {};
    lines.push(`### ${resultTitle(result)}`);
    lines.push("");
    lines.push(`- Case ID：\`${result.case_id}\``);
    lines.push(`- 参数：\`${result.parameter || "payload"}\``);
    lines.push(`- 分类：${categoryLabel(result.category)}`);
    lines.push(`- 测试结果：${expectationLabel(result)}`);
    lines.push(`- 实际结论：${meta.label}`);
    lines.push(`- HTTP：${result.http_status || meta.httpStatus || "—"}`);
    lines.push(`- 延迟：${result.latency_ms ? `${result.latency_ms}ms` : "—"}`);
    const streamSummary = formatStreamMetricsSummary(result.stream_metrics);
    if (streamSummary) {
      lines.push(`- 流式指标：${streamSummary}`);
    }
    const streamUsage = formatStreamUsagePresent(result);
    if (streamUsage) {
      lines.push(`- 流式 usage：${streamUsage}`);
    }
    const streamUsageProfile = formatStreamUsageChunkProfile(result);
    if (streamUsageProfile) {
      lines.push(`- 流式 usage 分片：${streamUsageProfile}`);
    }
    const outputPrecedence = formatOutputLengthCapPrecedence(result);
    if (outputPrecedence) {
      lines.push(`- 输出上限字段：${outputPrecedence}`);
    }
    const outputEffective = formatOutputCapEffective(result);
    if (outputEffective) {
      lines.push(`- 输出 cap 生效：${outputEffective}`);
    }
    if (result.stream_probe_attempts?.length) {
      lines.push(`- 流式探测：${result.stream_probe_attempts.length} 次`);
    }
    lines.push(`- 消息：${result.message || result.error || "—"}`);
    lines.push("");
    lines.push("#### 请求 Body");
    lines.push(markdownFence(result.request_body || sourceCase.payload || null, "json"));
    if (result.request_headers || sourceCase.headers) {
      lines.push("");
      lines.push("#### 请求 Headers");
      lines.push(markdownFence(result.request_headers || sourceCase.headers, "json"));
    }
    if (sourceCase.expect) {
      lines.push("");
      lines.push("#### 预期断言");
      lines.push(markdownFence(sourceCase.expect, "json"));
    }
    lines.push("");
    lines.push(`#### ${historyChannelLabel(record)} 原始响应`);
    if (hasResponseBody(result)) {
      lines.push(markdownFence(result.response_body, "json"));
    } else {
      lines.push(markdownFence(result.raw_response || null, result.raw_response ? "text" : "json"));
    }
    if (result.raw_response && hasResponseBody(result)) {
      lines.push("");
      lines.push("#### Raw Response");
      lines.push(markdownFence(result.raw_response, "text"));
    }
    if (result.response_headers) {
      lines.push("");
      lines.push("#### 响应 Headers");
      lines.push(markdownFence(result.response_headers, "json"));
    }
    lines.push("");
    lines.push("#### 真实断言结果");
    lines.push(markdownFence(result.assertions || [], "json"));
    lines.push("");
  }
  return lines;
}

function markdownFence(value, language = "json") {
  const content = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  return `\`\`\`${language}\n${String(content ?? "null").replace(/```/g, "`\\`\\`")}\n\`\`\``;
}

function readFeishuConfig() {
  try {
    const parsed = JSON.parse(readStorageItem(FEISHU_CONFIG_STORAGE_KEY, LEGACY_FEISHU_CONFIG_STORAGE_KEYS) || "{}");
    return {
      documentUrl: String(parsed.documentUrl || "").trim(),
      documentMode: String(parsed.documentMode || "append").trim() === "overwrite" ? "overwrite" : "append",
      titlePrefix: String(parsed.titlePrefix || "Noctua 评测完成").trim() || "Noctua 评测完成",
      autoPush: Boolean(parsed.autoPush)
    };
  } catch {
    return {
      documentUrl: "",
      documentMode: "append",
      titlePrefix: "Noctua 评测完成",
      autoPush: false
    };
  }
}

function writeFeishuConfig() {
  const config = {
    documentUrl: els.feishuDocumentUrl.value.trim(),
    documentMode: els.feishuDocumentMode.value === "overwrite" ? "overwrite" : "append",
    titlePrefix: els.feishuTitlePrefix.value.trim() || "Noctua 评测完成",
    autoPush: Boolean(els.feishuAutoPush.checked)
  };
  localStorage.setItem(FEISHU_CONFIG_STORAGE_KEY, JSON.stringify(config));
  renderFeishuStatus();
  return config;
}

function loadFeishuConfig() {
  const config = readFeishuConfig();
  if (els.feishuDocumentUrl) els.feishuDocumentUrl.value = config.documentUrl;
  if (els.feishuDocumentMode) els.feishuDocumentMode.value = config.documentMode;
  if (els.feishuTitlePrefix) els.feishuTitlePrefix.value = config.titlePrefix;
  if (els.feishuAutoPush) els.feishuAutoPush.checked = config.autoPush;
  renderFeishuStatus();
}

function renderFeishuStatus(message) {
  if (!els.feishuStatus) return;
  if (message) {
    els.feishuStatus.textContent = message;
    return;
  }
  const config = readFeishuConfig();
  const currentDocumentUrl = els.feishuDocumentUrl?.value.trim() || "";
  const currentDocumentMode = els.feishuDocumentMode?.value === "overwrite" ? "overwrite" : "append";
  const currentTitlePrefix = els.feishuTitlePrefix?.value.trim() || "Noctua 评测完成";
  const currentAutoPush = Boolean(els.feishuAutoPush?.checked);
  const hasUnsavedConfig = currentDocumentUrl !== config.documentUrl || currentDocumentMode !== config.documentMode || currentTitlePrefix !== config.titlePrefix || currentAutoPush !== config.autoPush;
  const report = feishuReportMarkdown();
  if (!currentDocumentUrl) {
    els.feishuStatus.textContent = "尚未配置文档地址；请先运行 lark-cli config init --new，再填写飞书文档或 Wiki 链接。";
    return;
  }
  const configText = hasUnsavedConfig
    ? "配置有未保存改动；手动写入会自动保存"
    : config.autoPush ? "已开启自动写入" : "已保存文档地址，可手动写入";
  els.feishuStatus.textContent = `${configText}；当前文档 ${report ? `${report.length} 字符` : "尚未生成"}。`;
}

function renderFeishuReport(record = state.lastReportRecord) {
  if (!els.feishuReportPreview) return;
  const markdown = currentRunMarkdown(record);
  els.feishuReportPreview.value = markdown;
  renderFeishuStatus();
}

function feishuReportMarkdown() {
  return els.feishuReportPreview?.value.trim() || currentRunMarkdown(state.lastReportRecord);
}

function feishuReportTitle(record = state.lastReportRecord) {
  const config = readFeishuConfig();
  const provider = record?.channel_name || record?.provider || getSelectedChannel()?.name || "Provider";
  return `${config.titlePrefix}：${provider}`;
}

async function pushFeishuReport(record = state.lastReportRecord, { auto = false } = {}) {
  const config = auto ? readFeishuConfig() : writeFeishuConfig();
  if (!config.documentUrl) {
    showToast("请先配置飞书文档或 Wiki 地址。");
    setActiveView("feishu");
    return false;
  }
  const markdown = feishuReportMarkdown();
  if (!markdown) {
    showToast("暂无可写入的评测文档。");
    setActiveView("feishu");
    return false;
  }
  renderFeishuStatus("正在通过 lark-cli 写入飞书文档 ...");
  try {
    const response = await fetch(`${API_BASE}/api/feishu/document`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        document_url: config.documentUrl,
        document_mode: config.documentMode,
        title: feishuReportTitle(record),
        markdown
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }
    const successText = auto ? "评测完成，已自动写入飞书文档。" : "评测文档已写入飞书。";
    renderFeishuStatus(successText);
    showToast(successText);
    return true;
  } catch (error) {
    const failureText = `飞书文档写入失败：${error.message}`;
    renderFeishuStatus(failureText);
    showToast(failureText);
    return false;
  }
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "—";
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
}

function renderHistoryDetailRow(record, stats) {
  const capacityHtml = capacitySummaryHtml(record.results || [], "历史报告");
  return `
    <tr class="hdetail-row" data-history-detail="${escapeHtml(record.id)}">
      <td class="hdetail-cell" colspan="9">
        <div class="hdetail">
          <div class="hmeta">
            <span>${escapeHtml(historyEndpointLabel(record))}</span>
            <span class="mono">${escapeHtml(record.base_url || "—")}</span>
            <span>${escapeHtml(proxySummary(record.proxy))}</span>
            <span>总计 <strong>${stats.total}</strong></span>
            <span>符合预期 <strong>${stats.expectedPass}</strong></span>
            <span>预期外 <strong>${stats.unexpected}</strong></span>
            <span>支持 <strong>${stats.supported}</strong></span>
            <span>接受未证明 <strong>${stats.ignored}</strong></span>
            <span>400 <strong>${stats.rejected}</strong></span>
            <span>请求失败 <strong>${stats.requestFailed}</strong></span>
            <span>断言失败 <strong>${stats.schemaMismatch || 0}</strong></span>
            <span>差异 <strong>${stats.diffs}</strong></span>
            <span>可作 baseline <strong>${stats.baselineReady || 0}</strong></span>
          </div>
          ${capacityHtml ? `<section class="capacity-summary history-capacity-summary">${capacityHtml}</section>` : ""}
          <div class="history-original-report">
            <div class="history-original-head">
              <div>
                <strong>原始渠道测试报告</strong>
                <span>${escapeHtml(historyChannelLabel(record))} / ${escapeHtml(historyModelLabel(record))} / ${escapeHtml(historyEndpointLabel(record))}</span>
              </div>
              <button class="btn btn-secondary btn-sm" type="button" data-history-action="copy" data-history-id="${escapeHtml(record.id)}">复制完整报告</button>
            </div>
            <div class="history-result-list">
              ${renderHistoryResultGroups(record)}
            </div>
          </div>
        </div>
      </td>
    </tr>
  `;
}

function renderHistoryResultGroups(record) {
  const groups = groupReportResults(record.results || []);
  return groups.map((group) => {
    const stats = reportGroupStats(group.results);
    const tone = reportGroupTone(stats);
    return `
      <section class="history-result-group ${tone}">
        <div class="history-result-group-head">
          <div>
            <strong>${escapeHtml(group.title)}</strong>
            <p>${escapeHtml(group.description)}</p>
          </div>
          <span>${escapeHtml(reportGroupSummaryText(stats))}</span>
        </div>
        <div class="history-result-group-body">
          ${group.results.map((result) => renderHistoryRawCase(result, record)).join("")}
        </div>
      </section>
    `;
  }).join("");
}

// 断言名 → 运营可读解释（title=白话标题；detail=这条检查什么、挂了意味着什么）
const ASSERTION_EXPLANATIONS = {
  http_status: { title: "HTTP 状态码不符", detail: "接口返回的状态码与预期不一致。2xx=成功，4xx=请求被拒绝，5xx=服务方故障。" },
  response_mode: { title: "返回模式不对", detail: "预期以流式（SSE 分片逐段推送）返回，实际不是；或相反。" },
  required_response_fields: { title: "响应缺少标准字段", detail: "OpenAI 标准响应必须包含的顶层字段（id、choices、usage 等）不齐全，下游程序可能解析失败。" },
  messages_required_response_fields: { title: "响应缺少标准字段（Anthropic 协议）", detail: "Anthropic 协议响应应包含 id、type、role、content、model 等字段。" },
  required_chunk_fields: { title: "流式分片缺少标准字段", detail: "每个流式分片应包含 id、object、choices 等标准字段。" },
  choice_required_fields: { title: "回答结构不完整", detail: "choices 里的每条回答应包含 index、message、finish_reason 字段。" },
  usage_required_fields: { title: "Token 用量统计缺失", detail: "接口没有返回本次调用的 token 消耗（prompt_tokens=输入、completion_tokens=输出、total_tokens=合计）。缺少它将无法核对计费与用量监控。" },
  "stream_options.include_usage": { title: "流式用量开关未生效", detail: "请求里已要求流式响应附带 token 用量（include_usage），但最终分片没有返回 usage。" },
  stream_usage_in_sse: { title: "流式响应缺 usage 统计", detail: "流式输出结束前应有一个携带 token 用量的分片，实际没有出现。" },
  stream_usage_chunk_shape: { title: "usage 分片形态非标", detail: "OpenAI 标准：结束前用一个独立的空 choices 分片单独携带 usage。该渠道把 usage 与结束标记合并在同一分片——部分下游 SDK 会因此取不到用量。" },
  stream_usage_per_chunk: { title: "每分片用量统计未生效", detail: "百炼白名单参数 include_chunk_usage 要求每个流式分片都携带 usage；实际有分片未带 usage，说明白名单未生效或参数被忽略，仅最终分片带用量。" },
  min_sse_chunks: { title: "流式分片数太少", detail: "流式应逐段推送多个分片；分片过少可能是「伪流式」（一次性返回全部内容）。" },
  min_content_chunks: { title: "没有正文输出", detail: "整个流式响应没有出现任何正文内容分片——可能被思考过程占满预算，或输出被截断。" },
  finish_reason: { title: "结束原因不符", detail: "finish_reason 表示回答为何结束：stop=正常说完、length=被长度上限截断、tool_calls=转去调用工具。实际值与预期不符。" },
  assistant_content_non_empty: { title: "回答内容为空", detail: "模型没有返回任何正文文本。" },
  content_should_parse_as_json: { title: "JSON 输出不合法", detail: "已通过 response_format 要求输出 JSON，但返回内容无法按 JSON 解析。" },
  assistant_content_starts_with: { title: "输出开头不符合预期", detail: "校验回答是否按要求的固定开头输出。" },
  thinking_required: { title: "缺少思考过程", detail: "开启思考模式后应返回 reasoning_content（思考过程），实际没有出现。" },
  thinking_evidence_required: { title: "无思考痕迹", detail: "响应里既没有思考内容、也没有思考 token 计数，疑似思考模式未生效。" },
  max_tokens: { title: "输出长度限制未生效", detail: "实际输出 token 数超过了请求设定的上限——该渠道没有执行这个限制参数。" },
  max_completion_tokens: { title: "输出长度限制未生效", detail: "实际输出 token 数超过了请求设定的上限——该渠道没有执行这个限制参数。" },
  completion_tokens_max: { title: "输出长度超限", detail: "实际输出 token 数超过了设定上限。" },
  parameter_acceptance: { title: "长度参数接受性", detail: "验证输出上限参数是否被接受并实际生效。" },
  n: { title: "多回答数量不符", detail: "请求了 n 条候选回答，实际返回的数量不一致。" },
  stop_sequence: { title: "停止词未生效", detail: "输出越过了设定的停止词继续生成，说明 stop 参数没有被执行。" },
  cancel: { title: "已取消", detail: "该 case 的请求被中途取消。" }
};

function assertionExplanation(name) {
  return ASSERTION_EXPLANATIONS[String(name || "")] || null;
}

function assertionDisplayTitle(name) {
  return assertionExplanation(name)?.title || String(name || "");
}

function renderAssertionList(assertions = [], { variant = "all" } = {}) {
  if (!assertions.length) return "";
  return `
    <div class="assertion-list assertion-list--${variant}">
      ${assertions.map((assertion) => {
    const explanation = assertionExplanation(assertion.name);
    const title = explanation ? explanation.title : assertion.name;
    const anchored = !assertion.pass && (ASSERTION_RESPONSE_ANCHORS[assertion.name] || []).length > 0;
    return `
        <span class="assertion-item ${assertion.pass ? "pass" : "fail"}">
          <strong>${assertion.pass ? "✓" : "✗"} ${escapeHtml(title)}${explanation ? ` <code class="assertion-item__code">${escapeHtml(assertion.name)}</code>` : ""}</strong>
          <span>${escapeHtml(assertion.message || (assertion.pass ? "通过" : "未通过"))}</span>
          ${!assertion.pass && explanation?.detail ? `<span class="assertion-item__why">${escapeHtml(explanation.detail)}</span>` : ""}
          ${anchored ? `<span class="assertion-item__hint">相关位置已在「原始响应」中标红</span>` : ""}
        </span>`;
  }).join("")}
    </div>`;
}

function hcaseResponseTabGroupId(result = {}, channelLabel = "") {
  const base = String(result.result_uid || result.case_id || "case");
  const channel = String(result.channel_id || result.channel_name || channelLabel || "channel");
  return `${base}-${channel}`.replace(/[^a-zA-Z0-9_-]/g, "_");
}


// ---------------------------------------------------------------------------
// 原始响应智能展示：失败断言 → 响应 JSON 关键键的锚定表。
// 有失败断言时，把相关键在原始报文里标红；无异常分片默认折叠。
const ASSERTION_RESPONSE_ANCHORS = {
  usage_required_fields: ["usage"],
  "stream_options.include_usage": ["usage"],
  stream_usage_in_sse: ["usage"],
  stream_usage_chunk_shape: ["usage", "finish_reason"],
  stream_usage_per_chunk: ["usage"],
  min_content_chunks: ["content", "reasoning_content"],
  finish_reason: ["finish_reason"],
  choice_required_fields: ["choices"],
  required_chunk_fields: ["choices"],
  required_response_fields: ["usage", "choices"],
  messages_required_response_fields: ["content", "role"],
  content_should_parse_as_json: ["content"],
  assistant_content_non_empty: ["content"],
  assistant_content_starts_with: ["content"],
  thinking_required: ["reasoning_content", "thinking"],
  thinking_evidence_required: ["reasoning_content", "reasoning_tokens"],
  completion_tokens_max: ["completion_tokens"],
  max_tokens: ["completion_tokens"],
  max_completion_tokens: ["completion_tokens"],
  n: ["choices"],
  parameter_acceptance: ["completion_tokens"],
  http_status: ["error"]
};

function responseHighlightKeys(failedAssertions = []) {
  const keys = new Set();
  for (const assertion of failedAssertions) {
    const mapped = ASSERTION_RESPONSE_ANCHORS[assertion.name];
    if (mapped) mapped.forEach((key) => keys.add(key));
  }
  if (failedAssertions.length) keys.add("error");
  return [...keys];
}

// 在 escapeHtml 之后的文本里高亮 JSON 键（escapeHtml 会把 " 转成 &quot;）。
// 键值为 null 时连同 :null 一起标红——「该有值却是 null」正是缺字段类失败的病灶。
function highlightRawKeys(escapedText, keys = []) {
  let out = escapedText;
  for (const key of keys) {
    out = out.replace(
      new RegExp(`&quot;${key}&quot;(\\s*:\\s*null)?`, "g"),
      (match) => `<span class="hl">${match}</span>`
    );
  }
  return out;
}

function looksLikeSseText(text) {
  return /^data:\s/m.test(String(text || ""));
}

// 复跑（偶发/必现）徽标：result 或 matrix summary 均可传入
function renderReproVerdictBadge(source) {
  if (!source) return "";
  const verdict = source.repro_verdict || "";
  if (!verdict) return "";
  const total = Array.isArray(source.attempts) ? source.attempts.length : Number(source.attempts_total || 0);
  const failed = Number(source.attempts_failed || 0);
  if (verdict === "consistent") {
    return `<span class="badge-sm no" title="失败后自动复跑，${total} 次全部失败——问题稳定复现，属渠道侧问题">必现 ${failed}/${total}</span>`;
  }
  if (verdict === "flaky_recovered") {
    return `<span class="badge-sm flaky" title="首跑失败、自动复跑后通过——多为网络或服务端瞬时抖动，非稳定问题">偶发 · 复跑通过</span>`;
  }
  return "";
}

function renderCaseAttemptsBlock(result) {
  const attempts = Array.isArray(result?.attempts) ? result.attempts : [];
  if (!attempts.length) return "";
  const verdictLabel = result.repro_verdict === "consistent"
    ? "每次都失败（必现）"
    : result.repro_verdict === "flaky_recovered"
      ? "复跑后通过（偶发，疑似瞬时抖动）"
      : "复跑记录";
  return `
    <div class="pt">自动复跑记录 · ${escapeHtml(verdictLabel)}</div>
    <ul class="case-attempts">
      ${attempts.map((attempt) => {
    const failedNames = (attempt.failed_assertions || []).join("、");
    const outcome = attempt.error
      ? `请求失败：${attempt.error}`
      : failedNames
        ? `未通过断言：${failedNames}`
        : "通过";
    const ok = !attempt.error && !(attempt.failed_assertions || []).length;
    return `<li class="case-attempts__item ${ok ? "is-pass" : "is-fail"}">第 ${attempt.attempt} 次 · HTTP ${escapeHtml(attempt.http_status || "—")} · ${escapeHtml(attempt.latency_ms ? `${attempt.latency_ms}ms` : "—")} · ${escapeHtml(outcome)}</li>`;
  }).join("")}
    </ul>`;
}

let rawResponseBlockSeq = 0;

// SSE 原文智能视图：问题分片标红、无异常分片默认折叠、可展开全部。
function renderRawSseBlock(rawResponse, failedAssertions = []) {
  const raw = String(rawResponse || "");
  const keys = responseHighlightKeys(failedAssertions);
  const events = raw.split(/\n{2,}/).map((chunk) => chunk.trim()).filter(Boolean);
  const hasFailures = failedAssertions.length > 0;

  // 第一遍：键值非 null 才算命中（流式 chunk 里通篇存在的 "usage":null 不算）
  const keyHitPatterns = keys.map((key) => new RegExp(`"${key}"\\s*:\\s*(?!null[,}\\s])`));
  const problemFlags = events.map((eventText) => {
    if (!hasFailures) return false;
    return keyHitPatterns.some((pattern) => pattern.test(eventText));
  });
  let problemCount = problemFlags.filter(Boolean).length;

  // 第二遍（缺字段模式）：失败断言存在但没有任何分片携带非 null 值——
  // 问题恰恰是「该字段从未有值」。标红最后一个含该键（哪怕是 null）的数据分片；
  // 键完全没出现时标红最后一个数据分片（按 OpenAI 规范该处应携带数据）。
  let missingFieldMode = false;
  if (hasFailures && keys.length && problemCount === 0) {
    const nullKeyPatterns = keys.map((key) => new RegExp(`"${key}"`));
    let anchorIndex = -1;
    for (let i = events.length - 1; i >= 0; i -= 1) {
      if (events[i].includes("[DONE]")) continue;
      if (nullKeyPatterns.some((pattern) => pattern.test(events[i]))) { anchorIndex = i; break; }
    }
    if (anchorIndex === -1) {
      for (let i = events.length - 1; i >= 0; i -= 1) {
        if (!events[i].includes("[DONE]")) { anchorIndex = i; break; }
      }
    }
    if (anchorIndex >= 0) {
      problemFlags[anchorIndex] = true;
      problemCount = 1;
      missingFieldMode = true;
    }
  }

  // 多数分片都命中（如思考内容持续输出）时退化为首尾预览，避免"全部标红"失去意义
  const degenerate = problemCount > 0 && problemCount / events.length > 0.5;

  const renderEvent = (eventText, isProblem) => {
    // 退化模式下不整块标红，但仍高亮标记键，方便肉眼定位
    const highlightKeys = isProblem || (degenerate && hasFailures) ? keys : [];
    const inner = highlightRawKeys(escapeHtml(eventText), highlightKeys);
    return `<span class="raw-chunk${isProblem ? " raw-chunk--problem" : ""}">${inner}</span>`;
  };

  const fullView = events.map((eventText, index) => renderEvent(eventText, !degenerate && problemFlags[index])).join("\n");

  // 摘要视图：首分片 + 问题分片 + 末两个分片（usage / [DONE] 通常在末尾），其余折叠
  const keepIndexes = new Set();
  if (events.length) keepIndexes.add(0);
  if (events.length > 1) keepIndexes.add(events.length - 1);
  if (events.length > 2) keepIndexes.add(events.length - 2);
  if (!degenerate) problemFlags.forEach((flag, index) => { if (flag) keepIndexes.add(index); });
  else { if (events.length > 3) { keepIndexes.add(1); keepIndexes.add(2); } }

  const summaryParts = [];
  let hiddenRun = 0;
  const flushHidden = () => {
    if (hiddenRun > 0) {
      summaryParts.push(`<span class="raw-chunk raw-chunk--gap">⋯ 已折叠 ${hiddenRun} 个无标记分片（点「展开全部」查看）⋯</span>`);
      hiddenRun = 0;
    }
  };
  events.forEach((eventText, index) => {
    if (keepIndexes.has(index)) {
      flushHidden();
      summaryParts.push(renderEvent(eventText, !degenerate && problemFlags[index]));
    } else {
      hiddenRun += 1;
    }
  });
  flushHidden();
  const summaryView = summaryParts.join("\n");

  const collapsedByDefault = events.length > keepIndexes.size;
  const blockId = `raw-block-${rawResponseBlockSeq += 1}`;
  const statLabel = degenerate
    ? `共 ${events.length} 个分片 · 多数分片命中标记键（${keys.join("、")}），仅显示首尾预览`
    : missingFieldMode
      ? `共 ${events.length} 个分片 · 「${keys.join("、")}」字段缺失或始终为 null——已标红本应携带该数据的分片`
      : problemCount > 0
        ? `共 ${events.length} 个分片 · ${problemCount} 个分片有标记（已标红并展开）`
        : hasFailures
          ? `共 ${events.length} 个分片 · 失败断言未定位到具体分片，展示首尾预览`
          : `共 ${events.length} 个分片 · 无异常标记，默认折叠`;

  if (!collapsedByDefault) {
    return `<div class="raw-response" data-raw-block="${blockId}">
      <div class="raw-response__bar"><span class="muted fs-xs">${escapeHtml(statLabel)}</span></div>
      <pre class="code-block raw-response__body">${fullView}</pre>
    </div>`;
  }
  return `<div class="raw-response" data-raw-block="${blockId}">
    <div class="raw-response__bar">
      <span class="muted fs-xs">${escapeHtml(statLabel)}</span>
      <span class="grow"></span>
      <button type="button" class="raw-response__toggle" data-raw-toggle data-label-expand="展开全部" data-label-collapse="收起">展开全部</button>
    </div>
    <pre class="code-block raw-response__body" data-raw-view="summary">${summaryView}</pre>
    <pre class="code-block raw-response__body is-hidden" data-raw-view="full">${fullView}</pre>
  </div>`;
}

// 非 SSE 的长文本/JSON：超长默认截断显示，可展开全部
function renderClampedCodeBlock(html, lineCount) {
  if (lineCount <= 40) return `<pre class="code-block">${html}</pre>`;
  return `<div class="raw-response" data-raw-block="raw-block-${rawResponseBlockSeq += 1}">
    <div class="raw-response__bar">
      <span class="muted fs-xs">共 ${lineCount} 行 · 默认折叠</span>
      <span class="grow"></span>
      <button type="button" class="raw-response__toggle" data-raw-toggle data-label-expand="展开全部" data-label-collapse="收起">展开全部</button>
    </div>
    <pre class="code-block raw-response__body raw-response__body--clamped" data-raw-clamp>${html}</pre>
  </div>`;
}

function renderJsonResponseBlock(value, failedAssertions = []) {
  const keys = responseHighlightKeys(failedAssertions);
  const escaped = highlightRawKeys(escapeHtml(JSON.stringify(value, null, 2)), keys);
  const lineCount = escaped.split("\n").length;
  return renderClampedCodeBlock(escaped, lineCount);
}

function renderPlainRawBlock(rawResponse, failedAssertions = []) {
  const keys = responseHighlightKeys(failedAssertions);
  const escaped = highlightRawKeys(escapeHtml(String(rawResponse || "")), keys);
  const lineCount = escaped.split("\n").length;
  return renderClampedCodeBlock(escaped, lineCount);
}

function renderHcaseResponseTabs({ tabGroupId, responseBody, rawResponse, responseHeaders, failedAssertions = [] }) {
  const tabs = [];
  let parsedContent;
  let parsedLabel = "原始响应";
  if (responseBody !== null) {
    parsedLabel = "响应内容";
    parsedContent = renderJsonResponseBlock(responseBody, failedAssertions);
  } else if (rawResponse) {
    parsedContent = looksLikeSseText(rawResponse)
      ? renderRawSseBlock(rawResponse, failedAssertions)
      : renderPlainRawBlock(rawResponse, failedAssertions);
  } else {
    parsedContent = `<pre class="code-block">null</pre>`;
  }

  tabs.push({ id: "parsed", label: parsedLabel, content: parsedContent });

  if (rawResponse && responseBody !== null) {
    tabs.push({
      id: "raw",
      label: "原始报文",
      content: looksLikeSseText(rawResponse)
        ? renderRawSseBlock(rawResponse, failedAssertions)
        : renderPlainRawBlock(rawResponse, failedAssertions)
    });
  }

  if (responseHeaders) {
    tabs.push({
      id: "headers",
      label: "响应 HEADERS",
      content: `<pre class="code-block">${syntaxJson(responseHeaders)}</pre>`
    });
  }

  if (tabs.length === 1) return tabs[0].content;

  return `
    <div class="hcase-response-tabs" data-hcase-response-group="${escapeHtml(tabGroupId)}">
      <div class="hcase-response-tabs__nav tabs" role="tablist">
        ${tabs.map((tab, index) => `
          <button
            type="button"
            class="${index === 0 ? "on" : ""}"
            role="tab"
            aria-selected="${index === 0 ? "true" : "false"}"
            data-hcase-response-tab="${escapeHtml(tab.id)}"
          >${escapeHtml(tab.label)}</button>
        `).join("")}
      </div>
      <div class="hcase-response-tabs__panels">
        ${tabs.map((tab, index) => `
          <div
            class="hcase-response-tabs__panel${index === 0 ? "" : " is-hidden"}"
            role="tabpanel"
            data-hcase-response-panel="${escapeHtml(tab.id)}"
          >${tab.content}</div>
        `).join("")}
      </div>
    </div>`;
}

function renderHistoryRawCase(result, record, options = {}) {
  const meta = conclusionMeta(result);
  const healthy = matchesExpectedForReport(result);
  const channelLabel = options.channelLabel || resultChannelLabel(result, record);
  const matrixContext = Boolean(options.matrixContext);
  const defaultOpen = options.defaultOpen ?? !healthy;
  const responseBody = hasResponseBody(result) ? result.response_body : null;
  const rawResponse = result.raw_response || "";
  const sourceCase = result.source_case || null;
  const assertions = result.assertions || [];
  const failedAssertions = assertions.filter((assertion) => !assertion.pass);
  const passedAssertions = assertions.filter((assertion) => assertion.pass);
  const requestBody = result.request_body || sourceCase?.payload || null;
  const requestHeaders = result.request_headers || sourceCase?.headers || null;
  const responseHeaders = result.response_headers || null;
  const responseTabs = renderHcaseResponseTabs({
    tabGroupId: hcaseResponseTabGroupId(result, channelLabel),
    responseBody,
    rawResponse,
    responseHeaders,
    failedAssertions
  });
  const failedSummary = failedAssertions.length
    ? failedAssertions.map((assertion) => assertionDisplayTitle(assertion.name)).join(" · ")
    : "";
  return `
    <details class="hcase ${healthy ? "hcase--pass" : "hcase--fail"}"${defaultOpen ? " open" : ""}>
      <summary>
        <span class="hcase-channel">${escapeHtml(channelLabel)}</span>
        ${matrixContext ? "" : `<span class="cid">${escapeHtml(resultTitle(result))}</span>`}
        <span class="badge-sm ${healthy ? "ok" : "no"}">${escapeHtml(healthy ? "达标" : "未达标")}</span>
        ${renderReproVerdictBadge(result)}
        <span class="muted fs-xs">${escapeHtml(meta.label)}${failedSummary ? ` · ${escapeHtml(failedSummary)}` : ""}</span>
        <span class="grow"></span>
        <span class="mono fs-xs subtle">HTTP ${escapeHtml(result.http_status || meta.httpStatus || "—")} · ${escapeHtml(result.latency_ms ? `${result.latency_ms}ms` : "—")}</span>
      </summary>
      <div class="panes">
        <section class="pane">
          <div class="pt">检查结论</div>
          ${failedAssertions.length
    ? renderAssertionList(failedAssertions, { variant: "failed" })
    : assertions.length
      ? `<p class="muted fs-xs hcase-all-passed">全部检查项通过</p>`
      : `<pre class="code-block">[]</pre>`}
          ${result.message || result.error ? `
            <div class="pt">运行消息</div>
            <pre class="code-block">${escapeHtml(result.message || result.error)}</pre>
          ` : ""}
          ${renderCaseAttemptsBlock(result)}
          ${passedAssertions.length ? `
            <details class="hcase-passed-assertions">
              <summary class="muted fs-xs">已通过 ${passedAssertions.length} 项检查（点开查看）</summary>
              ${renderAssertionList(passedAssertions, { variant: "passed" })}
            </details>
          ` : ""}
        </section>
        <section class="pane pane--response">
          ${responseTabs}
        </section>
        <section class="pane">
          <details class="hcase-request-details"${failedAssertions.length ? "" : ""}>
            <summary class="muted fs-xs">请求与预期（技术详情，点开查看）</summary>
            <div class="pt">请求 Body</div>
            <pre class="code-block">${syntaxJson(requestBody)}</pre>
            ${requestHeaders ? `
              <div class="pt">请求 Headers</div>
              <pre class="code-block">${syntaxJson(requestHeaders)}</pre>
            ` : ""}
            ${sourceCase?.expect ? `
              <div class="pt">预期断言</div>
              <pre class="code-block">${syntaxJson(sourceCase.expect)}</pre>
            ` : ""}
          </details>
          ${renderStreamMetricsBlock(result)}
        </section>
      </div>
    </details>
  `;
}

function renderHistory() {
  const items = readHistory();
  normalizeHistoryFilters(items);
  const visibleItems = filteredHistoryItems(items);
  if (!state.lastReportRecord && items.length) {
    state.lastReportRecord = items[0];
    renderFeishuReport(items[0]);
  }
  if (state.expandedHistoryId && !visibleItems.some((record) => record.id === state.expandedHistoryId)) {
    state.expandedHistoryId = null;
  }
  els.historyCount.textContent = visibleItems.length === items.length ? `${items.length} 条` : `${visibleItems.length} / ${items.length} 条`;
  els.clearHistory.disabled = items.length === 0;
  renderBaselineSelector();
  renderHistorySummary(visibleItems);
  renderHistoryFilters(items, visibleItems);
  if (!items.length) {
    els.historyList.innerHTML = `
      <div class="empty-state">
        <strong>暂无历史报告</strong>
        <span>测试完成后会自动保存在这里。</span>
      </div>
    `;
    return;
  }
  if (!visibleItems.length) {
    els.historyList.innerHTML = `
      <div class="empty-state">
        <strong>当前筛选没有报告</strong>
        <span>切换渠道、模型或接口类型筛选后再查看。</span>
      </div>
    `;
    return;
  }

  els.historyList.innerHTML = `
    <div class="htable-wrap">
      <table class="htable">
        <colgroup>
          <col class="history-col-id" />
          <col class="history-col-provider" />
          <col class="history-col-endpoint" />
          <col class="history-col-cases" />
          <col class="history-col-expected" />
          <col class="history-col-behavior" />
          <col class="history-col-diffs" />
          <col class="history-col-created" />
          <col class="history-col-actions" />
        </colgroup>
        <thead>
          <tr>
            <th>报告编号</th>
            <th>渠道与模型</th>
            <th>接口类型</th>
            <th>用例数</th>
            <th>达标情况</th>
            <th>行为 <span style="text-transform:none;font-weight:400">未证明/拒绝/失败</span></th>
            <th>结构差异</th>
            <th>生成时间</th>
            <th style="text-align:right">操作</th>
          </tr>
        </thead>
        <tbody>
          ${visibleItems.map((record) => {
            const derivedStats = historyStats(record.results || []);
            const stats = { ...derivedStats, ...(record.stats || {}) };
            const isOpen = state.expandedHistoryId === record.id;
            return `
              <tr class="hrow ${isOpen ? "open" : ""}" data-history-id="${escapeHtml(record.id)}">
                <td class="rep-id">${escapeHtml(record.id.replace(/^report_/, "run/"))}</td>
                <td>
                  <div class="hprovider">
                    <strong>${escapeHtml(record.channel_name)}</strong>
                    <span class="meta">${escapeHtml(record.model || "—")}</span>
                    <span class="meta">可对比响应：${stats.baselineReady || 0} 个 / 共 ${stats.total || 0} 个</span>
                    ${record.baseline_label ? `<span class="meta">baseline：${escapeHtml(record.baseline_label)}</span>` : ""}
                  </div>
                </td>
                <td class="mono">${escapeHtml(record.endpoint_label || record.endpoint_id || "Chat Completions")}</td>
                <td>${stats.total || 0} 个</td>
                <td>
                  <span class="hpill">${escapeHtml(historyPassSummaryText(stats))}</span>
                </td>
                <td>
                  <span class="hpill ${stats.unexpected ? "warn" : "neutral"}">
                    ${escapeHtml(historyIssueSummaryText(stats))}
                  </span>
                </td>
                <td>${escapeHtml(historyDiffSummaryText(stats))}</td>
                <td class="mono">${escapeHtml(formatDateTime(record.generated_at))}</td>
                <td>
                  <div class="hactions">
                    ${renderHiconButton({
    icon: "chevron-down",
    isOpen,
    title: "查看明细",
    ariaLabel: "查看明细",
    dataAttrs: {
      "data-history-action": "toggle",
      "data-history-id": record.id
    }
  })}
                    ${renderHiconButton({
    icon: "copy",
    title: "复制 Markdown",
    ariaLabel: "复制 Markdown",
    dataAttrs: {
      "data-history-action": "copy",
      "data-history-id": record.id
    }
  })}
                    ${renderHiconButton({
    icon: "external-link",
    title: "写入飞书文档",
    ariaLabel: "写入飞书文档",
    dataAttrs: {
      "data-history-action": "feishu",
      "data-history-id": record.id
    }
  })}
                    ${renderHiconButton({
    icon: "trash-2",
    extraClass: "danger",
    title: "删除报告",
    ariaLabel: "删除报告",
    dataAttrs: {
      "data-history-action": "delete",
      "data-history-id": record.id
    }
  })}
                  </div>
                </td>
              </tr>
              ${state.expandedHistoryId === record.id ? renderHistoryDetailRow(record, stats) : ""}
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function readChannelReports() {
  try {
    const parsed = JSON.parse(readStorageItem(CHANNEL_REPORTS_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeReportList(storageKey, items, compactFn = (item) => item) {
  const deduped = [];
  const seen = new Set();
  for (const item of items) {
    if (!item?.id || seen.has(item.id)) continue;
    seen.add(item.id);
    deduped.push(item);
  }
  const candidates = deduped.slice(0, MAX_HISTORY_ITEMS);
  const attempts = [
    { items: candidates, compacted: false },
    { items: candidates.map(compactFn), compacted: true },
    { items: candidates.slice(0, 60).map(compactFn), compacted: true },
    { items: candidates.slice(0, 30).map(compactFn), compacted: true },
    { items: candidates.slice(0, 10).map(compactFn), compacted: true },
    { items: candidates.slice(0, 1).map(compactFn), compacted: true }
  ];

  let lastError = null;
  for (const attempt of attempts) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(attempt.items));
      return {
        saved: true,
        compacted: attempt.compacted,
        savedCount: attempt.items.length,
        droppedCount: Math.max(0, candidates.length - attempt.items.length)
      };
    } catch (error) {
      lastError = error;
    }
  }
  return {
    saved: false,
    compacted: true,
    savedCount: 0,
    droppedCount: candidates.length,
    error: lastError
  };
}

function writeChannelReports(items) {
  return writeReportList(CHANNEL_REPORTS_STORAGE_KEY, items, compactHistoryRecord);
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

function inferChannelsFromResults(results = []) {
  const channels = [];
  const seen = new Set();
  for (const result of results) {
    const key = result.channel_route_key || `${result.channel_name}:${result.is_baseline ? "baseline" : "target"}`;
    if (seen.has(key)) continue;
    seen.add(key);
    channels.push({
      key,
      platformName: result.channel_name || key,
      protocolLabel: result.endpoint_label || "",
      apiModelId: result.model || "",
      role: result.is_baseline ? "baseline" : "target"
    });
  }
  return channels.sort((left, right) => {
    if (left.role === right.role) return left.platformName.localeCompare(right.platformName);
    return left.role === "baseline" ? -1 : 1;
  });
}

function summarizeResultForMatrix(result) {
  const intent = resultReportIntent(result);
  const healthy = matchesExpectedForReport(result);
  const meta = conclusionMeta(result);
  const observeStatus = intent === "observe"
    ? (CHANNEL_REPORT_INTENT.observeReportStatus?.(result, channelReportIntentDeps()) || (healthy ? "recorded" : "observe_issue"))
    : "";
  const failedAssertionSummary = CHANNEL_REPORT_INTENT.failedAssertionNames?.(result, 3).join(" · ") || "";
  return {
    channel_route_key: result.channel_route_key || "",
    channel_name: result.channel_name || "",
    is_baseline: Boolean(result.is_baseline),
    support_conclusion: result.support_conclusion || "",
    support_label: meta.label,
    http_status: result.http_status || meta.httpStatus || 0,
    matches_expected: healthy,
    intent,
    report_status: intent === "observe"
      ? observeStatus
      : (healthy ? "pass" : "fail"),
    failed_assertion_summary: failedAssertionSummary,
    diff_count: Number(result.diff_count || 0),
    cache_hit_summary: result.cache_hit_summary || "",
    latency_ms: result.latency_ms || 0,
    result_uid: result.result_uid || "",
    repro_verdict: result.repro_verdict || "",
    attempts_total: Array.isArray(result.attempts) ? result.attempts.length : 0,
    attempts_failed: Number(result.attempts_failed || 0)
  };
}

function buildChannelReportMatrix(results = [], channels = [], selection = []) {
  const caseOrder = [];
  const caseMeta = new Map();

  for (const entry of selection) {
    for (const caseId of entry.case_ids) {
      if (caseMeta.has(caseId)) continue;
      caseMeta.set(caseId, {
        case_id: caseId,
        group_key: entry.group_key,
        group_title: entry.group_title
      });
      caseOrder.push(caseId);
    }
  }

  for (const result of results) {
    if (caseMeta.has(result.case_id)) continue;
    const groupKey = result.case_group_key
      || CHANNEL_REPORT_INTENT.inferGroupKey?.(result.source_case || { case_id: result.case_id, category: result.category })
      || "";
    caseMeta.set(result.case_id, {
      case_id: result.case_id,
      group_key: groupKey,
      group_title: result.case_group_title || RUN_V02_GROUP_TITLES[groupKey] || groupKey
    });
    caseOrder.push(result.case_id);
  }

  const byCaseChannel = new Map();
  for (const result of results) {
    const channelKey = result.channel_route_key || `${result.channel_name}:${result.is_baseline ? "baseline" : "target"}`;
    if (!byCaseChannel.has(result.case_id)) byCaseChannel.set(result.case_id, new Map());
    byCaseChannel.get(result.case_id).set(channelKey, result);
  }

  return caseOrder.map((caseId) => {
    const meta = caseMeta.get(caseId);
    const channelResults = byCaseChannel.get(caseId) || new Map();
    const sample = channelResults.values().next().value || {};
    const sourceCase = sample.source_case || { case_id: caseId, category: sample.category };
    const intent = CHANNEL_REPORT_INTENT.caseEvaluationIntent?.(sourceCase, meta.group_key) || "assert";
    const by_channel = {};
    let title = sample.title || caseTitle(sourceCase) || caseId;

    for (const channel of channels) {
      const result = channelResults.get(channel.key)
        || [...channelResults.values()].find((item) => (
          item.channel_name === channel.platformName
          && Boolean(item.is_baseline) === (channel.role === "baseline")
        ));
      if (result) {
        by_channel[channel.key] = summarizeResultForMatrix(result);
        title = result.title || title;
      }
    }

    return {
      case_id: caseId,
      title,
      group_key: meta.group_key,
      group_title: meta.group_title || RUN_V02_GROUP_TITLES[meta.group_key] || meta.group_key,
      intent,
      parameters: sample.parameters || sourceCase.parameters || [],
      by_channel
    };
  });
}

function ensureChannelReportMatrix(record) {
  const channels = record.channels?.length ? record.channels : inferChannelsFromResults(record.results || []);
  const selection = record.selection?.length
    ? record.selection
    : groupReportResults(record.results || []).map((group) => ({
      group_key: group.key,
      group_title: group.title,
      case_ids: group.results.map((result) => result.case_id)
    }));
  const stored = Array.isArray(record?.case_matrix) ? record.case_matrix : [];
  if (stored.length) {
    const hasCells = stored.some((row) => row.by_channel && Object.keys(row.by_channel).length > 0);
    if (hasCells) return stored;
  }
  return buildChannelReportMatrix(record.results || [], channels, selection);
}

function ensureChannelReportChannels(record) {
  if (Array.isArray(record?.channels) && record.channels.length) return record.channels;
  if (record.baseline || record.targets?.length) {
    return channelRouteDescriptors(record.baseline, record.targets || []);
  }
  return inferChannelsFromResults(record.results || []);
}

function createChannelReportRecord(sourceResults = state.runV02.completedResults) {
  const results = sourceResults.map((rawResult) => canonicalResultFromRaw(enrichResultAxes(rawResult)));
  const baseline = state.runV02.baselineRoute;
  const targets = runV02TargetRoutes();
  const selection = runV02SelectionSnapshot();
  const channels = channelRouteDescriptors(baseline, targets);
  const stats = channelReportStatsForResults(results);
  const case_matrix = buildChannelReportMatrix(results, channels, selection);
  const evaluation = CHANNEL_REPORT_INTENT.channelReportEvaluationSummary?.(
    case_matrix,
    channels,
    stats,
    channelReportIntentDeps()
  ) || null;
  const groupTitles = selection.map((entry) => entry.group_title).join(" · ");
  return {
    id: `channel_report_${Date.now()}`,
    generated_at: new Date().toISOString(),
    tool: "v0.2",
    report_version: 2,
    protocol_id: runV02ActiveProtocolId() || baseline?.protocolId || "",
    model_id: state.runV02.modelId,
    model: state.runV02.modelId,
    case_group_key: selection.length === 1 ? selection[0].group_key : "multi",
    case_group_title: groupTitles || "",
    baseline_label: baseline ? `${baseline.platformName} / ${baseline.protocolLabel}` : "",
    target_labels: targets.map((route) => `${route.platformName} / ${route.protocolLabel}`),
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
    selection,
    channels,
    stats,
    evaluation,
    case_matrix,
    results
  };
}

function saveChannelReportRecord(sourceResults = state.runV02.completedResults) {
  if (!sourceResults.length) return null;
  const record = createChannelReportRecord(sourceResults);
  const writeResult = writeChannelReports([record, ...readChannelReports()]);
  if (state.activeView === "channel-reports") renderChannelReports();
  if (!writeResult.saved) {
    showToast("本次渠道测评结果已展示，但报告写入失败：浏览器本地存储空间不足。");
  } else if (writeResult.compacted || writeResult.droppedCount > 0) {
    showToast(writeResult.droppedCount > 0
      ? `渠道参数测评报告已保存；本地空间不足，已保留最近 ${writeResult.savedCount} 条。`
      : "渠道参数测评报告已保存；较大的响应内容已压缩。");
  }
  return record;
}

function renderChannelReportRunPanel() {
  const running = state.runV02.isRunning;
  if (els.channelReportRunPanel) {
    els.channelReportRunPanel.classList.toggle("is-hidden", !running);
  }
  if (!running) return;
  const progress = state.runV02.runProgress || { count: 0, total: 0, label: "准备中" };
  if (els.runV02ProgressCount) {
    els.runV02ProgressCount.textContent = `${progress.count} / ${progress.total}`;
  }
  if (els.runV02ProgressCase) {
    els.runV02ProgressCase.textContent = progress.label || "准备中";
  }
  if (els.runV02ProgressBar) {
    const pct = progress.total ? Math.round((progress.count / progress.total) * 100) : 0;
    els.runV02ProgressBar.style.width = `${pct}%`;
  }
  if (els.channelReportRunMeta && state.runV02.runMeta) {
    const meta = state.runV02.runMeta;
    els.channelReportRunMeta.textContent = [
      meta.modelId,
      meta.baseline,
      `测评 ${meta.targetCount} 个渠道`,
      `${meta.groupCount} 组 · ${meta.caseCount} case`
    ].filter(Boolean).join(" · ");
  }
}

function renderChannelReportMatrixCell(summary, intent) {
  if (!summary) return `<span class="channel-matrix-cell channel-matrix-cell--empty">—</span>`;
  const conclusion = escapeHtml(summary.support_label || summary.support_conclusion || "—");
  const http = summary.http_status || "—";
  const assertionHint = summary.failed_assertion_summary
    ? escapeHtml(summary.failed_assertion_summary)
    : "";
  if (intent === "observe") {
    let tone = "observe";
    let label = "已记录";
    if (summary.report_status === "observe_issue") {
      tone = "issue";
      label = "请求异常";
    } else if (summary.report_status === "observe_assert_fail") {
      tone = "observe-fail";
      label = "断言异常";
    }
    const metaParts = [conclusion];
    if (assertionHint && summary.report_status === "observe_assert_fail") {
      metaParts.push(assertionHint);
    }
    metaParts.push(`HTTP ${http}`);
    const extra = summary.cache_hit_summary ? `<span class="channel-matrix-cell__extra">${escapeHtml(summary.cache_hit_summary)}</span>` : "";
    return `
      <div class="channel-matrix-cell channel-matrix-cell--${tone}">
        <span class="channel-matrix-badge channel-matrix-badge--${tone}">${label}</span>${renderReproVerdictBadge(summary)}
        <span class="channel-matrix-cell__meta">${metaParts.join(" · ")}</span>
        ${extra}
      </div>`;
  }
  const tone = summary.report_status === "pass" ? "pass" : "fail";
  const label = tone === "pass" ? "达标" : "未达标";
  return `
    <div class="channel-matrix-cell channel-matrix-cell--${tone}">
      <span class="channel-matrix-badge channel-matrix-badge--${tone}">${label}</span>${renderReproVerdictBadge(summary)}
      <span class="channel-matrix-cell__meta">${conclusion} · HTTP ${http}</span>
    </div>`;
}

function renderChannelReportMatrixSection(record, groupKey, rows, channels) {
  if (!rows.length) return "";
  const assertCount = rows.filter((row) => row.intent === "assert").length;
  const observeCount = rows.filter((row) => row.intent === "observe").length;
  const intentText = assertCount && observeCount
    ? `断言型 ${assertCount} · 观测型 ${observeCount}`
    : `${CHANNEL_REPORT_INTENT.intentLabel?.(assertCount ? "assert" : "observe") || (observeCount ? "观测型" : "断言型")} · ${rows.length} 项`;
  const baselineChannel = channels.find((channel) => channel.role === "baseline");
  const targetChannels = channels.filter((channel) => channel.role !== "baseline");
  return `
    <section class="channel-report-matrix-section">
      <header class="channel-report-matrix-section__head">
        <div>
          <strong>${escapeHtml(rows[0].group_title || RUN_V02_GROUP_TITLES[groupKey] || groupKey)}</strong>
          <span class="muted fs-xs">${escapeHtml(intentText)} · ${rows.length} 项</span>
        </div>
      </header>
      <div class="table-wrap">
        <table class="rtable channel-report-matrix">
          <thead>
            <tr>
              <th>Case</th>
              <th>严重度</th>
              <th>类型</th>
              ${baselineChannel ? `<th>${escapeHtml(baselineChannel.platformName)}<span class="muted fs-xs"> Baseline</span></th>` : ""}
              ${targetChannels.map((channel) => `<th>${escapeHtml(channel.platformName)}</th>`).join("")}
              <th>结构差异</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((row) => {
              const resultsByChannel = new Map((record.results || []).filter((result) => result.case_id === row.case_id).map((result) => [
                result.channel_route_key || `${result.channel_name}:${result.is_baseline ? "baseline" : "target"}`,
                result
              ]));
              const diffParts = targetChannels.map((channel) => {
                const summary = row.by_channel?.[channel.key];
                if (!summary || summary.diff_count <= 0) return `${channel.platformName} —`;
                return `${channel.platformName} ${summary.diff_count}`;
              }).filter((text) => !text.endsWith(" —"));
              const channelEntries = channels
                .map((channel) => {
                  const result = resultsByChannel.get(channel.key)
                    || (record.results || []).find((item) => item.case_id === row.case_id && item.channel_name === channel.platformName && Boolean(item.is_baseline) === (channel.role === "baseline"));
                  if (!result) return null;
                  return {
                    channel,
                    result,
                    healthy: matchesExpectedForReport(result)
                  };
                })
                .filter(Boolean)
                .sort((left, right) => {
                  if (left.healthy === right.healthy) {
                    if (left.channel.role === right.channel.role) {
                      return left.channel.platformName.localeCompare(right.channel.platformName, "zh-CN");
                    }
                    return left.channel.role === "baseline" ? -1 : 1;
                  }
                  return left.healthy ? 1 : -1;
                });
              const issueCount = channelEntries.filter((entry) => !entry.healthy).length;
              const passCount = channelEntries.length - issueCount;
              const rowSeverity = caseSeverityMetaForRow(row);
              const rowHasTargetIssue = issueCount > 0;
              return `
                <tr class="channel-report-matrix-row${rowHasTargetIssue ? " channel-report-matrix-row--has-issue" : ""}${rowHasTargetIssue ? ` channel-report-matrix-row--${rowSeverity.css}` : ""}">
                  <td class="pcell">
                    <div class="channel-report-case-title">${escapeHtml(row.title || row.case_id)}</div>
                  </td>
                  <td>${renderSeverityLevelBadge(rowSeverity.level)}</td>
                  <td><span class="channel-intent-tag channel-intent-tag--${row.intent}">${escapeHtml(CHANNEL_REPORT_INTENT.intentLabel?.(row.intent) || row.intent)}</span></td>
                  ${baselineChannel ? `<td>${renderChannelReportMatrixCell(row.by_channel?.[baselineChannel.key], row.intent)}</td>` : ""}
                  ${targetChannels.map((channel) => `<td>${renderChannelReportMatrixCell(row.by_channel?.[channel.key], row.intent)}</td>`).join("")}
                  <td class="mono fs-xs">${escapeHtml(diffParts.length ? diffParts.join(" · ") : "—")}</td>
                </tr>
                <tr class="channel-report-matrix-detail-row">
                  <td colspan="${(baselineChannel ? 1 : 0) + 4 + targetChannels.length}">
                    <details class="channel-report-case-details"${issueCount ? " open" : ""}>
                      <summary class="channel-report-case-details__summary">
                        <span>展开请求 / 响应明细</span>
                        ${issueCount ? `<span class="channel-case-details-badge channel-case-details-badge--fail">${issueCount} 个渠道异常</span>` : ""}
                        ${passCount ? `<span class="channel-case-details-badge channel-case-details-badge--pass">${passCount} 个通过</span>` : ""}
                      </summary>
                      <div class="channel-report-matrix-detail-list">
                        ${channelEntries.map(({ channel, result, healthy }) => renderHistoryRawCase(result, record, {
    matrixContext: true,
    channelLabel: channel.role === "baseline" ? `${channel.platformName} · Baseline` : channel.platformName,
    defaultOpen: !healthy
  })).join("")}
                      </div>
                    </details>
                  </td>
                </tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>
    </section>`;
}

function renderChannelReportDetail(record) {
  const stats = record.stats || channelReportStatsForResults(record.results || []);
  const channels = ensureChannelReportChannels(record);
  const matrix = ensureChannelReportMatrix(record);
  const selectionText = (record.selection || [])
    .map((entry) => `${entry.group_title}(${entry.case_ids.length})`)
    .join(" · ") || record.case_group_title || "—";
  const protocolLabel = channelReportProtocolLabel(record.protocol_id);
  const grouped = new Map();
  for (const row of matrix) {
    const key = row.group_key || "other";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(row);
  }
  const groupOrder = Object.keys(RUN_V02_GROUP_TITLES);
  const sections = groupOrder
    .filter((key) => grouped.has(key))
    .map((key) => renderChannelReportMatrixSection(record, key, grouped.get(key), channels))
    .join("");
  const extraSections = [...grouped.keys()]
    .filter((key) => !groupOrder.includes(key))
    .map((key) => renderChannelReportMatrixSection(record, key, grouped.get(key), channels))
    .join("");

  return `
    <tr class="hdetail-row channel-report-detail-row" data-channel-report-detail="${escapeHtml(record.id)}">
      <td class="hdetail-cell" colspan="8">
        <div class="hdetail channel-report-detail">
          <div class="channel-report-detail__head">
            <div>
              <p class="eyebrow">测评报告</p>
              <h3 class="channel-report-detail__title">${escapeHtml(record.model_id || "—")} · ${escapeHtml(protocolLabel)}</h3>
              <p class="muted fs-sm">Baseline：${escapeHtml(record.baseline_label || "—")} · 测评：${escapeHtml((record.target_labels || []).join("、")) || "—"}</p>
              <p class="muted fs-xs">勾选分组：${escapeHtml(selectionText)}</p>
            </div>
            <div class="channel-report-detail__stats">
              <span class="hpill">断言 ${stats.assertPass || 0}/${stats.assertTotal || 0}</span>
              <span class="hpill">观测 ${stats.observeRecorded || 0}/${stats.observeTotal || 0}</span>
              <span class="hpill ${stats.structureDiffs ? "warn" : "neutral"}">结构差异 ${stats.structureDiffs || 0}</span>
              ${renderChannelReportDownloadMenu(record)}
            </div>
          </div>
          ${renderChannelReportEvaluationSummary(record)}
          <div class="channel-report-matrix-wrap">
            ${sections}${extraSections}
          </div>
        </div>
      </td>
    </tr>`;
}

function channelReportProtocolLabel(protocolId = "") {
  if (protocolId === "anthropic_messages") return "Anthropic Messages";
  if (protocolId === "chat_completions") return "Chat Completions";
  return protocolId || "—";
}

function channelReportRoutePlatformName(label = "") {
  const text = String(label || "").trim();
  if (!text) return "—";
  const slash = text.indexOf(" / ");
  return slash >= 0 ? text.slice(0, slash) : text;
}

function renderChannelReportIdCell(record) {
  return `
    <div class="channel-report-id-cell">
      <div class="rep-id channel-report-id">${escapeHtml(record.id.replace(/^channel_report_/, "run/"))}</div>
      <time class="mono muted fs-xs channel-report-id-time">${escapeHtml(formatDateTime(record.generated_at))}</time>
    </div>`;
}

function renderChannelReportRouteCell(record) {
  const baseline = channelReportRoutePlatformName(record.baseline_label);
  const targets = (record.target_labels || []).map(channelReportRoutePlatformName);
  return `
    <div class="hprovider channel-report-routes channel-report-routes--compact">
      <strong class="mono">${escapeHtml(record.model_id || "—")}</strong>
      <span class="meta">${escapeHtml(channelReportProtocolLabel(record.protocol_id))}</span>
      <span class="meta channel-report-route-line channel-report-route-line--compact">
        <span class="channel-report-route-label">Baseline</span>
        ${escapeHtml(baseline)}
      </span>
      <span class="meta channel-report-route-line channel-report-route-line--compact">
        <span class="channel-report-route-label">测评 ${targets.length || 0}</span>
        ${escapeHtml(targets.length ? targets.join("、") : "—")}
      </span>
    </div>`;
}

function renderChannelReportVerdictCell(record, evaluation) {
  const verdict = evaluation?.verdict_meta || {};
  const issueText = evaluation?.issue_text;
  const showIssue = issueText && issueText !== "无断言失败";
  return `
    <div class="channel-report-verdict-cell">
      <span class="channel-report-verdict channel-report-verdict--${escapeHtml(verdict.css || evaluation?.verdict || "pass")}">${escapeHtml(verdict.label || "—")}</span>
      ${showIssue ? `<span class="muted fs-xs channel-report-verdict-issue">${escapeHtml(issueText)}</span>` : ""}
    </div>`;
}

function renderChannelReports() {
  if (!els.channelReportsList) return;
  renderChannelReportRunPanel();
  const items = readChannelReports();
  if (state.expandedChannelReportId && !items.some((record) => record.id === state.expandedChannelReportId)) {
    state.expandedChannelReportId = null;
  }
  if (els.channelReportsCount) els.channelReportsCount.textContent = `${items.length} 条`;
  if (els.clearChannelReports) {
    els.clearChannelReports.disabled = items.length === 0 && !state.runV02.isRunning;
  }
  if (!items.length) {
    els.channelReportsList.innerHTML = state.runV02.isRunning
      ? ""
      : `
      <div class="empty-state">
        <strong>暂无渠道参数测评报告</strong>
        <span>在「渠道参数测评工具」中配置并运行测试，报告会在这里生成。</span>
      </div>
    `;
    return;
  }

  els.channelReportsList.innerHTML = `
    <div class="htable-wrap">
      <table class="htable channel-report-table">
        <colgroup>
          <col class="channel-report-col-id" />
          <col class="channel-report-col-verdict" />
          <col class="channel-report-col-routes" />
          <col class="channel-report-col-cases" />
          <col class="channel-report-col-assert" />
          <col class="channel-report-col-observe" />
          <col class="channel-report-col-diff" />
          <col class="channel-report-col-actions" />
        </colgroup>
        <thead>
          <tr>
            <th>报告编号</th>
            <th>整体结论</th>
            <th>模型与渠道</th>
            <th>分组 / Case</th>
            <th>断言达标</th>
            <th>观测记录</th>
            <th>结构差异</th>
            <th style="text-align:right">操作</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((record) => {
            const stats = record.stats || channelReportStatsForResults(record.results || []);
            const evaluation = ensureChannelReportEvaluation(record);
            const isOpen = state.expandedChannelReportId === record.id;
            const caseCount = record.case_matrix?.length
              || new Set((record.results || []).map((result) => result.case_id)).size;
            const groupCount = record.selection?.length || (record.case_group_key === "multi" ? "多" : 1);
            const passSummary = `${stats.assertPass || 0}/${stats.assertTotal || 0}`;
            return `
              <tr class="hrow ${isOpen ? "open" : ""}" data-channel-report-id="${escapeHtml(record.id)}">
                <td>${renderChannelReportIdCell(record)}</td>
                <td>${renderChannelReportVerdictCell(record, evaluation)}</td>
                <td>${renderChannelReportRouteCell(record)}</td>
                <td>${escapeHtml(String(groupCount))} 组 · ${caseCount} case</td>
                <td>
                  <span class="hpill ${stats.assertFail ? "warn" : "neutral"}">${escapeHtml(passSummary)}</span>
                </td>
                <td>
                  <span class="hpill">${escapeHtml(`${stats.observeRecorded || 0}/${stats.observeTotal || 0}`)}</span>
                  ${stats.observeAssertionFail ? `<span class="meta channel-report-observe-assert-fail">断言异常 ${stats.observeAssertionFail}</span>` : ""}
                  ${stats.observeIssue ? `<span class="meta">请求异常 ${stats.observeIssue}</span>` : ""}
                </td>
                <td>${escapeHtml(historyDiffSummaryText({ diffs: stats.structureDiffs || stats.diffs || 0 }))}</td>
                <td>
                  <div class="hactions">
                    ${renderHiconButton({
    icon: "chevron-down",
    isOpen,
    title: "查看对比矩阵",
    ariaLabel: "查看对比矩阵",
    dataAttrs: {
      "data-channel-report-action": "toggle",
      "data-channel-report-id": record.id
    }
  })}
                    ${renderHiconButton({
    icon: "trash-2",
    extraClass: "danger",
    title: "删除报告",
    ariaLabel: "删除报告",
    dataAttrs: {
      "data-channel-report-action": "delete",
      "data-channel-report-id": record.id
    }
  })}
                  </div>
                </td>
              </tr>
              ${state.expandedChannelReportId === record.id ? renderChannelReportDetail(record) : ""}
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function resetRunUi() {
  state.completedResults = [];
  state.batchRunRecords = [];
  state.expandedCaseId = null;
  els.runLog.innerHTML = "";
  els.progressBar.style.width = "0%";
  els.progressCount.textContent = "0 / 0";
  els.progressCase.textContent = "等待中";
  els.capacitySummary?.classList.add("is-hidden");
  if (els.capacitySummary) els.capacitySummary.innerHTML = "";
  els.resultsPanel.classList.add("is-hidden");
}

function runTests() {
  if (currentProviderId()) {
    runProviderTests();
    return;
  }
  runPreviewTests();
}

async function runProviderTests() {
  clearTimeout(state.timer);
  resetRunUi();
  renderProxyState();
  const proxy = getProxyConfig();
  const channel = getSelectedChannel();
  const providerId = currentProviderId();
  if (proxy.enabled && !proxy.url) {
    showToast("已启用代理，但 Proxy URL 为空。");
    updateRunAvailability();
    return;
  }
  const results = getResultsForChannel();
  if (!results.length) {
    updateRunAvailability();
    const hasCases = Boolean(providerId && state.providerCases[currentCaseCacheKey(providerId)]?.cases?.length);
    showToast(hasCases ? `至少选择一个 ${channel.name} 用例。` : `请先启动 Go 后端并加载 ${channel.name} 用例。`);
    return;
  }
  const apiKey = els.apiKey.value.trim();
  let targets = [];
  try {
    targets = currentRunTargets(providerId, apiKey);
  } catch (error) {
    showToast(error.message);
    updateRunAvailability();
    return;
  }
  if (targets.some((target) => !target.api_key)) {
    showToast("真实测试需要填写 API Key，或在每个批量 target 行内提供 api_key。");
    updateRunAvailability();
    return;
  }

  state.lastRunProxy = proxy;
  state.visibleResults = [];
  state.completedResults = [];
  state.batchRunRecords = [];
  state.currentRunAbortController = new AbortController();
  state.isRunning = true;
  updateRunAvailability();
  els.progressPanel.classList.remove("is-hidden");
  const selectedCases = selectedProviderCases(providerId);
  const totalRuns = selectedCases.length * targets.length;
  els.progressCount.textContent = `0 / ${totalRuns}`;
  els.progressCase.textContent = "— 正在请求后端执行真实测试 ...";

  try {
    appendRunText(`→ 检查后端连接：${API_BASE}`);
    await ensureBackendReady(state.currentRunAbortController?.signal);
    appendRunText("→ 后端已连接，开始真实测试");

    state.visibleResults = targets.flatMap((target, targetIndex) => {
      const context = runContextForTarget(target);
      return selectedCases.map((testCase, caseIndex) => ({
        result_uid: resultUid(context, testCase, caseIndex),
        case_id: testCase.case_id,
        channel_id: context.channel_id,
        channel_name: context.channel_name,
        provider: context.provider,
        endpoint_id: context.endpoint_id,
        endpoint_label: context.endpoint_label,
        base_url: context.base_url,
        model: context.model,
        target_label: `${context.channel_name || context.provider} / ${context.model}`,
        parameter: (testCase.parameters?.length ? testCase.parameters : ["payload"]).join(" + "),
        category: testCase.category,
        support_conclusion: "unknown",
        status: "na",
        http_status: 0,
        latency_ms: 0,
        diff_count: 0,
        message: `等待真实请求执行（target ${targetIndex + 1}）。`,
        proxy,
        source_case: testCase
      }));
    });

    const batchTextPresent = batchModeActive();
    const runConcurrency = batchConcurrency();
    const capacitySelected = selectedCases.filter(isCapacityCase);
    if (capacitySelected.length) {
      appendRunText(`→ 含 模型限制实测（输入/输出/上下文/思考预算） ${capacitySelected.length} 个：会逐档发真实请求，可能需要数分钟；已完成 case 会实时显示。`);
    }
    if (batchTextPresent) {
      const selectedBuiltInCaseIds = selectedCases.filter((testCase) => !testCase.custom).map((testCase) => testCase.case_id);
      const selectedCustomCases = selectedCases.filter((testCase) => testCase.custom);
      const targetContexts = targets.map((target) => runContextForTarget(target));
      state.batchRunRecords = targetContexts.map((context) => ({ context, results: [] }));
      const targetProgress = targets.map((target, index) => ({
        completed: 0,
        total: selectedCases.length,
        label: `${target.provider} / ${target.model || `target ${index + 1}`}`
      }));
      appendRunText(`→ 批量启动 ${targets.length} 个 target，并发 ${runConcurrency}，每个 target ${selectedCases.length} 个 case，实时返回结果`);
      targets.forEach((target, index) => appendRunText(`→ target ${index + 1}: ${target.provider} / ${target.model}`));
      const response = await fetch(`${API_BASE}/api/run-batch-stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: state.currentRunAbortController?.signal,
        body: JSON.stringify({
          targets,
          endpoint_id: state.selectedEndpointId,
          case_ids: selectedBuiltInCaseIds,
          custom_cases: selectedCustomCases,
          proxy,
          max_concurrency: runConcurrency
        })
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${response.status}`);
      }
      if (!state.isRunning) return;
      let count = 0;
      let streamTotal = totalRuns;
      let sawEnd = false;
      await readRunStream(response, (event) => {
        if (!state.isRunning) return;
        if (event.type === "start") {
          streamTotal = event.total || totalRuns;
          els.progressCount.textContent = `0 / ${streamTotal}`;
          els.progressCase.textContent = `— 后端已开始执行 ${targets.length} 个 target，等待首个 case 完成 ...`;
          return;
        }
        if (event.type === "target_start") {
          const targetNumber = Number.isInteger(event.target_index) ? event.target_index + 1 : "?";
          appendRunText(`→ target ${targetNumber} 开始：${event.target_label || "target"}，${event.target_total || selectedCases.length} 个 case`);
          return;
        }
        if (event.type === "target_error") {
          const targetNumber = Number.isInteger(event.target_index) ? event.target_index + 1 : "?";
          appendRunText(`✗ target ${targetNumber} 失败：${event.error || "unknown error"}`);
          return;
        }
        if (event.type === "target_end") {
          const targetNumber = Number.isInteger(event.target_index) ? event.target_index + 1 : "?";
          const progress = targetProgress[event.target_index];
          appendRunText(`✓ target ${targetNumber} 完成：${event.target_label || progress?.label || "target"}`);
          return;
        }
        if (event.type === "error") {
          throw new Error(event.error || "batch stream run failed");
        }
        if (event.type === "end") {
          sawEnd = true;
          return;
        }
        if (event.type !== "result" || !event.result) return;
        const targetIndex = Number.isInteger(event.target_index) ? event.target_index : 0;
        const context = targetContexts[targetIndex] || targetContexts[0] || runContextForTarget(targets[0]);
        const mapped = mapRunResult(event.result, context, Number.isInteger(event.index) ? event.index : count);
        state.completedResults.push(mapped);
        if (!state.batchRunRecords[targetIndex]) {
          state.batchRunRecords[targetIndex] = { context, results: [] };
        }
        state.batchRunRecords[targetIndex].results.push(mapped);
        appendLog(mapped);
        count += 1;
        if (targetProgress[targetIndex]) targetProgress[targetIndex].completed += 1;
        const targetStatus = targetProgress
          .map((item, index) => `T${index + 1} ${item.completed}/${item.total}`)
          .join(" · ");
        els.progressCount.textContent = `${count} / ${streamTotal}`;
        els.progressCase.textContent = `— 已完成 ${count}/${streamTotal}: T${targetIndex + 1} ${resultTitle(mapped)} · ${targetStatus}`;
        els.progressBar.style.width = `${Math.round((count / streamTotal) * 100)}%`;
        renderStats();
        renderTabs();
        renderResults();
        els.resultsPanel.classList.remove("is-hidden");
      });
      if (!sawEnd && count < streamTotal && state.isRunning) {
        throw new Error(`batch stream ended early: ${count}/${streamTotal}`);
      }
    } else {
      const target = targets[0];
      const context = runContextForTarget(target);
      appendRunText(`→ ${target.provider} / ${target.model || "model"} 开始请求 ${selectedCases.length} 个 case，并发 ${runConcurrency}，实时返回结果`);
      const response = await fetch(`${API_BASE}/api/run-stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: state.currentRunAbortController?.signal,
        body: JSON.stringify({
          provider: target.provider,
          endpoint_id: target.endpoint_id,
          case_ids: selectedCases.filter((testCase) => !testCase.custom).map((testCase) => testCase.case_id),
          custom_cases: selectedCases.filter((testCase) => testCase.custom),
          api_key: target.api_key,
          base_url: target.base_url,
          model: target.model,
          proxy,
          max_concurrency: runConcurrency
        })
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${response.status}`);
      }
      if (!state.isRunning) return;
      let count = 0;
      let streamTotal = selectedCases.length;
      let sawEnd = false;
      await readRunStream(response, (event) => {
        if (!state.isRunning) return;
        if (event.type === "start") {
          streamTotal = event.total || selectedCases.length;
          els.progressCount.textContent = `0 / ${streamTotal}`;
          els.progressCase.textContent = "— 后端已开始执行，等待首个 case 完成 ...";
          return;
        }
        if (event.type === "error") {
          throw new Error(event.error || "stream run failed");
        }
        if (event.type === "end") {
          sawEnd = true;
          return;
        }
        if (event.type !== "result" || !event.result) return;
        const mapped = mapRunResult(event.result, context, Number.isInteger(event.index) ? event.index : count);
        state.completedResults.push(mapped);
        appendLog(mapped);
        count += 1;
        els.progressCount.textContent = `${count} / ${streamTotal}`;
        els.progressCase.textContent = `— 已完成 ${count}/${streamTotal}: ${resultTitle(mapped)}`;
        els.progressBar.style.width = `${Math.round((count / streamTotal) * 100)}%`;
        renderStats();
        renderTabs();
        renderResults();
        els.resultsPanel.classList.remove("is-hidden");
      });
      if (!sawEnd && count < streamTotal && state.isRunning) {
        throw new Error(`stream ended early: ${count}/${streamTotal}`);
      }
    }
    if (!state.isRunning) return;
    els.progressCase.textContent = batchTextPresent ? "— 批量真实测试完成" : "— 真实测试完成";
    els.progressBar.style.width = "100%";
    finishRun();
  } catch (error) {
    state.currentRunAbortController = null;
    state.isRunning = false;
    updateRunAvailability();
    if (error.name === "AbortError") {
      els.progressCase.textContent = "— 真实测试已取消";
      showToast("真实测试已取消，后端会停止未完成请求。");
      return;
    }
    const backendUnavailable = error.isBackendUnavailable || isFetchNetworkError(error);
    if (backendUnavailable) {
      els.progressCase.textContent = "— 后端连接失败";
      appendRunText(`✗ ${BACKEND_UNAVAILABLE_MESSAGE}`);
      showToast(BACKEND_UNAVAILABLE_MESSAGE);
      return;
    }
    els.progressCase.textContent = "— 真实测试失败";
    showToast(`真实测试失败：${error.message}`);
  } finally {
    if (!state.isRunning) {
      state.currentRunAbortController = null;
    }
  }
}

function runPreviewTests() {
  clearTimeout(state.timer);
  resetRunUi();
  renderProxyState();
  const proxy = getProxyConfig();
  if (proxy.enabled && !proxy.url) {
    showToast("已启用代理，但 Proxy URL 为空。");
    updateRunAvailability();
    return;
  }
  state.lastRunProxy = proxy;
  const results = getResultsForChannel();
  if (!results.length) {
    updateRunAvailability();
    showToast("当前渠道没有可运行 case。");
    return;
  }
  state.visibleResults = results;
  state.isRunning = true;
  updateRunAvailability();
  els.progressPanel.classList.remove("is-hidden");

  const runStep = (index) => {
    if (!state.isRunning) return;
    if (index >= results.length) {
      finishRun();
      return;
    }
    const result = results[index];
    state.completedResults.push(result);
    appendLog(result);
    const count = index + 1;
    els.progressCount.textContent = `${count} / ${results.length}`;
    els.progressCase.textContent = `— 正在测试 ${result.parameter} ...`;
    els.progressBar.style.width = `${Math.round((count / results.length) * 100)}%`;
    state.timer = setTimeout(() => runStep(index + 1), 300 + Math.round(Math.random() * 200));
  };

  state.timer = setTimeout(() => runStep(0), 280);
}

function runContextForTarget(target = {}) {
  const provider = target.provider || currentProviderId();
  const endpointId = target.endpoint_id || state.selectedEndpointId;
  const channel = channelForProvider(provider, endpointId) || getSelectedChannel();
  return {
    provider,
    endpoint_id: endpointId,
    endpoint_label: endpointTemplateById(endpointId)?.label || endpointId,
    channel_id: channel.channel_id,
    channel_name: channel.name,
    base_url: target.base_url || els.baseUrl.value.trim(),
    model: target.model || els.modelName.value.trim()
  };
}

function resultUid(context = {}, result = {}, index = 0) {
  return [
    context.provider || "provider",
    context.endpoint_id || state.selectedEndpointId,
    context.model || "model",
    result.case_id || "case",
    index
  ].map((part) => String(part).replace(/\s+/g, "_")).join("::");
}

function mapRunResult(result, context = runContextForTarget(), index = 0) {
  const testCase = allProviderCases().find((item) => item.case_id === result.case_id);
  const parameters = result.parameters?.length ? result.parameters : testCase?.parameters || ["payload"];
  const responseBody = result.response_body || null;
  const rawResponse = result.raw_response || "";
  const baseline = selectedBaselineRecord();
  const baselineResponse = baselineResponseForResult(result, baseline);
  const supportConclusion = result.support_conclusion || inferSiliconFlowConclusion(testCase || {});
  const meta = supportConclusionMeta[supportConclusion] || supportConclusionMeta.unknown;
  const diffCount = baselineResponse && responseBody && typeof responseBody === "object"
    ? compareStructure(baselineResponse, responseBody).length
    : result.error ? 1 : 0;
  return enrichResultAxes({
    result_uid: resultUid(context, result, index),
    case_id: result.case_id,
    title: testCase ? caseTitle(testCase) : result.title || "",
    channel_id: context.channel_id || state.selectedChannelId,
    channel_name: context.channel_name || getSelectedChannel().name,
    provider: context.provider || currentProviderId(),
    endpoint_id: context.endpoint_id || state.selectedEndpointId,
    endpoint_label: context.endpoint_label || getSelectedEndpointTemplate().label,
    base_url: context.base_url || els.baseUrl.value.trim(),
    model: context.model || els.modelName.value.trim(),
    target_label: `${context.channel_name || context.provider || "target"} / ${context.model || "model"}`,
    parameter: parameters.join(" + "),
    category: result.category || testCase?.category || "case",
    support_conclusion: supportConclusion,
    status: meta.status,
    http_status: result.http_status || meta.httpStatus,
    latency_ms: result.latency_ms || 0,
    diff_count: diffCount,
    message: result.error || meta.note,
    proxy: state.lastRunProxy || getProxyConfig(),
    source_case: testCase,
    request_headers: result.request_headers,
    request_body: result.request_body,
    response_body: responseBody,
    raw_response: rawResponse,
    response_headers: result.response_headers,
    assertions: result.assertions || [],
    expected_http_status: result.expected_http_status,
    expected_support_conclusion: result.expected_support_conclusion,
    error: result.error || "",
    stream_metrics: result.stream_metrics || null,
    stream_probe_attempts: result.stream_probe_attempts || null,
    stream_usage_present: result.stream_usage_present ?? null,
    stream_usage_chunk_profile: result.stream_usage_chunk_profile ?? null,
    stream_done_marker_present: result.stream_done_marker_present ?? null,
    output_length_cap_precedence: result.output_length_cap_precedence ?? null,
    output_cap_effective: result.output_cap_effective ?? null
  });
}

function stopTests() {
  if (!state.isRunning) return;
  state.currentRunAbortController?.abort();
  state.isRunning = false;
  clearTimeout(state.timer);
  updateRunAvailability();
  els.progressCase.textContent = "— 用户已停止";
  showToast("测试已停止，保留部分日志。");
}

function runAfterPaint(callback) {
  const schedule = window.requestAnimationFrame || ((fn) => window.setTimeout(fn, 0));
  schedule(() => window.setTimeout(callback, 0));
}

function snapshotBatchRunRecords(records = state.batchRunRecords) {
  return records.map((entry) => ({
    context: { ...(entry.context || {}) },
    results: [...(entry.results || [])]
  }));
}

function finishRunPostProcessing(completedResults, batchRunRecords) {
  try {
    updateRunAvailability();
    const record = saveHistoryRecord(completedResults, batchRunRecords);
    const feishuConfig = readFeishuConfig();
    if (record && (state.activeView === "feishu" || feishuConfig.autoPush)) {
      renderFeishuReport(record);
    }
    if (record && feishuConfig.autoPush) {
      pushFeishuReport(record, { auto: true });
    }
  } catch (error) {
    console.error("Run post-processing failed", error);
    showToast(`测试已完成，但报告保存/生成失败：${error.message}`);
  }
}

function finishRun() {
  const completedResults = [...state.completedResults];
  const batchRunRecords = snapshotBatchRunRecords();
  state.isRunning = false;
  state.currentRunAbortController = null;
  clearTimeout(state.timer);
  if (els.stopTests) els.stopTests.disabled = true;
  if (els.runTests) els.runTests.disabled = false;
  if (els.batchTargets) els.batchTargets.disabled = !state.batchModeEnabled;
  if (els.batchConcurrency) els.batchConcurrency.disabled = false;
  if (els.batchModeToggle) els.batchModeToggle.disabled = false;
  els.progressCase.textContent = "— 完成";
  els.progressBar.style.width = "100%";
  try {
    renderStats();
    renderTabs();
    renderResults();
    els.resultsPanel.classList.remove("is-hidden");
  } catch (error) {
    console.error("Run result rendering failed", error);
    showToast(`测试已完成，但结果渲染失败：${error.message}`);
  }
  runAfterPaint(() => finishRunPostProcessing(completedResults, batchRunRecords));
}

function appendLog(result) {
  result = enrichResultAxes(result);
  const line = document.createElement("span");
  const meta = conclusionMeta(result);
  const evidence = evidenceMeta(result);
  const expected = matchesExpectedResult(result);
  line.className = `log-line ${expected ? "accepted" : meta.status}`;
  const mark = expected ? statusMarks.accepted : statusMarks[meta.status];
  const httpStatus = result.http_status || meta.httpStatus || "—";
  const latency = result.latency_ms ? `${result.latency_ms}ms` : "—";
  line.textContent = `${mark} ${result.parameter.padEnd(28)} 支持:${meta.label.padEnd(8)} 预期:${expectationLabel(result).padEnd(6)} 证据:${evidence.label.padEnd(6)} HTTP ${String(httpStatus).padEnd(3)} ${latency.padEnd(7)} ${result.message || ""}`;
  els.runLog.appendChild(line);
  els.runLog.scrollTop = els.runLog.scrollHeight;
}

function appendRunText(text) {
  const line = document.createElement("span");
  line.className = "log-line";
  line.textContent = text;
  els.runLog.appendChild(line);
  els.runLog.scrollTop = els.runLog.scrollHeight;
}

function filteredResults() {
  const results = state.completedResults.length ? state.completedResults : state.visibleResults;
  if (state.selectedFilter === "unsupported_400") return results.filter((result) => result.support_conclusion === "rejected_400");
  if (state.selectedFilter === "ignored") return results.filter((result) => result.support_conclusion === "ignored" || result.support_conclusion === "permission_limited");
  if (state.selectedFilter === "request_failed") return results.filter((result) => !matchesExpectedResult(result));
  if (state.selectedFilter === "diffs") return results.filter((result) => result.diff_count > 0);
  return results;
}

function renderStats() {
  const results = state.completedResults;
  els.statPassed.textContent = results.filter(matchesExpectedResult).length;
  els.statWarnings.textContent = results.filter((result) => result.support_conclusion === "ignored" || result.support_conclusion === "permission_limited").length;
  els.statFailed.textContent = results.filter((result) => !matchesExpectedResult(result)).length;
  els.statDiffs.textContent = results.filter((result) => result.diff_count > 0).length;
}

function renderTabs() {
  const results = state.completedResults;
  const tabs = [
    ["all", `全部 (${results.length})`],
    ["unsupported_400", `400 拒绝 (${results.filter((result) => result.support_conclusion === "rejected_400").length})`],
    ["ignored", `未证明/权限 (${results.filter((result) => result.support_conclusion === "ignored" || result.support_conclusion === "permission_limited").length})`],
    ["request_failed", `预期外 (${results.filter((result) => !matchesExpectedResult(result)).length})`],
    ["diffs", `结构差异 (${results.filter((result) => result.diff_count > 0).length})`]
  ];

  els.filterTabs.innerHTML = tabs.map(([id, label]) => {
    const match = label.match(/^(.+?)\s*\((\d+)\)$/);
    const text = match ? match[1] : label;
    const count = match ? match[2] : "";
    return `
    <button class="${state.selectedFilter === id ? "on" : ""}" type="button" data-filter="${id}">
      ${escapeHtml(text)}${count ? ` <span class="count">${count}</span>` : ""}
    </button>
  `;
  }).join("");
}

const CAPACITY_KINDS = ["max_input", "max_output", "max_output_effective", "total_context", "thinking_budget"];

function capacityKindFromResult(result = {}) {
  const bodyKind = result.response_body?.kind;
  if (CAPACITY_KINDS.includes(bodyKind)) return bodyKind;
  const caseId = String(result.case_id || "");
  if (caseId.includes("capacity_max_output_effective")) return "max_output_effective";
  if (caseId.includes("capacity_max_input")) return "max_input";
  if (caseId.includes("capacity_thinking_budget")) return "thinking_budget";
  if (caseId.includes("capacity_max_output")) return "max_output";
  if (caseId.includes("capacity_total_context")) return "total_context";
  return "";
}

function isCapacityResult(result = {}) {
  return result.category === "capacity" || capacityKindFromResult(result) !== "";
}

function capacityHostLabel(value = "") {
  try {
    return new URL(value).host || value;
  } catch {
    return String(value || "").replace(/^https?:\/\//, "").replace(/\/.*$/, "") || "custom url";
  }
}

function capacityTargetKey(result = {}) {
  return [
    result.provider || result.channel_id || "provider",
    result.base_url || "",
    result.model || "model"
  ].join("|");
}

function capacityTargetLabel(result = {}) {
  const model = result.model || "model";
  const host = capacityHostLabel(result.base_url || "");
  return host ? `${model} · ${host}` : model;
}

const CAPACITY_KIND_NAMES = {
  max_input: "最大Input",
  max_output: "最大Max Output",
  max_output_effective: "Max Output 生效",
  total_context: "最大Total Context",
  thinking_budget: "最大Thinking Budget"
};

function capacityDisplayName(kind) {
  return CAPACITY_KIND_NAMES[kind] || "最大Max Output";
}

function capacityResultValue(result = {}, kind = capacityKindFromResult(result)) {
  const body = result.response_body || {};
  if (kind === "max_output_effective") {
    return body.effective ? "生效" : "未生效";
  }
  if (kind === "thinking_budget") {
    if (!body.budget_accepted) return "不支持";
    const max = body.budget_max_display || formatCapacityTier(Number(body.budget_max || 0));
    return body.effective ? `${max} · 生效` : `${max} · 接受`;
  }
  const supported = Number(body.supported_max || 0);
  if (supported > 0 && body.supported_max_display) {
    return body.top_candidate_supported ? `≥ ${body.supported_max_display}` : body.supported_max_display;
  }
  if (supported > 0) {
    return body.top_candidate_supported ? `≥ ${formatCapacityTier(supported)}` : formatCapacityTier(supported);
  }
  return "未测到";
}

function capacityResultLevel(result = {}, kind = capacityKindFromResult(result)) {
  const body = result.response_body || {};
  if (kind === "max_output_effective") return body.effective ? "pass" : "fail";
  if (kind === "thinking_budget") {
    if (!body.budget_accepted) return "fail";
    return body.effective ? "pass" : "warn";
  }
  if (Number(body.supported_max || 0) <= 0) return "fail";
  if (body.upper_bound_found) return "pass";
  return "warn";
}

function capacityResultStatus(result = {}, kind = capacityKindFromResult(result)) {
  const body = result.response_body || {};
  if (kind === "max_output_effective") return body.effective ? "实测生效" : "未生效";
  if (kind === "thinking_budget") {
    if (!body.budget_accepted) return "不支持该字段";
    return body.effective ? "接受并生效" : "接受未生效";
  }
  if (Number(body.supported_max || 0) <= 0) {
    return result.error ? "请求失败" : "未测到支持项";
  }
  if (body.upper_bound_found) return "边界已确认";
  if (body.top_candidate_supported) return "至少支持该档";
  return "边界未完全括定";
}

function capacityResultDetail(result = {}, kind = capacityKindFromResult(result)) {
  const body = result.response_body || {};
  if (kind === "max_output_effective") {
    return body.effective_detail || (body.effective ? "max_tokens 实测可截断输出。" : "未观察到截断，参数疑似被忽略。");
  }
  if (kind === "thinking_budget") {
    if (!body.budget_accepted) return body.skip_reason || `${body.thinking_field || "thinking budget"} 字段未被接受。`;
    const parts = [`最大可传 ${body.budget_max_display || formatCapacityTier(Number(body.budget_max || 0))}`];
    if (body.effective) {
      parts.push(`reasoning_tokens ${body.thinking_low_reasoning_tokens || 0}→${body.thinking_high_reasoning_tokens || 0} 随预算增大`);
    } else {
      parts.push("接受但 reasoning_tokens 未随预算变化");
    }
    if (body.budget_respected === false) parts.push("曾超出预算");
    return parts.join("；") + "。";
  }
  const supported = Number(body.supported_max || 0);
  const nearest = body.nearest_higher_non_supported;
  if (supported > 0 && nearest?.candidate_display) {
    return `${capacityResultValue(result, kind)} 可用；${nearest.candidate_display} 不支持。`;
  }
  if (supported > 0 && body.top_candidate_supported) {
    return `最高候选 ${body.top_candidate_display || capacityResultValue(result, kind)} 已通过，实际可能更高。`;
  }
  if (supported > 0) {
    return `候选范围内最大可用档位是 ${capacityResultValue(result, kind)}。`;
  }
  return result.error || result.message || "当前候选档位内没有拿到可用上限。";
}

function formatCapacityLatency(ms) {
  const value = Number(ms || 0);
  if (!Number.isFinite(value) || value <= 0) return "";
  if (value >= 60000) return `${(value / 60000).toFixed(value >= 600000 ? 0 : 1)}min`;
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}s`;
  return `${Math.round(value)}ms`;
}

function capacitySummaryGroups(results = []) {
  const groups = new Map();
  for (const rawResult of results) {
    if (!isCapacityResult(rawResult)) continue;
    const result = enrichResultAxes(rawResult);
    const kind = capacityKindFromResult(result);
    if (!kind) continue;
    const key = capacityTargetKey(result);
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        label: capacityTargetLabel(result),
        results: {}
      });
    }
    groups.get(key).results[kind] = result;
  }
  return [...groups.values()];
}

function capacitySummaryMarkdownLines(results = []) {
  const groups = capacitySummaryGroups(results);
  if (!groups.length) return [];
  const lines = [
    "## 容量上限",
    "",
    "| Target | 指标 | 可用上限 | 结论 | 探测 | 说明 |",
    "|---|---|---|---|---|---|"
  ];
  const kinds = capacityKindsPresent(groups);
  for (const group of groups) {
    for (const kind of kinds) {
      const result = group.results[kind];
      if (!result) {
        lines.push(`| ${escapeMarkdownCell(group.label)} | ${capacityDisplayName(kind)} | — | 未测试 | — | — |`);
        continue;
      }
      const attempts = Array.isArray(result.response_body?.attempts) ? result.response_body.attempts.length : 0;
      const latency = formatCapacityLatency(result.latency_ms);
      const probeText = [attempts ? `${attempts} 次` : "", latency].filter(Boolean).join(" / ") || "—";
      lines.push(`| ${escapeMarkdownCell(group.label)} | ${capacityDisplayName(kind)} | ${capacityResultValue(result, kind)} | ${capacityResultStatus(result, kind)} | ${probeText} | ${escapeMarkdownCell(capacityResultDetail(result, kind))} |`);
    }
  }
  lines.push("");
  return lines;
}

function capacityKindsPresent(groups = []) {
  const present = CAPACITY_KINDS.filter((kind) => groups.some((group) => group.results[kind]));
  return present.length ? present : ["max_output", "total_context"];
}

function capacitySummaryHtml(results = [], scopeLabel = "") {
  const groups = capacitySummaryGroups(results);
  if (!groups.length) return "";
  const kinds = capacityKindsPresent(groups);
  const cards = groups.flatMap((group) => kinds.map((kind) => {
    const result = group.results[kind];
    if (!result) {
      return `
        <article class="capacity-metric-card empty">
          <div class="capacity-metric-card__top">
            <span>${escapeHtml(capacityDisplayName(kind))}</span>
            <small>${escapeHtml(group.label)}</small>
          </div>
          <strong>—</strong>
          <p>本次没有运行该容量探测。</p>
          <div class="capacity-metric-card__meta">
            <span>未测试</span>
          </div>
        </article>
      `;
    }
    const level = capacityResultLevel(result, kind);
    const attempts = Array.isArray(result.response_body?.attempts) ? result.response_body.attempts.length : 0;
    const latency = formatCapacityLatency(result.latency_ms);
    return `
      <article class="capacity-metric-card ${level}">
        <div class="capacity-metric-card__top">
          <span>${escapeHtml(capacityDisplayName(kind))}</span>
          <small>${escapeHtml(group.label)}</small>
        </div>
        <strong>${escapeHtml(capacityResultValue(result, kind))}</strong>
        <p>${escapeHtml(capacityResultDetail(result, kind))}</p>
        <div class="capacity-metric-card__meta">
          <span class="capacity-status ${level}">${escapeHtml(capacityResultStatus(result, kind))}</span>
          <span>${attempts ? `探测 ${attempts} 次` : "无探测明细"}</span>
          ${latency ? `<span>${escapeHtml(latency)}</span>` : ""}
        </div>
      </article>
    `;
  }));

  return `
    <div class="capacity-summary__head">
      <div>
        <span>容量上限</span>
        <strong>模型可用边界</strong>
      </div>
      <small>${escapeHtml(scopeLabel || (groups.length > 1 ? `${groups.length} 个 target` : "当前 target"))}</small>
    </div>
    <div class="capacity-summary__grid">
      ${cards.join("")}
    </div>
  `;
}

function renderCapacitySummary() {
  if (!els.capacitySummary) return;
  const html = capacitySummaryHtml(state.completedResults);
  if (!html) {
    els.capacitySummary.classList.add("is-hidden");
    els.capacitySummary.innerHTML = "";
    return;
  }
  els.capacitySummary.innerHTML = html;
  els.capacitySummary.classList.remove("is-hidden");
}

function renderResults() {
  renderCapacitySummary();
  const rows = filteredResults();
  els.resultRows.innerHTML = groupReportResults(rows).map((group) => {
    const stats = reportGroupStats(group.results);
    const tone = reportGroupTone(stats);
    return `
      <tr class="result-group-row ${tone}">
        <td colspan="7">
          <div class="result-group-head">
            <div>
              <strong>${escapeHtml(group.title)}</strong>
              <p>${escapeHtml(group.description)}</p>
            </div>
            <span class="result-group-summary">${escapeHtml(reportGroupSummaryText(stats))}</span>
          </div>
        </td>
      </tr>
      ${group.results.map(renderResultRow).join("")}
    `;
  }).join("");
}

function renderResultRow(result) {
  result = enrichResultAxes(result);
  const meta = conclusionMeta(result);
  const evidence = evidenceMeta(result);
  const diffText = diffSummaryForResult(result);
  const diffState = baselineStateForResult(result).status;
  const rowId = result.result_uid || result.case_id;
  const caseCode = isCapacityResult(result) ? "" : result.case_id;
  const detail = state.expandedCaseId === rowId ? renderDetailRow(result) : "";
  return `
    <tr class="result-row" data-result-id="${escapeHtml(rowId)}">
      <td>
        <div class="result-case-cell">
          <strong title="${escapeHtml(resultTitle(result))}">${escapeHtml(resultTitle(result))}</strong>
          ${caseCode ? `<span class="mono muted">${escapeHtml(caseCode)}</span>` : ""}
          ${result.target_label ? `<span class="mono muted">${escapeHtml(result.target_label)}</span>` : ""}
          <span class="mono">${escapeHtml(result.parameter)}</span>
        </div>
      </td>
      <td class="muted">${escapeHtml(categoryLabel(result.category))}</td>
      <td>
        <span class="support-badge ${meta.badgeClass}">${escapeHtml(meta.label)}</span>
      </td>
      <td><span class="expectation-badge ${expectationClass(result)}">${escapeHtml(expectationLabel(result))}</span></td>
      <td><span class="evidence-badge ${evidence.badgeClass}">${escapeHtml(evidence.label)}</span></td>
      <td class="mono muted">${result.http_status || meta.httpStatus || "—"}</td>
      <td><span class="diff-text ${result.diff_count ? "" : "clean"} ${diffState}">${escapeHtml(diffText)}</span></td>
    </tr>
    ${detail}
  `;
}

function syntaxJson(value, highlightedKey) {
  const escaped = escapeHtml(JSON.stringify(value, null, 2));
  if (!highlightedKey) return escaped;
  const keyPattern = new RegExp(`(&quot;${highlightedKey}&quot;:\\s[^\\n]+)`);
  return escaped.replace(keyPattern, '<span class="hl">$1</span>');
}

function renderDetailRow(result) {
  result = enrichResultAxes(result);
  const response = responseForResult(result);
  const canDiff = response.baseline_response && response.channel_response && typeof response.channel_response === "object" && !Array.isArray(response.channel_response);
  const diffs = canDiff ? compareStructure(response.baseline_response, response.channel_response) : [];
  const severity = response.baseline_response
    ? severityForDiffs(diffs, response.baseline_label)
    : {
      level: "unknown",
      label: "NO BASELINE",
      title: "未找到匹配 baseline",
      copy: "选择的历史 baseline 中没有这个 case_id，已跳过结构差异对比。"
    };
  const meta = conclusionMeta(result);
  const evidence = evidenceMeta(result);
  const action = gatewayAction(result);
  const proxy = result.proxy || getProxyConfig();
  const channelName = result.channel_name || getSelectedChannel().name;
  const modelName = result.model || els.modelName.value;

  return `
    <tr class="detail-row">
      <td class="detail-cell" colspan="7">
        <div class="detail-pane case-detail">
          <div class="support-summary ${meta.badgeClass}">
            <span class="support-badge ${meta.badgeClass}">${escapeHtml(meta.label)}</span>
            <div>
              <strong>${escapeHtml(result.parameter)}</strong>
              <p>${escapeHtml(result.message || meta.note)}</p>
              <div class="result-axis-grid">
                <span><strong>支持性</strong>${escapeHtml(capabilityStatusLabel(result))}</span>
                <span><strong>预期</strong>${escapeHtml(expectationLabel(result))}</span>
                <span><strong>证据</strong>${escapeHtml(evidence.label)}</span>
                <span><strong>建议动作</strong>${escapeHtml(action.label)}</span>
              </div>
              <p>${escapeHtml(expectationSummary(result))}；${escapeHtml(assertionSummary(result.assertions))}；${escapeHtml(action.copy)}</p>
            </div>
          </div>

          <p class="detail-title">请求 Body</p>
          <pre class="code-block">${syntaxJson(response.request_body, result.parameter)}</pre>

          ${response.request_headers ? `
            <p class="detail-title">请求 Headers</p>
            <pre class="code-block">${syntaxJson(response.request_headers)}</pre>
          ` : ""}

          <p class="detail-title">请求代理</p>
          <div class="proxy-detail">
            <span class="mono">${escapeHtml(proxy.mode || "direct")}</span>
            <span>${escapeHtml(proxySummary(proxy))}</span>
          </div>

          ${result.source_case?.expect ? `
            <p class="detail-title">预期断言</p>
            <pre class="code-block">${syntaxJson(result.source_case.expect)}</pre>
          ` : ""}

          ${result.assertions?.length ? `
            <p class="detail-title">真实断言结果</p>
            <div class="assertion-list">
              ${result.assertions.map((assertion) => `
                <span class="assertion-item ${assertion.pass ? "pass" : "fail"}">
                  <strong>${assertion.pass ? "✓" : "✗"} ${escapeHtml(assertion.name)}</strong>
                  <span>${escapeHtml(assertion.message || (assertion.pass ? "通过" : "未通过"))}</span>
                </span>
              `).join("")}
            </div>
          ` : ""}

          ${renderStreamMetricsBlock(result)}

          <div class="response-grid">
            <div class="response-pane">
              <p class="detail-title">${escapeHtml(response.baseline_label || "baseline 响应")}</p>
              <div class="response-meta">
                <span>${escapeHtml(response.baseline_meta?.model || response.baseline_meta?.channel_name || "—")}</span>
                <span>${escapeHtml(response.baseline_meta?.http_status || "—")}</span>
                <span>${response.baseline_meta ? escapeHtml(formatDateTime(response.baseline_meta.generated_at)) : "未命中"}</span>
              </div>
              <pre class="code-block">${syntaxJson(response.baseline_response)}</pre>
            </div>
            <div class="response-pane">
              <p class="detail-title">${escapeHtml(channelName)}（当前渠道）</p>
              <div class="response-meta">
                <span>${escapeHtml(modelName)}</span>
                <span>${result.http_status || meta.httpStatus || "—"}</span>
                <span>${result.latency_ms || 0}ms</span>
              </div>
              <pre class="code-block">${syntaxJson(response.channel_response)}</pre>
              ${result.raw_response && !result.response_body ? `
                <p class="detail-title">原始响应</p>
                <pre class="code-block">${escapeHtml(result.raw_response)}</pre>
              ` : ""}
            </div>
          </div>

          ${result.response_headers ? `
            <p class="detail-title">响应 Headers</p>
            <pre class="code-block">${syntaxJson(result.response_headers)}</pre>
          ` : ""}

          <p class="detail-title">结构差异</p>
          <div class="diff-summary-card">${escapeHtml(canDiff ? diffSummarySentence(diffs) : (response.baseline_response ? "当前响应不是 JSON object，无法做结构 diff。" : "缺少同名 baseline，无法做结构 diff。"))}</div>
          <div class="diff-block">${canDiff ? renderDiffLines(diffs) : `<span class="diff-line"><span>?</span><span>response</span><span>text</span><span>${response.baseline_response ? "非 JSON 响应，跳过结构 diff" : "baseline 缺少同名 case，跳过结构 diff"}</span></span>`}</div>

          <div class="severity ${severity.level}">
            <span class="badge ${severity.level === "critical" ? "rejected" : severity.level === "extension" ? "warning" : "accepted"}">${severity.label}</span>
            <div>
              <strong>${severity.title}</strong>
              <p>${severity.copy}</p>
            </div>
          </div>

          <div class="detail-actions">
            <button class="btn btn-secondary btn-sm" type="button" data-action="copy-diff" data-result-id="${escapeHtml(result.result_uid || result.case_id)}">复制 diff</button>
            <button class="btn btn-secondary btn-sm" type="button" data-action="copy-reply" data-result-id="${escapeHtml(result.result_uid || result.case_id)}">复制结论</button>
            <button class="btn btn-ghost btn-sm" type="button" data-action="save-case" data-result-id="${escapeHtml(result.result_uid || result.case_id)}">保存 case</button>
          </div>
        </div>
      </td>
    </tr>
  `;
}

function renderDiffLines(diffs) {
  if (!diffs.length) {
    return '<span class="diff-line"><span>✓</span><span>structure</span><span>object</span><span>（兼容）</span></span>';
  }

  return diffs.map((diff) => `
    <span class="diff-line ${diff.kind}">
      <span>${diff.prefix}</span>
      <span>${escapeHtml(diff.path)}</span>
      <span>${escapeHtml(diff.type)}</span>
      <span>${escapeHtml(diffNoteZh(diff.note))}</span>
    </span>
  `).join("");
}

function diffSummarySentence(diffs) {
  if (!diffs.length) {
    return "结构一致：没有发现字段缺失、额外字段或类型不一致。";
  }
  const missing = diffs.filter((diff) => diff.kind === "missing");
  const extra = diffs.filter((diff) => diff.kind === "extra");
  const type = diffs.filter((diff) => diff.kind === "type");
  const important = missing.find((diff) => requiredOpenAiFields.has(diff.path.split(".")[0])) || missing[0] || type[0] || extra[0];
  const parts = [
    missing.length ? `缺失 ${missing.length} 个字段` : "",
    extra.length ? `新增 ${extra.length} 个字段` : "",
    type.length ? `类型不一致 ${type.length} 个` : ""
  ].filter(Boolean);
  return `${parts.join("，")}。最重要：${important.prefix} ${important.path}（${diffNoteZh(important.note)}）。`;
}

function diffMarkdown(result) {
  const response = responseForResult(result);
  if (!response.baseline_response) return `### ${result.parameter}\n\n${response.baseline_label || "baseline"} 没有匹配的 case，跳过结构差异对比。`;
  const diffs = compareStructure(response.baseline_response, response.channel_response);
  if (!diffs.length) return `### ${result.parameter}\n\n与 ${response.baseline_label || "baseline"} 无结构差异。`;
  return [
    `### ${result.parameter}`,
    "",
    `baseline：${response.baseline_label || "baseline"}`,
    `摘要：${diffSummarySentence(diffs)}`,
    "",
    "```text",
    ...diffs.map((diff) => `${diff.prefix} ${diff.path.padEnd(28)} ${diff.type.padEnd(10)} ${diff.note}`),
    "```"
  ].join("\n");
}

function customerReply(result) {
  const meta = conclusionMeta(result);
  const proxyText = proxySummary(result.proxy || getProxyConfig());
  if (result.support_conclusion === "rejected_400") {
    return `${getSelectedChannel().name} 当前不支持 ${result.parameter} 参数。建议在网关侧过滤该参数，或为该渠道配置参数降级策略。代理配置：${proxyText}`;
  }
  if (result.support_conclusion === "request_failed" || result.support_conclusion === "schema_mismatch") {
    return `${getSelectedChannel().name} 的 ${result.parameter} 真实请求失败，暂不能判定参数支持性。请先检查 API Key、Base URL、Model 和代理配置。代理配置：${proxyText}`;
  }
  if (result.support_conclusion === "ignored") {
    return `${getSelectedChannel().name} 对 ${result.parameter} 不 400，但缺少生效证据或只作为供应商扩展处理。建议在网关侧标记为“可转发但需风险提示”。代理配置：${proxyText}`;
  }
  return `${getSelectedChannel().name} 的 ${result.parameter} 结论：${meta.label}。可作为低风险参数继续放行。代理配置：${proxyText}`;
}

async function copyText(text, label) {
  try {
    await navigator.clipboard.writeText(text);
    showToast(`${label} 已复制。`);
  } catch {
    showToast(`${label}: ${text.slice(0, 120)}`);
  }
}

function exportJson() {
  const baseline = selectedBaselineRecord();
  const payload = {
    channel: getSelectedChannel(),
    baseline: {
      report_id: baseline?.id || "",
      label: baselineLabel(baseline),
      ready: Boolean(baseline && historyRecordHasBaselinePayload(baseline)),
      status: baseline && historyRecordHasBaselinePayload(baseline) ? "ready" : "exploratory"
    },
    proxy: state.lastRunProxy || getProxyConfig(),
    results: state.completedResults.map((result) => ({
      ...enrichResultAxes(result),
      support_conclusion_label: conclusionMeta(result).label,
      evidence_label: evidenceMeta(result).label,
      gateway_action_label: gatewayAction(result).label
    })),
    generated_at: new Date().toISOString()
  };
  copyText(JSON.stringify(payload, null, 2), "JSON 导出");
}

function exportMarkdown() {
  const proxy = state.lastRunProxy || getProxyConfig();
  const baseline = selectedBaselineRecord();
  const lines = [
    `# Noctua 参数支持报告：${getSelectedChannel().name}`,
    "",
    `baseline：${baselineLabel(baseline)}`,
    `代理配置：${proxySummary(proxy)}`,
    "",
    ...capacitySummaryMarkdownLines(state.completedResults),
    ...thinkingProbeAnalysisLines(state.completedResults),
    ...thinkingCloseAnalysisLines(state.completedResults),
    "| 参数 | 分类 | 支持性 | 预期 | 证据 | 建议动作 | HTTP | 结构差异 |",
    "|---|---|---|---|---|---|---|---|",
    ...state.completedResults.map((rawResult) => {
      const result = enrichResultAxes(rawResult);
      return `| \`${result.parameter}\` | ${categoryLabel(result.category)} | ${conclusionMeta(result).label} | ${expectationLabel(result)} | ${evidenceMeta(result).label} | ${gatewayAction(result).label} | ${result.http_status || conclusionMeta(result).httpStatus || "—"} | ${diffSummaryForResult(result)} |`;
    }
    )
  ];
  copyText(lines.join("\n"), "Markdown 导出");
}

function numberInputValue(input, fallback = 0) {
  const value = Number(input?.value);
  return Number.isFinite(value) ? value : fallback;
}

function integerInputValue(input, fallback = 0) {
  return Math.max(0, Math.trunc(numberInputValue(input, fallback)));
}

const CHANNEL_ROUTE_CORE = () => window.NOCTUA_CHANNEL_ROUTE_CORE;
const CHANNEL_PERF = () => window.NOCTUA_CHANNEL_PERFORMANCE;

function readChannelPerfReports() {
  try {
    const parsed = JSON.parse(readStorageItem(CHANNEL_PERF_REPORTS_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeChannelPerfReports(items) {
  return writeReportList(CHANNEL_PERF_REPORTS_STORAGE_KEY, items);
}

function channelPerfBucket() {
  return state.channelPerf;
}

function ensureChannelPerfModelId() {
  return CHANNEL_ROUTE_CORE().ensureModelId(channelPerfBucket());
}

function channelPerfActiveProtocolId() {
  return CHANNEL_ROUTE_CORE().activeProtocolId(channelPerfBucket());
}

function channelPerfRouteByKey(routeKey = state.channelPerf.baselineRouteKey) {
  return CHANNEL_ROUTE_CORE().routeByKey(state.channelPerf.routeOptions, routeKey);
}

function channelPerfChannelsForProtocol() {
  return CHANNEL_ROUTE_CORE().channelsForProtocol(state.channelPerf.routeOptions, channelPerfActiveProtocolId());
}

function channelPerfTargetRoutes() {
  return CHANNEL_ROUTE_CORE().targetRoutes(state.channelPerf);
}

function channelPerfTargetCandidateOptions() {
  return CHANNEL_ROUTE_CORE().targetCandidateOptions(state.channelPerf.routeOptions, state.channelPerf.baselineRoute);
}

function ensureChannelPerfChannelConfig(routeKey, route) {
  return CHANNEL_ROUTE_CORE().ensureChannelConfig(
    state.channelPerf,
    routeKey,
    route,
    state.channelPerf.localConfigProviders
  );
}

function channelPerfChannelApiKeyValue(config) {
  return CHANNEL_ROUTE_CORE().channelApiKeyValue(config);
}

function channelPerfChannelHasApiKey(config) {
  return CHANNEL_ROUTE_CORE().channelHasApiKey(config);
}

function channelPerfBenchmarkFromForm() {
  const perf = CHANNEL_PERF();
  return {
    ...perf.DEFAULT_BENCHMARK,
    num_prompts: integerInputValue(els.channelPerfNumPrompts, 100),
    random_input_len: integerInputValue(els.channelPerfRandomInputLen, 1024),
    random_output_len: integerInputValue(els.channelPerfRandomOutputLen, 128),
    random_range_ratio: numberInputValue(els.channelPerfRandomRangeRatio, 1),
    random_prefix_len: integerInputValue(els.channelPerfRandomPrefixLen, 0),
    request_rate: els.channelPerfRequestRate?.value.trim() || "inf",
    burstiness: numberInputValue(els.channelPerfBurstiness, 1),
    max_concurrency: integerInputValue(els.channelPerfMaxConcurrency, 0),
    num_warmup_requests: integerInputValue(els.channelPerfWarmups, 0),
    percentile_metrics: els.channelPerfPercentileMetrics?.value.trim() || "ttft,tpot,itl,e2el",
    metric_percentiles: els.channelPerfMetricPercentiles?.value.trim() || "50,90,95,99",
    goodput: perf.splitListInput(els.channelPerfGoodput?.value),
    metadata: perf.parseKeyValueInput(els.channelPerfMetadata?.value),
    extra_args: perf.splitCliArgs(els.channelPerfExtraArgs?.value),
    disable_tqdm: true
  };
}

function resetChannelPerfDownstreamFromProtocol() {
  state.channelPerf.baselineRouteKey = "";
  state.channelPerf.baselineRoute = null;
  state.channelPerf.targetRouteKeys = new Set();
  state.channelPerf.channelConfigs = {};
  if (els.channelPerfChannelPanel) els.channelPerfChannelPanel.classList.add("is-hidden");
  if (els.channelPerfConfigPanel) els.channelPerfConfigPanel.classList.add("is-hidden");
  if (els.channelPerfBenchmarkPanel) els.channelPerfBenchmarkPanel.classList.add("is-hidden");
}

function applyChannelPerfModel(modelId) {
  if (!modelId) return;
  if (modelId === state.channelPerf.modelId) {
    closeChannelPerfModelMenu();
    return;
  }
  state.channelPerf.modelId = modelId;
  state.channelPerf.protocolId = "";
  resetChannelPerfDownstreamFromProtocol();
  if (els.channelPerfChannelPanel) els.channelPerfChannelPanel.classList.add("is-hidden");
  closeChannelPerfModelMenu();
  closeChannelPerfBaselineMenu();
  closeChannelPerfTargetMenu();
  renderChannelPerfModelSelect();
  renderChannelPerfProtocolPicker();
  renderChannelPerfBaselineSelect();
  renderChannelPerfTargetSelect();
  const protocols = CHANNEL_ROUTE_CORE().listProtocolOptions(modelId);
  if (protocols.length === 1) {
    applyChannelPerfProtocol(protocols[0].id, { autoSelectBaseline: true });
  }
}

function applyChannelPerfProtocol(protocolId, { autoSelectBaseline = false } = {}) {
  const core = CHANNEL_ROUTE_CORE();
  if (!protocolId || !core.supportedProtocol(protocolId)) return;
  if (protocolId === state.channelPerf.protocolId && !autoSelectBaseline) {
    renderChannelPerfProtocolPicker();
    return;
  }
  state.channelPerf.protocolId = protocolId;
  resetChannelPerfDownstreamFromProtocol();
  if (els.channelPerfChannelPanel) els.channelPerfChannelPanel.classList.remove("is-hidden");
  renderChannelPerfProtocolPicker();
  renderChannelPerfBaselineSelect({ autoSelect: autoSelectBaseline });
  renderChannelPerfTargetSelect();
  renderChannelPerfChannelConfigs();
}

function applyChannelPerfBaseline(routeKey) {
  const route = channelPerfRouteByKey(routeKey);
  if (!route) return;
  state.channelPerf.baselineRouteKey = routeKey;
  state.channelPerf.baselineRoute = route;
  state.channelPerf.targetRouteKeys = new Set(
    [...state.channelPerf.targetRouteKeys].filter((key) => key !== routeKey)
  );
  ensureChannelPerfChannelConfig(routeKey, route);
  closeChannelPerfBaselineMenu();
  if (els.channelPerfConfigPanel) els.channelPerfConfigPanel.classList.remove("is-hidden");
  if (els.channelPerfBenchmarkPanel) els.channelPerfBenchmarkPanel.classList.remove("is-hidden");
  renderChannelPerfBaselineSelect();
  renderChannelPerfTargetSelect();
  renderChannelPerfChannelConfigs();
  updateChannelPerfAvailability();
}

function toggleChannelPerfTarget(routeKey) {
  if (!routeKey || routeKey === state.channelPerf.baselineRouteKey) return;
  const next = new Set(state.channelPerf.targetRouteKeys);
  if (next.has(routeKey)) next.delete(routeKey);
  else next.add(routeKey);
  state.channelPerf.targetRouteKeys = next;
  const route = channelPerfRouteByKey(routeKey);
  if (route) ensureChannelPerfChannelConfig(routeKey, route);
  renderChannelPerfTargetSelect();
  renderChannelPerfChannelConfigs();
  updateChannelPerfAvailability();
}

function syncChannelPerfModelMenu() {
  if (!els.channelPerfModelMenu || !els.channelPerfModelInput) return;
  const open = state.channelPerf.modelMenuOpen;
  els.channelPerfModelMenu.classList.toggle("is-hidden", !open);
  els.channelPerfModelInput.setAttribute("aria-expanded", open ? "true" : "false");
}

function syncChannelPerfBaselineMenu() {
  if (!els.channelPerfBaselineMenu || !els.channelPerfBaselineInput) return;
  const open = state.channelPerf.baselineMenuOpen;
  els.channelPerfBaselineMenu.classList.toggle("is-hidden", !open);
  els.channelPerfBaselineInput.setAttribute("aria-expanded", open ? "true" : "false");
}

function syncChannelPerfTargetMenu() {
  if (!els.channelPerfTargetMenu || !els.channelPerfTargetInput) return;
  const open = state.channelPerf.targetMenuOpen;
  els.channelPerfTargetMenu.classList.toggle("is-hidden", !open);
  els.channelPerfTargetInput.setAttribute("aria-expanded", open ? "true" : "false");
}

function closeChannelPerfModelMenu() {
  state.channelPerf.modelMenuOpen = false;
  state.channelPerf.modelSearch = "";
  syncChannelPerfModelMenu();
  els.channelPerfModelInput?.blur();
  updateChannelPerfModelInputDisplay();
}

function closeChannelPerfBaselineMenu() {
  state.channelPerf.baselineMenuOpen = false;
  state.channelPerf.baselineSearch = "";
  syncChannelPerfBaselineMenu();
  els.channelPerfBaselineInput?.blur();
  updateChannelPerfBaselineInputDisplay();
}

function closeChannelPerfTargetMenu() {
  state.channelPerf.targetMenuOpen = false;
  state.channelPerf.targetSearch = "";
  syncChannelPerfTargetMenu();
  els.channelPerfTargetInput?.blur();
}

function openChannelPerfModelMenu() {
  if (state.channelPerf.isRunning) return;
  closeChannelPerfBaselineMenu();
  closeChannelPerfTargetMenu();
  state.channelPerf.modelMenuOpen = true;
  state.channelPerf.modelSearch = "";
  if (els.channelPerfModelInput) {
    els.channelPerfModelInput.readOnly = false;
    els.channelPerfModelInput.placeholder = "搜索模型，支持模糊匹配";
    els.channelPerfModelInput.value = "";
  }
  renderChannelPerfModelSelect();
  syncChannelPerfModelMenu();
  requestAnimationFrame(() => els.channelPerfModelInput?.focus());
}

function openChannelPerfBaselineMenu() {
  if (state.channelPerf.isRunning || els.channelPerfBaselineInput?.disabled) return;
  closeChannelPerfModelMenu();
  closeChannelPerfTargetMenu();
  state.channelPerf.baselineMenuOpen = true;
  state.channelPerf.baselineSearch = "";
  if (els.channelPerfBaselineInput) {
    els.channelPerfBaselineInput.readOnly = false;
    els.channelPerfBaselineInput.placeholder = "搜索 Baseline 渠道或协议";
    els.channelPerfBaselineInput.value = "";
  }
  renderChannelPerfBaselineSelect();
  syncChannelPerfBaselineMenu();
  requestAnimationFrame(() => els.channelPerfBaselineInput?.focus());
}

function openChannelPerfTargetMenu() {
  if (state.channelPerf.isRunning || els.channelPerfTargetInput?.disabled) return;
  closeChannelPerfModelMenu();
  closeChannelPerfBaselineMenu();
  state.channelPerf.targetMenuOpen = true;
  state.channelPerf.targetSearch = "";
  if (els.channelPerfTargetInput) {
    els.channelPerfTargetInput.readOnly = false;
    els.channelPerfTargetInput.placeholder = "搜索测评渠道";
    els.channelPerfTargetInput.value = "";
  }
  renderChannelPerfTargetSelect();
  syncChannelPerfTargetMenu();
  requestAnimationFrame(() => els.channelPerfTargetInput?.focus());
}

function updateChannelPerfModelInputDisplay() {
  if (!els.channelPerfModelInput || state.channelPerf.modelMenuOpen) return;
  els.channelPerfModelInput.readOnly = true;
  els.channelPerfModelInput.placeholder = "选择模型";
  els.channelPerfModelInput.value = state.channelPerf.modelId || "";
}

function updateChannelPerfBaselineInputDisplay() {
  if (!els.channelPerfBaselineInput || state.channelPerf.baselineMenuOpen) return;
  const route = state.channelPerf.baselineRoute;
  els.channelPerfBaselineInput.readOnly = true;
  els.channelPerfBaselineInput.placeholder = route ? "" : "选择 Baseline";
  els.channelPerfBaselineInput.value = route
    ? CHANNEL_ROUTE_CORE().routeOptionLabel(route)
    : "";
}

function renderChannelPerfModelSelect() {
  if (!els.channelPerfModelOptions) return;
  const lookupApi = window.NOCTUA_MODEL_LOOKUP;
  const evalIds = lookupApi?.getEvalModelIds?.() || [];
  ensureChannelPerfModelId();
  const selectedId = state.channelPerf.modelId;
  const filtered = evalIds.filter((modelId) => matchSearchQuery(state.channelPerf.modelSearch, modelId));
  if (!filtered.length) {
    els.channelPerfModelOptions.innerHTML = `<li class="search-select__empty">没有匹配的模型</li>`;
  } else {
    els.channelPerfModelOptions.innerHTML = filtered.map((modelId) => `
      <li
        class="search-select__option ${modelId === selectedId ? "is-selected" : ""}"
        role="option"
        data-channel-perf-model="${escapeHtml(modelId)}"
        aria-selected="${modelId === selectedId}"
      >${escapeHtml(modelId)}</li>
    `).join("");
  }
  updateChannelPerfModelInputDisplay();
  syncChannelPerfModelMenu();
}

function renderChannelPerfProtocolPicker() {
  if (!els.channelPerfProtocolPicker) return;
  const core = CHANNEL_ROUTE_CORE();
  const modelId = ensureChannelPerfModelId();
  const pickerItems = core.listProtocolPickerItems(modelId);
  const runnableItems = pickerItems.filter(core.protocolIsRunnable);
  const plannedItems = pickerItems.filter((def) => def.evalStatus === "planned");
  const activeId = channelPerfActiveProtocolId();
  const pickerDisabled = !modelId || state.channelPerf.isRunning;

  if (els.channelPerfProtocolHint) {
    if (!modelId) {
      els.channelPerfProtocolHint.textContent = "先选择测评模型";
    } else if (!runnableItems.length && !plannedItems.length) {
      els.channelPerfProtocolHint.textContent = "当前模型暂无可用协议";
    } else if (activeId) {
      els.channelPerfProtocolHint.textContent = `${channelPerfChannelsForProtocol().length} 个渠道支持该协议`;
    } else {
      const plannedNote = plannedItems.length ? ` · ${plannedItems.length} 个即将支持` : "";
      els.channelPerfProtocolHint.textContent = `${runnableItems.length} 个可用协议${plannedNote}`;
    }
  }

  if (!modelId) {
    els.channelPerfProtocolPicker.innerHTML = `<p class="muted fs-sm">请先选择测评模型。</p>`;
    if (els.channelPerfProtocolMeta) els.channelPerfProtocolMeta.innerHTML = "";
    return;
  }

  if (!pickerItems.length) {
    els.channelPerfProtocolPicker.innerHTML = `<p class="muted fs-sm">模型 ${escapeHtml(modelId)} 暂无可用测评协议。</p>`;
    if (els.channelPerfProtocolMeta) els.channelPerfProtocolMeta.innerHTML = "";
    return;
  }

  els.channelPerfProtocolPicker.innerHTML = pickerItems.map((def) => {
    const planned = def.evalStatus === "planned";
    const tabDisabled = pickerDisabled || planned;
    return `
    <button
      type="button"
      class="run-v02-protocol-tab ${def.id === activeId ? "is-active" : ""} ${planned ? "is-planned" : ""}"
      data-channel-perf-protocol="${escapeHtml(def.id)}"
      role="tab"
      aria-selected="${def.id === activeId}"
      ${tabDisabled ? "disabled" : ""}
    >
      <span class="run-v02-protocol-tab__head">
        <span>${escapeHtml(def.tabLabel)}</span>
        ${planned ? '<span class="protocol-status protocol-status--planned run-v02-protocol-tab__badge">即将支持</span>' : ""}
      </span>
      <span class="run-v02-protocol-tab__endpoint">${escapeHtml(def.endpoint)}</span>
    </button>
  `;
  }).join("");

  const activeDef = core.protocolDef(activeId);
  if (els.channelPerfProtocolMeta) {
    els.channelPerfProtocolMeta.innerHTML = activeDef
      ? `<p>${escapeHtml(activeDef.copy)}</p><span class="mono muted">${escapeHtml(activeDef.label)}</span>`
      : `<p class="muted">选择协议后配置渠道连接信息与 Benchmark 参数。</p>`;
  }
}

function renderChannelPerfRouteOptions() {
  CHANNEL_ROUTE_CORE().refreshRouteOptions(state.channelPerf);
  const protocolId = channelPerfActiveProtocolId();
  const modelId = ensureChannelPerfModelId();
  const channelCount = channelPerfChannelsForProtocol().length;

  if (els.channelPerfRouteHint) {
    if (!modelId) {
      els.channelPerfRouteHint.textContent = "先选择测评模型";
    } else if (!protocolId) {
      els.channelPerfRouteHint.textContent = "先选择测评协议";
    } else if (!channelCount) {
      els.channelPerfRouteHint.textContent = "当前协议暂无可用渠道";
    } else if (!state.channelPerf.baselineRoute) {
      els.channelPerfRouteHint.textContent = `${channelCount} 个渠道 · 请选择 Baseline`;
    } else {
      const targetCount = state.channelPerf.targetRouteKeys.size;
      els.channelPerfRouteHint.textContent = targetCount
        ? `Baseline 已选 · ${targetCount} 个测评渠道`
        : "请选择至少一个测评渠道";
    }
  }

  if (els.channelPerfSelectedRoute && state.channelPerf.baselineRoute) {
    const targets = channelPerfTargetRoutes();
    els.channelPerfSelectedRoute.textContent = [
      state.channelPerf.baselineRoute.platformName,
      targets.length ? `测评 ${targets.length} 个渠道` : ""
    ].filter(Boolean).join(" · ");
  }

  const baselineDisabled = !protocolId || !channelCount || state.channelPerf.isRunning;
  if (els.channelPerfBaselineInput) els.channelPerfBaselineInput.disabled = baselineDisabled;
  if (els.channelPerfBaselineControl) els.channelPerfBaselineControl.classList.toggle("is-disabled", baselineDisabled);

  const targetDisabled = !state.channelPerf.baselineRoute || state.channelPerf.isRunning;
  if (els.channelPerfTargetInput) els.channelPerfTargetInput.disabled = targetDisabled;
  if (els.channelPerfTargetControl) els.channelPerfTargetControl.classList.toggle("is-disabled", targetDisabled);

  if (!protocolId || !channelCount) {
    state.channelPerf.baselineRouteKey = "";
    state.channelPerf.baselineRoute = null;
    state.channelPerf.targetRouteKeys = new Set();
    if (els.channelPerfConfigPanel) els.channelPerfConfigPanel.classList.add("is-hidden");
    if (els.channelPerfBenchmarkPanel) els.channelPerfBenchmarkPanel.classList.add("is-hidden");
  }
}

function renderChannelPerfBaselineSelect({ autoSelect = false } = {}) {
  renderChannelPerfRouteOptions();
  if (!els.channelPerfBaselineOptions) return;

  const options = channelPerfChannelsForProtocol();
  const modelId = ensureChannelPerfModelId();

  if (!options.length) {
    state.channelPerf.baselineRouteKey = "";
    state.channelPerf.baselineRoute = null;
    if (els.channelPerfBaselineInput) {
      els.channelPerfBaselineInput.value = "";
      els.channelPerfBaselineInput.placeholder = channelPerfActiveProtocolId() ? "暂无可用渠道" : "先选择测评协议";
    }
    const emptyMsg = !channelPerfActiveProtocolId()
      ? "请先选择测评协议"
      : `模型 ${escapeHtml(modelId)} 在当前协议下暂无可用渠道`;
    els.channelPerfBaselineOptions.innerHTML = `<li class="search-select__empty">${emptyMsg}</li>`;
    syncChannelPerfBaselineMenu();
    updateChannelPerfAvailability();
    return;
  }

  if (!options.some((item) => item.key === state.channelPerf.baselineRouteKey)) {
    if (autoSelect) {
      applyChannelPerfBaseline(options[0].key);
      return;
    }
    state.channelPerf.baselineRouteKey = "";
    state.channelPerf.baselineRoute = null;
  }

  updateChannelPerfBaselineInputDisplay();
  const core = CHANNEL_ROUTE_CORE();
  const filtered = options.filter((option) => matchSearchQuery(
    state.channelPerf.baselineSearch,
    option.platformName,
    option.categoryLabel,
    option.protocolLabel,
    option.apiModelId,
    option.platformId,
    core.routeOptionLabel(option)
  ));

  if (!filtered.length) {
    els.channelPerfBaselineOptions.innerHTML = `<li class="search-select__empty">没有匹配的 Baseline 渠道</li>`;
  } else {
    els.channelPerfBaselineOptions.innerHTML = filtered.map((option) => `
      <li
        class="search-select__option ${option.key === state.channelPerf.baselineRouteKey ? "is-selected" : ""}"
        role="option"
        data-channel-perf-baseline="${escapeHtml(option.key)}"
        aria-selected="${option.key === state.channelPerf.baselineRouteKey}"
      >${escapeHtml(core.routeOptionLabel(option))}</li>
    `).join("");
  }
  syncChannelPerfBaselineMenu();
  updateChannelPerfAvailability();
}

function renderChannelPerfTargetTags() {
  if (!els.channelPerfTargetTags) return;
  const routes = channelPerfTargetRoutes();
  if (!routes.length) {
    els.channelPerfTargetTags.innerHTML = "";
    return;
  }
  els.channelPerfTargetTags.innerHTML = routes.map((route) => `
    <span class="search-select__tag">
      <span class="search-select__tag-label">${escapeHtml(route.platformName)}</span>
      <button
        type="button"
        class="search-select__tag-remove"
        data-channel-perf-target-remove="${escapeHtml(route.key)}"
        aria-label="移除 ${escapeHtml(route.platformName)}"
        ${state.channelPerf.isRunning ? "disabled" : ""}
      >×</button>
    </span>
  `).join("");
}

function renderChannelPerfTargetSelect() {
  renderChannelPerfRouteOptions();
  if (!els.channelPerfTargetOptions) return;
  renderChannelPerfTargetTags();

  const baseline = state.channelPerf.baselineRoute;
  if (!baseline) {
    els.channelPerfTargetOptions.innerHTML = `<li class="search-select__empty">请先选择 Baseline 渠道</li>`;
    syncChannelPerfTargetMenu();
    return;
  }

  const core = CHANNEL_ROUTE_CORE();
  const options = channelPerfTargetCandidateOptions();
  const filtered = options.filter((option) => matchSearchQuery(
    state.channelPerf.targetSearch,
    option.platformName,
    option.categoryLabel,
    option.protocolLabel,
    option.apiModelId,
    option.platformId,
    core.routeOptionLabel(option)
  ));

  if (!filtered.length) {
    els.channelPerfTargetOptions.innerHTML = `<li class="search-select__empty">没有可测评的同协议渠道</li>`;
  } else {
    els.channelPerfTargetOptions.innerHTML = filtered.map((option) => {
      const checked = state.channelPerf.targetRouteKeys.has(option.key);
      return `
        <li
          class="search-select__option ${checked ? "is-checked is-selected" : ""}"
          role="option"
          data-channel-perf-target="${escapeHtml(option.key)}"
          aria-selected="${checked}"
        >${escapeHtml(core.routeOptionLabel(option))}</li>
      `;
    }).join("");
  }
  syncChannelPerfTargetMenu();
  updateChannelPerfAvailability();
}

function renderChannelPerfChannelConfigs() {
  if (!els.channelPerfChannelConfigs) return;
  const baseline = state.channelPerf.baselineRoute;
  const targets = channelPerfTargetRoutes();
  if (!baseline) {
    els.channelPerfChannelConfigs.innerHTML = "";
    return;
  }

  const rows = [
    { route: baseline, role: "baseline", badge: "Baseline", badgeClass: "run-v02-channel-config__badge--baseline" },
    ...targets.map((route) => ({ route, role: "target", badge: "测评", badgeClass: "" }))
  ];

  els.channelPerfChannelConfigs.innerHTML = rows.map(({ route, badge, badgeClass }) => {
    const config = ensureChannelPerfChannelConfig(route.key, route);
    return `
      <div class="run-v02-channel-config" data-channel-perf-config="${escapeHtml(route.key)}">
        <div class="run-v02-channel-config__head">
          <span class="run-v02-channel-config__badge ${badgeClass}">${escapeHtml(badge)}</span>
          <span>${escapeHtml(route.platformName)} · ${escapeHtml(route.protocolLabel)}</span>
        </div>
        <div class="config-row">
          <label class="fld">
            <span>API 模型 ID</span>
            <input class="inp mono" type="text" value="${escapeHtml(route.apiModelId || "")}" readonly />
          </label>
          <label class="fld">
            <span>Endpoint 地址</span>
            <input
              class="inp mono"
              type="text"
              data-channel-perf-config-field="baseUrl"
              data-channel-perf-config-key="${escapeHtml(route.key)}"
              value="${escapeHtml(config.baseUrl || "")}"
              placeholder="https://..."
              ${state.channelPerf.isRunning ? "disabled" : ""}
            />
          </label>
          <label class="fld">
            <span>API Key${config.useLocalKey ? ' <span class="muted fs-xs">config.yaml</span>' : ""}</span>
            <input
              class="inp mono"
              type="${config.useLocalKey ? "text" : "password"}"
              data-channel-perf-config-field="apiKey"
              data-channel-perf-config-key="${escapeHtml(route.key)}"
              value="${escapeHtml(channelPerfChannelApiKeyValue(config))}"
              placeholder="${config.useLocalKey ? "" : "sk-..."}"
              autocomplete="off"
              ${state.channelPerf.isRunning ? "disabled" : ""}
            />
          </label>
        </div>
      </div>
    `;
  }).join("");
}

function updateChannelPerfAvailability() {
  if (!els.runChannelPerfBenchmark) return;
  const baseline = state.channelPerf.baselineRoute;
  const targets = channelPerfTargetRoutes();
  const routes = baseline ? [baseline, ...targets] : [];
  const allConfigured = routes.every((route) => {
    const config = ensureChannelPerfChannelConfig(route.key, route);
    return config.baseUrl?.trim() && channelPerfChannelHasApiKey(config);
  });
  const canRun = Boolean(
    state.channelPerf.modelId
    && channelPerfActiveProtocolId()
    && baseline
    && targets.length
    && allConfigured
    && !state.channelPerf.isRunning
  );
  els.runChannelPerfBenchmark.disabled = !canRun;
  if (els.channelPerfStopBenchmark) {
    els.channelPerfStopBenchmark.disabled = !state.channelPerf.isRunning;
  }
}

async function loadChannelPerfLocalConfig() {
  try {
    const response = await fetch(`${API_BASE}/api/local-config`);
    if (!response.ok) return;
    const data = await response.json();
    state.channelPerf.localConfigProviders = data.providers || {};
  } catch {
    state.channelPerf.localConfigProviders = {};
  }

  const routeKeys = new Set();
  if (state.channelPerf.baselineRouteKey) routeKeys.add(state.channelPerf.baselineRouteKey);
  for (const key of state.channelPerf.targetRouteKeys) routeKeys.add(key);

  const core = CHANNEL_ROUTE_CORE();
  for (const routeKey of routeKeys) {
    const route = channelPerfRouteByKey(routeKey);
    if (!route) continue;
    const local = core.resolveLocalProvider(route.platformId, state.channelPerf.localConfigProviders);
    let config = state.channelPerf.channelConfigs[routeKey];
    if (!config) {
      ensureChannelPerfChannelConfig(routeKey, route);
      continue;
    }
    if (config.apiKey?.trim() && !config.useLocalKey) continue;
    if (!local?.api_key_hint) continue;
    config.useLocalKey = true;
    config.apiKeyHint = local.api_key_hint;
    config.apiKey = "";
    if (!config.baseUrl?.trim() && local.base_url) config.baseUrl = local.base_url;
  }
  renderChannelPerfChannelConfigs();
  updateChannelPerfAvailability();
}

function appendChannelPerfLog(line) {
  if (!els.channelPerfRunLog) return;
  const text = String(line || "");
  els.channelPerfRunLog.textContent = `${els.channelPerfRunLog.textContent}${els.channelPerfRunLog.textContent ? "\n" : ""}${text}`;
  els.channelPerfRunLog.scrollTop = els.channelPerfRunLog.scrollHeight;
}

function renderChannelPerfReportRunPanel() {
  const running = state.channelPerf.isRunning;
  if (els.channelPerfReportRunPanel) {
    els.channelPerfReportRunPanel.classList.toggle("is-hidden", !running);
  }
  if (!running) return;
  const progress = state.channelPerf.runProgress || { count: 0, total: 0, label: "准备中" };
  if (els.channelPerfProgressCount) {
    els.channelPerfProgressCount.textContent = `${progress.count} / ${progress.total}`;
  }
  if (els.channelPerfProgressLabel) {
    els.channelPerfProgressLabel.textContent = progress.label || "准备中";
  }
  if (els.channelPerfProgressBar) {
    const pct = progress.total ? Math.round((progress.count / progress.total) * 100) : 0;
    els.channelPerfProgressBar.style.width = `${pct}%`;
  }
  if (els.channelPerfReportRunMeta && state.channelPerf.runMeta) {
    const meta = state.channelPerf.runMeta;
    els.channelPerfReportRunMeta.textContent = [
      meta.modelId,
      meta.baseline,
      `测评 ${meta.targetCount} 个渠道`,
      `${meta.channelCount} 个渠道合计`
    ].filter(Boolean).join(" · ");
  }
}

function channelPerfProtocolLabel(protocolId) {
  const def = CHANNEL_ROUTE_CORE().protocolDef(protocolId);
  return def?.tabLabel || protocolId || "—";
}

function renderChannelPerfComparisonTable(record) {
  const perf = CHANNEL_PERF();
  const { channels, rows } = perf.comparisonTableRows(record);
  if (!channels.length) return "";
  return `
    <div class="htable-wrap channel-perf-comparison-wrap">
      <table class="htable channel-perf-comparison-table">
        <thead>
          <tr>
            <th>指标</th>
            ${channels.map((channel) => `<th>${escapeHtml(channel.label)}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${rows.map((row) => `
            <tr>
              <td>${escapeHtml(row.label)}</td>
              ${row.cells.map((cell) => `<td class="mono">${escapeHtml(cell)}</td>`).join("")}
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderChannelPerfReportDetail(record) {
  const perf = CHANNEL_PERF();
  const comparison = record.comparison || {};
  const bestThroughput = comparison.best_output_throughput;
  const lowestTtft = comparison.lowest_mean_ttft_ms;
  const summaryCards = [
    ["最佳输出 tok/s", bestThroughput ? `${bestThroughput.platformName} · ${perf.formatMetricValue(bestThroughput.value)}` : "—"],
    ["最低 Mean TTFT", lowestTtft ? `${lowestTtft.platformName} · ${perf.formatMetricValue(lowestTtft.value)} ms` : "—"],
    ["渠道数", String(record.results?.length || 0)],
    ["请求数", String(record.benchmark?.num_prompts || "—")]
  ];
  return `
    <div class="channel-perf-report-detail">
      <div class="stat-grid performance-stats">
        ${summaryCards.map(([label, value]) => `
          <article class="stat-card">
            <div class="st-top">${escapeHtml(label)}</div>
            <div class="st-val">${escapeHtml(String(value))}</div>
          </article>
        `).join("")}
      </div>
      ${renderChannelPerfComparisonTable(record)}
      <details class="channel-perf-json-details">
        <summary>原始 JSON</summary>
        <pre class="code-block performance-json">${escapeHtml(JSON.stringify(record, null, 2))}</pre>
      </details>
    </div>
  `;
}

function renderChannelPerfReports() {
  if (!els.channelPerfReportsList) return;
  renderChannelPerfReportRunPanel();
  const items = readChannelPerfReports();
  if (state.expandedChannelPerfReportId && !items.some((record) => record.id === state.expandedChannelPerfReportId)) {
    state.expandedChannelPerfReportId = null;
  }
  if (els.channelPerfReportsCount) els.channelPerfReportsCount.textContent = `${items.length} 条`;
  if (els.clearChannelPerfReports) {
    els.clearChannelPerfReports.disabled = items.length === 0 && !state.channelPerf.isRunning;
  }
  if (!items.length) {
    els.channelPerfReportsList.innerHTML = state.channelPerf.isRunning
      ? ""
      : `
      <div class="empty-state">
        <strong>暂无渠道性能测评报告</strong>
        <span>在「渠道性能测评工具」中配置并运行测试，报告会在这里生成。</span>
      </div>
    `;
    return;
  }

  const perf = CHANNEL_PERF();
  els.channelPerfReportsList.innerHTML = `
    <div class="htable-wrap">
      <table class="htable channel-perf-report-table">
        <thead>
          <tr>
            <th>报告编号</th>
            <th>模型与协议</th>
            <th>渠道</th>
            <th>最佳吞吐</th>
            <th>最低 TTFT</th>
            <th>时间</th>
            <th style="text-align:right">操作</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((record) => {
            const isOpen = state.expandedChannelPerfReportId === record.id;
            const comparison = record.comparison || {};
            const bestThroughput = comparison.best_output_throughput;
            const lowestTtft = comparison.lowest_mean_ttft_ms;
            const channelCount = record.results?.length || record.channels?.length || 0;
            return `
              <tr class="hrow ${isOpen ? "open" : ""}" data-channel-perf-report-id="${escapeHtml(record.id)}">
                <td>
                  <div class="channel-report-id-cell">
                    <div class="rep-id channel-report-id">${escapeHtml(record.id.replace(/^channel_perf_report_/, "perf/"))}</div>
                    <time class="mono muted fs-xs">${escapeHtml(formatDateTime(record.generated_at))}</time>
                  </div>
                </td>
                <td>
                  <strong class="mono">${escapeHtml(record.model_id || "—")}</strong>
                  <div class="muted fs-xs">${escapeHtml(channelPerfProtocolLabel(record.protocol_id))}</div>
                </td>
                <td class="mono">${channelCount}</td>
                <td class="mono">${bestThroughput ? escapeHtml(`${bestThroughput.platformName} · ${perf.formatMetricValue(bestThroughput.value)}`) : "—"}</td>
                <td class="mono">${lowestTtft ? escapeHtml(`${lowestTtft.platformName} · ${perf.formatMetricValue(lowestTtft.value)}`) : "—"}</td>
                <td class="mono muted fs-xs">${escapeHtml(formatDateTime(record.finished_at || record.generated_at))}</td>
                <td style="text-align:right">
                  <button class="btn btn-ghost btn-sm" type="button" data-channel-perf-report-action="toggle">${isOpen ? "收起" : "展开"}</button>
                  <button class="btn btn-ghost btn-sm" type="button" data-channel-perf-report-action="copy">复制 JSON</button>
                  <button class="btn btn-ghost btn-sm" type="button" data-channel-perf-report-action="delete">删除</button>
                </td>
              </tr>
              ${isOpen ? `
                <tr class="hrow-detail">
                  <td colspan="7">${renderChannelPerfReportDetail(record)}</td>
                </tr>
              ` : ""}
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function saveChannelPerfReportRecord() {
  const perf = CHANNEL_PERF();
  const baseline = state.channelPerf.baselineRoute;
  const targets = channelPerfTargetRoutes();
  if (!state.channelPerf.completedResults.length) return null;
  const record = perf.createChannelPerformanceReportRecord({
    modelId: state.channelPerf.modelId,
    protocolId: channelPerfActiveProtocolId(),
    benchmark: channelPerfBenchmarkFromForm(),
    baseline,
    targets,
    channelResults: state.channelPerf.completedResults,
    startedAt: state.channelPerf.startedAt,
    finishedAt: new Date().toISOString()
  });
  const writeResult = writeChannelPerfReports([record, ...readChannelPerfReports()]);
  if (state.activeView === "channel-performance-reports") renderChannelPerfReports();
  if (!writeResult.saved) {
    showToast("本次性能测评结果已展示，但报告写入失败：浏览器本地存储空间不足。");
  } else if (writeResult.compacted || writeResult.droppedCount > 0) {
    showToast(writeResult.droppedCount > 0
      ? `渠道性能测评报告已保存；本地空间不足，已保留最近 ${writeResult.savedCount} 条。`
      : "渠道性能测评报告已保存。");
  } else {
    showToast("渠道性能测评报告已保存。");
  }
  return record;
}

async function runChannelPerfBenchmarkForRoute(route, role, benchmark, signal, index, total) {
  const perf = CHANNEL_PERF();
  const config = ensureChannelPerfChannelConfig(route.key, route);
  const payload = perf.buildBenchmarkRequest({
    route,
    config,
    protocolId: channelPerfActiveProtocolId(),
    modelId: state.channelPerf.modelId,
    benchmark,
    proxy: getProxyConfig()
  });
  if (!payload.base_url) {
    throw new Error(`${route.platformName} 未填写 Endpoint 地址`);
  }
  if (!channelPerfChannelHasApiKey(config)) {
    throw new Error(`${route.platformName} 未配置 API Key`);
  }

  state.channelPerf.runProgress = {
    count: index,
    total,
    label: `压测 ${route.platformName}`
  };
  renderChannelPerfReportRunPanel();
  appendChannelPerfLog(`→ ${route.platformName} / ${route.protocolLabel}`);

  const response = await fetch(`${API_BASE}/api/performance/benchmark`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }

  const result = data.result || {};
  const summary = perf.summarizeBenchmarkResult(result);
  const stdout = String(data.stdout || "");
  const entry = {
    channel_key: route.key,
    role,
    platformName: route.platformName,
    protocolLabel: route.protocolLabel,
    base_url_host: perf.sanitizeBaseUrlHost(config.baseUrl),
    summary,
    result,
    stdout_preview: stdout.length > 4000 ? `${stdout.slice(0, 4000)}\n…（已截断）` : stdout
  };
  state.channelPerf.completedResults.push(entry);
  appendChannelPerfLog(`  ✓ ${route.platformName} · 输出 ${perf.formatMetricValue(summary.output_throughput)} tok/s · TTFT ${perf.formatMetricValue(summary.mean_ttft_ms)} ms`);
  state.channelPerf.runProgress = {
    count: index + 1,
    total,
    label: `完成 ${route.platformName}`
  };
  renderChannelPerfReportRunPanel();
  renderChannelPerfReports();
  return entry;
}

async function runChannelPerformanceBenchmarks() {
  const baseline = state.channelPerf.baselineRoute;
  const targets = channelPerfTargetRoutes();
  if (!state.channelPerf.modelId) {
    showToast("请先选择测评模型。");
    return;
  }
  if (!channelPerfActiveProtocolId()) {
    showToast("请先选择测评协议。");
    return;
  }
  if (!baseline) {
    showToast("请选择 Baseline 渠道。");
    return;
  }
  if (!targets.length) {
    showToast("请至少选择一个测评渠道。");
    return;
  }

  const routes = [
    { route: baseline, role: "baseline" },
    ...targets.map((route) => ({ route, role: "target" }))
  ];
  for (const { route } of routes) {
    const config = ensureChannelPerfChannelConfig(route.key, route);
    if (!config.baseUrl?.trim()) {
      showToast(`${route.platformName} 未填写 Endpoint 地址。`);
      return;
    }
    if (!channelPerfChannelHasApiKey(config)) {
      showToast(`${route.platformName} 未配置 API Key。`);
      return;
    }
  }

  const proxy = getProxyConfig();
  if (proxy.enabled && !proxy.url) {
    showToast("已启用代理，但 Proxy URL 为空。");
    return;
  }

  state.channelPerf.completedResults = [];
  state.channelPerf.startedAt = new Date().toISOString();
  state.channelPerf.currentRunAbortController = new AbortController();
  state.channelPerf.isRunning = true;
  updateChannelPerfAvailability();

  const benchmark = channelPerfBenchmarkFromForm();
  state.channelPerf.benchmark = benchmark;
  const total = routes.length;
  state.channelPerf.runMeta = {
    modelId: state.channelPerf.modelId,
    baseline: baseline ? `${baseline.platformName} / ${baseline.protocolLabel}` : "",
    targetCount: targets.length,
    channelCount: total
  };
  state.channelPerf.runProgress = { count: 0, total, label: "准备中" };

  history.replaceState(null, "", "#channel-performance-reports");
  setActiveView("channel-performance-reports");
  if (els.channelPerfRunLog) els.channelPerfRunLog.textContent = "";
  renderChannelPerfReports();

  const signal = state.channelPerf.currentRunAbortController.signal;
  try {
    appendChannelPerfLog(`→ 检查后端连接：${API_BASE}`);
    await ensureBackendReady(signal);
    appendChannelPerfLog(`→ 性能压测：${total} 个渠道 · ${benchmark.num_prompts} prompts`);
    for (let index = 0; index < routes.length; index += 1) {
      if (!state.channelPerf.isRunning) break;
      const { route, role } = routes[index];
      await runChannelPerfBenchmarkForRoute(route, role, benchmark, signal, index, total);
    }
    if (els.channelPerfProgressLabel) els.channelPerfProgressLabel.textContent = "— 完成";
    if (els.channelPerfProgressBar) els.channelPerfProgressBar.style.width = "100%";
    state.channelPerf.runProgress = { count: total, total, label: "— 完成" };
    if (state.channelPerf.completedResults.length) {
      const record = saveChannelPerfReportRecord();
      if (record) state.expandedChannelPerfReportId = record.id;
    }
    renderChannelPerfReports();
  } catch (error) {
    if (error?.name === "AbortError") {
      if (els.channelPerfProgressLabel) els.channelPerfProgressLabel.textContent = "— 用户已停止";
      state.channelPerf.runProgress = { ...state.channelPerf.runProgress, label: "— 用户已停止" };
      if (state.channelPerf.completedResults.length) {
        const record = saveChannelPerfReportRecord();
        if (record) state.expandedChannelPerfReportId = record.id;
      }
      showToast("性能测评已停止。");
    } else {
      showToast(`性能测评失败：${error.message}`);
      appendChannelPerfLog(`✗ ${error.message}`);
    }
    renderChannelPerfReports();
  } finally {
    state.channelPerf.isRunning = false;
    state.channelPerf.currentRunAbortController = null;
    updateChannelPerfAvailability();
    renderChannelPerfReportRunPanel();
  }
}

function stopChannelPerformanceBenchmarks() {
  if (!state.channelPerf.isRunning) return;
  state.channelPerf.isRunning = false;
  state.channelPerf.currentRunAbortController?.abort();
}

function renderChannelPerformanceTool() {
  if (!els.channelPerfModelSelect) return;
  loadChannelPerfLocalConfig().then(() => {
    renderChannelPerfModelSelect();
    renderChannelPerfProtocolPicker();
    const protocols = CHANNEL_ROUTE_CORE().listProtocolOptions(state.channelPerf.modelId);
    if (!state.channelPerf.protocolId && protocols.length === 1) {
      applyChannelPerfProtocol(protocols[0].id, { autoSelectBaseline: !state.channelPerf.baselineRouteKey });
    } else if (state.channelPerf.protocolId) {
      if (els.channelPerfChannelPanel) els.channelPerfChannelPanel.classList.remove("is-hidden");
      renderChannelPerfBaselineSelect({ autoSelect: !state.channelPerf.baselineRouteKey });
      renderChannelPerfChannelConfigs();
      if (state.channelPerf.baselineRoute) {
        if (els.channelPerfConfigPanel) els.channelPerfConfigPanel.classList.remove("is-hidden");
        if (els.channelPerfBenchmarkPanel) els.channelPerfBenchmarkPanel.classList.remove("is-hidden");
      }
    } else {
      renderChannelPerfBaselineSelect();
      renderChannelPerfTargetSelect();
    }
    updateChannelPerfAvailability();
  });
}

function bindChannelPerfEvents() {
  document.addEventListener("click", (event) => {
    if (state.activeViewKey !== "channel-performance") return;
    if (els.channelPerfModelSelect && !els.channelPerfModelSelect.contains(event.target)) {
      closeChannelPerfModelMenu();
    }
    if (els.channelPerfBaselineSelect && !els.channelPerfBaselineSelect.contains(event.target)) {
      closeChannelPerfBaselineMenu();
    }
    if (els.channelPerfTargetSelect && !els.channelPerfTargetSelect.contains(event.target)) {
      closeChannelPerfTargetMenu();
    }
  });

  els.channelPerfModelControl?.addEventListener("click", (event) => {
    event.stopPropagation();
    if (state.channelPerf.isRunning) return;
    if (!state.channelPerf.modelMenuOpen) openChannelPerfModelMenu();
    else els.channelPerfModelInput?.focus();
  });

  els.channelPerfModelInput?.addEventListener("input", () => {
    if (!state.channelPerf.modelMenuOpen) return;
    state.channelPerf.modelSearch = els.channelPerfModelInput.value;
    renderChannelPerfModelSelect();
  });

  els.channelPerfModelOptions?.addEventListener("mousedown", (event) => {
    const option = event.target.closest("[data-channel-perf-model]");
    if (!option || state.channelPerf.isRunning) return;
    event.preventDefault();
    event.stopPropagation();
    closeChannelPerfModelMenu();
    applyChannelPerfModel(option.dataset.channelPerfModel);
  });

  els.channelPerfProtocolPicker?.addEventListener("click", (event) => {
    const tab = event.target.closest("[data-channel-perf-protocol]");
    if (!tab || state.channelPerf.isRunning || tab.disabled) return;
    const def = CHANNEL_ROUTE_CORE().protocolDef(tab.dataset.channelPerfProtocol);
    if (!def || !CHANNEL_ROUTE_CORE().protocolIsRunnable(def)) return;
    applyChannelPerfProtocol(tab.dataset.channelPerfProtocol);
  });

  els.channelPerfBaselineControl?.addEventListener("click", (event) => {
    event.stopPropagation();
    if (state.channelPerf.isRunning || els.channelPerfBaselineInput?.disabled) return;
    if (!state.channelPerf.baselineMenuOpen) openChannelPerfBaselineMenu();
    else els.channelPerfBaselineInput?.focus();
  });

  els.channelPerfBaselineInput?.addEventListener("input", () => {
    if (!state.channelPerf.baselineMenuOpen) return;
    state.channelPerf.baselineSearch = els.channelPerfBaselineInput.value;
    renderChannelPerfBaselineSelect();
  });

  els.channelPerfBaselineOptions?.addEventListener("mousedown", (event) => {
    const option = event.target.closest("[data-channel-perf-baseline]");
    if (!option || state.channelPerf.isRunning) return;
    event.preventDefault();
    event.stopPropagation();
    applyChannelPerfBaseline(option.dataset.channelPerfBaseline);
  });

  els.channelPerfTargetControl?.addEventListener("click", (event) => {
    event.stopPropagation();
    if (state.channelPerf.isRunning || els.channelPerfTargetInput?.disabled) return;
    if (!state.channelPerf.targetMenuOpen) openChannelPerfTargetMenu();
    else els.channelPerfTargetInput?.focus();
  });

  els.channelPerfTargetInput?.addEventListener("input", () => {
    if (!state.channelPerf.targetMenuOpen) return;
    state.channelPerf.targetSearch = els.channelPerfTargetInput.value;
    renderChannelPerfTargetSelect();
  });

  els.channelPerfTargetOptions?.addEventListener("mousedown", (event) => {
    const option = event.target.closest("[data-channel-perf-target]");
    if (!option || state.channelPerf.isRunning) return;
    event.preventDefault();
    event.stopPropagation();
    toggleChannelPerfTarget(option.dataset.channelPerfTarget);
  });

  els.channelPerfTargetTags?.addEventListener("click", (event) => {
    const remove = event.target.closest("[data-channel-perf-target-remove]");
    if (!remove || state.channelPerf.isRunning) return;
    toggleChannelPerfTarget(remove.dataset.channelPerfTargetRemove);
  });

  els.channelPerfChannelConfigs?.addEventListener("input", (event) => {
    const field = event.target.closest("[data-channel-perf-config-field]");
    if (!field || state.channelPerf.isRunning) return;
    const routeKey = field.dataset.channelPerfConfigKey;
    const config = state.channelPerf.channelConfigs[routeKey];
    if (!config) return;
    if (field.dataset.channelPerfConfigField === "baseUrl") {
      config.baseUrl = field.value;
      config.useLocalKey = false;
    }
    if (field.dataset.channelPerfConfigField === "apiKey") {
      config.apiKey = field.value;
      config.useLocalKey = false;
      config.apiKeyHint = "";
    }
    updateChannelPerfAvailability();
  });

  els.runChannelPerfBenchmark?.addEventListener("click", runChannelPerformanceBenchmarks);
  els.channelPerfStopBenchmark?.addEventListener("click", stopChannelPerformanceBenchmarks);

  els.clearChannelPerfReports?.addEventListener("click", () => {
    if (!readChannelPerfReports().length) return;
    if (!window.confirm("确定清空所有渠道性能测评报告？")) return;
    writeChannelPerfReports([]);
    state.expandedChannelPerfReportId = null;
    renderChannelPerfReports();
    showToast("渠道性能测评报告已清空。");
  });

  els.channelPerfReportsList?.addEventListener("click", (event) => {
    const row = event.target.closest("[data-channel-perf-report-id]");
    if (!row) return;
    const recordId = row.dataset.channelPerfReportId;
    const record = readChannelPerfReports().find((item) => item.id === recordId);
    if (!record) return;
    const button = event.target.closest("[data-channel-perf-report-action]");
    if (!button) {
      state.expandedChannelPerfReportId = state.expandedChannelPerfReportId === recordId ? null : recordId;
      renderChannelPerfReports();
      return;
    }
    if (button.dataset.channelPerfReportAction === "toggle") {
      state.expandedChannelPerfReportId = state.expandedChannelPerfReportId === recordId ? null : recordId;
      renderChannelPerfReports();
      return;
    }
    if (button.dataset.channelPerfReportAction === "copy") {
      copyText(JSON.stringify(record, null, 2), "性能报告 JSON");
      return;
    }
    if (button.dataset.channelPerfReportAction === "delete") {
      const reportLabel = record.id.replace(/^channel_perf_report_/, "perf/");
      if (!window.confirm(`确定删除报告 ${reportLabel}？`)) return;
      writeChannelPerfReports(readChannelPerfReports().filter((item) => item.id !== recordId));
      if (state.expandedChannelPerfReportId === recordId) state.expandedChannelPerfReportId = null;
      renderChannelPerfReports();
      showToast("渠道性能测评报告已删除。");
    }
  });
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => els.toast.classList.remove("show"), 2400);
}

function storageLegacyKeys(storageKey) {
  if (storageKey === EVALSCOPE_URL_STORAGE_KEY) return LEGACY_EVALSCOPE_URL_STORAGE_KEYS;
  if (storageKey === OPENCOMPASS_URL_STORAGE_KEY) return LEGACY_OPENCOMPASS_URL_STORAGE_KEYS;
  return [];
}

function normalizeEmbedUrl(value, fallbackUrl) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return fallbackUrl;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `http://${trimmed}`;
}

function applyEmbedUrl(config, { reload = true } = {}) {
  const sourceUrl = config.input
    ? config.input.value
    : config.frame?.src || readStorageItem(config.storageKey, storageLegacyKeys(config.storageKey)) || config.defaultUrl;
  const url = normalizeEmbedUrl(sourceUrl, config.defaultUrl);
  if (config.input) config.input.value = url;
  localStorage.setItem(config.storageKey, url);
  if (reload || config.frame.src !== url) {
    config.frame.src = url;
  }
  return url;
}

function loadEmbedUrl(config) {
  if (!config.input) {
    const url = normalizeEmbedUrl(
      readStorageItem(config.storageKey, config.legacyStorageKeys || []) || config.defaultUrl,
      config.defaultUrl
    );
    config.frame.src = url;
    localStorage.setItem(config.storageKey, url);
    return;
  }
  const storedUrl = normalizeEmbedUrl(
    readStorageItem(config.storageKey, storageLegacyKeys(config.storageKey)) || config.defaultUrl,
    config.defaultUrl
  );
  const legacyLocalEvalscopeUrls = ["http://127.0.0.1:9000", "http://127.0.0.1:9000/dashboard", "http://localhost:9000/dashboard"];
  const legacyOpencompassUrls = ["https://rank.opencompass.org.cn/home", "https://hub.opencompass.org.cn/home"];
  const url = config.storageKey === EVALSCOPE_URL_STORAGE_KEY && legacyLocalEvalscopeUrls.includes(storedUrl)
    ? DEFAULT_EVALSCOPE_URL
    : config.storageKey === OPENCOMPASS_URL_STORAGE_KEY && legacyOpencompassUrls.includes(storedUrl)
      ? DEFAULT_OPENCOMPASS_URL
    : storedUrl;
  if (config.input) config.input.value = url;
  config.frame.src = url;
  if (url !== storedUrl) localStorage.setItem(config.storageKey, url);
}

function reloadEmbed(config) {
  const url = config.input ? applyEmbedUrl(config, { reload: false }) : config.defaultUrl;
  config.frame.src = url;
}

function openEmbed(config) {
  const url = config.input ? applyEmbedUrl(config, { reload: false }) : config.defaultUrl;
  window.open(url, "_blank", "noopener,noreferrer");
}

const embedConfigs = {
  evalscope: {
    input: null,
    frame: els.evalscopeFrame,
    storageKey: EVALSCOPE_URL_STORAGE_KEY,
    legacyStorageKeys: LEGACY_EVALSCOPE_URL_STORAGE_KEYS,
    defaultUrl: DEFAULT_EVALSCOPE_URL,
    label: "EvalScope"
  },
  opencompass: {
    input: els.opencompassUrl,
    frame: els.opencompassFrame,
    storageKey: OPENCOMPASS_URL_STORAGE_KEY,
    legacyStorageKeys: LEGACY_OPENCOMPASS_URL_STORAGE_KEYS,
    defaultUrl: DEFAULT_OPENCOMPASS_URL,
    label: "OpenCompass"
  }
};

function renderProtocolCell(supported) {
  return supported
    ? `<span class="protocol-tick" aria-label="支持" title="支持">✓</span>`
    : `<span class="protocol-dash" aria-label="不支持" title="不支持">—</span>`;
}

const CHANNEL_PROTOCOL_TAG_LABELS = {
  chat_completions: "Chat",
  anthropic_messages: "Anthropic",
  responses_api: "Responses"
};

const PROTOCOL_CATALOG_DEFS = [
  {
    id: "chat_completions",
    tabLabel: "Chat",
    label: "OpenAI Chat Completions API",
    endpoint: "POST /v1/chat/completions",
    evalStatus: "supported",
    copy: "在同一 Chat Completions 协议下，对比各渠道官方 API 文档中的参数覆盖与扩展差异（基于 docs/*.md，2026-06-25 核对）。"
  },
  {
    id: "anthropic_messages",
    tabLabel: "Anthropic",
    label: "Anthropic Messages API",
    endpoint: "POST /v1/messages",
    evalStatus: "supported",
    copy: "在同一 Anthropic Messages 协议下，对比各渠道参数覆盖；部分渠道通过独立路径或兼容层提供。"
  },
  {
    id: "responses_api",
    tabLabel: "Responses",
    label: "OpenAI Responses API",
    endpoint: "POST /v1/responses",
    evalStatus: "planned",
    copy: "Responses 协议参数对照（参考文档整理）；Noctua 暂未纳入跑批，下表供跨渠道参数差异预览。"
  }
];

const PROTOCOL_CHANNEL_ORDER = [
  "deepseek",
  "moonshot",
  "zhipu",
  "minimax",
  "streamlake",
  "openrouter",
  "aliyun",
  "siliconflow",
  "baidu"
];

// 协议参数分组展示顺序：常用调参靠前，冷门/平台特有靠后
const PROTOCOL_PARAM_CATEGORY_ORDER = [
  "Core",
  "Reasoning",
  "Sampling",
  "Protocol",
  "Length",
  "Output",
  "Debug",
  "Tools",
  "Extra",
  "Beta",
  "Template",
  "Routing",
  "Plugins",
  "Observability",
  "Ignored",
  "Compatibility Probe",
  "Expected Rejected",
  "Content"
];

function protocolParamCategoryRank(category) {
  const index = PROTOCOL_PARAM_CATEGORY_ORDER.indexOf(category);
  return index === -1 ? 400 : index;
}

function isProtocolCompareExcludedParameter(parameter) {
  if (protocolCompareExcludedParameters instanceof Set) {
    return protocolCompareExcludedParameters.has(parameter);
  }
  return Array.isArray(protocolCompareExcludedParameters)
    && protocolCompareExcludedParameters.includes(parameter);
}

const PROTOCOL_CORE_PARAM_ORDER = ["model", "messages", "input", "system", "max_tokens", "models"];

// 采样参数：按常见使用率排序；相近控制项相邻（核采样 → 惩罚 → 确定性/多结果 → 停止词 → 扩展）
const PROTOCOL_SAMPLING_PARAM_ORDER = [
  "temperature",
  "top_p",
  "top_k",
  "min_p",
  "top_a",
  "presence_penalty",
  "frequency_penalty",
  "repetition_penalty",
  "seed",
  "n",
  "stop",
  "stop_sequences",
  "stop_token_ids",
  "include_stop_str_in_output",
  "min_tokens",
  "logit_bias",
  "do_sample"
];

function protocolParamBaseName(parameter) {
  const first = String(parameter).split(".")[0];
  return first.replace(/\[\]$/, "");
}

function protocolParamNameRank(category, parameter) {
  if (category === "Core") {
    const index = PROTOCOL_CORE_PARAM_ORDER.indexOf(protocolParamBaseName(parameter));
    return index === -1 ? 500 : index;
  }
  if (category === "Sampling") {
    const index = PROTOCOL_SAMPLING_PARAM_ORDER.indexOf(parameter);
    return index === -1 ? 500 : index;
  }
  return 1000;
}

function protocolParamGroupKey(item) {
  return `${item.category}\0${item.subgroup || ""}`;
}

function sortProtocolParametersByTree(items, category) {
  if (!items.length) return items;
  const names = items.map((item) => item.parameter);
  const itemByName = new Map(items.map((item) => [item.parameter, item]));

  const roots = names.filter((name) => {
    const parent = protocolParameterParent(name);
    if (!parent) return true;
    return !names.includes(parent);
  });

  roots.sort((a, b) => {
    const rankDiff = protocolParamNameRank(category, a) - protocolParamNameRank(category, b);
    if (rankDiff !== 0) return rankDiff;
    return a.localeCompare(b, "en");
  });

  const ordered = [];
  const visited = new Set();

  function visit(param) {
    if (visited.has(param)) return;
    visited.add(param);
    const item = itemByName.get(param);
    if (item) ordered.push(item);
    const children = names
      .filter((name) => isProtocolParameterDirectChild(name, param, names))
      .sort((a, b) => a.localeCompare(b, "en"));
    for (const child of children) visit(child);
  }

  for (const root of roots) visit(root);
  for (const item of items) {
    if (!visited.has(item.parameter)) ordered.push(item);
  }
  return ordered;
}

function sortProtocolParameterMetaList(items) {
  const groups = new Map();
  for (const item of items) {
    const key = protocolParamGroupKey(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }

  const keys = [...groups.keys()].sort((keyA, keyB) => {
    const [catA, subA] = keyA.split("\0");
    const [catB, subB] = keyB.split("\0");
    const categoryOrder = protocolParamCategoryRank(catA) - protocolParamCategoryRank(catB);
    if (categoryOrder !== 0) return categoryOrder;
    if (subA && subB) {
      const subgroupOrder = paramSubgroupRank(catA, subA) - paramSubgroupRank(catB, subB);
      if (subgroupOrder !== 0) return subgroupOrder;
    }
    return 0;
  });

  const ordered = [];
  for (const key of keys) {
    const [category] = key.split("\0");
    ordered.push(...sortProtocolParametersByTree(groups.get(key), category));
  }
  return ordered;
}

function sortProtocolChannels(channels) {
  const order = new Map(PROTOCOL_CHANNEL_ORDER.map((id, index) => [id, index]));
  return [...channels].sort((a, b) => {
    const aRank = order.has(a.channel_id) ? order.get(a.channel_id) : 999;
    const bRank = order.has(b.channel_id) ? order.get(b.channel_id) : 999;
    if (aRank !== bRank) return aRank - bRank;
    return String(a.name).localeCompare(String(b.name), "zh-CN");
  });
}

function getProtocolCatalogChannels(protocolId) {
  const sources = getProtocolMatrix();
  const ids = sources?.getChannelIdsForProtocol?.(protocolId) || [];
  if (!ids.length) {
    return sortProtocolChannels(
      CHANNEL_TEMPLATES.filter((channel) => {
        const endpoint = channel.endpoints?.[protocolId];
        const evalChannel = sources?.isProtocolEvalChannel?.(channel.channel_id);
        return evalChannel && endpoint && endpoint.supported !== false;
      })
    );
  }
  return sortProtocolChannels(
    ids.map((channelId) => CHANNEL_TEMPLATES.find((item) => item.channel_id === channelId)).filter(Boolean)
  );
}

function buildProtocolParameterMatrix(channels, protocolId) {
  const sources = getProtocolMatrix();
  const channelRows = channels.map((channel) => {
    const docMeta = sources?.getDocMeta?.(channel.channel_id, protocolId) || null;
    const flat = sources?.flattenEntryParameters?.(channel.channel_id, protocolId) || [];
    return {
      channel,
      docMeta,
      flat,
      params: new Set(flat.map((item) => item.parameter)),
      paramRequired: new Map(flat.map((item) => [item.parameter, item.required]))
    };
  });

  const paramMeta = new Map();
  for (const row of channelRows) {
    for (const item of row.flat) {
      if (isProtocolCompareExcludedParameter(item.parameter)) continue;
      const paramKey = `${item.category}::${item.subgroup || ""}::${item.parameter}`;
      if (!paramMeta.has(paramKey)) {
        paramMeta.set(paramKey, {
          category: item.category,
          subgroup: item.subgroup || null,
          parameter: item.parameter,
          channels: new Set(),
          requiredByChannel: new Map()
        });
      }
      const meta = paramMeta.get(paramKey);
      meta.channels.add(row.channel.channel_id);
      meta.requiredByChannel.set(row.channel.channel_id, item.required);
    }
  }

  const parameters = sortProtocolParameterMetaList([...paramMeta.values()]);

  const channelCount = channels.length;
  const universalCount = parameters.filter((item) => item.channels.size === channelCount).length;
  const commonCount = parameters.filter((item) => {
    const coverage = item.channels.size;
    return coverage > channelCount / 2 && coverage < channelCount;
  }).length;
  const partialCount = parameters.filter((item) => item.channels.size > 0 && item.channels.size < channelCount).length;
  const uniqueCount = parameters.filter((item) => item.channels.size === 1).length;
  const missingDocChannels = channelRows.filter((row) => row.docMeta?.docStatus === "missing");
  const partialDocChannels = channelRows.filter((row) => row.docMeta?.docStatus === "partial");

  return {
    channels,
    channelRows,
    parameters,
    channelCount,
    parameterCount: parameters.length,
    universalCount,
    commonCount,
    partialCount,
    uniqueCount,
    missingDocChannels,
    partialDocChannels
  };
}

function renderProtocolDocLinks(docMeta) {
  if (!docMeta) return "";
  const links = [];
  if (docMeta.localDoc) {
    links.push(`<a href="./${escapeHtml(docMeta.localDoc)}" target="_blank" rel="noopener noreferrer">本地整理</a>`);
  }
  if (docMeta.docUrl) {
    links.push(`<a href="${escapeHtml(docMeta.docUrl)}" target="_blank" rel="noopener noreferrer">官方 API</a>`);
  }
  if (!links.length) return "";
  return `<span class="protocol-doc-links">${links.join(" · ")}</span>`;
}

function renderProtocolOfficialApiLink(docMeta) {
  if (!docMeta?.docUrl) return "";
  return `<span class="protocol-doc-links"><a href="${escapeHtml(docMeta.docUrl)}" target="_blank" rel="noopener noreferrer">官方 API</a></span>`;
}

function renderProtocolDocAlerts(matrix, protocolDef) {
  const blocks = [];
  if (matrix.missingDocChannels?.length) {
    blocks.push(`
      <div class="protocol-doc-alert protocol-doc-alert--missing">
        <strong>待补充 API 文档</strong>
        <ul>
          ${matrix.missingDocChannels.map((row) => `
            <li><span class="mono">${escapeHtml(row.channel.name)}</span> — ${escapeHtml(row.docMeta?.notes || "暂无官方参数说明")}</li>
          `).join("")}
        </ul>
      </div>
    `);
  }
  if (matrix.partialDocChannels?.length && !matrix.parameters.length) {
    blocks.push(`
      <div class="protocol-doc-alert protocol-doc-alert--partial">
        <strong>${escapeHtml(protocolDef.tabLabel)} 协议参数待完善</strong>
        <ul>
          ${matrix.partialDocChannels.map((row) => `
            <li><span class="mono">${escapeHtml(row.channel.name)}</span> — ${escapeHtml(row.docMeta?.notes || "文档不完整")} ${renderProtocolDocLinks(row.docMeta)}</li>
          `).join("")}
        </ul>
      </div>
    `);
  }
  return blocks.join("");
}

function renderProtocolParamRequiredLabel(listed, required) {
  if (!listed) return "—";
  return required ? "必填" : "选填";
}

function renderProtocolParamDrawerCell(value, isDiff) {
  const diffClass = isDiff ? " protocol-spec-diff" : "";
  return `<td class="protocol-spec-drawer-cell${diffClass}">${value}</td>`;
}

function renderMessagesRoleGuide() {
  return `
    <section class="protocol-messages-guide" aria-labelledby="protocol-messages-guide-title">
      <h3 id="protocol-messages-guide-title" class="protocol-messages-guide__title">四大消息类型详解</h3>
      <p class="protocol-messages-guide__lead">
        System、User、Assistant、Tool 是 OpenAI、Claude、通义千问、DeepSeek 等接口统一的
        <code>messages</code> 标准成员，各司其职构成完整上下文。
      </p>

      <article class="protocol-messages-guide__card">
        <h4 class="protocol-messages-guide__role">1. System · 系统消息</h4>
        <p class="protocol-messages-guide__tagline">给模型的全局前置指令，优先级最高</p>
        <ul class="protocol-messages-guide__list">
          <li>定义身份、回答风格、格式要求、任务边界与禁止事项，全程约束模型行为</li>
          <li>通常放在消息列表最开头；用户看不到，是后台给模型的底层命令</li>
        </ul>
        <pre class="protocol-messages-guide__code"><code>{
  "role": "system",
  "content": "你是专业数据分析助手，回答必须精简，结果用JSON格式输出，不要多余解释"
}</code></pre>
      </article>

      <article class="protocol-messages-guide__card">
        <h4 class="protocol-messages-guide__role">2. User · 用户消息</h4>
        <p class="protocol-messages-guide__tagline">人类用户提出的问题、需求与输入</p>
        <ul class="protocol-messages-guide__list">
          <li>向模型发起提问、下达任务或补充素材</li>
          <li>一般紧跟在系统消息或历史回复之后</li>
        </ul>
        <pre class="protocol-messages-guide__code"><code>{
  "role": "user",
  "content": "帮我计算25*36，并输出JSON结果"
}</code></pre>
      </article>

      <article class="protocol-messages-guide__card">
        <h4 class="protocol-messages-guide__role">3. Assistant · 助手消息</h4>
        <p class="protocol-messages-guide__tagline">模型生成的回答，或历史回复回填上下文</p>
        <ul class="protocol-messages-guide__list">
          <li><strong>普通对话</strong>：直接输出文字回答</li>
          <li><strong>工具调用</strong>：携带 <code>tool_calls</code>，告知客户端要调用哪个函数及参数</li>
        </ul>
        <p class="protocol-messages-guide__subhead">普通回复</p>
        <pre class="protocol-messages-guide__code"><code>{
  "role": "assistant",
  "content": "25乘以36的结果是900"
}</code></pre>
        <p class="protocol-messages-guide__subhead">工具调用（无 content，带 tool_calls）</p>
        <pre class="protocol-messages-guide__code"><code>{
  "role": "assistant",
  "content": null,
  "tool_calls": [{
    "id": "xxx",
    "type": "function",
    "function": {
      "name": "calc",
      "arguments": "{\\"a\\":25,\\"b\\":36}"
    }
  }]
}</code></pre>
      </article>

      <article class="protocol-messages-guide__card">
        <h4 class="protocol-messages-guide__role">4. Tool · 工具消息</h4>
        <p class="protocol-messages-guide__tagline">客户端执行工具后，把运行结果回传给模型</p>
        <ul class="protocol-messages-guide__list">
          <li>前提：上一条 Assistant 消息已发起 <code>tool_calls</code></li>
          <li><code>tool_call_id</code> 必须与对应 <code>tool_calls[].id</code> 一一匹配</li>
          <li>模型据此结合外部数据整理最终答案</li>
        </ul>
        <pre class="protocol-messages-guide__code"><code>{
  "role": "tool",
  "tool_call_id": "xxx",
  "content": "计算结果：900"
}</code></pre>
      </article>

      <div class="protocol-messages-guide__flow">
        <h4 class="protocol-messages-guide__subhead">一轮完整工具调用顺序</h4>
        <ol class="protocol-messages-guide__steps">
          <li><strong>System</strong> → 设定助手规则</li>
          <li><strong>User</strong> → 用户提问</li>
          <li><strong>Assistant</strong> → 模型判断需调用工具，下发调用指令</li>
          <li><strong>Tool</strong> → 程序执行工具，把结果回传</li>
          <li><strong>Assistant</strong> → 模型结合工具数据，输出最终答案</li>
        </ol>
      </div>

      <dl class="protocol-messages-guide__mnemonic">
        <div><dt>System</dt><dd>定规矩、定人设的后台指令</dd></div>
        <div><dt>User</dt><dd>人说话、提需求</dd></div>
        <div><dt>Assistant</dt><dd>AI 说话 / AI 说要调用工具</dd></div>
        <div><dt>Tool</dt><dd>工具跑完，把结果还给 AI</dd></div>
      </dl>

      <details class="protocol-messages-guide__example">
        <summary>查看完整 JSON 样例（含一轮工具调用）</summary>
        <pre class="protocol-messages-guide__code"><code>{
  "model": "gpt-4o",
  "messages": [
    { "role": "system", "content": "你是计算助手，结果用 JSON 返回" },
    { "role": "user", "content": "帮我计算 25*36" },
    {
      "role": "assistant",
      "content": null,
      "tool_calls": [{
        "id": "call_1",
        "type": "function",
        "function": { "name": "calc", "arguments": "{\\"a\\":25,\\"b\\":36}" }
      }]
    },
    { "role": "tool", "tool_call_id": "call_1", "content": "900" },
    { "role": "assistant", "content": "{\\"result\\":900}" }
  ],
  "tools": [{
    "type": "function",
    "function": {
      "name": "calc",
      "description": "两数相乘",
      "parameters": {
        "type": "object",
        "properties": { "a": { "type": "number" }, "b": { "type": "number" } },
        "required": ["a", "b"]
      }
    }
  }]
}</code></pre>
      </details>
    </section>
  `;
}

function protocolParamDrawerSupplement(parameter) {
  if (parameter === "messages") return renderMessagesRoleGuide();
  return "";
}

function buildProtocolParamDrawerData(protocolId, parameter, matrix, paramItem) {
  const specsApi = getProtocolMatrix();
  if (!specsApi) return null;

  const entries = matrix.channels.map((channel) => {
    const listed = paramItem.channels.has(channel.channel_id);
    const required = paramItem.requiredByChannel.get(channel.channel_id);
    const spec = listed ? specsApi.getSpec(channel.channel_id, protocolId, parameter) : null;
    return { channel, listed, required, spec };
  });

  const consensus = specsApi.buildSpecConsensus(
    entries.filter((item) => item.listed).map((item) => ({
      channelId: item.channel.channel_id,
      spec: item.spec
    }))
  );

  const baseline = specsApi.getOpenAiBaseline(protocolId, parameter);
  const meaning = parameterDescription(parameter, protocolId);
  const consensusDetail = consensus.consensusSpec
    ? specsApi.formatSpecShort(consensus.consensusSpec, parameter)
    : null;
  const consensusLine = consensusDetail && consensus.consensusCount
    ? `${consensus.consensusCount}/${consensus.documentedCount} 渠道约束一致 · ${consensusDetail}`
    : consensus.documentedCount
      ? `${consensus.documentedCount} 个渠道已整理，约束尚未形成多数共识`
      : "约束详情待补充";
  const baselineLine = baseline ? specsApi.formatSpecShort(baseline, parameter) : null;
  const outlierByChannel = new Map(
    (consensus.outliers || []).map((item) => [item.channelId, item.diffFields])
  );

  return {
    specsApi,
    entries,
    consensus,
    meaning,
    consensusLine,
    baselineLine,
    outlierByChannel
  };
}

function renderProtocolParamDrawerSummary(drawerData) {
  if (!drawerData) {
    return `<p class="guide-copy">约束数据模块未加载。</p>`;
  }
  const { meaning, consensusLine, baselineLine, consensus } = drawerData;
  const outlierCount = consensus?.outliers?.length || 0;
  return `
    <div class="protocol-spec-drawer-meta">
      ${meaning ? `<p class="protocol-spec-drawer-meaning">${escapeHtml(meaning)}</p>` : ""}
      <p class="protocol-spec-drawer-consensus">
        <span class="protocol-spec-consensus-badge">共识</span>
        ${escapeHtml(consensusLine)}
      </p>
      ${outlierCount ? `<p class="protocol-spec-drawer-outlier-note">${outlierCount} 个渠道与多数约束不一致</p>` : ""}
      ${baselineLine ? `<p class="protocol-spec-drawer-baseline"><span class="muted">OpenAI 参考</span> · ${escapeHtml(baselineLine)}</p>` : ""}
    </div>
  `;
}

function renderProtocolParamDrawerTableBody(protocolId, parameter, drawerData) {
  if (!drawerData) return "";
  const { specsApi, entries, outlierByChannel } = drawerData;
  const rows = entries.map(({ channel, listed, required, spec }) => {
    const diffFields = outlierByChannel.get(channel.channel_id) || [];
    const isOutlier = diffFields.length > 0;
    const typeText = !listed
      ? "—"
      : spec
        ? escapeHtml(specsApi.formatType(spec))
        : '<span class="protocol-spec-pending">文档未整理</span>';
    const defaultText = !listed || !spec ? "—" : escapeHtml(specsApi.formatDefault(spec));
    const rangeText = !listed || !spec ? "—" : escapeHtml(specsApi.formatRange(spec));
    const enumText = !listed || !spec
      ? "—"
      : (() => {
          const formatted = specsApi.formatEnum(spec, parameter);
          return formatted === "—" ? "—" : `<code class="protocol-spec-enum">${escapeHtml(formatted)}</code>`;
        })();
    const statusText = escapeHtml(renderProtocolParamRequiredLabel(listed, required));
    const effectiveText = spec ? escapeHtml(specsApi.formatEffective(spec)) : "—";
    const notesText = spec?.notes ? escapeHtml(spec.notes) : "—";

    return `
      <tr class="${isOutlier ? "protocol-spec-drawer-row--outlier" : ""}">
        <th scope="row" class="protocol-spec-drawer-channel">
          <span class="protocol-spec-drawer-channel-inner">
            <img src="${escapeHtml(channel.logo)}" alt="" width="16" height="16" />
            <span>${escapeHtml(channel.name)}</span>
          </span>
        </th>
        ${renderProtocolParamDrawerCell(typeText, diffFields.includes("type"))}
        ${renderProtocolParamDrawerCell(defaultText, diffFields.includes("default"))}
        ${renderProtocolParamDrawerCell(enumText, diffFields.includes("enum"))}
        ${renderProtocolParamDrawerCell(rangeText, diffFields.includes("range"))}
        ${renderProtocolParamDrawerCell(statusText, false)}
        ${renderProtocolParamDrawerCell(effectiveText, diffFields.includes("effective"))}
        <td class="protocol-spec-drawer-cell protocol-spec-drawer-notes">${notesText}</td>
      </tr>
    `;
  }).join("");

  return `
    <div class="protocol-spec-drawer-table-wrap">
      <table class="protocol-spec-drawer-table">
        <thead>
          <tr>
            <th scope="col">渠道</th>
            <th scope="col">类型</th>
            <th scope="col">默认</th>
            <th scope="col">枚举值</th>
            <th scope="col">边界</th>
            <th scope="col">状态</th>
            <th scope="col">生效</th>
            <th scope="col">备注</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    ${protocolParamDrawerSupplement(parameter)}
  `;
}

function openProtocolParamDrawer(protocolId, parameter, category = "") {
  if (!els.protocolParamDrawer) return;
  const matrix = state.protocolMatrices?.[protocolId];
  if (!matrix) return;
  const paramItem = matrix.parameters.find((item) =>
    item.parameter === parameter && (!category || item.category === category)
  );
  if (!paramItem) return;

  const drawerData = buildProtocolParamDrawerData(protocolId, parameter, matrix, paramItem);
  state.protocolParamDrawerOpen = true;
  if (els.protocolParamDrawerTitle) {
    els.protocolParamDrawerTitle.textContent = parameter;
  }
  if (els.protocolParamDrawerSummary) {
    els.protocolParamDrawerSummary.innerHTML = renderProtocolParamDrawerSummary(drawerData);
  }
  if (els.protocolParamDrawerBody) {
    els.protocolParamDrawerBody.innerHTML = renderProtocolParamDrawerTableBody(protocolId, parameter, drawerData);
  }
  els.protocolParamDrawer.classList.remove("is-hidden");
  els.protocolParamDrawer.setAttribute("aria-hidden", "false");
  document.body.classList.add("protocol-drawer-open");
}

function closeProtocolParamDrawer() {
  if (!els.protocolParamDrawer) return;
  state.protocolParamDrawerOpen = false;
  els.protocolParamDrawer.classList.add("is-hidden");
  els.protocolParamDrawer.setAttribute("aria-hidden", "true");
  if (els.protocolParamDrawerSummary) els.protocolParamDrawerSummary.innerHTML = "";
  if (els.protocolParamDrawerBody) els.protocolParamDrawerBody.innerHTML = "";
  document.body.classList.remove("protocol-drawer-open");
}

function bindProtocolParamDrawer() {
  if (!els.protocolParamDrawer) return;
  els.protocolParamDrawer.querySelectorAll("[data-protocol-param-drawer-dismiss]").forEach((node) => {
    node.addEventListener("click", closeProtocolParamDrawer);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state.protocolParamDrawerOpen) {
      closeProtocolParamDrawer();
    }
  });
}

function bindProtocolParamDrawerRows() {
  if (!els.protocolCatalog) return;
  const openFromCell = (cell) => {
    const row = cell.closest("[data-protocol-param-row]");
    if (!row) return;
    const protocolId = row.dataset.protocolId;
    const parameter = row.dataset.parameter;
    const category = row.dataset.protocolSectionCategory;
    if (protocolId && parameter) openProtocolParamDrawer(protocolId, parameter, category);
  };
  els.protocolCatalog.querySelectorAll("[data-protocol-param-open]").forEach((cell) => {
    cell.addEventListener("click", (event) => {
      if (event.target.closest("[data-protocol-param-tree-toggle]")) return;
      openFromCell(cell);
    });
    cell.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openFromCell(cell);
    });
  });
}

function renderProtocolParameterCoverageCell(supported, required, { channelId = "", protocolId = "chat_completions", parameter = "" } = {}) {
  if (!supported) {
    const observedOnly = observedThinkingEffectiveness(channelId, protocolId, parameter);
    if (observedOnly === "doc_gap" || observedOnly === "effective") {
      const observedBadge = renderProtocolObservedBadge(observedOnly, { channelId, protocolId, parameter });
      return `<td class="channel-protocol-cell protocol-param-cell protocol-param-cell--observed-only">${observedBadge}</td>`;
    }
    return `<td class="channel-protocol-cell protocol-param-cell protocol-param-cell--missing"><span class="protocol-dash" aria-hidden="true">—</span></td>`;
  }
  const modifier = "";
  const reqLabel = required ? "必填" : "选填";
  const reqClass = required ? "protocol-param-req--required" : "protocol-param-req--optional";
  const observed = observedThinkingEffectiveness(channelId, protocolId, parameter);
  const observedBadge = observed ? renderProtocolObservedBadge(observed, { channelId, protocolId, parameter }) : "";
  return `<td class="channel-protocol-cell protocol-param-cell protocol-param-cell--present${modifier}"><span class="protocol-param-cell-stack"><span class="protocol-param-req ${reqClass}" title="官方文档：${reqLabel}">${reqLabel}</span>${observedBadge}</span></td>`;
}

function observedThinkingApi() {
  return window.NOCTUA_THINKING_OBSERVED || null;
}

function observedThinkingEffectiveness(channelId, protocolId, parameter) {
  const api = observedThinkingApi();
  if (!api || !channelId || !parameter) return null;
  return api.getEffectiveness(channelId, protocolId, parameter);
}

function thinkingEffectivenessShortLabel(value) {
  return {
    effective: "实测有效",
    accepted_ineffective: "接受无效",
    rejected: "拒绝",
    unproven: "未证明",
    default_on: "默认开",
    doc_gap: "文档缺口"
  }[value] || "";
}

function renderProtocolObservedBadge(value, { channelId = "", protocolId = "chat_completions", parameter = "" } = {}) {
  const label = thinkingEffectivenessShortLabel(value) || thinkingEffectivenessLabel(value);
  if (!label) return "";
  const effort = observedThinkingApi()?.getEffortProfile(channelId, protocolId, parameter);
  let title = `实测：${thinkingEffectivenessLabel(value)}`;
  if (effort?.default_effort?.value) {
    title += `；默认 effort=${effort.default_effort.value}`;
  }
  if (effort?.mappings?.length) {
    title += `；映射 ${effort.mappings.map((m) => `${m.from}→${m.to}`).join(", ")}`;
  }
  return `<span class="protocol-param-observed protocol-param-observed--${escapeHtml(value)}" title="${escapeHtml(title)}">${escapeHtml(label)}</span>`;
}

function protocolParamCoverageTier(coverage, channelCount) {
  if (channelCount <= 0 || coverage <= 0) return "none";
  if (coverage === channelCount) return "universal";
  if (coverage === 1) return "unique";
  if (coverage > channelCount / 2) return "common";
  return "sparse";
}

function protocolParamRowCoverageClass(coverage, channelCount) {
  const tier = protocolParamCoverageTier(coverage, channelCount);
  if (tier === "universal") return "protocol-param-row protocol-param-row--universal";
  if (tier === "common") return "protocol-param-row protocol-param-row--common";
  if (tier === "unique" || tier === "sparse") return "protocol-param-row protocol-param-row--rare";
  return "protocol-param-row";
}

function protocolParameterSegments(parameter) {
  return String(parameter).split(".").filter(Boolean);
}

function protocolParameterDepth(parameter) {
  return Math.max(0, protocolParameterSegments(parameter).length - 1);
}

function protocolParameterParent(parameter) {
  const segments = protocolParameterSegments(parameter);
  if (segments.length <= 1) return "";
  return segments.slice(0, -1).join(".");
}

function protocolParameterNestedDisplayName(parameter) {
  const segments = protocolParameterSegments(parameter);
  if (segments.length <= 1) return segments[0] || parameter;
  const leaf = segments[segments.length - 1];
  if (segments.length === 2) return leaf;
  const parentSeg = segments[segments.length - 2];
  if (leaf.includes("=") || parentSeg.endsWith("[]")) {
    return leaf;
  }
  const parent = parentSeg.replace(/\[\]$/, "");
  return `${parent}.${leaf}`;
}

function renderProtocolParamTreeChevron(parameter, { hasChildren = false, treeExpanded = false, protocolId = "" } = {}) {
  if (!hasChildren) {
    return '<span class="protocol-param-tree-spacer" aria-hidden="true"></span>';
  }
  return `
    <button
      type="button"
      class="protocol-param-tree-toggle"
      data-protocol-param-tree-toggle
      data-protocol-id="${escapeHtml(protocolId)}"
      data-parameter="${escapeHtml(parameter)}"
      aria-expanded="${treeExpanded ? "true" : "false"}"
      aria-label="${treeExpanded ? "收起" : "展开"} ${escapeHtml(parameter)} 子字段"
    >
      <span class="protocol-param-tree-chevron protocol-param-section-chevron${treeExpanded ? "" : " is-collapsed"}" aria-hidden="true">›</span>
    </button>
  `;
}

function renderProtocolParameterChildCountBadge(count) {
  if (!count) return "";
  return `<span class="protocol-param-child-count" title="直接子字段 ${count} 个">· ${count}</span>`;
}

function renderProtocolParameterNameCell(parameter, {
  hasChildren = false,
  treeExpanded = false,
  protocolId = "",
  directChildCount = 0
} = {}) {
  const depth = protocolParameterDepth(parameter);
  const chevron = renderProtocolParamTreeChevron(parameter, { hasChildren, treeExpanded, protocolId });
  const childBadge = hasChildren ? renderProtocolParameterChildCountBadge(directChildCount) : "";

  if (depth === 0) {
    return `
      <span class="protocol-param-row-label${hasChildren ? " protocol-param-row-label--branch" : ""}">
        ${chevron}
        <span class="protocol-param-fullpath mono">${escapeHtml(parameter)}</span>${childBadge}
      </span>
    `;
  }

  const displayName = protocolParameterNestedDisplayName(parameter);
  return `
    <span
      class="protocol-param-row-label protocol-param-row-label--nested${hasChildren ? " protocol-param-row-label--branch" : ""}"
      data-depth="${depth}"
      title="${escapeHtml(parameter)}"
    >
      <span class="protocol-param-tree" aria-hidden="true">
        ${Array.from({ length: depth }, (_, index) => `
          <span class="protocol-param-tree-gutter${index === depth - 1 ? " protocol-param-tree-gutter--branch" : ""}"></span>
        `).join("")}
      </span>
      ${chevron}
      <span class="protocol-param-leaf mono">${escapeHtml(displayName)}</span>${childBadge}
    </span>
  `;
}

function renderProtocolParameterMatrix(matrix, protocolDef) {
  if (!matrix.channels.length) {
    return `<p class="guide-copy">当前暂无已接入 ${escapeHtml(protocolDef.tabLabel)} 协议的测评渠道。</p>`;
  }

  const docAlerts = renderProtocolDocAlerts(matrix, protocolDef);
  if (!matrix.parameters.length) {
    return `${docAlerts}<p class="guide-copy">该协议下尚无已对照文档的参数矩阵；请按上方提示补充 API 文档后继续整理。</p>`;
  }

  const channelMetaById = new Map((matrix.channelRows || []).map((row) => [row.channel.channel_id, row.docMeta]));
  const headerCells = matrix.channels.map((channel) => {
    const docMeta = channelMetaById.get(channel.channel_id);
    return `
    <th scope="col" class="protocol-param-channel-head">
      <div class="protocol-param-channel-stack">
        <span class="protocol-param-channel">
          <img src="${escapeHtml(channel.logo)}" alt="" width="18" height="18" />
          <span>${escapeHtml(channel.name)}</span>
        </span>
        ${renderProtocolOfficialApiLink(docMeta)}
      </div>
    </th>
  `;
  }).join("");

  let currentCategory = "";
  let currentSubgroup = "";
  let dialectRendered = false;
  const parameterNames = matrix.parameters.map((item) => item.parameter);
  const parameterParents = buildProtocolParameterParentsSet(parameterNames);
  const parameterAncestors = buildProtocolParameterAncestorsMap(parameterNames);
  const parameterDirectChildren = buildProtocolParameterDirectChildrenMap(parameterNames);
  const bodyRows = matrix.parameters.map((item) => {
    const origin = MOCK_PARAMETER_ORIGINS[item.parameter] || "provider-private";
    const coverage = item.channels.size;
    const rowClass = protocolParamRowCoverageClass(coverage, matrix.channelCount);

    let categoryRow = "";
    if (item.category !== currentCategory) {
      currentCategory = item.category;
      currentSubgroup = "";
      const categoryKey = protocolParamCategorySectionKey(protocolDef.id, item.category);
      categoryRow = `
        <tr class="protocol-param-group-row" data-protocol-section-category="${escapeHtml(item.category)}">
          <th scope="rowgroup" colspan="${matrix.channels.length + 3}">
            ${renderProtocolParamSectionToggleButton(
              categoryKey,
              renderProtocolParamGroupHeading(item.category, { showHint: item.category === "Reasoning" || item.category === "Output" }),
              { level: "category" }
            )}
          </th>
        </tr>
      `;
      if (item.category === "Reasoning" && !dialectRendered) {
        dialectRendered = true;
        categoryRow += renderThinkingDialectSummary(matrix.channels, protocolDef.id);
      }
    }

    let subgroupRow = "";
    if (item.subgroup && item.subgroup !== currentSubgroup) {
      currentSubgroup = item.subgroup;
      const subgroupKey = protocolParamSubgroupSectionKey(protocolDef.id, item.category, item.subgroup);
      const subgroupCollapsedClass = protocolParamSectionCollapsedClass(protocolDef.id, item.category);
      subgroupRow = `
        <tr
          class="protocol-param-subgroup-row ${subgroupCollapsedClass}"
          data-protocol-section-category="${escapeHtml(item.category)}"
          data-protocol-section-subgroup="${escapeHtml(item.subgroup)}"
        >
          <th scope="rowgroup" colspan="${matrix.channels.length + 3}">
            ${renderProtocolParamSectionToggleButton(
              subgroupKey,
              renderProtocolParamSubgroupHeading(item.category, item.subgroup),
              { level: "subgroup" }
            )}
          </th>
        </tr>
      `;
    }

    const meaning = parameterDescription(item.parameter, protocolDef.id);
    const depth = protocolParameterDepth(item.parameter);
    const nestedClass = depth > 0 ? " protocol-param-row--nested" : "";
    const hasChildren = parameterParents.has(item.parameter);
    const directChildCount = (parameterDirectChildren.get(item.parameter) || []).length;
    const treeExpanded = isProtocolParameterTreeExpanded(protocolDef.id, item.parameter);
    const treeAncestors = (parameterAncestors.get(item.parameter) || []).join(",");
    const sectionCollapsedClass = protocolParamSectionCollapsedClass(
      protocolDef.id,
      item.category,
      item.subgroup || ""
    );
    return `
      ${categoryRow}
      ${subgroupRow}
      <tr
        class="${rowClass} protocol-param-row--openable${nestedClass} ${sectionCollapsedClass}"
        data-protocol-param-row
        data-protocol-id="${escapeHtml(protocolDef.id)}"
        data-protocol-section-category="${escapeHtml(item.category)}"
        data-protocol-section-subgroup="${escapeHtml(item.subgroup || "")}"
        data-parameter="${escapeHtml(item.parameter)}"
        data-depth="${depth}"
        data-protocol-tree-ancestors="${escapeHtml(treeAncestors)}"
      >
        <th
          scope="row"
          class="protocol-param-name protocol-param-sticky-col protocol-param-sticky-col--1 mono protocol-param-name--openable"
          data-protocol-param-open
          tabindex="0"
          role="button"
          aria-label="查看 ${escapeHtml(item.parameter)} 约束对比"
        >
          ${renderProtocolParameterNameCell(item.parameter, {
            hasChildren,
            treeExpanded,
            protocolId: protocolDef.id,
            directChildCount
          })}
        </th>
        <td
          class="protocol-param-meaning protocol-param-sticky-col protocol-param-sticky-col--2 protocol-param-meaning--openable"
          data-protocol-param-open
          tabindex="0"
          role="button"
          aria-label="查看 ${escapeHtml(item.parameter)} 约束对比"
        >${meaning ? escapeHtml(meaning) : '<span class="protocol-dash" aria-hidden="true">—</span>'}</td>
        <td class="protocol-param-origin">${escapeHtml(originLabel(origin))}</td>
        ${matrix.channels.map((channel) => renderProtocolParameterCoverageCell(
          item.channels.has(channel.channel_id),
          item.requiredByChannel.get(channel.channel_id),
          {
            channelId: channel.channel_id,
            protocolId: protocolDef.id,
            parameter: item.parameter
          }
        )).join("")}
      </tr>
    `;
  }).join("");

  return `
    ${docAlerts}
    <div class="protocol-param-summary">
      <span><strong>${matrix.parameterCount}</strong> 个参数</span>
      <span><strong>${matrix.channelCount}</strong> 个渠道</span>
      <span class="protocol-param-summary-focus"><strong>${matrix.universalCount}</strong> 个全渠道支持</span>
      <span class="protocol-param-summary-focus"><strong>${matrix.commonCount}</strong> 个多数渠道支持</span>
      <span class="protocol-param-summary-muted"><strong>${matrix.uniqueCount}</strong> 个单渠道独有</span>
      ${renderProtocolParamMatrixToolbar(protocolDef.id, matrix)}
    </div>
    <div class="protocol-param-matrix-wrap">
      <table class="protocol-param-matrix">
        <colgroup>
          <col class="protocol-param-col protocol-param-col--name" />
          <col class="protocol-param-col protocol-param-col--meaning" />
          <col class="protocol-param-col protocol-param-col--origin" />
          ${matrix.channels.map(() => '<col class="protocol-param-col protocol-param-col--channel" />').join("")}
        </colgroup>
        <thead>
          <tr>
            <th scope="col" class="protocol-param-sticky-col protocol-param-sticky-col--1">参数</th>
            <th scope="col" class="protocol-param-sticky-col protocol-param-sticky-col--2">含义</th>
            <th scope="col">来源</th>
            ${headerCells}
          </tr>
        </thead>
        <tbody>${bodyRows}</tbody>
      </table>
    </div>
    <details class="channel-catalog-legend protocol-param-legend">
      <summary><span class="protocol-param-req protocol-param-req--required">必填</span> / <span class="protocol-param-req protocol-param-req--optional">选填</span> / <span class="protocol-dash">—</span> 未列入 · 图例与操作说明</summary>
      <div class="protocol-param-legend-inner">
        <span><span class="protocol-param-req protocol-param-req--required">必填</span> 官方文档标注为必填</span>
        <span><span class="protocol-param-req protocol-param-req--optional">选填</span> 官方文档已列入、非必填</span>
        <span><span class="protocol-dash">—</span> 该渠道文档未列入</span>
        <span class="protocol-param-legend-diff">绿色行 = 全部对比渠道文档化；浅绿行 = 过半数渠道文档化</span>
        <span class="protocol-param-legend-diff">淡化行 = 仅少数或单渠道文档化（扩展/私有参数）</span>
        <span class="protocol-param-legend-diff">角标为 thinking 实测结论：实测有效 / 接受无效 / 文档缺口（来自 thinking-observed.json）</span>
        <span class="protocol-param-legend-diff">有子字段的参数默认收起，点击行首 › 可展开 / 收起</span>
        <span class="protocol-param-legend-diff">点击分组标题可单独收起 / 展开各模块</span>
        <span class="protocol-param-legend-diff">点击参数名或含义列查看类型 / 默认 / 边界约束对比</span>
      </div>
    </details>
  `;
}

function renderChannelProtocolTags(platformProtocols, protocolColumns) {
  if (!platformProtocols) return "";
  const tags = (protocolColumns || [])
    .filter((column) => platformProtocols[column.id])
    .map((column) => {
      const label = CHANNEL_PROTOCOL_TAG_LABELS[column.id] || column.label;
      return `<span class="channel-protocol-tag" title="${escapeHtml(column.label)}">${escapeHtml(label)}</span>`;
    })
    .join("");
  if (!tags) return "";
  return `<span class="channel-protocol-tags" aria-label="渠道已接入协议">${tags}</span>`;
}

function renderChannelCatalogRows(items, protocolColumns) {
  return items.map((item) => {
    const subtitle = item.models || item.modelId || "";
    return `
    <tr>
      <td>
        <strong class="${subtitle ? "" : "mono"}">${escapeHtml(item.name)}</strong>
        ${subtitle ? `<div class="channel-series-models mono">${escapeHtml(subtitle)}</div>` : ""}
      </td>
      ${protocolColumns.map((column) => `
        <td class="channel-protocol-cell">${renderProtocolCell(Boolean(item.protocols?.[column.id]))}</td>
      `).join("")}
    </tr>
  `;
  }).join("");
}

function renderChannelVendorBlocks(platforms, protocolColumns, { showFocus = false, rowLabel = "模型系列", itemsKey = "series" } = {}) {
  const expanded = Boolean(state.channelCatalogExpanded);
  return (platforms || []).map((platform) => {
    const items = platform[itemsKey] || platform.series || platform.models || [];
    const rows = renderChannelCatalogRows(items, protocolColumns);
    const protocolTags = renderChannelProtocolTags(platform.platformProtocols, protocolColumns);
    const focusBadge = showFocus && platform.focus
      ? `<span class="channel-focus-badge">测评重点</span>`
      : "";
    const toolLink = platform.channel_id
      ? `<button type="button" class="btn btn-ghost btn-xs channel-open-tool" data-channel-id="${escapeHtml(platform.channel_id)}">在测评工具中打开</button>`
      : "";
    const body = expanded
      ? `
        <div class="channel-catalog-wrap">
          <table class="channel-catalog">
            <thead>
              <tr>
                <th scope="col">${escapeHtml(rowLabel)}</th>
                ${protocolColumns.map((column) => `
                  <th scope="col" class="channel-protocol-head">${escapeHtml(column.label)}</th>
                `).join("")}
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        ${platform.protocolScopeNote ? `<p class="guide-copy channel-protocol-scope-note">${escapeHtml(platform.protocolScopeNote)}</p>` : ""}
      `
      : "";
    return `
      <div class="channel-vendor-block ${showFocus && platform.focus ? "is-focus" : ""}">
        <div class="channel-vendor-head">
          <span class="channel-vendor-logo"><img src="${escapeHtml(platform.logo)}" alt="" width="24" height="24" /></span>
          <strong>${escapeHtml(platform.name)}</strong>
          ${protocolTags}
          ${focusBadge}
          ${toolLink}
        </div>
        ${body}
      </div>
    `;
  }).join("");
}

function bindChannelCatalogExpandToggle() {
  const button = els.channelCatalog?.querySelector("[data-channel-expand-toggle]");
  if (!button) return;
  button.addEventListener("click", () => {
    state.channelCatalogExpanded = !state.channelCatalogExpanded;
    renderChannelCatalog();
  });
}

function bindChannelCatalogTabs() {
  if (!els.channelCatalog) return;
  els.channelCatalog.querySelectorAll("[data-channel-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      const tab = button.dataset.channelTab;
      if (!tab || tab === state.channelCatalogTab) return;
      state.channelCatalogTab = tab;
      renderChannelCatalog();
    });
  });
}

function bindChannelOpenToolButtons() {
  if (!els.channelCatalog) return;
  els.channelCatalog.querySelectorAll(".channel-open-tool").forEach((button) => {
    button.addEventListener("click", () => {
      const channelId = button.dataset.channelId;
      if (!channelId) return;
      state.selectedChannelId = channelId;
      setActiveView("run-v02");
      history.replaceState(null, "", "#run-v02");
      renderChannels();
      renderSelectedChannel();
      showToast(`已切换到 ${channelId} 渠道模板。`);
    });
  });
}

function renderChannelCatalog() {
  const catalog = window.NOCTUA_CHANNEL_CATALOG;
  if (!catalog || !els.channelCatalog) return;

  const tabIds = ["oem", "deploy", "route"];
  const activeTab = tabIds.includes(state.channelCatalogTab) ? state.channelCatalogTab : "oem";
  state.channelCatalogTab = activeTab;

  if (els.channelScopeNote) {
    const modelCount = window.NOCTUA_CHANNEL_CATALOG?.getEvalModelIds?.()?.length
      || window.NOCTUA_CHANNEL_CATALOG?.evalModelIds?.length
      || 7;
    els.channelScopeNote.textContent =
      `渠道名称旁标签表示平台已接入的协议；展开后为 ${modelCount} 个测评模型在该渠道的协议支持矩阵。`;
  }

  const protocolColumns = catalog.protocolColumns || [];
  const tabCopy = catalog.tabCopy || {};
  const expanded = Boolean(state.channelCatalogExpanded);
  const legend = `
    <p class="channel-catalog-legend">
      <span><span class="protocol-tick">✓</span> 模型支持</span>
      <span><span class="protocol-dash">—</span> 模型不支持</span>
      <span class="muted">（展开表格为模型级，与标题旁渠道标签无关）</span>
    </p>
  `;

  const oemBlocks = renderChannelVendorBlocks(catalog.oemPlatforms, protocolColumns, {
    showFocus: false,
    rowLabel: "模型",
    itemsKey: "models"
  });
  const deployBlocks = renderChannelVendorBlocks(catalog.deployPlatforms, protocolColumns, {
    showFocus: true,
    rowLabel: "模型",
    itemsKey: "models"
  });
  const routeBlocks = renderChannelVendorBlocks(catalog.routePlatforms, protocolColumns, {
    showFocus: true,
    rowLabel: "模型",
    itemsKey: "models"
  });

  els.channelCatalog.innerHTML = `
    <section class="panel channel-catalog-panel">
      <div class="channel-catalog-head">
        <div class="channel-catalog-tabs endpoint-tabs" role="tablist" aria-label="渠道清单类型">
          <button type="button" class="${activeTab === "oem" ? "on" : ""}" data-channel-tab="oem" aria-selected="${activeTab === "oem"}">模型原厂调用（部署）</button>
          <button type="button" class="${activeTab === "deploy" ? "on" : ""}" data-channel-tab="deploy" aria-selected="${activeTab === "deploy"}">其他平台调用（部署）</button>
          <button type="button" class="${activeTab === "route" ? "on" : ""}" data-channel-tab="route" aria-selected="${activeTab === "route"}">其他平台调用（仅路由）</button>
        </div>
        <button type="button" class="btn btn-secondary btn-xs channel-expand-toggle" data-channel-expand-toggle="1">${expanded ? "收起" : "展开"}</button>
      </div>

      <div class="channel-tab-panel ${activeTab === "oem" ? "" : "is-hidden"}" data-channel-panel="oem">
        <p class="guide-copy">${escapeHtml(tabCopy.oem || "模型原厂开放平台部署模型清单。")}</p>
        <div class="channel-vendor-list">${oemBlocks}</div>
        ${legend}
      </div>

      <div class="channel-tab-panel ${activeTab === "deploy" ? "" : "is-hidden"}" data-channel-panel="deploy">
        <p class="guide-copy">${escapeHtml(tabCopy.deploy || "其他平台部署托管模型清单。")}</p>
        <div class="channel-vendor-list">${deployBlocks}</div>
        ${legend}
      </div>

      <div class="channel-tab-panel ${activeTab === "route" ? "" : "is-hidden"}" data-channel-panel="route">
        <p class="guide-copy">${escapeHtml(tabCopy.route || "其他平台仅路由模型清单。")}</p>
        <div class="channel-vendor-list">${routeBlocks}</div>
        ${legend}
      </div>
    </section>
  `;

  bindChannelCatalogExpandToggle();
  bindChannelCatalogTabs();
  bindChannelOpenToolButtons();
}

function renderProtocolEvalStatus(status) {
  if (status === "supported") {
    return `<span class="protocol-status protocol-status--supported">已支持评测</span>`;
  }
  return `<span class="protocol-status protocol-status--planned">暂未支持评测</span>`;
}

function ensureProtocolCompareChannelOrder(protocolId, channels) {
  const channelIds = channels.map((channel) => channel.channel_id);
  let order = state.protocolCompareChannelOrder[protocolId];
  if (!Array.isArray(order)) {
    order = PROTOCOL_CHANNEL_ORDER.filter((channelId) => channelIds.includes(channelId));
    channelIds.forEach((channelId) => {
      if (!order.includes(channelId)) order.push(channelId);
    });
    state.protocolCompareChannelOrder[protocolId] = order;
    return order;
  }
  order = order.filter((channelId) => channelIds.includes(channelId));
  channelIds.forEach((channelId) => {
    if (!order.includes(channelId)) order.push(channelId);
  });
  state.protocolCompareChannelOrder[protocolId] = order;
  return order;
}

function orderProtocolCatalogChannels(protocolId, channels) {
  const order = ensureProtocolCompareChannelOrder(protocolId, channels);
  const channelById = new Map(channels.map((channel) => [channel.channel_id, channel]));
  return order.map((channelId) => channelById.get(channelId)).filter(Boolean);
}

function moveProtocolCompareChannelOrder(protocolId, fromChannelId, toChannelId) {
  if (!fromChannelId || !toChannelId || fromChannelId === toChannelId) return;
  const channels = getProtocolCatalogChannels(protocolId);
  const order = ensureProtocolCompareChannelOrder(protocolId, channels);
  const fromIndex = order.indexOf(fromChannelId);
  const toIndex = order.indexOf(toChannelId);
  if (fromIndex < 0 || toIndex < 0) return;
  order.splice(fromIndex, 1);
  order.splice(toIndex, 0, fromChannelId);
}

function ensureProtocolCompareChannels(protocolId, channels) {
  const channelIds = channels.map((channel) => channel.channel_id);
  let selected = state.protocolCompareChannels[protocolId];
  if (!(selected instanceof Set)) {
    selected = new Set(channelIds);
    state.protocolCompareChannels[protocolId] = selected;
    return selected;
  }
  for (const channelId of [...selected]) {
    if (!channelIds.includes(channelId)) selected.delete(channelId);
  }
  if (!selected.size && channelIds.length) {
    channelIds.forEach((channelId) => selected.add(channelId));
  }
  return selected;
}

function getProtocolCompareChannels(protocolId, channels) {
  const selected = ensureProtocolCompareChannels(protocolId, channels);
  const filtered = channels.filter((channel) => selected.has(channel.channel_id));
  if (filtered.length) return filtered;
  channels.forEach((channel) => selected.add(channel.channel_id));
  return channels;
}

function renderProtocolChannelPicker(protocolId, channels, selectedChannels) {
  const selectedIds = ensureProtocolCompareChannels(protocolId, channels);
  const selectedCount = selectedChannels.length;
  return `
    <div class="protocol-compare-picker" role="group" aria-label="选择对比渠道">
      <div class="protocol-compare-picker__head">
        <span class="protocol-compare-picker__label">对比渠道</span>
        <span class="protocol-compare-picker__count muted">已选 ${selectedCount} / ${channels.length}</span>
        <span class="protocol-compare-picker__hint muted">拖拽调整列顺序</span>
        <button type="button" class="btn btn-ghost btn-xs" data-protocol-compare-action="all" data-protocol-id="${escapeHtml(protocolId)}">全选</button>
      </div>
      <div class="protocol-compare-picker__list" data-protocol-compare-order-list data-protocol-id="${escapeHtml(protocolId)}">
        ${channels.map((channel) => {
          const checked = selectedIds.has(channel.channel_id);
          return `
            <div
              class="protocol-compare-picker__item ${checked ? "is-checked" : ""}"
              data-protocol-compare-item
              data-protocol-id="${escapeHtml(protocolId)}"
              data-channel-id="${escapeHtml(channel.channel_id)}"
              draggable="true"
            >
              <span class="protocol-compare-picker__drag" title="拖拽调整顺序" aria-hidden="true">⋮⋮</span>
              <label class="protocol-compare-picker__check">
                <input
                  type="checkbox"
                  data-protocol-compare-channel
                  data-protocol-id="${escapeHtml(protocolId)}"
                  data-channel-id="${escapeHtml(channel.channel_id)}"
                  ${checked ? "checked" : ""}
                />
                <img src="${escapeHtml(channel.logo)}" alt="" width="16" height="16" />
                <span>${escapeHtml(channel.name)}</span>
              </label>
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

function bindProtocolCompareChannelPicker() {
  if (!els.protocolCatalog) return;
  els.protocolCatalog.querySelectorAll("[data-protocol-compare-channel]").forEach((input) => {
    input.addEventListener("change", () => {
      const protocolId = input.dataset.protocolId;
      const channelId = input.dataset.channelId;
      const channels = orderProtocolCatalogChannels(protocolId, getProtocolCatalogChannels(protocolId));
      const selected = ensureProtocolCompareChannels(protocolId, channels);
      if (input.checked) {
        selected.add(channelId);
      } else if (selected.size <= 1) {
        input.checked = true;
        showToast("至少保留一个对比渠道");
        return;
      } else {
        selected.delete(channelId);
      }
      renderProtocolCatalog();
    });
  });
  els.protocolCatalog.querySelectorAll("[data-protocol-compare-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const protocolId = button.dataset.protocolId;
      const action = button.dataset.protocolCompareAction;
      const channels = orderProtocolCatalogChannels(protocolId, getProtocolCatalogChannels(protocolId));
      const selected = ensureProtocolCompareChannels(protocolId, channels);
      if (action === "all") {
        channels.forEach((channel) => selected.add(channel.channel_id));
        renderProtocolCatalog();
      }
    });
  });
  els.protocolCatalog.querySelectorAll("[data-protocol-compare-order-list]").forEach((list) => {
    const protocolId = list.dataset.protocolId;
    let draggingChannelId = "";

    const clearDropTargets = () => {
      list.querySelectorAll("[data-protocol-compare-item].is-drop-target").forEach((item) => {
        item.classList.remove("is-drop-target");
      });
    };

    list.querySelectorAll("[data-protocol-compare-item]").forEach((item) => {
      item.addEventListener("dragstart", (event) => {
        if (event.target.closest("input")) {
          event.preventDefault();
          return;
        }
        draggingChannelId = item.dataset.channelId || "";
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", draggingChannelId);
        item.classList.add("is-dragging");
      });
      item.addEventListener("dragend", () => {
        draggingChannelId = "";
        item.classList.remove("is-dragging");
        clearDropTargets();
      });
      item.addEventListener("dragover", (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        if (item.dataset.channelId !== draggingChannelId) {
          item.classList.add("is-drop-target");
        }
      });
      item.addEventListener("dragleave", () => {
        item.classList.remove("is-drop-target");
      });
      item.addEventListener("drop", (event) => {
        event.preventDefault();
        const fromChannelId = event.dataTransfer.getData("text/plain") || draggingChannelId;
        const toChannelId = item.dataset.channelId;
        item.classList.remove("is-drop-target");
        moveProtocolCompareChannelOrder(protocolId, fromChannelId, toChannelId);
        renderProtocolCatalog();
      });
    });
  });
}

function bindProtocolCatalogTabs() {
  if (!els.protocolCatalog) return;
  els.protocolCatalog.querySelectorAll("[data-protocol-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      const tab = button.dataset.protocolTab;
      if (!tab || tab === state.protocolCatalogTab) return;
      state.protocolCatalogTab = tab;
      renderProtocolCatalog();
    });
  });
}

function bindProtocolOpenToolButtons() {
  if (!els.protocolCatalog) return;
  els.protocolCatalog.querySelectorAll(".protocol-open-tool").forEach((button) => {
    button.addEventListener("click", () => {
      const channelId = button.dataset.channelId;
      const endpointId = button.dataset.endpointId;
      if (!channelId || !endpointId) return;
      state.selectedChannelId = channelId;
      state.selectedEndpointId = endpointId;
      setActiveView("run-v02");
      history.replaceState(null, "", "#run-v02");
      renderChannels();
      renderEndpointTabs();
      renderSelectedChannel();
      const endpointLabel = endpointTemplateById(endpointId).label;
      showToast(`已切换到 ${channelId} · ${endpointLabel}。`);
    });
  });
}

function renderProtocolCatalog() {
  if (!els.protocolCatalog) return;
  if (state.protocolParamDrawerOpen) closeProtocolParamDrawer();

  const tabIds = PROTOCOL_CATALOG_DEFS.map((def) => def.id);
  const activeTab = tabIds.includes(state.protocolCatalogTab) ? state.protocolCatalogTab : tabIds[0];
  state.protocolCatalogTab = activeTab;

  if (els.protocolScopeNote) {
    els.protocolScopeNote.textContent =
      "在同一协议下横向对比各渠道官方 API 文档中的参数覆盖与扩展差异；矩阵数据来自 docs/*.md（2026-06-25 对照官方文档更新）。可勾选对比渠道，默认全选。";
  }

  const tabButtons = PROTOCOL_CATALOG_DEFS.map((def) => `
    <button
      type="button"
      class="${activeTab === def.id ? "on" : ""}"
      data-protocol-tab="${escapeHtml(def.id)}"
      role="tab"
      aria-selected="${activeTab === def.id}"
    >${escapeHtml(def.tabLabel)}</button>
  `).join("");

  const panels = PROTOCOL_CATALOG_DEFS.map((def) => {
    const allChannels = orderProtocolCatalogChannels(def.id, getProtocolCatalogChannels(def.id));
    const channels = getProtocolCompareChannels(def.id, allChannels);
    const matrix = buildProtocolParameterMatrix(channels, def.id);
    state.protocolMatrices[def.id] = matrix;
    return `
      <div class="protocol-tab-panel ${activeTab === def.id ? "" : "is-hidden"}" data-protocol-panel="${escapeHtml(def.id)}" role="tabpanel">
        <div class="protocol-catalog-meta">
          <div class="protocol-catalog-meta-head">
            <h2>${escapeHtml(def.label)}</h2>
            ${renderProtocolEvalStatus(def.evalStatus)}
          </div>
          <p class="protocol-catalog-endpoint mono">${escapeHtml(def.endpoint)}</p>
          <p class="guide-copy">${escapeHtml(def.copy)}</p>
        </div>
        ${allChannels.length ? renderProtocolChannelPicker(def.id, allChannels, channels) : ""}
        ${renderProtocolParameterMatrix(matrix, def)}
      </div>
    `;
  }).join("");

  els.protocolCatalog.innerHTML = `
    <section class="panel protocol-catalog-panel">
      <div class="protocol-nav-tabs endpoint-tabs" role="tablist" aria-label="协议类型">
        ${tabButtons}
      </div>
      ${panels}
    </section>
  `;

  bindProtocolCatalogTabs();
  bindProtocolCompareChannelPicker();
  bindProtocolOpenToolButtons();
  PROTOCOL_CATALOG_DEFS.forEach((def) => loadProtocolUiState(def.id));
  bindProtocolParamDrawerRows();
  bindProtocolParamSectionToggles();
  bindProtocolParamTreeToggles();
  bindProtocolParamMatrixToolbar();
}

function renderModelLookupProtocolCells(protocols, protocolColumns) {
  return protocolColumns.map((column) => `
    <td class="channel-protocol-cell">${renderProtocolCell(Boolean(protocols?.[column.id]))}</td>
  `).join("");
}

const MODEL_LOOKUP_CATEGORY_SHORT = {
  oem: "原厂",
  deploy: "托管",
  route: "路由"
};

function getModelLookupChannelStats(result) {
  const matchCount = result?.matches?.length || 0;
  const unsupportedCount = result?.unsupported?.length || 0;
  let totalChannels = matchCount + unsupportedCount;
  if (!totalChannels) {
    const platformIndex = window.NOCTUA_MODEL_LOOKUP?.getPlatformIndex?.() || [];
    totalChannels = platformIndex.length || matchCount;
  }
  return { totalChannels, matchCount };
}

function renderModelLookupSummary({ query, result, isAddMode, isKnownModel }) {
  if (!result) return "";

  const { totalChannels, matchCount } = getModelLookupChannelStats(result);
  if (!totalChannels) return "";

  const modelId = result.canonical || query;
  const categoryTotals = {};
  for (const match of result.matches || []) {
    categoryTotals[match.category] = (categoryTotals[match.category] || 0) + 1;
  }
  const categoryChips = ["oem", "deploy", "route"]
    .filter((category) => categoryTotals[category] > 0)
    .map((category) => `
      <span class="model-lookup-summary-chip">
        ${escapeHtml(MODEL_LOOKUP_CATEGORY_SHORT[category] || category)}
        <strong>${categoryTotals[category]}</strong>
      </span>
    `).join("");

  let eyebrow = "测评模型";
  let note = "";
  if (isAddMode) {
    if (result.canonical) {
      eyebrow = "识别结果";
      note = "已忽略大小写、连字符与空格差异";
    } else {
      eyebrow = "查询结果";
      note = result.searchedLive ? "已从各渠道实时模型清单检索" : "";
    }
  }

  const liveBadge = result.searchedLive
    ? `<span class="model-lookup-summary-live">实时检索</span>`
    : "";

  const introBtn = renderModelIntroButton({ query, result, isAddMode, isKnownModel, modelId });

  return `
    <div class="model-lookup-result-head">
      <div class="model-lookup-result-head__identity">
        <div class="model-lookup-result-head__title-row">
          <span class="model-lookup-result-head__eyebrow">${escapeHtml(eyebrow)}</span>
          ${liveBadge}
        </div>
        <div class="model-lookup-result-head__model-row">
          <span class="model-lookup-result-head__model mono">${escapeHtml(isKnownModel || result.canonical ? modelId : query)}</span>
          ${introBtn}
        </div>
        ${note ? `<span class="model-lookup-result-head__note">${escapeHtml(note)}</span>` : ""}
      </div>
      <div class="model-lookup-result-head__metrics">
        <p class="model-lookup-result-head__summary">
          在 <strong>${totalChannels}</strong> 个渠道中找到 <strong>${matchCount}</strong> 个匹配
        </p>
        ${categoryChips ? `<div class="model-lookup-summary-chips">${categoryChips}</div>` : ""}
      </div>
    </div>
  `;
}

function renderModelIntroButton({ isAddMode, isKnownModel, result, modelId }) {
  if (isAddMode || (!isKnownModel && !result?.canonical)) return "";
  const lookupApi = window.NOCTUA_MODEL_LOOKUP;
  const hintId = lookupApi?.resolveOpenRouterModelId?.(modelId, result) || "";
  return `
    <button
      type="button"
      class="btn btn-ghost btn-xs model-intro-btn"
      data-model-intro="${escapeHtml(modelId)}"
      ${hintId ? `data-or-hint="${escapeHtml(hintId)}"` : ""}
      title="查看 OpenRouter 模型详情"
    >模型介绍</button>
  `;
}

function renderModelIntroChipList(items) {
  if (!items?.length) return `<span class="muted">—</span>`;
  return `<div class="model-intro-chip-list">${items.map((item) => `<span class="model-intro-chip mono">${escapeHtml(item)}</span>`).join("")}</div>`;
}

function renderModelIntroDrawerBody(model, evalModelId) {
  const api = window.NOCTUA_OPENROUTER_MODEL_DETAIL;
  const pricing = model.pricing || {};
  const architecture = model.architecture || {};
  const topProvider = model.top_provider || {};
  const reasoning = model.reasoning || {};
  const benchmarks = model.benchmarks?.artificial_analysis || null;

  const priceRows = [
    ["Prompt", api?.formatPricePerMillion?.(pricing.prompt)],
    ["Completion", api?.formatPricePerMillion?.(pricing.completion)],
    ["Input cache read", api?.formatPricePerMillion?.(pricing.input_cache_read)]
  ].filter(([, value]) => value);

  const benchmarkRows = benchmarks
    ? [
        ["Intelligence index", benchmarks.intelligence_index],
        ["Coding index", benchmarks.coding_index],
        ["Agentic index", benchmarks.agentic_index]
      ].filter(([, value]) => value != null && value !== "")
    : [];

  const reasoningBits = [];
  if (reasoning.mandatory != null) reasoningBits.push(`mandatory: ${reasoning.mandatory}`);
  if (Array.isArray(reasoning.supported_efforts) && reasoning.supported_efforts.length) {
    reasoningBits.push(`efforts: ${reasoning.supported_efforts.join(", ")}`);
  }

  return `
    <div class="model-intro-drawer-sections">
      ${model.description ? `<p class="model-intro-description">${escapeHtml(model.description)}</p>` : ""}
      <section class="model-intro-section">
        <h3 class="model-intro-section__title">基本信息</h3>
        <dl class="model-intro-dl">
          <div><dt>测评模型</dt><dd class="mono">${escapeHtml(evalModelId || "—")}</dd></div>
          <div><dt>OpenRouter ID</dt><dd class="mono">${escapeHtml(model.id || "—")}</dd></div>
          ${model.canonical_slug ? `<div><dt>Canonical slug</dt><dd class="mono">${escapeHtml(model.canonical_slug)}</dd></div>` : ""}
          ${model.hugging_face_id ? `<div><dt>Hugging Face</dt><dd class="mono">${escapeHtml(model.hugging_face_id)}</dd></div>` : ""}
          ${api?.formatEpochDate?.(model.created) ? `<div><dt>上架日期</dt><dd>${escapeHtml(api.formatEpochDate(model.created))}</dd></div>` : ""}
          ${model.knowledge_cutoff ? `<div><dt>Knowledge cutoff</dt><dd>${escapeHtml(model.knowledge_cutoff)}</dd></div>` : ""}
        </dl>
      </section>
      <section class="model-intro-section">
        <h3 class="model-intro-section__title">能力与上下文</h3>
        <dl class="model-intro-dl">
          <div><dt>Context</dt><dd>${escapeHtml(api?.formatContext?.(model.context_length) || "—")}</dd></div>
          ${topProvider.max_completion_tokens ? `<div><dt>Max completion</dt><dd>${escapeHtml(api.formatContext(topProvider.max_completion_tokens) || String(topProvider.max_completion_tokens))}</dd></div>` : ""}
          ${architecture.modality ? `<div><dt>Modality</dt><dd class="mono">${escapeHtml(architecture.modality)}</dd></div>` : ""}
          ${architecture.input_modalities?.length ? `<div><dt>Input</dt><dd>${renderModelIntroChipList(architecture.input_modalities)}</dd></div>` : ""}
          ${architecture.output_modalities?.length ? `<div><dt>Output</dt><dd>${renderModelIntroChipList(architecture.output_modalities)}</dd></div>` : ""}
          ${architecture.tokenizer ? `<div><dt>Tokenizer</dt><dd>${escapeHtml(architecture.tokenizer)}</dd></div>` : ""}
          ${reasoningBits.length ? `<div><dt>Reasoning</dt><dd>${escapeHtml(reasoningBits.join(" · "))}</dd></div>` : ""}
        </dl>
      </section>
      ${renderModelLimitsObservedSection(model, evalModelId)}
      ${priceRows.length ? `
      <section class="model-intro-section">
        <h3 class="model-intro-section__title">定价（OpenRouter）</h3>
        <dl class="model-intro-dl">
          ${priceRows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}
        </dl>
      </section>` : ""}
      ${model.supported_parameters?.length ? `
      <section class="model-intro-section">
        <h3 class="model-intro-section__title">Supported parameters</h3>
        ${renderModelIntroChipList(model.supported_parameters)}
      </section>` : ""}
      ${model.default_parameters && Object.keys(model.default_parameters).length ? `
      <section class="model-intro-section">
        <h3 class="model-intro-section__title">Default parameters</h3>
        <pre class="model-intro-json mono">${escapeHtml(JSON.stringify(model.default_parameters, null, 2))}</pre>
      </section>` : ""}
      ${benchmarkRows.length ? `
      <section class="model-intro-section">
        <h3 class="model-intro-section__title">Benchmarks（Artificial Analysis）</h3>
        <dl class="model-intro-dl">
          ${benchmarkRows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(String(value))}</dd></div>`).join("")}
        </dl>
      </section>` : ""}
      <p class="guide-copy muted model-intro-source">数据来源：<a href="https://openrouter.ai/docs/api/api-reference/models/get-models" target="_blank" rel="noopener noreferrer">OpenRouter GET /api/v1/models</a></p>
    </div>
  `;
}

function modelLimitMetricText(kind, metric) {
  if (!metric) return "—";
  if (kind === "max_output_effective") return metric.effective ? "生效" : "未生效";
  if (kind === "thinking_budget") {
    if (metric.skipped || !metric.accepted) return "不支持";
    const max = metric.max_display || (metric.max ? String(metric.max) : "?");
    return metric.effective ? `${max}·生效` : `${max}·接受`;
  }
  if (metric.display) return metric.top_candidate_supported ? `≥ ${metric.display}` : metric.display;
  if (metric.value) return String(metric.value);
  return "未测到";
}

function renderModelLimitsObservedSection(model, evalModelId) {
  const api = window.NOCTUA_MODEL_LIMITS_OBSERVED;
  if (!api?.entriesForModel) return "";
  const queries = [evalModelId, model?.id, model?.canonical_slug].filter(Boolean);
  const seen = new Set();
  const entries = [];
  for (const query of queries) {
    for (const entry of api.entriesForModel(query)) {
      const key = `${entry.channelId}::${entry.model}`;
      if (seen.has(key)) continue;
      seen.add(key);
      entries.push(entry);
    }
  }
  if (!entries.length) return "";

  const detailApi = window.NOCTUA_OPENROUTER_MODEL_DETAIL;
  const docContext = detailApi?.formatContext?.(model?.context_length) || (model?.context_length ? String(model.context_length) : "—");
  const topProvider = model?.top_provider || {};
  const docMaxCompletion = topProvider.max_completion_tokens
    ? (detailApi?.formatContext?.(topProvider.max_completion_tokens) || String(topProvider.max_completion_tokens))
    : "—";

  const rows = entries.map((entry) => {
    const m = entry.metrics || {};
    return `
      <tr>
        <td class="mono">${escapeHtml(entry.channelId)}</td>
        <td class="mono">${escapeHtml(entry.model)}</td>
        <td>${escapeHtml(modelLimitMetricText("max_input", m.max_input))}</td>
        <td>${escapeHtml(modelLimitMetricText("max_output", m.max_output))}</td>
        <td>${escapeHtml(modelLimitMetricText("max_output_effective", m.max_output_effective))}</td>
        <td>${escapeHtml(modelLimitMetricText("total_context", m.total_context))}</td>
        <td>${escapeHtml(modelLimitMetricText("thinking_budget", m.thinking_budget))}</td>
      </tr>
    `;
  }).join("");

  return `
      <section class="model-intro-section">
        <h3 class="model-intro-section__title">各渠道实测限制（Noctua）</h3>
        <p class="guide-copy muted">文档基线（OpenRouter）：Context ${escapeHtml(docContext)} · Max completion ${escapeHtml(docMaxCompletion)}。下表为容量探针实测，可与文档对照。</p>
        <div class="model-intro-table-wrap">
          <table class="model-intro-table">
            <thead>
              <tr>
                <th>渠道</th><th>模型</th><th>最大Input</th><th>最大Output</th><th>Output 生效</th><th>Total Context</th><th>Thinking Budget</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        <p class="guide-copy muted model-intro-source">实测来源：scripts/probe-capacity.js → web/data/model-limits-observed.json（运行 npm run build:model-limits 刷新）</p>
      </section>`;
}

async function openModelIntroDrawer(evalModelId, hintId = "") {
  if (!els.modelIntroDrawer || !els.modelIntroDrawerBody) return;
  const detailApi = window.NOCTUA_OPENROUTER_MODEL_DETAIL;
  if (!detailApi) {
    showToast("模型详情模块未加载。");
    return;
  }

  state.modelIntroDrawerOpen = true;
  els.modelIntroDrawer.classList.remove("is-hidden");
  els.modelIntroDrawer.setAttribute("aria-hidden", "false");
  document.body.classList.add("protocol-param-drawer-open");
  if (els.modelIntroDrawerTitle) els.modelIntroDrawerTitle.textContent = evalModelId || "模型介绍";
  if (els.modelIntroDrawerSummary) {
    els.modelIntroDrawerSummary.innerHTML = `<p class="muted">正在从 OpenRouter 加载模型详情…</p>`;
  }
  els.modelIntroDrawerBody.innerHTML = "";

  try {
    const model = await detailApi.resolveModel({ query: evalModelId, hintId });
    if (!state.modelIntroDrawerOpen) return;
    if (!model) {
      if (els.modelIntroDrawerSummary) {
        els.modelIntroDrawerSummary.innerHTML = `<p class="muted">未在 OpenRouter 模型清单中找到「${escapeHtml(evalModelId)}」。</p>`;
      }
      return;
    }

    const pageUrl = detailApi.openRouterModelPage(model);
    if (els.modelIntroDrawerTitle) els.modelIntroDrawerTitle.textContent = model.name || model.id || evalModelId;
    if (els.modelIntroDrawerSummary) {
      els.modelIntroDrawerSummary.innerHTML = `
        <div class="model-intro-drawer-summary">
          <span class="mono">${escapeHtml(model.id)}</span>
          <a href="${escapeHtml(pageUrl)}" target="_blank" rel="noopener noreferrer">在 OpenRouter 查看</a>
        </div>
      `;
    }
    els.modelIntroDrawerBody.innerHTML = renderModelIntroDrawerBody(model, evalModelId);
  } catch (error) {
    if (!state.modelIntroDrawerOpen) return;
    if (els.modelIntroDrawerSummary) {
      els.modelIntroDrawerSummary.innerHTML = `<p class="muted">加载失败：${escapeHtml(error.message || String(error))}</p>`;
    }
  }
}

function closeModelIntroDrawer() {
  if (!els.modelIntroDrawer) return;
  state.modelIntroDrawerOpen = false;
  els.modelIntroDrawer.classList.add("is-hidden");
  els.modelIntroDrawer.setAttribute("aria-hidden", "true");
  document.body.classList.remove("protocol-param-drawer-open");
}

function bindModelIntroDrawer() {
  if (!els.modelIntroDrawer) return;
  els.modelIntroDrawer.querySelectorAll("[data-model-intro-drawer-dismiss]").forEach((node) => {
    node.addEventListener("click", closeModelIntroDrawer);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state.modelIntroDrawerOpen) {
      closeModelIntroDrawer();
    }
  });
}

function liveLookupSourceNote(result) {
  const status = result?.liveSourceStatus;
  if (!status || typeof status !== "object") return "";
  const skipped = Object.entries(status)
    .filter(([, value]) => String(value).startsWith("skipped:"))
    .map(([key]) => key);
  if (!skipped.length) return "";
  return `<p class="guide-copy model-lookup-live-note">部分渠道（${escapeHtml(skipped.join("、"))}）未配置 API Key：请在 <span class="mono">config.yaml</span> 中填写与测评渠道同名的段（如 <span class="mono">siliconflow-cn</span>、<span class="mono">aliyun-cn</span>、<span class="mono">streamlake-cn</span>，见 <span class="mono">config.example.yaml</span>）。OpenRouter 公开模型清单无需 Key。</p>`;
}

function loadModelLookupAddTabDismissed() {
  try {
    const raw = sessionStorage.getItem("noctua.modelLookupAddTabDismissed");
    const list = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(list) ? list : []);
  } catch {
    return new Set();
  }
}

function persistModelLookupAddTabDismissed() {
  sessionStorage.setItem(
    "noctua.modelLookupAddTabDismissed",
    JSON.stringify([...state.modelLookupAddTabDismissed])
  );
}

function isCustomEvalModelId(modelId) {
  return window.NOCTUA_CUSTOM_EVAL_MODELS?.hasModel?.(modelId) || false;
}

function getEvalModelVendorGroups() {
  return window.NOCTUA_CHANNEL_CATALOG?.getEvalModelVendorGroups?.() || [];
}

function inferEvalModelVendorId(modelId) {
  const infer = window.NOCTUA_CHANNEL_CATALOG?.inferEvalModelVendorId;
  return infer ? infer(modelId) : "other";
}

function findVendorGroupForModel(modelId, groups = getEvalModelVendorGroups()) {
  const vendorId = inferEvalModelVendorId(modelId);
  return groups.find((group) => group.id === vendorId)
    || groups.find((group) => group.modelIds.includes(modelId))
    || groups[0]
    || null;
}

function syncModelLookupNavState() {
  const lookupApi = window.NOCTUA_MODEL_LOOKUP;
  if (!lookupApi || state.modelLookupAddMode) return;

  const groups = getEvalModelVendorGroups();
  if (!groups.length) return;

  const evalModelIds = lookupApi.getEvalModelIds();
  const query = String(state.modelLookupQuery || "").trim();

  if (query && evalModelIds.includes(query)) {
    const group = findVendorGroupForModel(query, groups);
    if (group) {
      state.modelLookupVendorId = group.id;
      if (!group.modelIds.includes(query)) {
        state.modelLookupQuery = group.modelIds[0] || query;
      }
    }
    return;
  }

  if (!query) {
    const group = groups.find((item) => item.id === state.modelLookupVendorId) || groups[0];
    state.modelLookupVendorId = group.id;
    state.modelLookupQuery = group.modelIds[0] || "";
  }
}

function openModelLookupAddMode() {
  state.modelLookupAddMode = true;
  state.modelLookupQuery = "";
  state.modelLookupResult = null;
  state.modelLookupLoading = false;
  history.replaceState(null, "", "#models?add=1");
  renderModelLookup();
  const input = els.modelLookup?.querySelector("#modelLookupInput");
  if (input) input.focus();
}

function closeModelLookupAddMode() {
  state.modelLookupAddMode = false;
  state.modelLookupResult = null;
  syncModelLookupNavState();
  const query = String(state.modelLookupQuery || "").trim();
  history.replaceState(null, "", query ? `#models?q=${encodeURIComponent(query)}` : "#models");
  renderModelLookup();
  if (query) runModelLookup({ live: "never" });
}

function hideModelLookupAddTabModal() {
  if (!els.modelLookupAddTabModal) return;
  els.modelLookupAddTabModal.classList.add("is-hidden");
  els.modelLookupAddTabModal.setAttribute("aria-hidden", "true");
  state.modelLookupAddTabPrompt = null;
}

function renderModelLookupAddTabModalBody(result, modelId) {
  if (!els.modelLookupAddTabBody || !els.modelLookupAddTabSummary) return;
  const { totalChannels, matchCount } = getModelLookupChannelStats(result);
  els.modelLookupAddTabSummary.textContent = `查询「${result.query}」在 ${totalChannels} 个渠道中找到 ${matchCount} 个匹配，建议测评模型 ID：${modelId}。`;
  const rows = result.matches.map((match) => `
    <tr>
      <td>${escapeHtml(match.platformName)}</td>
      <td class="mono">${escapeHtml(match.apiModelId)}</td>
    </tr>
  `).join("");
  els.modelLookupAddTabBody.innerHTML = `
    <div class="model-lookup-modal__matches">
      <table>
        <thead>
          <tr><th scope="col">渠道</th><th scope="col">API 模型 ID</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function showModelLookupAddTabModal(query, result) {
  const lookupApi = window.NOCTUA_MODEL_LOOKUP;
  const customStore = window.NOCTUA_CUSTOM_EVAL_MODELS;
  if (!lookupApi || !customStore || !els.modelLookupAddTabModal || !result?.matches?.length) return;

  const modelId = result.canonical || customStore.normalizeId(query);
  if (!modelId) return;

  const evalModelIds = lookupApi.getEvalModelIds();
  if (evalModelIds.includes(modelId)) return;

  const dismissKey = `${modelId}:${String(query || "").trim()}`;
  if (state.modelLookupAddTabDismissed.has(dismissKey)) return;

  state.modelLookupAddTabPrompt = { query, result, modelId, dismissKey };
  renderModelLookupAddTabModalBody(result, modelId);
  els.modelLookupAddTabModal.classList.remove("is-hidden");
  els.modelLookupAddTabModal.setAttribute("aria-hidden", "false");
}

function dismissModelLookupAddTabModal() {
  const prompt = state.modelLookupAddTabPrompt;
  if (prompt?.dismissKey) {
    state.modelLookupAddTabDismissed.add(prompt.dismissKey);
    persistModelLookupAddTabDismissed();
  }
  hideModelLookupAddTabModal();
}

function confirmModelLookupAddTabModal() {
  const prompt = state.modelLookupAddTabPrompt;
  const customStore = window.NOCTUA_CUSTOM_EVAL_MODELS;
  const lookupApi = window.NOCTUA_MODEL_LOOKUP;
  if (!prompt || !customStore || !lookupApi) return;

  const modelId = customStore.registerFromLookup(prompt.query, prompt.result);
  if (!modelId) {
    showToast("未能添加测评模型 Tab。");
    hideModelLookupAddTabModal();
    return;
  }

  lookupApi.refreshIndex();
  hideModelLookupAddTabModal();
  state.modelLookupAddMode = false;
  state.modelLookupQuery = modelId;
  state.modelLookupVendorId = inferEvalModelVendorId(modelId);
  state.modelLookupResult = lookupApi.lookup(modelId);
  history.replaceState(null, "", `#models?q=${encodeURIComponent(modelId)}`);
  renderChannelCatalog();
  renderProtocolCatalog();
  renderModelLookup();
  showToast(`已添加测评模型 Tab：${modelId}`);
}

function maybePromptAddEvalModelTab(query, result) {
  const lookupApi = window.NOCTUA_MODEL_LOOKUP;
  if (!lookupApi || !result?.matches?.length || state.modelLookupLoading) return;

  const evalModelIds = lookupApi.getEvalModelIds();
  const isKnownTabQuery = evalModelIds.includes(String(query || "").trim());
  if (isKnownTabQuery) return;

  showModelLookupAddTabModal(query, result);
}

function bindModelLookupAddTabModalEvents() {
  els.modelLookupAddTabConfirm?.addEventListener("click", confirmModelLookupAddTabModal);
  els.modelLookupAddTabDismiss?.addEventListener("click", dismissModelLookupAddTabModal);
  els.modelLookupAddTabModal?.querySelectorAll("[data-model-lookup-modal-dismiss]").forEach((node) => {
    node.addEventListener("click", dismissModelLookupAddTabModal);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state.modelLookupAddTabPrompt) dismissModelLookupAddTabModal();
  });
}

function modelLookupLiveMode(query) {
  const lookupApi = window.NOCTUA_MODEL_LOOKUP;
  const trimmed = String(query || "").trim();
  const evalIds = lookupApi?.getEvalModelIds?.() || [];
  return evalIds.includes(trimmed) ? "never" : "auto";
}

async function runModelLookup(options = {}) {
  const lookupApi = window.NOCTUA_MODEL_LOOKUP;
  if (!lookupApi) return;

  const query = (state.modelLookupQuery || "").trim();
  const requestId = ++state.modelLookupRequestId;
  const liveMode = options.live || "auto";

  if (!query) {
    state.modelLookupResult = null;
    state.modelLookupLoading = false;
    renderModelLookup();
    return;
  }

  const catalogResult = lookupApi.lookup(query);
  const shouldLive = liveMode === "always"
    || (liveMode === "auto" && lookupApi.needsLiveLookup(query, catalogResult));

  if (!shouldLive) {
    state.modelLookupResult = catalogResult;
    state.modelLookupLoading = false;
    renderModelLookup();
    maybePromptAddEvalModelTab(query, catalogResult);
    return;
  }

  state.modelLookupLoading = true;
  state.modelLookupResult = catalogResult;
  renderModelLookup();

  try {
    const liveResponse = await lookupApi.lookupLive(query, API_BASE);
    if (requestId !== state.modelLookupRequestId) return;
    state.modelLookupResult = lookupApi.mergeLiveResults(catalogResult, liveResponse);
    const customStore = window.NOCTUA_CUSTOM_EVAL_MODELS;
    const syncId = state.modelLookupResult?.canonical || query;
    if (customStore?.mergeFromLookup?.(syncId, state.modelLookupResult)) {
      lookupApi.refreshIndex();
      renderChannelCatalog();
      renderProtocolCatalog();
    }
  } catch {
    if (requestId !== state.modelLookupRequestId) return;
    state.modelLookupResult = catalogResult;
  }

  state.modelLookupLoading = false;
  if (requestId === state.modelLookupRequestId) {
    renderModelLookup();
    maybePromptAddEvalModelTab(query, state.modelLookupResult);
  }
}

function renderModelLookup() {
  const lookupApi = window.NOCTUA_MODEL_LOOKUP;
  const catalog = window.NOCTUA_CHANNEL_CATALOG;
  if (!lookupApi || !catalog || !els.modelLookup) return;

  const protocolColumns = catalog.protocolColumns || [];
  const evalModelIds = lookupApi.getEvalModelIds();
  const vendorGroups = getEvalModelVendorGroups();
  let query = state.modelLookupQuery || "";
  const hash = window.location.hash || "";
  if (hash.startsWith("#models") && hash.includes("?")) {
    const params = new URLSearchParams(hash.slice(hash.indexOf("?") + 1));
    state.modelLookupAddMode = params.has("add");
    const hashQuery = params.get("q") || "";
    if (hashQuery) {
      query = hashQuery;
      state.modelLookupQuery = hashQuery;
    }
  }
  if (!state.modelLookupAddMode) {
    syncModelLookupNavState();
    query = state.modelLookupQuery || "";
  }

  const activeVendorGroup = vendorGroups.find((group) => group.id === state.modelLookupVendorId)
    || vendorGroups[0]
    || null;
  if (activeVendorGroup && !state.modelLookupAddMode) {
    state.modelLookupVendorId = activeVendorGroup.id;
  }

  const isAddMode = state.modelLookupAddMode;
  const isKnownModel = evalModelIds.includes(query);
  const result = query
    ? (state.modelLookupResult?.query === query ? state.modelLookupResult : lookupApi.lookup(query))
    : null;

  const vendorTabs = vendorGroups.map((group) => `
    <button
      type="button"
      class="model-lookup-vendor-tab${!isAddMode && activeVendorGroup?.id === group.id ? " is-active" : ""}"
      data-model-vendor="${escapeHtml(group.id)}"
      role="tab"
      aria-selected="${!isAddMode && activeVendorGroup?.id === group.id}"
    >
      ${group.logo ? `<span class="model-vendor-tab-logo"><img src="${escapeHtml(group.logo)}" alt="" width="16" height="16" /></span>` : ""}
      <span>${escapeHtml(group.label)}</span>
    </button>
  `).join("");

  const modelTabs = !isAddMode && activeVendorGroup
    ? activeVendorGroup.modelIds.map((modelId) => `
    <button
      type="button"
      class="model-lookup-model-tab${query === modelId ? " is-active" : ""}${isCustomEvalModelId(modelId) ? " is-custom" : ""}"
      data-model-tab="${escapeHtml(modelId)}"
      role="tab"
      aria-selected="${query === modelId}"
    >${escapeHtml(modelId)}</button>
  `).join("")
    : "";

  let resultHtml = "";
  if (result && query) {
    const summary = renderModelLookupSummary({ query, result, isAddMode, isKnownModel });

    if (result.matches.length) {
      const protocolFootnotes = [...new Set(
        result.matches
          .filter((match) => match.protocolScopeNote && match.platformProtocols?.responses_api && !match.protocols?.responses_api)
          .map((match) => match.protocolScopeNote)
      )];
      const rows = result.matches.map((match) => {
        const docs = [
          match.models_docs_url ? `<a href="${escapeHtml(match.models_docs_url)}" target="_blank" rel="noopener noreferrer">模型清单</a>` : "",
          match.api_docs_url ? `<a href="${escapeHtml(match.api_docs_url)}" target="_blank" rel="noopener noreferrer">API 文档</a>` : ""
        ].filter(Boolean).join(" · ");
        const toolBtn = match.channelId
          ? `<button type="button" class="btn btn-ghost btn-xs model-lookup-open-tool" data-channel-id="${escapeHtml(match.channelId)}" data-model-name="${escapeHtml(match.apiModelId)}">在测评工具中打开</button>`
          : "";
        const liveMeta = match.liveOnly
          ? `<div class="model-lookup-meta">实时清单匹配 · 协议矩阵未录入</div>`
          : "";
        return `
          <tr>
            <td>
              <div class="model-lookup-platform">
                <span class="channel-vendor-logo"><img src="${escapeHtml(match.platformLogo)}" alt="" width="20" height="20" /></span>
                <div>
                  <strong>${escapeHtml(match.platformName)}</strong>
                  ${liveMeta}
                </div>
              </div>
            </td>
            <td class="model-lookup-type">${escapeHtml(match.categoryLabel)}</td>
            <td class="mono">${escapeHtml(match.apiModelId)}</td>
            ${renderModelLookupProtocolCells(match.protocols, protocolColumns)}
            <td class="model-lookup-actions">
              ${docs}
              ${toolBtn}
            </td>
          </tr>
        `;
      }).join("");

      resultHtml = `
        ${summary}
        <div class="channel-catalog-wrap">
          <table class="channel-catalog model-lookup-table">
            <thead>
              <tr>
                <th scope="col">渠道</th>
                <th scope="col">渠道类型</th>
                <th scope="col">API 模型 ID</th>
                ${protocolColumns.map((column) => `
                  <th scope="col" class="channel-protocol-head">${escapeHtml(column.label)}</th>
                `).join("")}
                <th scope="col">文档 / 操作</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        <p class="channel-catalog-legend">
          <span><span class="protocol-tick">✓</span> 该模型在此渠道支持</span>
          <span><span class="protocol-dash">—</span> 不支持</span>
          <span class="muted">（模型级，非渠道级协议标签）</span>
        </p>
        ${protocolFootnotes.map((note) => `<p class="guide-copy channel-protocol-scope-note">${escapeHtml(note)}</p>`).join("")}
        ${liveLookupSourceNote(result)}
      `;
    } else if (state.modelLookupLoading) {
      resultHtml = `
        <div class="model-lookup-empty panel">
          <p>正在查询各渠道模型清单…</p>
          <p class="guide-copy">将对照本地测评目录，并尝试从 OpenRouter、SiliconFlow 等平台的在线模型列表检索「<span class="mono">${escapeHtml(query)}</span>」。</p>
        </div>
      `;
    } else {
      resultHtml = `
        <div class="model-lookup-empty panel">
          <p>未在任何测评渠道中找到「<strong class="mono">${escapeHtml(query)}</strong>」。</p>
          <p class="guide-copy">可尝试标准测评模型名称，或该平台文档中的 API 模型 ID（如 SiliconFlow 的 <span class="mono">deepseek-ai/DeepSeek-V4-Flash</span>、OpenRouter 的 <span class="mono">deepseek/deepseek-v4-flash</span>）。</p>
        </div>
      `;
    }
  } else if (isAddMode) {
    resultHtml = `
      <div class="model-lookup-empty panel">
        <p>输入模型名称并查询各渠道 API 模型 ID，确认后可加入测评模型列表。</p>
        <p class="guide-copy">支持模糊匹配：大小写不敏感，<span class="mono">-</span>、空格、<span class="mono">_</span> 视为等价（例如 <span class="mono">GLM5.2</span> 可匹配 <span class="mono">glm-5.2</span>）。</p>
      </div>
    `;
  } else {
    resultHtml = `
      <div class="model-lookup-empty panel">
        <p>选择上方厂商与测评模型，查看其在各渠道的 API 模型 ID 与协议支持矩阵。</p>
      </div>
    `;
  }

  const formHtml = isAddMode ? `
      <form id="modelLookupForm" class="model-lookup-form">
        <label class="fld model-lookup-field">
          <span class="lbl">模型名称</span>
          <div class="model-lookup-input-row">
            <input id="modelLookupInput" class="inp" type="search" name="model" value="${escapeHtml(query)}" placeholder="例如 GLM5.2、DeepSeek V4 Flash、deepseek-ai/DeepSeek-V4-Flash" autocomplete="off" />
            <button type="submit" class="btn btn-primary">查询渠道</button>
            <button type="button" class="btn btn-ghost" data-model-lookup-add-cancel>取消</button>
          </div>
        </label>
      </form>
  ` : ``;

  els.modelLookup.innerHTML = `
    <section class="panel model-lookup-panel">
      <div class="model-lookup-toolbar">
        <div class="model-lookup-nav-card${isAddMode ? " is-add-mode" : ""}">
          <div class="model-lookup-vendor-row" role="tablist" aria-label="模型厂商">
            ${vendorTabs}
          </div>
          ${modelTabs ? `
          <div class="model-lookup-model-section">
            <span class="model-lookup-model-label">测评模型</span>
            <div class="model-lookup-model-row" role="tablist" aria-label="测评模型">
              ${modelTabs}
            </div>
          </div>` : ""}
        </div>
        <button type="button" class="btn ${isAddMode ? "btn-ghost" : "btn-primary"} model-lookup-add-btn" data-model-lookup-add aria-pressed="${isAddMode}">${isAddMode ? "取消" : "新增模型"}</button>
      </div>
      ${formHtml}
      <div class="model-lookup-results">${resultHtml}</div>
    </section>
  `;

  bindModelLookupEvents();
}

function bindModelLookupEvents() {
  if (!els.modelLookup) return;

  const form = els.modelLookup.querySelector("#modelLookupForm");
  const input = els.modelLookup.querySelector("#modelLookupInput");
  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      state.modelLookupAddMode = true;
      state.modelLookupQuery = input?.value?.trim() || "";
      state.modelLookupResult = null;
      if (state.modelLookupQuery) {
        history.replaceState(null, "", `#models?add=1&q=${encodeURIComponent(state.modelLookupQuery)}`);
      } else {
        history.replaceState(null, "", "#models?add=1");
      }
      runModelLookup({ live: "always" });
    });
  }

  els.modelLookup.querySelector("[data-model-lookup-add]")?.addEventListener("click", () => {
    if (state.modelLookupAddMode) closeModelLookupAddMode();
    else openModelLookupAddMode();
  });
  els.modelLookup.querySelector("[data-model-lookup-add-cancel]")?.addEventListener("click", closeModelLookupAddMode);

  els.modelLookup.querySelectorAll("[data-model-vendor]").forEach((button) => {
    button.addEventListener("click", () => {
      const vendorId = button.dataset.modelVendor || "";
      const group = getEvalModelVendorGroups().find((item) => item.id === vendorId);
      if (!group?.modelIds.length) return;
      state.modelLookupAddMode = false;
      state.modelLookupVendorId = vendorId;
      state.modelLookupQuery = group.modelIds.includes(state.modelLookupQuery)
        ? state.modelLookupQuery
        : group.modelIds[0];
      state.modelLookupResult = null;
      history.replaceState(null, "", `#models?q=${encodeURIComponent(state.modelLookupQuery)}`);
      runModelLookup({ live: "never" });
    });
  });

  els.modelLookup.querySelectorAll("[data-model-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      const tab = button.dataset.modelTab || "";
      if (!tab) return;
      state.modelLookupAddMode = false;
      state.modelLookupQuery = tab;
      state.modelLookupVendorId = inferEvalModelVendorId(tab);
      state.modelLookupResult = null;
      history.replaceState(null, "", `#models?q=${encodeURIComponent(tab)}`);
      runModelLookup({ live: "never" });
    });
  });

  els.modelLookup.querySelectorAll(".model-lookup-open-tool").forEach((button) => {
    button.addEventListener("click", () => {
      const channelId = button.dataset.channelId;
      const modelName = button.dataset.modelName;
      if (!channelId) return;
      state.selectedChannelId = channelId;
      setActiveView("run-v02");
      history.replaceState(null, "", "#run-v02");
      renderChannels();
      renderSelectedChannel();
      if (modelName && els.modelName) {
        els.modelName.value = modelName;
      }
      showToast(`已切换到 ${channelId}，Model 已填入 ${modelName || "默认模型"}。`);
    });
  });

  els.modelLookup.querySelectorAll("[data-model-intro]").forEach((button) => {
    button.addEventListener("click", () => {
      const modelId = button.dataset.modelIntro || "";
      const hintId = button.dataset.orHint || "";
      if (!modelId) return;
      openModelIntroDrawer(modelId, hintId);
    });
  });
}

function compactSearchText(value) {
  const norm = window.NOCTUA_MODEL_LOOKUP?.normalizeModelName?.(value)
    || String(value || "").trim().toLowerCase();
  return norm.replace(/[.\-_/]/g, "");
}

function matchSearchQuery(query, ...candidates) {
  const trimmed = String(query || "").trim();
  if (!trimmed) return true;
  const qNorm = window.NOCTUA_MODEL_LOOKUP?.normalizeModelName?.(trimmed) || trimmed.toLowerCase();
  const qCompact = compactSearchText(trimmed);
  return candidates.some((candidate) => {
    const text = String(candidate || "");
    const norm = window.NOCTUA_MODEL_LOOKUP?.normalizeModelName?.(text) || text.toLowerCase();
    const compact = compactSearchText(text);
    if (norm.includes(qNorm) || compact.includes(qCompact)) return true;
    let index = 0;
    for (let i = 0; i < compact.length && index < qCompact.length; i += 1) {
      if (compact[i] === qCompact[index]) index += 1;
    }
    return index === qCompact.length;
  });
}

function syncRunV02ModelMenu() {
  if (!els.runV02ModelMenu || !els.runV02ModelInput) return;
  const open = state.runV02.modelMenuOpen;
  els.runV02ModelMenu.classList.toggle("is-hidden", !open);
  els.runV02ModelSelect?.classList.toggle("is-open", open);
  els.runV02ModelInput.setAttribute("aria-expanded", open ? "true" : "false");
  if (!open) updateRunV02ModelInputDisplay();
}

function syncRunV02BaselineMenu() {
  if (!els.runV02BaselineMenu || !els.runV02BaselineInput) return;
  const open = state.runV02.baselineMenuOpen;
  els.runV02BaselineMenu.classList.toggle("is-hidden", !open);
  els.runV02BaselineSelect?.classList.toggle("is-open", open);
  els.runV02BaselineInput.setAttribute("aria-expanded", open ? "true" : "false");
  if (!open) updateRunV02BaselineInputDisplay();
}

function syncRunV02TargetMenu() {
  if (!els.runV02TargetMenu || !els.runV02TargetInput) return;
  const open = state.runV02.targetMenuOpen;
  els.runV02TargetMenu.classList.toggle("is-hidden", !open);
  els.runV02TargetSelect?.classList.toggle("is-open", open);
  els.runV02TargetInput.setAttribute("aria-expanded", open ? "true" : "false");
}

function updateRunV02BaselineInputDisplay() {
  if (!els.runV02BaselineInput || state.runV02.baselineMenuOpen) return;
  const route = state.runV02.baselineRoute;
  els.runV02BaselineInput.readOnly = true;
  els.runV02BaselineInput.placeholder = "选择 Baseline 渠道";
  els.runV02BaselineInput.value = route ? runV02RouteOptionLabel(route) : "";
}

function closeRunV02BaselineMenu() {
  state.runV02.baselineMenuOpen = false;
  state.runV02.baselineSearch = "";
  syncRunV02BaselineMenu();
  els.runV02BaselineInput?.blur();
}

function closeRunV02TargetMenu() {
  state.runV02.targetMenuOpen = false;
  state.runV02.targetSearch = "";
  syncRunV02TargetMenu();
  els.runV02TargetInput?.blur();
}

function openRunV02BaselineMenu() {
  if (state.runV02.isRunning || els.runV02BaselineInput?.disabled) return;
  closeRunV02ModelMenu();
  closeRunV02TargetMenu();
  state.runV02.baselineMenuOpen = true;
  state.runV02.baselineSearch = "";
  if (els.runV02BaselineInput) {
    els.runV02BaselineInput.readOnly = false;
    els.runV02BaselineInput.placeholder = "搜索 Baseline 渠道或协议";
    els.runV02BaselineInput.value = "";
  }
  renderRunV02BaselineSelect();
  syncRunV02BaselineMenu();
  requestAnimationFrame(() => els.runV02BaselineInput?.focus());
}

function openRunV02TargetMenu() {
  if (state.runV02.isRunning || els.runV02TargetInput?.disabled) return;
  closeRunV02ModelMenu();
  closeRunV02BaselineMenu();
  state.runV02.targetMenuOpen = true;
  state.runV02.targetSearch = "";
  if (els.runV02TargetInput) {
    els.runV02TargetInput.readOnly = false;
    els.runV02TargetInput.placeholder = "搜索测评渠道";
    els.runV02TargetInput.value = "";
  }
  renderRunV02TargetSelect();
  syncRunV02TargetMenu();
  requestAnimationFrame(() => els.runV02TargetInput?.focus());
}

function updateRunV02ModelInputDisplay() {
  if (!els.runV02ModelInput || state.runV02.modelMenuOpen) return;
  els.runV02ModelInput.readOnly = true;
  els.runV02ModelInput.placeholder = "选择模型";
  els.runV02ModelInput.value = state.runV02.modelId || "";
}

function closeRunV02ModelMenu() {
  state.runV02.modelMenuOpen = false;
  state.runV02.modelSearch = "";
  syncRunV02ModelMenu();
  els.runV02ModelInput?.blur();
}

function openRunV02ModelMenu() {
  if (state.runV02.isRunning) return;
  closeRunV02BaselineMenu();
  closeRunV02TargetMenu();
  state.runV02.modelMenuOpen = true;
  state.runV02.modelSearch = "";
  if (els.runV02ModelInput) {
    els.runV02ModelInput.readOnly = false;
    els.runV02ModelInput.placeholder = "搜索模型，支持模糊匹配";
    els.runV02ModelInput.value = "";
  }
  renderRunV02ModelSelect();
  syncRunV02ModelMenu();
  requestAnimationFrame(() => els.runV02ModelInput?.focus());
}

function runV02RouteOptionLabel(option) {
  return CHANNEL_ROUTE_CORE().routeOptionLabel(option);
}

function applyRunV02Model(modelId) {
  if (!modelId) return;
  if (modelId === state.runV02.modelId) {
    closeRunV02ModelMenu();
    return;
  }
  state.runV02.modelId = modelId;
  state.runV02.protocolId = "";
  state.runV02.modelCapabilities.tools = null;
  resetRunV02DownstreamFromProtocol();
  if (els.runV02ChannelPanel) els.runV02ChannelPanel.classList.add("is-hidden");
  closeRunV02ModelMenu();
  closeRunV02BaselineMenu();
  closeRunV02TargetMenu();
  renderRunV02ModelSelect();
  renderRunV02ProtocolPicker();
  renderRunV02BaselineSelect();
  renderRunV02TargetSelect();
  refreshRunV02ModelToolsCapability().then(() => {
    const protocols = listRunV02ProtocolOptions(modelId);
    if (protocols.length === 1) {
      applyRunV02Protocol(protocols[0].id, { autoSelectBaseline: true });
    } else if (state.runV02.protocolId) {
      loadRunV02Cases();
    }
  });
}

/**
 * 选定测评模型后，在 Step 1 下方渲染该模型原厂特殊规则的显著提示条。
 * 厂商无规则或推断为 other 时隐藏；切换模型时随 renderRunV02ModelSelect 刷新。
 */
function renderRunV02OemRuleBanner() {
  const banner = els.runV02OemRuleBanner;
  if (!banner) return;
  const api = oemBehaviorsApi();
  const modelId = state.runV02.modelId;
  const rules = modelId ? (api.modelOemRules?.(modelId) || []) : [];
  if (!rules.length) {
    banner.innerHTML = "";
    banner.classList.add("is-hidden");
    return;
  }
  const vendorId = modelId ? api.inferEvalModelVendorId?.(modelId) || "other" : "other";
  const label = api.vendorLabel?.(vendorId) || "原厂";
  banner.innerHTML = `
    <strong class="oem-rule-banner__title">⚠ ${escapeHtml(label)} 特殊规则</strong>
    <ul class="oem-rule-banner__list">
      ${rules.map((item) => `
        <li>${escapeHtml(item.rule)}${item.source ? `（<a href="${escapeHtml(item.source)}" target="_blank" rel="noopener noreferrer">出处</a>）` : ""}</li>
      `).join("")}
    </ul>
    <p class="oem-rule-banner__footer">已自动注入原厂参考用例，将对所有已选渠道各跑一遍，结果与 Baseline 对照。</p>
  `;
  banner.classList.remove("is-hidden");
}

function renderRunV02ModelSelect() {
  if (!els.runV02ModelOptions) return;
  const lookupApi = window.NOCTUA_MODEL_LOOKUP;
  const evalIds = lookupApi?.getEvalModelIds?.() || [];
  ensureRunV02ModelId();
  renderRunV02OemRuleBanner();
  const selectedId = state.runV02.modelId;
  const filtered = evalIds.filter((modelId) => matchSearchQuery(state.runV02.modelSearch, modelId));
  if (!filtered.length) {
    els.runV02ModelOptions.innerHTML = `<li class="search-select__empty">没有匹配的模型</li>`;
  } else {
    els.runV02ModelOptions.innerHTML = filtered.map((modelId) => `
      <li
        class="search-select__option ${modelId === selectedId ? "is-selected" : ""}"
        role="option"
        data-run-v02-model="${escapeHtml(modelId)}"
        aria-selected="${modelId === selectedId}"
      >${escapeHtml(modelId)}</li>
    `).join("");
  }
  syncRunV02ModelMenu();
}

function runV02SupportedProtocol(protocolId) {
  return CHANNEL_ROUTE_CORE().supportedProtocol(protocolId);
}

function runV02ProtocolDef(protocolId) {
  return CHANNEL_ROUTE_CORE().protocolDef(protocolId);
}

function runV02ProtocolIsRunnable(def) {
  return CHANNEL_ROUTE_CORE().protocolIsRunnable(def);
}

/** 当前模型可跑批的协议（Chat / Anthropic）。 */
function listRunV02ProtocolOptions(modelId = ensureRunV02ModelId()) {
  return CHANNEL_ROUTE_CORE().listProtocolOptions(modelId);
}

/** Step 2 展示项：可跑批协议 + 规划中协议（如 Responses，仅展示不可选）。 */
function listRunV02ProtocolPickerItems(modelId = ensureRunV02ModelId()) {
  return CHANNEL_ROUTE_CORE().listProtocolPickerItems(modelId);
}

function runV02ActiveProtocolId() {
  return CHANNEL_ROUTE_CORE().activeProtocolId(state.runV02);
}

/** 当前所选协议下的渠道协议组合（不含其他协议）。 */
function runV02ChannelsForProtocol() {
  return CHANNEL_ROUTE_CORE().channelsForProtocol(state.runV02.routeOptions, runV02ActiveProtocolId());
}

function caseProtocolIdFromTestCase(testCase) {
  if (!testCase) return "";
  const path = String(testCase.path || testCase.payload?.path || "");
  if (path.includes("/messages")) return "anthropic_messages";
  if (path.includes("/chat/completions")) return "chat_completions";
  const caseId = String(testCase.case_id || "");
  if (/^am_/.test(caseId)) return "anthropic_messages";
  if (/^ali_protocol_|^oa_|^or_|^deepseek_|^sf_|^vllm_|^minimax_|^thinking_|^tools_|^response_format_/.test(caseId)) {
    if (/^am_/.test(caseId)) return "anthropic_messages";
    if (/^thinking_messages_/.test(caseId)) return "anthropic_messages";
    if (/^response_format_messages_/.test(caseId)) return "anthropic_messages";
    return "chat_completions";
  }
  if (/^thinking_messages_/.test(caseId) || /^response_format_messages_/.test(caseId)) {
    return "anthropic_messages";
  }
  return "";
}

function caseMatchesProtocol(testCase, protocolId = runV02ActiveProtocolId()) {
  if (!protocolId || !testCase) return false;
  const inferred = caseProtocolIdFromTestCase(testCase);
  if (inferred) return inferred === protocolId;
  if (testCase.category === "cache" || testCase.cache_case) {
    const path = String(testCase.path || "");
    if (path.includes("/messages")) return protocolId === "anthropic_messages";
    if (path.includes("/chat/completions")) return protocolId === "chat_completions";
  }
  return true;
}

function runV02CanonicalThinkingProviderId(protocolId) {
  return protocolId === "anthropic_messages" ? "thinking_messages" : "thinking";
}

function runV02CanonicalResponseFormatProviderId(protocolId) {
  return protocolId === "anthropic_messages" ? "response_format_messages" : "response_format";
}

function resetRunV02DownstreamFromProtocol() {
  state.runV02.baselineRouteKey = "";
  state.runV02.baselineRoute = null;
  state.runV02.targetRouteKeys = new Set();
  state.runV02.channelConfigs = {};
  state.runV02.baselineResults = {};
  state.runV02.cases = [];
  state.runV02.activeCaseGroupKey = "";
  state.runV02.selectedCaseIdsByGroup = {};
  if (els.runV02ChannelPanel) els.runV02ChannelPanel.classList.add("is-hidden");
  if (els.runV02ConfigPanel) els.runV02ConfigPanel.classList.add("is-hidden");
  if (els.runV02CasePanel) els.runV02CasePanel.classList.add("is-hidden");
}

function applyRunV02Protocol(protocolId, { autoSelectBaseline = false } = {}) {
  if (!protocolId || !runV02SupportedProtocol(protocolId)) return;
  if (protocolId === state.runV02.protocolId && !autoSelectBaseline) {
    renderRunV02ProtocolPicker();
    return;
  }
  state.runV02.protocolId = protocolId;
  resetRunV02DownstreamFromProtocol();
  if (els.runV02ChannelPanel) els.runV02ChannelPanel.classList.remove("is-hidden");
  renderRunV02ProtocolPicker();
  renderRunV02BaselineSelect({ autoSelect: autoSelectBaseline });
  renderRunV02TargetSelect();
  renderRunV02ChannelConfigs();
  loadRunV02Cases();
}

function renderRunV02ProtocolPicker() {
  if (!els.runV02ProtocolPicker) return;
  const modelId = ensureRunV02ModelId();
  const pickerItems = listRunV02ProtocolPickerItems(modelId);
  const runnableItems = pickerItems.filter(runV02ProtocolIsRunnable);
  const plannedItems = pickerItems.filter((def) => def.evalStatus === "planned");
  const activeId = runV02ActiveProtocolId();
  const pickerDisabled = !modelId || state.runV02.isRunning;

  if (els.runV02ProtocolHint) {
    if (!modelId) {
      els.runV02ProtocolHint.textContent = "先选择测评模型";
    } else if (!runnableItems.length && !plannedItems.length) {
      els.runV02ProtocolHint.textContent = "当前模型暂无可用协议";
    } else if (activeId) {
      const channelCount = runV02ChannelsForProtocol().length;
      els.runV02ProtocolHint.textContent = `${channelCount} 个渠道支持该协议`;
    } else {
      const plannedNote = plannedItems.length ? ` · ${plannedItems.length} 个即将支持` : "";
      els.runV02ProtocolHint.textContent = `${runnableItems.length} 个可用协议${plannedNote}`;
    }
  }

  if (!modelId) {
    els.runV02ProtocolPicker.innerHTML = `<p class="muted fs-sm">请先选择测评模型。</p>`;
    if (els.runV02ProtocolMeta) els.runV02ProtocolMeta.innerHTML = "";
    return;
  }

  if (!pickerItems.length) {
    els.runV02ProtocolPicker.innerHTML = `<p class="muted fs-sm">模型 ${escapeHtml(modelId)} 暂无可用测评协议。</p>`;
    if (els.runV02ProtocolMeta) els.runV02ProtocolMeta.innerHTML = "";
    return;
  }

  els.runV02ProtocolPicker.innerHTML = pickerItems.map((def) => {
    const planned = def.evalStatus === "planned";
    const tabDisabled = pickerDisabled || planned;
    return `
    <button
      type="button"
      class="run-v02-protocol-tab ${def.id === activeId ? "is-active" : ""} ${planned ? "is-planned" : ""}"
      data-run-v02-protocol="${escapeHtml(def.id)}"
      role="tab"
      aria-selected="${def.id === activeId}"
      aria-disabled="${tabDisabled}"
      ${tabDisabled ? "disabled" : ""}
      ${planned ? 'title="即将支持：暂无跑批 case，可在「已支持测评协议」页预览参数矩阵"' : ""}
    >
      <span class="run-v02-protocol-tab__head">
        <span>${escapeHtml(def.tabLabel)}</span>
        ${planned ? '<span class="protocol-status protocol-status--planned run-v02-protocol-tab__badge">即将支持</span>' : ""}
      </span>
      <span class="run-v02-protocol-tab__endpoint">${escapeHtml(def.endpoint)}</span>
    </button>
  `;
  }).join("");

  const activeDef = runV02ProtocolDef(activeId);
  if (els.runV02ProtocolMeta) {
    els.runV02ProtocolMeta.innerHTML = activeDef
      ? `<p>${escapeHtml(activeDef.copy)}</p><span class="mono muted">${escapeHtml(activeDef.label)}</span>`
      : `<p class="muted">选择协议后，下方渠道与 case 列表将仅展示该协议下的内容。Responses 协议即将支持跑批。</p>`;
  }
}

/** payloads/ 下已有 manifest 的 provider，与 GET /api/providers 一致。 */
const casePayloadProviders = new Set([
  "ali",
  "ali_messages",
  "claude",
  "claude_messages",
  "deepseek",
  "deepseek_messages",
  "minimax",
  "minimax_messages",
  "openai",
  "openrouter",
  "openrouter_messages",
  "siliconflow",
  "siliconflow_messages",
  "thinking",
  "thinking_messages",
  "tools",
  "tools_messages",
  "response_format",
  "response_format_messages",
  "vllm",
  "model_behaviors_deepseek",
  "model_behaviors_moonshot",
  "model_behaviors_zhipu",
  "model_behaviors_minimax"
]);

/** case 模板与 /api/run-stream 的 provider：渠道无专用 payloads 时回退到通用 OpenAI-compatible 库。 */
const RUN_V02_CANONICAL_PROTOCOL_CASE_PROVIDER = {
  chat_completions: "ali",
  anthropic_messages: "ali_messages"
};

/** V0.2 协议/流式：按协议独立的 canonical case id。 */
const CHAT_PROTOCOL_STREAM_CASE_IDS = new Set([
  "ali_protocol_stream_basic",
  "ali_protocol_stream_false",
  "ali_protocol_stream_include_usage",
  "ali_protocol_stream_usage_without_include_usage",
  "ali_protocol_stream_usage_chunk_shape"
]);

const ANTHROPIC_PROTOCOL_STREAM_CASE_IDS = new Set([
  "am_protocol_stream",
  "am_protocol_stream_false"
]);

const PROTOCOL_STREAM_CANONICAL_CASE_IDS = new Set([
  ...CHAT_PROTOCOL_STREAM_CASE_IDS,
  ...ANTHROPIC_PROTOCOL_STREAM_CASE_IDS
]);

function protocolStreamCanonicalCaseIds(protocolId) {
  if (protocolId === "anthropic_messages") return ANTHROPIC_PROTOCOL_STREAM_CASE_IDS;
  return CHAT_PROTOCOL_STREAM_CASE_IDS;
}

function isProtocolStreamCanonicalCaseId(caseId, protocolId = state.runV02?.protocolId) {
  const id = String(caseId || "");
  if (protocolId) return protocolStreamCanonicalCaseIds(protocolId).has(id);
  return PROTOCOL_STREAM_CANONICAL_CASE_IDS.has(id);
}

function runV02CanonicalCaseProviderId(route) {
  if (!route) return null;
  if (route.protocolId === "anthropic_messages") return "ali_messages";
  if (route.protocolId === "chat_completions") return "ali";
  return null;
}

function runV02CaseProviderId(route) {
  if (!route) return null;
  if (route.providerId && casePayloadProviders.has(route.providerId)) return route.providerId;
  return runV02CanonicalCaseProviderId(route);
}

/** 协议/采样、协议/思考模式 case 固定使用 canonical payloads；实际请求仍走各渠道的 base_url / model。 */
function runV02PayloadProviderId(route, caseIds = []) {
  const protocolId = route?.protocolId || runV02ActiveProtocolId();
  const ids = caseIds || [];
  if (ids.some((id) => isProtocolStreamCanonicalCaseId(id, protocolId))) {
    return RUN_V02_CANONICAL_PROTOCOL_CASE_PROVIDER[protocolId] || runV02CanonicalCaseProviderId(route);
  }
  if (ids.some((id) => /_protocol_sampling_temperature_/.test(id))) {
    return RUN_V02_CANONICAL_PROTOCOL_CASE_PROVIDER[protocolId] || runV02CanonicalCaseProviderId(route);
  }
  if (ids.some((id) => PROTOCOL_THINKING_CANONICAL_CASE_IDS.has(id) || /^a[ml]_protocol_thinking_/.test(id))) {
    return runV02CanonicalThinkingProviderId(protocolId);
  }
  if (ids.some((id) => PROTOCOL_TOOLS_CANONICAL_CASE_IDS.has(id))) {
    return protocolId === "anthropic_messages" ? "tools_messages" : "tools";
  }
  if (ids.some((id) => PROTOCOL_RESPONSE_FORMAT_CANONICAL_CASE_IDS.has(id))) {
    return runV02CanonicalResponseFormatProviderId(protocolId);
  }
  if (ids.some((id) => oemBehaviorsApi().OEM_CASE_IDS?.has(id))) {
    const vendorId = oemBehaviorsApi().inferEvalModelVendorId?.(state.runV02.modelId) || "deepseek";
    return oemBehaviorsApi().modelBehaviorsProviderId?.(vendorId) || runV02CanonicalCaseProviderId(route);
  }
  if (ids.some((id) => String(id).startsWith("cache_"))) {
    return runV02CanonicalCaseProviderId(route);
  }
  return runV02CanonicalCaseProviderId(route);
}

function runV02PayloadProviderForCase(route, testCase) {
  if (testCase?.custom) return runV02CanonicalCaseProviderId(route);
  return runV02PayloadProviderId(route, [testCase.case_id]);
}

function groupRunV02CasesByPayloadProvider(route, preparedCases = []) {
  const groups = new Map();
  for (const testCase of preparedCases) {
    const providerId = runV02PayloadProviderForCase(route, testCase);
    if (!providerId) continue;
    if (!groups.has(providerId)) groups.set(providerId, []);
    groups.get(providerId).push(testCase);
  }
  return groups;
}

async function streamRunV02ProviderBatch(route, config, providerId, cases, signal, onResult) {
  const builtInIds = cases.filter((testCase) => !testCase.custom).map((testCase) => testCase.case_id);
  const customCases = cases
    .filter((testCase) => testCase.custom)
    .map((testCase) => oemBehaviorsApi().toCustomCaseShape?.(testCase) || testCase);
  const response = await fetch(`${API_BASE}/api/run-stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      provider: providerId,
      endpoint_id: route.protocolId,
      base_url: config.baseUrl.trim(),
      model: route.apiModelId,
      api_key: config.useLocalKey ? "" : config.apiKey.trim(),
      config_platform_id: config.useLocalKey ? route.platformId : "",
      case_ids: builtInIds,
      custom_cases: customCases,
      proxy: getProxyConfig(),
      max_concurrency: 3
    })
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `HTTP ${response.status}`);
  }

  await readRunStream(response, (event) => {
    if (!state.runV02.isRunning) return;
    if (event.type === "error") throw new Error(event.error || "run stream failed");
    if (event.type === "end") return;
    if (event.type !== "result" || !event.result) return;
    onResult(event.result);
  });
}

async function loadCanonicalProtocolStreamCases(protocolId) {
  const providerId = RUN_V02_CANONICAL_PROTOCOL_CASE_PROVIDER[protocolId];
  if (!providerId) return [];
  try {
    const response = await fetch(`${API_BASE}/api/providers/${providerId}/cases?endpoint_id=${encodeURIComponent(protocolId)}`);
    if (!response.ok) return [];
    const data = await response.json();
    return (data.cases || []).filter(isProtocolStreamCase);
  } catch {
    return [];
  }
}

async function loadCanonicalProtocolThinkingCases(protocolId, channelId) {
  if (!protocolId || !channelId) return [];
  const providerId = runV02CanonicalThinkingProviderId(protocolId);
  if (!casePayloadProviders.has(providerId)) return [];
  try {
    const response = await fetch(`${API_BASE}/api/providers/${providerId}/cases?endpoint_id=${encodeURIComponent(protocolId)}`);
    if (!response.ok) return [];
    const data = await response.json();
    const canonical = (data.cases || []).filter(isProtocolThinkingCase);
    return thinkingCasesForChannel(canonical);
  } catch {
    return [];
  }
}

async function loadCanonicalProtocolToolsCases(protocolId, channelId) {
  if (!runV02ModelSupportsTools()) return [];
  const providerId = protocolId === "anthropic_messages" ? "tools_messages" : "tools";
  try {
    const response = await fetch(`${API_BASE}/api/providers/${providerId}/cases?endpoint_id=${encodeURIComponent(protocolId)}`);
    if (!response.ok) return [];
    const data = await response.json();
    const canonical = (data.cases || []).filter(isProtocolToolsCase);
    return toolsCasesForChannel(canonical);
  } catch {
    return [];
  }
}

async function loadCanonicalProtocolResponseFormatCases(protocolId, channelId) {
  if (!protocolId) return [];
  const providerId = runV02CanonicalResponseFormatProviderId(protocolId);
  if (!casePayloadProviders.has(providerId)) return [];
  try {
    const response = await fetch(`${API_BASE}/api/providers/${providerId}/cases?endpoint_id=${encodeURIComponent(protocolId)}`);
    if (!response.ok) return [];
    const data = await response.json();
    const canonical = (data.cases || []).filter(isProtocolResponseFormatCase);
    return responseFormatCasesForChannel(canonical);
  } catch {
    return [];
  }
}

async function loadCanonicalProtocolSamplingCases(protocolId) {
  const providerId = RUN_V02_CANONICAL_PROTOCOL_CASE_PROVIDER[protocolId];
  if (!providerId) return [];
  try {
    const response = await fetch(`${API_BASE}/api/providers/${providerId}/cases?endpoint_id=${encodeURIComponent(protocolId)}`);
    if (!response.ok) return [];
    const data = await response.json();
    return (data.cases || []).filter(isProtocolSamplingCase);
  } catch {
    return [];
  }
}

function runV02TargetCandidateOptions() {
  return CHANNEL_ROUTE_CORE().targetCandidateOptions(state.runV02.routeOptions, state.runV02.baselineRoute);
}

function runV02TargetRoutes() {
  return CHANNEL_ROUTE_CORE().targetRoutes(state.runV02);
}

function resolveRunV02LocalProvider(platformId) {
  return CHANNEL_ROUTE_CORE().resolveLocalProvider(platformId, state.runV02.localConfigProviders);
}

async function loadRunV02LocalConfig() {
  try {
    const response = await fetch(`${API_BASE}/api/local-config`);
    if (!response.ok) return;
    const data = await response.json();
    state.runV02.localConfigProviders = data.providers || {};
  } catch {
    state.runV02.localConfigProviders = {};
  }

  const routeKeys = new Set();
  if (state.runV02.baselineRouteKey) routeKeys.add(state.runV02.baselineRouteKey);
  for (const key of state.runV02.targetRouteKeys) routeKeys.add(key);

  for (const routeKey of routeKeys) {
    const route = runV02RouteByKey(routeKey);
    if (!route) continue;
    const local = resolveRunV02LocalProvider(route.platformId);
    let config = state.runV02.channelConfigs[routeKey];
    if (!config) {
      ensureRunV02ChannelConfig(routeKey, route);
      continue;
    }
    if (config.apiKey?.trim() && !config.useLocalKey) continue;
    if (!local?.api_key_hint) continue;
    config.useLocalKey = true;
    config.apiKeyHint = local.api_key_hint;
    config.apiKey = "";
    if (!config.baseUrl?.trim() && local.base_url) config.baseUrl = local.base_url;
  }
  renderRunV02ChannelConfigs();
  updateRunV02Availability();
}

function runV02ChannelApiKeyValue(config) {
  return CHANNEL_ROUTE_CORE().channelApiKeyValue(config);
}

function runV02ChannelHasApiKey(config) {
  return CHANNEL_ROUTE_CORE().channelHasApiKey(config);
}

function ensureRunV02ChannelConfig(routeKey, route) {
  return CHANNEL_ROUTE_CORE().ensureChannelConfig(
    state.runV02,
    routeKey,
    route,
    state.runV02.localConfigProviders
  );
}

function renderRunV02RouteOptions() {
  CHANNEL_ROUTE_CORE().refreshRouteOptions(state.runV02);

  renderRunV02ProtocolPicker();

  const protocolId = runV02ActiveProtocolId();
  const modelId = ensureRunV02ModelId();
  const options = state.runV02.routeOptions || [];
  const channelCount = runV02ChannelsForProtocol().length;
  if (els.runV02RouteHint) {
    if (!modelId) {
      els.runV02RouteHint.textContent = "先选择测评模型";
    } else if (!protocolId) {
      els.runV02RouteHint.textContent = "先选择测评协议";
    } else if (!options.length) {
      els.runV02RouteHint.textContent = "未找到支持该模型的渠道";
    } else if (!channelCount) {
      els.runV02RouteHint.textContent = "当前协议暂无可用渠道";
    } else if (!state.runV02.baselineRoute) {
      els.runV02RouteHint.textContent = `${channelCount} 个渠道 · 请选择 Baseline`;
    } else {
      const targetCount = state.runV02.targetRouteKeys.size;
      els.runV02RouteHint.textContent = targetCount
        ? `Baseline 已选 · ${targetCount} 个测评渠道`
        : "请选择至少一个测评渠道";
    }
  }

  const baselineDisabled = !protocolId || !channelCount || state.runV02.isRunning;
  if (els.runV02BaselineInput) els.runV02BaselineInput.disabled = baselineDisabled;
  if (els.runV02BaselineControl) els.runV02BaselineControl.classList.toggle("is-disabled", baselineDisabled);

  const targetDisabled = !state.runV02.baselineRoute || state.runV02.isRunning;
  if (els.runV02TargetInput) els.runV02TargetInput.disabled = targetDisabled;
  if (els.runV02TargetControl) els.runV02TargetControl.classList.toggle("is-disabled", targetDisabled);

  if (!protocolId || !channelCount) {
    state.runV02.baselineRouteKey = "";
    state.runV02.baselineRoute = null;
    state.runV02.targetRouteKeys = new Set();
    if (els.runV02ConfigPanel) els.runV02ConfigPanel.classList.add("is-hidden");
    if (els.runV02CasePanel) els.runV02CasePanel.classList.add("is-hidden");
  }
}

function renderRunV02BaselineSelect({ autoSelect = false } = {}) {
  renderRunV02RouteOptions();
  if (!els.runV02BaselineOptions) return;

  const options = runV02ChannelsForProtocol();
  const modelId = ensureRunV02ModelId();

  if (!options.length) {
    state.runV02.baselineRouteKey = "";
    state.runV02.baselineRoute = null;
    if (els.runV02BaselineInput) {
      els.runV02BaselineInput.value = "";
      els.runV02BaselineInput.placeholder = runV02ActiveProtocolId() ? "暂无可用渠道" : "先选择测评协议";
    }
    const emptyMsg = !runV02ActiveProtocolId()
      ? "请先选择测评协议"
      : `模型 ${escapeHtml(modelId)} 在当前协议下暂无可用渠道`;
    els.runV02BaselineOptions.innerHTML = `<li class="search-select__empty">${emptyMsg}</li>`;
    syncRunV02BaselineMenu();
    updateRunV02Availability();
    return;
  }

  if (!options.some((item) => item.key === state.runV02.baselineRouteKey)) {
    if (autoSelect) {
      applyRunV02Baseline(options[0].key);
      return;
    }
    state.runV02.baselineRouteKey = "";
    state.runV02.baselineRoute = null;
  }

  updateRunV02BaselineInputDisplay();

  const filtered = options.filter((option) => matchSearchQuery(
    state.runV02.baselineSearch,
    option.platformName,
    option.categoryLabel,
    option.protocolLabel,
    option.apiModelId,
    option.platformId,
    runV02RouteOptionLabel(option)
  ));

  if (!filtered.length) {
    els.runV02BaselineOptions.innerHTML = `<li class="search-select__empty">没有匹配的 Baseline 渠道</li>`;
  } else {
    els.runV02BaselineOptions.innerHTML = filtered.map((option) => `
      <li
        class="search-select__option ${option.key === state.runV02.baselineRouteKey ? "is-selected" : ""}"
        role="option"
        data-run-v02-baseline="${escapeHtml(option.key)}"
        aria-selected="${option.key === state.runV02.baselineRouteKey}"
      >${escapeHtml(runV02RouteOptionLabel(option))}</li>
    `).join("");
  }
  syncRunV02BaselineMenu();
  updateRunV02Availability();
}

function renderRunV02TargetTags() {
  if (!els.runV02TargetTags) return;
  const routes = runV02TargetRoutes();
  if (!routes.length) {
    els.runV02TargetTags.innerHTML = "";
    return;
  }
  els.runV02TargetTags.innerHTML = routes.map((route) => `
    <span class="search-select__tag">
      <span class="search-select__tag-label">${escapeHtml(route.platformName)}</span>
      <button
        type="button"
        class="search-select__tag-remove"
        data-run-v02-target-remove="${escapeHtml(route.key)}"
        aria-label="移除 ${escapeHtml(route.platformName)}"
        ${state.runV02.isRunning ? "disabled" : ""}
      >×</button>
    </span>
  `).join("");
}

function renderRunV02TargetSelect() {
  renderRunV02RouteOptions();
  if (!els.runV02TargetOptions) return;
  renderRunV02TargetTags();

  const baseline = state.runV02.baselineRoute;
  if (!baseline) {
    els.runV02TargetOptions.innerHTML = `<li class="search-select__empty">请先选择 Baseline 渠道</li>`;
    syncRunV02TargetMenu();
    return;
  }

  const options = runV02TargetCandidateOptions();
  const filtered = options.filter((option) => matchSearchQuery(
    state.runV02.targetSearch,
    option.platformName,
    option.categoryLabel,
    option.protocolLabel,
    option.apiModelId,
    option.platformId,
    runV02RouteOptionLabel(option)
  ));

  if (!filtered.length) {
    els.runV02TargetOptions.innerHTML = `<li class="search-select__empty">没有可测评的同协议渠道</li>`;
  } else {
    els.runV02TargetOptions.innerHTML = filtered.map((option) => {
      const checked = state.runV02.targetRouteKeys.has(option.key);
      return `
        <li
          class="search-select__option ${checked ? "is-checked is-selected" : ""}"
          role="option"
          data-run-v02-target="${escapeHtml(option.key)}"
          aria-selected="${checked}"
        >${escapeHtml(runV02RouteOptionLabel(option))}</li>
      `;
    }).join("");
  }
  syncRunV02TargetMenu();
  updateRunV02Availability();
}

function renderRunV02ChannelConfigs() {
  if (!els.runV02ChannelConfigs) return;
  const baseline = state.runV02.baselineRoute;
  const targets = runV02TargetRoutes();
  if (!baseline) {
    els.runV02ChannelConfigs.innerHTML = "";
    return;
  }

  const rows = [
    { route: baseline, role: "baseline", badge: "Baseline", badgeClass: "run-v02-channel-config__badge--baseline" },
    ...targets.map((route) => ({ route, role: "target", badge: "测评", badgeClass: "" }))
  ];

  els.runV02ChannelConfigs.innerHTML = rows.map(({ route, badge, badgeClass }) => {
    const config = ensureRunV02ChannelConfig(route.key, route);
    return `
      <div class="run-v02-channel-config" data-run-v02-config="${escapeHtml(route.key)}">
        <div class="run-v02-channel-config__head">
          <span class="run-v02-channel-config__badge ${badgeClass}">${escapeHtml(badge)}</span>
          <span>${escapeHtml(route.platformName)} · ${escapeHtml(route.protocolLabel)}</span>
        </div>
        <div class="config-row">
          <label class="fld">
            <span>API 模型 ID</span>
            <input class="inp mono" type="text" value="${escapeHtml(route.apiModelId || "")}" readonly />
          </label>
          <label class="fld">
            <span>Endpoint 地址</span>
            <input
              class="inp mono"
              type="text"
              data-run-v02-config-field="baseUrl"
              data-run-v02-config-key="${escapeHtml(route.key)}"
              value="${escapeHtml(config.baseUrl || "")}"
              placeholder="https://..."
              ${state.runV02.isRunning ? "disabled" : ""}
            />
          </label>
          <label class="fld">
            <span>API Key${config.useLocalKey ? ' <span class="muted fs-xs">config.yaml</span>' : ""}</span>
            <input
              class="inp mono"
              type="${config.useLocalKey ? "text" : "password"}"
              data-run-v02-config-field="apiKey"
              data-run-v02-config-key="${escapeHtml(route.key)}"
              value="${escapeHtml(runV02ChannelApiKeyValue(config))}"
              placeholder="${config.useLocalKey ? "" : "sk-..."}"
              title="${config.useLocalKey ? "来自 config.yaml（已脱敏），跑批时由后端读取完整 Key" : "自定义 API Key"}"
              autocomplete="off"
              ${state.runV02.isRunning ? "disabled" : ""}
            />
          </label>
        </div>
      </div>
    `;
  }).join("");
}

function renderRunV02RouteSelect(opts) {
  renderRunV02BaselineSelect(opts);
  renderRunV02TargetSelect();
  renderRunV02ChannelConfigs();
}

function ensureRunV02ModelId() {
  return CHANNEL_ROUTE_CORE().ensureModelId(state.runV02);
}

function runV02RouteByKey(routeKey = state.runV02.baselineRouteKey) {
  return CHANNEL_ROUTE_CORE().routeByKey(state.runV02.routeOptions, routeKey);
}

function runContextForV02(route, config) {
  if (!route) return {};
  const cfg = config || ensureRunV02ChannelConfig(route.key, route);
  return {
    provider: route.providerId,
    endpoint_id: route.protocolId,
    endpoint_label: route.protocolLabel,
    channel_id: route.runtimeChannelId,
    channel_name: route.platformName,
    base_url: (cfg.baseUrl || "").trim(),
    model: route.apiModelId
  };
}

function allRunV02ConfigsReady() {
  const baseline = state.runV02.baselineRoute;
  if (!baseline) return false;
  const routes = [baseline, ...runV02TargetRoutes()];
  return routes.every((route) => {
    const cfg = ensureRunV02ChannelConfig(route.key, route);
    return Boolean(cfg.baseUrl?.trim() && runV02ChannelHasApiKey(cfg));
  });
}

function cacheDisplayFromResponseBody(responseBody) {
  const display = responseBody?.cache_display;
  if (!display || typeof display !== "object") return null;
  return {
    hitTokens: display["缓存命中 tokens"] || "—",
    hitRate: display["缓存命中率"] || "—",
    hitField: display["命中字段"] || "—"
  };
}

function cacheResultDiffLabel(result) {
  const display = cacheDisplayFromResponseBody(result.response_body);
  if (!display) return "—";
  if (display.hitRate === "0%" && display.hitTokens === "0") {
    return `0 tokens · ${display.hitRate}`;
  }
  return `${display.hitTokens} tokens · ${display.hitRate}`;
}

function mapRunV02Result(result, route, index = 0, { isBaseline = false, baselineResponse = null } = {}) {
  const config = ensureRunV02ChannelConfig(route.key, route);
  const context = runContextForV02(route, config);
  const testCase = (state.runV02.cases || []).find((item) => item.case_id === result.case_id);
  const groupMeta = runV02GroupMetaForCaseId(result.case_id);
  const parameters = result.parameters?.length ? result.parameters : testCase?.parameters || ["payload"];
  const responseBody = result.response_body || null;
  const supportConclusion = result.support_conclusion || inferSiliconFlowConclusion(testCase || {});
  const meta = supportConclusionMeta[supportConclusion] || supportConclusionMeta.unknown;
  const cacheCase = isCacheHitCase(testCase || { case_id: result.case_id, category: result.category });
  const cacheDisplay = cacheDisplayFromResponseBody(responseBody);
  let diffCount = 0;
  if (cacheCase) {
    diffCount = 0;
  } else if (isBaseline) {
    diffCount = 0;
  } else if (baselineResponse && responseBody && typeof responseBody === "object") {
    diffCount = compareStructure(baselineResponse, responseBody).length;
  } else if (result.error) {
    diffCount = 1;
  }
  return enrichResultAxes({
    result_uid: resultUid(context, result, index),
    case_id: result.case_id,
    title: testCase ? caseTitle(testCase) : result.title || "",
    channel_id: context.channel_id,
    channel_name: context.channel_name,
    provider: context.provider,
    endpoint_id: context.endpoint_id,
    endpoint_label: context.endpoint_label,
    base_url: context.base_url,
    model: context.model,
    target_label: `${context.channel_name || context.provider || "target"} / ${context.model || "model"}`,
    parameter: parameters.join(" + "),
    category: result.category || testCase?.category || "case",
    support_conclusion: supportConclusion,
    status: meta.status,
    http_status: result.http_status || meta.httpStatus,
    latency_ms: result.latency_ms || 0,
    diff_count: diffCount,
    cache_display: cacheDisplay,
    cache_hit_summary: cacheDisplay ? cacheResultDiffLabel({ response_body: responseBody }) : "",
    message: result.error || meta.note,
    proxy: getProxyConfig(),
    source_case: testCase,
    request_headers: result.request_headers,
    request_body: result.request_body,
    response_body: responseBody,
    raw_response: result.raw_response || "",
    response_headers: result.response_headers,
    assertions: result.assertions || [],
    expected_http_status: result.expected_http_status,
    expected_support_conclusion: result.expected_support_conclusion,
    error: result.error || "",
    is_baseline: isBaseline,
    channel_route_key: route?.key || "",
    case_group_key: testCase?.__run_group_key || groupMeta.key || result.case_group_key || "",
    case_group_title: testCase?.__run_group_title || groupMeta.title || result.case_group_title || ""
  });
}

function updateRunV02Availability() {
  if (!els.runV02Tests) return;
  const protocolId = runV02ActiveProtocolId();
  const baseline = state.runV02.baselineRoute;
  const targets = runV02TargetRoutes();
  const cases = state.runV02.cases || [];
  const canRun = Boolean(
    protocolId
    && baseline
    && runV02CaseProviderId(baseline)
    && targets.length
    && allRunV02ConfigsReady()
    && cases.length
    && runV02TotalSelectedCaseCount()
    && !state.runV02.isCaseLoading
    && !state.runV02.isRunning
  );
  els.runV02Tests.disabled = !canRun;
  if (els.runV02StopTests) els.runV02StopTests.disabled = !state.runV02.isRunning;
}

function runV02CaseGroupSelectionState(group) {
  const selectedIds = runV02CaseGroupSelection(group.key);
  const total = group.cases.length;
  const selected = group.cases.filter((testCase) => selectedIds.has(testCase.case_id)).length;
  return {
    selected,
    total,
    all: total > 0 && selected === total,
    none: selected === 0
  };
}

function setRunV02CaseGroupSelection(groupKey, selected) {
  const group = listRunV02CaseGroups(state.runV02.cases || []).find((item) => item.key === groupKey);
  if (!group) return;
  state.runV02.selectedCaseIdsByGroup[groupKey] = selected
    ? new Set(group.cases.map((testCase) => testCase.case_id))
    : new Set();
}

function syncRunV02CaseGroupTabChecks() {
  if (!els.runV02CaseGroupPicker) return;
  for (const input of els.runV02CaseGroupPicker.querySelectorAll("[data-run-v02-case-group-toggle]")) {
    const group = listRunV02CaseGroups(state.runV02.cases || []).find((item) => item.key === input.dataset.runV02CaseGroupToggle);
    if (!group) continue;
    const { all, none } = runV02CaseGroupSelectionState(group);
    input.checked = all;
    input.indeterminate = !all && !none;
  }
}

function renderRunV02SelectedCaseCount() {
  const group = runV02ActiveCaseGroup();
  const total = group?.cases.length || 0;
  const selectedIds = group ? runV02CaseGroupSelection(group.key) : new Set();
  const selected = group ? group.cases.filter((testCase) => selectedIds.has(testCase.case_id)).length : 0;
  const allSelected = runV02TotalSelectedCaseCount();
  const groupCount = runV02SelectedGroupCount();
  if (els.runV02SelectedCaseCount) {
    els.runV02SelectedCaseCount.textContent = group
      ? `本组 ${selected}/${total} · 共已选 ${allSelected} 个 case · ${groupCount} 个分组`
      : `共已选 ${allSelected} 个 case`;
  }
  updateRunV02Availability();
}

function assignOemCaseToBucket(testCase, buckets) {
  const api = oemBehaviorsApi();
  if (!api.isOemReferenceCase?.(testCase)) return false;
  const target = api.oemTargetGroup?.(testCase);
  if (!target || !buckets[target]) return false;
  buckets[target].push(testCase);
  return true;
}

function sortRunV02GroupCases(cases = []) {
  const api = oemBehaviorsApi();
  return api.sortCasesInGroup?.(cases) || cases;
}

function listRunV02CaseGroups(cases = []) {
  const connectivity = [];
  const protocolStream = [];
  const protocolSampling = [];
  const protocolThinking = [];
  const protocolTools = [];
  const protocolResponseFormat = [];
  const outputLength = [];
  const cacheHit = [];
  const buckets = {
    connectivity,
    protocol: protocolStream,
    protocol_sampling: protocolSampling,
    protocol_thinking: protocolThinking,
    protocol_tools: protocolTools,
    protocol_response_format: protocolResponseFormat,
    output_length: outputLength,
    cache_hit: cacheHit
  };
  for (const testCase of cases) {
    if (assignOemCaseToBucket(testCase, buckets)) continue;
    if (isCacheHitCase(testCase)) cacheHit.push(testCase);
    else if (isConnectivityCase(testCase)) connectivity.push(testCase);
    else if (isProtocolStreamCase(testCase)) protocolStream.push(testCase);
    else if (isProtocolSamplingCase(testCase)) protocolSampling.push(testCase);
    else if (isProtocolThinkingCase(testCase)) protocolThinking.push(testCase);
    else if (isProtocolToolsCase(testCase)) protocolTools.push(testCase);
    else if (isProtocolResponseFormatCase(testCase)) protocolResponseFormat.push(testCase);
    else if (isOutputLengthCase(testCase)) outputLength.push(testCase);
  }
  return [
    { key: "connectivity", title: "连通性", cases: sortRunV02GroupCases(connectivity) },
    { key: "protocol", title: "流式/非流式", cases: sortRunV02GroupCases(protocolStream) },
    { key: "protocol_sampling", title: "采样参数", cases: sortRunV02GroupCases(protocolSampling) },
    { key: "protocol_thinking", title: "思考模式", cases: sortRunV02GroupCases(protocolThinking) },
    { key: "protocol_tools", title: "工具调用", cases: sortRunV02GroupCases(protocolTools) },
    { key: "protocol_response_format", title: "输出控制", cases: sortRunV02GroupCases(protocolResponseFormat) },
    { key: "output_length", title: "输出长度", cases: sortRunV02GroupCases(outputLength) },
    { key: "cache_hit", title: "缓存命中率", cases: sortRunV02GroupCases(cacheHit) }
  ].filter((group) => group.cases.length);
}

function runV02CaseGroupSelection(groupKey) {
  if (!groupKey) return new Set();
  if (!state.runV02.selectedCaseIdsByGroup[groupKey]) {
    state.runV02.selectedCaseIdsByGroup[groupKey] = new Set();
  }
  return state.runV02.selectedCaseIdsByGroup[groupKey];
}

function runV02ActiveCaseGroup() {
  const groups = listRunV02CaseGroups(state.runV02.cases || []);
  if (!groups.length) return null;
  return groups.find((group) => group.key === state.runV02.activeCaseGroupKey) || groups[0];
}

function runV02SelectionSnapshot(cases = state.runV02.cases || []) {
  return listRunV02CaseGroups(cases)
    .map((group) => ({
      group_key: group.key,
      group_title: group.title,
      case_ids: group.cases
        .filter((testCase) => runV02CaseGroupSelection(group.key).has(testCase.case_id))
        .map((testCase) => testCase.case_id)
    }))
    .filter((entry) => entry.case_ids.length > 0);
}

function runV02AllSelectedCasesForRun() {
  const byId = new Map();
  for (const group of listRunV02CaseGroups(state.runV02.cases || [])) {
    const selectedIds = runV02CaseGroupSelection(group.key);
    for (const testCase of group.cases) {
      if (!selectedIds.has(testCase.case_id) || byId.has(testCase.case_id)) continue;
      byId.set(testCase.case_id, {
        ...testCase,
        __run_group_key: group.key,
        __run_group_title: group.title
      });
    }
  }
  return Array.from(byId.values());
}

function runV02TotalSelectedCaseCount() {
  return runV02AllSelectedCasesForRun().length;
}

function runV02GroupMetaForCaseId(caseId) {
  for (const group of listRunV02CaseGroups(state.runV02.cases || [])) {
    if (group.cases.some((testCase) => testCase.case_id === caseId)) {
      return { key: group.key, title: group.title };
    }
  }
  return { key: "", title: "" };
}

function runV02SelectedGroupCount() {
  return runV02SelectionSnapshot().length;
}

function initRunV02CaseGroupState(cases = []) {
  const groups = listRunV02CaseGroups(cases);
  const selectedCaseIdsByGroup = {};
  for (const group of groups) {
    selectedCaseIdsByGroup[group.key] = new Set();
  }
  state.runV02.selectedCaseIdsByGroup = selectedCaseIdsByGroup;
  const preferred = groups.find((group) => group.key === "connectivity") || groups[0];
  state.runV02.activeCaseGroupKey = preferred?.key || "";
}

function renderRunV02CaseGroupPicker() {
  if (!els.runV02CaseGroupPicker) return;
  const groups = listRunV02CaseGroups(state.runV02.cases || []);
  const activeKey = runV02ActiveCaseGroup()?.key || "";
  if (!groups.length) {
    els.runV02CaseGroupPicker.innerHTML = "";
    return;
  }
  els.runV02CaseGroupPicker.innerHTML = groups.map((group) => {
    const { selected, total, all } = runV02CaseGroupSelectionState(group);
    const toggleTitle = all ? `取消全选：${group.title}` : `全选：${group.title}`;
    return `
      <div class="run-v02-case-group-tab ${group.key === activeKey ? "is-active" : ""}" role="presentation">
        <label class="run-v02-case-group-tab__check" title="${escapeHtml(toggleTitle)}" aria-label="${escapeHtml(toggleTitle)}">
          <input
            type="checkbox"
            data-run-v02-case-group-toggle="${escapeHtml(group.key)}"
            ${all ? "checked" : ""}
            ${state.runV02.isRunning || state.runV02.isCaseLoading ? "disabled" : ""}
          />
        </label>
        <button
          type="button"
          class="run-v02-case-group-tab__btn"
          data-run-v02-case-group="${escapeHtml(group.key)}"
          role="tab"
          aria-selected="${group.key === activeKey}"
          ${state.runV02.isRunning || state.runV02.isCaseLoading ? "disabled" : ""}
        >
          <span>${escapeHtml(group.title)}</span>
          <span class="run-v02-case-group-tab__count">${selected}/${total}</span>
        </button>
      </div>
    `;
  }).join("");
  syncRunV02CaseGroupTabChecks();
}

function renderRunV02CaseInfoTip(text) {
  return `
    <span class="case-info-tip" tabindex="0" aria-label="说明">
      <span class="case-info-tip__icon" aria-hidden="true">?</span>
      <span class="case-info-tip__bubble" role="tooltip">${escapeHtml(text)}</span>
    </span>
  `;
}

function renderRunV02CaseRow(testCase) {
  const group = runV02ActiveCaseGroup();
  const selectedIds = group ? runV02CaseGroupSelection(group.key) : new Set();
  const checked = selectedIds.has(testCase.case_id);
  const disabled = state.runV02.isRunning || state.runV02.isCaseLoading;
  const connectivity = isConnectivityCase(testCase);
  const protocolP0 = isProtocolStreamCaseP0(testCase);
  const protocolP0NonStream = isProtocolStreamCaseP0NonStream(testCase);
  const protocolP1UsageObserved = isProtocolStreamUsageObservedCase(testCase);
  const protocolP1IncludeUsage = isProtocolStreamCaseP1IncludeUsage(testCase);
  const protocolP1UsageChunkShape = isProtocolStreamUsageChunkShapeCase(testCase);
  const protocolSampling = isProtocolSamplingCase(testCase);
  const protocolThinking = isProtocolThinkingCase(testCase);
  const protocolTools = isProtocolToolsCase(testCase);
  const protocolResponseFormat = isProtocolResponseFormatCase(testCase);
  const outputLength = isOutputLengthCase(testCase);
  const title = caseTitle(testCase);
  let tipHtml = "";
  if (connectivity) tipHtml = renderRunV02CaseInfoTip(RUN_V02_CONNECTIVITY_CASE_TOOLTIP);
  else if (protocolP0) tipHtml = renderRunV02CaseInfoTip(RUN_V02_PROTOCOL_STREAM_BASIC_TOOLTIP);
  else if (protocolP0NonStream) tipHtml = renderRunV02CaseInfoTip(RUN_V02_PROTOCOL_STREAM_FALSE_TOOLTIP);
  else if (protocolP1UsageObserved) tipHtml = renderRunV02CaseInfoTip(RUN_V02_PROTOCOL_STREAM_USAGE_OBSERVED_TOOLTIP);
  else if (protocolP1IncludeUsage) tipHtml = renderRunV02CaseInfoTip(RUN_V02_PROTOCOL_STREAM_USAGE_TOOLTIP);
  else if (protocolP1UsageChunkShape) tipHtml = renderRunV02CaseInfoTip(RUN_V02_PROTOCOL_STREAM_USAGE_CHUNK_SHAPE_TOOLTIP);
  else if (protocolSampling) tipHtml = renderRunV02CaseInfoTip(RUN_V02_PROTOCOL_SAMPLING_TOOLTIP);
  else if (protocolThinking) tipHtml = renderRunV02CaseInfoTip(RUN_V02_PROTOCOL_THINKING_TOOLTIP);
  else if (protocolTools) tipHtml = renderRunV02CaseInfoTip(protocolToolsCaseTooltip(testCase));
  else if (protocolResponseFormat) tipHtml = renderRunV02CaseInfoTip(protocolResponseFormatCaseTooltip(testCase));
  else if (outputLength) tipHtml = renderRunV02CaseInfoTip(outputLengthCaseTooltip(testCase));
  else if (testCase.case_id === "cache_passive_long_prompt") tipHtml = renderRunV02CaseInfoTip(RUN_V02_CACHE_PASSIVE_TOOLTIP);
  else if (testCase.case_id === "cache_prompt_cache_key") tipHtml = renderRunV02CaseInfoTip(RUN_V02_CACHE_PROMPT_KEY_TOOLTIP);
  else if (testCase.case_id === "cache_control_ephemeral") tipHtml = renderRunV02CaseInfoTip(RUN_V02_CACHE_CONTROL_TOOLTIP);
  else if (/_hit_rate_85$/.test(String(testCase.case_id || ""))) tipHtml = renderRunV02CaseInfoTip(RUN_V02_CACHE_HIT_RATE_85_TOOLTIP);
  const cacheHit = isCacheHitCase(testCase);
  const hideCaseId = connectivity || protocolP0 || protocolP0NonStream || protocolP1UsageObserved || protocolP1IncludeUsage || protocolP1UsageChunkShape || protocolSampling || protocolThinking || protocolTools || protocolResponseFormat || outputLength || cacheHit;
  const oemCase = oemBehaviorsApi().isOemReferenceCase?.(testCase);
  const oemSource = oemCase ? oemBehaviorsApi().oemSource?.(testCase) : "";
  const oemTagHtml = oemCase
    ? `<span class="case-row__oem-tag" title="${escapeHtml(oemSource || "原厂参考")}">原厂参考</span>`
    : "";
  const caseIdHtml = hideCaseId
    ? ""
    : `<span class="muted mono fs-xs">${escapeHtml(testCase.case_id)}</span>`;
  return `
    <label class="case-row ${disabled ? "is-disabled" : ""}">
      <input type="checkbox" data-v02-case-id="${escapeHtml(testCase.case_id)}" ${checked ? "checked" : ""} ${disabled ? "disabled" : ""} />
      <span class="case-row__main">
        <strong class="case-row__title-line">${escapeHtml(title)}${oemTagHtml}${tipHtml}</strong>
        ${caseIdHtml}
      </span>
    </label>
  `;
}

function renderRunV02ProtocolThinkingSections(cases = []) {
  const channelId = runV02ProtocolEvalChannelId(state.runV02.baselineRoute);
  const cfg = channelId ? THINKING_CHANNEL_DIALECTS[channelId] : null;
  const axes = partitionProtocolThinkingForDisplay(cases);
  if (!axes.length) return '<div class="case-empty">当前渠道官方文档未列出可测的思考模式字段。</div>';
  return `
    <div class="run-v02-thinking-combos">
      ${axes.map(([group, groupCases]) => {
        const label = THINKING_AXIS_LABELS[group] || group;
        const hint = THINKING_AXIS_HINTS[group] || "";
        if (group === "switch" && cfg) {
          const fieldTags = thinkingSwitchFieldTags();
          const dialectBlocks = groupThinkingCasesBySwitchField(groupCases);
          return `
        <section class="run-v02-thinking-combo">
          <header class="run-v02-thinking-combo__head">
            <span class="run-v02-thinking-axis__label">
              <span class="run-v02-thinking-combo__params">${escapeHtml(label)}</span>
              ${fieldTags.map((tag) => `<code class="run-v02-thinking-axis__field">${escapeHtml(tag)}</code>`).join("")}
              ${hint ? `<span class="muted fs-xs">${escapeHtml(hint)}</span>` : ""}
            </span>
            <span class="muted fs-xs">${groupCases.length} 个 case</span>
          </header>
          <div class="run-v02-thinking-dialect-blocks">
            ${dialectBlocks.map((block) => `
            <div class="run-v02-thinking-dialect-block">
              <div class="case-rows">${block.cases.map(renderRunV02CaseRow).join("")}</div>
            </div>`).join("")}
          </div>
        </section>`;
        }
        const field = thinkingChannelFieldForGroup(cfg, group);
        return `
        <section class="run-v02-thinking-combo">
          <header class="run-v02-thinking-combo__head">
            <span class="run-v02-thinking-axis__label">
              <span class="run-v02-thinking-combo__params">${escapeHtml(label)}</span>
              ${field ? `<code class="run-v02-thinking-axis__field">${escapeHtml(field)}</code>` : ""}
              ${hint ? `<span class="muted fs-xs">${escapeHtml(hint)}</span>` : ""}
            </span>
            <span class="muted fs-xs">${groupCases.length} 个 case</span>
          </header>
          <div class="case-rows">${groupCases.map(renderRunV02CaseRow).join("")}</div>
        </section>`;
      }).join("")}
    </div>
  `;
}

function renderRunV02OutputLengthSections(cases = []) {
  const axes = partitionOutputLengthForDisplay(cases);
  if (!axes.length) return '<div class="case-empty">当前渠道暂无输出长度 case。</div>';
  return `
    <div class="run-v02-thinking-combos">
      ${axes.map(([axis, axisCases]) => {
        const label = LENGTH_AXIS_LABELS[axis] || axis;
        const hint = LENGTH_AXIS_HINTS[axis] || "";
        return `
        <section class="run-v02-thinking-combo">
          <header class="run-v02-thinking-combo__head">
            <span class="run-v02-thinking-axis__label">
              <span class="run-v02-thinking-combo__params">${escapeHtml(label)}</span>
              ${hint ? `<span class="muted fs-xs">${escapeHtml(hint)}</span>` : ""}
            </span>
            <span class="muted fs-xs">${axisCases.length} 个 case</span>
          </header>
          <div class="case-rows">${axisCases.map(renderRunV02CaseRow).join("")}</div>
        </section>`;
      }).join("")}
    </div>
  `;
}

function renderRunV02ScopedCaseSections(cases = []) {
  const api = oemBehaviorsApi();
  const { common, oem } = api.partitionCasesByScope?.(cases) || { common: cases, oem: [] };
  if (!oem.length) {
    return `<div class="case-rows">${cases.map(renderRunV02CaseRow).join("")}</div>`;
  }
  const vendorLabel = api.oemVendorLabel?.(oem) || "原厂";
  return `
    <div class="run-v02-case-scope-sections">
      ${common.length ? `
        <section class="run-v02-case-scope-section">
          <header class="run-v02-case-scope-section__head">
            <span class="run-v02-case-scope-section__title">公共</span>
            <span class="muted fs-xs">${common.length} 个 case</span>
          </header>
          <div class="case-rows">${common.map(renderRunV02CaseRow).join("")}</div>
        </section>` : ""}
      <section class="run-v02-case-scope-section run-v02-case-scope-section--oem">
        <header class="run-v02-case-scope-section__head">
          <span class="run-v02-case-scope-section__title">${escapeHtml(vendorLabel)} 原厂参考</span>
          <span class="muted fs-xs">对照原厂文档特殊处理 · 全渠道测评 · ${oem.length} 个 case</span>
        </header>
        <div class="case-rows">${oem.map(renderRunV02CaseRow).join("")}</div>
      </section>
    </div>`;
}

function renderRunV02CaseGroups() {
  if (!els.runV02CaseGroups) return;
  const cases = state.runV02.cases || [];
  if (state.runV02.isCaseLoading) {
    els.runV02CaseGroups.innerHTML = '<div class="case-loading">正在从后端加载 cases...</div>';
    if (els.runV02CaseGroupPicker) els.runV02CaseGroupPicker.innerHTML = "";
    renderRunV02SelectedCaseCount();
    return;
  }
  if (!cases.length) {
    const protocolId = runV02ActiveProtocolId();
    const baseline = state.runV02.baselineRoute;
    const hint = !protocolId
      ? "请先选择测评协议。"
      : baseline && !runV02CaseProviderId(baseline)
        ? "当前协议暂无可用 case 模板。"
        : "正在加载该协议下的 case…";
    els.runV02CaseGroups.innerHTML = `<div class="case-error"><span>${escapeHtml(hint)}</span></div>`;
    if (els.runV02CaseGroupPicker) els.runV02CaseGroupPicker.innerHTML = "";
    renderRunV02SelectedCaseCount();
    return;
  }

  const group = runV02ActiveCaseGroup();
  renderRunV02CaseGroupPicker();
  if (!group) {
    els.runV02CaseGroups.innerHTML = "";
    renderRunV02SelectedCaseCount();
    return;
  }

  els.runV02CaseGroups.innerHTML = group.key === "protocol_thinking"
    ? renderRunV02ProtocolThinkingSections(group.cases)
    : group.key === "output_length"
      ? renderRunV02OutputLengthSections(group.cases)
      : renderRunV02ScopedCaseSections(group.cases);
  renderRunV02SelectedCaseCount();
}

function applyRunV02Baseline(routeKey) {
  const route = runV02RouteByKey(routeKey);
  const protocolId = runV02ActiveProtocolId();
  if (!route || !runV02SupportedProtocol(route.protocolId)) return;
  if (protocolId && route.protocolId !== protocolId) return;
  state.runV02.baselineRouteKey = routeKey;
  state.runV02.baselineRoute = route;
  ensureRunV02ChannelConfig(routeKey, route);
  state.runV02.targetRouteKeys.delete(routeKey);
  const validTargetKeys = new Set(runV02TargetCandidateOptions().map((item) => item.key));
  state.runV02.targetRouteKeys = new Set(
    [...state.runV02.targetRouteKeys].filter((key) => validTargetKeys.has(key))
  );
  state.runV02.baselineResults = {};
  state.runV02.activeCaseGroupKey = "";
  state.runV02.selectedCaseIdsByGroup = {};
  closeRunV02BaselineMenu();

  if (els.runV02ConfigPanel) els.runV02ConfigPanel.classList.remove("is-hidden");
  if (els.runV02CasePanel) els.runV02CasePanel.classList.remove("is-hidden");
  if (els.runV02SelectedRoute && route) {
    els.runV02SelectedRoute.textContent = `Baseline: ${route.platformName} · ${route.protocolLabel}`;
  }
  loadRunV02Cases();
  loadRunV02LocalConfig();
  renderRunV02BaselineSelect();
  renderRunV02TargetSelect();
  renderRunV02ChannelConfigs();
}

function toggleRunV02Target(routeKey) {
  const route = runV02RouteByKey(routeKey);
  if (!route || routeKey === state.runV02.baselineRouteKey) return;
  if (!runV02TargetCandidateOptions().some((item) => item.key === routeKey)) return;
  if (state.runV02.targetRouteKeys.has(routeKey)) {
    state.runV02.targetRouteKeys.delete(routeKey);
  } else {
    state.runV02.targetRouteKeys.add(routeKey);
    ensureRunV02ChannelConfig(routeKey, route);
  }
  loadRunV02LocalConfig();
  renderRunV02TargetSelect();
  renderRunV02ChannelConfigs();
  updateRunV02Availability();
}

async function loadModelOemBehaviorCases(vendorId, protocolId, modelId) {
  const api = oemBehaviorsApi();
  if (!vendorId || vendorId === "other" || protocolId !== "chat_completions") return [];
  const providerId = api.modelBehaviorsProviderId?.(vendorId);
  if (!providerId || !casePayloadProviders.has(providerId)) return [];
  try {
    const response = await fetch(`${API_BASE}/api/providers/${providerId}/cases?endpoint_id=${encodeURIComponent(protocolId)}`);
    if (!response.ok) return [];
    const data = await response.json();
    return (data.cases || [])
      .filter((testCase) => {
        const caseVendor = api.oemVendorId?.(testCase) || vendorId;
        return !caseVendor || caseVendor === vendorId;
      })
      .filter((testCase) => api.caseAppliesToModel?.(testCase, modelId) ?? true);
  } catch {
    return [];
  }
}

async function loadRunV02Cases() {
  const protocolId = runV02ActiveProtocolId();
  if (!protocolId) return;

  const route = state.runV02.baselineRoute;
  const caseProviderId = runV02CanonicalCaseProviderId(route)
    || RUN_V02_CANONICAL_PROTOCOL_CASE_PROVIDER[protocolId];
  if (!caseProviderId) return;

  if (state.runV02.modelCapabilities?.tools?.source === "loading" || state.runV02.modelCapabilities?.tools == null) {
    await refreshRunV02ModelToolsCapability();
  }

  const loadToken = `${protocolId}:${route?.key || "canonical"}`;
  state.runV02.isCaseLoading = true;
  renderRunV02CaseGroups();
  updateRunV02Availability();

  try {
    const response = await fetch(`${API_BASE}/api/providers/${caseProviderId}/cases?endpoint_id=${encodeURIComponent(protocolId)}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const currentToken = `${runV02ActiveProtocolId()}:${state.runV02.baselineRoute?.key || "canonical"}`;
    if (currentToken !== loadToken) return;
    let cases = (data.cases || []).filter((testCase) => caseMatchesProtocol(testCase, protocolId));
    const canonicalStream = await loadCanonicalProtocolStreamCases(protocolId);
    if (canonicalStream.length) {
      cases = cases.filter((testCase) => !isProtocolStreamCase(testCase));
      cases = cases.concat(canonicalStream);
    }
    if (!cases.some(isProtocolSamplingCase)) {
      const supplemental = await loadCanonicalProtocolSamplingCases(protocolId);
      if (supplemental.length) {
        const existingIds = new Set(cases.map((testCase) => testCase.case_id));
        cases = cases.concat(supplemental.filter((testCase) => !existingIds.has(testCase.case_id)));
      }
    }
    if (!cases.some(isProtocolThinkingCase)) {
      const thinkingChannelId = runV02ProtocolEvalChannelId(route) || runV02ProtocolEvalChannelId(state.runV02.baselineRoute);
      const supplementalThinking = await loadCanonicalProtocolThinkingCases(protocolId, thinkingChannelId || "aliyun");
      if (supplementalThinking.length) {
        const existingIds = new Set(cases.map((testCase) => testCase.case_id));
        cases = cases.concat(supplementalThinking.filter((testCase) => !existingIds.has(testCase.case_id)));
      }
    }
    if (runV02ModelSupportsTools() && !cases.some(isProtocolToolsCase)) {
      const toolsChannelId = runV02ProtocolEvalChannelId(route) || "aliyun";
      const supplementalTools = await loadCanonicalProtocolToolsCases(protocolId, toolsChannelId);
      if (supplementalTools.length) {
        const existingIds = new Set(cases.map((testCase) => testCase.case_id));
        cases = cases.concat(supplementalTools.filter((testCase) => !existingIds.has(testCase.case_id)));
      }
    }
    if (!cases.some(isProtocolResponseFormatCase)) {
      const responseFormatChannelId = runV02ProtocolEvalChannelId(route) || "aliyun";
      const supplementalResponseFormat = await loadCanonicalProtocolResponseFormatCases(protocolId, responseFormatChannelId);
      if (supplementalResponseFormat.length) {
        const existingIds = new Set(cases.map((testCase) => testCase.case_id));
        cases = cases.concat(supplementalResponseFormat.filter((testCase) => !existingIds.has(testCase.case_id)));
      }
    }
    cases = cases.filter((testCase) => !isCacheHitCase(testCase));
    cases = cases.filter((testCase) => !isOutputLengthCapacityCase(testCase));
    const outputLengthCapacity = outputLengthCapacityCasesForRunV02(protocolId, state.runV02.modelId);
    if (outputLengthCapacity.length) {
      cases = cases.concat(outputLengthCapacity);
    }
    const cacheCases = cacheCasesForRunV02(protocolId, state.runV02.modelId);
    if (cacheCases.length) {
      cases = cases.concat(cacheCases);
    }
    const vendorId = oemBehaviorsApi().inferEvalModelVendorId?.(state.runV02.modelId) || "other";
    if (vendorId && vendorId !== "other") {
      const oemCases = await loadModelOemBehaviorCases(vendorId, protocolId, state.runV02.modelId);
      if (oemCases.length) {
        const existingIds = new Set(cases.map((testCase) => testCase.case_id));
        cases = cases.concat(oemCases.filter((testCase) => !existingIds.has(testCase.case_id)));
      }
    }
    cases = cases.filter((testCase) => caseMatchesProtocol(testCase, protocolId));
    if (`${runV02ActiveProtocolId()}:${state.runV02.baselineRoute?.key || "canonical"}` !== loadToken) return;
    state.runV02.cases = cases;
    initRunV02CaseGroupState(state.runV02.cases);
    updateRunV02CaseGroupHint();
  } catch (error) {
    if (`${runV02ActiveProtocolId()}:${state.runV02.baselineRoute?.key || "canonical"}` !== loadToken) return;
    state.runV02.cases = [];
    state.runV02.activeCaseGroupKey = "";
    state.runV02.selectedCaseIdsByGroup = {};
    if (els.runV02CaseHint) {
      els.runV02CaseHint.textContent = `测试用例加载失败：${error.message}`;
    }
  } finally {
    if (`${runV02ActiveProtocolId()}:${state.runV02.baselineRoute?.key || "canonical"}` === loadToken) {
      state.runV02.isCaseLoading = false;
      renderRunV02CaseGroups();
      updateRunV02Availability();
    }
  }
}

function appendRunV02Text(line) {
  if (!els.runV02RunLog) return;
  const row = document.createElement("div");
  row.textContent = line;
  els.runV02RunLog.appendChild(row);
  els.runV02RunLog.scrollTop = els.runV02RunLog.scrollHeight;
}

function resetRunV02Ui() {
  state.runV02.completedResults = [];
  state.runV02.runProgress = { count: 0, total: 0, label: "准备中" };
  if (els.runV02RunLog) els.runV02RunLog.innerHTML = "";
  if (els.runV02ProgressBar) els.runV02ProgressBar.style.width = "0%";
  if (els.runV02ProgressCount) els.runV02ProgressCount.textContent = "0 / 0";
  if (els.runV02ProgressCase) els.runV02ProgressCase.textContent = "准备中";
}

async function streamRunV02Route(route, config, selectedCases, signal, onResult) {
  const channelId = runV02ProtocolEvalChannelId(route);
  const preparedCases = selectedCases.map((testCase) => (
    oemBehaviorsApi().prepareCaseForRoute?.(testCase, channelId) || testCase
  ));
  const providerGroups = groupRunV02CasesByPayloadProvider(route, preparedCases);
  for (const [providerId, cases] of providerGroups) {
    if (!state.runV02.isRunning) break;
    await streamRunV02ProviderBatch(route, config, providerId, cases, signal, onResult);
  }
}

function recordRunV02Progress(mapped, count, totalRuns) {
  state.runV02.runProgress = {
    count,
    total: totalRuns,
    label: `— 已完成 ${count}/${totalRuns}: ${mapped.channel_name} · ${resultTitle(mapped)}`
  };
  const diffNote = mapped.is_baseline
    ? ""
    : (mapped.cache_hit_summary
      ? ` · 缓存 ${mapped.cache_hit_summary}`
      : (mapped.diff_count ? ` · ${mapped.diff_count} 处结构差异` : " · 结构一致"));
  appendRunV02Text(`✓ ${mapped.channel_name} · ${mapped.case_id} · HTTP ${mapped.http_status || "—"} · ${conclusionMeta(mapped).label}${diffNote}`);
  renderChannelReportRunPanel();
}

async function runV02Tests() {
  const baseline = state.runV02.baselineRoute;
  const targets = runV02TargetRoutes();
  const baselineConfig = baseline ? ensureRunV02ChannelConfig(baseline.key, baseline) : null;
  const selectedCases = runV02AllSelectedCasesForRun();
  const selection = runV02SelectionSnapshot();

  if (!baseline || !runV02CaseProviderId(baseline)) {
    showToast("请选择 Baseline 渠道。");
    return;
  }
  if (!runV02ActiveProtocolId()) {
    showToast("请选择测评协议。");
    return;
  }
  if (!targets.length) {
    showToast("请至少选择一个测评渠道。");
    return;
  }
  if (!allRunV02ConfigsReady()) {
    showToast("请填写所有渠道的 Endpoint 与 API Key。");
    return;
  }
  if (!selectedCases.length) {
    showToast("请至少在一个分组中勾选测评 case。");
    return;
  }

  resetRunV02Ui();
  state.runV02.baselineResults = {};
  state.runV02.currentRunAbortController = new AbortController();
  state.runV02.isRunning = true;
  updateRunV02Availability();

  const caseIds = selectedCases.map((testCase) => testCase.case_id);
  const totalRuns = caseIds.length * (1 + targets.length);
  state.runV02.runMeta = {
    modelId: state.runV02.modelId,
    baseline: baseline ? `${baseline.platformName} / ${baseline.protocolLabel}` : "",
    targetCount: targets.length,
    groupCount: selection.length,
    caseCount: caseIds.length
  };
  state.runV02.runProgress = { count: 0, total: totalRuns, label: "准备中" };

  history.replaceState(null, "", "#channel-reports");
  setActiveView("channel-reports");
  renderChannelReportRunPanel();

  let count = 0;
  const signal = state.runV02.currentRunAbortController?.signal;

  try {
    appendRunV02Text(`→ 检查后端连接：${API_BASE}`);
    await ensureBackendReady(signal);
    appendRunV02Text(`→ 全量跑批：${selection.length} 个分组 · ${caseIds.length} 个 case · Baseline ${baseline.platformName}`);
    for (const entry of selection) {
      appendRunV02Text(`  · ${entry.group_title}：${entry.case_ids.length} 个 case`);
    }
    await streamRunV02Route(baseline, baselineConfig, selectedCases, signal, (result) => {
      state.runV02.baselineResults[result.case_id] = result;
      const mapped = mapRunV02Result(result, baseline, count, { isBaseline: true });
      state.runV02.completedResults.push(mapped);
      count += 1;
      recordRunV02Progress(mapped, count, totalRuns);
    });

    for (const target of targets) {
      if (!state.runV02.isRunning) break;
      const targetConfig = ensureRunV02ChannelConfig(target.key, target);
      appendRunV02Text(`→ 测评 ${target.platformName} / ${target.protocolLabel}`);
      await streamRunV02Route(target, targetConfig, selectedCases, signal, (result) => {
        const baselineResult = state.runV02.baselineResults[result.case_id];
        const baselineResponse = baselineResult?.response_body || null;
        const mapped = mapRunV02Result(result, target, count, { baselineResponse });
        state.runV02.completedResults.push(mapped);
        count += 1;
        recordRunV02Progress(mapped, count, totalRuns);
      });
    }

    if (els.runV02ProgressCase) els.runV02ProgressCase.textContent = "— 完成";
    if (els.runV02ProgressBar) els.runV02ProgressBar.style.width = "100%";
    state.runV02.runProgress = {
      count: totalRuns,
      total: totalRuns,
      label: "— 完成"
    };
    if (state.runV02.completedResults.length) {
      const record = saveChannelReportRecord();
      if (record) state.expandedChannelReportId = record.id;
    }
    const reportStats = channelReportStatsForResults(state.runV02.completedResults);
    showToast(`渠道测评完成：断言 ${reportStats.assertPass}/${reportStats.assertTotal} · 观测 ${reportStats.observeRecorded}/${reportStats.observeTotal}`);
  } catch (error) {
    if (error?.name === "AbortError") {
      if (els.runV02ProgressCase) els.runV02ProgressCase.textContent = "— 用户已停止";
      state.runV02.runProgress = {
        ...state.runV02.runProgress,
        label: "— 用户已停止"
      };
      if (state.runV02.completedResults.length) {
        const record = saveChannelReportRecord();
        if (record) state.expandedChannelReportId = record.id;
      }
      showToast("测试已停止。");
    } else {
      appendRunV02Text(`✗ ${error.message}`);
      state.runV02.runProgress = {
        ...state.runV02.runProgress,
        label: `— 失败：${error.message}`
      };
      showToast(error.message);
    }
  } finally {
    state.runV02.isRunning = false;
    state.runV02.currentRunAbortController = null;
    state.runV02.runMeta = null;
    updateRunV02Availability();
    renderChannelReports();
  }
}

function stopRunV02Tests() {
  if (!state.runV02.isRunning) return;
  state.runV02.currentRunAbortController?.abort();
}

function renderRunToolV02() {
  if (!els.runV02ModelSelect) return;
  loadRunV02LocalConfig().then(async () => {
    await refreshRunV02ModelToolsCapability();
    renderRunV02ModelSelect();
    renderRunV02ProtocolPicker();
    const protocols = listRunV02ProtocolOptions();
    if (!state.runV02.protocolId && protocols.length === 1) {
      applyRunV02Protocol(protocols[0].id, { autoSelectBaseline: !state.runV02.baselineRouteKey });
    } else if (state.runV02.protocolId) {
      if (els.runV02ChannelPanel) els.runV02ChannelPanel.classList.remove("is-hidden");
      renderRunV02RouteSelect({ autoSelect: !state.runV02.baselineRouteKey });
    } else {
      renderRunV02BaselineSelect();
      renderRunV02TargetSelect();
    }
    renderRunV02CaseGroups();
    updateRunV02Availability();
  });
}

function bindRunV02Events() {
  document.addEventListener("click", (event) => {
    if (state.activeViewKey !== "run-v02") return;
    if (els.runV02ModelSelect && !els.runV02ModelSelect.contains(event.target)) {
      closeRunV02ModelMenu();
    }
    if (els.runV02BaselineSelect && !els.runV02BaselineSelect.contains(event.target)) {
      closeRunV02BaselineMenu();
    }
    if (els.runV02TargetSelect && !els.runV02TargetSelect.contains(event.target)) {
      closeRunV02TargetMenu();
    }
  });

  els.runV02ModelControl?.addEventListener("click", (event) => {
    event.stopPropagation();
    if (state.runV02.isRunning) return;
    if (!state.runV02.modelMenuOpen) openRunV02ModelMenu();
    else els.runV02ModelInput?.focus();
  });

  els.runV02ModelInput?.addEventListener("input", () => {
    if (!state.runV02.modelMenuOpen) return;
    state.runV02.modelSearch = els.runV02ModelInput.value;
    renderRunV02ModelSelect();
  });

  els.runV02ModelInput?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeRunV02ModelMenu();
      els.runV02ModelInput?.blur();
    }
  });

  els.runV02ModelOptions?.addEventListener("mousedown", (event) => {
    const option = event.target.closest("[data-run-v02-model]");
    if (!option || state.runV02.isRunning) return;
    event.preventDefault();
    event.stopPropagation();
    closeRunV02ModelMenu();
    applyRunV02Model(option.dataset.runV02Model);
  });

  els.runV02ProtocolPicker?.addEventListener("click", (event) => {
    const tab = event.target.closest("[data-run-v02-protocol]");
    if (!tab || state.runV02.isRunning || tab.disabled) return;
    const def = runV02ProtocolDef(tab.dataset.runV02Protocol);
    if (!def || !runV02ProtocolIsRunnable(def)) return;
    applyRunV02Protocol(tab.dataset.runV02Protocol);
  });

  els.runV02BaselineControl?.addEventListener("click", (event) => {
    event.stopPropagation();
    if (state.runV02.isRunning || els.runV02BaselineInput?.disabled) return;
    if (!state.runV02.baselineMenuOpen) openRunV02BaselineMenu();
    else els.runV02BaselineInput?.focus();
  });

  els.runV02BaselineInput?.addEventListener("input", () => {
    if (!state.runV02.baselineMenuOpen) return;
    state.runV02.baselineSearch = els.runV02BaselineInput.value;
    renderRunV02BaselineSelect();
  });

  els.runV02BaselineInput?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeRunV02BaselineMenu();
      els.runV02BaselineInput?.blur();
    }
  });

  els.runV02BaselineOptions?.addEventListener("mousedown", (event) => {
    const option = event.target.closest("[data-run-v02-baseline]");
    if (!option || state.runV02.isRunning) return;
    event.preventDefault();
    event.stopPropagation();
    const route = runV02RouteByKey(option.dataset.runV02Baseline);
    if (!route || !runV02SupportedProtocol(route.protocolId)) return;
    if (route.key === state.runV02.baselineRouteKey) {
      closeRunV02BaselineMenu();
      return;
    }
    applyRunV02Baseline(option.dataset.runV02Baseline);
  });

  els.runV02TargetControl?.addEventListener("click", (event) => {
    if (event.target.closest("[data-run-v02-target-remove]")) return;
    event.stopPropagation();
    if (state.runV02.isRunning || els.runV02TargetInput?.disabled) return;
    if (!state.runV02.targetMenuOpen) openRunV02TargetMenu();
    else els.runV02TargetInput?.focus();
  });

  els.runV02TargetInput?.addEventListener("input", () => {
    if (!state.runV02.targetMenuOpen) return;
    state.runV02.targetSearch = els.runV02TargetInput.value;
    renderRunV02TargetSelect();
  });

  els.runV02TargetInput?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeRunV02TargetMenu();
      els.runV02TargetInput?.blur();
    }
  });

  els.runV02TargetOptions?.addEventListener("mousedown", (event) => {
    const option = event.target.closest("[data-run-v02-target]");
    if (!option || state.runV02.isRunning) return;
    event.preventDefault();
    event.stopPropagation();
    toggleRunV02Target(option.dataset.runV02Target);
  });

  els.runV02TargetTags?.addEventListener("click", (event) => {
    const remove = event.target.closest("[data-run-v02-target-remove]");
    if (!remove || state.runV02.isRunning) return;
    event.preventDefault();
    event.stopPropagation();
    state.runV02.targetRouteKeys.delete(remove.dataset.runV02TargetRemove);
    renderRunV02TargetSelect();
    renderRunV02ChannelConfigs();
    updateRunV02Availability();
  });

  els.runV02ChannelConfigs?.addEventListener("input", (event) => {
    const field = event.target.closest("[data-run-v02-config-field]");
    if (!field || state.runV02.isRunning) return;
    const routeKey = field.dataset.runV02ConfigKey;
    const route = runV02RouteByKey(routeKey);
    const config = ensureRunV02ChannelConfig(routeKey, route);
    if (field.dataset.runV02ConfigField === "baseUrl") {
      config.baseUrl = field.value;
    } else if (field.dataset.runV02ConfigField === "apiKey") {
      const local = route ? resolveRunV02LocalProvider(route.platformId) : null;
      if (local?.api_key_hint && field.value === local.api_key_hint) {
        config.useLocalKey = true;
        config.apiKeyHint = field.value;
        config.apiKey = "";
      } else {
        config.useLocalKey = false;
        config.apiKey = field.value;
      }
    }
    updateRunV02Availability();
  });

  els.runV02CaseGroupPicker?.addEventListener("click", (event) => {
    const tab = event.target.closest("[data-run-v02-case-group]");
    if (!tab || state.runV02.isRunning || state.runV02.isCaseLoading) return;
    state.runV02.activeCaseGroupKey = tab.dataset.runV02CaseGroup;
    updateRunV02CaseGroupHint();
    renderRunV02CaseGroups();
  });

  els.runV02CaseGroupPicker?.addEventListener("change", (event) => {
    const toggle = event.target.closest("[data-run-v02-case-group-toggle]");
    if (!toggle || state.runV02.isRunning || state.runV02.isCaseLoading) return;
    const group = listRunV02CaseGroups(state.runV02.cases || []).find((item) => item.key === toggle.dataset.runV02CaseGroupToggle);
    if (!group) return;
    setRunV02CaseGroupSelection(group.key, toggle.checked);
    renderRunV02CaseGroups();
  });

  els.runV02CaseGroups?.addEventListener("change", (event) => {
    const input = event.target.closest("[data-v02-case-id]");
    if (!input || state.runV02.isRunning) return;
    const group = runV02ActiveCaseGroup();
    if (!group) return;
    const selectedIds = runV02CaseGroupSelection(group.key);
    if (input.checked) selectedIds.add(input.dataset.v02CaseId);
    else selectedIds.delete(input.dataset.v02CaseId);
    renderRunV02SelectedCaseCount();
    renderRunV02CaseGroupPicker();
  });

  els.runV02Tests?.addEventListener("click", runV02Tests);
  els.runV02StopTests?.addEventListener("click", stopRunV02Tests);
}

function syncModelLookupFromHash() {
  const hash = window.location.hash || "";
  if (!hash.startsWith("#models")) return;
  const queryIndex = hash.indexOf("?");
  if (queryIndex === -1) {
    state.modelLookupAddMode = false;
    return;
  }
  const params = new URLSearchParams(hash.slice(queryIndex + 1));
  if (params.has("add")) {
    state.modelLookupAddMode = true;
  }
  const q = params.get("q");
  if (q) {
    state.modelLookupQuery = q;
    if (!params.has("add")) state.modelLookupAddMode = false;
  }
}

function getErrorCodeCatalog() {
  return window.NOCTUA_ERROR_CODE_CATALOG || null;
}

function renderErrorCodeDocBadge(channel) {
  const catalog = getErrorCodeCatalog();
  if (!catalog || !channel) return "";
  const meta = catalog.getDocStatusMeta(channel.docStatus);
  const title = channel.notes || meta.docStatusLabel;
  return `<span class="protocol-doc-badge ${escapeHtml(meta.docStatusClass)}" title="${escapeHtml(title)}">${escapeHtml(meta.docStatusLabel)}</span>`;
}

function renderErrorCodeDocLinks(channel) {
  const links = [];
  if (channel.localDoc) {
    links.push(`<a href="/${escapeHtml(channel.localDoc)}" target="_blank" rel="noopener noreferrer">本地整理</a>`);
  }
  if (channel.docUrl) {
    links.push(`<a href="${escapeHtml(channel.docUrl)}" target="_blank" rel="noopener noreferrer">官方文档</a>`);
  }
  return links.length ? `<div class="error-code-doc-links">${links.join(" · ")}</div>` : "";
}

function formatNativeCodeSummary(mapping) {
  if (!mapping) return "—";
  const parts = [];
  if (mapping.http) parts.push(String(mapping.http));
  if (mapping.nativeType) parts.push(mapping.nativeType);
  else if (mapping.nativeCode) parts.push(mapping.nativeCode);
  return parts.join(" · ") || "—";
}

function ensureErrorCodeCompareChannels(channelList) {
  const catalog = getErrorCodeCatalog();
  if (!catalog) return new Set();
  if (!state.errorCodeCompareChannels) {
    state.errorCodeCompareChannels = new Set(catalog.channelOrder);
  }
  const validIds = new Set(channelList.map((channel) => channel.channel_id));
  for (const id of [...state.errorCodeCompareChannels]) {
    if (!validIds.has(id)) state.errorCodeCompareChannels.delete(id);
  }
  if (!state.errorCodeCompareChannels.size) {
    channelList.forEach((channel) => state.errorCodeCompareChannels.add(channel.channel_id));
  }
  return state.errorCodeCompareChannels;
}

function getErrorCodeCompareChannels(channelList) {
  const selected = ensureErrorCodeCompareChannels(channelList);
  const filtered = channelList.filter((channel) => selected.has(channel.channel_id));
  return filtered.length ? filtered : channelList.slice(0, 1);
}

function renderErrorCodeChannelPicker(channelList, selectedChannels) {
  const selectedIds = ensureErrorCodeCompareChannels(channelList);
  return `
    <div class="protocol-compare-picker error-code-compare-picker">
      <div class="protocol-compare-picker__head">
        <span class="protocol-compare-picker__label">对比渠道</span>
        <span class="protocol-compare-picker__count muted">已选 ${selectedChannels.length} / ${channelList.length}</span>
        <button type="button" class="btn btn-ghost btn-xs" data-error-code-compare-action="all">全选</button>
      </div>
      <div class="protocol-compare-picker__list">
        ${channelList.map((channel) => {
          const checked = selectedIds.has(channel.channel_id);
          return `
            <label class="protocol-compare-picker__item ${checked ? "is-checked" : ""}">
              <input type="checkbox" data-error-code-compare-channel data-channel-id="${escapeHtml(channel.channel_id)}" ${checked ? "checked" : ""} />
              <img src="${escapeHtml(channel.logo)}" alt="" width="16" height="16" />
              <span>${escapeHtml(channel.label)}</span>
            </label>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

function renderErrorCodeGuide() {
  const catalog = getErrorCodeCatalog();
  if (!catalog || !els.errorCodeGuide) return;
  const example = JSON.stringify(catalog.canonicalShape.example, null, 2);
  const fieldRows = catalog.canonicalShape.fields.map((field) => `
    <tr>
      <td class="mono">${escapeHtml(field.path)}</td>
      <td>${escapeHtml(field.type)}</td>
      <td>${field.required ? "是" : "否"}</td>
      <td class="muted">${escapeHtml(field.notes)}</td>
    </tr>
  `).join("");

  els.errorCodeGuide.innerHTML = `
    <section class="panel">
      <div class="sec-head">
        <div>
          <p class="eyebrow">Canonical</p>
          <h2>${escapeHtml(catalog.canonicalShape.label)}</h2>
        </div>
      </div>
      <p class="guide-copy">网关对外统一出口时，建议将各渠道原生错误归一为 OpenAI Chat Completions 的 <code>error</code> 对象。下表为字段含义；右侧为典型示例。</p>
      <div class="error-code-guide-grid">
        <div class="table-wrap">
          <table class="rtable">
            <thead>
              <tr><th>字段</th><th>类型</th><th>必填</th><th>说明</th></tr>
            </thead>
            <tbody>${fieldRows}</tbody>
          </table>
        </div>
        <pre class="error-code-json-preview mono">${escapeHtml(example)}</pre>
      </div>
    </section>

    <section class="panel" style="margin-top: var(--space-5)">
      <div class="sec-head">
        <div>
          <p class="eyebrow">Workflow</p>
          <h2>如何使用本模块</h2>
        </div>
      </div>
      <ol class="guide-steps">
        <li>在<strong>渠道错误码</strong>中查看各渠道 error envelope 与代表性条目。</li>
        <li>在<strong>错误码映射</strong>矩阵中按场景对比上游原生码与建议 OpenAI 映射。</li>
        <li>点击矩阵单元格展开详情，复制建议 <code>error</code> JSON 用于网关适配规则。</li>
        <li>完整错误码列表见 <code>docs/errorcode/</code>；百炼 LLM/VLM 见 <code>docs/errorcode/ali.md</code>，垂直能力 FAQ 见 <code>docs/errorcode/archive/</code>。</li>
      </ol>
    </section>

    <section class="panel" style="margin-top: var(--space-5)">
      <div class="sec-head">
        <div>
          <p class="eyebrow">Envelope</p>
          <h2>各渠道 error 形态差异</h2>
        </div>
      </div>
      <div class="error-code-envelope-cards">
        ${catalog.getChannelList().map((channel) => `
          <div class="error-code-envelope-card">
            <div class="error-code-envelope-card__head">
              <img src="${escapeHtml(channel.logo)}" alt="" width="20" height="20" />
              <strong>${escapeHtml(channel.label)}</strong>
              ${renderErrorCodeDocBadge(channel)}
            </div>
            <p class="guide-copy">${escapeHtml(channel.envelope.summary)}</p>
            <dl class="error-code-envelope-dl mono fs-xs">
              <div><dt>HTTP</dt><dd>${escapeHtml(channel.envelope.httpPath)}</dd></div>
              <div><dt>code</dt><dd>${escapeHtml(channel.envelope.codePath || "—")}</dd></div>
              <div><dt>type</dt><dd>${escapeHtml(channel.envelope.typePath || "—")}</dd></div>
              <div><dt>message</dt><dd>${escapeHtml(channel.envelope.messagePath)}</dd></div>
            </dl>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function renderErrorCodeChannelCatalog() {
  const catalog = getErrorCodeCatalog();
  if (!catalog || !els.errorCodeChannelCatalog) return;

  const channelList = catalog.getChannelList();
  const tabIds = channelList.map((channel) => channel.channel_id);
  const activeTab = tabIds.includes(state.errorCodeChannelTab) ? state.errorCodeChannelTab : tabIds[0];
  state.errorCodeChannelTab = activeTab;
  const channel = catalog.channels[activeTab];
  if (!channel) return;

  if (els.errorChannelScopeNote) {
    els.errorChannelScopeNote.textContent =
      "按渠道浏览错误响应 envelope 与代表性错误码条目；完整文档见 docs/errorcode/。";
  }

  const tabButtons = channelList.map((item) => `
    <button type="button" class="${activeTab === item.channel_id ? "on" : ""}" data-error-channel-tab="${escapeHtml(item.channel_id)}" role="tab" aria-selected="${activeTab === item.channel_id}">
      <img src="${escapeHtml(item.logo)}" alt="" width="16" height="16" />
      ${escapeHtml(item.label)}
    </button>
  `).join("");

  const entryRows = (channel.entries || []).map((entry) => `
    <tr>
      <td class="mono">${entry.http ?? "—"}</td>
      <td class="mono">${escapeHtml(entry.nativeCode || entry.nativeType || "—")}</td>
      <td class="mono">${escapeHtml(entry.nativeType || "—")}</td>
      <td>${escapeHtml(entry.message)}</td>
    </tr>
  `).join("");

  els.errorCodeChannelCatalog.innerHTML = `
    <section class="panel protocol-catalog-panel">
      <div class="protocol-nav-tabs endpoint-tabs error-code-channel-tabs" role="tablist" aria-label="渠道">
        ${tabButtons}
      </div>
      <div class="error-code-channel-panel">
        <div class="protocol-catalog-meta">
          <div class="protocol-catalog-meta-head">
            <h2>${escapeHtml(channel.label)}</h2>
            ${renderErrorCodeDocBadge(channel)}
          </div>
          <p class="guide-copy">${escapeHtml(channel.envelope.summary)}</p>
          ${renderErrorCodeDocLinks(channel)}
        </div>
        <div class="error-code-envelope-card" style="margin-top: var(--space-4)">
          <p class="eyebrow">Error envelope</p>
          <dl class="error-code-envelope-dl mono fs-xs">
            <div><dt>HTTP</dt><dd>${escapeHtml(channel.envelope.httpPath)}</dd></div>
            <div><dt>code</dt><dd>${escapeHtml(channel.envelope.codePath || "—")}</dd></div>
            <div><dt>type</dt><dd>${escapeHtml(channel.envelope.typePath || "—")}</dd></div>
            <div><dt>message</dt><dd>${escapeHtml(channel.envelope.messagePath)}</dd></div>
          </dl>
        </div>
        <div class="table-wrap" style="margin-top: var(--space-4)">
          <table class="rtable">
            <thead>
              <tr><th>HTTP</th><th>原生 code</th><th>原生 type</th><th>说明</th></tr>
            </thead>
            <tbody>${entryRows}</tbody>
          </table>
        </div>
        <div class="error-code-channel-actions">
          <button type="button" class="btn btn-secondary btn-sm" data-error-code-jump-mapping data-channel-id="${escapeHtml(channel.channel_id)}">在映射矩阵中查看</button>
        </div>
      </div>
    </section>
  `;

  bindErrorCodeChannelTabs();
  bindErrorCodeChannelActions();
}

function renderErrorCodeMappingMatrixCell(channelId, scenarioId) {
  const catalog = getErrorCodeCatalog();
  if (!catalog) return `<td class="error-code-matrix-cell muted">—</td>`;
  const mapping = catalog.channels[channelId]?.mappings?.[scenarioId];
  if (!mapping) {
    return `<td class="error-code-matrix-cell error-code-matrix-cell--missing muted" title="暂无映射">—</td>`;
  }
  const scenario = catalog.scenarios.find((item) => item.id === scenarioId);
  const summary = formatNativeCodeSummary(mapping);
  const openaiCode = scenario?.openai?.code || "";
  return `
    <td class="error-code-matrix-cell error-code-matrix-cell--mapped">
      <button
        type="button"
        class="error-code-matrix-cell__btn"
        data-error-code-mapping-cell
        data-channel-id="${escapeHtml(channelId)}"
        data-scenario-id="${escapeHtml(scenarioId)}"
        title="点击查看映射详情"
      >
        <span class="mono error-code-matrix-cell__native">${escapeHtml(summary)}</span>
        <span class="error-code-matrix-cell__arrow" aria-hidden="true">→</span>
        <span class="mono error-code-matrix-cell__openai">${escapeHtml(openaiCode)}</span>
      </button>
    </td>
  `;
}

function renderErrorCodeMappingCatalog() {
  const catalog = getErrorCodeCatalog();
  if (!catalog || !els.errorCodeMappingCatalog) return;
  if (state.errorCodeMappingDrawerOpen) closeErrorCodeMappingDrawer();

  const channelList = catalog.getChannelList();
  const selectedChannels = getErrorCodeCompareChannels(channelList);
  const scenarios = catalog.getScenarioList();

  if (els.errorMappingScopeNote) {
    els.errorMappingScopeNote.textContent =
      "按统一场景横向对比各渠道原生错误与建议的 OpenAI error 映射；点击单元格查看详情并可复制 JSON。";
  }

  const headerCells = selectedChannels.map((channel) => `
    <th scope="col" class="error-code-matrix-channel-head">
      <img src="${escapeHtml(channel.logo)}" alt="" width="16" height="16" />
      <span>${escapeHtml(channel.label)}</span>
    </th>
  `).join("");

  const bodyRows = scenarios.map((scenario) => `
    <tr>
      <th scope="row" class="error-code-matrix-scenario-head">
        <span class="error-code-matrix-scenario-label">${escapeHtml(scenario.label)}</span>
        <span class="mono fs-xs muted">${escapeHtml(scenario.openai.type)} / ${escapeHtml(scenario.openai.code)}</span>
      </th>
      ${selectedChannels.map((channel) => renderErrorCodeMappingMatrixCell(channel.channel_id, scenario.id)).join("")}
    </tr>
  `).join("");

  els.errorCodeMappingCatalog.innerHTML = `
    <section class="panel protocol-catalog-panel">
      ${renderErrorCodeChannelPicker(channelList, selectedChannels)}
      <div class="table-wrap error-code-matrix-wrap">
        <table class="rtable error-code-matrix">
          <thead>
            <tr>
              <th scope="col">场景 / OpenAI 目标</th>
              ${headerCells}
            </tr>
          </thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </div>
    </section>
  `;

  bindErrorCodeCompareChannelPicker();
  bindErrorCodeMappingCells();
}

function openErrorCodeMappingDrawer(channelId, scenarioId) {
  const catalog = getErrorCodeCatalog();
  if (!catalog || !els.errorCodeMappingDrawer) return;
  const data = catalog.getMapping(channelId, scenarioId);
  if (!data) return;

  const { channel, scenario, mapping } = data;
  const openAiError = catalog.buildOpenAiError(channelId, scenarioId);
  state.errorCodeMappingDrawerOpen = true;
  state.errorCodeMappingDrawerContext = { channelId, scenarioId };

  if (els.errorCodeMappingDrawerTitle) {
    els.errorCodeMappingDrawerTitle.textContent = `${scenario.label} · ${channel.label}`;
  }
  if (els.errorCodeMappingDrawerSummary) {
    els.errorCodeMappingDrawerSummary.innerHTML = `
      <div class="error-code-drawer-meta">
        ${renderErrorCodeDocBadge(channel)}
        ${renderErrorCodeDocLinks(channel)}
      </div>
    `;
  }
  if (els.errorCodeMappingDrawerBody) {
    const nativeExample = {
      http_status: mapping.http ?? null,
      native_code: mapping.nativeCode ?? null,
      native_type: mapping.nativeType ?? null,
      message: mapping.nativeMessage ?? null
    };
    els.errorCodeMappingDrawerBody.innerHTML = `
      <div class="col gap-4">
        <div>
          <p class="detail-h">上游原生错误</p>
          <dl class="error-code-drawer-dl">
            <div><dt>HTTP</dt><dd class="mono">${mapping.http ?? "—"}</dd></div>
            <div><dt>code 路径</dt><dd class="mono">${escapeHtml(channel.envelope.codePath || "—")}</dd></div>
            <div><dt>type 路径</dt><dd class="mono">${escapeHtml(channel.envelope.typePath || "—")}</dd></div>
            <div><dt>原生 code</dt><dd class="mono">${escapeHtml(mapping.nativeCode || "—")}</dd></div>
            <div><dt>原生 type</dt><dd class="mono">${escapeHtml(mapping.nativeType || "—")}</dd></div>
            <div><dt>原生 message</dt><dd>${escapeHtml(mapping.nativeMessage || "—")}</dd></div>
          </dl>
          <pre class="error-code-json-preview mono">${escapeHtml(JSON.stringify(nativeExample, null, 2))}</pre>
        </div>
        <div>
          <p class="detail-h">建议 OpenAI error 映射</p>
          <pre class="error-code-json-preview mono" id="errorCodeOpenAiPreview">${escapeHtml(JSON.stringify(openAiError, null, 2))}</pre>
          ${mapping.notes ? `<p class="guide-copy muted">${escapeHtml(mapping.notes)}</p>` : ""}
          <div class="detail-actions">
            <button type="button" class="btn btn-secondary btn-sm" id="errorCodeCopyOpenAi">复制 OpenAI error JSON</button>
          </div>
        </div>
      </div>
    `;
    const copyBtn = document.querySelector("#errorCodeCopyOpenAi");
    if (copyBtn) {
      copyBtn.addEventListener("click", () => {
        copyText(JSON.stringify(openAiError, null, 2), "OpenAI error JSON");
      });
    }
  }

  els.errorCodeMappingDrawer.classList.remove("is-hidden");
  els.errorCodeMappingDrawer.setAttribute("aria-hidden", "false");
  document.body.classList.add("protocol-param-drawer-open");
}

function closeErrorCodeMappingDrawer() {
  if (!els.errorCodeMappingDrawer) return;
  state.errorCodeMappingDrawerOpen = false;
  state.errorCodeMappingDrawerContext = null;
  els.errorCodeMappingDrawer.classList.add("is-hidden");
  els.errorCodeMappingDrawer.setAttribute("aria-hidden", "true");
  document.body.classList.remove("protocol-param-drawer-open");
}

function bindErrorCodeMappingDrawer() {
  if (!els.errorCodeMappingDrawer) return;
  els.errorCodeMappingDrawer.querySelectorAll("[data-error-code-drawer-dismiss]").forEach((node) => {
    node.addEventListener("click", closeErrorCodeMappingDrawer);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state.errorCodeMappingDrawerOpen) {
      closeErrorCodeMappingDrawer();
    }
  });
}

function bindErrorCodeChannelTabs() {
  if (!els.errorCodeChannelCatalog) return;
  els.errorCodeChannelCatalog.querySelectorAll("[data-error-channel-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      const tab = button.dataset.errorChannelTab;
      if (!tab || tab === state.errorCodeChannelTab) return;
      state.errorCodeChannelTab = tab;
      renderErrorCodeChannelCatalog();
    });
  });
}

function bindErrorCodeChannelActions() {
  if (!els.errorCodeChannelCatalog) return;
  els.errorCodeChannelCatalog.querySelectorAll("[data-error-code-jump-mapping]").forEach((button) => {
    button.addEventListener("click", () => {
      const channelId = button.dataset.channelId;
      if (channelId) {
        const catalog = getErrorCodeCatalog();
        if (catalog) {
          ensureErrorCodeCompareChannels(catalog.getChannelList());
          state.errorCodeCompareChannels = new Set([channelId]);
        }
      }
      setActiveView("error-mapping");
      history.replaceState(null, "", "#error-mapping");
    });
  });
}

function bindErrorCodeCompareChannelPicker() {
  if (!els.errorCodeMappingCatalog) return;
  els.errorCodeMappingCatalog.querySelectorAll("[data-error-code-compare-channel]").forEach((input) => {
    input.addEventListener("change", () => {
      const catalog = getErrorCodeCatalog();
      if (!catalog) return;
      const channelList = catalog.getChannelList();
      const selected = ensureErrorCodeCompareChannels(channelList);
      const channelId = input.dataset.channelId;
      if (input.checked) {
        selected.add(channelId);
      } else if (selected.size <= 1) {
        input.checked = true;
        showToast("至少保留一个对比渠道");
        return;
      } else {
        selected.delete(channelId);
      }
      renderErrorCodeMappingCatalog();
    });
  });
  els.errorCodeMappingCatalog.querySelectorAll("[data-error-code-compare-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const catalog = getErrorCodeCatalog();
      if (!catalog) return;
      const channelList = catalog.getChannelList();
      const selected = ensureErrorCodeCompareChannels(channelList);
      if (button.dataset.errorCodeCompareAction === "all") {
        channelList.forEach((channel) => selected.add(channel.channel_id));
        renderErrorCodeMappingCatalog();
      }
    });
  });
}

function bindErrorCodeMappingCells() {
  if (!els.errorCodeMappingCatalog) return;
  els.errorCodeMappingCatalog.querySelectorAll("[data-error-code-mapping-cell]").forEach((button) => {
    button.addEventListener("click", () => {
      const channelId = button.dataset.channelId;
      const scenarioId = button.dataset.scenarioId;
      if (channelId && scenarioId) openErrorCodeMappingDrawer(channelId, scenarioId);
    });
  });
}

function setActiveView(view) {
  let viewKey = view;
  if (viewKey === "run") viewKey = "run-v02";
  const isRunKey = viewKey === "run-v01" || viewKey === "run-v02";
  if (isRunKey) {
    state.activeView = "run";
    state.activeViewKey = viewKey;
    state.runToolVersion = viewKey === "run-v02" ? "v0.2" : "v0.1";
  } else {
    state.activeView = ["guide", "channels", "protocols", "models", "run", "channel-reports", "channel-performance-reports", "reports", "channel-performance", "feishu", "evalscope", "opencompass", "error-guide", "error-channels", "error-mapping"].includes(viewKey) ? viewKey : "run";
    state.activeViewKey = state.activeView === "run" ? "run-v02" : state.activeView;
    if (state.activeView === "run") state.runToolVersion = "v0.2";
  }

  els.views.forEach((viewNode) => {
    viewNode.classList.toggle("is-hidden", viewNode.dataset.view !== state.activeViewKey);
  });
  els.viewLinks.forEach((link) => {
    const active = link.dataset.viewLink === state.activeViewKey;
    link.classList.toggle("is-active", active);
    link.classList.toggle("on", active);
  });
  if (state.activeView === "reports") renderHistory();
  if (state.activeView === "channel-reports") renderChannelReports();
  if (state.activeView === "channel-performance-reports") renderChannelPerfReports();
  if (state.activeView === "feishu") renderFeishuReport();
  if (state.activeView === "channels") renderChannelCatalog();
  if (state.activeView === "protocols") renderProtocolCatalog();
  if (state.activeView === "models") {
    if (state.modelLookupAddMode && state.modelLookupQuery && !state.modelLookupResult && !state.modelLookupLoading) {
      runModelLookup({ live: "always" });
    } else if (state.modelLookupQuery && !state.modelLookupResult && !state.modelLookupLoading) {
      runModelLookup({ live: modelLookupLiveMode(state.modelLookupQuery) });
    } else {
      renderModelLookup();
    }
  }
  if (state.activeViewKey === "run-v02") renderRunToolV02();
  if (state.activeViewKey === "channel-performance") renderChannelPerformanceTool();
  if (state.activeView === "error-guide") renderErrorCodeGuide();
  if (state.activeView === "error-channels") renderErrorCodeChannelCatalog();
  if (state.activeView === "error-mapping") renderErrorCodeMappingCatalog();
}

function initialViewFromHash() {
  syncModelLookupFromHash();
  if (window.location.hash === "#guide" || window.location.hash === "#guideView") return "guide";
  if (window.location.hash === "#channels" || window.location.hash === "#channelsView") return "channels";
  if (window.location.hash === "#protocols" || window.location.hash === "#protocolsView") return "protocols";
  if (window.location.hash.startsWith("#models")) return "models";
  if (window.location.hash === "#channel-reports" || window.location.hash === "#channelReportsView") return "channel-reports";
  if (window.location.hash === "#channel-performance-reports" || window.location.hash === "#channelPerformanceReportsView") return "channel-performance-reports";
  if (window.location.hash === "#reports" || window.location.hash === "#historyPanel") return "reports";
  // Legacy hash: #performance → channel-performance (keep until ~2026-12)
  if (window.location.hash === "#performance" || window.location.hash === "#performanceView" || window.location.hash === "#channel-performance" || window.location.hash === "#channelPerformanceView") return "channel-performance";
  if (window.location.hash === "#error-guide" || window.location.hash === "#errorGuideView") return "error-guide";
  if (window.location.hash === "#error-channels" || window.location.hash === "#errorChannelsView") return "error-channels";
  if (window.location.hash === "#error-mapping" || window.location.hash === "#errorMappingView") return "error-mapping";
  if (window.location.hash === "#feishu" || window.location.hash === "#feishuView") return "feishu";
  if (window.location.hash === "#evalscope" || window.location.hash === "#evalscopeView") return "evalscope";
  if (window.location.hash === "#opencompass" || window.location.hash === "#opencompassView") return "opencompass";
  if (window.location.hash === "#run-v02") return "run-v02";
  if (window.location.hash === "#run-v01" || window.location.hash === "#run" || window.location.hash === "#runView") return "run-v01";
  return "guide";
}

function bindEvents() {
  document.addEventListener("click", (event) => {
    const rawToggle = event.target.closest("[data-raw-toggle]");
    if (rawToggle) {
      const block = rawToggle.closest("[data-raw-block]");
      if (block) {
        const summaryView = block.querySelector('[data-raw-view="summary"]');
        const fullView = block.querySelector('[data-raw-view="full"]');
        const clamped = block.querySelector("[data-raw-clamp]");
        let expanded = false;
        if (summaryView && fullView) {
          expanded = summaryView.classList.toggle("is-hidden");
          fullView.classList.toggle("is-hidden", !expanded);
        } else if (clamped) {
          expanded = !clamped.classList.toggle("raw-response__body--clamped");
        }
        rawToggle.textContent = expanded ? rawToggle.dataset.labelCollapse : rawToggle.dataset.labelExpand;
      }
      return;
    }
    const hcaseTab = event.target.closest("[data-hcase-response-tab]");
    if (hcaseTab) {
      const root = hcaseTab.closest(".hcase-response-tabs");
      if (root) {
        activateTabSwitcher(root, hcaseTab.dataset.hcaseResponseTab, {
          tabSelector: "[data-hcase-response-tab]",
          panelSelector: "[data-hcase-response-panel]",
          tabKey: "hcaseResponseTab",
          panelKey: "hcaseResponsePanel"
        });
      }
      return;
    }
    const channelTab = event.target.closest("[data-channel-issue-tab]");
    if (!channelTab) return;
    const root = channelTab.closest(".channel-issue-tabs");
    if (!root) return;
    activateTabSwitcher(root, channelTab.dataset.channelIssueTab, {
      tabSelector: "[data-channel-issue-tab]",
      panelSelector: "[data-channel-issue-panel]",
      tabKey: "channelIssueTab",
      panelKey: "channelIssuePanel"
    });
  });

  els.viewLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      setActiveView(link.dataset.viewLink);
      history.replaceState(null, "", link.getAttribute("href"));
    });
  });

  window.addEventListener("hashchange", () => {
    syncModelLookupFromHash();
    const wasModels = state.activeView === "models";
    setActiveView(initialViewFromHash());
    if (wasModels || state.activeView === "models") {
      state.modelLookupResult = null;
      if (state.modelLookupAddMode && state.modelLookupQuery) {
        runModelLookup({ live: "always" });
      } else if (state.modelLookupQuery) {
        runModelLookup({ live: modelLookupLiveMode(state.modelLookupQuery) });
      } else {
        renderModelLookup();
      }
    }
  });

  els.channelCards.addEventListener("click", (event) => {
    if (event.target.closest(".chan-card__docs")) return;
    const button = event.target.closest(".chan-card[data-channel-id]");
    if (!button || state.isRunning || button.disabled) return;
    state.selectedChannelId = button.dataset.channelId;
    state.selectedBaselineReportId = "";
    state.expandedCaseId = null;
    renderChannels();
    renderSelectedChannel();
    els.resultsPanel.classList.add("is-hidden");
  });

  els.endpointTabs.addEventListener("click", (event) => {
    const button = event.target.closest("[data-endpoint-id]");
    if (!button || state.isRunning) return;
    state.selectedEndpointId = button.dataset.endpointId;
    ensureSelectedChannelSupportsEndpoint();
    state.selectedBaselineReportId = "";
    state.expandedCaseId = null;
    state.customCases = [];
    renderEndpointTabs();
    renderChannels();
    renderSelectedChannel();
    els.resultsPanel.classList.add("is-hidden");
  });

  els.toggleSecret.addEventListener("click", () => {
    const isPassword = els.apiKey.type === "password";
    els.apiKey.type = isPassword ? "text" : "password";
    els.toggleSecret.textContent = isPassword ? "隐藏" : "显示";
    els.toggleSecret.setAttribute("aria-label", isPassword ? "隐藏 API Key" : "显示 API Key");
    els.toggleSecret.setAttribute("title", isPassword ? "隐藏 API Key" : "显示 API Key");
  });

  els.baseUrlPreset?.addEventListener("change", () => {
    if (!els.baseUrlPreset.value) return;
    els.baseUrl.value = els.baseUrlPreset.value;
    updateBatchTargetPlaceholders();
  });

  els.baseUrl?.addEventListener("input", () => {
    renderBaseUrlPreset(els.baseUrl.value);
    updateBatchTargetPlaceholders();
  });

  els.apiKey?.addEventListener("input", updateBatchTargetPlaceholders);
  els.modelName?.addEventListener("input", updateBatchTargetPlaceholders);

  els.batchTargetRows?.addEventListener("click", (event) => {
    const removeButton = event.target.closest("[data-remove-batch-target]");
    if (!removeButton || state.isRunning) return;
    removeBatchTargetRow(removeButton.closest("[data-batch-target-row]"));
  });

  els.batchTargetRows?.addEventListener("input", renderBatchTargetControlState);

  els.batchAddTarget?.addEventListener("click", () => {
    addBatchTargetRow();
  });

  els.batchImportTargets?.addEventListener("click", importBatchTargetsFromText);

  els.batchTargets?.addEventListener("input", () => {
    if (!state.batchModeEnabled) return;
    renderBatchTargetControlState();
  });

  els.runTests.addEventListener("click", runTests);
  els.stopTests.addEventListener("click", stopTests);
  els.rerunTests.addEventListener("click", runTests);
  bindRunV02Events();
  els.exportJson.addEventListener("click", exportJson);
  els.exportMarkdown.addEventListener("click", exportMarkdown);
  els.saveFeishuSettings.addEventListener("click", () => {
    writeFeishuConfig();
    showToast("飞书文档配置已保存。");
  });
  els.pushFeishuNow.addEventListener("click", () => pushFeishuReport(state.lastReportRecord));
  els.copyFeishuReport.addEventListener("click", () => {
    const markdown = feishuReportMarkdown();
    if (!markdown) {
      showToast("暂无可复制的评测文档。");
      return;
    }
    copyText(markdown, "本次评测文档");
  });
  els.feishuDocumentUrl.addEventListener("input", renderFeishuStatus);
  els.feishuDocumentMode.addEventListener("change", renderFeishuStatus);
  els.feishuTitlePrefix.addEventListener("input", renderFeishuStatus);
  els.feishuReportPreview.addEventListener("input", renderFeishuStatus);
  els.feishuAutoPush.addEventListener("change", () => {
    writeFeishuConfig();
    showToast(els.feishuAutoPush.checked ? "已开启评测完成自动写入。" : "已关闭自动写入。");
  });
  els.reloadEvalscope.addEventListener("click", () => reloadEmbed(embedConfigs.evalscope));
  els.openEvalscope.addEventListener("click", () => openEmbed(embedConfigs.evalscope));
  els.saveOpencompassUrl.addEventListener("click", () => {
    const url = applyEmbedUrl(embedConfigs.opencompass);
    showToast(`OpenCompass 地址已应用：${url}`);
  });
  els.reloadOpencompass.addEventListener("click", () => reloadEmbed(embedConfigs.opencompass));
  els.openOpencompass.addEventListener("click", () => openEmbed(embedConfigs.opencompass));
  els.opencompassUrl.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const url = applyEmbedUrl(embedConfigs.opencompass);
    showToast(`OpenCompass 地址已应用：${url}`);
  });
  document.querySelectorAll("[data-opencompass-preset]").forEach((button) => {
    button.addEventListener("click", () => {
      els.opencompassUrl.value = button.dataset.opencompassPreset === "local"
        ? DEFAULT_OPENCOMPASS_URL
        : button.dataset.opencompassPreset;
      const url = applyEmbedUrl(embedConfigs.opencompass);
      showToast(`OpenCompass 地址已应用：${url}`);
    });
  });
  els.clearHistory.addEventListener("click", () => {
    writeHistory([]);
    state.expandedHistoryId = null;
    renderHistory();
    showToast("历史报告已清空。");
  });
  els.clearChannelReports?.addEventListener("click", () => {
    writeChannelReports([]);
    state.expandedChannelReportId = null;
    renderChannelReports();
    showToast("渠道参数测评报告已清空。");
  });
  els.exportChannelReportsJson?.addEventListener("click", exportDocGapScanBundle);
  els.channelReportsList?.addEventListener("click", (event) => {
    if (event.target.closest(".channel-report-download-menu")) {
      event.stopPropagation();
    }
    const row = event.target.closest("tr[data-channel-report-id]");
    if (row && !event.target.closest("[data-channel-report-action]")) {
      state.expandedChannelReportId = state.expandedChannelReportId === row.dataset.channelReportId
        ? null
        : row.dataset.channelReportId;
      renderChannelReports();
      return;
    }
    const button = event.target.closest("[data-channel-report-action]");
    if (!button) return;
    const items = readChannelReports();
    const record = items.find((item) => item.id === button.dataset.channelReportId);
    if (!record) return;
    if (button.dataset.channelReportAction === "toggle") {
      state.expandedChannelReportId = state.expandedChannelReportId === record.id ? null : record.id;
      renderChannelReports();
      return;
    }
    if (button.dataset.channelReportAction === "download-md") {
      button.closest("details")?.removeAttribute("open");
      downloadChannelReportMarkdown(record);
      return;
    }
    if (button.dataset.channelReportAction === "download-pdf") {
      button.closest("details")?.removeAttribute("open");
      downloadChannelReportPdf(record);
      return;
    }
    if (button.dataset.channelReportAction === "delete") {
      const reportLabel = record.id.replace(/^channel_report_/, "run/");
      if (!window.confirm(`确定删除报告 ${reportLabel}？此操作不可撤销。`)) return;
      writeChannelReports(items.filter((item) => item.id !== record.id));
      if (state.expandedChannelReportId === record.id) state.expandedChannelReportId = null;
      renderChannelReports();
      showToast("渠道参数测评报告已删除。");
    }
  });
  els.importHistoryFile?.addEventListener("change", async () => {
    await importHistoryFiles(els.importHistoryFile.files);
    els.importHistoryFile.value = "";
  });
  bindChannelPerfEvents();

  els.historyFilters?.addEventListener("click", (event) => {
    const reset = event.target.closest("[data-history-filter-reset]");
    if (reset) {
      state.historyFilters = { channel: "all", model: "all", endpoint: "all" };
      state.expandedHistoryId = null;
      renderHistory();
      return;
    }
    const button = event.target.closest("[data-history-filter]");
    if (!button) return;
    state.historyFilters[button.dataset.historyFilter] = button.dataset.historyFilterValue || "all";
    state.expandedHistoryId = null;
    renderHistory();
  });

  els.proxyEnabled?.addEventListener("change", renderProxyState);
  els.proxyUrl?.addEventListener("input", renderProxyState);
  els.batchModeToggle?.addEventListener("click", () => {
    state.batchModeEnabled = !state.batchModeEnabled;
    renderBatchMode();
    updateRunAvailability();
  });
  els.baselineReport?.addEventListener("change", () => {
    state.selectedBaselineReportId = els.baselineReport.value;
    if (state.completedResults.length) {
      state.completedResults = state.completedResults.map((result) => {
        const responseBody = result.response_body || null;
        const baseline = selectedBaselineRecord();
        const baselineResponse = baselineResponseForResult(result, baseline);
        return {
          ...result,
          diff_count: baselineResponse && responseBody && typeof responseBody === "object"
            ? compareStructure(baselineResponse, responseBody).length
            : result.error ? 1 : 0
        };
      });
      renderStats();
      renderTabs();
      renderResults();
    }
  });
  els.addCustomPayload.addEventListener("click", addCustomPayloadCase);
  els.clearCustomPayload.addEventListener("click", () => {
    els.customPayloadInput.value = "";
    state.customCases = [];
    els.customPayloadHint.textContent = state.customCases.length
      ? `已添加 ${state.customCases.length} 个自定义 payload。`
      : "粘贴 JSON object 后添加为临时 case。";
    renderCaseSelector(state.providerCases[currentCaseCacheKey()]);
  });

  els.parameterGroups.addEventListener("change", (event) => {
    const input = event.target.closest("input[data-case-bulk]");
    if (!input || state.isRunning || state.isCaseLoading) return;
    setCaseSelection(parseCaseIds(input.dataset.caseBulk), input.checked);
    refreshCaseSelectionUi();
  });

  els.caseGroups.addEventListener("change", (event) => {
    const bulkInput = event.target.closest("input[data-case-bulk]");
    if (bulkInput && !state.isRunning && !state.isCaseLoading) {
      setCaseSelection(parseCaseIds(bulkInput.dataset.caseBulk), bulkInput.checked);
      refreshCaseSelectionUi();
      return;
    }

    const input = event.target.closest("input[data-case-id]");
    if (!input || state.isRunning) return;
    if (input.checked) {
      state.selectedCaseIds.add(input.dataset.caseId);
    } else {
      state.selectedCaseIds.delete(input.dataset.caseId);
    }
    refreshCaseSelectionUi();
  });

  els.caseGroups.addEventListener("click", (event) => {
    const copyButton = event.target.closest('[data-action="copy-case-curl"]');
    const payloadButton = event.target.closest('[data-action="toggle-case-payload"]');
    const removeButton = event.target.closest('[data-action="remove-custom-case"]');
    const actionButton = copyButton || payloadButton || removeButton;
    if (!actionButton) return;
    event.preventDefault();
    event.stopPropagation();
    if (copyButton) {
      const testCase = allProviderCases().find((item) => item.case_id === copyButton.dataset.caseId);
      if (!testCase) return;
      copyText(buildCaseCurl(testCase), "curl");
      return;
    }
    if (payloadButton) {
      const payload = els.caseGroups.querySelector(`[data-case-payload="${CSS.escape(payloadButton.dataset.caseId)}"]`);
      if (payload) payload.classList.toggle("is-hidden");
      return;
    }
    state.customCases = state.customCases.filter((item) => item.case_id !== removeButton.dataset.caseId);
    state.selectedCaseIds.delete(removeButton.dataset.caseId);
    els.customPayloadHint.textContent = state.customCases.length
      ? `已添加 ${state.customCases.length} 个自定义 payload。`
      : "粘贴 JSON object 后添加为临时 case。";
    renderCaseSelector(state.providerCases[currentCaseCacheKey()]);
  });

  els.selectAllCases.addEventListener("click", () => {
    const cases = allProviderCases();
    state.selectedCaseIds = new Set(cases.map((testCase) => testCase.case_id));
    renderCaseSelector(state.providerCases[currentCaseCacheKey()]);
  });

  els.clearAllCases.addEventListener("click", () => {
    state.selectedCaseIds = new Set();
    renderCaseSelector(state.providerCases[currentCaseCacheKey()]);
  });

  els.filterTabs.addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter]");
    if (!button) return;
    state.selectedFilter = button.dataset.filter;
    state.expandedCaseId = null;
    renderTabs();
    renderResults();
  });

  els.resultRows.addEventListener("click", (event) => {
    const actionButton = event.target.closest("[data-action]");
    if (actionButton) {
      const result = state.completedResults.find((item) => (item.result_uid || item.case_id) === actionButton.dataset.resultId);
      if (!result) return;
      if (actionButton.dataset.action === "copy-diff") copyText(diffMarkdown(result), "结构差异");
      if (actionButton.dataset.action === "copy-reply") copyText(customerReply(result), "结论");
      if (actionButton.dataset.action === "save-case") showToast(`${result.parameter} 已保存为模拟用例。`);
      return;
    }

    const row = event.target.closest("[data-result-id]");
    if (!row) return;
    state.expandedCaseId = state.expandedCaseId === row.dataset.resultId ? null : row.dataset.resultId;
    renderResults();
  });

  els.historyList.addEventListener("click", (event) => {
    const row = event.target.closest("tr[data-history-id]");
    if (row && !event.target.closest("[data-history-action]")) {
      state.expandedHistoryId = state.expandedHistoryId === row.dataset.historyId ? null : row.dataset.historyId;
      renderHistory();
      return;
    }
    const button = event.target.closest("[data-history-action]");
    if (!button) return;
    const items = readHistory();
    const record = items.find((item) => item.id === button.dataset.historyId);
    if (!record) return;
    if (button.dataset.historyAction === "copy") {
      copyText(historyRecordMarkdown(record), "历史报告");
      return;
    }
    if (button.dataset.historyAction === "feishu") {
      state.lastReportRecord = record;
      renderFeishuReport(record);
      pushFeishuReport(record);
      return;
    }
    if (button.dataset.historyAction === "toggle") {
      state.expandedHistoryId = state.expandedHistoryId === record.id ? null : record.id;
      renderHistory();
      return;
    }
    if (button.dataset.historyAction === "delete") {
      writeHistory(items.filter((item) => item.id !== record.id));
      if (state.expandedHistoryId === record.id) state.expandedHistoryId = null;
      renderHistory();
      showToast("历史报告已删除。");
    }
  });
}

initTheme();
renderChannels();
renderEndpointTabs();
renderSelectedChannel();
bindEvents();
bindModelLookupAddTabModalEvents();
bindProtocolParamDrawer();
bindErrorCodeMappingDrawer();
bindModelIntroDrawer();
renderProxyState();
loadFeishuConfig();
loadEmbedUrl(embedConfigs.evalscope);
loadEmbedUrl(embedConfigs.opencompass);
renderHistory();
autoImportOriginalBaselines();
renderChannelCatalog();

function bootAfterDocsReady() {
  renderProtocolCatalog();
  renderErrorCodeGuide();
  syncModelLookupFromHash();
  setActiveView(initialViewFromHash());
}

if (window.NOCTUA_DOCS_READY) {
  bootAfterDocsReady();
} else {
  document.addEventListener("noctua-docs-ready", bootAfterDocsReady, { once: true });
}
