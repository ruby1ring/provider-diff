# outputs/

Runtime and generated artifacts. Contents are **not** committed to git (see root `.gitignore`).

## original-baselines.import.json

Historical baseline reports auto-imported on first UI load (`web/main.js`). Generate locally:

```sh
node scripts/run-original-baselines.js
```

Requires a populated `config.yaml` with provider API keys. If the file is missing, the app still works; baselines can be imported manually from the reports view.

## doc_gap 工作流

1. **联网对照官方文档**（已自动化）  
   ```sh
   npm run compare:official-docs -- --apply-stale
   ```  
   产出 `outputs/official-doc-compare.json`，并将官方页面检索到、本地缺失的参数写入 `docs/api/*.md` 的「实测补充参数（来源：实测）」节。

2. **导出测评报告**  
   在 UI「渠道参数测评报告」页点击 **导出 JSON（doc_gap 扫描）**，将文件保存为 `outputs/channel-reports-export.json`。

3. **扫描 doc_gap**  
   ```sh
   npm run scan:doc-gaps
   ```  
   产出 `outputs/doc-gap-audit.json`。

4. **回写 API 文档**  
   ```sh
   npm run apply:doc-gap-backfill
   npm run build:protocol-matrix
   ```

一键串联（需先导出 JSON 到 `outputs/`）：`npm run docs:sync`

Created by `node scripts/probe-capacity.js` (default: timestamped JSON under `outputs/capacity-probes/`).
