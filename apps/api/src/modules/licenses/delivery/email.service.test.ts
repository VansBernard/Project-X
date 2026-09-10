import assert from "node:assert/strict";
import test from "node:test";

const emailServicePath = "./email.service.js";

test("email service module is available for SMTP delivery", async () => {
  const module = await import(emailServicePath);
  assert.equal(typeof module.emailService.sendDealerRegistrationEmail, "function");
  assert.equal(typeof module.emailService.sendLicenseEmail, "function");
  assert.equal(typeof module.emailService.sendPayoutFailureEmail, "function");
});
