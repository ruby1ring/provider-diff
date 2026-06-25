> ## Documentation Index
> Fetch the complete documentation index at: https://docs.bigmodel.cn/llms.txt
> Use this file to discover all available pages before exploring further.

# 错误码

调用智谱 AI 开放平台 API 时，接收到的响应码由两部分组成：外层是 HTTP 状态码，内层是响应体正文中的定义的业务错误码，提供了更具体的错误描述。

| 业务错误码 | HTTP 状态码 | 错误信息                                                                                                          |
| :---- | :------- | :------------------------------------------------------------------------------------------------------------ |
| -     | 500      | 内部错误                                                                                                          |
| 1000  | 401      | 身份验证失败                                                                                                        |
| 1001  | 401      | Header 中未收到 Authentication 参数，无法进行身份验证                                                                        |
| 1003  | 401      | Authentication Token 已过期，请重新生成/获取                                                                             |
| 1005  | 401      | 已开启二次认证保护，需要二次认证登录。                                                                                           |
| 1113  | 429      | 您的账户已欠费，请充值后重试                                                                                                |
| 1200  | 500      | API 调用失败                                                                                                      |
| 1210  | 400      | API 调用参数有误，请检查文档                                                                                              |
| 1211  | 400      | 模型不存在，请检查模型代码                                                                                                 |
| 1212  | 400      | 当前模型不支持 `${method}` 调用方式                                                                                      |
| 1213  | 400      | 未正常接收到 `${field}` 参数                                                                                          |
| 1214  | 400      | `${field}` 参数非法。请检查文档                                                                                         |
| 1215  | 400      | `${field1}` 与 `${field2}` 不能同时设置，请检查文档                                                                        |
| 1220  | 403      | 您无权访问 `${API_name}`                                                                                           |
| 1221  | 400      | API `${API_name}` 已下线                                                                                         |
| 1222  | 400      | API `${API_name}` 不存在                                                                                         |
| 1230  | 500      | API 调用流程出错                                                                                                    |
| 1234  | 500      | 网络错误，错误id：`${error_id}`，请联系客服                                                                                 |
| 1261  | 400      | Prompt 超长                                                                                                     |
| 1301  | 400      | 系统检测到输入或生成内容可能包含不安全或敏感内容，请您避免输入易产生敏感内容的提示语，感谢您的配合                                                             |
| 1302  | 429      | 您的账户已达到速率限制，请您控制请求频率                                                                                          |
| 1305  | 429      | 该模型当前访问量过大，请您稍后再试                                                                                             |
| 1308  | 429      | 已达到 `${number} ${unit}` 的使用上限。您的限额将在 `${next_flush_time}` 重置                                                  |
| 1309  | 429      | 您的 GLM Coding Plan 套餐已到期，暂无法使用，前往官方续订后即可恢复 [https://bigmodel.cn/claude-code](https://bigmodel.cn/claude-code) |
| 1310  | 429      | 您已达到每周/每月使用上限，您的限额将在 `${next_flush_time}` 重置                                                                  |
| 1311  | 429      | 当前订阅套餐暂未开放`${model_name}`权限                                                                                   |
| 1313  | 429      | 您的账户当前使用模式不符合公平使用策略，请求频率已受到限制。详情请参阅《条款与协议-订阅及自动续费协议》，如需恢复请前往个人中心-编程套餐总览-顶部申请解除限制                              |
| 1314  | 429      | 您的企业套餐已失效，请联系企业管理员。                                                                                           |
| 1315  | 429      | 该 API Key 仅限企业编程套餐场景使用，请到官网更换对应产品类型的 API Key                                                                  |
| 1316  | 429      | 已达到 5 小时使用上限。主账号余额不足，无法使用超额按量付费。您的限额将在 `{next_flush_time}` 重置。                                                |
| 1317  | 429      | 已达到 7 天使用上限。主账号余额不足，无法使用超额按量付费。您的限额将在 `{next_flush_time}` 重置。                                                 |
| 1318  | 429      | 已达到 5 小时使用上限，且已达子账号月消费上限，无法使用超额按量付费，请联系管理员调整。您的限额将在 `{next_flush_time}` 重置。                                   |
| 1319  | 429      | 已达到 7 天使用上限，且已达子账号月消费上限，无法使用超额按量付费，请联系管理员调整。您的限额将在 `{next_flush_time}` 重置。                                    |
| 1320  | 429      | 已达到 5 小时使用上限，且已达企业级月消费上限，无法使用超额按量付费，请联系管理员调整。您的限额将在 `{next_flush_time}` 重置。                                   |
| 1321  | 429      | 已达到 7 天使用上限，且已达企业级月消费上限，无法使用超额按量付费，请联系管理员调整。您的限额将在 `{next_flush_time}` 重置。                                    |

## 错误响应示例

以下是 curl 请求的响应报文，其中 401 是 HTTP 状态码，1001 是业务错误码。

```
* We are completely uploaded and fine
< HTTP/2 401
< date: Wed, 20 Mar 2024 03:06:05 GMT
< content-type: application/json
< set-cookie: acw_tc=76b20****a0e42;path=/;HttpOnly;Max-Age=1800
< server: nginx/1.21.6
< vary: Origin
< vary: Access-Control-Request-Method
< vary: Access-Control-Request-Headers
<
* Connection #0 to host open.bigmodel.cn left intact
{"error":{"code":"1001","message":"Header 中未收到 Authentication 参数，无法进行身份验证"}}
```

> **注：** 使用流式（SSE）调用时，如果 API 在推理过程中异常终止，不会返回上述错误码，而是在响应体的 `finish_reason` 参数中返回异常原因，详情请参考 `finish_reason` 的参数说明。
