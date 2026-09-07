using System;

namespace DesktopAppFresh
{
    public enum RecoveryDecision
    {
        Accepted,
        ActiveAlready,
        LimitHit,
        Reused,
        Rejected
    }

    public static class RecoveryPolicy
    {
        public static RecoveryDecision Decide(bool authorizationValid, bool alreadyAccepted, bool activeRecoveryExists, int successfulCount)
        {
            if (!authorizationValid) return RecoveryDecision.Rejected;
            if (alreadyAccepted) return RecoveryDecision.Reused;
            if (activeRecoveryExists) return RecoveryDecision.ActiveAlready;
            if (successfulCount >= 2) return RecoveryDecision.LimitHit;
            return RecoveryDecision.Accepted;
        }
    }
}
