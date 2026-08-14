#!/usr/bin/env node
// Noctua CLI — provider-diff V0.1 的 CLI 版 demo
// 用法示例：
//   node noctua.mjs --providers
//   node noctua.mjs -p deepseek --list-cases
//   node noctua.mjs -p deepseek -k sk-xxx --cases 010,060 --dry-run
//   node noctua.mjs -p deepseek -k sk-xxx --cases 010,060 --verbose
//   node noctua.mjs -p siliconflow -k sk-xxx --category sampling
//   node noctua.mjs -p claude_messages -k sk-xxx --cases all
//   node noctua.mjs -p deepseek --config ../config.yaml --cases 010_sampling_temperature.json
//   # Agent 测试（真实启动本地 CLI agent：claude / opencode / kilo）
//   node noctua.mjs -p tokenplus --endpoint-id agent_test --list-cases
//   node noctua.mjs -p tokenplus --endpoint-id agent_test --cases all -k sk-xxx -u http://127.0.0.1:8899/v1
//   node noctua.mjs -p tokenplus --endpoint-id agent_test --agents claude,kilo -k sk-xxx -u <base-url>
//   node noctua.mjs -p tokenplus --endpoint-id agent_test --category channel -k sk-xxx -u <base-url>
//   详见 docs/project/agent-test-methodology.md
import { Command } from "commander";
import chalk from "chalk";
import Table from "cli-table3";
import prompts from "prompts";
import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PAYLOADS_DIR = path.join(ROOT, "payloads");
const DEFAULT_CONFIG = path.join(ROOT, "config.yaml");

// ---------- 基础工具 ----------

function readJSON(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function valueAt(value, pathParts) {
  let current = value;
  for (const part of pathParts) {
    if (current === null || typeof current !== "object") return undefined;
    current = current[part];
    if (current === undefined) return undefined;
  }
  return current;
}

// 支持 choices[]（展开全部数组元素）/ choices[0] / choices.0 / error.message 形式的路径，返回全部命中值
function responseValuesAtPath(value, pathExpr) {
  if (!pathExpr) return [];
  let current = [value];
  const parts = pathExpr.replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean);
  for (let part of parts) {
    const isArray = part.endsWith("[]");
    const key = isArray ? part.slice(0, -2) : part;
    const next = [];
    for (const item of current) {
      if (item === null || typeof item !== "object") continue;
      const child = item[key];
      if (child === undefined) continue;
      if (!isArray) {
        next.push(child);
      } else if (Array.isArray(child)) {
        next.push(...child);
      }
    }
    if (next.length === 0) return [];
    current = next;
  }
  return current;
}

function missingFields(object, fields) {
  const missing = [];
  for (const field of fields) {
    if (valueAt(object, field.split(".")) === undefined) missing.push(field);
  }
  return missing;
}

function nestedRequiredFieldsAssertion(name, value, pathParts, fields) {
  let current = value;
  for (const part of pathParts) {
    if (current === null || typeof current !== "object") {
      return { name, pass: false, message: pathParts.join(".") + " 不存在" };
    }
    current = current[part];
  }
  if (Array.isArray(current)) {
    if (current.length === 0) return { name, pass: false, message: pathParts.join(".") + " 为空" };
    current = current[0];
  }
  const missing = missingFields(current ?? {}, fields);
  return {
    name,
    pass: missing.length === 0,
    message: missing.length === 0 ? "通过" : "缺少字段：" + missing.join(", "),
  };
}

function contentBlockRequiredFieldsAssertion(name, value, fields) {
  const content = valueAt(value, ["content"]);
  if (content === undefined) return { name, pass: false, message: "content 不存在" };
  if (!Array.isArray(content)) {
    const missing = missingFields(content ?? {}, fields);
    return { name, pass: missing.length === 0, message: missing.length === 0 ? "通过" : "缺少字段：" + missing.join(", ") };
  }
  if (content.length === 0) return { name, pass: false, message: "content 为空" };
  for (const item of content) {
    if (item !== null && typeof item === "object" && missingFields(item, fields).length === 0) {
      return { name, pass: true, message: "content 中存在满足字段要求的 block" };
    }
  }
  return { name, pass: false, message: "content 中没有任何 block 满足字段要求：" + fields.join(", ") };
}

function stringSlice(value) {
  return Array.isArray(value) ? value.filter((v) => typeof v === "string" && v !== "") : [];
}

function looksLikeSSE(raw) {
  return typeof raw === "string" && raw.includes("data:");
}

// 复刻 Go responseValueType / responseValueEquals：类型判定的语义与 backend 一致
function responseValueType(value) {
  if (value === null || value === undefined) return "null";
  if (typeof value === "string") return "string";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return "number";
  if (Array.isArray(value)) return "array";
  if (typeof value === "object") return "object";
  return typeof value;
}

function responseValueEquals(actual, expected) {
  if (actual === undefined || actual === null || expected === undefined || expected === null) {
    return (actual === undefined || actual === null) && (expected === undefined || expected === null);
  }
  if (typeof actual === "number" && typeof expected === "number") return actual === expected;
  return JSON.stringify(actual) === JSON.stringify(expected);
}

// 期望类型支持 "number|string" 多类型（与 Go responseValueHasType 一致）
function responseValueHasType(value, expectedTypes) {
  return String(expectedTypes)
    .split("|")
    .map((t) => t.trim())
    .filter(Boolean)
    .includes(responseValueType(value));
}

function parseSSEChunks(raw) {
  const chunks = [];
  for (const line of String(raw).split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) continue;
    const payload = trimmed.slice(5).trim();
    if (payload === "" || payload === "[DONE]") continue;
    try {
      chunks.push(JSON.parse(payload));
    } catch {
      // 非 JSON 的 data 分片直接跳过
    }
  }
  return chunks;
}

function isMessagesResponse(body) {
  if (body === null || typeof body !== "object") return false;
  if (!Array.isArray(body.content)) return false;
  return body.choices === undefined;
}

function assistantContent(body) {
  // OpenAI Chat 风格：choices[0].message.content
  const openai = responseValuesAtPath(body, "choices.0.message.content");
  if (typeof openai[0] === "string") return openai[0];
  // Anthropic Messages 风格：content[] 里 type=text 的 block
  const textBlocks = responseValuesAtPath(body, "content").flat().filter((b) => b && typeof b === "object" && b.type === "text" && typeof b.text === "string");
  if (textBlocks.length) return textBlocks.map((b) => b.text).join("");
  return undefined;
}

// 复刻 Go thinkingLocations / thinkingTokenEvidence：位置证据 + token 证据
function thinkingEvidence(body) {
  const locations = [];
  const contentBlocks = responseValuesAtPath(body, "content").flat().filter((b) => b && typeof b === "object" && (b.type === "thinking" || b.type === "redacted_thinking"));
  if (contentBlocks.length > 0) {
    locations.push(contentBlocks.some((b) => b.type === "redacted_thinking") ? "messages.content_block.redacted_thinking" : "messages.content_block");
  }
  for (const p of ["choices[].message.reasoning_content", "choices[].message.reasoning", "choices[].message.reasoning_details", "choices[].message.content_think_tag"]) {
    const vals = responseValuesAtPath(body, p);
    if (vals.length > 0 && vals.some((v) => v !== null && v !== "")) locations.push(p.replace("choices[].message.", "chat.message."));
  }
  const content = assistantContent(body);
  if (content !== undefined && (content.includes("<think>") || content.includes("</think>"))) locations.push("chat.message.content_think_tag");
  const tokens = [];
  for (const p of ["usage.completion_tokens_details.reasoning_tokens", "usage.completion_tokens_details.thinking_tokens", "usage.thinking_tokens"]) {
    const vals = responseValuesAtPath(body, p);
    if (vals.some((v) => typeof v === "number" && v > 0)) tokens.push(p);
  }
  return { locations, tokens };
}

// 复刻 Go toolCallsContractAssertion：工具调用契约（数量/名称/参数/ID 唯一/无多余字段）
function firstToolCalls(body) {
  const perChoice = responseValuesAtPath(body, "choices[].message.tool_calls");
  for (const c of perChoice) {
    if (Array.isArray(c) && c.length > 0) return c;
  }
  // Anthropic Messages 风格：content[] 里 type=tool_use 的 block，归一化为 OpenAI 结构
  const blocks = responseValuesAtPath(body, "content").flat().filter((b) => b && typeof b === "object" && b.type === "tool_use");
  if (blocks.length) {
    return blocks.map((b) => ({
      id: typeof b.id === "string" ? b.id : "",
      type: "function",
      function: {
        name: typeof b.name === "string" ? b.name : "",
        arguments: b.input !== undefined && b.input !== null ? (typeof b.input === "string" ? b.input : JSON.stringify(b.input)) : "",
      },
    }));
  }
  return null;
}

function requestedToolNames(request) {
  const tools = request?.tools;
  if (!Array.isArray(tools)) return [];
  const names = [];
  for (const tool of tools) {
    if (!tool || typeof tool !== "object") continue;
    if (tool.function && typeof tool.function === "object" && typeof tool.function.name === "string") {
      names.push(tool.function.name);
      continue;
    }
    if (typeof tool.name === "string") names.push(tool.name);
  }
  return names;
}

function requestedToolInputFields(request) {
  const tools = request?.tools;
  if (!Array.isArray(tools)) return {};
  const fields = {};
  for (const tool of tools) {
    if (!tool || typeof tool !== "object") continue;
    let schema = tool.input_schema ?? null;
    if (tool.function && typeof tool.function === "object") schema = tool.function.parameters ?? schema;
    const properties = schema?.properties;
    if (properties && typeof properties === "object") for (const name of Object.keys(properties)) fields[name] = true;
  }
  return fields;
}

function toolCallsContractAssertion(result, expect) {
  const calls = firstToolCalls(result.body ?? {});
  if (!calls || calls.length === 0) {
    return { name: "tool_calls_contract", pass: false, message: "响应中没有工具调用" };
  }
  if (expect.tool_calls_exact_count !== undefined && calls.length !== expect.tool_calls_exact_count) {
    return { name: "tool_calls_contract", pass: false, message: `预期 ${expect.tool_calls_exact_count} 个工具调用，实际 ${calls.length} 个` };
  }
  const requestedNames = requestedToolNames(result.requestBody);
  const requiredNames = stringSlice(expect.tool_call_required_names);
  const requiredFields = stringSlice(expect.tool_call_input_required_fields);
  const expectedTypes = expect.tool_call_input_field_types ?? {};
  const expectedValues = expect.tool_call_input_field_values ?? {};
  const allowedValues = expect.tool_call_input_allowed_values ?? {};
  const distinctFields = stringSlice(expect.tool_call_input_distinct_fields);
  const noAdditionalProperties = expect.tool_call_input_no_additional_properties === true;
  const allowedInputFields = requestedToolInputFields(result.requestBody);
  const seenIDs = new Set();
  const seenNames = new Set();
  const seenFieldValues = {};
  const problems = [];

  calls.forEach((call, index) => {
    if (!call || typeof call !== "object") {
      problems.push(`tool_call[${index}] 不是对象`);
      return;
    }
    const id = call.id;
    if (typeof id !== "string" || id.trim() === "") problems.push(`tool_call[${index}].id 不是非空字符串`);
    else if (seenIDs.has(id)) problems.push(`tool_call[${index}].id 重复`);
    else seenIDs.add(id);

    let name = "";
    let input = null;
    if (call.function && typeof call.function === "object") {
      if (call.type !== "function") problems.push(`tool_call[${index}].type 不是 function`);
      name = call.function.name ?? "";
      const argumentsStr = call.function.arguments;
      if (typeof argumentsStr !== "string" || argumentsStr.trim() === "") {
        problems.push(`tool_call[${index}].function.arguments 不是非空 JSON 字符串`);
      } else {
        try {
          const parsed = JSON.parse(argumentsStr);
          if (parsed !== null && typeof parsed === "object") input = parsed;
          else problems.push(`tool_call[${index}].function.arguments 不是 JSON object`);
        } catch {
          problems.push(`tool_call[${index}].function.arguments 不是 JSON object`);
        }
      }
    } else {
      if (call.type !== "tool_use") problems.push(`tool_call[${index}].type 不是 tool_use`);
      name = call.name ?? "";
      input = call.input && typeof call.input === "object" ? call.input : null;
      if (!input) problems.push(`tool_call[${index}].input 不是 JSON object`);
    }
    if (!requestedNames.includes(name)) problems.push(`tool_call[${index}] 返回未请求的工具 "${name}"`);
    seenNames.add(name);
    if (!input) return;

    for (const field of requiredFields) {
      if (valueAt(input, field.split(".")) === undefined) problems.push(`tool_call[${index}] 参数缺少 ${field}`);
    }
    for (const [field, t] of Object.entries(expectedTypes)) {
      const v = valueAt(input, field.split("."));
      if (v === undefined || !responseValueHasType(v, t)) problems.push(`tool_call[${index}] 参数 ${field} 类型不正确`);
    }
    for (const [field, v] of Object.entries(expectedValues)) {
      const val = valueAt(input, field.split("."));
      if (val === undefined || !responseValueEquals(val, v)) problems.push(`tool_call[${index}] 参数 ${field} 的值不正确`);
    }
    for (const [field, allowedList] of Object.entries(allowedValues)) {
      const val = valueAt(input, field.split("."));
      if (val === undefined) {
        problems.push(`tool_call[${index}] 参数缺少 ${field}`);
        continue;
      }
      if (!Array.isArray(allowedList) || !allowedList.some((a) => responseValueEquals(val, a))) problems.push(`tool_call[${index}] 参数 ${field} 的值不在允许范围内`);
    }
    for (const field of distinctFields) {
      const val = valueAt(input, field.split("."));
      if (val === undefined) {
        problems.push(`tool_call[${index}] 参数缺少 ${field}`);
        continue;
      }
      if (!seenFieldValues[field]) seenFieldValues[field] = new Set();
      const key = `${typeof val}:${JSON.stringify(val)}`;
      if (seenFieldValues[field].has(key)) problems.push(`tool_call[${index}] 参数 ${field} 与前一调用重复`);
      else seenFieldValues[field].add(key);
    }
    if (noAdditionalProperties) {
      if (Object.keys(allowedInputFields).length === 0) problems.push("工具 schema 未定义允许的参数字段");
      for (const field of Object.keys(input)) {
        if (!allowedInputFields[field]) problems.push(`tool_call[${index}] 参数包含未声明字段 ${field}`);
      }
    }
  });
  for (const name of requiredNames) {
    if (!seenNames.has(name)) problems.push(`响应没有调用必需工具 "${name}"`);
  }
  return { name: "tool_calls_contract", pass: problems.length === 0, message: problems.join("；") || "通过" };
}

// ---------- SSE 契约断言（复刻 Go）----------

// Anthropic 原生 SSE：event: message_start / content_block_delta / message_stop（无 [DONE]）
function parseAnthropicSSE(raw) {
  const events = [];
  let currentEvent = null;
  for (const line of String(raw).split("\n")) {
    const t = line.trim();
    if (t.startsWith("event:")) {
      currentEvent = t.slice(6).trim();
      continue;
    }
    if (t.startsWith("data:")) {
      const d = t.slice(5).trim();
      if (!d || d === "[DONE]") continue;
      try {
        events.push({ event: currentEvent, data: JSON.parse(d) });
      } catch {}
    }
  }
  return events;
}

function anthropicSSEAssertions(raw, expect) {
  const events = parseAnthropicSSE(raw);
  const assertions = [];
  assertions.push({ name: "anthropic_sse_start", pass: events.some((e) => e.event === "message_start"), message: "预期 message_start 事件" });
  assertions.push({ name: "anthropic_sse_stop", pass: events.some((e) => e.event === "message_stop"), message: "预期 message_stop 事件结束" });
  const textDelta = events.filter((e) => e.event === "content_block_delta" && typeof e.data?.delta?.text === "string" && e.data.delta.text !== "");
  const toolUse = events.filter((e) => e.event === "content_block_start" && e.data?.content_block?.type === "tool_use");
  const hasTools = (expect.stream_tool_call_min_count ?? 0) > 0;
  if (hasTools) {
    assertions.push({ name: "anthropic_sse_tool_use", pass: toolUse.length > 0, message: "预期流中出现 tool_use content block" });
  } else {
    assertions.push({ name: "anthropic_sse_content", pass: textDelta.length > 0, message: "预期流中出现 text 增量" });
  }
  return assertions;
}

// OpenAI 流式契约：chunk id/model 非空且跨 chunk 一致、usage 独立 final chunk、role/content/finish_reason 必须出现
function openAIStreamContractAssertion(raw, allowedFinishReasons) {
  const events = parseSSEChunks(raw);
  if (events.length === 0) {
    return { name: "openai_stream_contract", pass: false, message: "未解析到 JSON SSE chunk" };
  }
  const problems = [];
  let streamID = "";
  let streamModel = "";
  let usageChunks = 0;
  let hasAssistantRole = false;
  let hasContentDelta = false;
  let hasFinishReason = false;
  events.forEach((data, eventIndex) => {
    const id = data.id;
    if (typeof id !== "string" || id.trim() === "") problems.push(`chunk[${eventIndex}].id 不是非空字符串`);
    else if (streamID === "") streamID = id;
    else if (id !== streamID) problems.push(`chunk[${eventIndex}].id 与首个 chunk 不一致`);
    if (data.object !== "chat.completion.chunk") problems.push(`chunk[${eventIndex}].object 不是 chat.completion.chunk`);
    if (typeof data.created !== "number" || data.created < 1) problems.push(`chunk[${eventIndex}].created 不是正数`);
    const model = data.model;
    if (typeof model !== "string" || model.trim() === "") problems.push(`chunk[${eventIndex}].model 不是非空字符串`);
    else if (streamModel === "") streamModel = model;
    else if (model !== streamModel) problems.push(`chunk[${eventIndex}].model 与首个 chunk 不一致`);
    const choices = data.choices;
    if (!Array.isArray(choices)) {
      problems.push(`chunk[${eventIndex}].choices 不是数组`);
      return;
    }
    const hasUsage = data.usage !== undefined && data.usage !== null;
    if (hasUsage) {
      usageChunks++;
      if (choices.length !== 0) problems.push(`usage chunk[${eventIndex}] 的 choices 应为空数组`);
      if (eventIndex !== events.length - 1) problems.push(`usage chunk[${eventIndex}] 不是最后一个 JSON chunk`);
      const u = data.usage;
      const p = u.prompt_tokens;
      const c = u.completion_tokens;
      const t = u.total_tokens;
      if (typeof p !== "number" || typeof c !== "number" || typeof t !== "number" || p < 1 || c < 1 || t < 1) {
        problems.push("最终 usage 的 token 字段必须是正数");
      } else if (p + c !== t) {
        problems.push("最终 usage 的 prompt_tokens + completion_tokens 不等于 total_tokens");
      }
    }
    if (choices.length === 0 && !hasUsage) problems.push(`chunk[${eventIndex}] 的 choices 为空但没有 usage`);
    choices.forEach((item, choiceIndex) => {
      if (!item || typeof item !== "object") {
        problems.push(`chunk[${eventIndex}].choices[${choiceIndex}] 不是对象`);
        return;
      }
      if (typeof item.index !== "number" || item.index < 0) problems.push(`chunk[${eventIndex}].choices[${choiceIndex}].index 不是非负数字`);
      const delta = item.delta;
      if (!delta || typeof delta !== "object") {
        problems.push(`chunk[${eventIndex}].choices[${choiceIndex}].delta 不是对象`);
        return;
      }
      if (delta.role !== undefined) {
        if (delta.role !== "assistant") problems.push(`chunk[${eventIndex}].choices[${choiceIndex}].delta.role 不是 assistant`);
        else hasAssistantRole = true;
      }
      if (delta.content !== undefined) {
        if (typeof delta.content !== "string") problems.push(`chunk[${eventIndex}].choices[${choiceIndex}].delta.content 不是字符串`);
        else if (delta.content.trim() !== "") hasContentDelta = true;
      }
      const finishReason = item.finish_reason;
      if (finishReason === undefined || finishReason === null) return;
      if (typeof finishReason !== "string" || !allowedFinishReasons.includes(finishReason)) {
        problems.push(`chunk[${eventIndex}].choices[${choiceIndex}].finish_reason 不在允许范围内`);
      } else {
        hasFinishReason = true;
      }
    });
  });
  if (usageChunks !== 1) problems.push(`预期恰好 1 个 usage chunk，实际 ${usageChunks} 个`);
  if (!hasAssistantRole) problems.push("未找到 delta.role=assistant");
  if (!hasContentDelta) problems.push("未找到非空文本 content delta");
  if (!hasFinishReason) problems.push("未找到有效 finish_reason");
  return { name: "openai_stream_contract", pass: problems.length === 0, message: problems.join("；") || "通过" };
}

// OpenAI 工具流契约：tool_calls 增量聚合、id/name 跨 chunk 稳定、参数校验、finish_reason=tool_calls
function openAIToolStreamContractAssertion(result, expect) {
  const raw = result.raw ?? "";
  const events = parseSSEChunks(raw);
  if (events.length === 0) {
    return { name: "openai_tool_stream_contract", pass: false, message: "未解析到 JSON SSE chunk" };
  }
  const requestedNames = requestedToolNames(result.requestBody);
  const requiredNames = stringSlice(expect.stream_tool_required_names);
  let minimumCalls = expect.stream_tool_call_min_count;
  if (typeof minimumCalls !== "number" || minimumCalls < 1) minimumCalls = 1;
  const allowedFinishReasons = stringSlice(expect.allowed_finish_reasons);
  const states = new Map();
  const problems = [];
  let streamID = "";
  let streamModel = "";
  let hasAssistantRole = false;
  let hasToolFinishReason = false;
  let usageChunks = 0;

  events.forEach((data, eventIndex) => {
    const id = data.id;
    if (typeof id !== "string" || id.trim() === "") problems.push(`chunk[${eventIndex}].id 不是非空字符串`);
    else if (streamID === "") streamID = id;
    else if (streamID !== id) problems.push(`chunk[${eventIndex}].id 与首个 chunk 不一致`);
    if (data.object !== "chat.completion.chunk") problems.push(`chunk[${eventIndex}].object 不是 chat.completion.chunk`);
    if (typeof data.created !== "number" || data.created < 1) problems.push(`chunk[${eventIndex}].created 不是正数`);
    const model = data.model;
    if (typeof model !== "string" || model.trim() === "") problems.push(`chunk[${eventIndex}].model 不是非空字符串`);
    else if (streamModel === "") streamModel = model;
    else if (streamModel !== model) problems.push(`chunk[${eventIndex}].model 与首个 chunk 不一致`);
    const choices = data.choices;
    if (!Array.isArray(choices)) {
      problems.push(`chunk[${eventIndex}].choices 不是数组`);
      return;
    }
    if (data.usage !== undefined && data.usage !== null) {
      usageChunks++;
      if (choices.length !== 0) problems.push(`usage chunk[${eventIndex}] 的 choices 应为空数组`);
      const u = data.usage;
      const p = u.prompt_tokens;
      const c = u.completion_tokens;
      const t = u.total_tokens;
      if (typeof p !== "number" || typeof c !== "number" || typeof t !== "number" || p < 1 || c < 1 || t !== p + c) {
        problems.push("最终 usage 的 token 字段或总数不正确");
      }
    }
    choices.forEach((item, choiceIndex) => {
      if (!item || typeof item !== "object") {
        problems.push(`chunk[${eventIndex}].choices[${choiceIndex}] 不是对象`);
        return;
      }
      if (typeof item.index !== "number" || item.index < 0) problems.push(`chunk[${eventIndex}].choices[${choiceIndex}].index 不是非负数字`);
      const delta = item.delta;
      if (!delta || typeof delta !== "object") {
        problems.push(`chunk[${eventIndex}].choices[${choiceIndex}].delta 不是对象`);
        return;
      }
      if (delta.role !== undefined) {
        if (delta.role !== "assistant") problems.push(`chunk[${eventIndex}].choices[${choiceIndex}].delta.role 不是 assistant`);
        else hasAssistantRole = true;
      }
      if (delta.tool_calls !== undefined) {
        const toolCalls = delta.tool_calls;
        if (!Array.isArray(toolCalls)) {
          problems.push(`chunk[${eventIndex}].choices[${choiceIndex}].delta.tool_calls 不是数组`);
        } else {
          toolCalls.forEach((call, callIndex) => {
            if (!call || typeof call !== "object") {
              problems.push(`chunk[${eventIndex}] tool_call[${callIndex}] 不是对象`);
              return;
            }
            const streamIndex = call.index;
            if (typeof streamIndex !== "number" || streamIndex < 0) {
              problems.push(`chunk[${eventIndex}] tool_call[${callIndex}].index 不是非负整数`);
              return;
            }
            let state = states.get(streamIndex);
            if (!state) {
              state = { id: "", name: "", arguments: "" };
              states.set(streamIndex, state);
            }
            if (call.id !== undefined) {
              if (typeof call.id !== "string" || call.id.trim() === "") problems.push(`tool_call[${streamIndex}].id 不是非空字符串`);
              else if (state.id !== "" && state.id !== call.id) problems.push(`tool_call[${streamIndex}].id 在流中变化`);
              else state.id = call.id;
            }
            if (call.type !== undefined && call.type !== "function") problems.push(`tool_call[${streamIndex}].type 不是 function`);
            if (call.function !== undefined) {
              const fn = call.function;
              if (!fn || typeof fn !== "object") {
                problems.push(`tool_call[${streamIndex}].function 不是对象`);
                return;
              }
              if (fn.name !== undefined) {
                if (typeof fn.name !== "string" || fn.name.trim() === "") problems.push(`tool_call[${streamIndex}].function.name 不是非空字符串`);
                else if (state.name !== "" && state.name !== fn.name) problems.push(`tool_call[${streamIndex}].function.name 在流中变化`);
                else state.name = fn.name;
              }
              if (fn.arguments !== undefined) {
                if (typeof fn.arguments !== "string") problems.push(`tool_call[${streamIndex}].function.arguments 不是字符串`);
                else state.arguments += fn.arguments;
              }
            }
          });
        }
      }
      const reason = item.finish_reason;
      if (reason !== undefined && reason !== null) {
        if (typeof reason !== "string" || !allowedFinishReasons.includes(reason)) {
          problems.push(`chunk[${eventIndex}].choices[${choiceIndex}].finish_reason 不在允许范围内`);
        } else if (reason === "tool_calls") {
          hasToolFinishReason = true;
        }
      }
    });
  });
  if (usageChunks !== 1) problems.push(`预期恰好 1 个 usage chunk，实际 ${usageChunks} 个`);
  if (!hasAssistantRole) problems.push("未找到 delta.role=assistant");
  if (!hasToolFinishReason) problems.push("未找到 finish_reason=tool_calls");
  if (states.size < minimumCalls) problems.push(`预期至少 ${minimumCalls} 个工具调用，实际 ${states.size} 个`);
  for (const name of requiredNames) {
    let found = false;
    for (const s of states.values()) {
      if (s.name === name) {
        found = true;
        break;
      }
    }
    if (!found) problems.push(`响应没有调用必需工具 "${name}"`);
  }
  const streamRequiredFields = stringSlice(expect.stream_tool_input_required_fields);
  const streamFieldTypes = expect.stream_tool_input_field_types ?? {};
  const streamFieldValues = expect.stream_tool_input_field_values ?? {};
  for (const [index, s] of states) {
    if (s.name === "") problems.push(`tool_call[${index}].function.name 为空`);
    if (!requestedNames.includes(s.name)) problems.push(`tool_call[${index}] 返回未请求的工具 "${s.name}"`);
    let input = null;
    if (s.arguments) {
      try {
        const parsed = JSON.parse(s.arguments);
        if (parsed !== null && typeof parsed === "object") input = parsed;
      } catch {}
    }
    if (!input) {
      problems.push(`tool_call[${index}].function.arguments 不是合法 JSON object`);
      continue;
    }
    for (const f of streamRequiredFields) {
      if (valueAt(input, f.split(".")) === undefined) problems.push(`tool_call[${index}] 参数缺少 ${f}`);
    }
    for (const [f, t] of Object.entries(streamFieldTypes)) {
      const v = valueAt(input, f.split("."));
      if (v === undefined || !responseValueHasType(v, t)) problems.push(`tool_call[${index}] 参数 ${f} 类型不正确`);
    }
    for (const [f, v] of Object.entries(streamFieldValues)) {
      const val = valueAt(input, f.split("."));
      if (val === undefined || !responseValueEquals(val, v)) problems.push(`tool_call[${index}] 参数 ${f} 的值不正确`);
    }
  }
  return { name: "openai_tool_stream_contract", pass: problems.length === 0, message: problems.join("；") || "通过" };
}

// usage chunk 形态（openai_dedicated = 独立 usage chunk 且是 [DONE] 前最后一个 data chunk）
function streamUsageChunkShapeAssertion(raw, mode) {
  if (!mode) return [];
  const chunks = parseSSEChunks(raw);
  const usageIndexes = chunks.map((c, i) => c.usage !== undefined && c.usage !== null ? i : -1).filter((i) => i >= 0);
  if (mode === "openai_dedicated") {
    if (usageIndexes.length !== 1) return [{ name: "stream_usage_chunk_shape", pass: false, message: `预期 1 个独立 usage chunk，实际 ${usageIndexes.length} 个` }];
    if (usageIndexes[0] !== chunks.length - 1) return [{ name: "stream_usage_chunk_shape", pass: false, message: "usage chunk 存在，但不是 [DONE] 前最后一个 data chunk" }];
    if (!String(raw).includes("data: [DONE]")) return [{ name: "stream_usage_chunk_shape", pass: false, message: "预期流以 data: [DONE] 结束，但未找到 [DONE]" }];
    return [{ name: "stream_usage_chunk_shape", pass: true, message: "通过：独立 usage chunk 位于 [DONE] 前" }];
  }
  return [];
}

// usage 在流中出现/禁止出现
function streamUsageInSSEAssertion(raw, mode) {
  if (!mode) return [];
  const hasUsage = parseSSEChunks(raw).some((c) => c.usage !== undefined && c.usage !== null);
  if (mode === "required") {
    return [{ name: "stream_usage_in_sse", pass: hasUsage, message: hasUsage ? "SSE 含 usage chunk" : "预期 SSE 含 usage chunk，但未找到" }];
  }
  if (mode === "forbidden") {
    return [{ name: "stream_usage_in_sse", pass: !hasUsage, message: hasUsage ? "预期 SSE 不含 usage chunk，但找到了 usage" : "SSE 不含 usage chunk" }];
  }
  return [];
}

// SSE 增量指标：chunk 数量下限（content delta 非空的 chunk 计入 content chunk）
function sseMetricsAssertions(raw, expect) {
  const chunks = parseSSEChunks(raw);
  const sseCount = chunks.length;
  const contentChunks = chunks.filter((c) =>
    (c.choices ?? []).some((ch) => typeof ch?.delta?.content === "string" && ch.delta.content.trim() !== "")
  ).length;
  const assertions = [];
  if (expect.min_sse_chunks > 0) {
    assertions.push({ name: "min_sse_chunks", pass: sseCount >= expect.min_sse_chunks, message: `预期 >= ${expect.min_sse_chunks} 个 SSE chunk，实际 ${sseCount}` });
  }
  if (expect.min_content_chunks > 0) {
    assertions.push({ name: "min_content_chunks", pass: contentChunks >= expect.min_content_chunks, message: `预期 >= ${expect.min_content_chunks} 个 content chunk，实际 ${contentChunks}` });
  }
  return assertions;
}

// ---------- payloads / manifest / config ----------

function listProviders() {
  if (!fs.existsSync(PAYLOADS_DIR)) {
    console.error(chalk.red(`找不到 payloads 目录：${PAYLOADS_DIR}`));
    process.exit(1);
  }
  return fs
    .readdirSync(PAYLOADS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.existsSync(path.join(PAYLOADS_DIR, e.name, "manifest.json")))
    .map((e) => e.name)
    .sort();
}

function endpointSuffix(endpointID) {
  switch (endpointID ?? "") {
    case "":
    case "chat_completions":
      return "";
    case "anthropic_messages":
      return "messages";
    case "agent_test":
      return "agents";
    default:
      return endpointID;
  }
}

function loadManifest(provider, endpointID) {
  const suffix = endpointSuffix(endpointID);
  let dirName = provider;
  if (suffix !== "" && !provider.endsWith("_" + suffix)) dirName = provider + "_" + suffix;
  const providerDir = path.join(PAYLOADS_DIR, dirName);
  const manifestPath = path.join(providerDir, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`provider "${provider}" 不存在（已尝试目录 ${dirName}）。可用: ${listProviders().join(", ")}`);
  }
  const manifest = readJSON(manifestPath);
  const cases = [];
  for (const file of manifest.cases ?? []) {
    const tc = readJSON(path.join(providerDir, file));
    tc.file = file;
    tc.expect = { ...(manifest.common_expect ?? {}), ...(tc.expect ?? {}) };
    cases.push(tc);
  }
  return { manifest, cases, dirName };
}

// 解析 config.yaml（格式与 backend/config.go 一致：段名 -> base_url / api_key）
function parseConfigFile(file) {
  const providers = {};
  let current = "";
  if (!fs.existsSync(file)) return providers;
  for (const rawLine of fs.readFileSync(file, "utf8").split("\n")) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("#")) continue;
    if (line.endsWith(":") && !line.includes(" ")) {
      current = line.slice(0, -1);
      if (current !== "" && !providers[current]) providers[current] = {};
      continue;
    }
    if (current === "") continue;
    if (line.startsWith("http://") || line.startsWith("https://")) {
      providers[current].base_url = line;
    } else if (providers[current].api_key === undefined) {
      providers[current].api_key = line;
    }
  }
  return providers;
}

const PLATFORM_KEY_ALIASES = {
  deepseek: ["deepseek"],
  moonshot: ["moonshot"],
  zhipu: ["zhipu"],
  minimax: ["minimax"],
  "aliyun-cn": ["aliyun-cn", "aliyun", "ali"],
  "aliyun-us": ["aliyun-us", "aliyun", "ali"],
  "siliconflow-cn": ["siliconflow-cn", "sf-router-cn", "siliconflow"],
  "siliconflow-com": ["siliconflow-com", "sf-router-com", "siliconflow"],
  openrouter: ["openrouter"],
  tokenplus: ["tokenplus"],
  "sf-router-cn": ["sf-router-cn", "siliconflow-cn", "siliconflow"],
  "sf-router-com": ["sf-router-com", "siliconflow-com", "siliconflow"],
  "streamlake-cn": ["streamlake-cn", "streamlake"],
  "baidu-qifan": ["baidu-qifan", "baidu"],
};

function isPlaceholderAPIKey(key) {
  const k = String(key ?? "").trim();
  if (k === "" || k === "token-abc123") return true;
  return k.toLowerCase().includes("your-");
}

function maskAPIKey(key) {
  const k = String(key ?? "").trim();
  if (isPlaceholderAPIKey(k)) return "";
  if (k.length <= 8) return k[0] + "****" + k[k.length - 1];
  return k.slice(0, 4) + "****" + k.slice(-4);
}

function configKeysForPlatform(provider) {
  return PLATFORM_KEY_ALIASES[provider] ?? [provider];
}

function resolveApiKeyAndBaseUrl({ provider, apiKey, baseUrl, configPath }) {
  const config = parseConfigFile(configPath ?? DEFAULT_CONFIG);
  const keys = configKeysForPlatform(provider);
  let fromConfig = null;
  for (const key of keys) {
    const entry = config[key];
    if (entry && !isPlaceholderAPIKey(entry.api_key)) {
      fromConfig = entry;
      break;
    }
  }
  const envKey = provider.toUpperCase().replace(/-/g, "_") + "_API_KEY";
  return {
    apiKey: (apiKey || process.env.NOCTUA_API_KEY || process.env[envKey] || fromConfig?.api_key || "").trim(),
    baseUrl: (baseUrl || fromConfig?.base_url || "").trim(),
    fromConfig,
  };
}

// ---------- 用例选择 ----------

function selectCases(cases, { caseList, category, interactive }) {
  let selected = cases;
  if (caseList && caseList !== "all") {
    const wanted = caseList.split(",").map((s) => s.trim()).filter(Boolean);
    selected = cases.filter((tc) =>
      wanted.some((w) => tc.file === w || tc.case_id === w || tc.file.startsWith(w) || tc.case_id.startsWith(w))
    );
    if (selected.length === 0) {
      throw new Error(`没有匹配的用例：${caseList}。可用 --list-cases 查看。`);
    }
  } else if (category) {
    selected = cases.filter((tc) => (tc.category ?? "") === category);
    if (selected.length === 0) {
      throw new Error(`provider 下没有 category="${category}" 的用例。`);
    }
  } else if (interactive && process.stdout.isTTY && !process.stdin.isTTY === false) {
    const res = awaitPrompts(selected, cases);
    if (res.length === 0) process.exit(0);
    selected = res;
  }
  return selected;
}

async function awaitPrompts(preSelected, all) {
  const choices = all.map((tc, i) => ({
    title: `${chalk.gray(tc.file)}  ${tc.category ?? "-"}  ${tc.title}`,
    value: tc,
    selected: preSelected.includes(tc),
  }));
  const response = await prompts({
    type: "multiselect",
    name: "cases",
    message: "选择要运行的用例（空格选择，回车确认）",
    instructions: false,
    choices,
  });
  return response.cases ?? [];
}

// ---------- 请求执行 ----------

// ---------- Agent 执行（kind: agent）----------

// 三适配器：claude code / opencode / kilo。
// 每个适配器负责：env 注入 + 临时 config 生成 + 无头命令构造 + 输出解析。
// 实证验证：均可在 ANTHROPIC_BASE_URL / 临时 provider config 指向自定义网关时完成基本对话。
const AGENT_ADAPTERS = {
  claude: {
    bin: "claude",
    // 纯环境变量注入，零配置文件；ANTHROPIC_BASE_URL 指向网关根地址（不要带 /v1）
    baseUrlEnv: "ANTHROPIC_BASE_URL",
    apiKeyEnv: "ANTHROPIC_API_KEY",
    modelEnv: "ANTHROPIC_MODEL",
    extraEnv: { CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1", ANTHROPIC_SMALL_FAST_MODEL: "" },
    // --bare：跳过 hooks/plugins/MCP，启动快且要求 API key（CI 友好）
    buildArgs({ prompt, args }) {
      return ["--bare", "-p", prompt, "--output-format", "json", ...(args ?? [])];
    },
    parseOutput(stdout, stderr) {
      try {
        const obj = JSON.parse(stdout);
        return {
          ok: obj.is_error === false,
          text: typeof obj.result === "string" ? obj.result : "",
          events: [],
          resultJson: obj,
          error: obj.is_error ? (obj.errors ?? []).join("；") : undefined,
          extras: {
            num_turns: obj.num_turns,
            duration_ms: obj.duration_ms,
            total_cost_usd: obj.total_cost_usd,
            model_usage: obj.modelUsage,
          },
        };
      } catch {
        return { ok: false, text: "", events: [], error: "claude 输出不是 JSON：" + String(stdout ?? stderr).slice(0, 300) };
      }
    },
  },
  opencode: {
    bin: "opencode",
    // 项目级临时 opencode.json 定义 provider（@ai-sdk/openai-compatible）；
    // 用 OPENCODE_CONFIG 显式指向配置文件，避免依赖 cwd 配置发现
    configFile: "opencode.json",
    configEnv: "OPENCODE_CONFIG",
    buildConfig({ baseURL, apiKey, model }) {
      return {
        $schema: "https://opencode.ai/config.json",
        provider: {
          tokenplus: {
            npm: "@ai-sdk/openai-compatible",
            options: { baseURL, apiKey },
            models: { [model]: { name: "TokenPlus " + model } },
          },
        },
      };
    },
    buildArgs({ prompt, model, args }) {
      // --title 跳过 title 预请求（省一个请求，减少上游限流触发）；--pure 跳过外部插件
      return ["run", "-m", `tokenplus/${model}`, "--format", "json", "--auto", "--title", "noctua-agent-test", "--pure", ...(args ?? []), prompt];
    },
    parseOutput(stdout, stderr) {
      return parseNdjsonAgentOutput(stdout, stderr, "opencode");
    },
  },
  kilo: {
    bin: "kilo",
    // 与 opencode 同源（fork/rebrand），配置文件名与 schema 不同；
    // kilo 不自动发现 cwd 下配置，必须用 KILO_CONFIG 显式指定
    configFile: "kilo.jsonc",
    configEnv: "KILO_CONFIG",
    buildConfig({ baseURL, apiKey, model }) {
      return {
        $schema: "https://app.kilo.ai/config.json",
        provider: {
          tokenplus: {
            npm: "@ai-sdk/openai-compatible",
            options: { baseURL, apiKey },
            models: { [model]: { name: "TokenPlus " + model } },
          },
        },
      };
    },
    buildArgs({ prompt, model, args }) {
      return ["run", "-m", `tokenplus/${model}`, "--format", "json", "--auto", "--title", "noctua-agent-test", "--pure", ...(args ?? []), prompt];
    },
    parseOutput(stdout, stderr) {
      return parseNdjsonAgentOutput(stdout, stderr, "kilo");
    },
  },
};

// opencode / kilo 输出为 NDJSON 事件流：有 text 事件（含 part.text）、无 error 事件即成功
function parseNdjsonAgentOutput(stdout, stderr, agentName) {
  const events = [];
  let hasError = false;
  let errorText = "";
  const textParts = [];
  for (const line of String(stdout ?? "").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let ev;
    try {
      ev = JSON.parse(trimmed);
    } catch {
      continue;
    }
    events.push(ev);
    if (ev.type === "error") {
      hasError = true;
      errorText = ev.error?.data?.message ?? ev.error?.message ?? JSON.stringify(ev.error ?? "");
    } else if (ev.type === "text" && typeof ev.part?.text === "string") {
      textParts.push(ev.part.text);
    }
  }
  if (events.length === 0) {
    return { ok: false, text: "", events, error: `${agentName} 无 NDJSON 事件输出：${String(stdout ?? stderr).slice(0, 300)}` };
  }
  if (hasError) {
    return { ok: false, text: textParts.join(""), events, error: `${agentName} 事件流含 error：${errorText}` };
  }
  return { ok: true, text: textParts.join("").trim(), events, error: undefined };
}

function agentConfigFor(agentName, { baseURL, apiKey, model }) {
  const adapter = AGENT_ADAPTERS[agentName];
  if (!adapter) throw new Error(`未知 agent 适配器：${agentName}（可用：${Object.keys(AGENT_ADAPTERS).join(", ")}）`);
  return adapter;
}

// 检测 agent 可执行文件是否在本机 PATH 上（agent 测试的前置检测，缺失则跳过对应用例）
function isExecutableAvailable(bin) {
  const r = spawnSync("sh", ["-c", `command -v "${bin}"`], { encoding: "utf8", timeout: 5000 });
  return r.status === 0 && String(r.stdout ?? "").trim() !== "";
}

function spawnAgentRun({ agentName, baseURL, apiKey, model, prompt, args, timeoutMs, dryRun, workDir }) {
  const adapter = agentConfigFor(agentName, { baseURL, apiKey, model });
  // claude 的 base_url 是网关根地址（agent 自行拼 /v1/messages），其余用原样 baseURL
  const baseForAgent = agentName === "claude" ? String(baseURL ?? "").replace(/\/+$/, "").replace(/\/v1$/, "") : String(baseURL ?? "").replace(/\/+$/, "");

  if (dryRun) {
    return {
      dryRun: true,
      agent: agentName,
      command: `${adapter.bin} ${adapter.buildArgs({ prompt, model, args }).map((a) => (a.includes(" ") ? `"${a}"` : a)).join(" ")}`,
      env: agentName === "claude" ? { [adapter.baseUrlEnv]: baseForAgent, [adapter.apiKeyEnv]: "<redacted>", [adapter.modelEnv]: model } : { [adapter.configEnv]: "<temp>/" + adapter.configFile },
      configFile: agentName === "claude" ? null : { file: adapter.configFile, content: adapter.buildConfig({ baseURL, apiKey, model }) },
    };
  }

  const env = { ...process.env };
  // 关键：opencode/kilo 用 PWD 环境变量而非进程 cwd 定位工作目录；不覆盖 PWD 会导致工具在错误目录读写文件
  env.PWD = workDir;
  if (agentName === "claude") {
    env[adapter.baseUrlEnv] = baseForAgent;
    env[adapter.apiKeyEnv] = apiKey;
    if (model) env[adapter.modelEnv] = model;
    if (adapter.extraEnv?.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC) env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = "1";
    if (adapter.extraEnv?.ANTHROPIC_SMALL_FAST_MODEL !== undefined && model) env.ANTHROPIC_SMALL_FAST_MODEL = model;
    return { cmd: adapter.bin, args: adapter.buildArgs({ prompt, args }), env, cwd: workDir };
  }

  // opencode / kilo：写临时项目级配置文件，用 configEnv 显式指向（kilo 不自动发现 cwd 配置）
  const configContent = adapter.buildConfig({ baseURL: String(baseURL ?? "").replace(/\/+$/, ""), apiKey, model });
  const configPath = path.join(workDir, adapter.configFile);
  fs.writeFileSync(configPath, JSON.stringify(configContent, null, 2));
  env[adapter.configEnv] = configPath;
  return { cmd: adapter.bin, args: adapter.buildArgs({ prompt, model, args }), env, cwd: workDir, configFile: adapter.configFile, configPath }; 
}

async function executeAgentRun(spawnSpec, timeoutMs) {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let stdout = "";
  let stderr = "";
  try {
    const proc = spawn(spawnSpec.cmd, spawnSpec.args, {
      env: spawnSpec.env,
      cwd: spawnSpec.cwd,
      stdio: ["ignore", "pipe", "pipe"],
      signal: controller.signal,
    });
    const outP = new Promise((resolve, reject) => {
      proc.stdout.on("data", (d) => (stdout += d));
      proc.stderr.on("data", (d) => (stderr += d));
      proc.on("error", (err) => reject(err));
      proc.on("close", (code) => resolve(code ?? -1));
    });
    const code = await outP;
    return { code, stdout, stderr, latencyMs: Date.now() - started };
  } catch (err) {
    if (err.name === "AbortError") {
      return { code: -1, stdout, stderr, latencyMs: Date.now() - started, error: `超时（${timeoutMs}ms）` };
    }
    if (err.code === "ENOENT") {
      return { code: -1, stdout, stderr, latencyMs: Date.now() - started, error: `找不到可执行文件 ${spawnSpec.cmd}（请先安装）` };
    }
    return { code: -1, stdout, stderr, latencyMs: Date.now() - started, error: err.message };
  } finally {
    clearTimeout(timer);
  }
}

function isAnthropicMessagesEndpoint(manifest) {
  return manifest.endpoint === "/messages" || String(manifest.provider ?? "").endsWith("_messages");
}

function providerAuthHeader(provider) {
  const name = String(provider ?? "");
  return ["ali_messages", "claude_messages", "deepseek_messages", "minimax_messages", "tokenplus_messages"].includes(name)
    ? "X-Api-Key"
    : "Authorization";
}

function buildEndpointURL(baseURL, endpoint) {
  const base = String(baseURL ?? "").trim().replace(/\/+$/, "");
  const ep = String(endpoint ?? "").trim();
  if (!ep) return base;
  const epPath = "/" + ep.replace(/^\/+/, "");
  if (base.endsWith(epPath)) return base;
  return base + epPath;
}

async function sendRequest({ endpointURL, apiKey, manifest, tc, body, timeoutMs, dryRun, verbose }) {
  const headers = { "Content-Type": "application/json", Accept: "application/json, text/event-stream" };
  if (isAnthropicMessagesEndpoint(manifest)) headers["anthropic-version"] = "2023-06-01";
  headers[providerAuthHeader(manifest.provider)] = providerAuthHeader(manifest.provider) === "X-Api-Key" ? apiKey : "Bearer " + apiKey;
  for (const [k, v] of Object.entries(tc.headers ?? {})) {
    if (String(k).trim()) headers[k] = v;
  }

  if (dryRun) {
    return { dryRun: true, headers: maskRequestHeaders(headers), body };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();
  let resp;
  try {
    resp = await fetch(endpointURL, {
      method: tc.method ?? "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    return { latencyMs: Date.now() - started, error: err.cause?.message ?? err.message };
  }
  clearTimeout(timer);
  const latencyMs = Date.now() - started;
  const raw = await resp.text();
  let parsed = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // SSE 或非 JSON 响应
  }
  return {
    status: resp.status,
    latencyMs,
    raw,
    body: parsed,
    headers: Object.fromEntries(resp.headers.entries()),
    responseHeaders: Object.fromEntries(resp.headers.entries()),
  };
}

function maskRequestHeaders(headers) {
  const out = { ...headers };
  if (out.Authorization) out.Authorization = "Bearer <redacted>";
  if (out["X-Api-Key"]) out["X-Api-Key"] = "<redacted>";
  return out;
}

// ---------- 断言（复刻 backend/main.go evaluateAssertions 常用子集）----------

function evaluateAssertions(result, expect) {
  const assertions = [];
  const status = result.status ?? 0;
  const body = result.body;

  // optional_capability_mismatch
  if (expect.optional_capability_mismatch === true && [400, 404, 422].includes(status)) {
    const text = String((result.error ?? "") + " " + (result.raw ?? "")).toLowerCase();
    const fragments = ["no endpoints found that support", "not supported", "unsupported", "does not support", "support input audio", "support input video"];
    if (fragments.some((f) => text.includes(f))) {
      return [{ name: "optional_capability_mismatch", pass: true, message: "可选能力在当前模型/路由下不可用，按 ignored 处理" }];
    }
  }

  const expectedStatus = expect.http_status ?? 0;
  if (expectedStatus > 0) {
    assertions.push({
      name: "http_status",
      pass: status === expectedStatus,
      message: `预期 ${expectedStatus}，实际 ${status}`,
    });
  }

  // 响应头断言
  const reqHeaders = stringSlice(expect.required_response_headers);
  if (reqHeaders.length > 0) {
    const missing = reqHeaders.filter((h) => result.responseHeaders?.[h] === undefined);
    assertions.push({
      name: "required_response_headers",
      pass: missing.length === 0,
      message: missing.length === 0 ? "通过" : "缺少响应头：" + missing.join(", "),
    });
  }
  const headerContains = expect.response_header_contains;
  if (headerContains && typeof headerContains === "object") {
    const mismatches = [];
    for (const [h, v] of Object.entries(headerContains)) {
      const actual = Object.entries(result.responseHeaders ?? {}).find(([name]) => name.toLowerCase() === h.toLowerCase())?.[1] ?? "";
      if (!String(actual).includes(String(v))) mismatches.push(`${h} 未包含 "${v}"`);
    }
    assertions.push({ name: "response_header_contains", pass: mismatches.length === 0, message: mismatches.join("；") || "通过" });
  }

  if (status >= 400) {
    const errPaths = stringSlice(expect.error_required_paths);
    if (errPaths.length > 0) {
      const missing = errPaths.filter((p) => responseValuesAtPath(body, p).length === 0);
      assertions.push({ name: "error_required_paths", pass: missing.length === 0, message: missing.length === 0 ? "通过" : "错误响应缺少路径：" + missing.join(", ") });
    }
    const pathTypes = expect.error_path_types;
    if (pathTypes && typeof pathTypes === "object") {
      const mismatches = [];
      for (const [p, t] of Object.entries(pathTypes)) {
        const vals = responseValuesAtPath(body, p);
        if (vals.length === 0 || vals.some((v) => !responseValueHasType(v, t))) mismatches.push(`${p} 类型≠${t}`);
      }
      assertions.push({ name: "error_path_types", pass: mismatches.length === 0, message: mismatches.join("；") || "通过" });
    }
    const pathValues = expect.error_path_values;
    if (pathValues && typeof pathValues === "object") {
      const mismatches = [];
      for (const [p, v] of Object.entries(pathValues)) {
        const vals = responseValuesAtPath(body, p);
        if (vals.length === 0 || vals.some((x) => !responseValueEquals(x, v))) mismatches.push(`${p} 实际≠期望`);
      }
      assertions.push({ name: "error_path_values", pass: mismatches.length === 0, message: mismatches.join("；") || "通过" });
    }
    const errorNonEmpty = stringSlice(expect.error_non_empty_paths);
    if (errorNonEmpty.length > 0) {
      const invalid = [];
      for (const p of errorNonEmpty) {
        const vals = responseValuesAtPath(body, p);
        if (vals.length === 0) {
          invalid.push(p + " 不存在");
          continue;
        }
        for (const v of vals) {
          if (typeof v !== "string" || v.trim() === "") {
            invalid.push(p + " 为空或不是字符串");
            break;
          }
        }
      }
      assertions.push({ name: "error_non_empty_paths", pass: invalid.length === 0, message: invalid.length === 0 ? "通过" : invalid.join("；") });
    }
    if (expect.messages_error_envelope === true) {
      const err = body?.error;
      assertions.push({
        name: "messages_error_envelope",
        pass: err && typeof err === "object" && typeof err.message === "string" && (body.type === "error" || typeof err.type === "string"),
        message: "错误响应缺少 error.message 字符串",
      });
    }
    return assertions;
  }

  if (expect.response_mode === "sse") {
    assertions.push({ name: "response_mode", pass: looksLikeSSE(result.raw), message: "预期 text/event-stream 风格的 data: 分片" });
    // Anthropic 原生 SSE（event: message_start）与 OpenAI SSE（data: chunk + [DONE]）契约不同
    if (String(result.raw ?? "").includes("event: message_start")) {
      assertions.push(...anthropicSSEAssertions(result.raw, expect));
      return assertions;
    }
    const chunks = parseSSEChunks(result.raw);
    const fields = stringSlice(expect.required_chunk_fields);
    if (fields.length > 0 && chunks.length > 0) {
      const missing = missingFields(chunks[0], fields);
      assertions.push({ name: "required_chunk_fields", pass: missing.length === 0, message: missing.length === 0 ? "通过" : "首个 chunk 缺少：" + missing.join(", ") });
    }
    const usageFields = stringSlice(expect.usage_required_fields);
    if (usageFields.length > 0 && chunks.length > 0) {
      const found = chunks.some((c) => c.usage && missingFields(c.usage, usageFields).length === 0);
      assertions.push({ name: "usage_required_fields", pass: found, message: "SSE chunks 中未找到完整 usage 字段" });
    }
    if (expect.stream_options?.include_usage === true) {
      const hasUsage = chunks.some((c) => c.usage !== undefined);
      assertions.push({ name: "stream_options.include_usage", pass: hasUsage, message: "stream=true 且 include_usage=true 时预期 SSE chunk 中包含 usage" });
    }
    if (expect.stream_done_required === true) {
      assertions.push({ name: "stream_done_required", pass: String(result.raw).includes("data: [DONE]"), message: "预期 SSE 流以 data: [DONE] 结束" });
    }
    // OpenAI 流式契约：id/model 非空且跨 chunk 一致、usage 独立 final chunk、role/content/finish_reason 必须出现
    if (expect.openai_stream_contract === true) {
      assertions.push(openAIStreamContractAssertion(result.raw, stringSlice(expect.allowed_finish_reasons)));
    }
    // OpenAI 工具流契约：tool_calls 增量聚合、工具名/参数校验
    if (expect.openai_tool_stream_contract === true) {
      assertions.push(openAIToolStreamContractAssertion(result, expect));
    }
    // usage chunk 形态：openai_dedicated = 独立 usage chunk 且在 [DONE] 前
    if (expect.stream_usage_chunk_shape) {
      assertions.push(...streamUsageChunkShapeAssertion(result.raw, expect.stream_usage_chunk_shape));
    }
    // usage 在流中出现/禁止出现
    if (expect.stream_usage_in_sse) {
      assertions.push(...streamUsageInSSEAssertion(result.raw, expect.stream_usage_in_sse));
    }
    // 增量指标：chunk 数量下限（stream_incremental = min_sse_chunks=2 + min_content_chunks=2 快捷开关）
    const effMinSSE = expect.min_sse_chunks > 0 ? expect.min_sse_chunks : expect.stream_incremental === true ? 2 : 0;
    const effMinContent = expect.min_content_chunks > 0 ? expect.min_content_chunks : expect.stream_incremental === true ? 2 : 0;
    if (effMinSSE > 0 || effMinContent > 0) {
      assertions.push(...sseMetricsAssertions(result.raw, { min_sse_chunks: effMinSSE, min_content_chunks: effMinContent }));
    }
    return assertions;
  }

  // JSON 响应断言
  if (body !== null && typeof body === "object") {
    const reqFields = stringSlice(expect.required_response_fields);
    if (reqFields.length > 0) {
      const missing = missingFields(body, reqFields);
      assertions.push({ name: "required_response_fields", pass: missing.length === 0, message: missing.length === 0 ? "通过" : "缺少字段：" + missing.join(", ") });
    }
    if (isMessagesResponse(body) && reqFields.length === 0) {
      const missing = missingFields(body, ["id", "type", "role", "content", "model"]);
      assertions.push({ name: "messages_required_response_fields", pass: missing.length === 0, message: missing.length === 0 ? "通过" : "缺少字段：" + missing.join(", ") });
    }
    if (Array.isArray(body.choices) && body.choices.length > 0) {
      const choiceFields = stringSlice(expect.choice_required_fields);
      if (choiceFields.length > 0) {
        assertions.push(nestedRequiredFieldsAssertion("choice_required_fields", body, ["choices"], choiceFields));
      } else {
        assertions.push(nestedRequiredFieldsAssertion("choice_required_fields", body, ["choices"], ["index", "message", "finish_reason"]));
      }
      if (body.usage !== undefined) {
        const usageFields = stringSlice(expect.usage_required_fields);
        if (usageFields.length > 0) {
          assertions.push(nestedRequiredFieldsAssertion("usage_required_fields", body, ["usage"], usageFields));
        } else {
          assertions.push(nestedRequiredFieldsAssertion("usage_required_fields", body, ["usage"], ["prompt_tokens", "completion_tokens", "total_tokens"]));
        }
      }
    }
    // finish_reason 取值校验（chat）：choices[].finish_reason 必须在 allowed_finish_reasons 内
    const allowedFinish = stringSlice(expect.allowed_finish_reasons);
    if (allowedFinish.length > 0) {
      const finishVals = responseValuesAtPath(body, "choices[].finish_reason").filter((v) => typeof v === "string");
      const bad = finishVals.filter((v) => !allowedFinish.includes(v));
      if (bad.length > 0) {
        assertions.push({ name: "allowed_finish_reasons", pass: false, message: `finish_reason 不在允许范围内: ${[...new Set(bad)].join(", ")}` });
      }
      // messages：stop_reason 非 null 时必须在 allowed 内
      if (body && typeof body === "object" && body.stop_reason !== undefined && body.stop_reason !== null && typeof body.stop_reason === "string" && !allowedFinish.includes(body.stop_reason)) {
        assertions.push({ name: "allowed_finish_reasons", pass: false, message: `stop_reason 不在允许范围内: ${body.stop_reason}` });
      }
    }
    const contentFields = stringSlice(expect.content_required_fields);
    if (contentFields.length > 0) {
      assertions.push(contentBlockRequiredFieldsAssertion("content_required_fields", body, contentFields));
    }
    if (expect.tool_calls_contract === true) {
      assertions.push(toolCallsContractAssertion(result, expect));
    }
    for (const [name, paths] of [
      ["required_response_paths", stringSlice(expect.required_response_paths)],
      ["required_response_paths", stringSlice(expect.additional_required_response_paths)],
    ]) {
      if (paths.length > 0) {
        const missing = paths.filter((p) => responseValuesAtPath(body, p).length === 0);
        assertions.push({ name, pass: missing.length === 0, message: missing.length === 0 ? "通过" : "缺少路径：" + missing.join(", ") });
      }
    }
    const nonEmptyPaths = stringSlice(expect.response_non_empty_paths);
    if (nonEmptyPaths.length > 0) {
      // 与 Go responsePathsNonEmptyAssertion 一致：值必须是 trim 后非空的字符串
      const invalid = [];
      for (const p of nonEmptyPaths) {
        const vals = responseValuesAtPath(body, p);
        if (vals.length === 0) {
          invalid.push(p + " 不存在");
          continue;
        }
        for (const v of vals) {
          if (typeof v !== "string" || v.trim() === "") {
            invalid.push(p + " 为空或不是字符串");
            break;
          }
        }
      }
      assertions.push({ name: "response_non_empty_paths", pass: invalid.length === 0, message: invalid.length === 0 ? "通过" : invalid.join("；") });
    }
    for (const [name, map] of [
      ["response_path_types", expect.response_path_types],
      ["response_path_types", expect.additional_response_path_types],
    ]) {
      if (map && typeof map === "object" && Object.keys(map).length > 0) {
        const mismatches = [];
        for (const [p, t] of Object.entries(map)) {
          const vals = responseValuesAtPath(body, p);
          if (vals.length === 0 || vals.some((v) => !responseValueHasType(v, t))) mismatches.push(`${p} 类型≠${t}`);
        }
        assertions.push({ name, pass: mismatches.length === 0, message: mismatches.join("；") || "通过" });
      }
    }
    for (const [name, map] of [
      ["response_path_values", expect.response_path_values],
      ["response_path_values", expect.additional_response_path_values],
    ]) {
      if (map && typeof map === "object" && Object.keys(map).length > 0) {
        const mismatches = [];
        for (const [p, v] of Object.entries(map)) {
          const vals = responseValuesAtPath(body, p);
          if (vals.length === 0 || vals.some((x) => !responseValueEquals(x, v))) mismatches.push(`${p} 实际≠期望`);
        }
        assertions.push({ name, pass: mismatches.length === 0, message: mismatches.join("；") || "通过" });
      }
    }
    const numericMinimums = expect.response_numeric_minimums;
    if (numericMinimums && typeof numericMinimums === "object" && Object.keys(numericMinimums).length > 0) {
      const mismatches = [];
      for (const [p, min] of Object.entries(numericMinimums)) {
        const vals = responseValuesAtPath(body, p);
        if (vals.length === 0 || vals.some((v) => typeof v !== "number" || v < min)) mismatches.push(`${p} 实际值过小`);
      }
      assertions.push({ name: "response_numeric_minimums", pass: mismatches.length === 0, message: mismatches.join("；") || "通过" });
    }
    const arrayMinItems = expect.response_array_min_items;
    if (arrayMinItems && typeof arrayMinItems === "object" && Object.keys(arrayMinItems).length > 0) {
      const mismatches = [];
      for (const [p, min] of Object.entries(arrayMinItems)) {
        const vals = responseValuesAtPath(body, p);
        if (vals.length === 0 || vals.some((v) => !Array.isArray(v) || v.length < min)) mismatches.push(`${p} 数组长度不足 ${min}`);
      }
      assertions.push({ name: "response_array_min_items", pass: mismatches.length === 0, message: mismatches.join("；") || "通过" });
    }
    if (expect.usage_total_matches === true) {
      const u = body.usage;
      const pass = u && typeof u.prompt_tokens === "number" && typeof u.completion_tokens === "number" && typeof u.total_tokens === "number" && u.prompt_tokens + u.completion_tokens === u.total_tokens;
      assertions.push({ name: "usage_total_matches", pass, message: "usage.total_tokens 应等于 prompt+completion" });
    }
    if (expect.content_should_parse_as_json === true) {
      const content = assistantContent(body);
      let pass = false;
      if (content !== undefined) {
        try { JSON.parse(content); pass = true; } catch { pass = false; }
      }
      assertions.push({ name: "content_should_parse_as_json", pass, message: "assistant content 应为合法 JSON 字符串" });
      // 解析后对象级断言（parsed_content_*）：复刻 Go content_should_parse_as_json 之后的扩展契约
      let parsedObj = null;
      if (content !== undefined) {
        try {
          const v = JSON.parse(content);
          if (v !== null && typeof v === "object") parsedObj = v;
        } catch {}
      }
      const parsedPaths = stringSlice(expect.parsed_content_required_paths);
      if (parsedPaths.length > 0) {
        const missing = parsedObj ? parsedPaths.filter((p) => responseValuesAtPath(parsedObj, p).length === 0) : parsedPaths;
        assertions.push({
          name: "parsed_content_required_paths",
          pass: parsedObj !== null && missing.length === 0,
          message: parsedObj === null ? "assistant content 无法解析为 JSON 对象" : "解析后缺少路径：" + missing.join(", "),
        });
      }
      for (const [name, map] of [
        ["parsed_content_path_types", expect.parsed_content_path_types],
        ["parsed_content_path_values", expect.parsed_content_path_values],
      ]) {
        if (!map || typeof map !== "object" || Object.keys(map).length === 0) continue;
        const mismatches = [];
        if (parsedObj === null) {
          mismatches.push("assistant content 无法解析为 JSON 对象");
        } else {
          for (const [p, expected] of Object.entries(map)) {
            const vals = responseValuesAtPath(parsedObj, p);
            if (vals.length === 0) mismatches.push(`${p} 不存在`);
            else if (name === "parsed_content_path_types" && vals.some((v) => !responseValueHasType(v, expected))) mismatches.push(`${p} 类型≠${expected}`);
            else if (name === "parsed_content_path_values" && vals.some((x) => !responseValueEquals(x, expected))) mismatches.push(`${p} 实际≠期望`);
          }
        }
        assertions.push({ name, pass: mismatches.length === 0, message: mismatches.join("；") || "通过" });
      }
    }
    if (expect.assistant_content_non_empty === true) {
      const content = assistantContent(body);
      assertions.push({ name: "assistant_content_non_empty", pass: content !== undefined && content.trim() !== "", message: "预期 assistant 文本内容为非空字符串" });
    }
    if (expect.assistant_content_contains) {
      const content = assistantContent(body);
      assertions.push({ name: "assistant_content_contains", pass: content !== undefined && content.includes(expect.assistant_content_contains), message: `预期 assistant 文本内容包含 ${JSON.stringify(expect.assistant_content_contains)}` });
    }
    if (expect.assistant_content_starts_with) {
      const content = assistantContent(body);
      assertions.push({ name: "assistant_content_starts_with", pass: content !== undefined && content.trim().startsWith(expect.assistant_content_starts_with), message: `预期 assistant 文本以 ${JSON.stringify(expect.assistant_content_starts_with)} 开头` });
    }
    // thinking 证据检查（与 Go thinkingLocations/thinkingTokenEvidence 语义一致）
    if (expect.thinking_required === true || expect.thinking_evidence_required === true || expect.thinking_absent === true) {
      const ev = thinkingEvidence(body);
      const hasLocation = ev.locations.length > 0;
      const hasToken = ev.tokens.length > 0;
      if (expect.thinking_required === true) {
        assertions.push({
          name: "thinking_required",
          pass: hasLocation,
          message: "预期响应包含 reasoning/thinking 内容位置",
        });
      }
      if (expect.thinking_evidence_required === true) {
        assertions.push({
          name: "thinking_evidence_required",
          pass: hasLocation || hasToken,
          message: "未探测到 thinking 内容位置或 reasoning/thinking token 证据",
        });
      }
      if (expect.thinking_absent === true) {
        assertions.push({
          name: "thinking_absent",
          pass: !hasLocation && !hasToken,
          message: "预期不包含 thinking 内容或 reasoning/thinking token 证据",
        });
      }
    }
    if (expect.reasoning_tokens_min !== undefined || expect.reasoning_tokens_max !== undefined) {
      const rt = responseValuesAtPath(body, "usage.completion_tokens_details.reasoning_tokens");
      const val = typeof rt[0] === "number" ? rt[0] : undefined;
      const pass = val !== undefined && (expect.reasoning_tokens_min === undefined || val >= expect.reasoning_tokens_min) && (expect.reasoning_tokens_max === undefined || val <= expect.reasoning_tokens_max);
      assertions.push({ name: "reasoning_tokens_range", pass, message: `reasoning_tokens=${val} 预期在 [${expect.reasoning_tokens_min ?? "-"}, ${expect.reasoning_tokens_max ?? "-"}]` });
    }
  }
  return assertions;
}

// 复刻 supportConclusion + finalizeSupportConclusion
function expectedSupportConclusion(expect) {
  if (typeof expect.support_conclusion === "string" && expect.support_conclusion !== "") return expect.support_conclusion;
  if ((expect.http_status ?? 0) >= 400) return "rejected_400";
  return "supported";
}

function supportConclusion(httpStatus, err, expect) {
  if (err || httpStatus === 0) return "request_failed";
  const expected = expectedSupportConclusion(expect);
  if (expected === "permission_limited" && (httpStatus === 403 || httpStatus === 429)) return "permission_limited";
  if (httpStatus >= 200 && httpStatus < 300) {
    if (["rejected_400", "ignored", "permission_limited"].includes(expected)) return "ignored";
    return "supported";
  }
  if (httpStatus === 400 || httpStatus === 422) return "rejected_400";
  if (httpStatus >= 400) return "request_failed";
  return "supported";
}

function finalizeSupportConclusion(result, expect) {
  const conclusion = supportConclusion(result.status ?? 0, result.error, expect);
  if (conclusion === "supported" && result.assertions?.some((a) => a.name !== "http_status" && !a.pass)) {
    return "schema_mismatch";
  }
  return conclusion;
}

// ---------- Agent 断言与用例执行 ----------

function evaluateAgentAssertions(result, expect, workDir) {
  const assertions = [];
  const exitCode = result.exitCode ?? -1;

  if (expect.exit_code !== undefined) {
    assertions.push({ name: "exit_code", pass: exitCode === expect.exit_code, message: `预期 exit code ${expect.exit_code}，实际 ${exitCode}` });
  }
  if (expect.no_error === true) {
    assertions.push({ name: "no_error", pass: !result.error, message: result.error ? "agent 执行出错：" + result.error : "通过" });
  }
  if (expect.output_non_empty === true) {
    assertions.push({ name: "output_non_empty", pass: typeof result.text === "string" && result.text.trim() !== "", message: result.text?.trim() ? "通过" : "agent 输出为空" });
  }
  if (expect.json_result_success === true) {
    const ok = result.resultJson?.is_error === false;
    assertions.push({ name: "json_result_success", pass: ok, message: ok ? "通过" : "claude result.is_error 不为 false" });
  }
  if (expect.ndjson_text_event === true) {
    const hasText = Array.isArray(result.events) && result.events.some((e) => e.type === "text" && typeof e.part?.text === "string" && e.part.text.trim() !== "");
    assertions.push({ name: "ndjson_text_event", pass: hasText, message: hasText ? "通过" : "NDJSON 事件流中无 text 事件" });
  }
  if (typeof expect.output_contains === "string" && expect.output_contains !== "") {
    assertions.push({ name: "output_contains", pass: String(result.text ?? "").includes(expect.output_contains), message: `预期输出包含 ${JSON.stringify(expect.output_contains)}，实际输出：${String(result.text ?? "").slice(0, 200)}` });
  }
  if (expect.output_contains_any && Array.isArray(expect.output_contains_any)) {
    const matched = expect.output_contains_any.filter((s) => String(result.text ?? "").includes(s));
    assertions.push({ name: "output_contains_any", pass: matched.length > 0, message: `预期输出包含以下任一：${expect.output_contains_any.join(" / ")}，实际输出：${String(result.text ?? "").slice(0, 200)}` });
  }
  // 运行后文件断言（需 workDir：工具类 agent 测试——改代码/建文件等）
  if (workDir) {
    const created = Array.isArray(expect.file_created) ? expect.file_created : [];
    if (created.length > 0) {
      const missing = created.filter((p) => !fs.existsSync(path.join(workDir, p)));
      assertions.push({ name: "file_created", pass: missing.length === 0, message: missing.length === 0 ? "通过" : "预期创建的文件不存在：" + missing.join(", ") });
    }
    const contentChecks = Array.isArray(expect.file_content_contains) ? expect.file_content_contains : [];
    if (contentChecks.length > 0) {
      const fails = [];
      for (const { path: p, contains } of contentChecks) {
        const fp = path.join(workDir, p);
        if (!fs.existsSync(fp)) { fails.push(`${p} 不存在`); continue; }
        const content = fs.readFileSync(fp, "utf8");
        if (!content.includes(contains)) fails.push(`${p} 未包含 ${JSON.stringify(contains)}`);
      }
      assertions.push({ name: "file_content_contains", pass: fails.length === 0, message: fails.length === 0 ? "通过" : fails.join("；") });
    }
    const notContentChecks = Array.isArray(expect.file_content_not_contains) ? expect.file_content_not_contains : [];
    if (notContentChecks.length > 0) {
      const fails = [];
      for (const { path: p, contains } of notContentChecks) {
        const fp = path.join(workDir, p);
        if (!fs.existsSync(fp)) { fails.push(`${p} 不存在`); continue; }
        const content = fs.readFileSync(fp, "utf8");
        if (content.includes(contains)) fails.push(`${p} 不应包含 ${JSON.stringify(contains)}`);
      }
      assertions.push({ name: "file_content_not_contains", pass: fails.length === 0, message: fails.length === 0 ? "通过" : fails.join("；") });
    }
  }
  return assertions;
}

function agentSupportConclusion(result, expect) {
  if (result.error || result.exitCode !== 0) return "request_failed";
  if (result.assertions?.some((a) => !a.pass)) return "schema_mismatch";
  return "supported";
}

// 运行单个 agent 用例（含复跑：非确定性失败重试至多 3 次）
async function runAgentCaseWithRetry(ctx, tc) {
  const agentName = tc.agent;
  const adapter = agentConfigFor(agentName, {});
  if (!adapter) return { ...tc, error: `未知 agent：${agentName}` };
  const model = ctx.model || tc.model || ctx.manifest.default_model || "";

  // 临时工作目录：opencode / kilo 在此写项目级配置文件，claude 也在此运行
  const workDir = fs.mkdtempSync(path.join(requireOsTmpdir(), "noctua-agent-"));
  const attempts = [];
  let last = null;
  try {
    // 预置文件：模拟真实项目（改代码/读代码/工具调用场景）
    for (const sf of tc.setup_files ?? []) {
      const fp = path.join(workDir, sf.path);
      fs.mkdirSync(path.dirname(fp), { recursive: true });
      fs.writeFileSync(fp, sf.content);
    }

    for (let attempt = 1; attempt <= 3; attempt++) {
      const spec = spawnAgentRun({
        agentName,
        baseURL: ctx.baseURL,
        apiKey: ctx.apiKey,
        model,
        prompt: tc.prompt,
        args: tc.args,
        timeoutMs: ctx.timeoutMs,
        dryRun: ctx.dryRun,
        workDir,
      });

      if (ctx.dryRun) {
        return { ...tc, agent: agentName, dryRun: true, command: spec.command, requestHeaders: spec.env, responseHeaders: spec.configFile ? { config: spec.configFile } : {}, endpointURL: spec.command, setup_files: tc.setup_files ?? [] };
      }

      const run = await executeAgentRun(spec, ctx.timeoutMs);
      const parsed = adapter.parseOutput(run.stdout, run.stderr);
      const result = {
        case_id: tc.case_id,
        file: tc.file,
        title: tc.title,
        category: tc.category,
        agent: agentName,
        model,
        status: run.code, // 与 HTTP 用例共用渲染字段：显示 exit code
        parameters: [agentName, ...(tc.parameters ?? [])],
        exitCode: run.code,
        latencyMs: run.latencyMs,
        error: run.error || parsed.error,
        text: parsed.text,
        events: parsed.events,
        resultJson: parsed.resultJson,
        extras: parsed.extras,
        raw: run.stdout,
        stderr: run.stderr,
        expect: tc.expect,
      };
      result.assertions = evaluateAgentAssertions(result, tc.expect, workDir);
      result.supportConclusion = agentSupportConclusion(result, tc.expect);
      const failed = result.error !== undefined || result.assertions.some((a) => !a.pass);
      attempts.push({ attempt, exitCode: result.exitCode, latencyMs: result.latencyMs, conclusion: result.supportConclusion, failed });
      last = result;
      if (!failed) {
        if (attempt > 1) {
          result.reproVerdict = "flaky_recovered";
          result.attempts = attempts;
        }
        return result;
      }
      if (attempt < 3) {
        // 上游限流（429）时等待更久再重试，避免连续触发
        const rateLimited = /rate\s*limit|429|too\s*many\s*requests/i.test(String(result.error ?? "") + " " + String(result.raw ?? ""));
        await new Promise((r) => setTimeout(r, rateLimited ? attempt * 15000 : attempt * 800));
      }
    }
    last.reproVerdict = "consistent";
    last.attempts = attempts;
    return last;
  } finally {
    try { fs.rmSync(workDir, { recursive: true, force: true }); } catch {}
  }
}

function requireOsTmpdir() {
  return process.env.TMPDIR || "/tmp";
}

// ---------- 单个用例执行（带复跑）----------

async function runCaseWithRetry(ctx, tc) {
  const body = { ...(tc.payload ?? {}) };
  if (ctx.model) body.model = ctx.model;

  const caseBaseURL = tc.base_url?.trim() || ctx.baseURL;
  const endpointURL = buildEndpointURL(caseBaseURL, ctx.manifest.endpoint);

  const attempts = [];
  let last = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const resp = await sendRequest({ endpointURL, apiKey: ctx.apiKey, manifest: ctx.manifest, tc, body, timeoutMs: ctx.timeoutMs, dryRun: ctx.dryRun, verbose: ctx.verbose });
    if (ctx.dryRun) return { ...tc, dryRun: true, endpointURL, requestBody: body, requestHeaders: resp.headers };

    const result = {
      case_id: tc.case_id,
      file: tc.file,
      title: tc.title,
      category: tc.category,
      parameters: tc.parameters,
      optional: tc.optional,
      requiresModelCapability: tc.requires_model_capability,
      requestBody: body,
      endpointURL,
      status: resp.status ?? 0,
      latencyMs: resp.latencyMs,
      error: resp.error,
      raw: resp.raw,
      body: resp.body,
      responseHeaders: resp.responseHeaders,
      expect: tc.expect,
    };
    result.assertions = evaluateAssertions(result, tc.expect);
    result.supportConclusion = finalizeSupportConclusion(result, tc.expect);
    const failed = result.error !== undefined || result.assertions.some((a) => !a.pass);
    attempts.push({ attempt, status: result.status, latencyMs: result.latencyMs, conclusion: result.supportConclusion, failed });
    last = result;
    if (!failed) {
      if (attempt > 1) {
        result.reproVerdict = "flaky_recovered";
        result.attempts = attempts;
      }
      return result;
    }
    if (attempt < 3) await new Promise((r) => setTimeout(r, attempt * 800));
  }
  last.reproVerdict = "consistent";
  last.attempts = attempts;
  return last;
}

// ---------- 展示层：三层信息架构 ----------
// ① 运行概要（结论聚合）→ ② 参数兼容性矩阵 → ③ case 明细（异常置顶 / --list 全量）

const CONCLUSION_LABEL = {
  supported: "✅ 支持",
  ignored: "⚪ 忽略",
  rejected_400: "❌ 拒绝",
  schema_mismatch: "🔴 异常",
  request_failed: "⛔ 请求失败",
  permission_limited: "🔒 受限",
};

const CONCLUSION_MEANING = {
  supported: "参数被接受并正常生效",
  ignored: "接受但无效果（参数被静默吞掉）",
  rejected_400: "明确报错拒绝（400/422）",
  schema_mismatch: "响应结构与协议不符",
  request_failed: "请求失败（网络/5xx）",
  permission_limited: "权限/额度受限（403/429）",
};

const CONCLUSION_ORDER = ["supported", "ignored", "rejected_400", "schema_mismatch", "request_failed", "permission_limited"];

function conclusionColor(c) {
  switch (c) {
    case "supported": return chalk.green;
    case "ignored": return chalk.yellow;
    case "rejected_400": return chalk.red;
    case "schema_mismatch": return chalk.redBright.bold;
    case "request_failed": return chalk.redBright;
    case "permission_limited": return chalk.magenta;
    default: return chalk.white;
  }
}

function conclusionLabel(c) {
  return CONCLUSION_LABEL[c] ?? c;
}

// case 可信度标注：让用户区分「真事故」与「case 自身限制」
function caseMarks(r) {
  const marks = [];
  if (r.optional === true) marks.push("◇可选能力");
  if (r.requiresModelCapability) marks.push(`◇需${r.requiresModelCapability}`);
  if (r.expect?.doc_support === "undocumented" || r.expect?.undocumented_scenario) marks.push("◇文档未声明");
  return marks;
}

// 与预期一致 = 无错误 && 断言全过 && 实际结论 == 预期结论
function resultConsistent(r) {
  if (r.error !== undefined) return false;
  if (!r.assertions?.every((a) => a.pass)) return false;
  return r.supportConclusion === expectedSupportConclusion(r.expect);
}

function aggregateConclusions(results) {
  const counts = {};
  for (const r of results) {
    if (r.dryRun) continue;
    counts[r.supportConclusion] = (counts[r.supportConclusion] ?? 0) + 1;
  }
  return counts;
}

// 按参数聚合，异常(与预期不符)的参数置顶
function buildMatrix(results) {
  const entries = new Map();
  for (const r of results) {
    if (r.dryRun) continue;
    const params = r.parameters?.length ? r.parameters : ["(无参数声明)"];
    for (const p of params) {
      if (!entries.has(p)) entries.set(p, { param: p, conclusions: new Map(), statuses: new Set(), expected: new Set(), total: 0, mismatches: 0 });
      const e = entries.get(p);
      e.conclusions.set(r.supportConclusion, (e.conclusions.get(r.supportConclusion) ?? 0) + 1);
      e.statuses.add(r.status);
      e.expected.add(expectedSupportConclusion(r.expect));
      e.total++;
      if (!resultConsistent(r)) e.mismatches++;
    }
  }
  const rows = [...entries.values()].map((e) => {
    let primary = null;
    let primaryCount = -1;
    for (const [c, n] of e.conclusions) {
      if (n > primaryCount) {
        primary = c;
        primaryCount = n;
      }
    }
    return {
      param: e.param,
      conclusion: e.conclusions.size === 1 ? primary : "mixed",
      statusText: e.statuses.size === 1 ? [...e.statuses][0] : "-",
      expectedText: e.expected.size === 1 ? [...e.expected][0] : "-",
      total: e.total,
      mismatches: e.mismatches,
    };
  });
  return rows.sort((a, b) => b.mismatches - a.mismatches || a.param.localeCompare(b.param));
}

function renderSummary(results, meta) {
  const counts = aggregateConclusions(results);
  const parts = CONCLUSION_ORDER.filter((c) => counts[c]).map((c) => conclusionColor(c)(`${conclusionLabel(c)} ${counts[c]}`));
  const mismatchCount = results.filter((r) => !r.dryRun && !resultConsistent(r)).length;
  const warn = mismatchCount > 0 ? chalk.redBright(`⚠️  ${mismatchCount} 与预期不符`) : chalk.green("✓ 全部与预期一致");
  const totalMs = results.reduce((s, r) => s + (r.latencyMs ?? 0), 0);
  console.log(chalk.bold(`\n${chalk.cyan(meta.provider)} @ ${chalk.cyan(meta.endpoint_url)}`));
  console.log(`模型: ${meta.modelLabel}   用例: ${meta.total}/${meta.totalAll}   dry-run: ${meta.dryRun ? "是" : "否"}`);
  console.log(parts.length ? parts.join(" · ") : chalk.gray("(无结果)") + "   " + warn + `   耗时 ${(totalMs / 1000).toFixed(1)}s`);
}

function renderMatrix(matrix) {
  if (matrix.length === 0) return;
  const table = new Table({
    head: ["参数", "结论", "HTTP", "预期", "一致性", "#"],
    colWidths: [18, 10, 6, 12, 8, 4],
    style: { head: ["cyan"], border: ["gray"] },
  });
  for (const row of matrix) {
    const conclusionCell = row.conclusion === "mixed" ? chalk.yellow("🔀 混合") : conclusionColor(row.conclusion)(conclusionLabel(row.conclusion));
    table.push([
      row.param,
      conclusionCell,
      String(row.statusText),
      row.expectedText,
      row.mismatches > 0 ? chalk.redBright("⚠ 不符") : chalk.green("✓"),
      String(row.total),
    ]);
  }
  console.log(chalk.bold("\n参数兼容性矩阵"));
  console.log(table.toString());
}

function renderMismatchDetail(results, verbose) {
  const bad = results.filter((r) => !r.dryRun && !resultConsistent(r));
  if (bad.length === 0) return;
  const table = new Table({
    head: ["#", "Case", "预期", "实际 HTTP", "实际结论", "原因"],
    colWidths: [4, 30, 12, 10, 16, 46],
    style: { head: ["redBright"], border: ["gray"] },
  });
  bad.forEach((r, i) => {
    const expected = expectedSupportConclusion(r.expect);
    const fails = r.assertions?.filter((a) => !a.pass).map((a) => `${a.name}: ${a.message}`) ?? [];
    const reason = [r.error, ...fails].filter(Boolean).join("；");
    table.push([i + 1, r.file, expected, String(r.status ?? "-"), conclusionColor(r.supportConclusion)(conclusionLabel(r.supportConclusion)), reason.slice(0, 60) || "-"]);
  });
  console.log(chalk.bold(`\n⚠️  与预期不符（${bad.length}）`));
  console.log(table.toString());
  if (verbose) {
    for (const r of bad) {
      if (r.raw) console.log(chalk.gray(`  ${r.file} 响应: ${String(r.raw).slice(0, 500)}`));
    }
  }
}

function renderCaseList(results) {
  const table = new Table({
    head: ["#", "Case", "参数", "HTTP", "耗时", "预期结论", "实际结论", "一致"],
    colWidths: [4, 36, 14, 6, 8, 14, 14, 6],
    style: { head: ["cyan"], border: ["gray"] },
  });
  results.forEach((r, i) => {
    if (r.dryRun) {
      table.push([i + 1, r.file, "-", "-", "-", "-", "-", chalk.yellow("DRY")]);
      return;
    }
    const marks = caseMarks(r).join(" ");
    const cell = `${r.file}\n${r.title}${marks ? " " + chalk.gray(marks) : ""}`;
    table.push([
      i + 1,
      cell,
      (r.parameters ?? []).join(",") || "-",
      String(r.status ?? "-"),
      `${r.latencyMs}ms`,
      expectedSupportConclusion(r.expect),
      conclusionColor(r.supportConclusion)(conclusionLabel(r.supportConclusion)),
      resultConsistent(r) ? chalk.green("✓") : chalk.redBright("⚠"),
    ]);
  });
  console.log(chalk.bold("\nCase 明细"));
  console.log(table.toString());
}

function escapeMd(value) {
  return String(value ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function writeMarkdownReport(results, outputPath, meta) {
  const counts = aggregateConclusions(results);
  const matrix = buildMatrix(results);
  const mismatches = results.filter((r) => !r.dryRun && !resultConsistent(r));
  const totalMs = results.reduce((s, r) => s + (r.latencyMs ?? 0), 0);
  const lines = [];

  lines.push("# Noctua 兼容性测试报告");
  lines.push("");
  lines.push(`**渠道**: \`${meta.provider}\` @ \`${meta.endpoint_url}\``);
  lines.push(`**模型**: ${meta.modelLabel} · **用例**: ${meta.total}/${meta.totalAll} · **耗时**: ${(totalMs / 1000).toFixed(1)}s`);
  lines.push(`**时间**: ${new Date().toLocaleString("zh-CN", { hour12: false })}`);
  lines.push("");

  lines.push("## 结论聚合");
  lines.push("");
  lines.push("| 结论 | 数量 | 含义 |");
  lines.push("|---|---|---|");
  for (const c of CONCLUSION_ORDER) {
    if (counts[c]) lines.push(`| ${conclusionLabel(c)} | ${counts[c]} | ${CONCLUSION_MEANING[c] ?? ""} |`);
  }
  if (mismatches.length > 0) lines.push(`| ⚠️ 与预期不符 | ${mismatches.length} | 实测结论/断言与 case 预期不一致 |`);
  lines.push("");

  lines.push("## 兼容性矩阵（按参数）");
  lines.push("");
  if (matrix.length === 0) {
    lines.push("（无结果）");
  } else {
    lines.push("| 参数 | 结论 | HTTP | 预期 | 一致性 | 用例数 |");
    lines.push("|---|---|---|---|---|---|");
    for (const row of matrix) {
      lines.push(`| ${row.param} | ${row.conclusion === "mixed" ? "🔀 混合" : conclusionLabel(row.conclusion)} | ${row.statusText} | ${row.expectedText} | ${row.mismatches > 0 ? "⚠️ 不符" : "✓"} | ${row.total} |`);
    }
  }
  lines.push("");

  lines.push("## 异常明细（与预期不符）");
  lines.push("");
  if (mismatches.length === 0) {
    lines.push("无。");
  } else {
    lines.push("| Case | 标题 | 预期 | 实际 HTTP | 实际结论 | 原因 |");
    lines.push("|---|---|---|---|---|---|");
    for (const r of mismatches) {
      const expected = expectedSupportConclusion(r.expect);
      const fails = r.assertions?.filter((a) => !a.pass).map((a) => `${a.name}: ${a.message}`) ?? [];
      const reason = [r.error, ...fails].filter(Boolean).join("；") || "-";
      lines.push(`| ${r.file} | ${escapeMd(r.title)} | ${expected} | ${r.status ?? "-"} | ${r.supportConclusion} | ${escapeMd(reason)} |`);
    }
  }
  lines.push("");

  lines.push("## Case 明细");
  lines.push("");
  lines.push("| # | Case | 标题 | 参数 | HTTP | 耗时 | 预期 | 实际 | 一致 |");
  lines.push("|---|---|---|---|---|---|---|---|---|");
  results.forEach((r, i) => {
    if (r.dryRun) {
      lines.push(`| ${i + 1} | ${r.file} | dry-run | - | - | - | - | - | - |`);
      return;
    }
    const marks = caseMarks(r).join(" ");
    lines.push(
      `| ${i + 1} | ${r.file} | ${escapeMd(r.title)}${marks ? " " + marks : ""} | ${(r.parameters ?? []).join(", ") || "-"} | ${r.status ?? "-"} | ${r.latencyMs}ms | ${expectedSupportConclusion(r.expect)} | ${r.supportConclusion} | ${resultConsistent(r) ? "✓" : "⚠️"} |`
    );
  });
  lines.push("");

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, lines.join("\n"));
  return outputPath;
}

// 人工 review 证据文档：每个 case 的输入 curl + 原始输出（SSE/JSON 全量）+ 标题
function writeEvidenceReport(results, outputPath, meta) {
  const lines = [];
  lines.push(`# ${meta.provider} 渠道测试证据`);
  lines.push("");
  lines.push(`> 端点: \`${meta.endpoint_url}\` · 模型: \`${meta.modelLabel}\` · 用例: ${meta.total} · 时间: ${new Date().toLocaleString("zh-CN", { hour12: false })}`);
  lines.push("");

  results.forEach((r, i) => {
    if (r.dryRun) return;
    const consistent = resultConsistent(r);
    lines.push(`---`);
    lines.push("");
    lines.push(`## ${i + 1}. ${r.file}`);
    lines.push(`**${r.title}**`);
    lines.push("");
    lines.push(`- HTTP: ${r.status ?? "-"} · 结论: ${r.supportConclusion} · 耗时: ${r.latencyMs}ms · ${consistent ? "✓ 与预期一致" : "⚠️ 与预期不符"}`);
    if (r.error) lines.push(`- 请求错误: ${r.error}`);
    lines.push("");
    lines.push("**请求**");
    lines.push("");
    lines.push("```bash");
    lines.push(`curl -sS ${r.method ?? "POST"} ${r.endpointURL}`);
    const isMessagesEP = String(r.endpointURL ?? "").includes("/messages");
    lines.push(`  -H 'Content-Type: application/json'`);
    lines.push(`  -H 'Accept: application/json, text/event-stream'`);
    if (isMessagesEP) lines.push(`  -H 'anthropic-version: 2023-06-01'`);
    lines.push(isMessagesEP ? `  -H 'X-Api-Key: <redacted>'` : `  -H 'Authorization: Bearer <redacted>'`);
    lines.push(`  -d '${JSON.stringify(r.requestBody)}'`);
    lines.push("```");
    lines.push("");
    lines.push(`**响应（原始${r.raw && r.raw.includes("data:") ? " SSE 流" : " JSON"}）**`);
    lines.push("");
    lines.push("```");
    lines.push(r.raw || JSON.stringify(r.body ?? {}, null, 2) || "(空)");
    lines.push("```");
    lines.push("");
  });

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, lines.join("\n"));
  return outputPath;
}

function writeReport(results, outputPath, meta) {
  const report = {
    ...meta,
    api_key_hint: maskAPIKey(meta.apiKey),
    started_at: new Date().toISOString(),
    summary: aggregateConclusions(results),
    mismatches: results.filter((r) => !r.dryRun && !resultConsistent(r)).map((r) => r.file),
    results: results.map((r) =>
      r.dryRun
        ? { file: r.file, dry_run: true, endpoint_url: r.endpointURL, request_body: r.requestBody, request_headers: r.requestHeaders }
        : {
            case_id: r.case_id,
            file: r.file,
            title: r.title,
            category: r.category,
            parameters: r.parameters,
            optional: r.optional,
            requires_model_capability: r.requiresModelCapability,
            http_status: r.status,
            latency_ms: r.latencyMs,
            expected_support_conclusion: expectedSupportConclusion(r.expect),
            support_conclusion: r.supportConclusion,
            consistent: resultConsistent(r),
            repro_verdict: r.reproVerdict,
            error: r.error,
            assertions: r.assertions,
            attempts: r.attempts,
            response_body: r.body,
            raw_response: String(r.raw ?? "").slice(0, 2000),
          }
    ),
  };
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  return outputPath;
}

// ---------- main ----------

const program = new Command();
program
  .name("noctua")
  .description("Noctua CLI — provider-diff V0.1 兼容性测试 CLI 版（demo）")
  .option("-p, --provider <name>", "provider 目录名（如 deepseek / siliconflow / claude_messages），默认 deepseek")
  .option("-k, --api-key <key>", "API Key（优先级：--api-key > 环境变量 > config.yaml）")
  .option("-u, --base-url <url>", "覆盖 provider 默认 Base URL")
  .option("-m, --model <model>", "覆盖 payload 中的 model")
  .option("-c, --cases <list>", "选择用例：all | 文件名/前缀，逗号分隔（如 010,060_tools_auto.json）；省略则交互多选")
  .option("-g, --category <name>", "按 category 过滤（如 sampling / tools / stream / length）")
  .option("-e, --endpoint-id <id>", "chat_completions（默认）| anthropic_messages（加载 *_messages 目录）| agent_test（加载 *_agents 目录）")
  .option("-a, --agents <list>", "agent 测试专用：按 agent 过滤（claude,opencode,kilo），逗号分隔")
  .option("-x, --config <path>", `config.yaml 路径，默认 ${DEFAULT_CONFIG}`)
  .option("-o, --output <path>", "JSON 报告输出路径", "outputs/noctua-cli-report.json")
  .option("--md [path]", "输出 Markdown 报告（可粘贴到飞书文档）；不给路径则写 outputs/noctua-cli-report.md")
  .option("--evidence [path]", "输出人工 review 证据文档（每 case 输入 curl + 原始输出）；不给路径则写 outputs/evidence/<provider>.md")
  .option("--variants <list>", "测试变体：json（仅非流）/ sse（额外 stream:true 变体）/ all（两者）。默认 json")
  .option("--list", "显示全部 case 明细（默认只显示矩阵 + 异常）")
  .option("-t, --timeout <ms>", "单请求超时（毫秒）", "90000")
  .option("--case-delay <ms>", "agent 测试：用例间固定间隔（毫秒），缓解上游限流", "3000")
  .option("-n, --concurrency <n>", "并发数（agent 测试默认 1，HTTP 测试默认 5）")
  .option("-l, --list-cases", "仅列出该 provider 的用例清单后退出")
  .option("--providers", "列出所有可用 provider 后退出")
  .option("--dry-run", "只打印请求，不真正发送")
  .option("-v, --verbose", "输出请求/响应详情")
  .showHelpAfterError();

program.parse(process.argv);
const opts = program.opts();

// providers 列表
if (opts.providers) {
  console.log("可用 provider：");
  for (const p of listProviders()) console.log("  " + chalk.cyan(p));
  process.exit(0);
}

const provider = opts.provider || "deepseek";
const isAgentTest = opts.endpointId === "agent_test";

let manifest, cases, dirName;
try {
  ({ manifest, cases, dirName } = loadManifest(provider, opts.endpointId));
} catch (err) {
  console.error(chalk.red(err.message));
  process.exit(1);
}

// 用例清单
if (opts.listCases) {
  console.log(chalk.cyan(`\nprovider: ${dirName}`));
  console.log(`默认模型: ${manifest.default_model ?? "-"}   endpoint: ${manifest.endpoint ?? "/chat/completions"}`);
  if (manifest.notes?.length) {
    for (const n of manifest.notes) console.log(chalk.gray(`  note: ${n}`));
  }
  const byCategory = {};
  for (const tc of cases) (byCategory[tc.category ?? "(none)"] ??= []).push(tc);
  for (const [cat, list] of Object.entries(byCategory)) {
    console.log(chalk.yellow(`\n[${cat}] ${list.length} 个用例`));
    for (const tc of list) {
      console.log(`  ${chalk.gray(tc.file.padEnd(46))} ${tc.title}`);
    }
  }
  console.log(`\n共 ${cases.length} 个用例。运行：node noctua.mjs -p ${provider} -k <api-key> --cases all`);
  process.exit(0);
}

// 解析 key / base url
const { apiKey, baseUrl } = resolveApiKeyAndBaseUrl({
  provider,
  apiKey: opts.apiKey,
  baseUrl: opts.baseUrl,
  configPath: opts.config,
});
if (!apiKey && !opts.dryRun) {
  console.error(chalk.red(`未提供 API Key。用 -k <key>，或设置环境变量 ${provider.toUpperCase().replace(/-/g, "_")}_API_KEY，或在 config.yaml 中配置 ${provider} 段。`));
  process.exit(1);
}

// 选择用例
let selected;
try {
  selected = selectCases(cases, {
    caseList: opts.cases,
    category: opts.category,
    interactive: !opts.cases && !opts.category,
  });
} catch (err) {
  console.error(chalk.red(err.message));
  process.exit(1);
}

// 流式变体：为每个 case 生成 stream:true 版本，断言 SSE 契约（内容/工具增量 + [DONE]）
function buildSseVariants(cases) {
  const variants = [];
  for (const tc of cases) {
    if (tc.payload?.stream === true) {
      variants.push({ ...tc, variant: "sse" });
      continue;
    }
    const payload = { ...(tc.payload ?? {}), stream: true };
    // 错误契约 case（预期非 200）响应非流，跳过流变体
    if ((tc.expect?.http_status ?? 200) >= 400) continue;
    const expect = { ...(tc.expect ?? {}) };
    expect.response_mode = "sse";
    expect.stream_done_required = true;
    const toolNames = stringSlice((payload.tools ?? []).map((t) => t?.function?.name).filter(Boolean));
    const hasTools = payload.tools !== undefined || payload.tool_choice !== undefined;
    const toolChoiceNone = payload.tool_choice === "none" || payload.tool_choice?.type === "none";
    if (hasTools && !toolChoiceNone) {
      // 工具流契约需要 usage chunk，主动请求 include_usage
      payload.stream_options = { include_usage: true, ...(payload.stream_options ?? {}) };
      expect.openai_tool_stream_contract = true;
      expect.stream_tool_call_min_count = 1;
      expect.usage_required_fields = ["prompt_tokens", "completion_tokens", "total_tokens"];
      if (toolNames.length) expect.stream_tool_required_names = toolNames;
      if (!expect.allowed_finish_reasons) expect.allowed_finish_reasons = ["stop", "length", "tool_calls"];
    } else {
      expect.min_content_chunks = 1;
    }
    expect.response_header_contains = { "content-type": "text/event-stream" };
    delete expect.assistant_content_non_empty;
    delete expect.assistant_content_contains;
    delete expect.content_should_parse_as_json;
    delete expect.parsed_content_required_paths;
    delete expect.parsed_content_path_types;
    delete expect.parsed_content_path_values;
    delete expect.thinking_evidence_required;
    delete expect.thinking_absent;
    if (!payload.stream_options?.include_usage) {
      delete expect.usage_required_fields;
    }
    variants.push({ ...tc, payload, expect, variant: "sse", title: tc.title + "（流式）", file: tc.file + "·stream" });
  }
  return variants;
}

const variantsArg = opts.variants ?? "json";
if (variantsArg === "sse" || variantsArg === "all") {
  const sseVariants = buildSseVariants(selected);
  if (variantsArg === "all") {
    selected = [...selected, ...sseVariants];
  } else {
    selected = sseVariants;
  }
}

// agent 测试专用：--agents 过滤
if (isAgentTest && opts.agents) {
  const wanted = String(opts.agents).split(",").map((s) => s.trim()).filter(Boolean);
  const filtered = selected.filter((tc) => wanted.includes(tc.agent));
  if (filtered.length === 0) {
    console.error(chalk.red(`没有匹配的 agent：${opts.agents}。可用：${[...new Set(cases.map((tc) => tc.agent))].join(", ")}`));
    process.exit(1);
  }
  selected = filtered;
}

// agent 测试：检测本机 agent 可用性，未安装的 agent 用例跳过（优雅降级，非 dry-run 才检测）
if (isAgentTest && !opts.dryRun) {
  const missingAgents = new Set();
  const runnable = selected.filter((tc) => {
    const adapter = AGENT_ADAPTERS[tc.agent];
    const ok = adapter && isExecutableAvailable(adapter.bin);
    if (!ok) missingAgents.add(tc.agent);
    return ok;
  });
  if (missingAgents.size > 0) {
    console.log(chalk.yellow(`未安装 agent：${[...missingAgents].join(", ")}，跳过 ${selected.length - runnable.length} 个用例。安装指引：node scripts/check-agents.mjs`));
  }
  selected = runnable;
  if (selected.length === 0) {
    console.error(chalk.red(`选中的 agent 均未安装，无法运行 agent 测试。请先运行 node scripts/check-agents.mjs 查看安装指引。`));
    process.exit(1);
  }
}

const baseURL = baseUrl || manifest.base_url || "";
const endpointURL = isAgentTest ? `agent-test:${baseURL || "(待注入 base_url)"}` : buildEndpointURL(baseURL, manifest.endpoint);
const ctx = {
  manifest,
  baseURL,
  apiKey,
  model: opts.model,
  timeoutMs: parseInt(opts.timeout, 10) || 90000,
  dryRun: opts.dryRun,
  verbose: opts.verbose,
};

console.log(chalk.cyan(`\nNoctua CLI — provider=${dirName}  endpoint=${endpointURL}`));
console.log(`模型: ${opts.model ?? "(payload 默认)"}   用例: ${selected.length}/${cases.length}   dry-run: ${opts.dryRun ? "是" : "否"}\n`);

if (opts.dryRun) {
  for (const tc of selected) {
    if (isAgentTest) {
      const model = opts.model || tc.model || manifest.default_model || "";
      const spec = spawnAgentRun({
        agentName: tc.agent,
        baseURL,
        apiKey,
        model,
        prompt: tc.prompt,
        args: tc.args,
        timeoutMs: ctx.timeoutMs,
        dryRun: true,
        workDir: "/tmp",
      });
      console.log(chalk.gray(`# ${tc.file} — ${tc.title}`));
      console.log(`  agent: ${tc.agent}   model: ${model}`);
      console.log(`  command: ${spec.command}`);
      if (spec.configFile) {
        const cfgName = typeof spec.configFile === "string" ? spec.configFile : spec.configFile.file;
        console.log(`  ${cfgName}: ${JSON.stringify(spec.configFile)}`);
      }
      continue;
    }
    const body = { ...(tc.payload ?? {}) };
    if (ctx.model) body.model = ctx.model;
    const caseBaseURL = tc.base_url?.trim() || baseURL;
    const headers = { "Content-Type": "application/json", Accept: "application/json, text/event-stream" };
    if (isAnthropicMessagesEndpoint(manifest)) headers["anthropic-version"] = "2023-06-01";
    headers[providerAuthHeader(manifest.provider)] = providerAuthHeader(manifest.provider) === "X-Api-Key" ? "<redacted>" : "Bearer <redacted>";
    for (const [k, v] of Object.entries(tc.headers ?? {})) {
      if (String(k).trim()) headers[k] = v;
    }
    console.log(chalk.gray(`# ${tc.file} — ${tc.title}`));
    console.log(`  ${tc.method ?? "POST"} ${buildEndpointURL(caseBaseURL, manifest.endpoint)}`);
    console.log(`  headers: ${JSON.stringify(headers)}`);
    console.log(`  body: ${JSON.stringify(body)}`);
  }
  console.log(chalk.green(`\n[DRY-RUN] ${selected.length} 个请求已打印，未发送。`));
  process.exit(0);
}

// 并发执行（agent 测试默认串行：opencode/kilo 共享全局 db，并发有锁冲突风险）
const concurrency = isAgentTest
  ? Math.min(Math.max(parseInt(opts.concurrency, 10) || 1, 1), 20)
  : Math.min(Math.max(parseInt(opts.concurrency, 10) || 5, 1), 20);
const results = new Array(selected.length);
let next = 0;
const workers = [];
for (let w = 0; w < Math.min(concurrency, selected.length); w++) {
  workers.push(
    (async () => {
      while (next < selected.length) {
        const i = next++;
        const tc = selected[i];
        const started = Date.now();
        const r = isAgentTest ? await runAgentCaseWithRetry(ctx, tc) : await runCaseWithRetry(ctx, tc);
        const pass = r.assertions?.every((a) => a.pass);
        const mark = r.error !== undefined || !pass ? chalk.red("✗") : chalk.green("✓");
        const statusText = isAgentTest ? `exit ${r.exitCode ?? "-"}` : String(r.status ?? "-");
        console.log(`${mark} [${String(i + 1).padStart(3)}/${selected.length}] ${tc.file}  ${statusText}  ${Date.now() - started}ms  ${r.supportConclusion}`);
        results[i] = r;
        // agent 测试串行执行时，用例间保持间隔，避免触发上游渠道限流
        if (isAgentTest && i < selected.length - 1 && opts.caseDelay) {
          await new Promise((res) => setTimeout(res, parseInt(opts.caseDelay, 10) || 0));
        }
      }
    })()
  );
}
await Promise.all(workers);

const meta = {
  provider: dirName,
  base_url: baseURL,
  endpoint_url: endpointURL,
  model: opts.model,
  modelLabel: opts.model ?? "(payload 默认)",
  total: selected.length,
  totalAll: cases.length,
  dryRun: false,
  apiKey,
};

// ① 运行概要（结论聚合）
renderSummary(results, meta);
// ② 参数兼容性矩阵（异常置顶）
renderMatrix(buildMatrix(results));
// ③ 异常明细（与预期不符，默认展示）
renderMismatchDetail(results, opts.verbose);
// ③' 全部 case 明细（--list 时才展示）
if (opts.list) renderCaseList(results);

// 产物：JSON + Markdown
const outputPath = writeReport(results, opts.output, meta);
console.log(chalk.gray(`\nJSON 报告: ${path.resolve(outputPath)}`));
if (opts.md !== undefined) {
  const mdPath = writeMarkdownReport(results, opts.md === true ? "outputs/noctua-cli-report.md" : opts.md, meta);
  console.log(chalk.gray(`Markdown 报告: ${path.resolve(mdPath)}`));
}
if (opts.evidence !== undefined) {
  const evPath = writeEvidenceReport(results, opts.evidence === true ? `outputs/evidence/${dirName}.md` : opts.evidence, meta);
  console.log(chalk.gray(`证据文档: ${path.resolve(evPath)}`));
}

const mismatchCount = results.filter((r) => !r.dryRun && !resultConsistent(r)).length;
console.log(
  chalk.cyan(`\n${results.length - mismatchCount}/${results.length} 与预期一致`) +
    (mismatchCount > 0 ? chalk.redBright(`  ${mismatchCount} 个异常（见上方"与预期不符"）`) : "")
);
process.exit(mismatchCount > 0 ? 1 : 0);
