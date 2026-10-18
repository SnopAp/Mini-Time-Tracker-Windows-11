import React from 'react';
import { X, Clock, Calendar, CheckCircle2 } from 'lucide-react';
import { TimeSession, formatDuration } from '../logic/tracker.ts';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: TimeSession[];
}

export const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose, sessions }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-xl border border-white/15 bg-[#1E1E24]/95 p-5 shadow-2xl backdrop-blur-md text-white flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-gray-100">
              История сессий ({sessions.length})
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Закрыть историю"
            className="rounded p-1 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-3 overflow-y-auto space-y-2 pr-1 custom-scrollbar flex-1">
          {sessions.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-600" />
              <p className="text-xs">Завершённых сессий пока нет.</p>
              <p className="text-[11px] text-gray-500 mt-1">
                Запустите таймер и остановите его, чтобы сохранить первую запись.
              </p>
            </div>
          ) : (
            sessions.map((sess) => {
              const start = new Date(sess.startTime);
              const end = new Date(sess.endTime);
              const dateStr = start.toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              });
              const startTimeStr = start.toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              });
              const endTimeStr = end.toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              });

              return (
                <div
                  key={sess.id}
                  className="rounded-lg border border-white/10 bg-white/5 p-3 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="text-xs font-semibold text-gray-100">
                        {sess.activityName}
                      </span>
                    </div>
                    <span className="font-mono text-xs font-bold text-sky-400 bg-sky-950/40 border border-sky-800/40 rounded px-2 py-0.5">
                      {formatDuration(sess.durationSeconds)}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[11px] text-gray-400">
                    <span>{dateStr}</span>
                    <span>
                      {startTimeStr} — {endTimeStr}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="pt-3 border-t border-white/10 flex justify-end shrink-0">
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
