import { app, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { ElectronStorageManager } from '../src/logic/electronStorage.ts';
import {
  calculateWindowPosition,
  DEFAULT_WIDGET_DIMS,
  DisplayWorkArea,
} from '../src/logic/electronDocking.ts';
import type { DataRoot, WidgetSettings } from '../src/logic/tracker.ts';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let storageManager: ElectronStorageManager;

// State tracking
let currentSettings: WidgetSettings;
let isDocked = false;
let dockState: 'hidden' | 'opening' | 'visible' | 'closing' = 'visible';
let isExpandedForModal = false;

// Dimensions
const COMPACT_WIDGET_WIDTH = 320;
const COMPACT_WIDGET_HEIGHT = 90;
const EXPANDED_MODAL_WIDTH = 500;
const EXPANDED_MODAL_HEIGHT = 560;

function getPrimaryWorkArea(): DisplayWorkArea {
  const primaryDisplay = screen.getPrimaryDisplay();
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
  dockState = isDocked ? 'hidden' : 'visible';

  const workArea = getPrimaryWorkArea();
  const initialPos = calculateWindowPosition(
    isDocked,
    dockState,
    workArea,
    { x: currentSettings.positionX, y: currentSettings.positionY },
    DEFAULT_WIDGET_DIMS
  );

  const iconIco = path.join(__dirname, '../build/icon.ico');
  const iconPng = path.join(__dirname, '../build/icon.png');
  const windowIcon = fs.existsSync(iconIco)
    ? iconIco
    : fs.existsSync(iconPng)
    ? iconPng
    : undefined;

  mainWindow = new BrowserWindow({
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
    icon: windowIcon,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Load production bundle or local dev server
  const distIndexPath = path.join(__dirname, '../dist/index.html');
  const appPathDist = path.join(app.getAppPath(), 'dist/index.html');
  const targetIndex = fs.existsSync(distIndexPath) ? distIndexPath : appPathDist;

  if (app.isPackaged || fs.existsSync(targetIndex)) {
    mainWindow.loadFile(targetIndex);
  } else {
    const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:3000';
    mainWindow.loadURL(devServerUrl);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Track display metric changes (e.g. screen resolution or DPI changes)
  screen.on('display-metrics-changed', () => {
    updateWindowPosition(false);
  });
}

function createTray() {
  const iconPng = path.join(__dirname, '../build/icon.png');
  let icon: nativeImage;
  if (fs.existsSync(iconPng)) {
    icon = nativeImage.createFromPath(iconPng).resize({ width: 16, height: 16 });
  } else {
    icon = nativeImage.createEmpty();
  }
  tray = new Tray(icon);
  tray.setToolTip('MiniTimeTracker — Windows 11');

  const contextMenu = Menu.buildFromTemplate([
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
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
}

// Register IPC handlers
function registerIpcHandlers() {
  ipcMain.handle('storage:load', async () => {
    return storageManager.load();
  });

  ipcMain.handle('storage:save', async (_event, data: DataRoot) => {
    await storageManager.save(data);
    currentSettings = data.settings;
    if (mainWindow) {
      mainWindow.setAlwaysOnTop(currentSettings.isTopmost);
    }
    return { success: true };
  });

  ipcMain.handle('storage:get-path', async () => {
    return storageManager.getFilePath();
  });

  ipcMain.handle('storage:simulate-corrupt', async () => {
    const brokenPayload = '{"schemaVersion": 1, "corrupt": true, activities: [broken';
    const recovered = storageManager.handleCorruptedFile('Симуляция повреждения файла', brokenPayload);
    return {
      recovered,
      backupPath: storageManager.lastCorruptBackupPath,
      error: storageManager.lastError,
    };
  });

  ipcMain.handle('window:set-topmost', async (_event, topmost: boolean) => {
    currentSettings.isTopmost = topmost;
    mainWindow?.setAlwaysOnTop(topmost);
  });

  ipcMain.handle('window:set-docked', async (_event, docked: boolean) => {
    isDocked = docked;
    dockState = docked ? 'hidden' : 'visible';
    updateWindowPosition(true);
  });

  ipcMain.handle('window:set-dock-state', async (_event, state: 'hidden' | 'opening' | 'visible' | 'closing') => {
    dockState = state;
    updateWindowPosition(state === 'visible' || state === 'hidden');
  });

  ipcMain.handle('window:set-modal-expanded', async (_event, expanded: boolean) => {
    if (!mainWindow) return;
    isExpandedForModal = expanded;
    if (expanded) {
      mainWindow.setSize(EXPANDED_MODAL_WIDTH, EXPANDED_MODAL_HEIGHT);
    } else {
      mainWindow.setSize(COMPACT_WIDGET_WIDTH, COMPACT_WIDGET_HEIGHT);
      updateWindowPosition(false);
    }
  });

  ipcMain.handle('window:move-delta', async (_event, dx: number, dy: number) => {
    if (!mainWindow || isDocked) return;
    const [curX, curY] = mainWindow.getPosition();
    const newX = curX + dx;
    const newY = curY + dy;
    mainWindow.setPosition(newX, newY);
    currentSettings.positionX = newX;
    currentSettings.positionY = newY;
  });

  ipcMain.handle('window:close', async () => {
    mainWindow?.close();
  });

  ipcMain.handle('window:minimize', async () => {
    mainWindow?.minimize();
  });

  ipcMain.handle('system:set-autostart', async (_event, enabled: boolean) => {
    app.setLoginItemSettings({
      openAtLogin: enabled,
      path: process.execPath,
    });
    return enabled;
  });

  ipcMain.handle('system:get-autostart', async () => {
    const settings = app.getLoginItemSettings();
    return settings.openAtLogin;
  });
}

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    registerIpcHandlers();
    createMainWindow();
    createTray();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
      }
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
