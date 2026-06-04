const { app, BrowserWindow, dialog } = require("electron");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");

let backendProcess = null;
const serviceProcesses = [];

function log(message) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  if (!app.isPackaged) process.stdout.write(line);
  try {
    fs.mkdirSync(app.getPath("userData"), { recursive: true });
    fs.appendFileSync(path.join(app.getPath("userData"), "providerx-desktop.log"), line);
  } catch {
    // Logging must never block startup.
  }
}

function projectRoot() {
  return app.isPackaged ? app.getAppPath() : path.resolve(__dirname, "..");
}

function backendPath() {
  const binaryName = process.platform === "win32" ? "provider-diff-backend.exe" : "provider-diff-backend";
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "backend", binaryName);
  }
  return path.join(__dirname, "bin", binaryName);
}

function servicePath(name) {
  const binaryName = process.platform === "win32" ? `${name}.exe` : name;
  const serviceRoot = app.isPackaged
    ? path.join(process.resourcesPath, "services")
    : path.join(__dirname, "services");
  const onedirBinary = path.join(serviceRoot, name, binaryName);
  if (executableExists(onedirBinary)) return onedirBinary;
  if (app.isPackaged) {
    return path.join(serviceRoot, binaryName);
  }
  return path.join(serviceRoot, binaryName);
}

function executableExists(file) {
  try {
    fs.accessSync(file, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function commandCandidates(command) {
  if (path.isAbsolute(command)) return [command];
  const pathDirs = String(process.env.PATH || "")
    .split(path.delimiter)
    .filter(Boolean);
  const commonDirs = [
    "/opt/homebrew/bin",
    "/usr/local/bin",
    "/Library/Frameworks/Python.framework/Versions/Current/bin",
    "/Library/Frameworks/Python.framework/Versions/3.12/bin",
    "/Library/Frameworks/Python.framework/Versions/3.11/bin",
    "/Library/Frameworks/Python.framework/Versions/3.10/bin"
  ];
  return [...new Set([...pathDirs, ...commonDirs])].map((dir) => path.join(dir, command));
}

function resolveCommand(command) {
  return commandCandidates(command).find(executableExists) || null;
}

function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close(() => resolve(port));
    });
  });
}

function waitForUrl(url, timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const check = () => {
      const req = http.get(url, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve();
          return;
        }
        retry();
      });
      req.on("error", retry);
      req.setTimeout(1000, () => {
        req.destroy();
        retry();
      });
    };
    const retry = () => {
      if (Date.now() > deadline) {
        reject(new Error(`service did not become healthy: ${url}`));
        return;
      }
      setTimeout(check, 150);
    };
    check();
  });
}

function waitForHealth(port, timeoutMs = 10000) {
  return waitForUrl(`http://127.0.0.1:${port}/healthz`, timeoutMs);
}

function serviceOutputDir(name) {
  return path.join(app.getPath("userData"), "outputs", name);
}

async function startBackend() {
  const port = await findFreePort();
  const binary = backendPath();
  log(`starting backend: ${binary} port=${port}`);
  backendProcess = spawn(binary, {
    cwd: projectRoot(),
    env: { ...process.env, PORT: String(port) },
    stdio: app.isPackaged ? "ignore" : "inherit"
  });
  backendProcess.on("exit", (code) => {
    if (code !== 0 && !app.isQuitting) {
      dialog.showErrorBox("ProviderX 后端已退出", `后端进程退出，退出码：${code ?? "unknown"}`);
    }
  });
  await waitForHealth(port);
  log(`backend healthy: http://127.0.0.1:${port}/healthz`);
  return port;
}

async function startBundledService({ name, args, healthPath, urlPath }) {
  const binary = servicePath(name);
  if (!executableExists(binary)) {
    log(`${name} bundled executable not found: ${binary}`);
    return null;
  }
  return startServiceProcess({
    name,
    binary,
    args,
    healthPath,
    urlPath
  });
}

async function startExternalService({ name, command, args, healthPath, urlPath }) {
  const binary = resolveCommand(command);
  if (!binary) {
    log(`${name} external command not found: ${command}`);
    return null;
  }
  return startServiceProcess({
    name,
    binary,
    args,
    healthPath,
    urlPath
  });
}

async function startServiceProcess({ name, binary, args, healthPath, urlPath }) {
  const port = await findFreePort();
  const outputDir = serviceOutputDir(name);
  const servicePathEnv = [
    path.dirname(binary),
    "/opt/homebrew/bin",
    "/usr/local/bin",
    "/Library/Frameworks/Python.framework/Versions/Current/bin",
    "/Library/Frameworks/Python.framework/Versions/3.12/bin",
    process.env.PATH || ""
  ].filter(Boolean).join(path.delimiter);
  log(`starting ${name}: ${binary} port=${port} outputDir=${outputDir}`);
  const child = spawn(binary, args(port, outputDir), {
    cwd: projectRoot(),
    env: { ...process.env, PATH: servicePathEnv, PORT: String(port), OUTPUT_DIR: outputDir },
    stdio: app.isPackaged ? "ignore" : "inherit"
  });
  serviceProcesses.push(child);
  child.on("error", (error) => {
    log(`${name} spawn failed: ${error.message}`);
  });
  child.on("exit", (code) => {
    log(`${name} exited: code=${code ?? "unknown"}`);
    if (code !== 0 && !app.isQuitting) {
      dialog.showErrorBox(`${name} 服务已退出`, `服务进程退出，退出码：${code ?? "unknown"}`);
    }
  });
  await waitForUrl(`http://127.0.0.1:${port}${healthPath}`, 20000);
  log(`${name} healthy: http://127.0.0.1:${port}${healthPath}`);
  return `http://127.0.0.1:${port}${urlPath}`;
}

function logServiceFailure(name, error) {
  log(`${name} unavailable: ${error?.message || error || "unknown error"}`);
  return null;
}

async function startBundledServices() {
  const evalscopeConfig = {
    name: "evalscope-service",
    args: (port, outputDir) => ["service", "--host", "127.0.0.1", "--port", String(port), "--outputs", outputDir],
    healthPath: "/health",
    urlPath: "/dashboard"
  };
  const opencompassConfig = {
    name: "opencompass-service",
    args: (port, outputDir) => ["--host", "127.0.0.1", "--port", String(port), "--outputs", outputDir],
    healthPath: "/healthz",
    urlPath: "/"
  };
  const [evalscopeUrl, opencompassUrl] = await Promise.all([
    startBundledService(evalscopeConfig)
      .then((url) => url || startExternalService({
      name: "evalscope-service",
      command: "evalscope",
      ...evalscopeConfig
    }))
      .catch((error) => logServiceFailure("evalscope-service", error)),
    startBundledService(opencompassConfig).catch((error) => logServiceFailure("opencompass-service", error))
  ]);
  log(`service urls: evalscope=${evalscopeUrl || "none"} opencompass=${opencompassUrl || "none"}`);
  return { evalscopeUrl, opencompassUrl };
}

async function createWindow() {
  const port = await startBackend();
  const services = await startBundledServices();
  log("creating BrowserWindow");
  const win = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1100,
    minHeight: 760,
    title: "ProviderX",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  await win.loadFile(path.join(projectRoot(), "index.html"), {
    query: {
      apiBase: `http://127.0.0.1:${port}`,
      ...(services.evalscopeUrl ? { evalscopeUrl: services.evalscopeUrl } : {}),
      ...(services.opencompassUrl ? { opencompassUrl: services.opencompassUrl } : {})
    }
  });
}

app.whenReady().then(createWindow).catch((error) => {
  dialog.showErrorBox("ProviderX 启动失败", error.message);
  app.quit();
});

app.on("window-all-closed", () => {
  app.quit();
});

app.on("before-quit", () => {
  app.isQuitting = true;
  if (backendProcess && !backendProcess.killed) {
    backendProcess.kill();
  }
  for (const child of serviceProcesses) {
    if (child && !child.killed) child.kill();
  }
});
