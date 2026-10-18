import React, { useState } from 'react';
import { X, Check } from 'lucide-react';

interface ActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, color: string) => void;
}

const COLOR_PRESETS = [
  { name: 'Синий', hex: '#3B82F6' },
  { name: 'Зелёный', hex: '#10B981' },
  { name: 'Фиолетовый', hex: '#8B5CF6' },
  { name: 'Оранжевый', hex: '#F59E0B' },
  { name: 'Красный', hex: '#EF4444' },
  { name: 'Бирюзовый', hex: '#06B6D4' },
  { name: 'Розовый', hex: '#EC4899' },
];

export const ActivityModal: React.FC<ActivityModalProps> = ({ isOpen, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_PRESETS[0].hex);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Введите название активности');
      return;
    }
    setError(null);
    onSave(name.trim(), selectedColor);
    setName('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-sm rounded-xl border border-white/15 bg-[#1E1E24]/95 p-5 shadow-2xl backdrop-blur-md text-white">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <h3 className="text-sm font-semibold text-gray-100 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: selectedColor }} />
            Новая активность
          </h3>
          <button
            onClick={onClose}
            aria-label="Закрыть диалог"
            className="rounded p-1 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              Название активности
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              placeholder="например: Разработка, Чтение..."
              autoFocus
              className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-white placeholder-gray-500 focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
            {error && <p className="mt-1.5 text-xs text-rose-400">{error}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              Цветовой маркер
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {COLOR_PRESETS.map((color) => (
                <button
                  key={color.hex}
                  type="button"
                  onClick={() => setSelectedColor(color.hex)}
                  title={color.name}
                  aria-label={`Выбрать цвет ${color.name}`}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110 ${
                    selectedColor === color.hex ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1E1E24]' : ''
                  }`}
                  style={{ backgroundColor: color.hex }}
                >
                  {selectedColor === color.hex && <Check className="w-3.5 h-3.5 text-white drop-shadow-sm" />}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 hover:bg-blue-500 px-4 py-1.5 text-xs font-medium text-white shadow-sm transition-colors"
            >
              Создать
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
