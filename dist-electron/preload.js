"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// electron/preload.ts
var preload_exports = {};
module.exports = __toCommonJS(preload_exports);
var import_electron = require("electron");
var api = {
  isElectron: true,
  storage: {
    load: () => import_electron.ipcRenderer.invoke("storage:load"),
    save: (data) => import_electron.ipcRenderer.invoke("storage:save", data),
    getPath: () => import_electron.ipcRenderer.invoke("storage:get-path"),
    simulateCorrupt: () => import_electron.ipcRenderer.invoke("storage:simulate-corrupt")
  },
  window: {
    setTopmost: (isTopmost) => import_electron.ipcRenderer.invoke("window:set-topmost", isTopmost),
    setDocked: (isDocked) => import_electron.ipcRenderer.invoke("window:set-docked", isDocked),
    setDockState: (state) => import_electron.ipcRenderer.invoke("window:set-dock-state", state),
    setModalExpanded: (expanded) => import_electron.ipcRenderer.invoke("window:set-modal-expanded", expanded),
    moveDelta: (dx, dy) => import_electron.ipcRenderer.invoke("window:move-delta", dx, dy),
    close: () => import_electron.ipcRenderer.invoke("window:close"),
    minimize: () => import_electron.ipcRenderer.invoke("window:minimize")
  },
  system: {
    setAutoStart: (enabled) => import_electron.ipcRenderer.invoke("system:set-autostart", enabled),
    getAutoStart: () => import_electron.ipcRenderer.invoke("system:get-autostart")
  }
};
import_electron.contextBridge.exposeInMainWorld("electronAPI", api);
