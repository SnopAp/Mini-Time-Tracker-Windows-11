import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Square,
  Pin,
  Plus,
  History as HistoryIcon,
  Minimize2,
  Database,
  ChevronDown,
  Sparkles,
  Minus,
  X,
} from 'lucide-react';
import {
  ActivityItem,
  ActiveSessionState,
  WidgetSettings,
  formatDuration,
  calculateElapsedSeconds,
} from '../logic/tracker.ts';

interface DesktopWidgetProps {
  activities: ActivityItem[];
  selectedActivity: ActivityItem;
  onSelectActivity: (activity: ActivityItem) => void;
  activeSession: ActiveSessionState | null;
  onStartSession: () => void;
  onStopSession: () => void;
  settings: WidgetSettings;
  onUpdateSettings: (settings: Partial<WidgetSettings>) => void;
  onOpenNewActivity: () => void;
  onOpenHistory: () => void;
  onOpenStorage: () => void;
}

export const DesktopWidget: React.FC<DesktopWidgetProps> = ({
  activities,
  selectedActivity,
  onSelectActivity,
  activeSession,
  onStartSession,
  onStopSession,
  settings,
  onUpdateSettings,
  onOpenNewActivity,
  onOpenHistory,
  onOpenStorage,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isEdgeCollapsed, setIsEdgeCollapsed] = useState(() => Boolean(settings.isEdgeDocked));
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Sync edge dock state from settings
  useEffect(() => {
    setIsEdgeCollapsed(Boolean(settings.isEdgeDocked));
  }, [settings.isEdgeDocked]);

  // Dragging state
  const [pos, setPos] = useState({ x: settings.positionX || 60, y: settings.positionY || 90 });
  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const widgetRef = useRef<HTMLDivElement>(null);

  // Activity dropdown open state
  const [isActivityDropdownOpen, setIsActivityDropdownOpen] = useState(false);

  // Timer update loop based strictly on timestamp delta
  useEffect(() => {
    if (!activeSession) {
      setElapsedSeconds(0);
      return;
    }

    const updateTimer = () => {
      const seconds = calculateElapsedSeconds(activeSession.startTime, Date.now());
      setElapsedSeconds(seconds);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 200); // 5 times/sec for crisp response
    return () => clearInterval(interval);
  }, [activeSession]);

  // Handle Dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag from widget background/header, not from buttons/dropdowns
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'BUTTON' ||
      target.tagName === 'SELECT' ||
      target.closest('button') ||
      target.closest('.no-drag')
    ) {
      return;
    }

    isDraggingRef.current = true;
    dragOffsetRef.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const newX = Math.max(10, Math.min(window.innerWidth - 320, moveEvent.clientX - dragOffsetRef.current.x));
      const newY = Math.max(10, Math.min(window.innerHeight - 120, moveEvent.clientY - dragOffsetRef.current.y));

      setPos({ x: newX, y: newY });
      onUpdateSettings({ positionX: newX, positionY: newY });
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const collapseTimeoutRef = useRef<number | null>(null);
  const isOpeningRef = useRef(false);

  const handleMouseEnter = () => {
    if (collapseTimeoutRef.current) {
      clearTimeout(collapseTimeoutRef.current);
      collapseTimeoutRef.current = null;
    }
    setIsHovered(true);

    if (settings.isEdgeDocked && isEdgeCollapsed) {
      isOpeningRef.current = true;
      setIsEdgeCollapsed(false);

      window.setTimeout(() => {
        isOpeningRef.current = false;
      }, 320);
    }
  };

  const handleMouseLeave = () => {
    if (isActivityDropdownOpen) return;
    setIsHovered(false);

    // If still in opening animation, completely ignore mouseleave
    if (isOpeningRef.current) return;

    if (settings.isEdgeDocked) {
      if (collapseTimeoutRef.current) clearTimeout(collapseTimeoutRef.current);
      collapseTimeoutRef.current = window.setTimeout(() => {
        setIsEdgeCollapsed(true);
      }, 300);
    }
  };

  // Toggle edge dock mode
  const handleToggleEdgeDock = () => {
    if (collapseTimeoutRef.current) {
      clearTimeout(collapseTimeoutRef.current);
      collapseTimeoutRef.current = null;
    }
    const nextDocked = !settings.isEdgeDocked;
    onUpdateSettings({ isEdgeDocked: nextDocked });
    if (nextDocked) {
      setIsEdgeCollapsed(true);
    } else {
      setIsEdgeCollapsed(false);
    }
  };

  const isRunning = Boolean(activeSession);

  // When edge-docked, flush right edge to screen margin, otherwise use floating pos.x
  const targetX = settings.isEdgeDocked
    ? isEdgeCollapsed
      ? window.innerWidth - 14
      : window.innerWidth - 290
    : pos.x;

  return (
    <div
      ref={widgetRef}
      onMouseDown={handleMouseDown}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: `translate(${targetX}px, ${pos.y}px)`,
        transition: isDraggingRef.current ? 'none' : 'transform 260ms cubic-bezier(0.16, 1, 0.3, 1), opacity 200ms ease',
        zIndex: settings.isTopmost ? 40 : 20,
      }}
      className="fixed top-0 left-0 select-none cursor-grab active:cursor-grabbing pointer-events-auto"
    >
      {/* Right-edge tolerance zone to eliminate dead zones between widget and screen border */}
      {settings.isEdgeDocked && (
        <div className="absolute top-0 -right-8 bottom-0 w-12 pointer-events-auto" />
      )}
      {/* Peek tab indicator on edge when collapsed (always kept in DOM to prevent unmount synthetic leaves) */}
      <div
        title="Наведите курсор, чтобы развернуть виджет"
        onMouseEnter={handleMouseEnter}
        onClick={handleMouseEnter}
        className={`absolute -left-3.5 top-1/2 -translate-y-1/2 h-14 w-3.5 rounded-l-md bg-blue-500 shadow-lg shadow-blue-500/50 flex items-center justify-center cursor-pointer transition-all duration-200 z-50 ${
          isEdgeCollapsed && settings.isEdgeDocked
            ? 'opacity-100 pointer-events-auto hover:w-5'
            : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="w-1 h-7 rounded-full bg-white/70" />
      </div>

      {/* Windows 11 Fluent Acrylic / Mica Widget Shell */}
      <div
        className={`w-[290px] h-[76px] rounded-[14px] border border-white/20 bg-[#1E1E24]/92 backdrop-blur-xl shadow-2xl transition-all duration-200 p-2.5 flex flex-col justify-between ${
          settings.isTopmost ? 'ring-1 ring-blue-500/40 shadow-blue-950/20' : ''
        } ${isEdgeCollapsed ? 'opacity-30' : 'opacity-100'}`}
        style={{
          boxShadow: '0 12px 32px -4px rgba(0, 0, 0, 0.65), 0 2px 6px rgba(255, 255, 255, 0.04) inset',
        }}
      >
          {/* Top Row: Activity & Hover Actions */}
          <div className="flex items-center justify-between h-5">
            {/* Activity Indicator & Selector */}
            <div className="relative no-drag">
              <button
                type="button"
                onClick={() => !isRunning && setIsActivityDropdownOpen(!isActivityDropdownOpen)}
                disabled={isRunning}
                title={isRunning ? 'Активность заблокирована во время отсчёта' : 'Сменить активность'}
                className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[11px] font-semibold tracking-tight transition-colors ${
                  isRunning
                    ? 'text-gray-200 cursor-default'
                    : 'text-gray-200 hover:bg-white/10 hover:text-white cursor-pointer'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0 shadow-xs"
                  style={{ backgroundColor: selectedActivity.color || '#3B82F6' }}
                />
                <span className="max-w-[110px] truncate text-left">
                  {isRunning && activeSession ? activeSession.activityName : selectedActivity.name}
                </span>
                {!isRunning && <ChevronDown className="w-3 h-3 text-gray-400 shrink-0" />}
              </button>

              {/* Activity Selector Dropdown */}
              {isActivityDropdownOpen && !isRunning && (
                <div className="absolute left-0 top-full mt-1.5 w-44 rounded-lg border border-white/15 bg-[#1F1F26] p-1 shadow-xl backdrop-blur-md z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="max-h-36 overflow-y-auto custom-scrollbar">
                    {activities.map((act) => (
                      <button
                        key={act.id}
                        type="button"
                        onClick={() => {
                          onSelectActivity(act);
                          setIsActivityDropdownOpen(false);
                        }}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-left transition-colors ${
                          selectedActivity.id === act.id
                            ? 'bg-blue-600/30 text-blue-200 font-semibold'
                            : 'text-gray-300 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: act.color || '#3B82F6' }}
                        />
                        <span className="truncate">{act.name}</span>
                      </button>
                    ))}
                  </div>

                  <div className="mt-1 pt-1 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => {
                        setIsActivityDropdownOpen(false);
                        onOpenNewActivity();
                      }}
                      className="w-full flex items-center gap-1.5 px-2 py-1 rounded text-xs text-blue-400 hover:bg-white/10 hover:text-blue-300 font-medium"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Новая активность...
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Hover Toolbar (Smooth fade in on cursor hover) */}
            <div
              className={`flex items-center gap-0.5 no-drag transition-opacity duration-150 ${
                isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              {/* Pin / Topmost Toggle */}
              <button
                type="button"
                onClick={() => onUpdateSettings({ isTopmost: !settings.isTopmost })}
                title={settings.isTopmost ? 'Открепить (поверх окон)' : 'Закрепить поверх всех окон'}
                aria-label="Закрепить поверх всех окон"
                className={`p-1 rounded transition-colors ${
                  settings.isTopmost
                    ? 'text-blue-400 bg-blue-500/20 hover:bg-blue-500/30'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/10'
                }`}
              >
                <Pin className="w-3.5 h-3.5 rotate-45" />
              </button>

              {/* Add Activity */}
              <button
                type="button"
                onClick={onOpenNewActivity}
                title="Создать активность"
                aria-label="Создать активность"
                className="p-1 rounded text-gray-400 hover:text-gray-200 hover:bg-white/10 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>

              {/* History */}
              <button
                type="button"
                onClick={onOpenHistory}
                title="История сессий"
                aria-label="История сессий"
                className="p-1 rounded text-gray-400 hover:text-gray-200 hover:bg-white/10 transition-colors"
              >
                <HistoryIcon className="w-3.5 h-3.5" />
              </button>

              {/* Stage 4: Screen Edge Docking Toggle */}
              <button
                type="button"
                onClick={handleToggleEdgeDock}
                title={settings.isEdgeDocked ? 'Открепить от края' : 'Сворачивать к правому краю экрана'}
                aria-label="Сворачивать к краю экрана"
                className={`p-1 rounded transition-colors ${
                  settings.isEdgeDocked
                    ? 'text-emerald-400 bg-emerald-500/20'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/10'
                }`}
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>

              {/* JSON storage inspector */}
              <button
                type="button"
                onClick={onOpenStorage}
                title="JSON хранилище"
                aria-label="Открыть JSON хранилище"
                className="p-1 rounded text-gray-400 hover:text-gray-200 hover:bg-white/10 transition-colors"
              >
                <Database className="w-3.5 h-3.5" />
              </button>

              {/* Minimize Window */}
              <button
                type="button"
                onClick={() => {
                  if (window.electronAPI) {
                    window.electronAPI.window.minimize();
                  } else {
                    handleToggleEdgeDock();
                  }
                }}
                title="Свернуть виджет"
                aria-label="Свернуть виджет"
                className="p-1 rounded text-gray-400 hover:text-gray-200 hover:bg-white/10 transition-colors"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>

              {/* Close Window */}
              <button
                type="button"
                onClick={() => {
                  if (window.electronAPI) {
                    window.electronAPI.window.close();
                  } else {
                    handleToggleEdgeDock();
                  }
                }}
                title="Закрыть приложение"
                aria-label="Закрыть приложение"
                className="p-1 rounded text-gray-400 hover:text-rose-400 hover:bg-rose-500/20 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Bottom Row: Big Monospace Timer & Start/Stop Action Button */}
          <div className="flex items-center justify-between mt-1">
            {/* HH:mm:ss Timer */}
            <div className="font-mono text-[23px] font-bold tracking-tight text-white pl-1 drop-shadow-sm select-none">
              {formatDuration(elapsedSeconds)}
            </div>

            {/* Start / Stop Button */}
            <button
              type="button"
              onClick={isRunning ? onStopSession : onStartSession}
              aria-label={isRunning ? 'Остановить сессию' : 'Запустить сессию'}
              title={isRunning ? 'Остановить отсчёт' : 'Начать отсчёт'}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-150 cursor-pointer shadow-md no-drag active:scale-95 ${
                isRunning
                  ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-950/50'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-950/50'
              }`}
            >
              {isRunning ? (
                <Square className="w-4 h-4 fill-white" />
              ) : (
                <Play className="w-4 h-4 fill-white ml-0.5" />
              )}
            </button>
          </div>
        </div>
    </div>
  );
};
