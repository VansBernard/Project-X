using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Windows.Media.Imaging;
using QRCoder;

namespace DesktopAppFresh
{
    public static class PaymentQrCache
    {
        private static readonly string CacheDirectory = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "ProjectX",
            "payment-qr");
        private static readonly byte[] Entropy = Encoding.UTF8.GetBytes("ProjectXPaymentQrEntropy2026");

        public static void Save(string deviceId, string paymentUrl)
        {
            Directory.CreateDirectory(CacheDirectory);
            var encrypted = ProtectedData.Protect(CreatePng(paymentUrl), Entropy, DataProtectionScope.CurrentUser);
            File.WriteAllBytes(FilePath(deviceId), encrypted);
        }

        public static BitmapImage? Load(string? deviceId)
        {
            if (string.IsNullOrWhiteSpace(deviceId) || !File.Exists(FilePath(deviceId)))
            {
                return null;
            }

            var png = ProtectedData.Unprotect(File.ReadAllBytes(FilePath(deviceId)), Entropy, DataProtectionScope.CurrentUser);
            using var stream = new MemoryStream(png);
            var image = new BitmapImage();
            image.BeginInit();
            image.CacheOption = BitmapCacheOption.OnLoad;
            image.StreamSource = stream;
            image.EndInit();
            image.Freeze();
            return image;
        }

        public static BitmapImage CreateImage(string paymentUrl)
        {
            using var stream = new MemoryStream(CreatePng(paymentUrl));
            var image = new BitmapImage();
            image.BeginInit();
            image.CacheOption = BitmapCacheOption.OnLoad;
            image.StreamSource = stream;
            image.EndInit();
            image.Freeze();
            return image;
        }

        private static byte[] CreatePng(string paymentUrl)
        {
            using var generator = new QRCodeGenerator();
            using var qrCodeData = generator.CreateQrCode(paymentUrl, QRCodeGenerator.ECCLevel.Q);
            return new PngByteQRCode(qrCodeData).GetGraphic(12);
        }

        private static string FilePath(string deviceId) => Path.Combine(CacheDirectory, $"{deviceId}.dat");
    }
}
