# 渠道错误码映射 — 维护说明

## 目标

将各 LLM 上游渠道的原生错误（HTTP 状态、业务 code/type、message）整理为建议的 **OpenAI Chat Completions `error` 对象**，供网关适配与排障参考。

## 数据来源（单源架构）

| 类型 | 路径 | 谁维护 |
|------|------|--------|
| **错误码文档（人工层）** | `docs/errorcode/{provider}.md` | 维护者对照官方文档 |
| 场景与映射配置 | `docs/errorcode/error-code-registry.json` | 统一场景、envelope、mappings |
| **机器产物** | `web/data/error-code-catalog.json` | `npm run build:error-code-catalog` 自动生成 |
| Web UI | `/web/#error-channels`、`/web/#error-mapping` | 读取 JSON |

## 构建命令

```bash
npm run build:error-code-catalog
npm run rebuild:docs            # 协议 + 错误码一并重建
npm run dev                     # 启动前自动检测 md 变更并重建
```

## 映射目标形态

```json
{
  "error": {
    "message": "…",
    "type": "invalid_request_error",
    "code": "invalid_api_key",
    "param": null
  }
}
```

## docStatus 规则

| 状态 | 含义 |
|------|------|
| `verified` | 文档表格清晰，映射已对照 |
| `partial` | 文档过大或非结构化，仅摘取高频场景 |
| `missing` | 尚无本地文档或未录入 |

### 阿里云百炼（`ali`）

- **结构化文档**：[`docs/errorcode/ali.md`](../errorcode/ali.md) — LLM / VLM 场景。
- **扩展 FAQ**：[`docs/errorcode/archive/ali-errorcode-raw.md`](../errorcode/archive/ali-errorcode-raw.md) — 语音/生图等垂直能力（不参与 Web 矩阵）。

## 新增渠道或场景

1. 在 `docs/errorcode/` 添加或更新渠道文档（错误条目表）。
2. 在 `docs/errorcode/error-code-registry.json` 的 `channels` 中增加 `channel_id`、`envelope`、`entries`、`mappings`。
3. 在 `scenarios` 中增加统一场景（若为新场景）。
4. 将 `channel_id` 加入 `channelOrder`。
5. 运行 `npm run build:error-code-catalog` 并提交 `web/data/error-code-catalog.json`。

## 映射原则

- **场景行**表达网关关心的用户意图，而非上游原始字符串全文。
- **OpenAI `type` / `code`** 取自 OpenAI 官方错误语义。
- 上游仅有 HTTP 状态、无 body error 对象时，在 `envelope` 与 `notes` 中说明。
