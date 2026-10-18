using System;
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
    private enum EdgeDockState
    {
        Floating,
        DockedHidden,
        DockedOpening,
        DockedVisible,
        DockedClosing
    }

    private readonly MainViewModel _viewModel;
    private EdgeDockState _dockState = EdgeDockState.Floating;
    private readonly DispatcherTimer _collapseDebounceTimer;
    private Storyboard? _currentSlideStoryboard;

    [DllImport("user32.dll")]
    private static extern bool GetCursorPos(out WinPoint lpPoint);

    [StructLayout(LayoutKind.Sequential)]
    private struct WinPoint
    {
        public int X;
        public int Y;
    }

    public MainWindow(MainViewModel viewModel)
    {
        InitializeComponent();
        _viewModel = viewModel;
        DataContext = _viewModel;

        _viewModel.RequestClose += () => Close();
        _viewModel.RequestShowActivityDialog += ShowActivityDialog;
        _viewModel.RequestShowHistoryWindow += ShowHistoryWindow;
        _viewModel.ShowNotification += OnNotification;

        // Таймер устранения дребезга при уходе мыши (300 мс согласно требованиям UX)
        _collapseDebounceTimer = new DispatcherTimer
        {
            Interval = TimeSpan.FromMilliseconds(300)
        };
        _collapseDebounceTimer.Tick += OnCollapseDebounceTick;

        // Отслеживание переключения режима Edge Docking из ViewModel
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
        // Восстановление позиции окна на экране с проверкой видимой области
        double screenW = SystemParameters.PrimaryScreenWidth;
        double screenH = SystemParameters.PrimaryScreenHeight;

        Left = Math.Max(10, Math.Min(screenW - Width - 10, 100));
        Top = Math.Max(10, Math.Min(screenH - Height - 50, 100));

        if (_viewModel.IsEdgeDocked)
        {
            SnapToRightEdgeImmediate(true);
        }
    }

    private void OnWindowMouseLeftButtonDown(object sender, MouseButtonEventArgs e)
    {
        // Если открыт Popup, закрываем его
        if (ActivityPopup.IsOpen)
        {
            ActivityPopup.IsOpen = false;
        }

        if (e.ButtonState == MouseButtonState.Pressed)
        {
            try
            {
                DragMove();
                _viewModel.SaveWidgetPosition(Left, Top);

                // Если виджет был прикреплён к краю, но пользователь оттащил его внутрь экрана
                double screenRight = SystemParameters.PrimaryScreenWidth;
                if (_viewModel.IsEdgeDocked && Left < screenRight - Width - 50)
                {
                    _viewModel.IsEdgeDocked = false;
                    _dockState = EdgeDockState.Floating;
                    EdgePeekTab.Visibility = Visibility.Collapsed;
                    MainWidgetContainer.Opacity = 1.0;
                }
            }
            catch
            {
                // Игнорируем редкие исключения при резком отпускании мыши в Win32
            }
        }
    }

    private void OnEdgePeekTabMouseEnter(object sender, MouseEventArgs e)
    {
        // Непосредственное наведение курсора на выступающий язычок у края экрана
        if (_viewModel.IsEdgeDocked && (_dockState == EdgeDockState.DockedHidden || _dockState == EdgeDockState.DockedClosing))
        {
            AnimateSlideOut();
        }
    }

    private void OnWindowMouseEnter(object sender, MouseEventArgs e)
    {
        // Отменяем таймер сворачивания, если курсор вернулся
        _collapseDebounceTimer.Stop();

        // Плавное появление кнопок управления при наведении
        var anim = new DoubleAnimation(1.0, TimeSpan.FromMilliseconds(160));
        HoverControlsPanel.BeginAnimation(OpacityProperty, anim);

        if (_viewModel.IsEdgeDocked)
        {
            // Если панель скрыта или закрывается, плавно раскрываем её
            if (_dockState == EdgeDockState.DockedHidden || _dockState == EdgeDockState.DockedClosing)
            {
                AnimateSlideOut();
            }
        }
    }

    private void OnWindowMouseLeave(object sender, MouseEventArgs e)
    {
        // Если открыто всплывающее меню активностей, не скрываем виджет
        if (ActivityPopup.IsOpen)
        {
            return;
        }

        // Плавное скрытие панели управления
        var anim = new DoubleAnimation(0.0, TimeSpan.FromMilliseconds(200));
        HoverControlsPanel.BeginAnimation(OpacityProperty, anim);

        if (_viewModel.IsEdgeDocked)
        {
            // КРИТИЧНО: Запускаем таймер сворачивания ТОЛЬКО если панель полностью раскрыта (DockedVisible).
            // Во время анимации раскрытия (DockedOpening) промежуточные события MouseLeave игнорируются,
            // предотвращая мерцание и случайные захлопывания.
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

        if (!_viewModel.IsEdgeDocked) return;
        if (ActivityPopup.IsOpen) return;
        if (_dockState != EdgeDockState.DockedVisible) return;

        // Проверяем реальное положение физического курсора мыши на экране Windows
        if (GetCursorPos(out WinPoint pt))
        {
            // Даём запас в 10 пикселей вокруг окна для стабильности
            Rect bounds = new Rect(Left - 6, Top - 6, Width + 12, Height + 12);
            if (bounds.Contains(new Point(pt.X, pt.Y)))
            {
                // Курсор всё ещё внутри интерактивной зоны (например, на границе окна)
                return;
            }
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

    /// <summary>
    /// Плавное раскрытие панели из-за края экрана (из любого текущего положения)
    /// </summary>
    private void AnimateSlideOut()
    {
        _collapseDebounceTimer.Stop();
        _dockState = EdgeDockState.DockedOpening;

        double screenRight = SystemParameters.PrimaryScreenWidth;
        double targetLeft = screenRight - Width; // Окно примыкает к краю экрана без зазора

        // Останавливаем предыдущую анимацию
        _currentSlideStoryboard?.Stop(this);

        var slideAnim = new DoubleAnimation
        {
            From = Left,
            To = targetLeft,
            Duration = TimeSpan.FromMilliseconds(240),
            EasingFunction = new QuadraticEase { EasingMode = EasingMode.EaseOut }
        };

        var opacityAnim = new DoubleAnimation
        {
            From = MainWidgetContainer.Opacity,
            To = 1.0,
            Duration = TimeSpan.FromMilliseconds(180)
        };

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

            // После завершения раскрытия проверяем, где находится физический курсор
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

    /// <summary>
    /// Плавное сворачивание панели за край экрана с сохранением выступающего язычка
    /// </summary>
    private void AnimateSlideIn()
    {
        _dockState = EdgeDockState.DockedClosing;

        double screenRight = SystemParameters.PrimaryScreenWidth;
        double targetLeft = screenRight - 14; // Оставляем выступающий синий язычок 14px

        EdgePeekTab.Opacity = 1.0;
        EdgePeekTab.IsHitTestVisible = true;

        _currentSlideStoryboard?.Stop(this);

        var slideAnim = new DoubleAnimation
        {
            From = Left,
            To = targetLeft,
            Duration = TimeSpan.FromMilliseconds(240),
            EasingFunction = new QuadraticEase { EasingMode = EasingMode.EaseInOut }
        };

        var opacityAnim = new DoubleAnimation
        {
            From = MainWidgetContainer.Opacity,
            To = 0.25,
            Duration = TimeSpan.FromMilliseconds(220)
        };

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

            // Если курсор остался над выступающим язычком, раскрываем обратно
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
        if (!_viewModel.IsRunning)
        {
            ActivityPopup.IsOpen = !ActivityPopup.IsOpen;
        }
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
        var historyWin = new HistoryWindow(_viewModel.History)
        {
            Owner = this
        };
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
}
