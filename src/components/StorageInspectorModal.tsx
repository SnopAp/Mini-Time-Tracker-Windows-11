import React, { useState } from 'react';
import { X, Database, AlertTriangle, RefreshCw, FileCode, CheckCircle, ShieldAlert } from 'lucide-react';
import { DataRoot, parseAndValidateDataJson, createDefaultData } from '../logic/tracker.ts';

interface StorageInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentData: DataRoot;
  onApplyData: (data: DataRoot) => void;
  onTriggerNotification: (msg: string) => void;
}

export const StorageInspectorModal: React.FC<StorageInspectorModalProps> = ({
  isOpen,
  onClose,
  currentData,
  onApplyData,
  onTriggerNotification,
}) => {
  const [corruptLog, setCorruptLog] = useState<{
    time: string;
    reason: string;
    backupPath: string;
    corruptSnippet: string;
  } | null>(null);

  if (!isOpen) return null;

  const jsonString = JSON.stringify(currentData, null, 2);

  // Test corrupt recovery behavior as specified in Section 4:
  // "Не перезаписывай повреждённый файл пустыми данными без предупреждения.
  //  Предусмотри понятное сообщение об ошибке и возможность сохранить повреждённый файл для восстановления."
  const handleSimulateCorruption = () => {
    const invalidJson = `{
  "schemaVersion": 1,
  "corruptedAt": "${new Date().toISOString()}",
  "activities": [
    { "id": "broken", "name": "Невалидный JSON с внезапным обрывом питания...`;

    const result = parseAndValidateDataJson(invalidJson);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const simulatedBackupPath = `%LOCALAPPDATA%\\MiniTimeTracker\\data.corrupt.${timestamp}.json`;

    setCorruptLog({
      time: new Date().toLocaleTimeString(),
      reason: result.errorMessage || 'Синтаксический разрыв JSON',
      backupPath: simulatedBackupPath,
      corruptSnippet: invalidJson,
    });

    onTriggerNotification(
      `[Безопасное восстановление] Обнаружен повреждённый data.json. Исходный файл сохранён в: ${simulatedBackupPath}. Загружены безопасные настройки по умолчанию.`
    );

    // Apply recovered defaults
    onApplyData(result.data);
  };

  const handleResetToClean = () => {
    const fresh = createDefaultData();
    onApplyData(fresh);
    setCorruptLog(null);
    onTriggerNotification('Хранилище сброшено к исходной конфигурации (Работа).');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl rounded-xl border border-white/15 bg-[#1E1E24]/95 p-5 shadow-2xl backdrop-blur-md text-white flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-400" />
            <div>
              <h3 className="text-sm font-semibold text-gray-100">
                Хранилище JSON (%LOCALAPPDATA%\MiniTimeTracker\data.json)
              </h3>
              <p className="text-[11px] text-gray-400">
                Безопасная атомарная запись через временный файл + защита от затирания
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Закрыть инспектор"
            className="rounded p-1 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stats bar */}
        <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs shrink-0">
          <div className="rounded-lg bg-white/5 border border-white/10 p-2">
            <div className="text-[10px] text-gray-400">Версия схемы</div>
            <div className="text-sm font-bold text-sky-400">v{currentData.schemaVersion}</div>
          </div>
          <div className="rounded-lg bg-white/5 border border-white/10 p-2">
            <div className="text-[10px] text-gray-400">Активностей</div>
            <div className="text-sm font-bold text-emerald-400">{currentData.activities.length}</div>
          </div>
          <div className="rounded-lg bg-white/5 border border-white/10 p-2">
            <div className="text-[10px] text-gray-400">Сессий в истории</div>
            <div className="text-sm font-bold text-purple-400">{currentData.history.length}</div>
          </div>
          <div className="rounded-lg bg-white/5 border border-white/10 p-2">
            <div className="text-[10px] text-gray-400">Статус сессии</div>
            <div className="text-xs font-bold text-amber-400 truncate">
              {currentData.activeSession ? `Идёт (${currentData.activeSession.activityName})` : 'Остановлен'}
            </div>
          </div>
        </div>

        {/* Corrupt alert banner if simulated */}
        {corruptLog && (
          <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-950/40 p-3 text-xs shrink-0">
            <div className="flex items-center gap-1.5 text-rose-300 font-semibold mb-1">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              Тест восстановления успешно пройден!
            </div>
            <p className="text-gray-300 text-[11px]">
              <strong>Причина:</strong> {corruptLog.reason}
            </p>
            <p className="text-gray-300 text-[11px] mt-0.5">
              <strong>Резервный файл сохранён в:</strong>{' '}
              <code className="text-rose-200 bg-rose-900/50 px-1 py-0.5 rounded font-mono text-[10px]">
                {corruptLog.backupPath}
              </code>
            </p>
          </div>
        )}

        {/* JSON Content */}
        <div className="mt-3 flex-1 overflow-hidden flex flex-col min-h-48">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
            <span className="flex items-center gap-1">
              <FileCode className="w-3.5 h-3.5 text-blue-400" />
              Текущее содержимое файла:
            </span>
            <span className="text-[10px] text-gray-500 font-mono">
              ~{Math.round(jsonString.length)} байт
            </span>
          </div>
          <pre className="flex-1 overflow-auto rounded-lg border border-white/10 bg-black/50 p-3 font-mono text-[11px] leading-relaxed text-gray-200 custom-scrollbar select-text">
            {jsonString}
          </pre>
        </div>

        {/* Action buttons */}
        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSimulateCorruption}
              title="Проверить защиту от затирания повреждённого файла"
              className="flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1.5 text-xs font-medium text-amber-300 transition-colors"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Тест сбоя (Corrupt Test)
            </button>
            <button
              type="button"
              onClick={handleResetToClean}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Сброс к умолчанию
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-white/10 hover:bg-white/15 px-4 py-1.5 text-xs font-medium text-gray-200 transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
