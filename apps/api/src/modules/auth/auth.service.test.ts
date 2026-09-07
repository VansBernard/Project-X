import test from "node:test";
import assert from "node:assert/strict";
import { authService } from "./auth.service.js";

test("login returns a database unavailable error when Prisma cannot reach the database", async () => {
  try {
    await authService.login(
      {
        dealerSlug: "test-dealer",
        email: "admin@test.com",
        password: "password123"
      },
      {
        ipAddress: "127.0.0.1",
        userAgent: "test"
      }
    );
    assert.fail("Expected login to throw when the database is unavailable");
  } catch (error) {
    assert.ok(error instanceof Error);
    assert.match(error.message, /database/i);
  }
});
