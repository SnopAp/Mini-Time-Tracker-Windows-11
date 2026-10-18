using System.Windows;
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
        if (e.Key == Key.Enter)
        {
            OnSaveClick(sender, e);
        }
        else if (e.Key == Key.Escape)
        {
            DialogResult = false;
            Close();
        }
    }

    private void OnColorSwatchClick(object sender, RoutedEventArgs e)
    {
        if (sender is Button btn && btn.Tag is string hex)
        {
            ActivityColor = hex;

            // Обновляем обводку выбранного кружка
            foreach (var child in ColorSwatchesPanel.Children)
            {
                if (child is Button b)
                {
                    if (VisualTreeHelper.GetChild(b, 0) is Border border)
                    {
                        border.BorderBrush = (b == btn) ? Brushes.White : Brushes.Transparent;
                    }
                }
            }

            try
            {
                var color = (Color)ColorConverter.ConvertFromString(hex);
                HeaderColorDot.Fill = new SolidColorBrush(color);
            }
            catch { }
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
}
