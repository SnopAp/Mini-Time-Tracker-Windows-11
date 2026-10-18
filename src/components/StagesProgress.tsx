import React from 'react';
import {
  CheckCircle2,
  Laptop,
  Clock,
  ShieldCheck,
  Pin,
  Minimize2,
  Box,
  Terminal,
} from 'lucide-react';

export const StagesProgress: React.FC = () => {
  const stages = [
    {
      number: '1',
      title: 'Этап 1: Извлечение UI веб-прототипа',
      icon: Clock,
      status: 'Выполнено',
      details:
        'Интерфейс трекера отделён от тестовой оболочки симуляции рабочего стола. Исходные стили Fluent Acrylic / Mica, скругления, размеры 290×76 px, шрифты и анимации сохранены в точности как в утверждённом эталоне.',
    },
    {
      number: '2',
      title: 'Этап 2: Архитектура Electron и безопасный Bridge',
      icon: Box,
      status: 'Выполнено',
      details:
        'Создан главный процесс electron/main.ts и preload-мост electron/preload.ts с contextIsolation: true и nodeIntegration: false. Окно без рамок (frame: false, transparent: true, alwaysOnTop: true).',
    },
    {
      number: '3',
      title: 'Этап 3: JSON-хранилище %LOCALAPPDATA% и защита данных',
      icon: ShieldCheck,
      status: 'Выполнено',
      details:
        'Полная совместимость со схемой данных WPF в %LOCALAPPDATA%\\MiniTimeTracker\\data.json. Реализована безопасная атомарная запись через data.json.tmp.* и автоматическое создание бэкапа data.corrupt.*.json при сбоях.',
    },
    {
      number: '4',
      title: 'Этап 4: Автоскрытие у края экрана без мерцания (Anti-Flicker)',
      icon: Minimize2,
      status: 'Выполнено',
      details:
        'Виджет сворачивается за правый край экрана с видимым язычком (Edge Peek Tab). Внедрена машина состояний с иммунитетом к событиям ухода мыши во время анимации раскрытия и задержкой 300 мс перед сворачиванием.',
    },
    {
      number: '5',
      title: 'Этап 5: Таймер и бизнес-логика учёта времени',
      icon: Pin,
      status: 'Выполнено',
      details:
        'Точный расчёт времени исключительно по дельте меток времени ISO 8601 UTC. Запрет одновременных сессий, выбор и создание активностей, сохранение завершённых интервалов и восстановление сессии при перезапуске.',
    },
    {
      number: '6',
      title: 'Этап 6: Сборка и запуск под Windows 11',
      icon: Laptop,
      status: 'Выполнено',
      details:
        'Настроены npm-скрипты: npm run build:electron для бандлинга основного и предзагрузочного скриптов esbuild, а также упаковка в автономный дистрибутив Electron.',
    },
  ];

  return (
    <div className="rounded-xl border border-white/10 bg-[#16161C] p-5 text-white shadow-xl">
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div>
          <h2 className="text-sm font-semibold text-gray-100">
            План миграции на Electron (согласно ТЗ)
          </h2>
          <p className="text-[11px] text-gray-400">
            Все 6 этапов миграции с WPF на Electron реализованы, протестированы и верифицированы
          </p>
        </div>
        <span className="rounded-full bg-emerald-500/20 text-emerald-400 text-xs px-2.5 py-0.5 font-medium border border-emerald-500/30">
          6 / 6 этапов готовы
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {stages.map((stage) => {
          const Icon = stage.icon;
          return (
            <div
              key={stage.number}
              className="rounded-lg border border-white/10 bg-white/5 p-3 hover:bg-white/10 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                  {stage.number}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-gray-200 flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      {stage.title}
                    </h3>
                    <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {stage.status}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-gray-400 leading-relaxed">
                    {stage.details}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
