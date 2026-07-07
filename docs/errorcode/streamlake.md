# StreamLake

> 🔗 原文链接： [错误码说明-快手万擎](https://www.streamlake.com/document/WANQING/mhyk52ofkyit2gaim3a)

> ⏰ 对照时间：2026-07-01 17:52:04 (UTC+8)

本文列举您调用快手万擎 API 可能会涉及的错误码信息，包含万擎错误码和公共错误码。

#### 万擎错误码

| HTTP 状态码 | 错误码 Code | 错误信息 Message | 含义 |
|---|---|---|---|
| 400 | InvalidArgument.MissingRequiredParameter | The xxx parameter is required. | 缺少必要的参数。 |
| 400 | InvalidArgument.RequestBodyInvalid | Invalid request body format, please check the request body format. | 参数格式错误。 |
| 400 | InvalidEndpoint.StoppedEndpoint | The requested endpoint has been stopped and is currently unavailable. | 请求已停止的推理点。 |
| 400 | InvalidArgument.Authorization | The provided API key is invalid. | 非法的 API Key。 |
| 400 | InvalidArgument.UserInfoError | The userInfo is invalid. | 非法的用户信息。 |
| 403 | Forbidden.InsufficientBalance | The balance is insufficient. | 账号余额不足。 |
| 403 | Forbidden.Frozen | User has been frozen. | 账号被冻结。 |
| 403 | Forbidden | The request was denied by the server. | 请求无权限。 |
| 403 | UnaccessibleUser | Request was rejected due to reason: user is not allowed to access, reason: CustomerId：{CustomerId}，Action：{Action}，No balance and no resource pack, limit request | 推理场景账号无余额及信用额度请求限制。 |
| 404 | ResourceNotFound | Resource not found. | 资源不存在 |
| 408 | Request Timeou | Request Timeout | 服务器等待超时（官网 Message 原文拼写为 Timeou） |
| 413 | Payload Too Large | Payload Too Large | 负载过大，请求实体过大 |
| 429 | TooManyRequests | Too many requests. | 请求限流。 |
| 500 | InternalServerError | The request processing has failed due to some unknown error. | 服务器错误，请提交工单联系平台处理。 |
| 502 | Bad Gateway | Bad Gateway | 错误网关，服务器作为网关或代理收到无效响应 |
| 503 | Service Unavailable | Service Unavailable | 内部服务器错误，服务器遇到意外情况 |
| 0 | Error Unknowndownstream_remote_disconnect | Error Unknowndownstream_remote_disconnect | 客户端与服务器连接中断，此情况模型没有返回内容 |
| 200 | ClientClosedRequestdownstream_remote_disconnect | ClientClosedRequestdownstream_remote_disconnect | 客户端主动断开连接，模型正常返回结果，但终端不会再收到 |

#### 公共错误码

| HTTP 状态码 | 错误码 Code | 错误信息 Message | 错误说明及解决方式 |
|---|---|---|---|
| 400 | InvalidArgument | Missing Action parameter | 关键参数缺失，例如 Action 等，请确认请求 restFul 路由是否正确。 |
| 401 | Unauthorized | AUTH_INFO missing | 请求的 Api Key 格式不合法。请检查 Api key Id 是否正确，注意不要有多余的空格符号。 |
| 403 | Forbidden | Customer:{CustomerId} is frozen, not allow to access action: {Action} | 用户账号欠费冻结，不允许访问指定计费接口。 |
| 403 | Forbidden | AccessKey:{Apikey} IS UNAVAILABLE | 用户传入的 Api Key 已删除或禁用（用户传入 model 字段错误，未传推理点 ID）。 |
