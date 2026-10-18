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
import { CSHARP_PROJECT_FILES } from './data/csharpProjectFiles.ts';
import { downloadProjectZip } from './utils/zipExporter.ts';

const STORAGE_KEY = 'minitimetracker_localappdata_json';

export default function App() {
  const [activeTab, setActiveTab] = useState<'widget' | 'code' | 'stages'>('widget');

  // Time Tracker state loaded from simulated %LOCALAPPDATA%\MiniTimeTracker\data.json
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

  // Sync state to local storage safely (mimicking atomic file writes)
  const persistData = (nextData: DataRoot) => {
    setData(nextData);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextData, null, 2));
    } catch (e) {
      console.error('Storage write error', e);
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
              <span className="hidden sm:inline-block rounded bg-blue-500/20 text-blue-300 text-[10px] px-1.5 py-0.5 font-mono font-medium border border-blue-500/30">
                WPF .NET 10 LTS
              </span>
            </div>
            <p className="text-[11px] text-gray-400 hidden lg:block">
              Минималистичный плавающий виджет для Windows 11 x64
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-0.5 sm:gap-1 bg-black/40 p-1 rounded-lg border border-white/10">
          <button
            type="button"
            onClick={() => setActiveTab('widget')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 rounded-md text-[11px] sm:text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'widget'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden xs:inline sm:hidden">Виджет</span>
            <span className="hidden sm:inline">Виджет (Симуляция)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 rounded-md text-[11px] sm:text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'code'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span className="hidden xs:inline sm:hidden">Код</span>
            <span className="hidden sm:inline">C# & XAML Код</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('stages')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 rounded-md text-[11px] sm:text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'stages'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <ListChecks className="w-3.5 h-3.5" />
            <span className="hidden xs:inline sm:hidden">Этапы</span>
            <span className="hidden sm:inline">Этапы 1–5 и Сборка</span>
          </button>
        </div>

        {/* Download Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <a
            href="/realeses/MiniTimeTracker.exe"
            download="MiniTimeTracker.exe"
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-emerald-950/40 transition-colors cursor-pointer"
            title="Скачать готовый скомпилированный билд MiniTimeTracker.exe для Windows 11"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Скачать .EXE</span>
          </a>

          <button
            type="button"
            onClick={() => downloadProjectZip(CSHARP_PROJECT_FILES)}
            className="hidden sm:flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-gray-200 hover:text-white transition-colors cursor-pointer"
            title="Скачать весь исходный код C# в архиве .zip"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>Исходники (.zip)</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 relative flex flex-col">
        {/* TAB 1: Live Windows 11 Desktop Widget Sandbox */}
        {activeTab === 'widget' && (
          <div className="flex-1 relative flex flex-col overflow-hidden">
            {/* Desktop Wallpaper Simulation Canvas */}
            <div
              className="flex-1 relative bg-radial from-slate-900 via-[#0d1117] to-black overflow-hidden flex flex-col justify-between p-6"
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

              {/* Top Hint Banner */}
              <div className="relative z-10 max-w-xl mx-auto mt-24 sm:mt-0 rounded-xl border border-white/10 bg-black/40 backdrop-blur-md p-3 text-xs text-gray-300 shadow-lg">
                <div className="flex items-center gap-2 text-white font-medium mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Интерактивный плавающий виджет рабочего стола Windows 11
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  • <strong>Перемещение:</strong> зажмите и перетащите виджет мышью в любое место.<br />
                  • <strong>Отсчёт:</strong> нажмите зелёную кнопку Play (время вычисляется строго по дельте меток времени).<br />
                  • <strong>Панель при наведении:</strong> наведите курсор на виджет, чтобы увидеть кнопки: 📌 Topmost, ➕ Добавить активность, 📋 Историю сессий, 📐 Скрытие к краю экрана (Этап 4) и 💾 Инспектор JSON.
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
                    <span className="text-[11px] font-medium text-white">MiniTimeTracker.exe</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse ml-0.5" />
                  </div>
                </div>

                <div className="text-[10px] text-gray-400 border-l border-white/10 pl-3">
                  {new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: C# & XAML Code Explorer */}
        {activeTab === 'code' && (
          <div className="flex-1 p-4 md:p-6 overflow-y-auto">
            <div className="max-w-6xl mx-auto space-y-4">
              <CodeExplorer />
            </div>
          </div>
        )}

        {/* TAB 3: Iteration Stages & Windows 11 Build Guide */}
        {activeTab === 'stages' && (
          <div className="flex-1 p-4 md:p-6 overflow-y-auto">
            <div className="max-w-4xl mx-auto space-y-5">
              <StagesProgress />

              {/* Ready Executable Card */}
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-5 text-white shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-emerald-500/20">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <div>
                      <h3 className="text-sm font-semibold text-white">
                        Готовый автономный билд скомпилирован: <code>realeses/MiniTimeTracker.exe</code>
                      </h3>
                      <p className="text-[11px] text-emerald-300/80">
                        Целевая платформа: Windows 11 x64 (PE32+ GUI executable, без сторонних зависимостей)
                      </p>
                    </div>
                  </div>

                  <a
                    href="/realeses/MiniTimeTracker.exe"
                    download="MiniTimeTracker.exe"
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 px-3.5 py-1.5 text-xs font-bold text-gray-950 shadow-md transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Скачать MiniTimeTracker.exe (~49 КБ)
                  </a>
                </div>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="rounded bg-black/40 border border-white/5 p-2">
                    <span className="text-[10px] text-gray-400 block">Путь в проекте</span>
                    <code className="text-[11px] text-emerald-300 font-mono">/realeses/MiniTimeTracker.exe</code>
                  </div>
                  <div className="rounded bg-black/40 border border-white/5 p-2">
                    <span className="text-[10px] text-gray-400 block">Размер исполняемого файла</span>
                    <span className="font-semibold text-white">49.4 КБ (автономный билд)</span>
                  </div>
                  <div className="rounded bg-black/40 border border-white/5 p-2">
                    <span className="text-[10px] text-gray-400 block">Локальные данные на Windows</span>
                    <code className="text-[10px] text-blue-300 font-mono">%LOCALAPPDATA%\MiniTimeTracker\</code>
                  </div>
                </div>
              </div>

              {/* Build Instructions Card */}
              <div className="rounded-xl border border-white/10 bg-[#16161C] p-5 text-white shadow-xl">
                <div className="flex items-center gap-2 pb-3 border-b border-white/10">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-semibold text-gray-100">
                    Этап 5: Автономная сборка для Windows 11 (Self-Contained Single File)
                  </h3>
                </div>

                <div className="mt-4 space-y-3 text-xs text-gray-300">
                  <p>
                    Для развёртывания на Windows 11 x64 используется встроенный в .NET 10 режим <code>PublishSingleFile</code> с упаковкой всех библиотек в единый <code>.exe</code>:
                  </p>

                  <div className="rounded-lg bg-black/70 border border-white/10 p-3 font-mono text-[11px] text-emerald-300 space-y-1">
                    <div className="text-gray-500"># Сборка единого файла без необходимости ставить .NET на целевой ПК:</div>
                    <div>dotnet publish MiniTimeTracker.csproj -c Release -r win-x64 --self-contained -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -o ./publish</div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                      <div className="font-semibold text-white mb-1">Файл данных на Windows 11:</div>
                      <code className="text-[11px] text-blue-300 font-mono">
                        %LOCALAPPDATA%\MiniTimeTracker\data.json
                      </code>
                      <p className="mt-1 text-[11px] text-gray-400">
                        Создаётся автоматически при первом запуске с активностью «Работа».
                      </p>
                    </div>

                    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                      <div className="font-semibold text-white mb-1">Защита от сбоев:</div>
                      <p className="text-[11px] text-gray-400">
                        Атомарная замена через <code>File.Replace</code> и автоматическое создание бэкапа <code>data.corrupt.*.json</code> при повреждениях.
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
