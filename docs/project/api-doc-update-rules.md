# API 文档更新与参数边界测评规则

本文档定义 Noctua 在 **API 文档维护**、**测试用例设计** 与 **报告解读** 三方面的统一规则。实测结论优先于历史文档描述。

---

## 一、API 文档更新规则

### 1.1 文档对照与复测

1. **主动对照官方文档**：维护 `docs/api/{provider}-{protocol}.md` 时，以厂商官方最新 API 文档为准（登记 `doc_url`、`last_verified`）。
2. **冲突必须复测**：若历史测评结论与新版官方文档描述冲突，**不得直接改文档**，须对相关 case 重新跑测，以**最新实测**为准。
3. **实测优先回写**：文档与实测不一致时，同步更新 `docs/api/*.md` 与 `scripts/protocol-doc-manifest.mjs`，并在 Notes / 实测表中**强制标注来源**：

   ```text
   来源：实测（Noctua，YYYY-MM-DD，report_id=…）
   ```

4. **禁止覆盖官方列**：`protocol-md-template` 中「官方文档」列只写厂商原文；「实测 (Noctua)」列写 HTTP 状态、结论与行为备注。

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

- 存放：`payloads/model_behaviors_{vendor}/`
- 标记：`case_scope: "oem_reference"`、`target_group` 指向固定分组
- 注入：选择对应测评模型时，由 `web/lib/model-oem-behaviors.js` 注入该分组
- UI：Run v02 与报告内显示 **「原厂参考」** 标记及 `oem_source` 链接

示例：`deepseek_oem_thinking_sampling_ignored` — DeepSeek v4 flash 在 Thinking 模式下采样参数接受但不生效；第三方渠道须与 Baseline 对齐。

### 2.3 Case 完整性审计

```bash
npm run audit:case-coverage
```

输出各分组 case 数、缺失的 `undocumented_scenario` 覆盖、无 `expect.support_conclusion` 的 case 列表。

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
| `scripts/scan-report-doc-gaps.mjs` | 批量扫描报告 |
| `scripts/audit-case-coverage.mjs` | 分组 case 完整性审计 |
| `docs/project/protocol-parameter-mapping.md` | 协议矩阵与 thinking observed 回写 |
| `web/lib/model-oem-behaviors.js` | OEM 参考 case 注入 |
