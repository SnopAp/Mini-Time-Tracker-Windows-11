"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const api = {
    isElectron: true,
    storage: {
        load: () => electron_1.ipcRenderer.invoke('storage:load'),
        save: (data) => electron_1.ipcRenderer.invoke('storage:save', data),
        getPath: () => electron_1.ipcRenderer.invoke('storage:get-path'),
        simulateCorrupt: () => electron_1.ipcRenderer.invoke('storage:simulate-corrupt'),
    },
    window: {
        setTopmost: (isTopmost) => electron_1.ipcRenderer.invoke('window:set-topmost', isTopmost),
        setDocked: (isDocked) => electron_1.ipcRenderer.invoke('window:set-docked', isDocked),
        setDockState: (state) => electron_1.ipcRenderer.invoke('window:set-dock-state', state),
        setModalExpanded: (expanded) => electron_1.ipcRenderer.invoke('window:set-modal-expanded', expanded),
        moveDelta: (dx, dy) => electron_1.ipcRenderer.invoke('window:move-delta', dx, dy),
        close: () => electron_1.ipcRenderer.invoke('window:close'),
        minimize: () => electron_1.ipcRenderer.invoke('window:minimize'),
    },
    system: {
        setAutoStart: (enabled) => electron_1.ipcRenderer.invoke('system:set-autostart', enabled),
        getAutoStart: () => electron_1.ipcRenderer.invoke('system:get-autostart'),
    },
};
electron_1.contextBridge.exposeInMainWorld('electronAPI', api);
