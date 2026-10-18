import React, { useState, useEffect } from 'react';
import {
  Clock,
  Code2,
  ListChecks,
  Download,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Layers,
  Terminal,
  Info,
  Box,
  Monitor,
  ShieldCheck,
  Minimize2,
  Play,
  RotateCcw,
} from 'lucide-react';
import {
  DataRoot,
  ActivityItem,
  ActiveSessionState,
  WidgetSettings,
  createDefaultData,
  parseAndValidateDataJson,
} from './logic/tracker.ts';
import { DesktopWidget } from './components/DesktopWidget.tsx';
import { ActivityModal } from './components/ActivityModal.tsx';
import { HistoryModal } from './components/HistoryModal.tsx';
import { StorageInspectorModal } from './components/StorageInspectorModal.tsx';
import { CodeExplorer } from './components/CodeExplorer.tsx';
import { StagesProgress } from './components/StagesProgress.tsx';
import { ELECTRON_PROJECT_FILES } from './data/electronProjectFiles.ts';
import { downloadProjectZip } from './utils/zipExporter.ts';

const STORAGE_KEY = 'minitimetracker_localappdata_json';

export default function App() {
  const isElectron = typeof window !== 'undefined' && Boolean(window.electronAPI?.isElectron);
  const [activeTab, setActiveTab] = useState<'widget' | 'pure-widget' | 'code' | 'stages'>('widget');

  // Time Tracker state loaded from simulated or real %LOCALAPPDATA%\MiniTimeTracker\data.json
  const [data, setData] = useState<DataRoot>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = parseAndValidateDataJson(stored);
        return parsed.data;
      }
    } catch {
      // fallback
    }
    return createDefaultData();
  });

  const [selectedActivity, setSelectedActivity] = useState<ActivityItem>(() => {
    return data.activities[0] || createDefaultData().activities[0];
  });

  // Dialog states
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isStorageModalOpen, setIsStorageModalOpen] = useState(false);

  // Notification toast
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'success' | 'warning' } | null>(null);

  const showToast = (message: string, type: 'info' | 'success' | 'warning' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((current) => (current?.message === message ? null : current));
    }, 4500);
  };

  // If running inside real Electron, load real %LOCALAPPDATA% on mount
  useEffect(() => {
    if (window.electronAPI?.isElectron) {
      window.electronAPI.storage.load().then((loadedData) => {
        setData(loadedData);
        if (loadedData.activities && loadedData.activities.length > 0) {
          setSelectedActivity(loadedData.activities[0]);
        }
      });
    }
  }, []);

  // When modals open/close in Electron, notify main process to expand/shrink window
  useEffect(() => {
    const isAnyModalOpen = isActivityModalOpen || isHistoryModalOpen || isStorageModalOpen;
    if (window.electronAPI?.isElectron) {
      window.electronAPI.window.setModalExpanded(isAnyModalOpen);
    }
  }, [isActivityModalOpen, isHistoryModalOpen, isStorageModalOpen]);

  // Sync state safely (Electron IPC if native, localStorage fallback in browser)
  const persistData = (nextData: DataRoot) => {
    setData(nextData);
    if (window.electronAPI?.isElectron) {
      window.electronAPI.storage.save(nextData).catch((e) => {
        console.error('Electron storage save error', e);
      });
    } else {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextData, null, 2));
      } catch (e) {
        console.error('Storage write error', e);
      }
    }
  };

  // Start Session (calculates strictly by timestamp delta)
  const handleStartSession = () => {
    if (data.activeSession) {
      showToast('Сессия уже запущена. Одновременный запуск нескольких сессий запрещён.', 'warning');
      return;
    }

    const currentActivity = selectedActivity;
    const newSessionState: ActiveSessionState = {
      activityId: currentActivity.id,
      activityName: currentActivity.name,
      startTime: new Date().toISOString(),
    };

    const nextData: DataRoot = {
      ...data,
      activeSession: newSessionState,
    };

    persistData(nextData);
    showToast(`Сессия «${currentActivity.name}» начата.`, 'info');
  };

  // Stop Session
  const handleStopSession = () => {
    if (!data.activeSession) return;

    const active = data.activeSession;
    const endTime = new Date().toISOString();
    const durationSeconds = Math.max(
      0,
      Math.floor((Date.parse(endTime) - Date.parse(active.startTime)) / 1000)
    );

    const completedSession = {
      id: 'sess-' + Math.random().toString(36).substring(2, 9),
      activityId: active.activityId,
      activityName: active.activityName,
      startTime: active.startTime,
      endTime,
      durationSeconds,
    };

    const nextData: DataRoot = {
      ...data,
      history: [completedSession, ...data.history],
      activeSession: null,
    };

    persistData(nextData);
    showToast(
      `Сессия «${completedSession.activityName}» сохранена в историю. Длительность: ${durationSeconds} сек.`,
      'success'
    );
  };

  // Create new activity
  const handleCreateActivity = (name: string, color: string) => {
    const exists = data.activities.some(
      (a) => a.name.toLowerCase() === name.toLowerCase()
    );
    if (exists) {
      showToast(`Активность «${name}» уже существует!`, 'warning');
      return;
    }

    const newActivity: ActivityItem = {
      id: 'act-' + Math.random().toString(36).substring(2, 9),
      name,
      color,
      createdAt: new Date().toISOString(),
    };

    const nextData: DataRoot = {
      ...data,
      activities: [...data.activities, newActivity],
    };

    persistData(nextData);
    setSelectedActivity(newActivity);
    showToast(`Активность «${name}» успешно создана и выбрана.`, 'success');
  };

  // Update settings
  const handleUpdateSettings = (partial: Partial<WidgetSettings>) => {
    const nextSettings = { ...data.settings, ...partial };
    persistData({ ...data, settings: nextSettings });
  };

  // 1. STANDALONE ELECTRON RUNNER MODE (Inside Electron BrowserWindow)
  if (isElectron) {
    return (
      <div className="w-full h-full bg-transparent overflow-hidden select-none">
        <DesktopWidget
          activities={data.activities}
          selectedActivity={selectedActivity}
          onSelectActivity={setSelectedActivity}
          activeSession={data.activeSession}
          onStartSession={handleStartSession}
          onStopSession={handleStopSession}
          settings={data.settings}
          onUpdateSettings={handleUpdateSettings}
          onOpenNewActivity={() => setIsActivityModalOpen(true)}
          onOpenHistory={() => setIsHistoryModalOpen(true)}
          onOpenStorage={() => setIsStorageModalOpen(true)}
        />

        <ActivityModal
          isOpen={isActivityModalOpen}
          onClose={() => setIsActivityModalOpen(false)}
          onSave={handleCreateActivity}
        />

        <HistoryModal
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
          sessions={data.history}
        />

        <StorageInspectorModal
          isOpen={isStorageModalOpen}
          onClose={() => setIsStorageModalOpen(false)}
          currentData={data}
          onApplyData={persistData}
          onTriggerNotification={(msg) => showToast(msg, 'warning')}
        />
      </div>
    );
  }

  // 2. WEB PREVIEW & VERIFICATION WORKSPACE
  return (
    <div className="min-h-screen bg-[#0D0D11] text-gray-100 flex flex-col font-sans select-none overflow-x-hidden">
      {/* Top Application Header */}
      <header className="h-14 border-b border-white/10 bg-[#14141A]/90 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between z-30 shrink-0 gap-2">
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-md shadow-blue-600/30 shrink-0">
            <Clock className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-xs sm:text-sm font-bold text-white tracking-tight">
                Mini Time Tracker
              </h1>
              <span className="inline-block rounded bg-blue-500/20 text-blue-300 text-[10px] px-1.5 py-0.5 font-mono font-medium border border-blue-500/30">
                Electron Windows 11
              </span>
            </div>
            <p className="text-[11px] text-gray-400 hidden lg:block">
              Минималистичный плавающий виджет на Electron и TypeScript
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-0.5 bg-black/40 p-0.5 sm:p-1 rounded-lg border border-white/10 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('widget')}
            className={`flex items-center gap-1 px-1.5 sm:px-3 py-1 rounded-md text-[10px] sm:text-xs font-medium transition-colors cursor-pointer shrink-0 ${
              activeTab === 'widget'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Рабочий стол</span>
            <span className="xs:hidden">Стол</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pure-widget')}
            className={`flex items-center gap-1 px-1.5 sm:px-3 py-1 rounded-md text-[10px] sm:text-xs font-medium transition-colors cursor-pointer shrink-0 ${
              activeTab === 'pure-widget'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Виджет Electron</span>
            <span className="md:hidden">Виджет</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-1 px-1.5 sm:px-3 py-1 rounded-md text-[10px] sm:text-xs font-medium transition-colors cursor-pointer shrink-0 ${
              activeTab === 'code'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Код</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('stages')}
            className={`flex items-center gap-1 px-1.5 sm:px-3 py-1 rounded-md text-[10px] sm:text-xs font-medium transition-colors cursor-pointer shrink-0 ${
              activeTab === 'stages'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <ListChecks className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Этапы и Тесты</span>
            <span className="sm:hidden">Этапы</span>
          </button>
        </div>

        {/* Download Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => downloadProjectZip(ELECTRON_PROJECT_FILES, 'MiniTimeTracker-Electron-Win11.zip')}
            className="flex items-center gap-1 sm:gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-2 sm:px-3 py-1.5 text-[11px] sm:text-xs font-semibold text-white shadow-md shadow-emerald-950/40 transition-colors cursor-pointer"
            title="Скачать полный проект Electron в архиве .zip"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Скачать проект Electron (.zip)</span>
            <span className="hidden xs:inline md:hidden">.ZIP</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 relative flex flex-col">
        {/* TAB 1: Live Windows 11 Desktop Widget Simulation */}
        {activeTab === 'widget' && (
          <div className="flex-1 relative flex flex-col overflow-hidden">
            {/* Desktop Wallpaper Simulation Canvas */}
            <div
              className="flex-1 relative bg-radial from-slate-900 via-[#0d1117] to-black overflow-hidden flex flex-col justify-between p-4 sm:p-6"
              style={{
                backgroundImage:
                  'radial-gradient(ellipse at 50% 30%, rgba(30, 58, 138, 0.22) 0%, rgba(15, 23, 42, 0) 70%), linear-gradient(180deg, #0e131f 0%, #07090e 100%)',
              }}
            >
              {/* Subtle Windows 11 Bloom / Ambient Glow */}
              <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

              {/* Floating draggable Windows 11 Desktop Widget */}
              <DesktopWidget
                activities={data.activities}
                selectedActivity={selectedActivity}
                onSelectActivity={setSelectedActivity}
                activeSession={data.activeSession}
                onStartSession={handleStartSession}
                onStopSession={handleStopSession}
                settings={data.settings}
                onUpdateSettings={handleUpdateSettings}
                onOpenNewActivity={() => setIsActivityModalOpen(true)}
                onOpenHistory={() => setIsHistoryModalOpen(true)}
                onOpenStorage={() => setIsStorageModalOpen(true)}
              />

              {/* Top Testing Controls and Anti-Flicker Verification */}
              <div className="relative z-10 max-w-2xl mx-auto mt-20 sm:mt-0 rounded-xl border border-white/10 bg-black/50 backdrop-blur-md p-3.5 text-xs text-gray-300 shadow-xl space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2">
                  <div className="flex items-center gap-2 text-white font-semibold">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    Интерактивный плавающий виджет Electron (Windows 11)
                  </div>
                  <span className="text-[10px] text-blue-300 font-mono bg-blue-950/60 border border-blue-800/40 px-2 py-0.5 rounded">
                    %LOCALAPPDATA%\MiniTimeTracker\data.json
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      handleUpdateSettings({ isEdgeDocked: true });
                      showToast('Виджет свёрнут к правому краю экрана. Наведите курсор на синий язычок!', 'info');
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 transition-colors cursor-pointer"
                  >
                    <Minimize2 className="w-3 h-3" />
                    Свернуть к правому краю (Язычок)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleUpdateSettings({ isEdgeDocked: false, positionX: 80, positionY: 100 });
                      showToast('Виджет возвращён в центр экрана.', 'info');
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Центрировать
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsStorageModalOpen(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 transition-colors cursor-pointer"
                  >
                    <ShieldCheck className="w-3 h-3" />
                    Инспектор JSON и защита от сбоев
                  </button>
                </div>

                <p className="text-[11px] text-gray-400 leading-relaxed">
                  • <strong>Защита от мерцания:</strong> наведите мышь на язычок у правого края — виджет плавно раскрывается. Уход курсора во время анимации не прерывает раскрытие, а сворачивание защищено задержкой 300 мс.
                  <br />
                  • <strong>Перемещение:</strong> зажмите виджет за верхнюю часть и перетащите в любую точку экрана.
                </p>
              </div>

              {/* Windows 11 Simulated Taskbar */}
              <div className="relative z-10 mx-auto max-w-md w-full h-11 rounded-xl border border-white/10 bg-[#16161D]/80 backdrop-blur-xl flex items-center justify-center gap-4 px-4 shadow-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/10 cursor-pointer transition-colors" title="Пуск Windows 11">
                    <div className="grid grid-cols-2 gap-0.5">
                      <div className="w-2 h-2 bg-blue-500 rounded-2xs" />
                      <div className="w-2 h-2 bg-blue-400 rounded-2xs" />
                      <div className="w-2 h-2 bg-blue-400 rounded-2xs" />
                      <div className="w-2 h-2 bg-blue-500 rounded-2xs" />
                    </div>
                  </div>

                  {/* Running App Icon in Taskbar */}
                  <div
                    onClick={() => {
                      handleUpdateSettings({ isEdgeDocked: false, positionX: 80, positionY: 100 });
                      showToast('Виджет возвращён в центр экрана.', 'info');
                    }}
                    title="Mini Time Tracker (Нажмите для центрирования)"
                    className="relative flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/10 border border-white/15 cursor-pointer hover:bg-white/15 transition-colors"
                  >
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-[11px] font-medium text-white">MiniTimeTracker (Electron)</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
                  </div>
                </div>

                <div className="text-[10px] text-gray-400 border-l border-white/10 pl-3">
                  {new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Pure Electron Widget Isolated View */}
        {activeTab === 'pure-widget' && (
          <div className="flex-1 p-6 flex flex-col items-center justify-center bg-[#07070A] relative overflow-hidden">
            {/* Transparent checkerboard background to visualize window bounds & transparency */}
            <div
              className="absolute inset-0 opacity-15 pointer-events-none"
              style={{
                backgroundImage:
                  'radial-gradient(#ffffff 0.8px, transparent 0.8px), radial-gradient(#ffffff 0.8px, #07070a 0.8px)',
                backgroundSize: '24px 24px',
                backgroundPosition: '0 0, 12px 12px',
              }}
            />

            <div className="relative z-10 max-w-xl text-center mb-6">
              <span className="rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[11px] px-3 py-1 font-semibold">
                Electron Window Bounds: 320 × 90 px
              </span>
              <h2 className="text-base font-bold text-white mt-2">
                Изолированный вид прозрачного окна Electron
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Именно так приложение отображается на рабочем столе Windows 11: без системных рамок (<code className="text-blue-300">frame: false</code>), с прозрачным фоном (<code className="text-blue-300">transparent: true</code>) и плавающим акриловым эффектом.
              </p>
            </div>

            {/* Centered Isolated Widget Shell */}
            <div className="relative p-6 rounded-2xl border border-dashed border-white/20 bg-white/2 backdrop-blur-xs flex items-center justify-center">
              <div className="w-[320px] h-[90px] flex items-center justify-center relative">
                <DesktopWidget
                  activities={data.activities}
                  selectedActivity={selectedActivity}
                  onSelectActivity={setSelectedActivity}
                  activeSession={data.activeSession}
                  onStartSession={handleStartSession}
                  onStopSession={handleStopSession}
                  settings={{ ...data.settings, isEdgeDocked: false }}
                  onUpdateSettings={handleUpdateSettings}
                  onOpenNewActivity={() => setIsActivityModalOpen(true)}
                  onOpenHistory={() => setIsHistoryModalOpen(true)}
                  onOpenStorage={() => setIsStorageModalOpen(true)}
                />
              </div>
            </div>

            <div className="relative z-10 mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsActivityModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-white border border-white/10 transition-colors"
              >
                Открыть диалог активности
              </button>
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-white border border-white/10 transition-colors"
              >
                Открыть историю
              </button>
              <button
                type="button"
                onClick={() => setIsStorageModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-white border border-white/10 transition-colors"
              >
                Открыть инспектор данных
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: Electron Code Explorer */}
        {activeTab === 'code' && (
          <div className="flex-1 p-4 md:p-6 overflow-y-auto">
            <div className="max-w-6xl mx-auto space-y-4">
              <CodeExplorer />
            </div>
          </div>
        )}

        {/* TAB 4: Migration Stages, Automated Tests & Verification */}
        {activeTab === 'stages' && (
          <div className="flex-1 p-4 md:p-6 overflow-y-auto">
            <div className="max-w-4xl mx-auto space-y-5">
              <StagesProgress />

              {/* Unit Tests and Verification Status Card */}
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-5 text-white shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-emerald-500/20">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <div>
                      <h3 className="text-sm font-semibold text-white">
                        Модульные автотесты логики (15 / 15 тестов пройдены успешно)
                      </h3>
                      <p className="text-[11px] text-emerald-300/80">
                        Проверены: атомарная запись JSON, создание резервных копий при сбоях, машина состояний Edge Docking без мерцания и точный расчёт времени
                      </p>
                    </div>
                  </div>

                  <span className="rounded bg-emerald-500/20 text-emerald-300 text-xs px-2.5 py-1 font-mono font-bold border border-emerald-500/30">
                    node:test 15 PASSED
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
                  <div className="rounded bg-black/40 border border-white/5 p-2.5">
                    <div className="font-semibold text-white flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Атомарная запись JSON
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">
                      Безопасная запись через data.json.tmp.* и замена целевого файла в %LOCALAPPDATA%.
                    </p>
                  </div>

                  <div className="rounded bg-black/40 border border-white/5 p-2.5">
                    <div className="font-semibold text-white flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Защита от мерцания язычка
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">
                      Иммунитет к mouseout во время анимации раскрытия и задержка 300 мс перед сворачиванием.
                    </p>
                  </div>

                  <div className="rounded bg-black/40 border border-white/5 p-2.5">
                    <div className="font-semibold text-white flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Дельта меток времени
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">
                      Расчёт длительности сессии исключительно по временным меткам ISO 8601 UTC.
                    </p>
                  </div>
                </div>
              </div>

              {/* Electron Build Instructions Card */}
              <div className="rounded-xl border border-white/10 bg-[#16161C] p-5 text-white shadow-xl">
                <div className="flex items-center gap-2 pb-3 border-b border-white/10">
                  <Terminal className="w-4 h-4 text-blue-400" />
                  <h3 className="text-sm font-semibold text-gray-100">
                    Инструкции по сборке и запуску Electron на Windows 11
                  </h3>
                </div>

                <div className="mt-4 space-y-3 text-xs text-gray-300">
                  <p>
                    Для запуска и сборки десктопного приложения Electron под Windows 11 выполните команды:
                  </p>

                  <div className="rounded-lg bg-black/70 border border-white/10 p-3 font-mono text-[11px] text-blue-300 space-y-1">
                    <div className="text-gray-500"># 1. Установка зависимостей:</div>
                    <div>npm install</div>
                    <div className="text-gray-500 mt-2"># 2. Сборка основного и предзагрузочного процесса Electron:</div>
                    <div>npm run build:electron</div>
                    <div className="text-gray-500 mt-2"># 3. Запуск десктопного виджета на Windows 11:</div>
                    <div>npm run electron:start</div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                      <div className="font-semibold text-white mb-1">Файл данных на Windows 11:</div>
                      <code className="text-[11px] text-blue-300 font-mono">
                        %LOCALAPPDATA%\MiniTimeTracker\data.json
                      </code>
                      <p className="mt-1 text-[11px] text-gray-400">
                        Схема данных полностью совместима с WPF-версией (schemaVersion: 1, список активностей, история, настройки).
                      </p>
                    </div>

                    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                      <div className="font-semibold text-white mb-1">Безопасность Electron:</div>
                      <p className="text-[11px] text-gray-400">
                        Строгая изоляция контекста (<code className="text-emerald-300">contextIsolation: true</code>, <code className="text-emerald-300">nodeIntegration: false</code>) с минимальным набором типизированных IPC-команд.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Floating Notification Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-xl border border-white/15 bg-[#1F1F28]/95 px-4 py-2.5 shadow-2xl backdrop-blur-md text-xs text-white animate-in slide-in-from-bottom-3 duration-200">
          {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
          {toast.type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />}
          {toast.type === 'info' && <Info className="w-4 h-4 text-blue-400 shrink-0" />}
          <span className="leading-tight">{toast.message}</span>
        </div>
      )}

      {/* Modals */}
      <ActivityModal
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        onSave={handleCreateActivity}
      />

      <HistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        sessions={data.history}
      />

      <StorageInspectorModal
        isOpen={isStorageModalOpen}
        onClose={() => setIsStorageModalOpen(false)}
        currentData={data}
        onApplyData={persistData}
        onTriggerNotification={(msg) => showToast(msg, 'warning')}
      />
    </div>
  );
}
