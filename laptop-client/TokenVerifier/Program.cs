using TokenVerifier;

var options = CliOptions.Parse(args);

if (options.PrintHardware)
{
    Console.WriteLine(HardwareFingerprint.GetHardwareUuid());
    return;
}

if (options.Status)
{
    PrintStatus();
    return;
}

if (options.SetDeadline is not null)
{
    DeadlineStore.SetDeadline(options.SetDeadline.Value);
    Console.WriteLine($"Deadline set to {options.SetDeadline:yyyy-MM-dd}");
    return;
}

if (!options.HasCode)
{
    Console.WriteLine("Usage:");
    Console.WriteLine("  dotnet run -- --year <yyyy> --month <1-12> --code <8-digit-code>");
    Console.WriteLine("  dotnet run -- --hardware <uuid> --year <yyyy> --month <1-12> --code <8-digit-code>");
    Console.WriteLine("  dotnet run -- --hardware <uuid> --code <8-digit-release-code>");
    Console.WriteLine("  dotnet run -- --status");
    Console.WriteLine("  dotnet run -- --set-deadline <yyyy-mm-dd>");
    Console.WriteLine("  dotnet run -- --print-hardware");
    Console.WriteLine();
    Console.WriteLine("Set TOKEN_SECRET in your environment before running.");
    Environment.Exit(1);
}

var secret = Environment.GetEnvironmentVariable("TOKEN_SECRET");

if (string.IsNullOrWhiteSpace(secret))
{
    Console.WriteLine("TOKEN_SECRET is missing.");
    Environment.Exit(1);
}

var hardwareUuid = options.HardwareUuid ?? HardwareFingerprint.GetHardwareUuid();
var isReleaseCode = OfflineToken.VerifyRelease(options.Code!, hardwareUuid, secret);
var isValid = isReleaseCode;

if (!isValid && options.HasValidPeriod)
{
    isValid = OfflineToken.Verify(
        options.Code!,
        hardwareUuid,
        options.Year,
        options.Month,
        secret
    );
}

if (isValid)
{
    if (isReleaseCode)
    {
        DeadlineStore.PermanentlyRelease();
        Console.WriteLine("VALID. Device permanently released.");
    }
    else
    {
        var newDeadline = new DateOnly(options.Year, options.Month, DateTime.DaysInMonth(options.Year, options.Month));
        DeadlineStore.SetDeadline(newDeadline);
        Console.WriteLine($"VALID. Deadline extended to {newDeadline:yyyy-MM-dd}");
    }
}
else
{
    Console.WriteLine("INVALID");
}

Environment.Exit(isValid ? 0 : 2);

static void PrintStatus()
{
    var deadline = DeadlineStore.GetDeadline();
    var today = DateOnly.FromDateTime(DateTime.UtcNow);
    var status = DeadlineStore.IsLocked(today) ? "LOCKED" : "UNLOCKED";

    Console.WriteLine($"Status: {status}");
    Console.WriteLine($"Today: {today:yyyy-MM-dd}");
    Console.WriteLine($"Deadline: {(deadline is null ? "not set" : deadline.Value.ToString("yyyy-MM-dd"))}");
    Console.WriteLine($"Permanently released: {DeadlineStore.IsPermanentlyReleased()}");
}

internal sealed class CliOptions
{
    public string? HardwareUuid { get; private init; }
    public int Year { get; private init; }
    public int Month { get; private init; }
    public string? Code { get; private init; }
    public bool PrintHardware { get; private init; }
    public bool Status { get; private init; }
    public DateOnly? SetDeadline { get; private init; }

    public bool HasCode => !string.IsNullOrWhiteSpace(Code);
    public bool HasValidPeriod => Year > 0 && Month is >= 1 and <= 12;

    public static CliOptions Parse(string[] args)
    {
        var values = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        for (var i = 0; i < args.Length - 1; i += 2)
        {
            if (!args[i].StartsWith("--", StringComparison.Ordinal))
            {
                continue;
            }

            values[args[i][2..]] = args[i + 1];
        }

        _ = int.TryParse(values.GetValueOrDefault("year"), out var year);
        _ = int.TryParse(values.GetValueOrDefault("month"), out var month);
        _ = DateOnly.TryParse(values.GetValueOrDefault("set-deadline"), out var setDeadline);

        return new CliOptions
        {
            HardwareUuid = values.GetValueOrDefault("hardware"),
            Year = year,
            Month = month,
            Code = values.GetValueOrDefault("code"),
            PrintHardware = args.Contains("--print-hardware", StringComparer.OrdinalIgnoreCase),
            Status = args.Contains("--status", StringComparer.OrdinalIgnoreCase),
            SetDeadline = setDeadline == default ? null : setDeadline
        };
    }
}
