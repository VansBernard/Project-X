using System;

namespace DesktopAppFresh.Tests
{
	internal static class Program
	{
		private static void Main()
		{
			DesktopAppFresh.RecoveryPolicyTests.Run();
			AppHealthMonitorTests.Run();
			Console.WriteLine("DESKTOP_RECOVERY_POLICY_TESTS_OK");
		}
	}
}