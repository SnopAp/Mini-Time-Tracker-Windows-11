import { ProjectFile } from '../utils/zipExporter.ts';

export const CSHARP_PROJECT_FILES: ProjectFile[] = [
  {
    path: 'MiniTimeTracker.csproj',
    name: 'MiniTimeTracker.csproj',
    language: 'xml',
    content: `<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <OutputType>WinExe</OutputType>
    <TargetFramework>net10.0-windows</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <UseWPF>true</UseWPF>
    
    <!-- Целевая платформа: Windows 11 x64 -->
    <RuntimeIdentifier>win-x64</RuntimeIdentifier>
    <AssemblyName>MiniTimeTracker</AssemblyName>
    <RootNamespace>MiniTimeTracker</RootNamespace>
    
    <!-- Настройки для автономной сборки (Self-Contained Single File) -->
    <PublishSingleFile>true</PublishSingleFile>
    <SelfContained>true</SelfContained>
    <IncludeNativeLibrariesForSelfExtract>true</IncludeNativeLibrariesForSelfExtract>
    <EnableCompressionInSingleFile>true</EnableCompressionInSingleFile>
    
    <!-- Метаданные сборки -->
    <Version>1.0.0</Version>
    <Description>Минималистичный персональный трекер времени для Windows 11 на C# и WPF</Description>
  </PropertyGroup>

</Project>`,
  },
  {
    path: 'App.xaml',
    name: 'App.xaml',
    language: 'xml',
    content: `<Application x:Class="MiniTimeTracker.App"
             xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
             xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
             Startup="OnStartup"
             Exit="OnExit">
    <Application.Resources>
    </Application.Resources>
</Application>`,
  },
  {
    path: 'App.xaml.cs',
    name: 'App.xaml.cs',
    language: 'csharp',
    content: `using System;
using System.Threading;
using System.Windows;
using MiniTimeTracker.Services;
using MiniTimeTracker.ViewModels;
using MiniTimeTracker.Views;

namespace MiniTimeTracker;

public partial class App : Application
{
    private static Mutex? _singleInstanceMutex;
    private const string MutexName = "MiniTimeTracker_SingleInstance_Mutex_W11";

    private void OnStartup(object sender, StartupEventArgs e)
    {
        _singleInstanceMutex = new Mutex(true, MutexName, out bool isNewInstance);
        if (!isNewInstance)
        {
            MessageBox.Show("Приложение Mini Time Tracker уже запущено.", "Информация", MessageBoxButton.OK, MessageBoxImage.Information);
            Shutdown();
            return;
        }

        AppDomain.CurrentDomain.UnhandledException += (s, args) =>
        {
            string message = args.ExceptionObject is Exception ex ? ex.Message : "Неизвестная ошибка";
            MessageBox.Show($"Критическая ошибка приложения:\\n{message}", "Ошибка", MessageBoxButton.OK, MessageBoxImage.Error);
        };

        try
        {
            var storageService = new JsonStorageService();
            var engine = new TimeTrackerEngine();
            var viewModel = new MainViewModel(storageService, engine);
            var mainWindow = new MainWindow(viewModel);

            mainWindow.Show();
        }
        catch (Exception ex)
        {
            MessageBox.Show($"Не удалось инициализировать приложение:\\n{ex.Message}", "Ошибка запуска", MessageBoxButton.OK, MessageBoxImage.Error);
            Shutdown();
        }
    }

    private void OnExit(object sender, ExitEventArgs e)
    {
        _singleInstanceMutex?.ReleaseMutex();
        _singleInstanceMutex?.Dispose();
    }
}`,
  },
  {
    path: 'Models/DataModels.cs',
    name: 'DataModels.cs',
    language: 'csharp',
    content: `using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace MiniTimeTracker.Models;

/// <summary>
/// Корневой объект хранения данных (%LOCALAPPDATA%\\MiniTimeTracker\\data.json)
/// </summary>
public class DataRoot
{
    [JsonPropertyName("schemaVersion")]
    public int SchemaVersion { get; set; } = 1;

    [JsonPropertyName("activities")]
    public List<ActivityItem> Activities { get; set; } = new();

    [JsonPropertyName("history")]
    public List<TimeSession> History { get; set; } = new();

    [JsonPropertyName("activeSession")]
    public ActiveSessionState? ActiveSession { get; set; }

    [JsonPropertyName("settings")]
    public WidgetSettings Settings { get; set; } = new();
}

public class ActivityItem
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = Guid.NewGuid().ToString("N");

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("color")]
    public string Color { get; set; } = "#3B82F6";

    [JsonPropertyName("createdAt")]
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public override string ToString() => Name;
}

public class TimeSession
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = Guid.NewGuid().ToString("N");

    [JsonPropertyName("activityId")]
    public string ActivityId { get; set; } = string.Empty;

    [JsonPropertyName("activityName")]
    public string ActivityName { get; set; } = string.Empty;

    [JsonPropertyName("startTime")]
    public DateTimeOffset StartTime { get; set; }

    [JsonPropertyName("endTime")]
    public DateTimeOffset EndTime { get; set; }

    [JsonPropertyName("durationSeconds")]
    public long DurationSeconds { get; set; }

    [JsonIgnore]
    public string FormattedDuration =>
        $"{(DurationSeconds / 3600):D2}:{((DurationSeconds % 3600) / 60):D2}:{(DurationSeconds % 60):D2}";
}

public class ActiveSessionState
{
    [JsonPropertyName("activityId")]
    public string ActivityId { get; set; } = string.Empty;

    [JsonPropertyName("activityName")]
    public string ActivityName { get; set; } = string.Empty;

    [JsonPropertyName("startTime")]
    public DateTimeOffset StartTime { get; set; }
}

public class WidgetSettings
{
    [JsonPropertyName("isTopmost")]
    public bool IsTopmost { get; set; } = true;

    [JsonPropertyName("isEdgeDocked")]
    public bool IsEdgeDocked { get; set; } = false;

    [JsonPropertyName("dockSide")]
    public string DockSide { get; set; } = "Right";

    [JsonPropertyName("positionX")]
    public double PositionX { get; set; } = 100;

    [JsonPropertyName("positionY")]
    public double PositionY { get; set; } = 100;

    [JsonPropertyName("opacity")]
    public double Opacity { get; set; } = 0.95;
}`,
  },
  {
    path: 'Services/IStorageService.cs',
    name: 'IStorageService.cs',
    language: 'csharp',
    content: `using System;
using MiniTimeTracker.Models;

namespace MiniTimeTracker.Services;

public interface IStorageService
{
    string FilePath { get; }
    DataRoot Load();
    void Save(DataRoot data);
    event Action<string>? StorageErrorOccurred;
}`,
  },
  {
    path: 'Services/JsonStorageService.cs',
    name: 'JsonStorageService.cs',
    language: 'csharp',
    content: `using System;
using System.IO;
using System.Text.Json;
using MiniTimeTracker.Models;

namespace MiniTimeTracker.Services;

/// <summary>
/// Безопасное хранилище JSON в %LOCALAPPDATA%\\MiniTimeTracker\\data.json
/// Выполняет атомарную запись через временный файл и защищает повреждённый файл от затирания.
/// </summary>
public class JsonStorageService : IStorageService
{
    private readonly string _storageDir;
    private readonly string _filePath;
    private readonly object _fileLock = new();
    private static readonly JsonSerializerOptions JsonOptions = new() { WriteIndented = true };

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

                string tempFilePath = Path.Combine(_storageDir, $"data.json.tmp.{Guid.NewGuid():N}");
                string jsonString = JsonSerializer.Serialize(data, JsonOptions);
                File.WriteAllText(tempFilePath, jsonString);

                if (File.Exists(_filePath))
                {
                    try
                    {
                        File.Replace(tempFilePath, _filePath, null);
                    }
                    catch
                    {
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
            string timestamp = DateTime.Now.ToString("yyyyMMdd_HHmmss");
            string backupPath = Path.Combine(_storageDir, $"data.corrupt.{timestamp}.json");
            if (!string.IsNullOrEmpty(rawContent))
            {
                File.WriteAllText(backupPath, rawContent);
            }

            string warning = $"Внимание: Обнаружен повреждённый файл data.json ({reason}).\\n" +
                             $"Оригинал сохранён в резервную копию:\\n{backupPath}\\n" +
                             $"Создана новая конфигурация по умолчанию.";

            StorageErrorOccurred?.Invoke(warning);
        }
        catch
        {
            StorageErrorOccurred?.Invoke($"Внимание: Повреждён файл данных: {reason}.");
        }

        return CreateInitialData();
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
}`,
  },
  {
    path: 'Services/TimeTrackerEngine.cs',
    name: 'TimeTrackerEngine.cs',
    language: 'csharp',
    content: `using System;
using System.Windows.Threading;
using MiniTimeTracker.Models;

namespace MiniTimeTracker.Services;

/// <summary>
/// Движок учёта времени.
/// Рассчитывает прошедшее время по временным меткам (DateTimeOffset.UtcNow),
/// исключая накопление погрешности таймеров интерфейса.
/// </summary>
public class TimeTrackerEngine
{
    private readonly DispatcherTimer _uiTimer;
    private DateTimeOffset? _sessionStartTime;
    private ActivityItem? _currentActivity;

    public bool IsRunning => _sessionStartTime.HasValue;
    public ActivityItem? CurrentActivity => _currentActivity;
    public DateTimeOffset? SessionStartTime => _sessionStartTime;

    public event Action<TimeSpan>? Tick;
    public event Action<bool>? StateChanged;

    public TimeTrackerEngine()
    {
        _uiTimer = new DispatcherTimer(DispatcherPriority.Normal)
        {
            Interval = TimeSpan.FromMilliseconds(200)
        };
        _uiTimer.Tick += OnTimerTick;
    }

    public void RestoreActiveSession(ActiveSessionState activeState, ActivityItem activity)
    {
        _currentActivity = activity;
        _sessionStartTime = activeState.StartTime;
        _uiTimer.Start();
        StateChanged?.Invoke(true);
        OnTimerTick(this, EventArgs.Empty);
    }

    public void Start(ActivityItem activity)
    {
        if (IsRunning)
        {
            throw new InvalidOperationException("Сессия уже запущена. Одновременный запуск нескольких сессий запрещён.");
        }

        ArgumentNullException.ThrowIfNull(activity);

        _currentActivity = activity;
        _sessionStartTime = DateTimeOffset.UtcNow;
        _uiTimer.Start();

        StateChanged?.Invoke(true);
        OnTimerTick(this, EventArgs.Empty);
    }

    public TimeSession Stop()
    {
        if (!IsRunning || _sessionStartTime == null || _currentActivity == null)
        {
            throw new InvalidOperationException("Нет активной сессии для завершения.");
        }

        _uiTimer.Stop();

        DateTimeOffset endTime = DateTimeOffset.UtcNow;
        TimeSpan duration = endTime - _sessionStartTime.Value;
        long durationSeconds = Math.Max(0, (long)duration.TotalSeconds);

        var completedSession = new TimeSession
        {
            Id = Guid.NewGuid().ToString("N"),
            ActivityId = _currentActivity.Id,
            ActivityName = _currentActivity.Name,
            StartTime = _sessionStartTime.Value,
            EndTime = endTime,
            DurationSeconds = durationSeconds
        };

        _sessionStartTime = null;
        _currentActivity = null;

        StateChanged?.Invoke(false);
        Tick?.Invoke(TimeSpan.Zero);

        return completedSession;
    }

    public TimeSpan GetElapsed()
    {
        if (!_sessionStartTime.HasValue) return TimeSpan.Zero;
        TimeSpan elapsed = DateTimeOffset.UtcNow - _sessionStartTime.Value;
        return elapsed < TimeSpan.Zero ? TimeSpan.Zero : elapsed;
    }

    private void OnTimerTick(object? sender, EventArgs e)
    {
        if (IsRunning)
        {
            Tick?.Invoke(GetElapsed());
        }
    }
}`,
  },
  {
    path: 'ViewModels/RelayCommand.cs',
    name: 'RelayCommand.cs',
    language: 'csharp',
    content: `using System;
using System.Windows.Input;

namespace MiniTimeTracker.ViewModels;

public class RelayCommand : ICommand
{
    private readonly Action<object?> _execute;
    private readonly Func<object?, bool>? _canExecute;

    public RelayCommand(Action<object?> execute, Func<object?, bool>? canExecute = null)
    {
        _execute = execute ?? throw new ArgumentNullException(nameof(execute));
        _canExecute = canExecute;
    }

    public RelayCommand(Action execute, Func<bool>? canExecute = null)
        : this(_ => execute(), canExecute != null ? _ => canExecute() : null)
    {
    }

    public bool CanExecute(object? parameter) => _canExecute?.Invoke(parameter) ?? true;
    public void Execute(object? parameter) => _execute(parameter);

    public event EventHandler? CanExecuteChanged
    {
        add => CommandManager.RequerySuggested += value;
        remove => CommandManager.RequerySuggested -= value;
    }
}`,
  },
  {
    path: 'ViewModels/MainViewModel.cs',
    name: 'MainViewModel.cs',
    language: 'csharp',
    content: `using System;
using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Linq;
using System.Runtime.CompilerServices;
using System.Windows.Input;
using MiniTimeTracker.Models;
using MiniTimeTracker.Services;

namespace MiniTimeTracker.ViewModels;

public class MainViewModel : INotifyPropertyChanged
{
    private readonly IStorageService _storageService;
    private readonly TimeTrackerEngine _engine;
    private DataRoot _data;

    private string _formattedTime = "00:00:00";
    private bool _isRunning;
    private ActivityItem? _selectedActivity;
    private bool _isTopmost;
    private bool _isEdgeDocked;
    private string _statusMessage = string.Empty;

    public event PropertyChangedEventHandler? PropertyChanged;
    public event Action? RequestClose;
    public event Action? RequestShowActivityDialog;
    public event Action? RequestShowHistoryWindow;
    public event Action<string>? ShowNotification;

    public ObservableCollection<ActivityItem> Activities { get; } = new();
    public ObservableCollection<TimeSession> History { get; } = new();

    public string FormattedTime
    {
        get => _formattedTime;
        set => SetField(ref _formattedTime, value);
    }

    public bool IsRunning
    {
        get => _isRunning;
        set => SetField(ref _isRunning, value);
    }

    public ActivityItem? SelectedActivity
    {
        get => _selectedActivity;
        set
        {
            if (SetField(ref _selectedActivity, value))
            {
                OnPropertyChanged(nameof(CurrentActivityColor));
                OnPropertyChanged(nameof(CurrentActivityName));
                OnPropertyChanged(nameof(CurrentActivityColorBrush));
            }
        }
    }

    public string CurrentActivityName => _selectedActivity?.Name ?? "Нет активности";
    public string CurrentActivityColor => _selectedActivity?.Color ?? "#3B82F6";

    public System.Windows.Media.Color CurrentActivityColorBrush
    {
        get
        {
            try
            {
                if (!string.IsNullOrEmpty(_selectedActivity?.Color))
                {
                    return (System.Windows.Media.Color)System.Windows.Media.ColorConverter.ConvertFromString(_selectedActivity.Color);
                }
            }
            catch { }
            return System.Windows.Media.Color.FromRgb(59, 130, 246);
        }
    }

    public bool IsTopmost
    {
        get => _isTopmost;
        set
        {
            if (SetField(ref _isTopmost, value))
            {
                _data.Settings.IsTopmost = value;
                SaveData();
            }
        }
    }

    public bool IsEdgeDocked
    {
        get => _isEdgeDocked;
        set
        {
            if (SetField(ref _isEdgeDocked, value))
            {
                _data.Settings.IsEdgeDocked = value;
                SaveData();
            }
        }
    }

    public string StatusMessage
    {
        get => _statusMessage;
        set => SetField(ref _statusMessage, value);
    }

    public ICommand ToggleStartStopCommand { get; }
    public ICommand AddActivityCommand { get; }
    public ICommand ToggleTopmostCommand { get; }
    public ICommand ToggleEdgeDockCommand { get; }
    public ICommand ShowHistoryCommand { get; }
    public ICommand CloseCommand { get; }

    public MainViewModel(IStorageService storageService, TimeTrackerEngine engine)
    {
        _storageService = storageService;
        _engine = engine;

        ToggleStartStopCommand = new RelayCommand(ToggleStartStop);
        AddActivityCommand = new RelayCommand(() => RequestShowActivityDialog?.Invoke());
        ToggleTopmostCommand = new RelayCommand(() => IsTopmost = !IsTopmost);
        ToggleEdgeDockCommand = new RelayCommand(() => IsEdgeDocked = !IsEdgeDocked);
        ShowHistoryCommand = new RelayCommand(() => RequestShowHistoryWindow?.Invoke());
        CloseCommand = new RelayCommand(ExecuteClose);

        _engine.Tick += OnEngineTick;
        _engine.StateChanged += OnEngineStateChanged;
        _storageService.StorageErrorOccurred += OnStorageError;

        _data = _storageService.Load();
        InitializeFromData();
    }

    private void InitializeFromData()
    {
        Activities.Clear();
        foreach (var act in _data.Activities) Activities.Add(act);

        History.Clear();
        foreach (var session in _data.History) History.Add(session);

        _isTopmost = _data.Settings.IsTopmost;
        _isEdgeDocked = _data.Settings.IsEdgeDocked;
        OnPropertyChanged(nameof(IsTopmost));
        OnPropertyChanged(nameof(IsEdgeDocked));

        if (_data.ActiveSession != null)
        {
            var matchedActivity = Activities.FirstOrDefault(a => a.Id == _data.ActiveSession.ActivityId)
                                  ?? Activities.FirstOrDefault();
            if (matchedActivity != null)
            {
                SelectedActivity = matchedActivity;
                _engine.RestoreActiveSession(_data.ActiveSession, matchedActivity);
            }
        }
        else
        {
            SelectedActivity = Activities.FirstOrDefault();
        }
    }

    private void ToggleStartStop()
    {
        try
        {
            if (IsRunning)
            {
                var completedSession = _engine.Stop();
                _data.History.Insert(0, completedSession);
                History.Insert(0, completedSession);
                _data.ActiveSession = null;
                SaveData();

                FormattedTime = "00:00:00";
                ShowNotification?.Invoke($"Сессия «{completedSession.ActivityName}» завершена. Длительность: {FormatTimeSpan(TimeSpan.FromSeconds(completedSession.DurationSeconds))}");
            }
            else
            {
                if (SelectedActivity == null)
                {
                    ShowNotification?.Invoke("Пожалуйста, выберите активность перед запуском.");
                    return;
                }

                _engine.Start(SelectedActivity);
                _data.ActiveSession = new ActiveSessionState
                {
                    ActivityId = SelectedActivity.Id,
                    ActivityName = SelectedActivity.Name,
                    StartTime = _engine.SessionStartTime ?? DateTimeOffset.UtcNow
                };
                SaveData();
            }
        }
        catch (Exception ex)
        {
            ShowNotification?.Invoke($"Ошибка: {ex.Message}");
        }
    }

    public void CreateActivity(string name, string color)
    {
        string trimmed = name.Trim();
        if (string.IsNullOrEmpty(trimmed)) return;

        if (Activities.Any(a => a.Name.Equals(trimmed, StringComparison.OrdinalIgnoreCase)))
        {
            ShowNotification?.Invoke($"Активность «{trimmed}» уже существует.");
            return;
        }

        var newActivity = new ActivityItem
        {
            Id = Guid.NewGuid().ToString("N"),
            Name = trimmed,
            Color = color,
            CreatedAt = DateTimeOffset.UtcNow
        };

        _data.Activities.Add(newActivity);
        Activities.Add(newActivity);
        SelectedActivity = newActivity;
        SaveData();
    }

    public void SaveWidgetPosition(double left, double top)
    {
        _data.Settings.PositionX = left;
        _data.Settings.PositionY = top;
        SaveData();
    }

    private void SaveData() => _storageService.Save(_data);

    private void OnEngineTick(TimeSpan elapsed) => FormattedTime = FormatTimeSpan(elapsed);
    private void OnEngineStateChanged(bool isRunning) => IsRunning = isRunning;
    private void OnStorageError(string message)
    {
        StatusMessage = message;
        ShowNotification?.Invoke(message);
    }
    private void ExecuteClose() => RequestClose?.Invoke();

    private static string FormatTimeSpan(TimeSpan ts)
    {
        return $"{(int)ts.TotalHours:D2}:{ts.Minutes:D2}:{ts.Seconds:D2}";
    }

    protected bool SetField<T>(ref T field, T value, [CallerMemberName] string? propertyName = null)
    {
        if (Equals(field, value)) return false;
        field = value;
        OnPropertyChanged(propertyName);
        return true;
    }

    protected void OnPropertyChanged([CallerMemberName] string? propertyName = null)
    {
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
    }
}`,
  },
  {
    path: 'Views/MainWindow.xaml',
    name: 'MainWindow.xaml',
    language: 'xml',
    content: `<Window x:Class="MiniTimeTracker.Views.MainWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Mini Time Tracker"
        Height="76" Width="290"
        WindowStyle="None"
        AllowsTransparency="True"
        Background="Transparent"
        ResizeMode="NoResize"
        ShowInTaskbar="True"
        Topmost="{Binding IsTopmost, Mode=OneWay}"
        MouseLeftButtonDown="OnWindowMouseLeftButtonDown"
        MouseEnter="OnWindowMouseEnter"
        MouseLeave="OnWindowMouseLeave"
        Loaded="OnWindowLoaded"
        Closing="OnWindowClosing">

    <Window.Resources>
        <SolidColorBrush x:Key="WidgetBgBrush" Color="#EE1E1E24" />
        <SolidColorBrush x:Key="WidgetBorderBrush" Color="#33FFFFFF" />
        <SolidColorBrush x:Key="TextPrimaryBrush" Color="#F3F4F6" />
        <SolidColorBrush x:Key="TextSecondaryBrush" Color="#9CA3AF" />
        <SolidColorBrush x:Key="HoverButtonBg" Color="#22FFFFFF" />

        <Style x:Key="IconButtonStyle" TargetType="Button">
            <Setter Property="Background" Value="Transparent" />
            <Setter Property="Foreground" Value="#9CA3AF" />
            <Setter Property="BorderThickness" Value="0" />
            <Setter Property="Padding" Value="4" />
            <Setter Property="Width" Value="24" />
            <Setter Property="Height" Value="22" />
            <Setter Property="Cursor" Value="Hand" />
        </Style>

        <Style x:Key="ActionButtonStyle" TargetType="Button">
            <Setter Property="Cursor" Value="Hand" />
            <Setter Property="BorderThickness" Value="0" />
            <Setter Property="Width" Value="36" />
            <Setter Property="Height" Value="36" />
        </Style>
    </Window.Resources>

    <Grid ClipToBounds="False">
        <!-- Язычок при сворачивании к правому краю экрана (Edge Peek Tab) -->
        <Border x:Name="EdgePeekTab"
                Width="14" Height="58"
                HorizontalAlignment="Left"
                VerticalAlignment="Center"
                Background="#3B82F6"
                CornerRadius="6,0,0,6"
                Opacity="0"
                IsHitTestVisible="False"
                Cursor="Hand"
                MouseEnter="OnEdgePeekTabMouseEnter"
                ToolTip="Развернуть виджет">
            <Border Width="3" Height="28" Background="#CCFFFFFF" CornerRadius="1.5" HorizontalAlignment="Center" VerticalAlignment="Center" />
        </Border>

        <!-- Контейнер виджета -->
        <Border x:Name="MainWidgetContainer"
                Background="{StaticResource WidgetBgBrush}"
                BorderBrush="{StaticResource WidgetBorderBrush}"
                BorderThickness="1"
                CornerRadius="14"
                Margin="0">
            <Grid Margin="10,6,10,6">
                <Grid.RowDefinitions>
                    <RowDefinition Height="22" />
                    <RowDefinition Height="38" />
                </Grid.RowDefinitions>

                <!-- Верхний ряд: Название активности + выпадающий список -->
                <Grid Grid.Row="0">
                    <Grid.ColumnDefinitions>
                        <ColumnDefinition Width="*" />
                        <ColumnDefinition Width="Auto" />
                    </Grid.ColumnDefinitions>

                    <StackPanel Orientation="Horizontal" VerticalAlignment="Center">
                        <Button x:Name="ActivitySelectorBtn" Click="OnActivitySelectorClick" Background="Transparent" BorderThickness="0" Padding="2,1" Cursor="Hand">
                            <StackPanel Orientation="Horizontal" VerticalAlignment="Center">
                                <Ellipse Width="8" Height="8" Margin="0,0,6,0">
                                    <Ellipse.Fill>
                                        <SolidColorBrush Color="{Binding CurrentActivityColorBrush, FallbackValue=#3B82F6}"/>
                                    </Ellipse.Fill>
                                </Ellipse>
                                <TextBlock Text="{Binding CurrentActivityName}" Foreground="{StaticResource TextPrimaryBrush}" FontSize="11" FontWeight="SemiBold" MaxWidth="130" TextTrimming="CharacterEllipsis"/>
                                <Path Data="M7 10l5 5 5-5z" Fill="#9CA3AF" Margin="4,2,0,0" Width="7" Height="5" Stretch="Uniform" />
                            </StackPanel>
                        </Button>

                        <Popup x:Name="ActivityPopup" PlacementTarget="{Binding ElementName=ActivitySelectorBtn}" Placement="Bottom" StaysOpen="False" AllowsTransparency="True">
                            <Border Background="#1F1F26" BorderBrush="#33FFFFFF" BorderThickness="1" CornerRadius="8" Padding="4" MinWidth="170" Margin="0,4,0,0">
                                <StackPanel>
                                    <ItemsControl ItemsSource="{Binding Activities}">
                                        <ItemsControl.ItemTemplate>
                                            <DataTemplate>
                                                <Button Click="OnSelectActivityItemClick" Tag="{Binding}" Background="Transparent" BorderThickness="0" HorizontalContentAlignment="Left" Padding="6,4" Cursor="Hand">
                                                    <StackPanel Orientation="Horizontal">
                                                        <Ellipse Width="8" Height="8" Margin="0,0,6,0" Fill="#3B82F6"/>
                                                        <TextBlock Text="{Binding Name}" Foreground="#E5E7EB" FontSize="11" />
                                                    </StackPanel>
                                                </Button>
                                            </DataTemplate>
                                        </ItemsControl.ItemTemplate>
                                    </ItemsControl>
                                    <Separator Background="#22FFFFFF" Margin="0,3" />
                                    <Button Click="OnNewActivityFromPopupClick" Background="Transparent" BorderThickness="0" Padding="6,4" Cursor="Hand" HorizontalContentAlignment="Left">
                                        <TextBlock Text="+ Новая активность..." Foreground="#60A5FA" FontSize="11" FontWeight="Medium" />
                                    </Button>
                                </StackPanel>
                            </Border>
                        </Popup>
                    </StackPanel>

                    <!-- Панель управления при наведении (с векторными иконками) -->
                    <StackPanel x:Name="HoverControlsPanel" Grid.Column="1" Orientation="Horizontal" Opacity="0">
                        <Button Style="{StaticResource IconButtonStyle}" Command="{Binding ToggleTopmostCommand}" ToolTip="Закрепить поверх всех окон">
                            <Path Data="M16 12V4H17V2H7V4H8V12L6 14V16H11V22H13V16H18V14L16 12Z" Fill="#9CA3AF" Stretch="Uniform" Width="10" Height="10"/>
                        </Button>
                        <Button Style="{StaticResource IconButtonStyle}" Command="{Binding AddActivityCommand}" ToolTip="Создать новую активность">
                            <Path Data="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" Fill="#9CA3AF" Stretch="Uniform" Width="11" Height="11"/>
                        </Button>
                        <Button Style="{StaticResource IconButtonStyle}" Command="{Binding ShowHistoryCommand}" ToolTip="История сессий">
                            <Path Data="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7V7z" Fill="#9CA3AF" Stretch="Uniform" Width="11" Height="11"/>
                        </Button>
                        <Button Style="{StaticResource IconButtonStyle}" Command="{Binding ToggleEdgeDockCommand}" ToolTip="К краю экрана">
                            <Path Data="M4 14h6v6h-2v-4H4v-2zm10 4v-4h6v2h-4v4h-2zM4 10V4h2v4h4v2H4zm14-4V4h2v6h-6V8h4V6z" Fill="#9CA3AF" Stretch="Uniform" Width="11" Height="11"/>
                        </Button>
                        <Button Style="{StaticResource IconButtonStyle}" Command="{Binding CloseCommand}" ToolTip="Закрыть">
                            <Path Data="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" Fill="#9CA3AF" Stretch="Uniform" Width="9" Height="9"/>
                        </Button>
                    </StackPanel>
                </Grid>

                <!-- Нижний ряд: Таймер и кнопка действия -->
                <Grid Grid.Row="1" VerticalAlignment="Center">
                    <Grid.ColumnDefinitions>
                        <ColumnDefinition Width="*" />
                        <ColumnDefinition Width="Auto" />
                    </Grid.ColumnDefinitions>

                    <TextBlock Text="{Binding FormattedTime}" Foreground="#FFFFFF" FontFamily="Consolas, Segoe UI" FontSize="23" FontWeight="Bold" VerticalAlignment="Center"/>

                    <Button Grid.Column="1" Style="{StaticResource ActionButtonStyle}" Command="{Binding ToggleStartStopCommand}">
                        <Button.Style>
                            <Style TargetType="Button" BasedOn="{StaticResource ActionButtonStyle}">
                                <Setter Property="Background" Value="#10B981" />
                                <Setter Property="Content">
                                    <Setter.Value>
                                        <Polygon Points="0,0 0,13 11,6.5" Fill="#FFFFFF" HorizontalAlignment="Center" VerticalAlignment="Center" Margin="2,0,0,0" />
                                    </Setter.Value>
                                </Setter>
                                <Style.Triggers>
                                    <DataTrigger Binding="{Binding IsRunning}" Value="True">
                                        <Setter Property="Background" Value="#EF4444" />
                                        <Setter Property="Content">
                                            <Setter.Value>
                                                <Rectangle Width="12" Height="12" Fill="#FFFFFF" RadiusX="2" RadiusY="2" HorizontalAlignment="Center" VerticalAlignment="Center" />
                                            </Setter.Value>
                                        </Setter>
                                    </DataTrigger>
                                </Style.Triggers>
                            </Style>
                        </Button.Style>
                    </Button>
                </Grid>
            </Grid>
        </Border>
    </Grid>
</Window>`,
  },
  {
    path: 'Views/MainWindow.xaml.cs',
    name: 'MainWindow.xaml.cs',
    language: 'csharp',
    content: `using System;
using System.Runtime.InteropServices;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media.Animation;
using System.Windows.Threading;
using MiniTimeTracker.Models;
using MiniTimeTracker.ViewModels;

namespace MiniTimeTracker.Views;

public partial class MainWindow : Window
{
    private enum EdgeDockState { Floating, DockedHidden, DockedOpening, DockedVisible, DockedClosing }

    private readonly MainViewModel _viewModel;
    private EdgeDockState _dockState = EdgeDockState.Floating;
    private readonly DispatcherTimer _collapseDebounceTimer;
    private Storyboard? _currentSlideStoryboard;

    [DllImport("user32.dll")]
    private static extern bool GetCursorPos(out WinPoint lpPoint);

    [StructLayout(LayoutKind.Sequential)]
    private struct WinPoint { public int X; public int Y; }

    public MainWindow(MainViewModel viewModel)
    {
        InitializeComponent();
        _viewModel = viewModel;
        DataContext = _viewModel;

        _viewModel.RequestClose += () => Close();
        _viewModel.RequestShowActivityDialog += ShowActivityDialog;
        _viewModel.RequestShowHistoryWindow += ShowHistoryWindow;
        _viewModel.ShowNotification += OnNotification;

        _collapseDebounceTimer = new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(300) };
        _collapseDebounceTimer.Tick += OnCollapseDebounceTick;

        _viewModel.PropertyChanged += (s, e) =>
        {
            if (e.PropertyName == nameof(MainViewModel.IsEdgeDocked))
            {
                OnEdgeDockSettingChanged(_viewModel.IsEdgeDocked);
            }
        };
    }

    private void OnWindowLoaded(object sender, RoutedEventArgs e)
    {
        double screenW = SystemParameters.PrimaryScreenWidth;
        double screenH = SystemParameters.PrimaryScreenHeight;
        Left = Math.Max(10, Math.Min(screenW - Width - 10, 100));
        Top = Math.Max(10, Math.Min(screenH - Height - 50, 100));

        if (_viewModel.IsEdgeDocked) SnapToRightEdgeImmediate(true);
    }

    private void OnWindowMouseLeftButtonDown(object sender, MouseButtonEventArgs e)
    {
        if (ActivityPopup.IsOpen) ActivityPopup.IsOpen = false;

        if (e.ButtonState == MouseButtonState.Pressed)
        {
            try
            {
                DragMove();
                _viewModel.SaveWidgetPosition(Left, Top);

                double screenRight = SystemParameters.PrimaryScreenWidth;
                if (_viewModel.IsEdgeDocked && Left < screenRight - Width - 50)
                {
                    _viewModel.IsEdgeDocked = false;
                    _dockState = EdgeDockState.Floating;
                    EdgePeekTab.Visibility = Visibility.Collapsed;
                    MainWidgetContainer.Opacity = 1.0;
                }
            }
            catch {}
        }
    }

    private void OnEdgePeekTabMouseEnter(object sender, MouseEventArgs e)
    {
        if (_viewModel.IsEdgeDocked && (_dockState == EdgeDockState.DockedHidden || _dockState == EdgeDockState.DockedClosing))
        {
            AnimateSlideOut();
        }
    }

    private void OnWindowMouseEnter(object sender, MouseEventArgs e)
    {
        _collapseDebounceTimer.Stop();

        var anim = new DoubleAnimation(1.0, TimeSpan.FromMilliseconds(160));
        HoverControlsPanel.BeginAnimation(OpacityProperty, anim);

        if (_viewModel.IsEdgeDocked)
        {
            if (_dockState == EdgeDockState.DockedHidden || _dockState == EdgeDockState.DockedClosing)
            {
                AnimateSlideOut();
            }
        }
    }

    private void OnWindowMouseLeave(object sender, MouseEventArgs e)
    {
        if (ActivityPopup.IsOpen) return;

        var anim = new DoubleAnimation(0.0, TimeSpan.FromMilliseconds(200));
        HoverControlsPanel.BeginAnimation(OpacityProperty, anim);

        if (_viewModel.IsEdgeDocked)
        {
            // Запускаем таймер сворачивания ТОЛЬКО если панель полностью раскрыта (DockedVisible)
            // Во время анимации раскрытия (DockedOpening) промежуточные события игнорируются
            if (_dockState == EdgeDockState.DockedVisible)
            {
                _collapseDebounceTimer.Stop();
                _collapseDebounceTimer.Start();
            }
        }
    }

    private void OnCollapseDebounceTick(object? sender, EventArgs e)
    {
        _collapseDebounceTimer.Stop();
        if (!_viewModel.IsEdgeDocked || ActivityPopup.IsOpen || _dockState != EdgeDockState.DockedVisible) return;

        if (GetCursorPos(out WinPoint pt))
        {
            Rect bounds = new Rect(Left - 6, Top - 6, Width + 12, Height + 12);
            if (bounds.Contains(new Point(pt.X, pt.Y))) return;
        }

        AnimateSlideIn();
    }

    private void OnEdgeDockSettingChanged(bool isDocked)
    {
        if (isDocked)
        {
            SnapToRightEdgeImmediate(false);
            AnimateSlideIn();
        }
        else
        {
            _collapseDebounceTimer.Stop();
            _dockState = EdgeDockState.Floating;
            EdgePeekTab.Opacity = 0.0;
            EdgePeekTab.IsHitTestVisible = false;
            MainWidgetContainer.Opacity = 1.0;

            double screenRight = SystemParameters.PrimaryScreenWidth;
            if (Left > screenRight - Width - 10)
            {
                Left = screenRight - Width - 30;
            }
        }
    }

    private void SnapToRightEdgeImmediate(bool hidden)
    {
        double screenRight = SystemParameters.PrimaryScreenWidth;
        if (hidden)
        {
            Left = screenRight - 14;
            _dockState = EdgeDockState.DockedHidden;
            EdgePeekTab.Opacity = 1.0;
            EdgePeekTab.IsHitTestVisible = true;
            MainWidgetContainer.Opacity = 0.25;
        }
        else
        {
            Left = screenRight - Width;
            _dockState = EdgeDockState.DockedVisible;
            EdgePeekTab.Opacity = 0.0;
            EdgePeekTab.IsHitTestVisible = false;
            MainWidgetContainer.Opacity = 1.0;
        }
    }

    private void AnimateSlideOut()
    {
        _collapseDebounceTimer.Stop();
        _dockState = EdgeDockState.DockedOpening;

        double screenRight = SystemParameters.PrimaryScreenWidth;
        double targetLeft = screenRight - Width;

        _currentSlideStoryboard?.Stop(this);

        var slideAnim = new DoubleAnimation(Left, targetLeft, TimeSpan.FromMilliseconds(240))
        {
            EasingFunction = new QuadraticEase { EasingMode = EasingMode.EaseOut }
        };
        var opacityAnim = new DoubleAnimation(MainWidgetContainer.Opacity, 1.0, TimeSpan.FromMilliseconds(180));

        Storyboard.SetTarget(slideAnim, this);
        Storyboard.SetTargetProperty(slideAnim, new PropertyPath(LeftProperty));
        Storyboard.SetTarget(opacityAnim, MainWidgetContainer);
        Storyboard.SetTargetProperty(opacityAnim, new PropertyPath(OpacityProperty));

        var sb = new Storyboard();
        sb.Children.Add(slideAnim);
        sb.Children.Add(opacityAnim);
        sb.Completed += (_, _) =>
        {
            _dockState = EdgeDockState.DockedVisible;
            EdgePeekTab.Opacity = 0.0;
            EdgePeekTab.IsHitTestVisible = false;
            MainWidgetContainer.Opacity = 1.0;
            Left = targetLeft;

            if (GetCursorPos(out WinPoint pt))
            {
                Rect bounds = new Rect(Left - 6, Top - 6, Width + 12, Height + 12);
                if (!bounds.Contains(new Point(pt.X, pt.Y)))
                {
                    _collapseDebounceTimer.Stop();
                    _collapseDebounceTimer.Start();
                }
            }
        };

        _currentSlideStoryboard = sb;
        sb.Begin(this, true);
    }

    private void AnimateSlideIn()
    {
        _dockState = EdgeDockState.DockedClosing;
        double screenRight = SystemParameters.PrimaryScreenWidth;
        double targetLeft = screenRight - 14;

        EdgePeekTab.Opacity = 1.0;
        EdgePeekTab.IsHitTestVisible = true;
        _currentSlideStoryboard?.Stop(this);

        var slideAnim = new DoubleAnimation(Left, targetLeft, TimeSpan.FromMilliseconds(240))
        {
            EasingFunction = new QuadraticEase { EasingMode = EasingMode.EaseInOut }
        };
        var opacityAnim = new DoubleAnimation(MainWidgetContainer.Opacity, 0.25, TimeSpan.FromMilliseconds(220));

        Storyboard.SetTarget(slideAnim, this);
        Storyboard.SetTargetProperty(slideAnim, new PropertyPath(LeftProperty));
        Storyboard.SetTarget(opacityAnim, MainWidgetContainer);
        Storyboard.SetTargetProperty(opacityAnim, new PropertyPath(OpacityProperty));

        var sb = new Storyboard();
        sb.Children.Add(slideAnim);
        sb.Children.Add(opacityAnim);
        sb.Completed += (_, _) =>
        {
            _dockState = EdgeDockState.DockedHidden;
            Left = targetLeft;

            if (GetCursorPos(out WinPoint pt))
            {
                Rect tabBounds = new Rect(Left - 2, Top - 4, 18, Height + 8);
                if (tabBounds.Contains(new Point(pt.X, pt.Y)))
                {
                    AnimateSlideOut();
                }
            }
        };

        _currentSlideStoryboard = sb;
        sb.Begin(this, true);
    }

    private void OnActivitySelectorClick(object sender, RoutedEventArgs e)
    {
        if (!_viewModel.IsRunning) ActivityPopup.IsOpen = !ActivityPopup.IsOpen;
    }

    private void OnSelectActivityItemClick(object sender, RoutedEventArgs e)
    {
        if (sender is Button btn && btn.Tag is ActivityItem act)
        {
            _viewModel.SelectedActivity = act;
            ActivityPopup.IsOpen = false;
        }
    }

    private void OnNewActivityFromPopupClick(object sender, RoutedEventArgs e)
    {
        ActivityPopup.IsOpen = false;
        ShowActivityDialog();
    }

    private void ShowActivityDialog()
    {
        var dialog = new ActivityDialog(this);
        if (dialog.ShowDialog() == true && !string.IsNullOrWhiteSpace(dialog.ActivityName))
        {
            _viewModel.CreateActivity(dialog.ActivityName, dialog.ActivityColor);
        }
    }

    private void ShowHistoryWindow()
    {
        var historyWin = new HistoryWindow(_viewModel.History) { Owner = this };
        historyWin.ShowDialog();
    }

    private void OnNotification(string message)
    {
        MessageBox.Show(this, message, "Mini Time Tracker", MessageBoxButton.OK, MessageBoxImage.Information);
    }

    private void OnWindowClosing(object? sender, System.ComponentModel.CancelEventArgs e)
    {
        _viewModel.SaveWidgetPosition(Left, Top);
    }
}`,
  },
  {
    path: 'Views/ActivityDialog.xaml',
    name: 'ActivityDialog.xaml',
    language: 'xml',
    content: `<Window x:Class="MiniTimeTracker.Views.ActivityDialog"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Новая активность" Height="220" Width="340"
        WindowStyle="None" AllowsTransparency="True" Background="Transparent"
        ResizeMode="NoResize" WindowStartupLocation="CenterOwner" ShowInTaskbar="False">
    <Border Background="#EE1E1E24" BorderBrush="#33FFFFFF" BorderThickness="1" CornerRadius="14" Margin="6">
        <Grid Margin="16">
            <Grid.RowDefinitions>
                <RowDefinition Height="Auto" />
                <RowDefinition Height="*" />
                <RowDefinition Height="Auto" />
            </Grid.RowDefinitions>
            <Grid Grid.Row="0" Margin="0,0,0,12">
                <StackPanel Orientation="Horizontal" VerticalAlignment="Center">
                    <Ellipse x:Name="HeaderColorDot" Width="10" Height="10" Fill="#3B82F6" Margin="0,0,8,0"/>
                    <TextBlock Text="Новая активность" Foreground="#F3F4F6" FontSize="13" FontWeight="SemiBold" />
                </StackPanel>
                <Button Content="✕" Click="OnCancelClick" HorizontalAlignment="Right" Background="Transparent" Foreground="#9CA3AF" BorderThickness="0" FontSize="11" Cursor="Hand" />
            </Grid>
            <StackPanel Grid.Row="1">
                <TextBlock Text="Название активности" Foreground="#9CA3AF" FontSize="11" Margin="0,0,0,4" />
                <TextBox x:Name="ActivityNameInput" Background="#22222B" Foreground="#FFFFFF" CaretBrush="#FFFFFF" BorderBrush="#444455" BorderThickness="1" Padding="8,6" FontSize="12" Margin="0,0,0,12" KeyDown="OnInputKeyDown" />
                <TextBlock Text="Цветовой маркер" Foreground="#9CA3AF" FontSize="11" Margin="0,0,0,6" />
                <StackPanel x:Name="ColorSwatchesPanel" Orientation="Horizontal" Margin="0,0,0,8">
                    <Button Tag="#3B82F6" Background="#3B82F6" Click="OnColorSwatchClick" Width="26" Height="26" Margin="0,0,6,0" Cursor="Hand" />
                    <Button Tag="#10B981" Background="#10B981" Click="OnColorSwatchClick" Width="26" Height="26" Margin="0,0,6,0" Cursor="Hand" />
                    <Button Tag="#8B5CF6" Background="#8B5CF6" Click="OnColorSwatchClick" Width="26" Height="26" Margin="0,0,6,0" Cursor="Hand" />
                    <Button Tag="#F59E0B" Background="#F59E0B" Click="OnColorSwatchClick" Width="26" Height="26" Margin="0,0,6,0" Cursor="Hand" />
                    <Button Tag="#EF4444" Background="#EF4444" Click="OnColorSwatchClick" Width="26" Height="26" Margin="0,0,6,0" Cursor="Hand" />
                    <Button Tag="#06B6D4" Background="#06B6D4" Click="OnColorSwatchClick" Width="26" Height="26" Margin="0,0,6,0" Cursor="Hand" />
                    <Button Tag="#EC4899" Background="#EC4899" Click="OnColorSwatchClick" Width="26" Height="26" Margin="0,0,6,0" Cursor="Hand" />
                </StackPanel>
            </StackPanel>
            <StackPanel Grid.Row="2" Orientation="Horizontal" HorizontalAlignment="Right" Margin="0,10,0,0">
                <Button Content="Отмена" Click="OnCancelClick" Background="Transparent" Foreground="#9CA3AF" BorderThickness="0" Padding="12,6" Margin="0,0,8,0" Cursor="Hand" />
                <Button Content="Создать" Click="OnSaveClick" Background="#2563EB" Foreground="#FFFFFF" BorderThickness="0" Padding="16,6" FontWeight="SemiBold" Cursor="Hand" />
            </StackPanel>
        </Grid>
    </Border>
</Window>`,
  },
  {
    path: 'Views/ActivityDialog.xaml.cs',
    name: 'ActivityDialog.xaml.cs',
    language: 'csharp',
    content: `using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;

namespace MiniTimeTracker.Views;

public partial class ActivityDialog : Window
{
    public string ActivityName { get; private set; } = string.Empty;
    public string ActivityColor { get; private set; } = "#3B82F6";

    public ActivityDialog(Window owner)
    {
        InitializeComponent();
        Owner = owner;
        Loaded += (_, _) => ActivityNameInput.Focus();
    }

    private void OnInputKeyDown(object sender, KeyEventArgs e)
    {
        if (e.Key == Key.Enter) OnSaveClick(sender, e);
        else if (e.Key == Key.Escape) { DialogResult = false; Close(); }
    }

    private void OnColorSwatchClick(object sender, RoutedEventArgs e)
    {
        if (sender is Button btn && btn.Tag is string hex)
        {
            ActivityColor = hex;
            try
            {
                var color = (Color)ColorConverter.ConvertFromString(hex);
                HeaderColorDot.Fill = new SolidColorBrush(color);
            }
            catch {}
        }
    }

    private void OnSaveClick(object sender, RoutedEventArgs e)
    {
        string name = ActivityNameInput.Text?.Trim() ?? string.Empty;
        if (string.IsNullOrEmpty(name))
        {
            MessageBox.Show(this, "Введите название активности", "Предупреждение", MessageBoxButton.OK, MessageBoxImage.Warning);
            return;
        }

        ActivityName = name;
        DialogResult = true;
        Close();
    }

    private void OnCancelClick(object sender, RoutedEventArgs e)
    {
        DialogResult = false;
        Close();
    }
}`,
  },
  {
    path: 'Views/HistoryWindow.xaml',
    name: 'HistoryWindow.xaml',
    language: 'xml',
    content: `<Window x:Class="MiniTimeTracker.Views.HistoryWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="История сессий" Height="380" Width="380"
        WindowStyle="None" AllowsTransparency="True" Background="Transparent"
        ResizeMode="NoResize" WindowStartupLocation="CenterOwner" ShowInTaskbar="False">
    <Border Background="#EE1E1E24" BorderBrush="#33FFFFFF" BorderThickness="1" CornerRadius="14" Margin="6">
        <Grid Margin="16">
            <Grid.RowDefinitions>
                <RowDefinition Height="Auto" />
                <RowDefinition Height="*" />
                <RowDefinition Height="Auto" />
            </Grid.RowDefinitions>
            <Grid Grid.Row="0" Margin="0,0,0,12">
                <StackPanel Orientation="Horizontal" VerticalAlignment="Center">
                    <Path Data="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7V7z" Fill="#60A5FA" Width="14" Height="14" Stretch="Uniform" Margin="0,0,8,0"/>
                    <TextBlock x:Name="TitleText" Text="История сессий" Foreground="#F3F4F6" FontSize="14" FontWeight="SemiBold" VerticalAlignment="Center" />
                </StackPanel>
                <Button Content="✕" Click="OnCloseClick" HorizontalAlignment="Right" Background="Transparent" Foreground="#9CA3AF" BorderThickness="0" FontSize="12" Cursor="Hand" />
            </Grid>
            <ScrollViewer Grid.Row="1" VerticalScrollBarVisibility="Auto">
                <ItemsControl x:Name="SessionsList">
                    <ItemsControl.ItemTemplate>
                        <DataTemplate>
                            <Border Background="#1A1A22" BorderBrush="#22FFFFFF" BorderThickness="1" CornerRadius="8" Margin="0,0,0,8" Padding="10,8">
                                <Grid>
                                    <Grid.RowDefinitions>
                                        <RowDefinition Height="Auto" />
                                        <RowDefinition Height="Auto" />
                                    </Grid.RowDefinitions>
                                    <Grid.ColumnDefinitions>
                                        <ColumnDefinition Width="*" />
                                        <ColumnDefinition Width="Auto" />
                                    </Grid.ColumnDefinitions>
                                    <StackPanel Grid.Row="0" Grid.Column="0" Orientation="Horizontal" VerticalAlignment="Center">
                                        <Path Data="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" Fill="#34D399" Width="11" Height="11" Stretch="Uniform" Margin="0,0,6,0"/>
                                        <TextBlock Text="{Binding ActivityName}" Foreground="#F3F4F6" FontWeight="SemiBold" FontSize="12" />
                                    </StackPanel>
                                    <Border Grid.Row="0" Grid.Column="1" Background="#1E293B" BorderBrush="#38BDF8" BorderThickness="0.5" CornerRadius="4" Padding="6,2" VerticalAlignment="Center">
                                        <TextBlock Text="{Binding FormattedDuration}" Foreground="#38BDF8" FontFamily="Consolas, Segoe UI" FontWeight="Bold" FontSize="11" />
                                    </Border>
                                    <Grid Grid.Row="1" Grid.Column="0" Grid.ColumnSpan="2" Margin="0,6,0,0">
                                        <Grid.ColumnDefinitions>
                                            <ColumnDefinition Width="*" />
                                            <ColumnDefinition Width="Auto" />
                                        </Grid.ColumnDefinitions>
                                        <TextBlock Text="{Binding StartTime, StringFormat='{}{0:dd.MM.yyyy}'}" Foreground="#9CA3AF" FontSize="10" />
                                        <TextBlock Grid.Column="1" Foreground="#9CA3AF" FontSize="10">
                                            <TextBlock.Text>
                                                <MultiBinding StringFormat="{}{0:HH:mm:ss} — {1:HH:mm:ss}">
                                                    <Binding Path="StartTime.LocalDateTime" />
                                                    <Binding Path="EndTime.LocalDateTime" />
                                                </MultiBinding>
                                            </TextBlock.Text>
                                        </TextBlock>
                                    </Grid>
                                </Grid>
                            </Border>
                        </DataTemplate>
                    </ItemsControl.ItemTemplate>
                </ItemsControl>
            </ScrollViewer>
            <Button Grid.Row="2" Content="Закрыть" Click="OnCloseClick" Background="#2A2A35" Foreground="#F3F4F6" BorderThickness="0" Padding="14,6" HorizontalAlignment="Right" Margin="0,10,0,0" Cursor="Hand" />
        </Grid>
    </Border>
</Window>`,
  },
  {
    path: 'Views/HistoryWindow.xaml.cs',
    name: 'HistoryWindow.xaml.cs',
    language: 'csharp',
    content: `using System.Collections.Generic;
using System.Linq;
using System.Windows;
using MiniTimeTracker.Models;

namespace MiniTimeTracker.Views;

public partial class HistoryWindow : Window
{
    public HistoryWindow(IEnumerable<TimeSession> sessions)
    {
        InitializeComponent();
        var list = sessions.ToList();
        SessionsList.ItemsSource = list;
        TitleText.Text = $"История сессий ({list.Count})";
        EmptyNotice.Visibility = list.Count == 0 ? Visibility.Visible : Visibility.Collapsed;
    }

    private void OnCloseClick(object sender, RoutedEventArgs e) => Close();
}`,
  },
  {
    path: 'build.cmd',
    name: 'build.cmd',
    language: 'batch',
    content: `@echo off
echo ========================================================
echo  Mini Time Tracker - Сборка автономного EXE для Windows 11
echo ========================================================
echo.
dotnet publish MiniTimeTracker.csproj -c Release -r win-x64 --self-contained -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -p:EnableCompressionInSingleFile=true -o ./publish
pause`,
  },
  {
    path: 'README.md',
    name: 'README.md',
    language: 'markdown',
    content: `# Mini Time Tracker для Windows 11 (C# / WPF / .NET 10 LTS)

Минималистичный персональный трекер времени, выполненный в виде плавающего компактного виджета для Windows 11 x64.

## Команды сборки:
\`\`\`bash
# Режим разработки
dotnet run

# Автономный исполняемый файл без зависимостей
dotnet publish -c Release -r win-x64 --self-contained -p:PublishSingleFile=true -o ./publish
\`\`\``,
  },
];
