import js from "@eslint/js";
import globals from "globals";

// Correctness-focused flat config for the Noctua (provider-diff) repo.
// Goal: catch real bugs (undefined refs, duplicate keys, unreachable/dead code,
// loose equality) without mass stylistic reformatting. See the code-quality plan.

const correctnessRules = {
  ...js.configs.recommended.rules,
  eqeqeq: ["error", "smart"],
  "no-unused-vars": [
    "error",
    { args: "none", caughtErrors: "none", ignoreRestSiblings: true }
  ],
  "no-constant-condition": ["error", { checkLoops: false }],
  // Empty blocks are frequently intentional (e.g. best-effort try/catch here).
  "no-empty": ["error", { allowEmptyCatch: true }]
};

export default [
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "build/**",
      "outputs/**",
      "payloads/**",
      "web/data/**",
      "docs/**",
      "assets/**",
      "design-system/**",
      "desktop/bin/**",
      "desktop/services/**"
    ]
  },

  // Browser runtime: web UI scripts share state via the global `window.*`
  // namespace (no bundler / module system).
  {
    files: ["web/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: {
        ...globals.browser
      }
    },
    rules: correctnessRules
  },

  // Node ESM test helpers next to the web libs.
  {
    files: ["web/**/*.test.mjs", "scripts/**/*.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node
      }
    },
    rules: correctnessRules
  },

  // Node CommonJS tooling (build scripts, dev runner, electron shell).
  {
    files: ["scripts/**/*.js", "desktop/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: {
        ...globals.node
      }
    },
    rules: correctnessRules
  }
];
