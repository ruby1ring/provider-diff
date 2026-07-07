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
      inferEvalModelVendorId: (id) => (String(id).toLowerCase().startsWith("deepseek") ? "deepseek" : "other")
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
assert(api.modelBehaviorsProviderId("deepseek") === "model_behaviors_deepseek", "provider id");

const ali = api.adaptOemCasePayloadForRoute(oemCase, "aliyun");
assert(ali.changed && ali.payload.enable_thinking === true && !ali.payload.thinking, "aliyun dialect");

const official = api.adaptOemCasePayloadForRoute(oemCase, "deepseek");
assert(!official.changed && official.payload.thinking?.type === "enabled", "deepseek unchanged");

const { common, oem } = api.partitionCasesByScope([
  { case_id: "ali_protocol_sampling_temperature_1" },
  oemCase
]);
assert(common.length === 1 && oem.length === 1, "partition scope");

const sorted = api.sortCasesInGroup([oemCase, { case_id: "a" }]);
assert(sorted[0].case_id === "a", "common before oem");

console.log("model-oem-behaviors.test.mjs: ok");
