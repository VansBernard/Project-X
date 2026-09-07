using System;

namespace DesktopAppFresh.Tests
{
    internal static class AppHealthMonitorTests
    {
        public static void Run()
        {
            var watchdogArgs = new[] { "--watchdog", "--watch-target-pid", "123" };
            var normalArgs = new[] { "--some-flag" };

            if (DesktopAppFresh.AppHealthMonitor.ShouldWriteHeartbeat(watchdogArgs))
            {
                throw new InvalidOperationException("Watchdog processes must not write the app heartbeat.");
            }

            if (!DesktopAppFresh.AppHealthMonitor.ShouldWriteHeartbeat(normalArgs))
            {
                throw new InvalidOperationException("Normal app startup should write the heartbeat.");
            }

            if (!DesktopAppFresh.DashboardWindow.ShouldRequestLock(DateTime.UtcNow.AddMinutes(-1), 0, false))
            {
                throw new InvalidOperationException("A truly expired contract countdown should trigger the lock screen.");
            }

            if (DesktopAppFresh.DashboardWindow.ShouldRequestLock(null, 0, false))
            {
                throw new InvalidOperationException("A missing contract expiry should never trigger the lock screen by default.");
            }

            if (DesktopAppFresh.DashboardWindow.ShouldRequestLock(DateTime.UtcNow.AddMinutes(-1), 0, true))
            {
                throw new InvalidOperationException("Recovery-mode countdown should not trigger the lock screen while the recovery window is active.");
            }

            if (DesktopAppFresh.AppWatchdog.IsAutoStartEnabled())
            {
                throw new InvalidOperationException("Desktop startup should be disabled by default to prevent reboot loops.");
            }

            Console.WriteLine("APP_HEALTH_MONITOR_TESTS_OK");
        }
    }
}
