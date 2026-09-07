using System.Windows;
using System;

namespace DesktopAppFresh
{
    public partial class StartupWindow : Window
    {
        public StartupWindow()
        {
            InitializeComponent();
        }

        private void GetStartedBtn_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                AppNavigator.Instance.ShowLogin();
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    $"The login screen could not be opened.\n\n{ex.Message}",
                    "Project X startup error",
                    MessageBoxButton.OK,
                    MessageBoxImage.Error);
            }
        }
    }
}
