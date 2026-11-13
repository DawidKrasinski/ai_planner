import { describe, expect, it } from "vitest";
import { isAiConfigured, parseServerEnv } from "./env";

describe("environment schema", () => {
  it("rejects an invalid allowlist email", () => {
    expect(() => parseServerEnv({ ALLOWED_EMAIL: "not-an-email", AI_PROVIDER: "mock" })).toThrow(
      /środowiska/,
    );
  });

  it("accepts a local configuration without optional providers", () => {
    const env = parseServerEnv({
      ALLOWED_EMAIL: "person@example.com",
      AI_PROVIDER: "mock",
      DATABASE_URL: "postgres://planner:planner@127.0.0.1:54329/planner",
    });
    expect(env.ALLOWED_EMAIL).toBe("person@example.com");
    expect(isAiConfigured(env)).toBe(true);
  });

  it("treats a selected provider without a key as unavailable", () => {
    const env = parseServerEnv({ AI_PROVIDER: "openai" });
    expect(isAiConfigured(env)).toBe(false);
  });
});
