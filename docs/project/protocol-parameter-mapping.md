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
