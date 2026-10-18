import { ProjectFile } from '../utils/zipExporter.ts';

export const ELECTRON_PROJECT_FILES: ProjectFile[] = [
  {
    path: 'package.json',
    name: 'package.json',
    language: 'json',
    content: `{
  "name": "minitimetracker-electron",
  "version": "1.0.0",
  "description": "Mini Time Tracker for Windows 11 — Electron & TypeScript",
  "main": "dist-electron/main.js",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "build:electron": "esbuild electron/main.ts --bundle --platform=node --target=node20 --outfile=dist-electron/main.js --external:electron && esbuild electron/preload.ts --bundle --platform=node --target=node20 --outfile=dist-electron/preload.js --external:electron",
    "build:all": "vite build && npm run build:electron",
    "electron:start": "electron dist-electron/main.js",
    "electron:dev": "concurrently \\"vite\\" \\"electron dist-electron/main.js\\"",
    "test": "node --test"
  },
  "dependencies": {
    "lucide-react": "^0.546.0",
    "react": "^19.0.1",
    "react-dom": "^19.0.1"
  },
  "devDependencies": {
    "@types/node": "^22.14.0",
    "@types/react": "^19.3.0",
    "@types/react-dom": "^19.3.0",
    "electron": "^41.2.1",
    "esbuild": "^0.25.0",
    "tailwindcss": "^4.3.3",
    "typescript": "^7.0.2",
    "vite": "^8.3.0"
  }
}`,
  },
  {
    path: 'electron/main.ts',
    name: 'main.ts',
    language: 'typescript',
    content: `// Electron Main Process — Frameless, Transparent, Edge-Docked Window
import { app, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { ElectronStorageManager } from '../src/logic/electronStorage';
import { calculateWindowPosition, DEFAULT_WIDGET_DIMS } from '../src/logic/electronDocking';
import type { DataRoot, WidgetSettings } from '../src/logic/tracker';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let storageManager: ElectronStorageManager;
let currentSettings: WidgetSettings;
let isDocked = false;
let dockState: 'hidden' | 'opening' | 'visible' | 'closing' = 'visible';

function createMainWindow() {
  storageManager = new ElectronStorageManager();
  const initialData = storageManager.load();
  currentSettings = initialData.settings;
  isDocked = Boolean(currentSettings.isEdgeDocked);
  dockState = isDocked ? 'hidden' : 'visible';

  mainWindow = new BrowserWindow({
    width: 320,
    height: 90,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: currentSettings.isTopmost,
    resizable: false,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
}

app.whenReady().then(createMainWindow);`,
  },
  {
    path: 'electron/preload.ts',
    name: 'preload.ts',
    language: 'typescript',
    content: `// Electron Preload Script — Context Bridge with Strict Isolation
import { contextBridge, ipcRenderer } from 'electron';
import type { DataRoot } from '../src/logic/tracker';

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  storage: {
    load: () => ipcRenderer.invoke('storage:load'),
    save: (data: DataRoot) => ipcRenderer.invoke('storage:save', data),
    getPath: () => ipcRenderer.invoke('storage:get-path'),
    simulateCorrupt: () => ipcRenderer.invoke('storage:simulate-corrupt'),
  },
  window: {
    setTopmost: (isTopmost: boolean) => ipcRenderer.invoke('window:set-topmost', isTopmost),
    setDocked: (isDocked: boolean) => ipcRenderer.invoke('window:set-docked', isDocked),
    setDockState: (state: string) => ipcRenderer.invoke('window:set-dock-state', state),
    setModalExpanded: (expanded: boolean) => ipcRenderer.invoke('window:set-modal-expanded', expanded),
    moveDelta: (dx: number, dy: number) => ipcRenderer.invoke('window:move-delta', dx, dy),
    close: () => ipcRenderer.invoke('window:close'),
    minimize: () => ipcRenderer.invoke('window:minimize'),
  },
  system: {
    setAutoStart: (enabled: boolean) => ipcRenderer.invoke('system:set-autostart', enabled),
    getAutoStart: () => ipcRenderer.invoke('system:get-autostart'),
  },
});`,
  },
  {
    path: 'src/logic/electronStorage.ts',
    name: 'electronStorage.ts',
    language: 'typescript',
    content: `// Safe Atomic JSON Storage for %LOCALAPPDATA%\\MiniTimeTracker\\data.json
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { DataRoot } from './tracker';
import { createDefaultData, parseAndValidateDataJson } from './tracker';

export function resolveDataFilePath(customPath?: string): string {
  if (customPath) return path.resolve(customPath);
  const localAppData = process.env.LOCALAPPDATA;
  if (localAppData) {
    return path.join(localAppData, 'MiniTimeTracker', 'data.json');
  }
  return path.join(os.homedir(), '.minitimetracker', 'data.json');
}

export class ElectronStorageManager {
  private filePath: string;
  private storageDir: string;

  constructor() {
    this.filePath = resolveDataFilePath();
    this.storageDir = path.dirname(this.filePath);
  }

  public saveSync(data: DataRoot): void {
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
    const tempFile = path.join(this.storageDir, \`data.json.tmp.\${Date.now()}\`);
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, this.filePath);
  }
}`,
  },
  {
    path: 'src/logic/electronDocking.ts',
    name: 'electronDocking.ts',
    language: 'typescript',
    content: `// Windows 11 Edge Docking Math & Anti-Flicker Controller
export interface DisplayWorkArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function calculateWindowPosition(
  isDocked: boolean,
  dockState: 'hidden' | 'opening' | 'visible' | 'closing',
  workArea: DisplayWorkArea,
  floatingPos: { x: number; y: number },
  dims = { width: 298, height: 80, peekTabWidth: 14 }
) {
  const clampedY = Math.max(workArea.y + 10, Math.min(workArea.y + workArea.height - dims.height - 10, floatingPos.y));

  if (!isDocked) {
    const clampedX = Math.max(workArea.x + 10, Math.min(workArea.x + workArea.width - dims.width - 10, floatingPos.x));
    return { x: clampedX, y: clampedY };
  }

  if (dockState === 'hidden') {
    return { x: workArea.x + workArea.width - dims.peekTabWidth, y: clampedY };
  }

  return { x: workArea.x + workArea.width - dims.width, y: clampedY };
}`,
  },
  {
    path: 'README.md',
    name: 'README.md',
    language: 'markdown',
    content: `# Mini Time Tracker — Windows 11 (Electron & TypeScript)

Минималистичный плавающий трекер времени для Windows 11, перенесённый с WPF на Electron с полным сохранением визуального оформления и поведения веб-прототипа.

## Особенности
- Окно без рамок с прозрачным фоном и акриловым эффектом Windows 11 Fluent UI
- Режим «Поверх всех окон» (Topmost)
- Скрытие виджета за правым краем экрана с выступающим язычком (Edge Peek Tab)
- Защита от мерцания язычка: иммунитет к промежуточным mouseout во время анимации раскрытия и задержка 300 мс перед сворачиванием
- Хранение данных в \`%LOCALAPPDATA%\\MiniTimeTracker\\data.json\` с безопасной атомарной записью
- Восстановление и автоматическое создание бэкапа при повреждении файла (\`data.corrupt.*.json\`)
- Точный учёт времени строго по дельте меток ISO 8601 UTC

## Запуск
\`\`\`bash
npm install
npm run build:electron
npm run electron:start
\`\`\`
`,
  },
];
