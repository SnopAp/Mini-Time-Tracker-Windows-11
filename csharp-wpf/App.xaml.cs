using System;
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
        // Предотвращение запуска нескольких копий приложения
        _singleInstanceMutex = new Mutex(true, MutexName, out bool isNewInstance);
        if (!isNewInstance)
        {
            MessageBox.Show("Приложение Mini Time Tracker уже запущено.", "Информация", MessageBoxButton.OK, MessageBoxImage.Information);
            Shutdown();
            return;
        }

        // Глобальный перехват необработанных исключений
        AppDomain.CurrentDomain.UnhandledException += (s, args) =>
        {
            string message = args.ExceptionObject is Exception ex ? ex.Message : "Неизвестная ошибка";
            MessageBox.Show($"Критическая ошибка приложения:\n{message}", "Ошибка", MessageBoxButton.OK, MessageBoxImage.Error);
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
            MessageBox.Show($"Не удалось инициализировать приложение:\n{ex.Message}", "Ошибка запуска", MessageBoxButton.OK, MessageBoxImage.Error);
            Shutdown();
        }
    }

    private void OnExit(object sender, ExitEventArgs e)
    {
        _singleInstanceMutex?.ReleaseMutex();
        _singleInstanceMutex?.Dispose();
    }
}
