using System;
using System.Security.Cryptography;
using System.Text;

class HexTest
{
    static void Main()
    {
        // Test with your UUID
        string hardwareUuid = "4C4C4544-0058-5810-8036-B4C04F4A5A32";
        
        Console.WriteLine("=== .NET Hex Generation ===");
        Console.WriteLine($"Input UUID: {hardwareUuid}");
        
        var normalized = hardwareUuid.Trim().ToUpperInvariant();
        Console.WriteLine($"Normalized: {normalized}");
        
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(normalized));
        var hex = Convert.ToHexString(bytes);
        
        Console.WriteLine($"Full SHA256 hex: {hex}");
        Console.WriteLine($"Full SHA256 length: {hex.Length}");
        
        var first12 = hex.Substring(0, 12);
        Console.WriteLine($"First 12 chars: {first12}");
        
        var deviceAddress = string.Join("-", new[] {
            first12.Substring(0, 4),
            first12.Substring(4, 4),
            first12.Substring(8, 4)
        });
        
        Console.WriteLine($"Device Address: {deviceAddress}");
        Console.WriteLine("");
        Console.WriteLine("This should match what you send to backend.");
        Console.WriteLine("Expected: 0A03-DB09-086E");
        Console.WriteLine($"Actual:   {deviceAddress}");
        Console.WriteLine($"Match: {deviceAddress == "0A03-DB09-086E"}");
    }
}
