type LicenseEmailInput = {
  customerName: string;
  deviceInformation: string;
  paymentInformation: string;
  expirationDate: string;
  licenseKey: string;
  licenseType: "temporary" | "permanent";
  deliveryMessage?: string;
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
  const licenseKind = input.licenseType === "permanent" ? "Permanent unlock license" : "Temporary recovery license";
  return `${licenseKind} for ${input.deviceInformation}`;
}

function formatLicenseKey(value: string) {
  const clean = value.replace(/[^A-Z0-9]/gi, "");
  return clean.match(/.{1,4}/g)?.join("-") ?? clean;
}

export function licenseEmailText(input: LicenseEmailInput) {
  const licenseMessage = input.deliveryMessage ?? (input.licenseType === "permanent"
    ? "Your permanent unlock license has been generated because your contract has been fully settled."
    : "Your temporary recovery license has been generated after a successful payment.");

  const licenseTypeLabel = input.licenseType === "permanent" ? "Permanent access" : "Temporary access";

  return [
    `Hello ${input.customerName},`,
    "",
    licenseMessage,
    "",
    `License Type: ${licenseTypeLabel}`,
    `Access Period: ${input.expirationDate}`,
    `Customer Name: ${input.customerName}`,
    `Device Information: ${input.deviceInformation}`,
    `Payment Information: ${input.paymentInformation}`,
    `Expiration Date: ${input.expirationDate}`,
    `License Key: ${formatLicenseKey(input.licenseKey)}`,
    "",
    "Keep this license key safe. It is tied to your assigned device and contract."
  ].join("\n");
}

export function licenseEmailHtml(input: LicenseEmailInput) {
  const licenseKey = formatLicenseKey(input.licenseKey);
  const licenseTypeLabel = input.licenseType === "permanent" ? "Permanent license" : "Temporary license";
  const accessPeriod = input.licenseType === "permanent" ? "Lifetime access" : `Access until ${input.expirationDate}`;
  const safe = {
    customerName: escapeHtml(input.customerName),
    deviceInformation: escapeHtml(input.deviceInformation),
    paymentInformation: escapeHtml(input.paymentInformation),
    expirationDate: escapeHtml(input.expirationDate),
    licenseKey: escapeHtml(licenseKey),
    licenseTypeLabel: escapeHtml(licenseTypeLabel),
    accessPeriod: escapeHtml(accessPeriod),
    message: escapeHtml(input.deliveryMessage ?? (input.licenseType === "permanent"
      ? "Your permanent unlock license has been generated because your contract has been fully settled."
      : "Your temporary recovery license has been generated after a successful payment."))
  };

  return `
<!doctype html>
<html>
  <body style="margin: 0; padding: 30px 0; background: #f3f4f6; font-family: Arial, sans-serif; color: #111827;">
    <div style="max-width: 760px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 18px; overflow: hidden; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);">
      <div style="padding: 20px 28px 14px; background: linear-gradient(135deg, #f8fafc 0%, #eef6ff 100%); border-bottom: 1px solid #e5e7eb;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse: collapse;">
          <tr>
            <td style="width: 56px; vertical-align: middle;">
              <img src="cid:projectx-logo" alt="Project X" style="display:block; width:46px; height:46px; border-radius:50%; object-fit:cover; background:#ffffff;" />
            </td>
            <td style="padding-left: 12px; vertical-align: middle;">
              <div style="font-size: 13px; letter-spacing: 0.12em; text-transform: uppercase; color: #64748b; font-weight: 700;">Project X</div>
              <div style="font-size: 28px; line-height: 1.2; font-weight: 700; color: #0f172a; margin-top: 2px;">${safe.licenseTypeLabel}</div>
            </td>
          </tr>
        </table>
      </div>

      <div style="padding: 26px 28px 12px; background: #ffffff;">
        <p style="margin: 0 0 16px; font-size: 17px; line-height: 1.6; color: #111827;">Hello ${safe.customerName},</p>
        <p style="margin: 0 0 22px; font-size: 16px; line-height: 1.7; color: #374151;">${safe.message}</p>

        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: separate; border-spacing: 0; background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
          <tr>
            <td style="padding: 12px 14px; border-bottom: 1px solid #e5e7eb; font-weight: 700; color: #1f2937; width: 42%;">License type</td>
            <td style="padding: 12px 14px; border-bottom: 1px solid #e5e7eb; color: #374151;">${safe.licenseTypeLabel}</td>
          </tr>
          <tr>
            <td style="padding: 12px 14px; border-bottom: 1px solid #e5e7eb; font-weight: 700; color: #1f2937;">Access period</td>
            <td style="padding: 12px 14px; border-bottom: 1px solid #e5e7eb; color: #374151;">${safe.accessPeriod}</td>
          </tr>
          <tr>
            <td style="padding: 12px 14px; border-bottom: 1px solid #e5e7eb; font-weight: 700; color: #1f2937;">Device</td>
            <td style="padding: 12px 14px; border-bottom: 1px solid #e5e7eb; color: #374151;">${safe.deviceInformation}</td>
          </tr>
          <tr>
            <td style="padding: 12px 14px; border-bottom: 1px solid #e5e7eb; font-weight: 700; color: #1f2937;">Payment</td>
            <td style="padding: 12px 14px; border-bottom: 1px solid #e5e7eb; color: #374151;">${safe.paymentInformation}</td>
          </tr>
          <tr>
            <td style="padding: 12px 14px; border-bottom: 1px solid #e5e7eb; font-weight: 700; color: #1f2937;">Expiry</td>
            <td style="padding: 12px 14px; border-bottom: 1px solid #e5e7eb; color: #374151;">${safe.expirationDate}</td>
          </tr>
          <tr>
            <td style="padding: 14px 14px 18px; font-weight: 700; color: #1f2937; vertical-align: top;">License key</td>
            <td style="padding: 14px 14px 18px; color: #111827;">
              <div style="background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 12px; padding: 16px 18px; font-size: 28px; line-height: 1.4; letter-spacing: 0.14em; font-weight: 700; text-align: center; font-family: monospace; word-break: break-all;">${safe.licenseKey}</div>
            </td>
          </tr>
        </table>

        <p style="margin: 18px 0 0; font-size: 15px; line-height: 1.7; color: #374151;">Keep this license key safe. It is tied to your assigned device and contract.</p>
      </div>
    </div>
  </body>
</html>`;
}
