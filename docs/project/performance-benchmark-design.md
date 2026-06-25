# 性能测试与报告需求设计

## 背景

provider-diff 当前主流程是协议兼容性测试：用户选择渠道、Endpoint、Base URL、Model 和 payload case，后端发起真实请求，然后输出参数支持结论、结构差异和历史报告。

新增性能测试的目标不是替代兼容性测试，而是在同一份渠道配置上补充吞吐、首 token 延迟和并发稳定性数据。推荐接入 `llmapibenchmark` 作为底层执行套件，它适合 OpenAI-compatible API endpoint，可以按并发档位测量 generation throughput、prompt throughput、TTFT，并输出结构化结果或 Markdown 报告。

## 设计结论

性能测试应作为独立一级视图加入顶部导航，名称建议为「性能」或「Benchmark」，不要放进当前「运行」页的参数兼容测试表单里。

原因：

- 兼容性测试关注「参数是否支持、响应结构是否一致」，性能测试关注「并发、吞吐、TTFT、稳定性」。两者共享渠道配置，但结果模型完全不同。
- 当前「运行」页已经包含渠道模板、Endpoint、API Key、Base URL、Model、历史基准、代理、测试套件、用例选择、自定义 payload 和结果矩阵。继续塞 benchmark 参数会显得拥挤。
- 性能测试通常更重、更慢、更贵，需要更明确的确认、成本提示和独立历史报告。

推荐信息架构：

```text
运行        参数兼容性测试
性能        llmapibenchmark 性能测试
报告        兼容性报告 + 性能报告聚合
飞书文档     写入当前报告
EvalScope   外部评测面板
OpenCompass 外部评测面板
```

## UI 调整建议

### 1. 顶部配置区保留最少字段

「运行」页和「性能」页共享一组基础连接配置：

- Provider / 渠道模板
- Endpoint 类型
- API Key
- Base URL
- Model

这五项是高频主路径，应保持常驻可见。

### 2. 代理设置改为高级配置

当前「请求代理设置」作为独立 section 占位偏大。建议改成一行折叠式高级配置，放在 Base URL / Model 表单下方：

```text
高级配置  · 直连
```

展开后显示：

- 启用代理 toggle
- Proxy URL 输入框
- 当前模式说明：直连 / 代理

折叠态只显示摘要：

- `直连`
- `代理：http://127.0.0.1:7890`
- `代理已启用但未填写 URL`

这样能保留能力，但不抢主流程空间。

### 3. 性能页布局

性能页建议分三块：

```text
[连接配置摘要]
Provider · Endpoint · Base URL · Model · 代理摘要

[Benchmark 配置]
并发档位       1,2,4,8,16
输出上限       512
输入规模       约 512 words
Prompt         textarea，可选
运行模式       快速 / 标准 / 压测
格式           JSON + Markdown
[开始性能测试]

[性能报告]
Summary cards + 曲线/表格 + 原始报告
```

Benchmark 配置只暴露 4 个高频项：

- `concurrency`: 默认 `1,2,4,8,16`
- `max_tokens`: 默认 `512`
- `num_words`: 默认 `512` 或 `0`
- `prompt`: 可选，未填时使用 llmapibenchmark 默认 prompt

其它参数放进「高级参数」：

- timeout
- repeat / warmup
- output format
- benchmark binary path
- request headers override

## 后端设计

新增一组 API，不复用 `/api/run`：

### `GET /api/benchmark/defaults`

返回前端默认 benchmark 配置。

```json
{
  "concurrency": "1,2,4,8,16",
  "max_tokens": 512,
  "num_words": 512,
  "format": "json",
  "timeout_seconds": 1800
}
```

### `POST /api/benchmark/run`

执行一次性能测试。

请求：

```json
{
  "provider": "siliconflow",
  "endpoint_id": "chat_completions",
  "api_key": "sk-...",
  "base_url": "https://api.siliconflow.cn/v1",
  "model": "deepseek-ai/DeepSeek-V3",
  "proxy": {
    "enabled": false,
    "url": "",
    "mode": "direct"
  },
  "benchmark": {
    "concurrency": "1,2,4,8,16",
    "max_tokens": 512,
    "num_words": 512,
    "prompt": "",
    "format": "json"
  }
}
```

响应：

```json
{
  "id": "perf_siliconflow_1780046000000",
  "provider": "siliconflow",
  "endpoint_id": "chat_completions",
  "base_url": "https://api.siliconflow.cn/v1",
  "model": "deepseek-ai/DeepSeek-V3",
  "proxy": {
    "enabled": false,
    "url": "",
    "mode": "direct"
  },
  "started_at": "2026-06-03T10:00:00Z",
  "finished_at": "2026-06-03T10:08:21Z",
  "summary": {
    "best_generation_tps": 414.35,
    "best_prompt_tps": 1479.76,
    "min_ttft_seconds": 0.11,
    "max_ttft_seconds": 0.24,
    "recommended_concurrency": 8
  },
  "rows": [
    {
      "concurrency": 1,
      "generation_tps": 58.49,
      "prompt_tps": 846.81,
      "min_ttft_seconds": 0.05,
      "max_ttft_seconds": 0.05
    }
  ],
  "markdown_path": "outputs/performance/perf_siliconflow_1780046000000.md",
  "json_path": "outputs/performance/perf_siliconflow_1780046000000.json",
  "raw_stdout": ""
}
```

### `GET /api/benchmark/reports`

列出 `outputs/performance/*.json`，用于历史报告页聚合。

### `GET /api/benchmark/reports/{id}`

读取单份性能报告。

## llmapibenchmark 执行映射

后端将请求参数转换为 CLI：

```sh
llmapibenchmark \
  --base-url "$BASE_URL" \
  --api-key "$API_KEY" \
  --model "$MODEL" \
  --concurrency "1,2,4,8,16" \
  --max-tokens 512 \
  --num-words 512 \
  --format json
```

如果填写了 prompt：

```sh
llmapibenchmark \
  --base-url "$BASE_URL" \
  --api-key "$API_KEY" \
  --model "$MODEL" \
  --concurrency "1,2,4,8,16" \
  --max-tokens 512 \
  --prompt "$PROMPT" \
  --format json
```

代理处理建议：

- 优先通过环境变量传递：`HTTP_PROXY`、`HTTPS_PROXY`、`ALL_PROXY`。
- 不建议把代理作为 llmapibenchmark 自定义参数暴露给 UI，因为该工具本身主要暴露 benchmark 参数。
- 后端在执行前根据 `proxy.enabled` 注入环境变量；折叠态摘要即可满足用户理解。

## 报告设计

性能报告和兼容性报告应共用历史报告存储，但用 `report_type` 区分：

```json
{
  "report_type": "performance",
  "id": "perf_siliconflow_1780046000000"
}
```

报告页可以新增 Tab：

```text
全部 / 兼容性 / 性能
```

性能报告列表显示：

- Provider
- Endpoint
- Model
- 代理模式
- 并发档位
- 最佳生成吞吐
- 最低 TTFT
- 推荐并发
- 运行时间

单份性能报告显示：

- Summary cards
  - Best generation TPS
  - Best prompt TPS
  - Min TTFT
  - Recommended concurrency
- 并发表格
  - Concurrency
  - Generation throughput
  - Prompt throughput
  - Min TTFT
  - Max TTFT
- Markdown 原文预览
- 导出 JSON / Markdown

## 验收标准

- 顶部导航新增「性能」视图，不影响当前兼容性测试流程。
- 代理配置从独立大 section 改为「高级配置」折叠项，折叠态显示直连/代理摘要。
- 性能页可以复用当前选择的 Provider、Endpoint、Base URL、Model、API Key。
- 用户可以配置并发档位、max tokens、输入规模和 prompt。
- 后端可以调用 llmapibenchmark 并保存 JSON + Markdown 报告到 `outputs/performance/`。
- 性能结果能在页面展示 summary 和并发表格。
- 历史报告页能区分兼容性报告与性能报告。
- API Key 不落盘；保存报告时只保存脱敏后的配置摘要。
- 代理 URL 默认不落入导出的公开报告；如需记录，仅保存 `direct/proxy` 模式和脱敏 host。

## 分阶段实现

### Phase 1：最小可用

- 新增「性能」视图。
- 接入 `POST /api/benchmark/run`。
- 支持 concurrency、max_tokens、num_words、prompt。
- 保存并展示 JSON 结果。
- 代理配置改为折叠式高级配置。

### Phase 2：报告增强

- 保存 Markdown。
- 历史报告页加入性能报告筛选。
- 支持导出性能报告。
- 增加推荐并发计算。

### Phase 3：长期能力

- 多模型横向对比。
- 同一模型多次运行趋势图。
- 错误率、P50/P95/P99 延迟。
- 成本估算和 token 消耗估算。
- 定时性能监控。
