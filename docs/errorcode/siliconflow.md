# 错误码

调用 SiliconFlow API 时，接收到的响应码由两部分组成：外层是 HTTP 状态码，内层是响应体 JSON 中的业务错误码（`code`）与错误信息（`message`），提供更具体的错误描述。

> 官方说明：[Error Handling - SiliconFlow](https://docs.siliconflow.cn/en/faqs/error-code)

## 错误响应示例

以下是请求失败时的响应报文，其中 400 是 HTTP 状态码，20012 是业务错误码。

```
HTTP/1.1 400 Bad Request
Content-Type: application/json; charset=utf-8

{"code":20012,"message":"Model does not exist. Please check it carefully.","data":null}
```

## 常见 HTTP 状态码速查

| HTTP 状态码 | 说明 |
| --- | --- |
| 400 | 参数错误，请根据 `message` 修正请求参数 |
| 401 | API Key 未正确设置 |
| 403 | 权限不足，常见原因是模型需实名认证 |
| 429 | 触发限流，可能涉及 RPM / RPD / TPM / TPD / IPM / IPD |
| 500 | 服务端未知错误，可稍后重试或联系支持 |
| 503 | 系统负载较高，建议稍后重试或使用流式输出 |
| 504 | 请求超时，建议稍后重试或使用流式输出 |

## 错误列表

### 请求错误

| 错误码 | HTTP 状态码 | 错误名称 | 错误信息 |
| --- | --- | --- | --- |
| 20011 | 400 | `RecordNotFoundErrorCode` | 未找到相关记录，请检查输入是否正确 |
| 20012 | 400 | `ModelNotExistCode` | 所选模型不存在，请重新选择 |
| 20013 | 400 | `ModelRequired` | Model 字段必填 |
| 20014 | 400 | `MessageRequired` | Message 字段必填 |
| 20015 | 400 | `ParamInvalidErrorCode` | 请求参数无效，请检查并重新尝试 |
| 20016 | 400 | `PromptRequired` | Prompt 字段必填 |
| 20017 | 400 | `ImageRequired` | Image 字段必填 |
| 20018 | 400 | `InputRequired` | Input 字段必填 |
| 20019 | 400 | `QueryRequired` | Query 字段必填 |
| 20020 | 400 | `DocumentsRequired` | Documents 字段必填 |
| 20021 | 451 | `NSFWCode` | 内容似乎包含禁止或敏感内容。请调整您的输入并重试 |
| 20022 | 400 | `FileNotFound` | 音频文件获取失败，请检查并重新尝试 |
| 20023 | 400 | `InvalidBase64Content` | 图片编码格式无效，请使用正确的 Base64 编码 |
| 20024 | 400 | `JsonModeNotSupported` | 当前模型不支持 JSON 输出模式 |
| 20025 | 400 | `BadImageSizeType` | 图片尺寸字段格式错误，请使用字符串正确描述图片尺寸（如 "512x512"） |
| 20026 | 400 | `BadImageSizeFormat` | 图片尺寸字段格式错误，请使用字符串正确描述图片尺寸（如 "512x512"） |
| 20027 | 400 | `BadPromptEnhancementType` | 提示增强选项格式错误，请使用正确的布尔值（true 或 false） |
| 20028 | 400 | `BadInferenceStepsValue` | 推理步骤必须是正整数，请重新输入 |
| 20029 | 400 | `MessageFormatInvalid` | 消息格式不正确，仅支持文本或图片 URL |
| 20030 | 400 | `PrefixNotSupported` | 当前模型不支持使用前缀功能 |
| 20031 | 400 | `FimNotSupported` | 当前模型不支持 FIM 填充功能 |
| 20032 | 400 | `FimJsonModeErrCode` | FIM 功能与 JSON 输出模式不兼容，请选择其中一种 |
| 20033 | 400 | `PrefixJsonModeErrCode` | 前缀功能与 JSON 输出模式不兼容，请选择其中一种 |
| 20034 | 400 | `InvalidSeedErrCode` | 随机种子必须是正整数，请重新输入 |
| 20035 | 400 | `InvalidBatchSizeErrCode` | 批处理大小必须是正整数，请重新输入 |
| 20036 | 400 | `StreamingNoTSupportedErrCode` | 当前模型不支持流式输出 |
| 20037 | 400 | `FunctionCallNotSupportedErrCode` | 当前模型不支持工具/函数调用功能 |
| 20038 | 400 | `InvalidImageUrlErrCode` | 无效的图片 URL 或 Base64，请提供可访问的图片 URL 或规范的 Base64 编码图片 |
| 20039 | 400 | `CompletionsNotSupportedErrCode` | 当前模型不支持文本补全功能 |
| 20040 | 400 | `InvalidImageErrCode` | 无效的图片 URL 或 Base64，请提供可访问的图片 URL 或规范的 Base64 编码图片 |
| 20041 | 400 | `NotVLMErrCode` | 所选模型不是 VLM 模型，请使用纯文本 Prompt |
| 20042 | 413 | `EntityTooLargeErrCode` | 请求实体太大 |
| 20043 | 413 | `TooLargeMultiModalPayloadForVLMErrCode` | 图片/音频/视频总大小不能超过 500 MB |
| 20044 | 400 | `InvalidAudioErrCode` | 无效的音频 URL 或 Base64，请提供可访问的音频 URL 或规范的 Base64 编码音频 |
| 20045 | 413 | `TooLargeAudioForTTSErrCode` | 音频总大小不能超过 5MB |
| 20046 | 400 | `NoReferenceAudioForTTSErrCode` | 未找到参考音频 |
| 20047 | 400 | `InvalidVoiceErrCode` | 无效的音色 |
| 20048 | 400 | `InvalidSuffixErrCode` | 无效的自定义名称，仅支持字母、数字、下划线和横杠，不能超过 64 个字符 |
| 20049 | 400 | `InvalidUploadAudioErrCode` | 音频格式必须为 Base64 编码 |
| 20050 | 400 | `TooLargeTextForTTSErrCode` | 文本不能超过 100000 个字符 |
| 20051 | 403 | `NeedRealNameForVoiceCloningErrCode` | 使用"音色克隆"功能须完成实名认证，请认证后重试 |
| 20052 | 400 | `VoiceNotSetErrCode` | 必须设置音色或参考音频 |
| 20053 | 400 | `EitherVoiceOrReferenceErrCode` | 音色和参考音频只能设置其中一个 |
| 20054 | 400 | `InvalidChunkLenForTTSErrCode` | 分块长度必须在 100 到 300 之间 |
| 20055 | 400 | `OnlyBase64ImageSupportedErrCode` | 所选模型不支持通过 URL 方式传入图片，请使用 Base64 方式重试 |
| 20056 | 400 | `BadWorkflowJsonErrCode` | 工作流 JSON 格式无效 |
| 20057 | 400 | `RequestIdRequiredErrCode` | request_id 字段必填 |
| 20058 | 400 | `AsyncNotSupportedErrCode` | 所选模型不支持异步接口 |
| 20059 | 400 | `VoiceNotExistErrCode` | Voice 文件不存在 |
| 20060 | 400 | `InvalidTopKErrCode` | top_k 的合理取值是 -1 或者 [1,100] |
| 20061 | 400 | `InvalidProsodySpeedErrCode` | speed 合理范围是 [0.25, 4] |
| 20062 | 400 | `InvalidProsodyVolumeErrCode` | gain 合理范围是 [-10, 10] |
| 20063 | 404 | `TaskNotExistOrExpiredErrCode` | 任务不存在或已过期 |
| 20064 | 400 | `ImageLoraInvalidErrCode` | lora格式不正确 |
| 20065 | 400 | `ImageLoraUnexpectedCntErrCode` | lora数量必须是[1,3] |
| 20066 | 400 | `NGreaterThan1NotSupportedErrCode` | n 不能大于 1 |
| 20067 | 400 | `UserFileInvalidPurposeErrCode` | 请求参数错误，请检查 purpose 参数并重新尝试 |
| 20068 | 400 | `UserFileInvalidFileErrCode` | 请求参数错误，请检查 file_id 参数并重新尝试 |
| 20069 | 400 | `UserFileOversizeErrCode` | 文件大小超过最大限制 |
| 20070 | 400 | `UserFileUnsupportedFileTypeErrCode` | 文件格式不符合要求，仅支持 jsonl 文件，请检查并重新尝试 |
| 20071 | 400 | `UserFileInvalidLineErrCode` | 数据格式不正确， |
| 20072 | 400 | `UserFileCustomIdRepeatedErrCode` | 数据格式不正确，存在重复的 custom_id： |
| 20073 | 400 | `UserFileEmptyFileErrCode` | 文件为空 |
| 20074 | 400 | `UserFileTooManyLinesErrCode` | 文件行数不能超过6000 |
| 20075 | 400 | `UserFileInvalidLimitErrCode` | 请求参数错误，请检查 limit 参数并重新尝试 |
| 20076 | 400 | `UserFileInvalidAfterErrCode` | 请求参数错误，请检查 after 参数并重新尝试 |
| 20077 | 400 | `UserFileInvalidOrderErrCode` | 请求参数错误，请检查 order 参数并重新尝试 |
| 20078 | 400 | `UserFileInvalidFileIdErrCode` | 请求参数错误，请检查 file_id 参数并重新尝试 |
| 20079 | 400 | `UserFileNotFoundFileErrCode` | 没有获取到要上传的文件，请检查并重新尝试 |
| 20080 | 400 | `UserFileReadFileErrCode` | 文件损坏，请检查并重新尝试 |
| 20081 | 400 | `TooLargeNErrCode` | n 不能大于 20 |
| 20082 | 400 | `FileFormatNotSupportedForTTSCode` | 音频格式不支持，请使用 wav/mp3/pcm/opus 格式的文件 |
| 20083 | 400 | `FileFormatNotSupportedForSTTCode` | 音频格式不支持，请使用 wav/mp3/pcm/opus/webm 格式的文件 |
| 20084 | 400 | `ThinkingBudgetMissingErrCode` | thinking budget 字段必填 |
| 20085 | 400 | `ThinkingTypeInvalidErrCode` | thinking type 字段只能是 enabled 或者 disabled |
| 20086 | 400 | `ThinkingBudgetInvalidErrCode` | thinking budget 必须是正数 |
| 20087 | 400 | `TooLargeBatchFileErrCode` | 批处理文件大小不能超过 1GB |
| 20088 | 400 | `BatchInferenceNotSupportedErrCode` | 该模型不支持批量推理 |
| 20089 | 400 | `InvalidMaxTokensErrCode` | 无效参数 |
| 20090 | 400 | `BailianReqIdNotFoundErrCode` | Req id 没找到 |

### 权限错误

| 错误码 | HTTP 状态码 | 错误名称 | 错误信息 |
| --- | --- | --- | --- |
| 30000 | 403 | `IllegalOperationCode` | 您的操作不被允许，请检查操作是否正确或联系客服 |
| 30001 | 403 | `BalanceNotEnoughCode` | 账户余额不足，请充值后重试 |
| 30002 | 403 | `UserDisableCode` | 您的账户已被禁用，请联系客服 |
| 30003 | 403 | `ModelDisableCode` | 所选模型已下线，请选择其他模型或联系客服 |
| 30004 | 403 | `NotModelOwnerCode` | 您没有权限访问该模型，请确认您的权限或选择其他模型 |
| 30005 | 403 | `NotAuthCode` | 使用此模型须完成实名认证，请先完成认证 |
| 30006 | 403 | `NotRightRole` | 您没有权限访问该模型，请确认您的权限或选择其他模型 |
| 30007 | 403 | `NotRightTier` | 您没有权限访问该模型，请确认您的权限或选择其他模型 |
| 30008 | 403 | `UserNotExistCode` | 用户账户不存在，请检查您的登录信息或注册新账户 |
| 30009 | 403 | `UserNotLoginCode` | 请先登录后再进行操作 |
| 30010 | 403 | `NotOpenYet` | 您没有权限访问该模型，请确认您的权限或选择其他模型 |
| 30011 | 403 | `OnyByChargeBalanceErrCode` | 该模型/服务仅面向已充值、授信的用户或组织，请充值后再试 |
| 30012 | 403 | `UserExpiredCode` | 您的账户已过期，请联系客服 |
| 30013 | 403 | `IPNotAllowedCode` | 您没有权限访问该模型，请确认您的权限或选择其他模型 |
| 50603 | -503 | `EconnoisseurBannedCode` | 系统当前负载较高，请稍后重试 |

### 速率限制

| 错误码 | HTTP 状态码 | 错误名称 | 错误信息 |
| --- | --- | --- | --- |
| 50601 | 429 | `RPMRateLimitCode` | 已达到 RPM（每分钟请求数）限制，请稍后再试 |
| 50602 | 429 | `TPMRateLimitCode` | 已达到 TPM（每分钟消耗 tokens）数限制，请稍后再试 |
| 50604 | 429 | `IPMRateLimitCode` | 已达到 IPM（每分钟生成图片数）限制，请稍后再试 |
| 50605 | 429 | `IPDRateLimitCode` | 已达到 IPD（每天生成图片数）限制，请明天再试 |
| 50606 | 429 | `DeepSeekRPDRateLimitCode` | 未实名认证用户一天内最多访问100次 |
| 50607 | 429 | `RPHRateLimitCode` | 已达到 RPH（每小时请求数）限制，请稍后再试 |
| 50608 | 429 | `RPDRateLimitCode` | 已达到 RPD（每天请求数）限制，请明天再试 |

### 服务错误

| 错误码 | HTTP 状态码 | 错误名称 | 错误信息 |
| --- | --- | --- | --- |
| 50500 | 500 | `ModelServiceErrCode` | 系统出现意外错误，请稍后重试。如果问题持续存在，请联系客户支持 |
| 50501 | 504 | `ModelServiceTimeoutErrCode` | 系统超时，请稍后重试。如果问题持续存在，请联系客户支持 |
| 50502 | 500 | `ComfyUIServiceExecFailedCode` | 系统出现意外错误，请稍后重试。如果问题持续存在，请联系客户支持 |
| 50503 | 500 | `RedisFailedCode` | 系统出现意外错误，请稍后重试。如果问题持续存在，请联系客户支持 |
| 50504 | 504 | `ComfyUIServiceTimeoutCode` | 系统超时，请稍后重试。如果问题持续存在，请联系客户支持 |
| 50505 | 503 | `ModelServiceTooBusyErrCode` | 系统当前负载较高，请稍后重试 |
| 50506 | 504 | `IOTimeoutErrCode` | 系统超时，请稍后重试。如果问题持续存在，请联系客户支持 |
| 50507 | 500 | `ModelServiceInternalErrCode` | 系统出现意外错误，请稍后重试。如果问题持续存在，请联系客户支持 |
| 50508 | 503 | `ModelServiceUnavailableErrCode` | 系统当前负载较高，请稍后重试 |
| 50509 | 504 | `GateWayTimeoutErrCode` | 系统超时，请稍后重试。如果问题持续存在，请联系客户支持 |
| 50510 | 500 | `ModelServiceNotFoundErrCode` | 系统出现意外错误，请稍后重试。如果问题持续存在，请联系客户支持 |
| 60000 | 500 | `ServiceErrCode` | 系统出现意外错误，请稍后重试。如果问题持续存在，请联系客户支持 |
| 60001 | 499 | `ClientClosedConnectionErrorCode` | 连接已关闭 |
| 60002 | 500 | `DBOperationErrorCode` | 系统出现意外错误，请稍后重试。如果问题持续存在，请联系客户支持 |
| 60003 | 500 | `FileIOErrorCode` | 系统出现意外错误，请稍后重试。如果问题持续存在，请联系客户支持 |
| 60004 | 500 | `FileServerErrorCode` | 系统出现意外错误，请稍后重试。如果问题持续存在，请联系客户支持 |
| 60005 | 500 | `CommitSpeechToTextTaskFailedCode` | 系统出现意外错误，请稍后重试。如果问题持续存在，请联系客户支持 |
| 60006 | 500 | `UnmarshalModelServiceRespFailedCode` | 系统出现意外错误，请稍后重试。如果问题持续存在，请联系客户支持 |
| 60007 | 500 | `MarshalModelServiceReqFailedCode` | 系统出现意外错误，请稍后重试。如果问题持续存在，请联系客户支持 |
| 60008 | 500 | `NSFWServiceFailedCode` | 系统出现意外错误，请稍后重试。如果问题持续存在，请联系客户支持 |
| 60009 | 500 | `NoneAvailableInferenceServiceInstancesCode` | 系统出现意外错误，请稍后重试。如果问题持续存在，请联系客户支持 |
| 60010 | 500 | `PriceNotExistCode` | 系统出现意外错误，请稍后重试。如果问题持续存在，请联系客户支持 |
| 60011 | 500 | `UploadFileFailedCode` | 系统出现意外错误，请稍后重试。如果问题持续存在，请联系客户支持 |
| 60013 | 500 | `TokenizerServiceFailedCode` | 系统出现意外错误，请稍后重试。如果问题持续存在，请联系客户支持 |
| 60014 | 500 | `LabelServiceErrorCode` | 系统出现意外错误，请稍后重试。如果问题持续存在，请联系客户支持 |
| 60015 | 500 | `EOSErrCode` | 系统出现意外错误，请稍后重试。如果问题持续存在，请联系客户支持 |

### 成功

| 错误码 | HTTP 状态码 | 错误名称 | 错误信息 |
| --- | --- | --- | --- |
| 20000 | 200 | `OKCode` | Ok |
