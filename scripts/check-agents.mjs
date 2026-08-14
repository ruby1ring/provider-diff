#!/usr/bin/env node
// 检测本机编码 agent（Claude Code / opencode / kilo）安装状态，并输出 macOS 安装指引。
// 用法：node scripts/check-agents.mjs
// 退出码：0 = 全部已安装；1 = 存在缺失。
import { spawnSync } from "node:child_process";

const AGENTS = [
  {
    name: "claude code",
    bin: "claude",
    versionArgs: ["--version"],
    install: "curl -fsSL https://claude.ai/install.sh | bash",
  },
  {
    name: "opencode",
    bin: "opencode",
    versionArgs: ["--version"],
    install: "curl -fsSL https://opencode.ai/install | bash",
  },
  {
    name: "kilo",
    bin: "kilo",
    versionArgs: ["--version"],
    install: "npm install -g @kilocode/cli@latest",
  },
];

function detect(bin, versionArgs) {
  const which = spawnSync("sh", ["-c", `command -v "${bin}"`], { encoding: "utf8", timeout: 10000 });
  if (which.status !== 0 || !String(which.stdout).trim()) {
    return { installed: false, version: "" };
  }
  const v = spawnSync(bin, versionArgs, { encoding: "utf8", timeout: 10000 });
  const version = v.status === 0 ? String(v.stdout || v.stderr).trim().split("\n")[0] : "?";
  return { installed: true, version };
}

function main() {
  let missing = 0;
  console.log("检测本机编码 agent（macOS）：\n");
  for (const a of AGENTS) {
    const r = detect(a.bin, a.versionArgs);
    if (r.installed) {
      console.log(`  \u2713 ${a.name.padEnd(14)} ${r.version}`);
    } else {
      missing += 1;
      console.log(`  \u2717 ${a.name.padEnd(14)} 未安装`);
      console.log(`        安装：${a.install}`);
    }
  }
  console.log("");
  if (missing === 0) {
    console.log("全部就绪，可运行 agent 测试：");
    console.log("  node cli/noctua.mjs -p tokenplus --endpoint-id agent_test --cases all -k <key> -u <base-url>");
    process.exit(0);
  } else {
    console.log(`${missing} 个 agent 未安装。装好后即可运行 agent 测试；未装 agent 的用例会自动跳过。`);
    process.exit(1);
  }
}

main();
