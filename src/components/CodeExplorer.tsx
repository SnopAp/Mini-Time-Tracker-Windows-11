import React, { useState } from 'react';
import {
  FileCode,
  Folder,
  Copy,
  Check,
  Download,
  Terminal,
  ExternalLink,
  ChevronRight,
  Layers,
  Sparkles,
} from 'lucide-react';
import { CSHARP_PROJECT_FILES } from '../data/csharpProjectFiles.ts';
import { ELECTRON_PROJECT_FILES } from '../data/electronProjectFiles.ts';
import { downloadProjectZip } from '../utils/zipExporter.ts';

export const CodeExplorer: React.FC = () => {
  const [platform, setPlatform] = useState<'electron' | 'wpf'>('electron');
  const [selectedFilePath, setSelectedFilePath] = useState('electron/main.ts');
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const fileList = platform === 'electron' ? ELECTRON_PROJECT_FILES : CSHARP_PROJECT_FILES;

  // Keep selected file valid across platform tabs
  const selectedFile =
    fileList.find((f) => f.path === selectedFilePath) || fileList[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadZip = async () => {
    try {
      setIsDownloading(true);
      await downloadProjectZip(
        fileList,
        platform === 'electron'
          ? 'MiniTimeTracker-Electron-Win11.zip'
          : 'MiniTimeTracker-WPF-DotNet10.zip'
      );
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-[#16161C] p-4 text-white shadow-xl flex flex-col h-[700px]">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <FileCode className="w-5 h-5 text-blue-400" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-gray-100">
                {platform === 'electron'
                  ? 'Исходный код Electron + TypeScript'
                  : 'Исходный код C# / WPF (.NET 10)'}
              </h2>
              <span className="rounded bg-blue-500/20 text-blue-300 text-[10px] px-1.5 py-0.5 font-mono font-medium border border-blue-500/30">
                {platform === 'electron' ? 'Electron v41 + Vite' : 'WPF .NET 10 LTS'}
              </span>
            </div>
            <p className="text-[11px] text-gray-400">
              {platform === 'electron'
                ? 'Основной процесс main.ts, безопасный bridge preload.ts, atomic storage %LOCALAPPDATA% и anti-flicker docking'
                : 'Прежняя реализация на WPF для сравнения архитектуры и форматов данных'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Platform Tab Switcher */}
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/10">
            <button
              type="button"
              onClick={() => {
                setPlatform('electron');
                setSelectedFilePath('electron/main.ts');
              }}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                platform === 'electron'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Electron (Целевой стек)
            </button>
            <button
              type="button"
              onClick={() => {
                setPlatform('wpf');
                setSelectedFilePath('Models/DataModels.cs');
              }}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                platform === 'wpf'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              WPF (Архив)
            </button>
          </div>

          <button
            type="button"
            onClick={handleDownloadZip}
            disabled={isDownloading}
            aria-label="Скачать проект ZIP"
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            {isDownloading ? 'Архивация...' : `Скачать ${platform === 'electron' ? 'Electron' : 'WPF'} (.ZIP)`}
          </button>
        </div>
      </div>

      {/* Main split view: File list on left, Code editor on right */}
      <div className="mt-3 flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 gap-3">
        {/* File Tree Navigation */}
        <div className="md:col-span-4 rounded-lg border border-white/10 bg-[#111116] p-2 flex flex-col overflow-y-auto custom-scrollbar">
          <div className="text-[11px] font-semibold text-gray-400 px-2 py-1 uppercase tracking-wider">
            {platform === 'electron' ? 'Файлы архитектуры Electron' : 'Файлы решения WPF'}
          </div>

          <div className="mt-1 space-y-0.5">
            {fileList.map((file) => {
              const isSelected = file.path === selectedFile.path;
              const isTs = file.name.endsWith('.ts');
              const isJson = file.name.endsWith('.json');
              const isMd = file.name.endsWith('.md');
              const isCs = file.name.endsWith('.cs');
              const isXaml = file.name.endsWith('.xaml');

              return (
                <button
                  key={file.path}
                  type="button"
                  onClick={() => setSelectedFilePath(file.path)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs text-left transition-colors cursor-pointer ${
                    isSelected
                      ? platform === 'electron'
                        ? 'bg-blue-600/30 text-blue-200 font-semibold'
                        : 'bg-purple-600/30 text-purple-200 font-semibold'
                      : 'text-gray-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className={`text-[10px] font-mono px-1 py-0.2 rounded ${
                        isTs
                          ? 'bg-blue-950/70 text-blue-300'
                          : isJson
                          ? 'bg-amber-950/70 text-amber-300'
                          : isMd
                          ? 'bg-emerald-950/70 text-emerald-300'
                          : isXaml
                          ? 'bg-cyan-950/70 text-cyan-300'
                          : isCs
                          ? 'bg-purple-950/70 text-purple-300'
                          : 'bg-gray-800 text-gray-300'
                      }`}
                    >
                      {file.name.split('.').pop()}
                    </span>
                    <span className="truncate">{file.path}</span>
                  </div>
                  {isSelected && (
                    <ChevronRight
                      className={`w-3.5 h-3.5 shrink-0 ${
                        platform === 'electron' ? 'text-blue-400' : 'text-purple-400'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick build cheat sheet at bottom */}
          <div className="mt-auto pt-3 border-t border-white/10 text-[11px] text-gray-400">
            <div className="flex items-center gap-1.5 text-gray-300 font-medium mb-1">
              <Terminal className="w-3 h-3 text-emerald-400" />
              {platform === 'electron' ? 'Команда запуска Electron:' : 'Команда сборки (WPF x64):'}
            </div>
            <code className="block rounded bg-black/60 p-2 font-mono text-[10px] text-emerald-300 overflow-x-auto select-all">
              {platform === 'electron'
                ? 'npm run build:electron && npm run electron:start'
                : 'dotnet publish -c Release -r win-x64 --self-contained -p:PublishSingleFile=true -o ./publish'}
            </code>
          </div>
        </div>

        {/* Code Content Viewer */}
        <div className="md:col-span-8 rounded-lg border border-white/10 bg-[#0E0E12] flex flex-col overflow-hidden">
          {/* File Tab Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-[#14141A]">
            <div className="flex items-center gap-2 text-xs font-mono text-gray-300">
              <FileCode className="w-3.5 h-3.5 text-blue-400" />
              <span>{selectedFile.path}</span>
            </div>

            <button
              type="button"
              onClick={handleCopy}
              aria-label="Скопировать код файла"
              className="flex items-center gap-1.5 rounded bg-white/5 hover:bg-white/10 px-2 py-1 text-xs text-gray-300 hover:text-white transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Скопировано</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Копировать</span>
                </>
              )}
            </button>
          </div>

          {/* Code Body */}
          <div className="flex-1 overflow-auto p-3 custom-scrollbar">
            <pre className="font-mono text-[11px] leading-relaxed text-gray-200 select-text whitespace-pre">
              {selectedFile.content}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
