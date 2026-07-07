# 测评协议参数矩阵 — 维护说明

## 目标

在同一协议（Chat Completions / Anthropic Messages / Responses API）下横向对比各渠道官方 API 文档中的**参数覆盖**与**约束差异**，供兼容性测评设计与网关适配参考。

## 数据来源（单源架构）

| 类型 | 路径 | 谁维护 |
|------|------|--------|
| **协议摘要（唯一人工层）** | `docs/api/{provider}-{protocol}.md` | 维护者对照官方文档 |
| 渠道配置 | `docs/api/protocol-channel-registry.json` | 测评渠道名单、OpenAI 基线 |
| 文档清单元数据 | `scripts/protocol-doc-manifest.mjs` | 新文档登记（channel_id、分组） |
| **机器产物** | `web/data/protocol-matrix.json` | `npm run build:protocol-matrix` 自动生成 |
| Web UI | `/web/#protocols` | 读取 JSON |

整理规范见 [protocol-md-template.md](protocol-md-template.md)。

## 构建命令

```bash
npm run build:protocol-matrix   # 注入 frontmatter（如需）+ 生成 JSON
npm run rebuild:docs            # 协议 + 错误码一并重建
npm run dev                     # 启动前自动检测 md 变更并重建
```

## docStatus 规则

| 状态 | 含义 |
|------|------|
| `verified` | 本地 `docs/api/*.md` 已对照官方文档 |
| `partial` | 文档不完整或渠道端点待补充 |
| `missing` | 无本地文档或未纳入对比（`compare: false`） |
| `internal` | 跨渠道探针（如 thinking-dialects），非单一供应商 |

## 矩阵收录原则

1. **严格以 `docs/api` 摘要为准**：仅收录「Documented Request Parameters」表（及 Required 字段）。
2. **百炼 Chat**：矩阵只含 OpenAI 标准顶层参数；DashScope `extra_body` 扩展见本地文档，不参与横向对比。
3. **OpenRouter Chat**：`model` 可选 → `required_parameters: [messages]`。
4. **Ignored / deprecated**：Notes 含 deprecated/无效果 → 自动生成 `effective` 标记。

## 测评对比渠道

`protocol-channel-registry.json` → `evalChannels`（8 家）：`deepseek`、`moonshot`、`zhipu`、`aliyun`、`openrouter`、`minimax`、`siliconflow`、`streamlake`。

## 新增渠道或协议

1. 按 [protocol-md-template.md](protocol-md-template.md) 在 `docs/api/` 添加 `{provider}-{chat|message|response}.md`（含 YAML frontmatter）。
2. 在 `scripts/protocol-doc-manifest.mjs` 登记 `channel_id`、`protocol_id`、`parameter_groups`。
3. 若纳入测评，将 `channel_id` 加入 `docs/api/protocol-channel-registry.json` → `evalChannels`。
4. 运行 `npm run build:protocol-matrix` 并提交生成的 `web/data/protocol-matrix.json`。

## 与探针用例的关系

`payloads/` 目录的兼容性用例与矩阵展示解耦；更新矩阵不要求同步改 payload，除非测评范围本身变化。

## 思考模式实测回写（两阶段）

矩阵参数来自 `docs/api` 文档摘要，**不会**随单次探针运行自动变更。Thinking 开关/强度实测结论通过独立 observed 层回写，经人工审核后再同步文档。

### 阶段 A：生成 observed 层（不改 docs）

1. 对待测渠道运行 `payloads/thinking/` 通用探针 + 渠道 `reasoning` 类 case（需 reasoning 模型）。
2. 从 UI 导出报告 JSON，或把文件放到 `outputs/` / `outputs/thinking-probes/`。
3. 构建 observed：

```bash
npm run build:thinking-observed
# 或指定输入
node scripts/build-thinking-observed.mjs --input outputs/my-siliconflow-run.json
```

产物：`web/data/thinking-observed.json`。协议矩阵页（`#protocols`）在 Reasoning 参数格显示角标：**实测有效** / **接受无效** / **文档缺口** 等，与文档「必填/选填」并列。

`thinking_effectiveness` 取值：

| 值 | 含义 |
|----|------|
| `effective` | 开关或强度实测改变行为 |
| `accepted_ineffective` | 2xx 但无行为差异 |
| `rejected` | 4xx 或明确不支持 |
| `unproven` | 2xx 但证据不足 |
| `default_on` | 默认即 thinking，开关无法隔离 |
| `doc_gap` | 矩阵未列但实测 `effective` |

`effort_profile`（强度类参数如 `reasoning_effort`）额外记录：

| 字段 | 含义 |
|------|------|
| `default_effort` | 不传 effort 时推断的默认档位（与 baseline case 对比 high/max token） |
| `accepted_values` | 实测 2xx 的档位：`low` / `medium` / `high` / `xhigh` / `max` / `none` |
| `canonical_values` | 实测确认为独立档位的 canonical 值（如 `high`、`max`） |
| `direct_values` | 直接生效、未映射到其他档位的值 |
| `mappings` | 别名映射推断，如 `{ from: "low", to: "high", basis: "token_or_visible_parity" }` |
| `documented_aliases` | 文档声明的兼容映射（实测用于对照） |

报告页 **Effort 枚举与映射** 表展示上述结论；DeepSeek 文档示例：`low/medium→high`、`xhigh→max`，普通请求默认 `high`（Agent 类请求自动 `max` 需专用探针）。

### 阶段 B：人工审核后同步 docs

1. 在报告页查看 **Thinking Probe 结论** 与 **Thinking 强度配对** 表。
2. 审核通过后按需修改：
   - `doc_gap` → 补进 `docs/api/{provider}-chat.md` + `scripts/protocol-doc-manifest.mjs`
   - `accepted_ineffective` → Notes 标注「接受但实测无效果」
3. `npm run build:protocol-matrix` 重建矩阵并提交 `web/data/protocol-matrix.json`。

**不自动改 docs**：observed 仅作候选与 UI 对照，矩阵正式收录仍以人工更新的 `docs/api` 为准。
