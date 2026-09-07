using System.Windows;

namespace DesktopAppFresh
{
    public partial class MainWindow : Window
    {
        public MainWindow()
        {
            InitializeComponent();
            // Immediately redirect to the LoginWindow to show the new UI while keeping StartupUri unchanged
            Loaded += MainWindow_Loaded;
        }

        private void MainWindow_Loaded(object? sender, RoutedEventArgs e)
        {
            var login = new LoginWindow();
            login.Show();
            // Close the placeholder main window
            Close();
        }
    }
}
