/**
 * Pure business logic for Mini Time Tracker
 * Corresponds to C# TimeTrackerEngine and JsonStorageService
 */

export interface ActivityItem {
  id: string;
  name: string;
  color?: string;
  createdAt: string;
}

export interface TimeSession {
  id: string;
  activityId: string;
  activityName: string;
  startTime: string; // ISO 8601 UTC
  endTime: string;   // ISO 8601 UTC
  durationSeconds: number;
}

export interface ActiveSessionState {
  activityId: string;
  activityName: string;
  startTime: string; // ISO 8601 UTC
}

export interface WidgetSettings {
  isTopmost: boolean;
  isEdgeDocked: boolean;
  dockSide: 'right' | 'left';
  positionX: number;
  positionY: number;
  opacity: number;
}

export interface DataRoot {
  schemaVersion: number;
  activities: ActivityItem[];
  history: TimeSession[];
  activeSession: ActiveSessionState | null;
  settings: WidgetSettings;
}

export const CURRENT_SCHEMA_VERSION = 1;

export function createDefaultData(): DataRoot {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    activities: [
      {
        id: 'act-work-default',
        name: 'Работа',
        color: '#3b82f6',
        createdAt: new Date().toISOString(),
      },
    ],
    history: [],
    activeSession: null,
    settings: {
      isTopmost: true,
      isEdgeDocked: false,
      dockSide: 'right',
      positionX: 40,
      positionY: 80,
      opacity: 0.96,
    },
  };
}

/**
 * Format duration in seconds to HH:mm:ss format
 */
export function formatDuration(totalSeconds: number): string {
  if (totalSeconds < 0 || isNaN(totalSeconds)) {
    return '00:00:00';
  }
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Calculate elapsed seconds from ISO timestamp using delta
 */
export function calculateElapsedSeconds(startTimeIso: string, currentTimeMs: number = Date.now()): number {
  const startMs = Date.parse(startTimeIso);
  if (isNaN(startMs)) return 0;
  const diffMs = Math.max(0, currentTimeMs - startMs);
  return Math.floor(diffMs / 1000);
}

/**
 * Time Tracker Logic Engine
 */
export class TrackerEngine {
  private data: DataRoot;

  constructor(initialData?: DataRoot) {
    this.data = initialData ? JSON.parse(JSON.stringify(initialData)) : createDefaultData();
  }

  public getData(): DataRoot {
    return JSON.parse(JSON.stringify(this.data));
  }

  public isRunning(): boolean {
    return this.data.activeSession !== null;
  }

  public getActiveSession(): ActiveSessionState | null {
    return this.data.activeSession;
  }

  public getActivities(): ActivityItem[] {
    return this.data.activities;
  }

  public getHistory(): TimeSession[] {
    return this.data.history;
  }

  public addActivity(name: string, color?: string): ActivityItem {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new Error('Название активности не может быть пустым');
    }
    const exists = this.data.activities.some(
      (a) => a.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      throw new Error(`Активность «${trimmed}» уже существует`);
    }

    const newActivity: ActivityItem = {
      id: 'act-' + Math.random().toString(36).substring(2, 9),
      name: trimmed,
      color: color || '#10b981',
      createdAt: new Date().toISOString(),
    };
    this.data.activities.push(newActivity);
    return newActivity;
  }

  public startSession(activityId: string, customStartTime?: string): ActiveSessionState {
    if (this.data.activeSession) {
      throw new Error('Сессия уже запущена. Одновременный запуск нескольких сессий запрещён.');
    }

    const activity = this.data.activities.find((a) => a.id === activityId);
    if (!activity) {
      throw new Error(`Активность с id "${activityId}" не найдена`);
    }

    const activeState: ActiveSessionState = {
      activityId: activity.id,
      activityName: activity.name,
      startTime: customStartTime || new Date().toISOString(),
    };

    this.data.activeSession = activeState;
    return activeState;
  }

  public stopSession(customEndTime?: string): TimeSession {
    if (!this.data.activeSession) {
      throw new Error('Нет активной сессии для завершения');
    }

    const active = this.data.activeSession;
    const endTime = customEndTime || new Date().toISOString();
    const durationSeconds = Math.max(
      0,
      Math.floor((Date.parse(endTime) - Date.parse(active.startTime)) / 1000)
    );

    const completedSession: TimeSession = {
      id: 'sess-' + Math.random().toString(36).substring(2, 9),
      activityId: active.activityId,
      activityName: active.activityName,
      startTime: active.startTime,
      endTime,
      durationSeconds,
    };

    // Prepend to history so newest is first
    this.data.history.unshift(completedSession);
    this.data.activeSession = null;

    return completedSession;
  }

  public updateSettings(settings: Partial<WidgetSettings>): WidgetSettings {
    this.data.settings = { ...this.data.settings, ...settings };
    return this.data.settings;
  }
}

/**
 * Pure state machine for Edge Docking
 * Controls transitions without oscillation or flickering
 */
export type DockStateType = 'Floating' | 'DockedHidden' | 'DockedOpening' | 'DockedVisible' | 'DockedClosing';

export class EdgeDockStateMachine {
  private state: DockStateType;

  constructor(initialState: DockStateType = 'Floating') {
    this.state = initialState;
  }

  public getState(): DockStateType {
    return this.state;
  }

  public onEnableDock(): void {
    this.state = 'DockedHidden';
  }

  public onDisableDock(): void {
    this.state = 'Floating';
  }

  public onMouseEnter(): void {
    if (this.state === 'DockedHidden' || this.state === 'DockedClosing') {
      this.state = 'DockedOpening';
    }
  }

  public onAnimationComplete(): void {
    if (this.state === 'DockedOpening') {
      this.state = 'DockedVisible';
    } else if (this.state === 'DockedClosing') {
      this.state = 'DockedHidden';
    }
  }

  public onMouseLeaveConfirmed(isCursorTrulyOutside: boolean): void {
    // CRITICAL: NEVER allow closing transition while state is DockedOpening!
    // Transient mouse movements during expansion must not abort opening.
    if (this.state === 'DockedVisible') {
      if (isCursorTrulyOutside) {
        this.state = 'DockedClosing';
      }
    }
  }

  public onDragAway(): void {
    this.state = 'Floating';
  }
}

/**
 * Storage validation and corruption recovery helper
 */
export interface StorageResult {
  data: DataRoot;
  isCorrupted: boolean;
  corruptBackupContent?: string;
  errorMessage?: string;
}

export function parseAndValidateDataJson(rawJson: string): StorageResult {
  try {
    const parsed = JSON.parse(rawJson);
    if (!parsed || typeof parsed !== 'object') {
      return {
        data: createDefaultData(),
        isCorrupted: true,
        corruptBackupContent: rawJson,
        errorMessage: 'JSON корневой объект повреждён',
      };
    }

    // Validate required fields
    if (typeof parsed.schemaVersion !== 'number') {
      return {
        data: createDefaultData(),
        isCorrupted: true,
        corruptBackupContent: rawJson,
        errorMessage: 'Отсутствует или повреждена версия схемы (schemaVersion)',
      };
    }

    if (!Array.isArray(parsed.activities) || parsed.activities.length === 0) {
      return {
        data: createDefaultData(),
        isCorrupted: true,
        corruptBackupContent: rawJson,
        errorMessage: 'Список активностей пуст или повреждён',
      };
    }

    if (!Array.isArray(parsed.history)) {
      parsed.history = [];
    }

    if (!parsed.settings || typeof parsed.settings !== 'object') {
      parsed.settings = createDefaultData().settings;
    }

    return {
      data: parsed as DataRoot,
      isCorrupted: false,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      data: createDefaultData(),
      isCorrupted: true,
      corruptBackupContent: rawJson,
      errorMessage: `Синтаксическая ошибка JSON: ${message}`,
    };
  }
}
