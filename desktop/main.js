const { app, BrowserWindow, dialog } = require("electron");
const { spawn } = require("node:child_process");
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");

let backendProcess = null;

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

function waitForHealth(port, timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const check = () => {
      const req = http.get(`http://127.0.0.1:${port}/healthz`, (res) => {
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
        reject(new Error(`backend did not become healthy on port ${port}`));
        return;
      }
      setTimeout(check, 150);
    };
    check();
  });
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

async function createWindow() {
  const port = await startBackend();
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
    query: { apiBase: `http://127.0.0.1:${port}` }
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
});

