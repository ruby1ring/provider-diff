# API 文档更新与参数边界测评规则

本文档定义 Noctua 在 **API 文档维护**、**测试用例设计** 与 **报告解读** 三方面的统一规则。实测结论优先于历史文档描述。

---

## 一、API 文档更新规则

### 1.1 文档对照与复测

1. **主动对照官方文档**：维护 `docs/api/{provider}-{protocol}.md` 时，以厂商官方最新 API 文档为准（登记 `doc_url`、`last_verified`）。
2. **冲突必须复测**：若历史测评结论与新版官方文档描述冲突，**不得直接改文档**，须对相关 case 重新跑测，以**最新实测**为准。
3. **实测优先回写**：文档与实测不一致时，同步更新 `docs/api/*.md` 与 `scripts/protocol-doc-manifest.mjs`，并在 Notes / 实测表中**强制标注来源**：

   ```text
   来源：实测（Noctua，YYYY-MM-DD，report_id=… 或 probe=…）
   ```

4. **禁止覆盖官方列**：`protocol-md-template` 中「官方文档」列只写厂商原文；「实测 (Noctua)」列写 HTTP 状态、结论与行为备注。

5. **两种来源、两个段落，禁止混写**：
   - `## 实测补充参数（来源：实测）` — 只允许真实跑测的结果写入（`apply-doc-gap-backfill.mjs` 回写报告结论，或人工回写 `probe-param-boundary.mjs` 探针结论）。
   - `## 官方文档对照补充参数（来源：官方文档，待实测）` — `compare:official-docs --apply-stale` 联网对照官方页面发现的未收录参数写这里（frontmatter 分组 `DocSync`），**必须待实测确认后才能转入实测段或正文**。
   - 教训（2026-07-08）：曾把联网对照结果直接标成「来源：实测」，且页面正则误匹配普通英文单词（user/input/n/stop），56 行错误补录已全部回滚。对照脚本现只匹配 code/表格上下文。

6. **实测探针工具**：发现文档冲突或隐性参数时，先在 `scripts/probe-param-boundary.mjs` 里登记探针（含 doc_conflict 说明），跑：

   ```bash
   node scripts/probe-param-boundary.mjs --provider <config.yaml 段名>
   ```

   结果落 `outputs/param-boundary-probe.json`（三类结论 + HTTP 状态 + 证据），作为回写依据。注意：401/402/403/429 及欠费类错误体会被判为 `blocked_account_or_quota`，不算参数结论。

### 1.2 隐性参数（文档未声明支持）三类边界

对协议矩阵 / 渠道文档 **未列出** 的参数，每组须覆盖三类探针 case（见 `payloads/undocumented_boundary/` 模板）：

| 场景 | 传参行为 | 测评判定 | 结论标记 |
|------|----------|----------|----------|
| **(1) 静默拒绝** | 传参直接 4xx | **不合格**（影响 OpenAI 兼容透传） | `undocumented_rejected` |
| **(2) 静默忽略** | 2xx，实测无行为差异 | **正常** | `ignored` / `accepted_ineffective` |
| **(3) 静默生效** | 2xx，实测改变响应/用量 | **文档漏洞**，须补文档 | `doc_gap` |

Case `expect` 须设置：

```json
{
  "doc_support": "undocumented",
  "undocumented_scenario": "silent_ignore | silent_effective | reject_on_pass"
}
```

### 1.3 已声明支持参数（documented）

`expect.doc_support: "documented"`（默认）时：

- 严格按 case `expect.support_conclusion` 与语义断言判定通过/不通过。
- 文档写「支持」但实测失败 → `schema_mismatch` 或断言失败，需修渠道或修文档（以复测为准）。
- 文档写「接受但无效果」→ 预期 `ignored`，仅观测生效性，不作为 P0 阻断（除非 OEM 对齐 case 要求一致）。

---

## 二、测试用例优化规则

### 2.1 分组不可变

`RUN_V02` 分组键固定（`connectivity`、`protocol`、`protocol_sampling`、`protocol_thinking`、`protocol_tools`、`protocol_response_format`、`output_length`、`cache_hit`）。**不得**新增/删除/重命名分组。

组内 case 可增删，但须：

1. 校验与分组主题一致；
2. 删除重复或无法产生可判定结论的 case；
3. 补齐该组参数边界缺口（含 1.2 三类隐性参数）。

### 2.2 厂商专属（OEM 参考）case

- 存放：`payloads/model_behaviors_{vendor}/`，已落地五家：
  `model_behaviors_deepseek`、`model_behaviors_moonshot`、`model_behaviors_zhipu`、`model_behaviors_minimax`、`model_behaviors_qwen`
- 标记：`case_scope: "oem_reference"`、`oem_vendor`、`target_group` 指向固定分组、`expect.oem_source` 指向原厂文档
- 注入：选择对应测评模型时，由 `web/lib/model-oem-behaviors.js` 注入该分组（厂商识别 `inferEvalModelVendorId`：deepseek*/kimi*/glm*/minimax*/qwen* 前缀）
- UI：Run v02 与报告内显示 **「原厂参考」** 标记及 `oem_source` 链接；选中模型后顶部渲染该厂商特殊规则提示条（`vendorRules(vendorId)`）

核心示例（各厂商差异化行为，2026-07-08 实测）：

| 厂商 | 行为 | case |
|------|------|------|
| DeepSeek | Thinking 模式采样参数**接受但不生效** | `deepseek_oem_thinking_sampling_ignored` |
| Kimi k2 系列 | 采样参数锁死，**传非默认值直接 400**（与 DeepSeek 相反） | `moonshot_oem_k2_temperature_rejected` 等 |
| 智谱 | `do_sample=false` 为采样总开关；官方称 stop 仅单个停止词但**实测多停止词生效** | `zhipu_oem_do_sample_false_sampling_ignored` 等 |
| MiniMax | M2.x 思考不可关（disabled 被接受但照常思考）；`n>1` 直接 400 | `minimax_oem_m2x_thinking_disable_ineffective` 等 |
| Qwen（百炼） | qwen3.8-max **默认开启思考**（不传 `enable_thinking` 也返回 `reasoning_content`，与 qwen3-max 默认关闭相反）；支持 `thinking_budget` / `enable_search` / 视觉 | `qwen_oem_qwen38_default_thinking_enabled` 等 |

### 2.3 Case 完整性审计

```bash
npm run audit:case-coverage
```

审计与后端加载同口径（合并 manifest `common_expect`），输出：

- 各分组 case 数 + 三类隐性边界覆盖状态（按 `target_group` 归组）
- 可判定性分类：`judged`（有 support_conclusion）/ `observational`（观测型断言）/ `structural`（仅结构断言）/ `empty`（**无效 case，须补断言或删除**）
- 同目录重复 payload 候选（比对 payload 原文，保留 1 vs 1.0 的 int/float 差异；`include_usage` vs `usage_chunk_shape` 与 `thinking_baseline_no_thinking` vs `thinking_baseline_fixed_prompt` 为有意的同 payload 双角色设计，不删）

---

## 三、运营可读性要求

### 3.1 术语对照（报告内展示）

| 术语 | 运营可读说法 |
|------|----------------|
| `supported` | 参数可用，响应符合预期 |
| `ignored` | 接口收了参数，但未观察到效果（通常可透传） |
| `rejected_400` | 接口明确拒绝该参数 |
| `schema_mismatch` | 接口返回成功，但结果与 OpenAI 标准不一致 |
| `doc_gap` | **文档漏洞**：文档未写支持，实测却生效，需更新渠道 API 文档 |
| `undocumented_rejected` | **兼容风险**：文档未写支持，传参却报错 |
| P0 | 阻断级，不建议接入 |
| Baseline | 对照用的原厂/OpenAI 标准响应 |

### 3.2 报告结构（渠道测评）

1. **整体结论** — 能否接入
2. **渠道接入建议** — 分渠道排序
3. **待处理问题** — 按 case 聚合
4. **文档漏洞（doc_gap）** — 单独列出，附修复建议
5. **各渠道问题明细** — Tab 切换

### 3.3 批量排查历史报告

```bash
npm run scan:doc-gaps -- outputs/*.json
npm run scan:doc-gaps -- web/data/channel-reports-export.json
```

生成 `outputs/doc-gap-audit.json`，列出所有 `doc_gap` / `undocumented_rejected` 条目，供文档回写任务跟踪。

---

## 四、相关文件

| 文件 | 用途 |
|------|------|
| `web/lib/parameter-diagnosis.js` | 参数支持策略诊断（前后端同源逻辑） |
| `scripts/probe-param-boundary.mjs` | 隐性参数 / 文档冲突实测探针（结果落 `outputs/param-boundary-probe.json`） |
| `scripts/scan-report-doc-gaps.mjs` | 批量扫描报告 |
| `scripts/audit-case-coverage.mjs` | 分组 case 完整性审计 |
| `payloads/undocumented_boundary/` | 三类隐性边界 case 模板（复制到渠道目录使用） |
| `docs/project/protocol-parameter-mapping.md` | 协议矩阵与 thinking observed 回写 |
| `web/lib/model-oem-behaviors.js` | OEM 参考 case 注入 + 厂商特殊规则摘要（`vendorRules`） |
