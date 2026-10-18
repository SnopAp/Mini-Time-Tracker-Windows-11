using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace MiniTimeTracker.Models;

/// <summary>
/// Корневой объект хранения данных (%LOCALAPPDATA%\MiniTimeTracker\data.json)
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

/// <summary>
/// Пользовательская активность
/// </summary>
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

/// <summary>
/// Завершённая сессия учёта времени
/// </summary>
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

/// <summary>
/// Состояние текущей активной сессии (для восстановления при случайном закрытии)
/// </summary>
public class ActiveSessionState
{
    [JsonPropertyName("activityId")]
    public string ActivityId { get; set; } = string.Empty;

    [JsonPropertyName("activityName")]
    public string ActivityName { get; set; } = string.Empty;

    [JsonPropertyName("startTime")]
    public DateTimeOffset StartTime { get; set; }
}

/// <summary>
/// Настройки виджета
/// </summary>
public class WidgetSettings
{
    [JsonPropertyName("isTopmost")]
    public bool IsTopmost { get; set; } = true;

    [JsonPropertyName("isEdgeDocked")]
    public bool IsEdgeDocked { get; set; } = false;

    [JsonPropertyName("dockSide")]
    public string DockSide { get; set; } = "Right"; // "Right" или "Left"

    [JsonPropertyName("positionX")]
    public double PositionX { get; set; } = 100;

    [JsonPropertyName("positionY")]
    public double PositionY { get; set; } = 100;

    [JsonPropertyName("opacity")]
    public double Opacity { get; set; } = 0.95;
}
