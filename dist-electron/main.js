"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// electron/main.ts
var import_electron = require("electron");
var import_node_path2 = __toESM(require("node:path"), 1);
var import_node_fs2 = __toESM(require("node:fs"), 1);

// src/logic/electronStorage.ts
var import_node_fs = __toESM(require("node:fs"), 1);
var import_node_path = __toESM(require("node:path"), 1);
var import_node_os = __toESM(require("node:os"), 1);

// src/logic/tracker.ts
var CURRENT_SCHEMA_VERSION = 1;
function createDefaultData() {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    activities: [
      {
        id: "act-work-default",
        name: "\u0420\u0430\u0431\u043E\u0442\u0430",
        color: "#3b82f6",
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      }
    ],
    history: [],
    activeSession: null,
    settings: {
      isTopmost: true,
      isEdgeDocked: false,
      dockSide: "right",
      positionX: 40,
      positionY: 80,
      opacity: 0.96
    }
  };
}
function parseAndValidateDataJson(rawJson) {
  try {
    const parsed = JSON.parse(rawJson);
    if (!parsed || typeof parsed !== "object") {
      return {
        data: createDefaultData(),
        isCorrupted: true,
        corruptBackupContent: rawJson,
        errorMessage: "JSON \u043A\u043E\u0440\u043D\u0435\u0432\u043E\u0439 \u043E\u0431\u044A\u0435\u043A\u0442 \u043F\u043E\u0432\u0440\u0435\u0436\u0434\u0451\u043D"
      };
    }
    if (typeof parsed.schemaVersion !== "number") {
      return {
        data: createDefaultData(),
        isCorrupted: true,
        corruptBackupContent: rawJson,
        errorMessage: "\u041E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u0435\u0442 \u0438\u043B\u0438 \u043F\u043E\u0432\u0440\u0435\u0436\u0434\u0435\u043D\u0430 \u0432\u0435\u0440\u0441\u0438\u044F \u0441\u0445\u0435\u043C\u044B (schemaVersion)"
      };
    }
    if (!Array.isArray(parsed.activities) || parsed.activities.length === 0) {
      return {
        data: createDefaultData(),
        isCorrupted: true,
        corruptBackupContent: rawJson,
        errorMessage: "\u0421\u043F\u0438\u0441\u043E\u043A \u0430\u043A\u0442\u0438\u0432\u043D\u043E\u0441\u0442\u0435\u0439 \u043F\u0443\u0441\u0442 \u0438\u043B\u0438 \u043F\u043E\u0432\u0440\u0435\u0436\u0434\u0451\u043D"
      };
    }
    if (!Array.isArray(parsed.history)) {
      parsed.history = [];
    }
    if (!parsed.settings || typeof parsed.settings !== "object") {
      parsed.settings = createDefaultData().settings;
    }
    return {
      data: parsed,
      isCorrupted: false
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      data: createDefaultData(),
      isCorrupted: true,
      corruptBackupContent: rawJson,
      errorMessage: `\u0421\u0438\u043D\u0442\u0430\u043A\u0441\u0438\u0447\u0435\u0441\u043A\u0430\u044F \u043E\u0448\u0438\u0431\u043A\u0430 JSON: ${message}`
    };
  }
}

// src/logic/electronStorage.ts
function resolveDataFilePath(customPath) {
  if (customPath) {
    return import_node_path.default.resolve(customPath);
  }
  const localAppData = process.env.LOCALAPPDATA || (process.platform === "win32" ? import_node_path.default.join(import_node_os.default.homedir(), "AppData", "Local") : null);
  if (localAppData) {
    return import_node_path.default.join(localAppData, "MiniTimeTracker", "data.json");
  }
  const home = import_node_os.default.homedir();
  return import_node_path.default.join(home, ".minitimetracker", "data.json");
}
var ElectronStorageManager = class {
  constructor(options) {
    this.isWriting = false;
    this.writeQueue = [];
    this.lastCorruptBackupPath = null;
    this.lastError = null;
    this.filePath = resolveDataFilePath(options?.customFilePath);
    this.storageDir = import_node_path.default.dirname(this.filePath);
  }
  getFilePath() {
    return this.filePath;
  }
  getStorageDir() {
    return this.storageDir;
  }
  /**
   * Safe synchronous or initial load of data
   */
  load() {
    try {
      if (!import_node_fs.default.existsSync(this.filePath)) {
        const initial = createDefaultData();
        this.saveSync(initial);
        return initial;
      }
      const rawJson = import_node_fs.default.readFileSync(this.filePath, "utf-8");
      if (!rawJson.trim()) {
        return this.handleCorruptedFile("\u0424\u0430\u0439\u043B \u0434\u0430\u043D\u043D\u044B\u0445 \u043F\u0443\u0441\u0442", rawJson);
      }
      const validation = parseAndValidateDataJson(rawJson);
      if (validation.isCorrupted) {
        return this.handleCorruptedFile(
          validation.errorMessage || "\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u043D\u0430\u044F \u0441\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u0430 \u0434\u0430\u043D\u043D\u044B\u0445",
          rawJson
        );
      }
      return validation.data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      let raw = "";
      try {
        if (import_node_fs.default.existsSync(this.filePath)) {
          raw = import_node_fs.default.readFileSync(this.filePath, "utf-8");
        }
      } catch {
      }
      return this.handleCorruptedFile(`\u041E\u0448\u0438\u0431\u043A\u0430 \u0447\u0442\u0435\u043D\u0438\u044F: ${msg}`, raw);
    }
  }
  /**
   * Atomic safe save using a unique temporary file and safe rename/replace
   */
  async save(data) {
    return new Promise((resolve, reject) => {
      this.writeQueue.push(async () => {
        try {
          this.saveSync(data);
          resolve(true);
        } catch (err) {
          this.lastError = err instanceof Error ? err.message : String(err);
          reject(err);
        }
      });
      this.processQueue();
    });
  }
  /**
   * Synchronous atomic save with directory creation and .tmp rename
   */
  saveSync(data) {
    if (!import_node_fs.default.existsSync(this.storageDir)) {
      import_node_fs.default.mkdirSync(this.storageDir, { recursive: true });
    }
    const jsonString = JSON.stringify(data, null, 2);
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const tempFilePath = import_node_path.default.join(this.storageDir, `data.json.tmp.${uniqueSuffix}`);
    import_node_fs.default.writeFileSync(tempFilePath, jsonString, "utf-8");
    try {
      import_node_fs.default.renameSync(tempFilePath, this.filePath);
    } catch {
      import_node_fs.default.copyFileSync(tempFilePath, this.filePath);
      try {
        import_node_fs.default.unlinkSync(tempFilePath);
      } catch {
      }
    }
  }
  async processQueue() {
    if (this.isWriting || this.writeQueue.length === 0) return;
    this.isWriting = true;
    const nextTask = this.writeQueue.shift();
    if (nextTask) {
      try {
        await nextTask();
      } catch {
      } finally {
        this.isWriting = false;
        this.processQueue();
      }
    }
  }
  /**
   * Safe corruption handler: creates a timestamped backup copy so user data is never lost,
   * then safely generates clean default configuration.
   */
  handleCorruptedFile(reason, rawContent) {
    try {
      if (!import_node_fs.default.existsSync(this.storageDir)) {
        import_node_fs.default.mkdirSync(this.storageDir, { recursive: true });
      }
      const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const backupPath = import_node_path.default.join(this.storageDir, `data.corrupt.${timestamp}.json`);
      if (rawContent && rawContent.length > 0) {
        import_node_fs.default.writeFileSync(backupPath, rawContent, "utf-8");
      } else {
        import_node_fs.default.writeFileSync(backupPath, `// Corrupted data file backup created at ${(/* @__PURE__ */ new Date()).toISOString()}`, "utf-8");
      }
      this.lastCorruptBackupPath = backupPath;
      this.lastError = `\u041E\u0431\u043D\u0430\u0440\u0443\u0436\u0435\u043D \u043F\u043E\u0432\u0440\u0435\u0436\u0434\u0451\u043D\u043D\u044B\u0439 \u0444\u0430\u0439\u043B data.json (${reason}). \u0420\u0435\u0437\u0435\u0440\u0432\u043D\u0430\u044F \u043A\u043E\u043F\u0438\u044F: ${backupPath}`;
    } catch (e) {
      this.lastError = `\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u043F\u0438\u0441\u0430\u0442\u044C \u0440\u0435\u0437\u0435\u0440\u0432\u043D\u0443\u044E \u043A\u043E\u043F\u0438\u044E \u043F\u043E\u0432\u0440\u0435\u0436\u0434\u0451\u043D\u043D\u043E\u0433\u043E \u0444\u0430\u0439\u043B\u0430: ${e}`;
    }
    const defaultData = createDefaultData();
    try {
      this.saveSync(defaultData);
    } catch {
    }
    return defaultData;
  }
};

// src/logic/electronDocking.ts
var DEFAULT_WIDGET_DIMS = {
  width: 298,
  height: 80,
  peekTabWidth: 14
};
function calculateWindowPosition(isDocked2, dockState2, workArea, floatingPos, dims = DEFAULT_WIDGET_DIMS) {
  const minY = workArea.y + 10;
  const maxY = Math.max(minY, workArea.y + workArea.height - dims.height - 10);
  const clampedY = Math.max(minY, Math.min(maxY, floatingPos.y));
  if (!isDocked2) {
    const minX = workArea.x + 10;
    const maxX = Math.max(minX, workArea.x + workArea.width - dims.width - 10);
    const clampedX = Math.max(minX, Math.min(maxX, floatingPos.x));
    return { x: Math.round(clampedX), y: Math.round(clampedY) };
  }
  if (dockState2 === "hidden") {
    const targetX2 = workArea.x + workArea.width - dims.peekTabWidth;
    return { x: Math.round(targetX2), y: Math.round(clampedY) };
  }
  const targetX = workArea.x + workArea.width - dims.width;
  return { x: Math.round(targetX), y: Math.round(clampedY) };
}

// electron/main.ts
var mainWindow = null;
var tray = null;
var storageManager;
var currentSettings;
var isDocked = false;
var dockState = "visible";
var isExpandedForModal = false;
var COMPACT_WIDGET_WIDTH = 320;
var COMPACT_WIDGET_HEIGHT = 90;
var EXPANDED_MODAL_WIDTH = 500;
var EXPANDED_MODAL_HEIGHT = 560;
function getPrimaryWorkArea() {
  const primaryDisplay = import_electron.screen.getPrimaryDisplay();
  const { x, y, width, height } = primaryDisplay.workArea;
  return {
    x,
    y,
    width,
    height,
    scaleFactor: primaryDisplay.scaleFactor
  };
}
function updateWindowPosition(smooth = false) {
  if (!mainWindow || isExpandedForModal) return;
  const workArea = getPrimaryWorkArea();
  const target = calculateWindowPosition(
    isDocked,
    dockState,
    workArea,
    { x: currentSettings.positionX, y: currentSettings.positionY },
    DEFAULT_WIDGET_DIMS
  );
  if (smooth) {
    const currentBounds = mainWindow.getBounds();
    const steps = 6;
    let step = 0;
    const dx = (target.x - currentBounds.x) / steps;
    const dy = (target.y - currentBounds.y) / steps;
    const animTimer = setInterval(() => {
      step++;
      if (step >= steps || !mainWindow) {
        clearInterval(animTimer);
        mainWindow?.setPosition(target.x, target.y);
      } else {
        mainWindow.setPosition(
          Math.round(currentBounds.x + dx * step),
          Math.round(currentBounds.y + dy * step)
        );
      }
    }, 16);
  } else {
    mainWindow.setPosition(target.x, target.y);
  }
}
function createMainWindow() {
  storageManager = new ElectronStorageManager();
  const initialData = storageManager.load();
  currentSettings = initialData.settings;
  isDocked = Boolean(currentSettings.isEdgeDocked);
  dockState = isDocked ? "hidden" : "visible";
  const workArea = getPrimaryWorkArea();
  const initialPos = calculateWindowPosition(
    isDocked,
    dockState,
    workArea,
    { x: currentSettings.positionX, y: currentSettings.positionY },
    DEFAULT_WIDGET_DIMS
  );
  const iconIco = import_node_path2.default.join(__dirname, "../build/icon.ico");
  const iconPng = import_node_path2.default.join(__dirname, "../build/icon.png");
  const windowIcon = import_node_fs2.default.existsSync(iconIco) ? iconIco : import_node_fs2.default.existsSync(iconPng) ? iconPng : void 0;
  mainWindow = new import_electron.BrowserWindow({
    x: initialPos.x,
    y: initialPos.y,
    width: COMPACT_WIDGET_WIDTH,
    height: COMPACT_WIDGET_HEIGHT,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    alwaysOnTop: currentSettings.isTopmost,
    resizable: false,
    hasShadow: false,
    skipTaskbar: false,
    icon: windowIcon,
    webPreferences: {
      preload: import_node_path2.default.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  const distIndexPath = import_node_path2.default.join(__dirname, "../dist/index.html");
  const appPathDist = import_node_path2.default.join(import_electron.app.getAppPath(), "dist/index.html");
  const targetIndex = import_node_fs2.default.existsSync(distIndexPath) ? distIndexPath : appPathDist;
  if (import_electron.app.isPackaged || import_node_fs2.default.existsSync(targetIndex)) {
    mainWindow.loadFile(targetIndex);
  } else {
    const devServerUrl = process.env.VITE_DEV_SERVER_URL || "http://localhost:3000";
    mainWindow.loadURL(devServerUrl);
  }
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
  import_electron.screen.on("display-metrics-changed", () => {
    updateWindowPosition(false);
  });
}
function createTray() {
  const iconPng = import_node_path2.default.join(__dirname, "../build/icon.png");
  let icon;
  if (import_node_fs2.default.existsSync(iconPng)) {
    icon = import_electron.nativeImage.createFromPath(iconPng).resize({ width: 16, height: 16 });
  } else {
    icon = import_electron.nativeImage.createEmpty();
  }
  tray = new import_electron.Tray(icon);
  tray.setToolTip("MiniTimeTracker \u2014 Windows 11");
  const contextMenu = import_electron.Menu.buildFromTemplate([
    {
      label: "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0432\u0438\u0434\u0436\u0435\u0442",
      click: () => {
        mainWindow?.show();
        dockState = "visible";
        updateWindowPosition(true);
      }
    },
    {
      label: "\u0421\u043A\u0440\u044B\u0442\u044C \u0437\u0430 \u043A\u0440\u0430\u0439",
      click: () => {
        isDocked = true;
        dockState = "hidden";
        currentSettings.isEdgeDocked = true;
        updateWindowPosition(true);
      }
    },
    {
      label: "\u041F\u043E\u0432\u0435\u0440\u0445 \u0432\u0441\u0435\u0445 \u043E\u043A\u043E\u043D",
      type: "checkbox",
      checked: currentSettings.isTopmost,
      click: (item) => {
        currentSettings.isTopmost = item.checked;
        mainWindow?.setAlwaysOnTop(item.checked);
        const data = storageManager.load();
        data.settings.isTopmost = item.checked;
        storageManager.save(data);
      }
    },
    {
      label: "\u0421\u0431\u0440\u043E\u0441\u0438\u0442\u044C \u043F\u043E\u0437\u0438\u0446\u0438\u044E \u043D\u0430 \u044D\u043A\u0440\u0430\u043D\u0435",
      click: () => {
        isDocked = false;
        currentSettings.isEdgeDocked = false;
        currentSettings.positionX = 60;
        currentSettings.positionY = 90;
        dockState = "visible";
        updateWindowPosition(false);
      }
    },
    { type: "separator" },
    {
      label: "\u0412\u044B\u0445\u043E\u0434",
      click: () => {
        import_electron.app.quit();
      }
    }
  ]);
  tray.setContextMenu(contextMenu);
}
function registerIpcHandlers() {
  import_electron.ipcMain.handle("storage:load", async () => {
    return storageManager.load();
  });
  import_electron.ipcMain.handle("storage:save", async (_event, data) => {
    await storageManager.save(data);
    currentSettings = data.settings;
    if (mainWindow) {
      mainWindow.setAlwaysOnTop(currentSettings.isTopmost);
    }
    return { success: true };
  });
  import_electron.ipcMain.handle("storage:get-path", async () => {
    return storageManager.getFilePath();
  });
  import_electron.ipcMain.handle("storage:simulate-corrupt", async () => {
    const brokenPayload = '{"schemaVersion": 1, "corrupt": true, activities: [broken';
    const recovered = storageManager.handleCorruptedFile("\u0421\u0438\u043C\u0443\u043B\u044F\u0446\u0438\u044F \u043F\u043E\u0432\u0440\u0435\u0436\u0434\u0435\u043D\u0438\u044F \u0444\u0430\u0439\u043B\u0430", brokenPayload);
    return {
      recovered,
      backupPath: storageManager.lastCorruptBackupPath,
      error: storageManager.lastError
    };
  });
  import_electron.ipcMain.handle("window:set-topmost", async (_event, topmost) => {
    currentSettings.isTopmost = topmost;
    mainWindow?.setAlwaysOnTop(topmost);
  });
  import_electron.ipcMain.handle("window:set-docked", async (_event, docked) => {
    isDocked = docked;
    dockState = docked ? "hidden" : "visible";
    updateWindowPosition(true);
  });
  import_electron.ipcMain.handle("window:set-dock-state", async (_event, state) => {
    dockState = state;
    updateWindowPosition(state === "visible" || state === "hidden");
  });
  import_electron.ipcMain.handle("window:set-modal-expanded", async (_event, expanded) => {
    if (!mainWindow) return;
    isExpandedForModal = expanded;
    if (expanded) {
      mainWindow.setSize(EXPANDED_MODAL_WIDTH, EXPANDED_MODAL_HEIGHT);
    } else {
      mainWindow.setSize(COMPACT_WIDGET_WIDTH, COMPACT_WIDGET_HEIGHT);
      updateWindowPosition(false);
    }
  });
  import_electron.ipcMain.handle("window:move-delta", async (_event, dx, dy) => {
    if (!mainWindow || isDocked) return;
    const [curX, curY] = mainWindow.getPosition();
    const newX = curX + dx;
    const newY = curY + dy;
    mainWindow.setPosition(newX, newY);
    currentSettings.positionX = newX;
    currentSettings.positionY = newY;
  });
  import_electron.ipcMain.handle("window:close", async () => {
    mainWindow?.close();
  });
  import_electron.ipcMain.handle("window:minimize", async () => {
    mainWindow?.minimize();
  });
  import_electron.ipcMain.handle("system:set-autostart", async (_event, enabled) => {
    import_electron.app.setLoginItemSettings({
      openAtLogin: enabled,
      path: process.execPath
    });
    return enabled;
  });
  import_electron.ipcMain.handle("system:get-autostart", async () => {
    const settings = import_electron.app.getLoginItemSettings();
    return settings.openAtLogin;
  });
}
var gotTheLock = import_electron.app.requestSingleInstanceLock();
if (!gotTheLock) {
  import_electron.app.quit();
} else {
  import_electron.app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
  import_electron.app.whenReady().then(() => {
    registerIpcHandlers();
    createMainWindow();
    createTray();
    import_electron.app.on("activate", () => {
      if (import_electron.BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
      }
    });
  });
  import_electron.app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      import_electron.app.quit();
    }
  });
}
