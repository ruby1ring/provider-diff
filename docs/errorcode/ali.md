# 阿里云百炼 — LLM / VLM 错误码

> **范围：** 文本生成、对话、思考模式、Function Calling、千问 VL/Omni 多模态理解、Qwen-Long 文件对话、OpenAI 兼容 Batch。
> **Last verified:** 2026-06-25 against [官方错误码文档](https://help.aliyun.com/zh/model-studio/error-code).
> **完整 FAQ（含语音/生图/生视频等）：** [archive/ali-errorcode-raw.md](archive/ali-errorcode-raw.md)

调用阿里云百炼 OpenAI 兼容接口时，失败响应常见 **OpenAI-like** `error` 对象：`error.message`、`error.type`、`error.code`（`type` 与 `code` 常为相同 PascalCase 字符串，如 `InvalidParameter`、`Arrearage`）。

## 错误响应示例

```json
{
  "error": {
    "message": "Access denied, please make sure your account is in good standing.",
    "type": "Arrearage",
    "code": "Arrearage",
    "param": null
  }
}
```

## HTTP 状态码速查

| HTTP | 说明 |
| --- | --- |
| 400 | 参数无效、内容审核、部分欠费场景（文档亦见 `400-Arrearage`） |
| 401 | API Key 无效、业务空间/Token 鉴权失败 |
| 403 | 权限不足、欠费、模型未开通、免费额度策略 |
| 404 | 模型不存在或不支持当前协议 |
| 409 | 资源冲突（如部署实例重名，LLM 场景较少见） |
| 429 | 请求限流、配额耗尽、Coding Plan 额度 |
| 500 | 内部错误、推理超时、算法异常 |
| 503 | 模型不可用、容量饱和 |

## 网关通用错误（按 type / code）

| HTTP | type / code | 代表 message | 备注 |
| --- | --- | --- | --- |
| 400 | `APIConnectionError` | Connection error. | 网关通用 |
| 400 | `Arrearage` | Access denied, please make sure your account is in good standing. | 网关通用 |
| 400 | `DataInspectionFailed` | Input or output data may contain inappropriate content. | 网关通用 |
| 401 | `invalid access token or token expired` | invalid access token or token expired. | 网关通用 |
| 401 | `InvalidApiKey` | Invalid API-key provided. | 网关通用 |
| 401 | `NOT AUTHORIZED` | Access denied: workspace not authorized or endpoint misconfigured. | 网关通用 |
| 403 | `AccessDenied` | Access denied. | 网关通用 |
| 403 | `AccessDenied.Unpurchased` | Access to model denied. Please make sure you are eligible for using the model. | 网关通用 |
| 403 | `AllocationQuota.FreeTierOnly` | The free tier of the model has been exhausted. | 网关通用 |
| 403 | `App.AccessDenied` | App access denied. | 网关通用 |
| 403 | `Endpoint.AccessDenied` | Workspace endpoint access denied. | 网关通用 |
| 403 | `Model.AccessDenied` | Model access denied. | 网关通用 |
| 403 | `Workspace.AccessDenied` | Workspace access denied. | 网关通用 |
| 404 | `model_not_supported` | Unsupported model for OpenAI compatibility mode. | 网关通用 |
| 404 | `ModelNotFound` | The model does not exist or you do not have access to it. | 网关通用 |
| 404 | `NotFound` | Not found! | 网关通用 |
| 404 | `WorkSpaceNotFound` | WorkSpace can not be found. | 网关通用 |
| 429 | `Throttling` | Requests throttling triggered. | 网关通用 |
| 429 | `Throttling.AllocationQuota` | Allocated quota exceeded, please increase your quota limit. | 网关通用 |
| 429 | `Throttling.AllocationQuota/insufficient_quota` | Allocated quota exceeded, please increase your quota limit./ You exceeded your current quota, please check your plan and… | 网关通用 |
| 429 | `Throttling.BurstRate` | Request rate increased too quickly. | 网关通用 |
| 429 | `Throttling.RateQuota` | Requests rate limit exceeded, please try again later. | 网关通用 |
| 429 | `Throttling.RateQuota/LimitRequests/limit_requests` | You have exceeded your request limit./Requests rate limit exceeded, please try again later. | 网关通用 |
| 500 | `InternalError` | An internal error has occured, please try again later. | 网关通用 |
| 500 | `InternalError.Algo` | inference internal error. | 网关通用 |
| 500 | `InternalError.Timeout` | An internal timeout error has occured during execution. | 网关通用 |
| 500 | `RequestTimeOut` | Request timed out, please try again later. | 网关通用 |
| 503 | `ModelServingError` | Too many requests. Your requests are being throttled due to system capacity limits. | 网关通用 |
| 503 | `ModelUnavailable` | Model is unavailable, please try again later. | 网关通用 |

## LLM 参数与协议错误

| HTTP | type / code | 代表 message | 备注 |
| --- | --- | --- | --- |
| 400 | `InvalidParameter` | Invalid parameter value | 见下方附录；message 因参数而异 |
| 400 | `invalid_request_error` | you must provide a model parameter | OpenAI 兼容形态 |
| 400 | `InvalidParameter.NotSupportEnableThinking` | The model does not support enable_thinking | 思考模式 |
| 400 | `BadRequest.EmptyInput` | Required input parameter missing from request. |  |
| 400 | `BadRequest.EmptyModel` | Required parameter "model" missing from request. |  |
| 400 | `BadRequest.EmptyParameters` | Required parameter "parameters" missing from request. |  |
| 400 | `BadRequest.IllegalInput` | The input parameter requires json format. |  |
| 400 | `BadRequest.InputDownloadFailed` | Failed to download the input file: xxx. |  |
| 400 | `BadRequest.ResourceNotExist` | The Required resource not exist. |  |
| 400 | `BadRequest.TooLarge` | Payload Too Large. |  |
| 400 | `BadRequestException` | Invalid part type. |  |
| 400 | `invalid_request_error` | you must provide a model parameter. |  |
| 400 | `invalid_request_error-invalid_value` | -1 is lesser than the minimum of 0 - 'seed' |  |
| 400 | `invalid_value` | The requested voice 'xxx' is not supported. |  |
| 400 | `InvalidParameter.NotSupportEnableThinking` | The model does not support enable_thinking. |  |
| 400 | `ServiceUnavailableError` | Role must be user or assistant and Content length must be greater than 0. |  |
| 400 | `Throttling.AllocationQuota` | 您当前的配额为xxx |  |


## VLM / 多模态输入错误

| HTTP | type / code | 代表 message | 备注 |
| --- | --- | --- | --- |
| 400 | `InvalidParameter.DataInspection` | Unable to download the media resource during the data inspection process. | 多模态输入 |
| 400 | `InvalidURL` | Required URL is missing or invalid, please check the request URL. | 多模态输入 |
| 400 | `InvalidURL` | The request URL is invalid, make sure the url is correct and is an image. | 多模态输入 |
| 400 | `InvalidURL` | The input audio is longer than xxs. | 多模态输入 |
| 400 | `InvalidURL` | File size is larger than 15MB. | 多模态输入 |
| 400 | `InvalidURL` | File type is not supported. Allowed types are: .wav, .mp3. | 多模态输入 |
| 400 | `InvalidURL` | The request URL is invalid, please check the request URL is available and the request image format is one of the followi… | 多模态输入 |
| 400 | `InvalidURL.ConnectionRefused` | Connection to xxx refused, please provide available URL. | 多模态输入 |
| 400 | `InvalidURL.Timeout` | Download xxx timeout, please check network connection. | 多模态输入 |
| 500 | `InternalError.Algo` | Missing Content-Length of multimodal url. | 多模态输入 |

## 附录：InvalidParameter message 变体（LLM / VLM）

官方将大量参数校验错误统一为 `InvalidParameter`；网关适配时可按 `error.message` 细分。

| type / code | message（节选） |
| --- | --- |
| `InvalidParameter` | parameter.enable_thinking must be set to false for non-streaming calls |
| `InvalidParameter` | The thinking_budget parameter must be a positive integer and not greater than xxx |
| `InvalidParameter` | This model only support stream mode, please enable the stream parameter to access the model. / curre… |
| `InvalidParameter` | This model does not support enable_search. |
| `InvalidParameter` | 暂时不支持当前设置的语种！ |
| `InvalidParameter` | The incremental_output parameter must be "true" when enable_thinking is true |
| `InvalidParameter` | The incremental_output parameter of this model cannot be set to False. |
| `InvalidParameter` | Range of input length should be [1, xxx] |
| `InvalidParameter` | Range of max_tokens should be [1, xxx] |
| `InvalidParameter` | Temperature should be in [0.0, 2.0)/'temperature' must be Float |
| `InvalidParameter` | Range of top_p should be (0.0, 1.0]/'top_p' must be Float |
| `InvalidParameter` | Parameter top_k be greater than or equal to 0 |
| `InvalidParameter` | Repetition_penalty should be greater than 0.0 |
| `InvalidParameter` | Presence_penalty should be in [-2.0, 2.0] |
| `InvalidParameter` | Range of n should be [1, 4] |
| `InvalidParameter` | Range of seed should be [0, 9223372036854775807] |
| `InvalidParameter` | Request method 'GET' is not supported. |
| `InvalidParameter` | messages with role "tool" must be a response to a preceeding message with "tool_calls" |
| `InvalidParameter` | Required body invalid, please check the request body format. |
| `InvalidParameter` | input content must be a string. |
| `InvalidParameter` | The content field is a required field. |
| `InvalidParameter` | 'messages' must contain the word 'json' in some form, to use 'response_format' of type 'json_object'… |
| `InvalidParameter` | Json mode response is not supported when enable_thinking is true |
| `InvalidParameter` | Tool names are not allowed to be [search] |
| `InvalidParameter` | Unknown format of response_format, response_format should be a dict, includes 'type' and an optional… |
| `InvalidParameter` | The value of the enable_thinking parameter is restricted to True. |
| `InvalidParameter` | 'audio' output only support with stream=true |
| `InvalidParameter` | tool_choice is one of the strings that should be ["none", "auto"] |
| `InvalidParameter` | Model not exist. |
| `InvalidParameter` | The audio is empty |
| `InvalidParameter` | File parsing in progress, please try again later. |
| `InvalidParameter` | The "stop" parameter must be of type "str", "list[str]", "list[int]", or "list[list[int]]", and all … |
| `InvalidParameter` | Value error, batch size is invalid, it should not be larger than xxx. |
| `InvalidParameter` | Invalid file [id:file-fe-\*\*\*\*\*\*\*\*\*\*]. |
| `InvalidParameter` | [] is too short |
| `InvalidParameter` | The tool call is not supported. |
| `InvalidParameter` | Repetitive tool calls detected in the conversation history. The same tool call with identical name a… |
| `InvalidParameter` | Required parameter(xxx) missing or invalid, please check the request parameters. |
| `InvalidParameter` | The provided URL does not appear to be valid. Ensure it is correctly formatted. |
| `InvalidParameter` | Input should be a valid dictionary or instance of GPT3Message |
| `InvalidParameter` | Value error, contents is neither str nor list of str. |
| `InvalidParameter` | File [id:file-fe-xxx] format is not supported. |
| `InvalidParameter` | File [id:file-fe-\*\*\*\*\*\*\*\*\*\*] cannot be found. |
| `InvalidParameter` | Too many files provided. |
| `InvalidParameter` | File [id:file-fe-\*\*\*\*\*\*\*\*\*\*] exceeds size limit. |
| `InvalidParameter` | File [id:file-fe-\*\*\*\*\*\*\*\*\*\*] exceeds page limits (15000 pages). |
| `InvalidParameter` | File [id:file-fe-\*\*\*\*\*\*\*\*\*\*] content blank. |
| `InvalidParameter` | Total message token length exceed model limit (10000000 tokens). |
| `InvalidParameter` | Exceeded limit on max bytes per data-uri item : 10485760'. / Multimodal file size is too large |
| `InvalidParameter` | Input should be 'Cherry', 'Serena', 'Ethan' or 'Chelsie': parameters.audio.voice |
| `InvalidParameter` | The image length and width do not meet the model restrictions. |
| `InvalidParameter` | Failed to decode the image during the data inspection. |
| `InvalidParameter` | The file format is illegal and cannot be opened. / The audio format is illegal and cannot be opened.… |
| `InvalidParameter` | The input messages do not contain elements with the role of user. |
| `InvalidParameter` | Failed to download multimodal content. / |
| `InvalidParameter` | Failed to find the requested media resource during the data inspection process. |
| `InvalidParameter` | url error, please check url！ |
| `InvalidParameter` | Don't have authorization to access the media resource during the data inspection process. |
| `InvalidParameter` | The item of content should be a message of a certain modal. |
| `InvalidParameter` | Invalid video file. |
| `InvalidParameter` | The video modality input does not meet the requirements because: The video file is too long. |
| `InvalidParameter` | Field required: xxx |
| `InvalidParameter` | The request is missing required parameters or in a wrong format, please check the parameters that yo… |
| `InvalidParameter` | Missing training files. |
| `InvalidParameter` | The style is invalid. |
| `InvalidParameter` | The style_level is invalid. |
| `InvalidParameter` | the xxx parm is invalid! |
| `InvalidParameter` | input json error. |
| `InvalidParameter` | read image error. |
| `InvalidParameter` | the parameters must conform to the specification: xxx. |
| `InvalidParameter` | The size of person image and coarse_image are not the same. |
| `InvalidParameter` | The request is missing required parameters or the parameters are out of the specified range, please … |
| `InvalidParameter` | image format error |
| `InvalidParameter` | No messages found in input |
| `InvalidParameter` | Invalid image format or corrupted file |
| `InvalidParameter` | download image failed |
| `InvalidParameter` | messages length only support 1 |
| `InvalidParameter` | content length only support 2 |
| `InvalidParameter` | lack of image or text |
| `InvalidParameter` | Input files format not supported. |
| `InvalidParameter` | Failed to download input files. |
| `InvalidParameter` | oss download error. |
| `InvalidParameter` | The image content does not comply with green network verification. |
| `InvalidParameter` | read video error. |
| `InvalidParameter` | the size of input image is too small or too large. |
| `InvalidParameter` | The request parameter is invalid, please check the request parameter. |
| `InvalidParameter` | The type or value of {parameter} is out of definition. |
| `InvalidParameter` | The request parameter is invalid, please check the request parameter. |
| `InvalidParameter` | request timeout after 23 seconds. |
| `InvalidParameter` | Please ensure input text is valid. |
| `InvalidParameter` | [tts:]Engine return error code: 418 |
| `InvalidParameter` | Request voice is invalid! |
| `InvalidParameter` | check input data style. |
| `InvalidParameter` | An error during model pre-process. |
| `InvalidParameter` | The image size is not supported for the data inspection. |
| `InvalidParameter` | Field required: image_url |
| `InvalidParameter` | Text request limit violated, expected 1. |
| `InvalidParameter` | [tts:]Engine return error code: 428 |

## 附录：未纳入范围

以下能力错误保留在 [archive/ali-errorcode-raw.md](archive/ali-errorcode-raw.md)，不在本表维护：

- 语音合成 / 识别（CosyVoice、Paraformer、Qwen-TTS 等）
- 生图、生视频、数字人、试衣等垂直 API
- WebSocket 协议层与 SDK 客户端异常（非 HTTP `error` 对象）
- 知识库管理 API（CreateIndex 等）

结构化种子数据：`ali-llm-vlm.seed.json`（由 `scripts/normalize-errorcode-docs.mjs` 生成）。
