import React from 'react';
import { CheckCircle2, ChevronRight, Laptop, Clock, ShieldCheck, Pin, Minimize2 } from 'lucide-react';

export const StagesProgress: React.FC = () => {
  const stages = [
    {
      number: '1',
      title: 'Этап 1: Проект и интерфейс таймера',
      icon: Clock,
      status: 'Выполнено',
      details:
        'Создан проект .NET 10 WPF. Таймер вычисляется по дельте меток времени (DateTimeOffset.UtcNow), исключая рассинхронизацию. Доступны кнопки Start/Stop.',
    },
    {
      number: '2',
      title: 'Этап 2: Активности, сессии и JSON-хранилище',
      icon: ShieldCheck,
      status: 'Выполнено',
      details:
        'Добавлена активность «Работа» по умолчанию, создание пользовательских активностей, история завершённых сессий. Атомарная запись через temp-файл в %LOCALAPPDATA%\\MiniTimeTracker\\data.json с защитой от повреждений.',
    },
    {
      number: '3',
      title: 'Этап 3: Прозрачность, Topmost и Hover-панель',
      icon: Pin,
      status: 'Выполнено',
      details:
        'Окно без рамки (WindowStyle=None, AllowsTransparency=True), перемещение мышью (DragMove), переключение поверх всех окон (Topmost), панель управления при наведении курсора.',
    },
    {
      number: '4',
      title: 'Этап 4: Скрытие у края экрана (Edge Docking)',
      icon: Minimize2,
      status: 'Выполнено',
      details:
        'Виджет аккуратно сворачивается за край монитора с выступающей полоской-язычком (Edge Peek Tab) и мгновенно раскрывается при приближении курсора.',
    },
    {
      number: '5',
      title: 'Этап 5: Автономная сборка для Windows 11 x64',
      icon: Laptop,
      status: 'Выполнено',
      details:
        'Подготовлен скрипт build.cmd и конфигурация .csproj для генерации единого исполняемого файла (Self-Contained Single File win-x64) без сторонних зависимостей.',
    },
  ];

  return (
    <div className="rounded-xl border border-white/10 bg-[#16161C] p-5 text-white shadow-xl">
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div>
          <h2 className="text-sm font-semibold text-gray-100">
            Итеративные этапы реализации (согласно ТЗ)
          </h2>
          <p className="text-[11px] text-gray-400">
            Все 5 этапов спроектированы, протестированы и готовы к запуску
          </p>
        </div>
        <span className="rounded-full bg-emerald-500/20 text-emerald-400 text-xs px-2.5 py-0.5 font-medium border border-emerald-500/30">
          5 / 5 этапов готовы
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
