# StreamLake

> 🔗 原文链接： [StreamLake](https://www.streamlake.com/document/WANQING/mhyk52ofkyit2gaim3a)

> ⏰ 剪存时间：2026\-06\-25 17:19:14 \(UTC\+8\)

> ✂️ 本文档由 [飞书剪存 ](https://www.feishu.cn/hc/zh-CN/articles/606278856233?from=in_ccm_clip_doc)一键生成

本文列举您调用快手万擎 API 可能会涉及的错误码信息，包含万擎错误码和公共错误码。

#### 万擎错误码

|**HTTP 状态码**|**错误码 Code**|**错误信息 Message**|**含义**|
|---|---|---|---|
|400|InvalidArgument\.MissingRequiredParameter|The xxx parameter is required\.|缺少必要的参数。|
|400|InvalidArgument\.RequestBodyInvalid|Invalid request body format, please check the request body format\.|参数格式错误。|
|400|InvalidEndpoint\.StoppedEndpoint|The requested endpoint has been stopped and is currently unavailable\.|请求已停止的推理点。|
|400|InvalidArgument\.Authorization|The provided API key is invalid\.|非法的 API Key。|
|400|InvalidArgument\.UserInfoError|The userInfo is invalid\.|非法的用户信息。|
|403|Forbidden\.InsufficientBalance|The balance is insufficient\.|账号余额不足。|
|403|Forbidden\.Frozen|User has been frozen\.|账号被冻结。|
|403|Forbidden|The request was denied by the server\.|请求无权限。|
|403|UnaccessibleUser|Request was rejected due to reason: user is not allowed to access, reason: CustomerId：\{CustomerId\}，Action：\{Action\}，No balance and no resource pack, limit request|推理场景账号无余额及信用额度请求限制|
|404|ResourceNotFound|Resource not found\.|资源不存在。|
|429|TooManyRequests|Too many requests\.|请求限流。|
|500|InternalError|The request processing has failed due to some unknown error\.|服务器错误，请提交工单联系平台处理。|

#### 公共错误码

|**HTTP 状态码**|**错误码 Code**|**错误信息 Message**|**错误说明及解决方式**|
|---|---|---|---|
|400|InvalidArgument|Missing Action parameter|关键参数缺失，例如Action等，请确认请求restFul路由是否正确。|
|401|Unauthorized|AUTH\_INFO missing|请求的Api Key格式不合法。请检查Api key Id是否正确，注意不要有多余的空格符号。|
|403|Forbidden|Customer:\{CustomerId\} is frozen, not allow to access action: \{Action\}|用户账号欠费冻结，不允许访问指定计费接口。|
|403|Forbidden|AccessKey:\{Apikey\} IS UNAVAILABLE|用户传入的Api Key已删除或禁用（用户传入model字段错误，未传推理点ID）。|

