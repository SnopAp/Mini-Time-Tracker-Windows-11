import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { DataRoot } from './tracker.ts';
import {
  createDefaultData,
  parseAndValidateDataJson,
} from './tracker.ts';

export interface StorageOptions {
  customFilePath?: string;
}

/**
 * Resolves the official path %LOCALAPPDATA%\MiniTimeTracker\data.json on Windows,
 * with standard user-directory fallback on non-Windows platforms.
 */
export function resolveDataFilePath(customPath?: string): string {
  if (customPath) {
    return path.resolve(customPath);
  }

  const localAppData =
    process.env.LOCALAPPDATA ||
    (process.platform === 'win32'
      ? path.join(os.homedir(), 'AppData', 'Local')
      : null);

  if (localAppData) {
    return path.join(localAppData, 'MiniTimeTracker', 'data.json');
  }

  // Fallback for macOS / Linux / dev environments
  const home = os.homedir();
  return path.join(home, '.minitimetracker', 'data.json');
}

export class ElectronStorageManager {
  private filePath: string;
  private storageDir: string;
  private isWriting = false;
  private writeQueue: Array<() => Promise<void>> = [];
  public lastCorruptBackupPath: string | null = null;
  public lastError: string | null = null;

  constructor(options?: StorageOptions) {
    this.filePath = resolveDataFilePath(options?.customFilePath);
    this.storageDir = path.dirname(this.filePath);
  }

  public getFilePath(): string {
    return this.filePath;
  }

  public getStorageDir(): string {
    return this.storageDir;
  }

  /**
   * Safe synchronous or initial load of data
   */
  public load(): DataRoot {
    try {
      if (!fs.existsSync(this.filePath)) {
        const initial = createDefaultData();
        this.saveSync(initial);
        return initial;
      }

      const rawJson = fs.readFileSync(this.filePath, 'utf-8');
      if (!rawJson.trim()) {
        return this.handleCorruptedFile('Файл данных пуст', rawJson);
      }

      const validation = parseAndValidateDataJson(rawJson);
      if (validation.isCorrupted) {
        return this.handleCorruptedFile(
          validation.errorMessage || 'Невалидная структура данных',
          rawJson
        );
      }

      return validation.data;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      let raw = '';
      try {
        if (fs.existsSync(this.filePath)) {
          raw = fs.readFileSync(this.filePath, 'utf-8');
        }
      } catch {
        // ignore read failure on corrupt check
      }
      return this.handleCorruptedFile(`Ошибка чтения: ${msg}`, raw);
    }
  }

  /**
   * Atomic safe save using a unique temporary file and safe rename/replace
   */
  public async save(data: DataRoot): Promise<boolean> {
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
  public saveSync(data: DataRoot): void {
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }

    const jsonString = JSON.stringify(data, null, 2);
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const tempFilePath = path.join(this.storageDir, `data.json.tmp.${uniqueSuffix}`);

    // 1. Write completely to temp file
    fs.writeFileSync(tempFilePath, jsonString, 'utf-8');

    // 2. Atomically replace target file
    try {
      fs.renameSync(tempFilePath, this.filePath);
    } catch {
      // In some Windows network drives or file locks, fallback to copy+unlink
      fs.copyFileSync(tempFilePath, this.filePath);
      try {
        fs.unlinkSync(tempFilePath);
      } catch {
        // clean up best effort
      }
    }
  }

  private async processQueue(): Promise<void> {
    if (this.isWriting || this.writeQueue.length === 0) return;
    this.isWriting = true;
    const nextTask = this.writeQueue.shift();
    if (nextTask) {
      try {
        await nextTask();
      } catch {
        // handled in promise
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
  public handleCorruptedFile(reason: string, rawContent: string): DataRoot {
    try {
      if (!fs.existsSync(this.storageDir)) {
        fs.mkdirSync(this.storageDir, { recursive: true });
      }

      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, '-')
        .slice(0, 19);
      const backupPath = path.join(this.storageDir, `data.corrupt.${timestamp}.json`);

      if (rawContent && rawContent.length > 0) {
        fs.writeFileSync(backupPath, rawContent, 'utf-8');
      } else {
        fs.writeFileSync(backupPath, `// Corrupted data file backup created at ${new Date().toISOString()}`, 'utf-8');
      }

      this.lastCorruptBackupPath = backupPath;
      this.lastError = `Обнаружен повреждённый файл data.json (${reason}). Резервная копия: ${backupPath}`;
    } catch (e) {
      this.lastError = `Не удалось записать резервную копию повреждённого файла: ${e}`;
    }

    const defaultData = createDefaultData();
    try {
      this.saveSync(defaultData);
    } catch {
      // best-effort initial save
    }
    return defaultData;
  }
}
