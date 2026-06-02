const { app, BrowserWindow, dialog } = require("electron");
const { spawn } = require("node:child_process");
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");

let backendProcess = null;
const serviceProcesses = [];

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
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "services", binaryName);
  }
  return path.join(__dirname, "services", binaryName);
}

function executableExists(file) {
  try {
    require("node:fs").accessSync(file);
    return true;
  } catch {
    return false;
  }
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

async function startBackend() {
  const port = await findFreePort();
  const binary = backendPath();
  backendProcess = spawn(binary, {
    cwd: projectRoot(),
    env: { ...process.env, PORT: String(port) },
    stdio: app.isPackaged ? "ignore" : "inherit"
  });
  backendProcess.on("exit", (code) => {
    if (code !== 0 && !app.isQuitting) {
      dialog.showErrorBox("Provider Diff 后端已退出", `后端进程退出，退出码：${code ?? "unknown"}`);
    }
  });
  await waitForHealth(port);
  return port;
}

async function startBundledService({ name, args, healthPath, urlPath }) {
  const binary = servicePath(name);
  if (!executableExists(binary)) return null;
  const port = await findFreePort();
  const outputDir = path.join(app.getPath("userData"), "outputs", name);
  const child = spawn(binary, args(port, outputDir), {
    cwd: projectRoot(),
    env: { ...process.env, PORT: String(port), OUTPUT_DIR: outputDir },
    stdio: app.isPackaged ? "ignore" : "inherit"
  });
  serviceProcesses.push(child);
  child.on("exit", (code) => {
    if (code !== 0 && !app.isQuitting) {
      dialog.showErrorBox(`${name} 服务已退出`, `服务进程退出，退出码：${code ?? "unknown"}`);
    }
  });
  await waitForUrl(`http://127.0.0.1:${port}${healthPath}`, 20000);
  return `http://127.0.0.1:${port}${urlPath}`;
}

async function startBundledServices() {
  const [evalscopeUrl, opencompassUrl] = await Promise.all([
    startBundledService({
      name: "evalscope-service",
      args: (port, outputDir) => ["service", "--host", "127.0.0.1", "--port", String(port), "--outputs", outputDir],
      healthPath: "/dashboard",
      urlPath: "/dashboard"
    }).catch(() => null),
    startBundledService({
      name: "opencompass-service",
      args: (port, outputDir) => ["--host", "127.0.0.1", "--port", String(port), "--outputs", outputDir],
      healthPath: "/healthz",
      urlPath: "/"
    }).catch(() => null)
  ]);
  return { evalscopeUrl, opencompassUrl };
}

async function createWindow() {
  const port = await startBackend();
  const services = await startBundledServices();
  const win = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1100,
    minHeight: 760,
    title: "Provider Diff",
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
  dialog.showErrorBox("Provider Diff 启动失败", error.message);
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
