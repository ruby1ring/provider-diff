我要做一个 LLM 网关合规性测试工具的前端界面，叫 "llm-rosetta"。功能是：用户填入一个 LLM 渠道的 API 信息，选择一套测试模板，前端会发起一组测试请求，检测这家渠道对 OpenAI 协议的兼容程度（哪些参数支持、响应里多了哪些非标字段）。

## 整体风格

**核心参考 OpenRouter (openrouter.ai) 的风格**：
- 深色主题为主（背景 #0a0a0a / #111111）
- 字体偏技术感，等宽字体用于代码和 JSON
- 紧凑、信息密度高、不浮夸
- 主色调：中性灰 + cyan/teal 作为强调色 (#06b6d4)
- 状态颜色：绿 (#10b981 通过) / 黄 (#f59e0b 警告) / 红 (#ef4444 不合规) / 灰 (#6b7280 不适用)
- 圆角小 (rounded-md 不要 rounded-2xl)
- 大量使用 monospace 字体

使用 Next.js 14 (App Router) + Tailwind CSS + shadcn/ui。所有数据用 mock，不要真的调 LLM API。

## 页面布局：单页应用，分四个区域，垂直排列

### 区域 1：渠道选择 + 配置输入区（顶部）

**第一步：选择一个渠道模板**

顶部 5 张卡片横排，每张卡片是一个预设渠道，点击切换。卡片显示：渠道 logo（用 emoji 代替即可：🇺🇸🐳☁️🎬🧊）、渠道名、参数数量。

| 卡片 | 渠道名 | 描述 |
|---|---|---|
| 🇺🇸 OpenAI Official | 参考基线 | 25 parameters · the standard |
| 🐳 DeepSeek | DeepSeek 官方 | 18 parameters |
| ☁️ Aliyun Bailian | 阿里百炼（DashScope） | 21 parameters |
| 🎬 MiniMax | MiniMax 官方 | 15 parameters |
| 🧊 SiliconFlow | 硅基流动 | 20 parameters |

选中的卡片用 cyan 边框高亮。点击后下方表单自动填入对应的 Base URL 占位符和 Model 占位符。

**第二步：填入 API 信息**

下方表单，双列布局：

- **API Key**: 密码输入框（type=password），带显示/隐藏切换，placeholder "sk-..."
- **Base URL**: 文本输入，等宽字体，根据上面选中的卡片自动填默认值（可改）
- **Model**: 文本输入，等宽字体，每个渠道有一个推荐默认值

各渠道的默认值（hardcode 在 mock 里）：

| 渠道 | Base URL | 推荐 Model |
|---|---|---|
| OpenAI | https://api.openai.com/v1 | gpt-4o-mini |
| DeepSeek | https://api.deepseek.com/v1 | deepseek-chat |
| Aliyun Bailian | https://dashscope.aliyuncs.com/compatible-mode/v1 | qwen-max |
| MiniMax | https://api.minimaxi.com/v1 | MiniMax-M2 |
| SiliconFlow | https://api.siliconflow.cn/v1 | deepseek-ai/DeepSeek-V3 |

**第三步：展示该模板的测试参数清单**

下方一个折叠面板，标题 "Test Suite: <selected channel> (<n> parameters)"，默认折叠。展开后显示该模板包含的参数清单，按分组：

每个渠道的参数清单（hardcode 在 mock 里）：

**OpenAI Official（25 个，全集）**
- Sampling: temperature, top_p, n, seed, stop, frequency_penalty, presence_penalty, logit_bias
- Length: max_tokens, max_completion_tokens
- Reasoning: reasoning_effort
- Output: response_format
- Tools: tools, tool_choice, parallel_tool_calls
- Protocol: stream, stream_options
- Debug: logprobs, top_logprobs
- Metadata: user, metadata, store
- （额外）service_tier, prediction, audio

**DeepSeek（18 个）**
- Sampling: temperature, top_p, seed, stop, frequency_penalty, presence_penalty
- Length: max_tokens
- Output: response_format
- Tools: tools, tool_choice
- Protocol: stream, stream_options
- Debug: logprobs, top_logprobs
- Metadata: user
- （DeepSeek 不支持）n, max_completion_tokens, reasoning_effort 等 — 在 UI 中标灰且打钩 ✗ 表示"模板会测但预期 rejected"

**Aliyun Bailian（21 个）**
- Sampling: temperature, top_p, seed, stop, frequency_penalty, presence_penalty
- Length: max_tokens
- Reasoning: enable_thinking, thinking_budget （Qwen 特色）
- Output: response_format
- Tools: tools, tool_choice, parallel_tool_calls
- Protocol: stream, stream_options
- Debug: logprobs, top_logprobs
- Metadata: user
- （额外）result_format, incremental_output （DashScope 私有）

**MiniMax（15 个）**
- Sampling: temperature, top_p, stop
- Length: max_tokens
- Output: response_format
- Tools: tools, tool_choice
- Protocol: stream
- Metadata: user
- （额外）mask_sensitive_info, tools_calling_choice （MiniMax 私有）

**SiliconFlow（20 个）**
- Sampling: temperature, top_p, n, seed, stop, frequency_penalty, presence_penalty
- Length: max_tokens
- Reasoning: enable_thinking （透传 Qwen 系）
- Output: response_format
- Tools: tools, tool_choice, parallel_tool_calls
- Protocol: stream, stream_options
- Debug: logprobs, top_logprobs
- Metadata: user

折叠面板里的参数列表样式：用细密 grid 排布，每个参数一个小 chip（圆角矩形），等宽字体显示参数名，旁边小字标注 origin（如 "openai-standard" / "qwen-extension" / "minimax-private"）。

**右下角大按钮：**"Run Tests"**（cyan 强调色），旁边小字 "≈ 30 seconds estimated"。

### 区域 2：执行进度条（点击 Run 后出现）

一个细长的 cyan 进度条 + 当前正在执行的 case 名：

```
[████████████████░░░░░░░░░] 14 / 18 — testing response_format ...
```

下面用滚动日志的样式实时打出每个 case 的结果，每行一条，monospace：

```
✓ temperature              accepted          412ms
✓ top_p                    accepted          389ms
✗ n                        rejected          213ms   Currently only n=1 is supported
✓ seed                     accepted          401ms
⚠ frequency_penalty        warning           430ms   contains hint: ignored
...
```

颜色：✓ 绿，✗ 红，⚠ 黄，? 灰
点击 "Stop" 中断。Mock 模拟：每 300-500ms 出现一行（用 setTimeout）。

### 区域 3：结果矩阵（核心区域）

跑完后展示一张大表，**这是页面主角**。

表格列：

| Parameter | Category | Status | Latency | Diff vs OpenAI |
|---|---|---|---|---|

- Parameter：参数名（monospace）
- Category：分组（sampling / reasoning / tools 等，小灰字）
- Status：彩色徽章（accepted 绿 / rejected 红 / warning 黄 / n/a 灰）
- Latency：响应时间（monospace，灰色）
- Diff vs OpenAI：与 OpenAI 标准响应的结构差异摘要，如 "3 fields differ" 红字，或 "—" 灰色（完全一致）

**每行可点击展开**，点击后该行下方插入详情面板（见区域 4）。

顶部筛选条：
- Tab: [All (18)] [Failures (3)] [Warnings (1)] [Structure Diffs (7)]
- 右上角按钮: "Export JSON" / "Export Markdown" / "Re-run"

顶部 4 个统计卡片（横排紧凑）：
- ✓ Passed: 14
- ⚠ Warnings: 1
- ✗ Failed: 3
- ◐ Structure Diffs: 7

### 区域 4：单个 case 详情面板（行展开后）

展开行下方插入一个深色面板。结构如下：

```
┌─────────────────────────────────────────────────────────────────┐
│  REQUEST BODY                                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  {                                                         │  │
│  │    "model": "deepseek-chat",                               │  │
│  │    "messages": [{ "role": "user", "content": "Say hi" }], │  │
│  │    "n": 2          ← tested parameter (highlighted cyan) │  │
│  │  }                                                         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  RESPONSE COMPARISON                                             │
│  ┌────────────────────────────┬──────────────────────────────┐  │
│  │ OpenAI Baseline            │ DeepSeek (this channel)       │  │
│  │ gpt-4o-mini · 200 · 580ms  │ deepseek-chat · 400 · 213ms   │  │
│  │ ─────────────────────────  │ ─────────────────────────────│  │
│  │ {                          │ {                             │  │
│  │   "id": "chatcmpl-...",    │   "error": {                  │  │
│  │   "object": "chat.compl.", │     "message": "Currently     │  │
│  │   "choices": [             │       only n=1 is supported", │  │
│  │     {...},                 │     "type": "invalid_request",│  │
│  │     {...}                  │     "code": "n_not_supported" │  │
│  │   ],                       │   }                           │  │
│  │   "usage": {...}           │ }                             │  │
│  │ }                          │                               │  │
│  └────────────────────────────┴──────────────────────────────┘  │
│                                                                   │
│  STRUCTURAL DIFF                                                 │
│  ─────────────                                                   │
│  - choices              array          (missing in this channel) │
│  - usage                object         (missing)                 │
│  - id                   string         (missing)                 │
│  - object               string         (missing)                 │
│  + error                object         (extra)                   │
│  + error.code           string         (extra)                   │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Severity: CRITICAL — 4 required OpenAI fields missing       │ │
│  │ This response cannot be processed by standard OpenAI SDKs.  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  [ Copy diff ]  [ Copy as customer reply ]  [ Save as case ]    │
└─────────────────────────────────────────────────────────────────┘
```

**关键：Structural Diff 部分的实现**

这是工具的核心价值。**只比较 JSON 结构差异（字段是否存在 + 类型），不比较具体值**。规则：

- baseline 有但 channel 缺失 → **红色**，前缀 `-`，标注 "(missing in this channel)"
- baseline 没有但 channel 多出来 → **红色**，前缀 `+`，标注 "(extra, not in OpenAI standard)"
- 字段名相同但类型不一致（baseline 是 string，channel 是 array）→ **黄色**，前缀 `~`，标 "(type mismatch: expected X, got Y)"
- 字段完全一致 → 不显示

每行格式：`{prefix} {path}  {type}  {note}`，三列对齐，等宽字体。

底部 Severity Badge：
- 🔴 **CRITICAL** — 缺失了 OpenAI 必填字段（id / object / choices / usage / model）
- 🟡 **EXTENSION** — 只是多了非标字段（如 `reasoning_content`, `prompt_cache_hit_tokens`）
- 🟢 **COMPATIBLE** — 结构完全一致

底部操作按钮：
- "Copy diff" — 复制结构差异 markdown
- "Copy as customer reply" — 生成话术，如 "DeepSeek 不支持 n>1，建议使用 stream 拼接多次请求"
- "Save as case" — 保存这个 case（v0 mock 只显示 toast）

### Mock 数据要求

请创建 `lib/mock-data.ts`，export：

1. `CHANNEL_TEMPLATES` — 5 个渠道模板，每个包含：channel_id, name, emoji, default_base_url, default_model, parameters (按分组)
2. `MOCK_PARAMETER_ORIGINS` — 每个参数的来源标签（openai-standard / qwen-extension / minimax-private 等）
3. `MOCK_RESULTS` — 一组测试结果数组，覆盖所有四种状态
4. `MOCK_RESPONSES` — 每个 case 对应 `{ request_body, baseline_response, channel_response }`

需要 mock 得真实的几个 case（用 DeepSeek 模板举例）：

- **temperature** accepted: 两边返回结构一致，diff 为空
- **n=2** rejected: channel 返回 error 对象，baseline 返回 choices=2 个的正常响应，diff 显示 6-7 行结构差异
- **frequency_penalty** warning: channel 返回 200 但响应里某个字段提示 "ignored for reasoning model"
- **response_format=json_object** accepted: 两边都成功，但 channel 响应缺少 `system_fingerprint` 字段（细微差异）
- **logprobs** accepted: channel 返回 logprobs，但 baseline 的 logprobs 结构里多一个 `top_logprobs` 数组（结构扩展）

**JSON diff 算法**：自己写一个递归 compare 函数，输入两个 object，输出 `[{ path, change, type_before, type_after, note }]`。不要装 jsondiffpatch 之类的库。

## 不需要做的

- 不要真的发 HTTP 请求
- 不要做用户认证 / 历史记录
- 不要做主题切换器，固定深色
- 不要响应式移动端

## 交付物

一个能跑的 Next.js 项目，npm install && npm run dev 看到完整界面。所有交互可演示（切换渠道模板 / 展开折叠 / 模拟跑测试 / 展开行看 diff）。
