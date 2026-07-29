# 百度千帆

> 🔗 原文链接： [错误码说明-百度千帆 ModelBuilder v2](https://cloud.baidu.com/doc/qianfan-api/s/Om9b4yj3w)

> ⏰ 对照时间：2026-07-29 (UTC+8)

本文列举您调用百度千帆 ModelBuilder v2 OpenAI 兼容接口可能遇到的错误码信息。

错误响应以 JSON 格式返回，主体结构为：

```json
{
  "error": {
    "code": "malformed_json",
    "message": "Invalid Argument",
    "type": "invalid_request_error"
  },
  "id": "as-****xi6mm8"
}
```

字段含义：

| 字段 | 类型 | 说明 |
|---|---|---|
| `code` | string | 错误码（机器可读子码） |
| `message` | string | 错误描述信息，帮助理解和解决发生的错误 |
| `type` | string | 错误描述类型（如 invalid_request_error、rate_limit_exceeded） |
| `id` | string | 请求 ID |

#### 推理服务错误码

| HTTP 状态码 | 错误码 Code | 错误类型 Type | 错误信息 Message | 含义 |
|---|---|---|---|---|
| 400 | malformed_json | invalid_request_error | Invalid Argument | 入参格式有误，不是标准 json 格式 |
| 400 | invalid_model | invalid_request_error | model is empty | 未指定 model 参数 |
| 400 | invalid_messages | invalid_request_error | 返回的具体错误信息 | message 格式不符合规范，message 中有详细说明 |
| 400 | characters_too_long | invalid_request_error | the max input characters is xxx | 请求长度超过最大字符限制，建议缩短输入 |
| 400 | tokens_too_long | invalid_request_error | Prompt tokens too long | 请求内容超过大模型内部限制，建议缩短输入 |
| 400 | invalid_argument | invalid_request_error | 返回的具体错误信息 | 请参考返回的错误信息 |
| 400 | invalid_image_generation_prompt | invalid_request_error | prompt is invalid, please check parameter | prompt 不合法 |
| 400 | invalid_image_generation_refer_image | invalid_request_error | refer image is invalid, please check parameter | 传入的参考图不合法 |
| 400 | invalid_image_url | invalid_request_error | the image width and height are not within the allowed range | 图像尺寸超出限制范围（需小于 6000px×6000px，最短边不低于 5px） |
| 400 | invalid_plugin_argument | invalid_request_error | 返回的具体错误信息 | 插件服务报错，请参考返回的错误信息 |
| 400 | image_url_unsafe | unsafe_request | the content of image_url.url field is unsafe | image_url 内容不合法；如未解决建议提交工单 |
| 401 | no_parameter_permission | access_denied | 返回的具体错误信息 | 请参考返回的错误信息 |
| 401 | invalid_model | invalid_request_error | The model does not exist or you do not have access to it. | 模型不存在或用户无权限 |
| 401 | invalid_appid | invalid_request_error | No permission to use the appid | appid 鉴权失败，用户无使用该 appid 的权限 |
| 401 | invalid_iam_token | invalid_request_error | IAM Certification failed | iam 鉴权失败，bearer token 无效/过期，或请求 Authorization 未加 Bearer |
| 403 | system_unsafe | unsafe_request | the content of system field is invalid | system 字段内容不安全 |
| 403 | user_setting_unsafe | unsafe_request | the content of user field is invalid | user_setting 内容不合法 |
| 403 | functions_unsafe | unsafe_request | the content of functions field is invalid | function 内容不合法 |
| 403 | account_overdue | access_denied | Access denied due to overdue account | 账号已欠费（余额 <0），需充值后继续调用 |
| 403 | model_offline | access_denied | The model is offline | 请求模型已下线 |
| 405 | method_not_supported | invalid_request_error | Only POST requests are accepted | 此接口只支持 POST 请求 |
| 429 | rpm_rate_limit_exceeded | rate_limit_exceeded | Rate limit reached for RPM | Cloud ID 下 RPM 超限额 |
| 429 | tpm_rate_limit_exceeded | rate_limit_exceeded | Rate limit reached for TPM | Cloud ID 下 TPM 超限额 |
| 429 | input_tpm_rate_limit_exceeded | rate_limit_exceeded | Rate limit reached for Input TPM | Cloud ID 下输入 TPM 超限额 |
| 429 | output_tpm_rate_limit_exceeded | rate_limit_exceeded | Rate limit reached for Output TPM | Cloud ID 下输出 TPM 超限额 |
| 429 | Offline_batch_reasoning_refused | rate_limit_exceeded | Rate limit reached for offline batch reasoning | 批推流量被拒绝，请稍后重试 |
| 429 | preemptible_rate_limit_exceeded | rate_limit_exceeded | Rate limit reached for preemptible resource | 混抢资源 QPS 超限（含可抢占接口、离线推理、离线评估请求） |
| 429 | user_rate_limit_exceeded | rate_limit_exceeded | qps request limit by APP ID reached | 【用户配额超限】QPS 超限额 |
| 429 | cluster_rate_limit_exceeded | rate_limit_exceeded | request limit by resouce cluster reached | 集群 QPS 超限额 |
| 429 | cluster_rpm_rate_limit_exceeded | rate_limit_exceeded | Rate limit reached for Cluster RPM | 集群 RPM 超限额 |
| 429 | cluster_tpm_rate_limit_exceeded | rate_limit_exceeded | Rate limit reached for Cluster TPM | 集群 TPM 超限额 |
| 500 | internal_error | Internal_error | Internal error | 【系统内部错误】请稍后重试 |
| 500 | dispatch_internal_error | Internal_error | Internal error | 【系统内部错误】请稍后重试 |
| 500 | image_generation_interal_error | Internal_error | image generation service interal error | 文生图服务内部错误 |

#### 安全审核类错误

安全审核类错误统一使用 `type: unsafe_request`，具体见上表 400/403 中 `image_url_unsafe`、`system_unsafe`、`user_setting_unsafe`、`functions_unsafe`。文档未提及 `flag`/`ban_round` 等错误码。

> 注：错误响应 `type` 字段取值含 `invalid_request_error`、`unsafe_request`、`access_denied`、`rate_limit_exceeded`、`Internal_error`。`Internal_error` 为文档原文大小写（首字母大写 I），与 OpenAI 常见 `server_error` 命名不同。
