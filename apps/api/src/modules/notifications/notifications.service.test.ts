import assert from "node:assert/strict";
import test from "node:test";
import { detectServerClockDrift } from "./notifications.service.js";

test("detects large device clock drift against server time", () => {
  const serverNow = new Date("2026-08-29T12:00:00.000Z");
  const deviceOccurredAt = new Date("2026-08-29T11:50:00.000Z");

  const result = detectServerClockDrift(deviceOccurredAt, serverNow);

  assert.equal(result.isDetected, true);
  assert.equal(result.driftMs, -600000);
  assert.match(result.message, /behind server time/i);
});

test("allows small time skew within the tolerance window", () => {
  const serverNow = new Date("2026-08-29T12:00:00.000Z");
  const deviceOccurredAt = new Date("2026-08-29T11:59:30.000Z");

  const result = detectServerClockDrift(deviceOccurredAt, serverNow);

  assert.equal(result.isDetected, false);
  assert.equal(result.driftMs, -30000);
});
