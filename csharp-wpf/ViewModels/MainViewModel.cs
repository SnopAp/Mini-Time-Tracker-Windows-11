using System;
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
        foreach (var act in _data.Activities)
        {
            Activities.Add(act);
        }

        History.Clear();
        foreach (var session in _data.History)
        {
            History.Add(session);
        }

        _isTopmost = _data.Settings.IsTopmost;
        _isEdgeDocked = _data.Settings.IsEdgeDocked;
        OnPropertyChanged(nameof(IsTopmost));
        OnPropertyChanged(nameof(IsEdgeDocked));

        // Восстановление активности
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
        if (string.IsNullOrEmpty(trimmed))
        {
            ShowNotification?.Invoke("Название активности не может быть пустым.");
            return;
        }

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

        ShowNotification?.Invoke($"Активность «{trimmed}» успешно создана.");
    }

    public void SaveWidgetPosition(double left, double top)
    {
        _data.Settings.PositionX = left;
        _data.Settings.PositionY = top;
        SaveData();
    }

    private void SaveData()
    {
        _storageService.Save(_data);
    }

    private void OnEngineTick(TimeSpan elapsed)
    {
        FormattedTime = FormatTimeSpan(elapsed);
    }

    private void OnEngineStateChanged(bool isRunning)
    {
        IsRunning = isRunning;
    }

    private void OnStorageError(string message)
    {
        StatusMessage = message;
        ShowNotification?.Invoke(message);
    }

    private void ExecuteClose()
    {
        RequestClose?.Invoke();
    }

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
}
