using System;
using System.Diagnostics;
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
        // Таймер обновляет интерфейс каждые 200 мс для плавности и точности,
        // но фактическое время всегда вычисляется из разницы UtcNow - _sessionStartTime
        _uiTimer = new DispatcherTimer(DispatcherPriority.Normal)
        {
            Interval = TimeSpan.FromMilliseconds(200)
        };
        _uiTimer.Tick += OnTimerTick;
    }

    /// <summary>
    /// Восстановить ранее сохранённую сессию после перезапуска приложения
    /// </summary>
    public void RestoreActiveSession(ActiveSessionState activeState, ActivityItem activity)
    {
        _currentActivity = activity;
        _sessionStartTime = activeState.StartTime;
        _uiTimer.Start();
        StateChanged?.Invoke(true);
        OnTimerTick(this, EventArgs.Empty);
    }

    /// <summary>
    /// Запуск сессии. Запрещает одновременный запуск нескольких сессий.
    /// </summary>
    public void Start(ActivityItem activity)
    {
        if (IsRunning)
        {
            throw new InvalidOperationException("Сессия уже запущена. Одновременный запуск нескольких сессий запрещён.");
        }

        ArgumentNullException.ThrowIfNull(activity);

        _currentActivity = activity;
        // Фиксируем временную метку по UTC
        _sessionStartTime = DateTimeOffset.UtcNow;
        _uiTimer.Start();

        StateChanged?.Invoke(true);
        OnTimerTick(this, EventArgs.Empty);
    }

    /// <summary>
    /// Остановка текущей сессии и создание завершённой записи TimeSession
    /// </summary>
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

    /// <summary>
    /// Текущее прошедшее время
    /// </summary>
    public TimeSpan GetElapsed()
    {
        if (!_sessionStartTime.HasValue)
        {
            return TimeSpan.Zero;
        }

        // Расчёт по меткам времени, исключающий drift
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
}
