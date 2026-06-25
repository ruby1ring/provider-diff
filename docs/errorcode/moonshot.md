> ## Documentation Index
> Fetch the complete documentation index at: https://platform.kimi.com/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# 错误说明

当请求失败时，API 会返回包含错误信息的 JSON 响应：

```json theme={null}
{
    "error": {
        "type": "content_filter",
        "message": "The request was rejected because it was considered high risk"
    }
}
```

## 错误列表

### 400 — 请求错误

| error type              | error message                                                                                                                | 详细描述                                                         |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `content_filter`        | The request was rejected because it was considered high risk                                                                 | 内容审查拒绝，您的输入或生成内容可能包含不安全或敏感内容，请您避免输入易产生敏感内容的提示语               |
| `invalid_request_error` | Invalid request: \{error\_details}                                                                                           | 请求无效，通常是您请求格式错误或者缺少必要参数，请检查后重试                               |
| `invalid_request_error` | Input token length too long                                                                                                  | 请求中的 tokens 长度过长，请求不要超过模型 tokens 的最长限制                       |
| `invalid_request_error` | Your request exceeded model token limit : \{max\_model\_length}                                                              | 请求的 tokens 数和设置的 max\_tokens 加和超过了模型规格长度，请检查请求体的规格或选择合适长度的模型 |
| `invalid_request_error` | Invalid purpose: only 'file-extract' accepted                                                                                | 请求中的目的（purpose）不正确，当前只接受 'file-extract'，请修改后重新请求             |
| `invalid_request_error` | File size is too large, max file size is 100MB, please confirm and re-upload the file                                        | 上传的文件大小超过了限制，请重新上传                                           |
| `invalid_request_error` | File size is zero, please confirm and re-upload the file                                                                     | 上传的文件大小为 0，请重新上传                                             |
| `invalid_request_error` | The number of files you have uploaded exceeded the max file count \{max\_file\_count}, please delete previous uploaded files | 上传的文件总数超限，请删除不用的早期的文件后重新上传                                   |

### 401 — 认证错误

| error type                     | error message              | 详细描述                               |
| ------------------------------ | -------------------------- | ---------------------------------- |
| `invalid_authentication_error` | Invalid Authentication     | 鉴权失败，请检查 API Key 是否正确，请修改后重试       |
| `incorrect_api_key_error`      | Incorrect API key provided | 鉴权失败，请检查 API Key 是否提供以及是否正确，请修改后重试 |

<Warning>
  如果您在 `platform.kimi.ai` 平台申请的 Key 用在了 `platform.kimi.com` 平台（或反之），也会收到 401 错误。两个平台的 Key 完全独立，不能混用。
</Warning>

### 403 — 权限错误

| error type                | error message                                      | 详细描述                  |
| ------------------------- | -------------------------------------------------- | --------------------- |
| `permission_denied_error` | The API you are accessing is not open              | 访问的 API 暂未开放          |
| `permission_denied_error` | You are not allowed to get other user info         | 不允许访问其他用户信息           |
| `permission_denied_error` | Your IP is not allowed to access this organization | 您的 IP 地址不在该组织的允许访问名单内 |

### 404 — 资源不存在

| error type                 | error message                                        | 详细描述                     |
| -------------------------- | ---------------------------------------------------- | ------------------------ |
| `resource_not_found_error` | Not found the model \{model-id} or Permission denied | 不存在此模型或者没有授权访问此模型，请检查后重试 |

### 429 — 速率限制 / 额度不足

| error type                     | error message                                                                                                                                   | 详细描述                                      |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `engine_overloaded_error`      | The engine is currently overloaded, please try again later                                                                                      | 当前并发请求过多，节点限流中，请稍后重试；建议充值升级 tier，享受更丝滑的体验 |
| `exceeded_current_quota_error` | Your account \{organization-id}\<\{ak-id}> is suspended, please check your plan and billing details                                             | 账户余额不足，已停用，请检查您的账户余额                      |
| `exceeded_current_quota_error` | You exceeded your current token quota: \<\{organization\_id}> \{token\_credit}, please check your account balance                               | 账户额度不足，请检查账户余额，保证账户余额可匹配您 tokens 的消耗费用后重试 |
| `rate_limit_reached_error`     | Your account \{organization-id}\<\{ak-id}> request reached organization max concurrency: \{Concurrency}, please try again after \{time} seconds | 请求触发了账户并发个数的限制，请等待指定时间后重试                 |
| `rate_limit_reached_error`     | Your account \{organization-id}\<\{ak-id}> request reached organization max RPM: \{RPM}, please try again after \{time} seconds                 | 请求触发了账户 RPM 速率限制，请等待指定时间后重试               |
| `rate_limit_reached_error`     | Your account \{organization-id}\<\{ak-id}> request reached organization TPM rate limit, current:\{current\_tpm}, limit:\{max\_tpm}              | 请求触发了账户 TPM 速率限制，请等待指定时间后重试               |
| `rate_limit_reached_error`     | Your account \{organization-id}\<\{ak-id}> request reached organization TPD rate limit, current:\{current\_tpd}, limit:\{max\_tpd}              | 请求触发了账户 TPD 速率限制，请等待指定时间后重试               |

### 500 — 服务端错误

| error type          | error message                    | 详细描述        |
| ------------------- | -------------------------------- | ----------- |
| `server_error`      | Failed to extract file: \{error} | 解析文件失败，请重试  |
| `unexpected_output` | invalid state transition         | 内部错误，请联系管理员 |

## 排障建议

* **收到 401**：先确认是否使用了正确平台的 API Key
* **收到 429**：考虑降低并发或升级用户等级，详见[充值与限速](/pricing/limits)
* **收到 500**：请稍后重试，如持续出现请联系支持团队
解释