# 隐性参数三类边界 case 模板

厂商文档**未声明支持**的参数，必须覆盖三类探针 case（规则见
`docs/project/api-doc-update-rules.md` 1.2 节）。本目录存放三类场景的模板，
**不是可运行的 case**（无 manifest、无 case_id，不会被后端加载或审计统计）。

## 使用方法

1. 复制对应模板到目标渠道的 payload 目录（如 `payloads/ali/`），
   按目录内编号惯例命名（隐性参数探针建议 `1xx_unknown_<param>_probe.json`）。
2. 把 `<占位符>` 全部替换为实际值，补上 `case_id`。
3. 先用探针脚本实测确认结论，再把结论写进 `expect`：

   ```bash
   node scripts/probe-param-boundary.mjs --only <probe_id>
   ```

4. 把新文件加进该目录 `manifest.json` 的 `cases` 数组。
5. `expect.notes` 必须带实测标注：`来源：实测（Noctua，YYYY-MM-DD，probe=<probe_id>）`。
6. 跑 `npm run audit:case-coverage` 确认该分组的三类覆盖状态。

## 三类场景对照

| 模板 | 实测行为 | 结论 | 报告含义 |
|------|----------|------|----------|
| `template_silent_ignore.json` | 2xx，未观察到行为差异 | `ignored` | 正常（接受但未证明生效，通常可透传） |
| `template_silent_effective.json` | 2xx，实测改变响应/用量 | `supported` + `doc_gap` | 文档漏洞，须回写渠道 API 文档 |
| `template_reject_on_pass.json` | 传参直接 4xx | `rejected_400` | 兼容风险（影响 OpenAI 兼容透传） |

已落地的实例可参考：`payloads/ali/120-123`、`payloads/siliconflow/100-103`、
`payloads/openrouter/160-164`、`payloads/minimax/091-093`、
`payloads/deepseek/120`、`payloads/deepseek_messages/090-091`；
OEM 场景的拒绝类实例见 `payloads/model_behaviors_moonshot/`、`payloads/model_behaviors_minimax/011`。
