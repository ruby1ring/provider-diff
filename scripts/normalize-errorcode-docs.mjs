#!/usr/bin/env node
/**
 * Normalize Alibaba Bailian error FAQ into LLM/VLM structured docs + seed JSON.
 * Run: node scripts/normalize-errorcode-docs.mjs
 */
import fs from "fs";
import path from "path";

const ROOT = path.resolve(import.meta.dirname, "..");
const ERROR_DOCS = path.join(ROOT, "docs", "errorcode");
const ARCHIVE = path.join(ERROR_DOCS, "archive");
const RAW_NAME = "ali-errorcode-raw.md";
const RAW_PATH = path.join(ARCHIVE, RAW_NAME);
const SEED_PATH = path.join(ERROR_DOCS, "ali-llm-vlm.seed.json");
const EXCLUDED_PATH = path.join(ERROR_DOCS, "ali-excluded.json");
const OUT_MD = path.join(ERROR_DOCS, "ali.md");
const OFFICIAL_URL = "https://help.aliyun.com/zh/model-studio/error-code";
const VERIFIED = "2026-06-25";

function read(p) {
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "";
}

function write(p, content) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content.trimEnd() + "\n");
}

function cleanFeishuClip(text) {
  return text
    .replace(/\\-/g, "-")
    .replace(/\\_/g, "_")
    .replace(/\\\./g, ".")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\[/g, "[")
    .replace(/\\\]/g, "]")
    .replace(/<br>/g, " ")
    .replace(/\*\*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function stripHeadingMarks(line) {
  return cleanFeishuClip(line.replace(/^#+\s*/, "").replace(/^\*\*|\*\*$/g, ""));
}

const EXCLUDED_SECTION_PATTERNS = [
  /^SDK 报错$/i,
  /^NetworkError$/i,
  /^WebSocket 报错$/i,
  /^使用阿里云 AI 助理$/,
  /^mismatched_model$/,
  /^duplicate_custom_id$/
];

const EXCLUDED_TYPE_PREFIXES = [
  "InvalidFile.",
  "InvalidFile",
  "Audio.",
  "430-Audio"
];

const EXCLUDED_TYPE_EXACT = new Set([
  "InvalidGarment",
  "InvalidSchema",
  "InvalidSchemaFormat",
  "FlowNotPublished",
  "FaqRuleBlocked",
  "ClientDisconnect",
  "IPInfringementSuspect",
  "UnsupportedOperation",
  "CustomRoleBlocked",
  "InvalidPerson",
  "InvalidInputLength",
  "InvalidImage.FileFormat",
  "InvalidImage.ImageSize",
  "InvalidImage.NoHumanFace",
  "InvalidImageResolution",
  "InvalidImageFormat",
  "Conflict",
  "CommodityNotPurchased",
  "PrepaidBillOverdue",
  "PostpaidBillOverdue",
  "InvokePluginFailed",
  "AppProcessFailed",
  "RewriteFailed",
  "RetrivalFailed",
  "ResponseTimeout",
  "SystemError",
  "ModelServiceFailed",
  "InternalError.FileUpload",
  "InternalError.Upload",
  "BailianGateway.Workspace.NotAuthorised"
]);

const EXCLUDED_KEYWORDS = [
  "cosyvoice",
  "paraformer",
  "sambert",
  "qwen-tts",
  "fun-music",
  "emoji",
  "emo ",
  "liveportrait",
  "videoretalk",
  "试衣",
  "text2sql",
  "声音复刻",
  "语音识别",
  "语音合成",
  "录音文件识别",
  "websocket",
  "万相",
  "image edit",
  "图像编辑",
  "num_images_per_prompt",
  "clothes_type",
  "driven_id",
  "ext_bbox",
  "video_ratio",
  "ref_images_url",
  "createindex",
  "data_sources",
  "submitindexjob",
  "input must contain file_urls",
  "lyrics content is illegal",
  "at least one of 'lyrics'"
];

const VLM_TYPE_PATTERNS = [
  /^InvalidURL/i,
  /^InvalidImage/i,
  /^InvalidParameter\.DataInspection$/,
  "InvalidParameter.DataInspection",
  "multimodal",
  "image length and width",
  "video modality",
  "multimodal file size",
  "failed to decode the image",
  "failed to download multimodal",
  "content-type of multimodal",
  "missing content-length of multimodal",
  "the provided url does not appear",
  "exceeded limit on max bytes per data-uri",
  "wrong content-type of multimodal"
];

const GATEWAY_HTTP = new Set([401, 403, 404, 409, 429, 500, 503]);

function parseSectionHeader(line) {
  const m = line.match(/^##\s+\*\*(.+?)\*?\*?\s*$/);
  if (!m) return null;
  let raw = m[1].replace(/\*+$/g, "").trim();
  raw = cleanFeishuClip(raw);
  if (EXCLUDED_SECTION_PATTERNS.some((p) => p.test(raw))) {
    return { kind: "meta", title: raw };
  }
  const multiHttp = raw.match(/^(\d{3})\/(\d{3})-(.+)$/);
  if (multiHttp) {
    return {
      kind: "error",
      http: Number(multiHttp[2]),
      nativeType: multiHttp[3].replace(/^\*\*?/, "").trim(),
      nativeCode: multiHttp[3].replace(/^\*\*?/, "").trim(),
      sectionTitle: raw
    };
  }
  const httpMatch = raw.match(/^(\d{3})-(.+)$/);
  if (!httpMatch) return { kind: "meta", title: raw };
  let http = Number(httpMatch[1]);
  let typePart = httpMatch[2].replace(/^\*\*?/, "").trim();
  const slash = typePart.indexOf("/");
  if (slash > 0 && !typePart.includes(".")) {
    typePart = typePart.slice(0, slash).trim();
  }
  return { kind: "error", http, nativeType: typePart, nativeCode: typePart, sectionTitle: raw };
}

function parseMessageHeading(line) {
  const m = line.match(/^###\s+\*\*(.+?)\*\*/);
  if (!m) return null;
  return cleanFeishuClip(m[1]);
}

function isExcludedSection(title, nativeType, message) {
  if (EXCLUDED_SECTION_PATTERNS.some((p) => p.test(title))) return true;
  const typeLower = (nativeType || "").toLowerCase();
  const msgLower = (message || "").toLowerCase();
  const blob = `${typeLower} ${msgLower} ${title}`.toLowerCase();
  if (nativeType && EXCLUDED_TYPE_EXACT.has(nativeType)) return true;
  if (nativeType && EXCLUDED_TYPE_PREFIXES.some((p) => nativeType.startsWith(p) || typeLower.includes(p.toLowerCase()))) {
    return true;
  }
  if (EXCLUDED_KEYWORDS.some((k) => blob.includes(k))) return true;
  if (/invalidfile|invalid person|first frame of input video|video file size|face not match|driven_id|garment|emoji|emo api|liveportrait|videoretalk/.test(blob)) {
    return true;
  }
  if (nativeType === "Throttling.AllocationQuota" && /voice|热词|音色/.test(blob)) return true;
  if (/BadRequest\.(Voice|UnsupportedFile)|Audio\./.test(nativeType || "")) return true;
  return false;
}

function classify(nativeType, http, message, sectionTitle) {
  if (isExcludedSection(sectionTitle || "", nativeType, message)) return "excluded";
  const blob = `${nativeType} ${message}`.toLowerCase();
  if (VLM_TYPE_PATTERNS.some((p) => (typeof p === "string" ? blob.includes(p) : p.test(nativeType)))) {
    return "vlm";
  }
  if (GATEWAY_HTTP.has(http) && nativeType && !nativeType.startsWith("InvalidParameter")) {
    const gatewayTypes = [
      "InvalidApiKey", "NOT AUTHORIZED", "AccessDenied", "Model.AccessDenied",
      "Workspace.AccessDenied", "App.AccessDenied", "Endpoint.AccessDenied",
      "AccessDenied.Unpurchased", "AllocationQuota", "ModelNotFound",
      "model_not_supported", "WorkSpaceNotFound", "NotFound", "Throttling",
      "Throttling.RateQuota", "Throttling.BurstRate", "Throttling.AllocationQuota",
      "InternalError", "ModelServingError", "ModelUnavailable", "RequestTimeOut",
      "InternalError.Timeout", "InternalError.Algo", "Arrearage", "DataInspectionFailed",
      "data_inspection_failed", "APIConnectionError", "invalid access token"
    ];
    if (gatewayTypes.some((t) => nativeType.includes(t) || nativeType === t)) return "gateway";
  }
  if (http >= 401 && http <= 503 && !nativeType.startsWith("InvalidParameter")) {
    if (/access denied|throttl|not found|internal error|timeout|arrearage|quota/i.test(blob)) {
      return "gateway";
    }
  }
  return "llm";
}

function parseRawMarkdown(text) {
  const lines = text.split("\n");
  const records = [];
  let current = null;
  let pendingMessages = [];

  function flushMessages() {
    if (!current || current.kind !== "error") return;
    const messages = pendingMessages.length ? pendingMessages : [current.representativeMessage || ""];
    for (const message of messages) {
      if (!message) continue;
      const category = classify(current.nativeType, current.http, message, current.sectionTitle);
      records.push({
        http: current.http,
        nativeType: current.nativeType,
        nativeCode: current.nativeCode,
        message,
        messagePattern: message,
        category,
        sectionTitle: current.sectionTitle
      });
    }
    pendingMessages = [];
  }

  for (const line of lines) {
    const section = parseSectionHeader(line);
    if (section) {
      flushMessages();
      current = section;
      if (section.kind === "error") {
        pendingMessages = [];
      }
      continue;
    }
    const msg = parseMessageHeading(line);
    if (msg && current?.kind === "error") {
      pendingMessages.push(msg);
      continue;
    }
  }
  flushMessages();
  return records;
}

function dedupeGateway(records) {
  const seen = new Map();
  const out = [];
  for (const r of records) {
    if (r.category === "llm" && r.nativeType === "InvalidParameter") {
      out.push(r);
      continue;
    }
    const key = `${r.category}:${r.http}:${r.nativeType}:${r.message.slice(0, 80)}`;
    if (seen.has(key)) continue;
    seen.set(key, true);
    out.push(r);
  }
  return out;
}

const CURATED_GATEWAY = [
  { http: 400, nativeType: "Arrearage", message: "Access denied, please make sure your account is in good standing." },
  { http: 400, nativeType: "DataInspectionFailed", message: "Input or output data may contain inappropriate content." },
  { http: 400, nativeType: "APIConnectionError", message: "Connection error." },
  { http: 401, nativeType: "InvalidApiKey", message: "Invalid API-key provided." },
  { http: 401, nativeType: "NOT AUTHORIZED", message: "Access denied: workspace not authorized or endpoint misconfigured." },
  { http: 401, nativeType: "invalid access token or token expired", message: "invalid access token or token expired." },
  { http: 403, nativeType: "AccessDenied", message: "Access denied." },
  { http: 403, nativeType: "AccessDenied.Unpurchased", message: "Access to model denied. Please make sure you are eligible for using the model." },
  { http: 403, nativeType: "Model.AccessDenied", message: "Model access denied." },
  { http: 403, nativeType: "App.AccessDenied", message: "App access denied." },
  { http: 403, nativeType: "Workspace.AccessDenied", message: "Workspace access denied." },
  { http: 403, nativeType: "Endpoint.AccessDenied", message: "Workspace endpoint access denied." },
  { http: 403, nativeType: "AllocationQuota.FreeTierOnly", message: "The free tier of the model has been exhausted." },
  { http: 404, nativeType: "ModelNotFound", message: "The model does not exist or you do not have access to it." },
  { http: 404, nativeType: "model_not_supported", message: "Unsupported model for OpenAI compatibility mode." },
  { http: 404, nativeType: "WorkSpaceNotFound", message: "WorkSpace can not be found." },
  { http: 404, nativeType: "NotFound", message: "Not found!" },
  { http: 429, nativeType: "Throttling", message: "Requests throttling triggered." },
  { http: 429, nativeType: "Throttling.RateQuota", message: "Requests rate limit exceeded, please try again later." },
  { http: 429, nativeType: "Throttling.BurstRate", message: "Request rate increased too quickly." },
  { http: 429, nativeType: "Throttling.AllocationQuota", message: "Allocated quota exceeded, please increase your quota limit." },
  { http: 500, nativeType: "InternalError", message: "An internal error has occured, please try again later." },
  { http: 500, nativeType: "InternalError.Algo", message: "inference internal error." },
  { http: 500, nativeType: "InternalError.Timeout", message: "An internal timeout error has occured during execution." },
  { http: 500, nativeType: "RequestTimeOut", message: "Request timed out, please try again later." },
  { http: 503, nativeType: "ModelServingError", message: "Too many requests. Your requests are being throttled due to system capacity limits." },
  { http: 503, nativeType: "ModelUnavailable", message: "Model is unavailable, please try again later." }
];

const CURATED_LLM_TYPES = [
  { http: 400, nativeType: "invalid_request_error", message: "you must provide a model parameter." },
  { http: 400, nativeType: "invalid_request_error-invalid_value", message: "-1 is lesser than the minimum of 0 - 'seed'" },
  { http: 400, nativeType: "InvalidParameter.NotSupportEnableThinking", message: "The model does not support enable_thinking." },
  { http: 400, nativeType: "ServiceUnavailableError", message: "Role must be user or assistant and Content length must be greater than 0." }
];

function buildStructuredMarkdown(records) {
  const included = records.filter((r) => r.category !== "excluded");
  const gateway = [...CURATED_GATEWAY];
  const llm = [...CURATED_LLM_TYPES];
  const vlm = [];
  const invalidParamVariants = [];

  const gatewaySeen = new Set(gateway.map((r) => `${r.http}:${r.nativeType}`));
  const llmSeen = new Set(llm.map((r) => `${r.http}:${r.nativeType}`));

  for (const r of included) {
    if (r.nativeType === "InvalidParameter") {
      invalidParamVariants.push(r);
      continue;
    }
    const key = `${r.http}:${r.nativeType}`;
    if (r.category === "gateway" && !gatewaySeen.has(key)) {
      gatewaySeen.add(key);
      gateway.push(r);
    } else if (r.category === "vlm") {
      vlm.push(r);
    } else if (r.category === "llm" && !llmSeen.has(key) && !gatewaySeen.has(key)) {
      llmSeen.add(key);
      llm.push(r);
    }
  }

  const sortByHttpType = (a, b) => a.http - b.http || a.nativeType.localeCompare(b.nativeType);
  gateway.sort(sortByHttpType);
  llm.sort(sortByHttpType);
  vlm.sort(sortByHttpType);

  const tableRow = (r, notes = "") =>
    `| ${r.http} | \`${r.nativeType}\` | ${r.message.replace(/\|/g, "\\|").slice(0, 120)}${r.message.length > 120 ? "…" : ""} | ${notes} |`;

  const gatewayTable = gateway.map((r) => tableRow(r, "网关通用")).join("\n");
  const llmTable = llm.map((r) => tableRow(r, "")).join("\n");
  const vlmTable = vlm.map((r) => tableRow(r, "多模态输入")).join("\n");

  const variantRows = invalidParamVariants
    .map((r) => `| \`InvalidParameter\` | ${r.message.replace(/\|/g, "\\|").slice(0, 100)}${r.message.length > 100 ? "…" : ""} |`)
    .join("\n");

  return `# 阿里云百炼 — LLM / VLM 错误码

> **范围：** 文本生成、对话、思考模式、Function Calling、千问 VL/Omni 多模态理解、Qwen-Long 文件对话、OpenAI 兼容 Batch。
> **Last verified:** ${VERIFIED} against [官方错误码文档](${OFFICIAL_URL}).
> **完整 FAQ（含语音/生图/生视频等）：** [archive/ali-errorcode-raw.md](archive/ali-errorcode-raw.md)

调用阿里云百炼 OpenAI 兼容接口时，失败响应常见 **OpenAI-like** \`error\` 对象：\`error.message\`、\`error.type\`、\`error.code\`（\`type\` 与 \`code\` 常为相同 PascalCase 字符串，如 \`InvalidParameter\`、\`Arrearage\`）。

## 错误响应示例

\`\`\`json
{
  "error": {
    "message": "Access denied, please make sure your account is in good standing.",
    "type": "Arrearage",
    "code": "Arrearage",
    "param": null
  }
}
\`\`\`

## HTTP 状态码速查

| HTTP | 说明 |
| --- | --- |
| 400 | 参数无效、内容审核、部分欠费场景（文档亦见 \`400-Arrearage\`） |
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
${gatewayTable || "| — | — | — | — |"}

## LLM 参数与协议错误

| HTTP | type / code | 代表 message | 备注 |
| --- | --- | --- | --- |
| 400 | \`InvalidParameter\` | Invalid parameter value | 见下方附录；message 因参数而异 |
| 400 | \`invalid_request_error\` | you must provide a model parameter | OpenAI 兼容形态 |
| 400 | \`InvalidParameter.NotSupportEnableThinking\` | The model does not support enable_thinking | 思考模式 |
${llmTable ? llmTable + "\n" : ""}

## VLM / 多模态输入错误

| HTTP | type / code | 代表 message | 备注 |
| --- | --- | --- | --- |
${vlmTable || "| — | — | — | — |"}

## 附录：InvalidParameter message 变体（LLM / VLM）

官方将大量参数校验错误统一为 \`InvalidParameter\`；网关适配时可按 \`error.message\` 细分。

| type / code | message（节选） |
| --- | --- |
${variantRows || "| — | — |"}

## 附录：未纳入范围

以下能力错误保留在 [archive/ali-errorcode-raw.md](archive/ali-errorcode-raw.md)，不在本表维护：

- 语音合成 / 识别（CosyVoice、Paraformer、Qwen-TTS 等）
- 生图、生视频、数字人、试衣等垂直 API
- WebSocket 协议层与 SDK 客户端异常（非 HTTP \`error\` 对象）
- 知识库管理 API（CreateIndex 等）

结构化种子数据：\`ali-llm-vlm.seed.json\`（由 \`scripts/normalize-errorcode-docs.mjs\` 生成）。
`;
}

function ensureArchive() {
  const src = path.join(ERROR_DOCS, "ali.md");
  fs.mkdirSync(ARCHIVE, { recursive: true });
  if (!fs.existsSync(RAW_PATH)) {
    if (!fs.existsSync(src)) {
      throw new Error(`Missing ${RAW_PATH} and docs/errorcode/ali.md`);
    }
    const raw = read(src);
    if (raw.includes("## **400-InvalidParameter**") && raw.length > 50000) {
      write(RAW_PATH, raw);
      console.log(`Archived → ${RAW_PATH}`);
    }
  }
}

function main() {
  ensureArchive();
  const raw = cleanFeishuClip(read(RAW_PATH));
  const parsed = parseRawMarkdown(read(RAW_PATH));
  const records = dedupeGateway(parsed);

  const included = records.filter((r) => r.category !== "excluded");
  const excluded = records.filter((r) => r.category === "excluded");

  write(SEED_PATH, JSON.stringify({
    generatedAt: new Date().toISOString(),
    scope: "llm-vlm",
    officialUrl: OFFICIAL_URL,
    counts: {
      total: records.length,
      included: included.length,
      excluded: excluded.length,
      gateway: included.filter((r) => r.category === "gateway").length,
      llm: included.filter((r) => r.category === "llm").length,
      vlm: included.filter((r) => r.category === "vlm").length
    },
    records: included
  }, null, 2));

  write(EXCLUDED_PATH, JSON.stringify({
    generatedAt: new Date().toISOString(),
    count: excluded.length,
    records: excluded
  }, null, 2));

  write(OUT_MD, buildStructuredMarkdown(records));

  const counts = {
    total: records.length,
    included: included.length,
    excluded: excluded.length
  };
  console.log("normalize-errorcode-docs:", counts);
  console.log(`  seed → ${SEED_PATH}`);
  console.log(`  excluded → ${EXCLUDED_PATH}`);
  console.log(`  doc  → ${OUT_MD}`);
}

main();
