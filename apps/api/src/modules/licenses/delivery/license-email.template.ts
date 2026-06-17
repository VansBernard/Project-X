type LicenseEmailInput = {
  customerName: string;
  deviceInformation: string;
  paymentInformation: string;
  expirationDate: string;
  licenseKey: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function licenseEmailSubject(input: LicenseEmailInput) {
  return `Project X license for ${input.deviceInformation}`;
}

export function licenseEmailText(input: LicenseEmailInput) {
  return [
    `Hello ${input.customerName},`,
    "",
    "Your Project X laptop license has been generated after a successful payment.",
    "",
    `Customer Name: ${input.customerName}`,
    `Device Information: ${input.deviceInformation}`,
    `Payment Information: ${input.paymentInformation}`,
    `Expiration Date: ${input.expirationDate}`,
    `License Key: ${input.licenseKey}`,
    "",
    "Keep this license key safe. It is tied to your assigned device and contract."
  ].join("\n");
}

export function licenseEmailHtml(input: LicenseEmailInput) {
  const safe = {
    customerName: escapeHtml(input.customerName),
    deviceInformation: escapeHtml(input.deviceInformation),
    paymentInformation: escapeHtml(input.paymentInformation),
    expirationDate: escapeHtml(input.expirationDate),
    licenseKey: escapeHtml(input.licenseKey)
  };

  return `
<!doctype html>
<html>
  <body style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
    <h1 style="font-size: 20px;">Project X License</h1>
    <p>Hello ${safe.customerName},</p>
    <p>Your Project X laptop license has been generated after a successful payment.</p>
    <table cellpadding="8" cellspacing="0" style="border-collapse: collapse;">
      <tr><td><strong>Customer Name</strong></td><td>${safe.customerName}</td></tr>
      <tr><td><strong>Device Information</strong></td><td>${safe.deviceInformation}</td></tr>
      <tr><td><strong>Payment Information</strong></td><td>${safe.paymentInformation}</td></tr>
      <tr><td><strong>Expiration Date</strong></td><td>${safe.expirationDate}</td></tr>
      <tr><td><strong>License Key</strong></td><td><code>${safe.licenseKey}</code></td></tr>
    </table>
    <p>Keep this license key safe. It is tied to your assigned device and contract.</p>
  </body>
</html>`;
}

