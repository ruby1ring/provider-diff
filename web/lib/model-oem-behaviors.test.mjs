import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import fs from "node:fs/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const libPath = path.join(__dirname, "model-oem-behaviors.js");
const code = await fs.readFile(libPath, "utf8");

const sandbox = {
  window: {
    THINKING_CHANNEL_DIALECTS: {
      deepseek: { switchField: "thinking.type" },
      aliyun: { switchField: "enable_thinking" },
      openrouter: { switchField: "reasoning" }
    },
    NOCTUA_CHANNEL_CATALOG: {
      inferEvalModelVendorId: (id) => {
        const s = String(id).toLowerCase();
        if (s.startsWith("deepseek")) return "deepseek";
        if (s.startsWith("kimi")) return "moonshot";
        if (s.startsWith("glm")) return "zhipu";
        if (s.startsWith("minimax")) return "minimax";
        if (s.startsWith("qwen")) return "qwen";
        return "other";
      }
    }
  }
};
vm.runInNewContext(code, sandbox);
const api = sandbox.window.NOCTUA_MODEL_OEM_BEHAVIORS;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const oemCase = {
  case_id: "deepseek_oem_thinking_sampling_ignored",
  case_scope: "oem_reference",
  oem_vendor: "deepseek",
  target_group: "protocol_sampling",
  payload: {
    thinking: { type: "enabled" },
    temperature: 0.2
  },
  expect: {
    oem_source: "https://api-docs.deepseek.com/zh-cn/guides/thinking_mode"
  }
};

assert(api.isOemReferenceCase(oemCase), "oem case detected");
assert(api.oemTargetGroup(oemCase) === "protocol_sampling", "target group");
assert(api.oemTargetGroup({ case_id: "deepseek_oem_thinking_sampling_ignored" }) === "protocol_sampling", "target group by case_id fallback");
assert(api.inferEvalModelVendorId("deepseek-v4-pro") === "deepseek", "vendor infer");
assert(api.inferEvalModelVendorId("qwen3.8-max") === "qwen", "vendor infer qwen");
assert(api.modelBehaviorsProviderId("deepseek") === "model_behaviors_deepseek", "provider id");
assert(api.modelBehaviorsProviderId("qwen") === "model_behaviors_qwen", "provider id qwen");
assert(api.vendorLabel("qwen") === "阿里云百炼 (Qwen) 官方", "vendor label qwen");

// 模型级特殊规则：kimi-k2 专属规则只对 k2 命中，kimi-k3 不再错套 k2 规则，
// 而是显示自己的 MODEL_RULES 条目（3 条），不会把 k2 的 2 条算进去（应为 3，不是 5）。
assert(api.modelOemRules("kimi-k2.6").length === 2, "kimi-k2.6 has 2 k2-specific rules");
assert(api.modelOemRules("kimi-k2.7-coder").length === 2, "kimi-k2.7-coder has 2 k2-specific rules");
assert(api.modelOemRules("kimi-k3").length === 4, "kimi-k3 shows its own model rules, no k2 leak (4 not 6)");
assert(api.modelOemRules("deepseek-v4-pro").length >= 1, "deepseek-v4-pro falls back to vendor general rules");
assert(api.modelOemRules("qwen3.8-max").length === 3, "qwen3.8-max shows its own model rules");
assert(api.modelOemRules("qwen3-max").length === 0, "qwen3-max has no qwen vendor general rules yet");
assert(api.modelOemRules("unknown-model").length === 0, "unknown model (vendor=other) returns empty");
assert(api.modelOemRules("").length === 0, "empty model id returns empty");

// OEM case 的模型级限定 caseAppliesToModel：
// 无 applicable_models → 厂商通用，对所有模型命中；有 → 仅列出的模型命中（支持 "xxx*" 通配）。
assert(api.caseAppliesToModel({}, "kimi-k3") === true, "no applicable_models → universal");
assert(api.caseAppliesToModel({ applicable_models: ["kimi-k2.6", "kimi-k2.7-coder"] }, "kimi-k2.6") === true, "k2 sampling case applies to k2.6");
assert(api.caseAppliesToModel({ applicable_models: ["kimi-k2.6", "kimi-k2.7-coder"] }, "kimi-k2.7-coder") === true, "k2 sampling case applies to k2.7-coder");
assert(api.caseAppliesToModel({ applicable_models: ["kimi-k2.6", "kimi-k2.7-coder"] }, "kimi-k3") === false, "k2 sampling case does NOT apply to k3 (key isolation)");
assert(api.caseAppliesToModel({ applicable_models: ["kimi-k3"] }, "kimi-k3") === true, "k3 case applies to k3");
assert(api.caseAppliesToModel({ applicable_models: ["kimi-k3"] }, "kimi-k2.6") === false, "k3 case does not apply to k2.6");
assert(api.caseAppliesToModel({ applicable_models: ["kimi-k2*"] }, "kimi-k2.7-coder") === true, "prefix wildcard matches k2 family");
assert(api.caseAppliesToModel({ applicable_models: ["kimi-k2*"] }, "kimi-k3") === false, "prefix wildcard does not match k3");

// qwen OEM case：applicable_models 限定仅 qwen3.8-max（同平台 qwen3-max 默认不开思考，不能错套）；
// 注入时一律 custom 提交。
const qwenCase = {
  case_id: "qwen_oem_qwen38_default_thinking_enabled",
  case_scope: "oem_reference",
  oem_vendor: "qwen",
  applicable_models: ["qwen3.8-max"],
  target_group: "protocol_thinking",
  payload: { model: "qwen3.8-max", messages: [{ role: "user", content: "hi" }] },
  expect: { http_status: 200 }
};
assert(api.isOemReferenceCase(qwenCase), "qwen case is oem reference case");
assert(api.oemTargetGroup(qwenCase) === "protocol_thinking", "qwen target group");
assert(api.oemVendorId(qwenCase) === "qwen", "qwen vendor id");
assert(api.caseAppliesToModel(qwenCase, "qwen3.8-max") === true, "qwen case applies to qwen3.8-max");
assert(api.caseAppliesToModel(qwenCase, "qwen3-max") === false, "qwen3.8-max case does NOT apply to qwen3-max (default thinking differs)");
assert(api.caseAppliesToModel({ applicable_models: ["qwen3.8*"] }, "qwen3.8-max") === true, "prefix wildcard matches qwen3.8 family");
const preparedQwen = api.prepareCaseForRoute(qwenCase, "aliyun");
assert(preparedQwen.custom === true, "qwen oem case marked custom on aliyun channel");


const ali = api.adaptOemCasePayloadForRoute(oemCase, "aliyun");
assert(ali.changed && ali.payload.enable_thinking === true && !ali.payload.thinking, "aliyun dialect");

const official = api.adaptOemCasePayloadForRoute(oemCase, "deepseek");
assert(!official.changed && official.payload.thinking?.type === "enabled", "deepseek unchanged");

// prepareCaseForRoute：所有 OEM 参考用例必须标记为 custom 提交，否则其 case_id 会被
// 后端拿到渠道 provider 里反查而 "not found"。
// 回归断言：即使是「thinking 适配未改变」的 deepseek 自家渠道，也要 custom:true。
const preparedOfficial = api.prepareCaseForRoute(oemCase, "deepseek");
assert(preparedOfficial.custom === true, "oem case marked custom on deepseek channel (no longer routed as built-in id)");

// 回归断言：一个非 thinking 的 OEM 拒绝用例（如 moonshot n_rejected）——
// 这是真实触发 "case moonshot_oem_k2_n_rejected not found" 的场景。
const nRejectedCase = {
  case_id: "moonshot_oem_k2_n_rejected",
  case_scope: "oem_reference",
  oem_vendor: "moonshot",
  target_group: "protocol_sampling",
  payload: { model: "kimi-k2.5", messages: [{ role: "user", content: "hi" }], n: 2 },
  expect: { http_status: 400 }
};
assert(api.isOemReferenceCase(nRejectedCase), "n_rejected is oem reference case");
const preparedN = api.prepareCaseForRoute(nRejectedCase, "aliyun");
assert(preparedN.custom === true, "non-thinking oem reject case marked custom (fixes 'case not found')");
assert(preparedN.payload.n === 2 && !preparedN.payload.enable_thinking, "non-thinking payload preserved unchanged");
const customShapeN = api.toCustomCaseShape(preparedN);
assert(customShapeN.case_id === "moonshot_oem_k2_n_rejected" && customShapeN.expect.http_status === 400, "custom shape preserves case_id + expect");

const { common, oem } = api.partitionCasesByScope([
  { case_id: "ali_protocol_sampling_temperature_1" },
  oemCase
]);
assert(common.length === 1 && oem.length === 1, "partition scope");

const sorted = api.sortCasesInGroup([oemCase, { case_id: "a" }]);
assert(sorted[0].case_id === "a", "common before oem");

console.log("model-oem-behaviors.test.mjs: ok");
