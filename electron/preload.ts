import { contextBridge, ipcRenderer } from 'electron';
import type { DataRoot } from '../src/logic/tracker.ts';

export interface IElectronAPI {
  isElectron: boolean;
  storage: {
    load: () => Promise<DataRoot>;
    save: (data: DataRoot) => Promise<{ success: boolean; error?: string }>;
    getPath: () => Promise<string>;
    simulateCorrupt: () => Promise<{ recovered: DataRoot; backupPath: string; error: string }>;
  };
  window: {
    setTopmost: (isTopmost: boolean) => Promise<void>;
    setDocked: (isDocked: boolean) => Promise<void>;
    setDockState: (state: 'hidden' | 'opening' | 'visible' | 'closing') => Promise<void>;
    setModalExpanded: (expanded: boolean) => Promise<void>;
    moveDelta: (dx: number, dy: number) => Promise<void>;
    close: () => Promise<void>;
    minimize: () => Promise<void>;
  };
  system: {
    setAutoStart: (enabled: boolean) => Promise<boolean>;
    getAutoStart: () => Promise<boolean>;
  };
}

const api: IElectronAPI = {
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
    setDockState: (state: 'hidden' | 'opening' | 'visible' | 'closing') =>
      ipcRenderer.invoke('window:set-dock-state', state),
    setModalExpanded: (expanded: boolean) => ipcRenderer.invoke('window:set-modal-expanded', expanded),
    moveDelta: (dx: number, dy: number) => ipcRenderer.invoke('window:move-delta', dx, dy),
    close: () => ipcRenderer.invoke('window:close'),
    minimize: () => ipcRenderer.invoke('window:minimize'),
  },
  system: {
    setAutoStart: (enabled: boolean) => ipcRenderer.invoke('system:set-autostart', enabled),
    getAutoStart: () => ipcRenderer.invoke('system:get-autostart'),
  },
};

contextBridge.exposeInMainWorld('electronAPI', api);
