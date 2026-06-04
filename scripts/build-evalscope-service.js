const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const serviceDir = path.join(root, "desktop", "services", "evalscope-service");

function run(command, args, options = {}) {
  console.log(`$ ${[command, ...args].join(" ")}`);
  execFileSync(command, args, {
    cwd: root,
    stdio: "inherit",
    ...options
  });
}

fs.rmSync(serviceDir, { recursive: true, force: true });
fs.mkdirSync(path.dirname(serviceDir), { recursive: true });
fs.mkdirSync(serviceDir, { recursive: true });

run("go", [
  "build",
  "-o",
  path.join(serviceDir, "evalscope-service"),
  "."
], {
  cwd: path.join(root, "desktop", "evalscope-service")
});

const webDist = execFileSync("python3", [
  "-c",
  "import evalscope, pathlib; print(pathlib.Path(evalscope.__file__).parent / 'web' / 'dist')"
], {
  cwd: root,
  encoding: "utf8"
}).trim();

fs.cpSync(webDist, path.join(serviceDir, "web", "dist"), { recursive: true });
fs.writeFileSync(path.join(serviceDir, "README.md"), "Bundled lightweight EvalScope dashboard service for ProviderX.\\n");

run("codesign", [
  "--force",
  "--sign",
  "-",
  path.join(serviceDir, "evalscope-service")
]);

const binary = path.join(serviceDir, "evalscope-service");
fs.chmodSync(binary, 0o755);
console.log(`Bundled EvalScope service: ${binary}`);
