import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "./crypto";

describe("token encryption", () => {
  it("round-trips a refresh token without storing it in plaintext", () => {
    const key = Buffer.alloc(32, 7).toString("base64");
    const encrypted = encryptSecret("refresh-token", key);
    expect(encrypted).not.toContain("refresh-token");
    expect(decryptSecret(encrypted, key)).toBe("refresh-token");
  });
});
