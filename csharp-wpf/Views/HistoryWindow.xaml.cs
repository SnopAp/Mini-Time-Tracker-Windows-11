using System.Collections.Generic;
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

    private void OnCloseClick(object sender, RoutedEventArgs e)
    {
        Close();
    }
}
