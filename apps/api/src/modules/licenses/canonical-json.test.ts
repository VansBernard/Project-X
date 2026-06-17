import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canonicalJson } from "./canonical-json.js";

describe("canonicalJson", () => {
  it("sorts object keys recursively", () => {
    const value = {
      z: 1,
      a: {
        c: true,
        b: "second",
        a: "first"
      }
    };

    assert.equal(canonicalJson(value), '{"a":{"a":"first","b":"second","c":true},"z":1}');
  });

  it("preserves array order while canonicalizing array items", () => {
    const value = [
      { b: 2, a: 1 },
      { d: 4, c: 3 }
    ];

    assert.equal(canonicalJson(value), '[{"a":1,"b":2},{"c":3,"d":4}]');
  });

  it("serializes a license payload deterministically regardless of input key order", () => {
    const first = {
      deviceId: "8d3edc34-a003-4f0d-8b8d-fd22f5e34da0",
      contractId: "a0d93293-680a-4f14-9ab6-7e0b3eba86ee",
      issuedAt: "2026-06-16T12:00:00.000Z",
      expiresAt: "2026-07-16T12:00:00.000Z",
      keyId: "default",
      algorithm: "RSA-SHA256"
    };
    const second = {
      algorithm: "RSA-SHA256",
      keyId: "default",
      expiresAt: "2026-07-16T12:00:00.000Z",
      issuedAt: "2026-06-16T12:00:00.000Z",
      contractId: "a0d93293-680a-4f14-9ab6-7e0b3eba86ee",
      deviceId: "8d3edc34-a003-4f0d-8b8d-fd22f5e34da0"
    };

    assert.equal(canonicalJson(first), canonicalJson(second));
  });
});
