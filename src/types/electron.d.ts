import type { IElectronAPI } from '../../electron/preload.ts';

declare global {
  interface Window {
    electronAPI?: IElectronAPI;
  }
}

export {};
