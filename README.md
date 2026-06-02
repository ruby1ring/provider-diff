# provider-diff

Provider protocol compatibility comparison tool for OpenAI-compatible and provider-specific chat APIs.

## Quick start

```sh
npm run dev
```

Open the local URL printed by the dev script, choose a provider, enter an API key locally, and run the compatibility cases.

## Local configuration

Runtime API keys should stay local and are intentionally ignored by Git. To create a local config file:

```sh
cp config.example.yaml config.yaml
```

Then replace the placeholder API keys in `config.yaml`.
