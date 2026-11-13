import { describe, expect, it } from "vitest";
import { redact } from "./log";

describe("logging redaction", () => {
  it("removes secrets before they are written", () => {
    expect(redact({ userId: "abc", apiKey: "sk-test", refreshToken: "tok" })).toEqual({
      userId: "abc",
      apiKey: "[redacted]",
      refreshToken: "[redacted]",
    });
  });
});
