const { execFileSync, execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const binDir = path.join(root, "desktop", "bin");
const binaryName = process.platform === "win32" ? "provider-diff-backend.exe" : "provider-diff-backend";
const binaryPath = path.join(binDir, binaryName);

function run(command, args, options = {}) {
  console.log(`$ ${[command, ...args].join(" ")}`);
  execFileSync(command, args, {
    cwd: root,
    stdio: "inherit",
    ...options
  });
}

if (process.platform !== "darwin") {
  throw new Error("DMG packaging must run on macOS.");
}

fs.mkdirSync(binDir, { recursive: true });
run("go", ["build", "-o", binaryPath, "."], {
  cwd: path.join(root, "backend"),
  env: { ...process.env, GOOS: "darwin", GOARCH: process.arch === "arm64" ? "arm64" : "amd64" }
});

run("bash", [path.join(__dirname, "build-mac-icon.sh")]);

if (process.argv.includes("--skip-package")) {
  process.exit(0);
}

execSync("npx electron-builder --mac dmg", {
  cwd: root,
  stdio: "inherit"
});
