"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const node_path_1 = __importDefault(require("node:path"));
const node_fs_1 = __importDefault(require("node:fs"));
const electronStorage_ts_1 = require("../src/logic/electronStorage.ts");
const electronDocking_ts_1 = require("../src/logic/electronDocking.ts");
let mainWindow = null;
let tray = null;
let storageManager;
// State tracking
let currentSettings;
let isDocked = false;
let dockState = 'visible';
let isExpandedForModal = false;
// Dimensions
const COMPACT_WIDGET_WIDTH = 320;
const COMPACT_WIDGET_HEIGHT = 90;
const EXPANDED_MODAL_WIDTH = 500;
const EXPANDED_MODAL_HEIGHT = 560;
function getPrimaryWorkArea() {
    const primaryDisplay = electron_1.screen.getPrimaryDisplay();
    const { x, y, width, height } = primaryDisplay.workArea;
    return {
        x,
        y,
        width,
        height,
        scaleFactor: primaryDisplay.scaleFactor,
    };
}
function updateWindowPosition(smooth = false) {
    if (!mainWindow || isExpandedForModal)
        return;
    const workArea = getPrimaryWorkArea();
    const target = (0, electronDocking_ts_1.calculateWindowPosition)(isDocked, dockState, workArea, { x: currentSettings.positionX, y: currentSettings.positionY }, electronDocking_ts_1.DEFAULT_WIDGET_DIMS);
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
            }
            else {
                mainWindow.setPosition(Math.round(currentBounds.x + dx * step), Math.round(currentBounds.y + dy * step));
            }
        }, 16);
    }
    else {
        mainWindow.setPosition(target.x, target.y);
    }
}
function createMainWindow() {
    storageManager = new electronStorage_ts_1.ElectronStorageManager();
    const initialData = storageManager.load();
    currentSettings = initialData.settings;
    isDocked = Boolean(currentSettings.isEdgeDocked);
    dockState = isDocked ? 'hidden' : 'visible';
    const workArea = getPrimaryWorkArea();
    const initialPos = (0, electronDocking_ts_1.calculateWindowPosition)(isDocked, dockState, workArea, { x: currentSettings.positionX, y: currentSettings.positionY }, electronDocking_ts_1.DEFAULT_WIDGET_DIMS);
    mainWindow = new electron_1.BrowserWindow({
        x: initialPos.x,
        y: initialPos.y,
        width: COMPACT_WIDGET_WIDTH,
        height: COMPACT_WIDGET_HEIGHT,
        frame: false,
        transparent: true,
        backgroundColor: '#00000000',
        alwaysOnTop: currentSettings.isTopmost,
        resizable: false,
        hasShadow: false,
        skipTaskbar: false,
        webPreferences: {
            preload: node_path_1.default.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
        },
    });
    // Load production bundle or local dev server
    const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:3000';
    const distIndexPath = node_path_1.default.join(__dirname, '../dist/index.html');
    if (process.env.NODE_ENV === 'development' || !node_fs_1.default.existsSync(distIndexPath)) {
        mainWindow.loadURL(devServerUrl);
    }
    else {
        mainWindow.loadFile(distIndexPath);
    }
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
    // Track display metric changes (e.g. screen resolution or DPI changes)
    electron_1.screen.on('display-metrics-changed', () => {
        updateWindowPosition(false);
    });
}
function createTray() {
    // Create a minimal 16x16 icon in memory if file is not found
    const icon = electron_1.nativeImage.createEmpty();
    tray = new electron_1.Tray(icon);
    tray.setToolTip('MiniTimeTracker — Windows 11');
    const contextMenu = electron_1.Menu.buildFromTemplate([
        {
            label: 'Показать виджет',
            click: () => {
                mainWindow?.show();
                dockState = 'visible';
                updateWindowPosition(true);
            },
        },
        {
            label: 'Скрыть за край',
            click: () => {
                isDocked = true;
                dockState = 'hidden';
                currentSettings.isEdgeDocked = true;
                updateWindowPosition(true);
            },
        },
        {
            label: 'Поверх всех окон',
            type: 'checkbox',
            checked: currentSettings.isTopmost,
            click: (item) => {
                currentSettings.isTopmost = item.checked;
                mainWindow?.setAlwaysOnTop(item.checked);
                const data = storageManager.load();
                data.settings.isTopmost = item.checked;
                storageManager.save(data);
            },
        },
        {
            label: 'Сбросить позицию на экране',
            click: () => {
                isDocked = false;
                currentSettings.isEdgeDocked = false;
                currentSettings.positionX = 60;
                currentSettings.positionY = 90;
                dockState = 'visible';
                updateWindowPosition(false);
            },
        },
        { type: 'separator' },
        {
            label: 'Выход',
            click: () => {
                electron_1.app.quit();
            },
        },
    ]);
    tray.setContextMenu(contextMenu);
}
// Register IPC handlers
function registerIpcHandlers() {
    electron_1.ipcMain.handle('storage:load', async () => {
        return storageManager.load();
    });
    electron_1.ipcMain.handle('storage:save', async (_event, data) => {
        await storageManager.save(data);
        currentSettings = data.settings;
        if (mainWindow) {
            mainWindow.setAlwaysOnTop(currentSettings.isTopmost);
        }
        return { success: true };
    });
    electron_1.ipcMain.handle('storage:get-path', async () => {
        return storageManager.getFilePath();
    });
    electron_1.ipcMain.handle('storage:simulate-corrupt', async () => {
        const brokenPayload = '{"schemaVersion": 1, "corrupt": true, activities: [broken';
        const recovered = storageManager.handleCorruptedFile('Симуляция повреждения файла', brokenPayload);
        return {
            recovered,
            backupPath: storageManager.lastCorruptBackupPath,
            error: storageManager.lastError,
        };
    });
    electron_1.ipcMain.handle('window:set-topmost', async (_event, topmost) => {
        currentSettings.isTopmost = topmost;
        mainWindow?.setAlwaysOnTop(topmost);
    });
    electron_1.ipcMain.handle('window:set-docked', async (_event, docked) => {
        isDocked = docked;
        dockState = docked ? 'hidden' : 'visible';
        updateWindowPosition(true);
    });
    electron_1.ipcMain.handle('window:set-dock-state', async (_event, state) => {
        dockState = state;
        updateWindowPosition(state === 'visible' || state === 'hidden');
    });
    electron_1.ipcMain.handle('window:set-modal-expanded', async (_event, expanded) => {
        if (!mainWindow)
            return;
        isExpandedForModal = expanded;
        if (expanded) {
            mainWindow.setSize(EXPANDED_MODAL_WIDTH, EXPANDED_MODAL_HEIGHT);
        }
        else {
            mainWindow.setSize(COMPACT_WIDGET_WIDTH, COMPACT_WIDGET_HEIGHT);
            updateWindowPosition(false);
        }
    });
    electron_1.ipcMain.handle('window:move-delta', async (_event, dx, dy) => {
        if (!mainWindow || isDocked)
            return;
        const [curX, curY] = mainWindow.getPosition();
        const newX = curX + dx;
        const newY = curY + dy;
        mainWindow.setPosition(newX, newY);
        currentSettings.positionX = newX;
        currentSettings.positionY = newY;
    });
    electron_1.ipcMain.handle('window:close', async () => {
        mainWindow?.close();
    });
    electron_1.ipcMain.handle('window:minimize', async () => {
        mainWindow?.minimize();
    });
    electron_1.ipcMain.handle('system:set-autostart', async (_event, enabled) => {
        electron_1.app.setLoginItemSettings({
            openAtLogin: enabled,
            path: process.execPath,
        });
        return enabled;
    });
    electron_1.ipcMain.handle('system:get-autostart', async () => {
        const settings = electron_1.app.getLoginItemSettings();
        return settings.openAtLogin;
    });
}
// Single instance lock
const gotTheLock = electron_1.app.requestSingleInstanceLock();
if (!gotTheLock) {
    electron_1.app.quit();
}
else {
    electron_1.app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized())
                mainWindow.restore();
            mainWindow.focus();
        }
    });
    electron_1.app.whenReady().then(() => {
        registerIpcHandlers();
        createMainWindow();
        createTray();
        electron_1.app.on('activate', () => {
            if (electron_1.BrowserWindow.getAllWindows().length === 0) {
                createMainWindow();
            }
        });
    });
    electron_1.app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
            electron_1.app.quit();
        }
    });
}
