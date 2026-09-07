using System;
using System.Collections.Generic;
using System.Linq;

namespace DesktopAppFresh
{
    public static class RecoveryPolicyTests
    {
        public static void Run()
        {
            Assert(RecoveryPolicy.Decide(false, false, false, 0) == RecoveryDecision.Rejected, "invalid authorization must be rejected");
            Assert(RecoveryPolicy.Decide(true, false, false, 0) == RecoveryDecision.Accepted, "first valid authorization must be accepted");
            Assert(RecoveryPolicy.Decide(true, true, false, 1) == RecoveryDecision.Reused, "reused authorization must be rejected");
            Assert(RecoveryPolicy.Decide(true, false, true, 1) == RecoveryDecision.ActiveAlready, "active recovery must not count again");
            Assert(RecoveryPolicy.Decide(true, false, false, 2) == RecoveryDecision.LimitHit, "third recovery must hit the limit");
        }

        private static void Assert(bool condition, string message)
        {
            if (!condition) throw new InvalidOperationException(message);
        }
    }
}
