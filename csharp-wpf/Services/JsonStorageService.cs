using System;
using System.IO;
using System.Text.Json;
using MiniTimeTracker.Models;

namespace MiniTimeTracker.Services;

public interface IStorageService
{
    string FilePath { get; }
    DataRoot Load();
    void Save(DataRoot data);
    event Action<string>? StorageErrorOccurred;
}

/// <summary>
/// Безопасное хранилище JSON в %LOCALAPPDATA%\MiniTimeTracker\data.json
/// Выполняет атомарную запись через временный файл и защищает повреждённый файл от затирания.
/// </summary>
public class JsonStorageService : IStorageService
{
    private readonly string _storageDir;
    private readonly string _filePath;
    private readonly object _fileLock = new();
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true
    };

    public string FilePath => _filePath;
    public event Action<string>? StorageErrorOccurred;

    public JsonStorageService()
    {
        _storageDir = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "MiniTimeTracker"
        );
        _filePath = Path.Combine(_storageDir, "data.json");
    }

    /// <summary>
    /// Конструктор для указания кастомного пути (для тестирования)
    /// </summary>
    public JsonStorageService(string customFilePath)
    {
        _filePath = customFilePath;
        _storageDir = Path.GetDirectoryName(customFilePath) ?? AppContext.BaseDirectory;
    }

    public DataRoot Load()
    {
        lock (_fileLock)
        {
            try
            {
                if (!File.Exists(_filePath))
                {
                    var initial = CreateInitialData();
                    Save(initial);
                    return initial;
                }

                string rawJson = File.ReadAllText(_filePath);
                if (string.IsNullOrWhiteSpace(rawJson))
                {
                    return HandleCorruptFile("Файл данных пуст", rawJson);
                }

                var parsed = JsonSerializer.Deserialize<DataRoot>(rawJson, JsonOptions);
                if (parsed == null || parsed.Activities == null || parsed.Activities.Count == 0)
                {
                    return HandleCorruptFile("Структура JSON повреждена или отсутствуют активности", rawJson);
                }

                return parsed;
            }
            catch (Exception ex)
            {
                string rawJson = File.Exists(_filePath) ? File.ReadAllText(_filePath) : string.Empty;
                return HandleCorruptFile($"Ошибка чтения файла: {ex.Message}", rawJson);
            }
        }
    }

    public void Save(DataRoot data)
    {
        lock (_fileLock)
        {
            try
            {
                if (!Directory.Exists(_storageDir))
                {
                    Directory.CreateDirectory(_storageDir);
                }

                // Безопасная (атомарная) запись:
                // 1. Записываем данные в уникальный временный файл
                string tempFilePath = Path.Combine(_storageDir, $"data.json.tmp.{Guid.NewGuid():N}");
                string jsonString = JsonSerializer.Serialize(data, JsonOptions);
                File.WriteAllText(tempFilePath, jsonString);

                // 2. Атомарно заменяем целевой файл
                if (File.Exists(_filePath))
                {
                    // В Windows File.Replace заменяет файл с сохранением прав
                    try
                    {
                        File.Replace(tempFilePath, _filePath, null);
                    }
                    catch
                    {
                        // Fallback если замена через File.Replace не поддерживается
                        File.Delete(_filePath);
                        File.Move(tempFilePath, _filePath);
                    }
                }
                else
                {
                    File.Move(tempFilePath, _filePath);
                }
            }
            catch (Exception ex)
            {
                StorageErrorOccurred?.Invoke($"Ошибка сохранения данных: {ex.Message}");
            }
        }
    }

    private DataRoot HandleCorruptFile(string reason, string rawContent)
    {
        try
        {
            // Создаем резервную копию повреждённого файла для восстановления пользователем
            string timestamp = DateTime.Now.ToString("yyyyMMdd_HHmmss");
            string backupPath = Path.Combine(_storageDir, $"data.corrupt.{timestamp}.json");
            if (!string.IsNullOrEmpty(rawContent))
            {
                File.WriteAllText(backupPath, rawContent);
            }

            string warning = $"Внимание: Обнаружен повреждённый файл data.json ({reason}).\n" +
                             $"Оригинал сохранён в резервную копию:\n{backupPath}\n" +
                             $"Создана новая конфигурация по умолчанию.";

            StorageErrorOccurred?.Invoke(warning);
        }
        catch
        {
            // Если даже бэкап не удалось записать
            StorageErrorOccurred?.Invoke($"Внимание: Повреждён файл данных: {reason}.");
        }

        var defaultData = CreateInitialData();
        return defaultData;
    }

    private static DataRoot CreateInitialData()
    {
        return new DataRoot
        {
            SchemaVersion = 1,
            Activities = new()
            {
                new ActivityItem
                {
                    Id = "act-work-default",
                    Name = "Работа",
                    Color = "#3B82F6",
                    CreatedAt = DateTimeOffset.UtcNow
                }
            },
            History = new(),
            ActiveSession = null,
            Settings = new WidgetSettings
            {
                IsTopmost = true,
                IsEdgeDocked = false,
                DockSide = "Right",
                PositionX = 100,
                PositionY = 100,
                Opacity = 0.95
            }
        };
    }
}
