# outputs/

Runtime and generated artifacts. Contents are **not** committed to git (see root `.gitignore`).

## original-baselines.import.json

Historical baseline reports auto-imported on first UI load (`web/main.js`). Generate locally:

```sh
node scripts/run-original-baselines.js
```

Requires a populated `config.yaml` with provider API keys. If the file is missing, the app still works; baselines can be imported manually from the reports view.

## capacity-probes/

Created by `node scripts/probe-capacity.js` (default: timestamped JSON under `outputs/capacity-probes/`).
