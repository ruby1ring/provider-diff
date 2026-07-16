# 错误说明

> 官方文档：[错误码 | DeepSeek API Docs](https://api-docs.deepseek.com/zh-cn/quick_start/error_codes)（[English](https://api-docs.deepseek.com/quick_start/error_codes)）
>
> 官方错误码页全量仅下表 7 条 HTTP 状态码，无业务子码，且未给出 error 响应体 JSON 结构说明（2026-07-12 核查）。

当请求失败时，API 返回 OpenAI 形态的 error 对象。官方错误码页没有响应体示例，以下形态来自实测。来源：实测（Noctua，2026-07-12），POST `https://api.deepseek.com/chat/completions`，401 无效 key：

```json
{
  "error": {
    "message": "Authentication Fails, Your api key: ****-key is invalid",
    "type": "authentication_error",
    "param": null,
    "code": "invalid_request_error"
  }
}
```

error 对象含 `message` / `type` / `param` / `code` 四字段，与 OpenAI Chat Completions error 形态一致。

**解析器必须注意的两个坑**（来源：实测（Noctua，2026-07-12））：

1. **`type` 与 `code` 不一致**：401 实测 `type` = `authentication_error`，而 `code` = `invalid_request_error`（code 疑似固定值）。按 `type` 判定错误类别比按 `code` 更可靠。
2. **网关层可能返回非 JSON 纯文本**：请求完全不带 `Authorization` 头时，HTTP 401 的响应体是纯文本 `Authentication Fails (governor)`，不是 JSON。**解析器必须容错非 JSON body。**

## 错误列表

官方错误码页全量仅以下 7 条，无业务子码（来源：https://api-docs.deepseek.com/zh-cn/quick_start/error_codes ，2026-07-12 抓取）：

| 错误码 | 描述 | 官方建议处理 |
| --- | --- | --- |
| 400 - 格式错误 | 请求体格式错误 | 请根据错误信息提示修改请求体 |
| 401 - 认证失败 | API key 错误，认证失败 | 请检查您的 API key 是否正确，如没有 API key，请先[创建 API key](https://platform.deepseek.com/api_keys) |
| 402 - 余额不足 | 账号余额不足 | 请确认账户余额，并前往[充值](https://platform.deepseek.com/top_up)页面进行充值 |
| 422 - 参数错误 | 请求体参数错误 | 请根据错误信息提示修改相关参数 |
| 429 - 请求速率达到上限 | 请求速率（TPM 或 RPM）达到上限 | 请合理规划您的请求速率 |
| 500 - 服务器故障 | 服务器内部故障 | 请等待后重试。若问题一直存在，请联系我们解决 |
| 503 - 服务器繁忙 | 服务器负载过高 | 请稍后重试您的请求 |

- **402 是 DeepSeek 特有用法**：OpenAI 体系不用 402（余额/配额类错误 OpenAI 走 429 `insufficient_quota`），网关适配时需单独映射。
- 官方未公布 content_filter / permission_denied / model_not_found / context_length / timeout / bad_gateway 等场景对应的错误码，映射不硬凑，待实测补充。

## 排障建议

* **收到 400 / 422**：按响应 `error.message` 修正请求（400 为请求体格式错误，422 为参数错误）
* **收到 401**：检查 API key 是否正确；若响应体为纯文本 `Authentication Fails (governor)`，说明请求根本没带 Authorization 头
* **收到 402**：账号余额不足，前往[充值页面](https://platform.deepseek.com/top_up)充值
* **收到 429**：请求速率（TPM 或 RPM）达到上限，合理规划请求速率
* **收到 500 / 503**：服务器故障 / 负载过高，稍后重试；500 持续出现请联系官方支持
