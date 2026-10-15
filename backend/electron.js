const { app, BrowserWindow, dialog } = require("electron");
const { spawn, execFileSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const http = require("http");

app.setAppUserModelId("com.sentinel.payroll");

let serverProcess = null;
let embeddedShutdown = null;
let backendReady = false;

function getLogFilePath() {
  try {
    const dir = app.getPath("userData");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return path.join(dir, "sentinel-startup.log");
  } catch {
    return null;
  }
}

function log(message) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  try {
    const file = getLogFilePath();
    if (file) {
      fs.appendFileSync(file, line);
    }
  } catch {
    /* ignore */
  }
  // eslint-disable-next-line no-console
  console.log(line.trim());
}

function fatal(prefix, error) {
  const message = error && error.stack ? error.stack : String(error);
  log(`FATAL ${prefix}: ${message}`);
  try {
    dialog.showErrorBox(
      "SENTINEL PAY ROLL failed to start",
      `${prefix}\n\n${message}\n\nA log file has been written to:\n${getLogFilePath()}`
    );
  } catch {
    /* ignore */
  }
}

process.on("uncaughtException", (error) => fatal("uncaughtException", error));
process.on("unhandledRejection", (reason) => fatal("unhandledRejection", reason));

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ensureJwtSecret(userDataPath) {
  const secretFile = path.join(userDataPath, "jwt-secret.txt");
  try {
    if (fs.existsSync(secretFile)) {
      const existing = fs.readFileSync(secretFile, "utf8").trim();
      if (existing) {
        return existing;
      }
    }
  } catch {
    /* ignore */
  }
  const secret = require("crypto").randomBytes(64).toString("hex");
  try {
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
    fs.writeFileSync(secretFile, secret, { encoding: "utf8" });
    log(`Generated new JWT secret at ${secretFile}`);
  } catch (error) {
    log(`Could not persist JWT secret: ${error.message}`);
  }
  return secret;
}

function copyBundledDatabaseIfNeeded(userDataPath) {
  const target = path.join(userDataPath, "sentinel.db");
  if (fs.existsSync(target)) {
    log(`DB already at ${target}, leaving in place.`);
    return;
  }
  const candidates = [
    path.join(process.resourcesPath || "", "app.asar.unpacked", "assets", "sentinel.db"),
    path.join(__dirname, "assets", "sentinel.db"),
  ];
  for (const bundled of candidates) {
    if (bundled && fs.existsSync(bundled)) {
      try {
        fs.copyFileSync(bundled, target);
        log(`Copied bundled DB ${bundled} -> ${target}`);
        return;
      } catch (error) {
        log(`Copy failed from ${bundled}: ${error.message}`);
      }
    }
  }
  log("Bundled sentinel.db not found in any expected location; starting empty.");
}

function startBackendChild(userDataPath) {
  const env = {
    ...process.env,
    NODE_ENV: "development",
    SENTINEL_USER_DATA: userDataPath,
  };
  return spawn("node", ["server.js"], {
    cwd: __dirname,
    env,
    stdio: "inherit",
  });
}

async function ensureBackend() {
  if (backendReady) {
    return;
  }

  const userDataPath = app.getPath("userData");
  const isPackaged = app.isPackaged;
  const useExistingServer = process.env.ELECTRON_USE_EXISTING_SERVER === "1";

  log(`ensureBackend: packaged=${isPackaged} userData=${userDataPath}`);

  if (isPackaged) {
    copyBundledDatabaseIfNeeded(userDataPath);
    process.env.SENTINEL_USER_DATA = userDataPath;
    process.env.SENTINEL_USE_NODE_SQLITE = "1";
    process.env.NODE_ENV = "production";
    if (!process.env.JWT_SECRET) {
      process.env.JWT_SECRET = ensureJwtSecret(userDataPath);
    }
    log("Loading embedded server...");
    const { bootstrap, shutdown } = require("./server.js");
    embeddedShutdown = shutdown;
    log("Calling bootstrap()...");
    await bootstrap();
    log("bootstrap() resolved.");
    await sleep(200);
  } else if (!useExistingServer) {
    serverProcess = startBackendChild(userDataPath);
    await sleep(2000);
  } else {
    await sleep(500);
  }

  backendReady = true;
}

function probeViteDevUrl() {
  const fromEnv = (process.env.ELECTRON_VITE_URL || "").trim();
  if (fromEnv) {
    return Promise.resolve(fromEnv);
  }
  const ports = [5173, 5174, 5175, 5176, 5177, 5178, 5179];
  const hosts = ["127.0.0.1", "localhost"];
  const tryPort = (host, port) =>
    new Promise((resolve) => {
      const req = http.get(
        { host, port, path: "/", timeout: 400 },
        (res) => {
          res.resume();
          resolve(res.statusCode === 200 || res.statusCode === 304 ? `http://${host}:${port}` : null);
        }
      );
      req.on("error", () => resolve(null));
      req.on("timeout", () => {
        req.destroy();
        resolve(null);
      });
    });

  return (async () => {
    for (const host of hosts) {
      for (const port of ports) {
        // eslint-disable-next-line no-await-in-loop
        const url = await tryPort(host, port);
        if (url) {
          return url;
        }
      }
    }
    return "http://127.0.0.1:5173";
  })();
}

async function createWindow() {
  await ensureBackend();

  const isPackaged = app.isPackaged;
  const iconCandidates = [
    path.join(process.resourcesPath || "", "app.asar.unpacked", "assets", "icon.png"),
    path.join(__dirname, "assets", "icon.png"),
  ];
  const iconPath = iconCandidates.find((p) => p && fs.existsSync(p));

  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    icon: iconPath,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.once("ready-to-show", () => mainWindow.show());

  if (!isPackaged) {
    const devUrl = await probeViteDevUrl();
    log(`Loading Vite dev server at ${devUrl}`);
    await mainWindow.loadURL(devUrl);
  } else {
    await mainWindow.loadURL("http://127.0.0.1:5000/");
  }

  log("Main window loaded.");
}

function stopBackendChild() {
  if (!serverProcess || serverProcess.killed) {
    return;
  }
  try {
    if (process.platform === "win32") {
      execFileSync("taskkill", ["/PID", String(serverProcess.pid), "/T", "/F"], {
        stdio: "ignore",
      });
    } else {
      serverProcess.kill("SIGTERM");
    }
  } catch {
    try {
      serverProcess.kill();
    } catch {
      /* ignore */
    }
  }
  serverProcess = null;
}

app.whenReady().then(() => {
  log(`App ready. version=${app.getVersion()} packaged=${app.isPackaged}`);
  createWindow().catch((err) => {
    fatal("createWindow failed", err);
    setTimeout(() => app.quit(), 500);
  });
});

app.on("before-quit", () => {
  log("before-quit: shutting down backend.");
  stopBackendChild();
  if (typeof embeddedShutdown === "function") {
    try {
      embeddedShutdown();
    } catch {
      /* ignore */
    }
    embeddedShutdown = null;
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
