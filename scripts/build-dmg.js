const { execFileSync, execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const binDir = path.join(root, "desktop", "bin");
const binaryName = process.platform === "win32" ? "provider-diff-backend.exe" : "provider-diff-backend";
const binaryPath = path.join(binDir, binaryName);
const benchBinaryName = process.platform === "win32" ? "llm-bench.exe" : "llm-bench";
const benchBinaryPath = path.join(binDir, benchBinaryName);

function run(command, args, options = {}) {
  console.log(`$ ${[command, ...args].join(" ")}`);
  execFileSync(command, args, {
    cwd: root,
    stdio: "inherit",
    ...options
  });
}

function productName() {
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  return packageJson.build?.productName || packageJson.productName || packageJson.name;
}

function packagedAppPath() {
  const name = `${productName()}.app`;
  const preferredDir = process.arch === "arm64" ? "mac-arm64" : "mac";
  const candidates = [
    path.join(root, "dist", preferredDir, name),
    path.join(root, "dist", "mac-arm64", name),
    path.join(root, "dist", "mac", name),
    path.join(root, "dist", "mac-universal", name)
  ];
  const appPath = candidates.find((candidate) => fs.existsSync(candidate));
  if (!appPath) {
    throw new Error(`Packaged app not found. Checked: ${candidates.join(", ")}`);
  }
  return appPath;
}

if (process.platform !== "darwin") {
  throw new Error("DMG packaging must run on macOS.");
}

fs.mkdirSync(binDir, { recursive: true });
run("go", ["build", "-o", binaryPath, "."], {
  cwd: path.join(root, "backend"),
  env: { ...process.env, GOOS: "darwin", GOARCH: process.arch === "arm64" ? "arm64" : "amd64" }
});
run("go", ["build", "-o", benchBinaryPath, "."], {
  cwd: path.join(root, "llm-bench"),
  env: { ...process.env, GOOS: "darwin", GOARCH: process.arch === "arm64" ? "arm64" : "amd64" }
});
run("node", ["scripts/build-evalscope-service.js"]);

if (process.argv.includes("--skip-package")) {
  process.exit(0);
}

execSync("npx electron-builder --mac dir", {
  cwd: root,
  stdio: "inherit"
});

const appPath = packagedAppPath();
run("codesign", ["--force", "--deep", "--sign", "-", appPath]);
run("codesign", ["--verify", "--deep", "--strict", "--verbose=4", appPath]);

execSync(`npx electron-builder --mac dmg --prepackaged ${JSON.stringify(appPath)}`, {
  cwd: root,
  stdio: "inherit"
});
