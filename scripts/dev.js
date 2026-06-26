const { spawn, execSync } = require("child_process");
const fs = require("fs");
const net = require("net");
const path = require("path");

const root = path.resolve(__dirname, "..");
const appPort = Number(process.env.APP_PORT || 4173);
const backendPort = Number(process.env.BACKEND_PORT || process.env.PORT || 8080);
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

function startProcess(label, command, args, options = {}) {
  const { optional = false } = options;
  const child = spawn(command, args, {
    cwd: root,
    stdio: "inherit",
    env: process.env
  });
  child.on("error", (error) => {
    children.delete(child);
    if (optional && error.code === "ENOENT") {
      console.warn(`[${label}] skipped: ${command} not found (optional)`);
      return;
    }
    console.error(`[${label}] failed to start: ${error.message}`);
    if (!optional) process.exit(1);
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

function startProcessWithEnv(label, command, args, env, cwd = root) {
  const child = spawn(command, args, {
    cwd,
    stdio: "inherit",
    env: { ...process.env, ...env }
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
  try {
    execSync("node scripts/rebuild-docs.mjs", { cwd: root, stdio: "inherit" });
  } catch (error) {
    console.error("[rebuild-docs] failed:", error.message);
    process.exit(1);
  }

  fs.mkdirSync(evalscopeOutputs, { recursive: true });

  const appRunning = await isPortOpen("127.0.0.1", appPort);
  if (appRunning) {
    console.log(`[app] http://127.0.0.1:${appPort} is already running`);
  } else {
    startProcess("app", "python3", ["-m", "http.server", String(appPort)]);
    console.log(`[app] starting http://127.0.0.1:${appPort}/web/`);
  }

  const backendRunning = await isPortOpen("127.0.0.1", backendPort);
  if (backendRunning) {
    console.log(`[backend] http://127.0.0.1:${backendPort} is already running`);
  } else {
    startProcessWithEnv("backend", "go", ["run", "."], { PORT: String(backendPort) }, path.join(root, "backend"));
    console.log(`[backend] starting http://127.0.0.1:${backendPort}`);
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
    ], { optional: true });
    console.log(`[evalscope] starting http://${evalscopeHost}:${evalscopePort}/dashboard`);
  }

  console.log(`[open] http://127.0.0.1:${appPort}/web/`);
  console.log(`[canvas] http://127.0.0.1:${appPort}/web/?canvas-annotate=1#run-v02`);
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

// Keep the dev supervisor alive so SIGINT/SIGTERM can stop child processes.
setInterval(() => {}, 60_000);
