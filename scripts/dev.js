const { spawn } = require("child_process");
const fs = require("fs");
const net = require("net");
const path = require("path");

const root = path.resolve(__dirname, "..");
const appPort = Number(process.env.APP_PORT || 4173);
const evalscopePort = Number(process.env.EVALSCOPE_PORT || 9000);
const evalscopeHost = process.env.EVALSCOPE_HOST || "127.0.0.1";
const evalscopeOutputs = process.env.EVALSCOPE_OUTPUTS || path.join(root, "outputs");

const children = new Set();

function isPortOpen(host, port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    socket.setTimeout(500);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => resolve(false));
  });
}

function startProcess(label, command, args) {
  const child = spawn(command, args, {
    cwd: root,
    stdio: "inherit",
    env: process.env
  });
  children.add(child);
  child.once("exit", (code, signal) => {
    children.delete(child);
    if (signal) {
      console.log(`[${label}] stopped by ${signal}`);
      return;
    }
    if (code !== 0 && code !== null) {
      console.error(`[${label}] exited with code ${code}`);
    }
  });
  return child;
}

function stopAll() {
  for (const child of children) {
    child.kill("SIGTERM");
  }
}

async function main() {
  fs.mkdirSync(evalscopeOutputs, { recursive: true });

  const appRunning = await isPortOpen("127.0.0.1", appPort);
  if (appRunning) {
    console.log(`[app] http://127.0.0.1:${appPort} is already running`);
  } else {
    startProcess("app", "python3", ["-m", "http.server", String(appPort)]);
    console.log(`[app] starting http://127.0.0.1:${appPort}`);
  }

  const evalscopeRunning = await isPortOpen(evalscopeHost, evalscopePort);
  if (evalscopeRunning) {
    console.log(`[evalscope] http://${evalscopeHost}:${evalscopePort}/dashboard is already running`);
  } else {
    startProcess("evalscope", "evalscope", [
      "service",
      "--host",
      evalscopeHost,
      "--port",
      String(evalscopePort),
      "--outputs",
      evalscopeOutputs
    ]);
    console.log(`[evalscope] starting http://${evalscopeHost}:${evalscopePort}/dashboard`);
  }

  console.log(`[open] http://127.0.0.1:${appPort}/#evalscope`);
}

process.once("SIGINT", () => {
  stopAll();
  process.exit(130);
});
process.once("SIGTERM", () => {
  stopAll();
  process.exit(143);
});

main().catch((error) => {
  console.error(error);
  stopAll();
  process.exit(1);
});
