import { describe, expect, it } from "vitest";
import { isAiConfigured, parseServerEnv } from "./env";

describe("environment schema", () => {
  it("accepts a local configuration without login or optional providers", () => {
    const env = parseServerEnv({
      AI_PROVIDER: "mock",
      DATABASE_URL: "postgres://planner:planner@127.0.0.1:54329/planner",
    });
    expect(env.DATABASE_URL).toContain("54329");
    expect(env.AI_PROVIDER).toBe("mock");
    expect(isAiConfigured(env)).toBe(true);
    expect(env).not.toHaveProperty("ALLOWED_EMAIL");
  });

  it("treats a selected provider without a key as unavailable", () => {
    const env = parseServerEnv({ AI_PROVIDER: "openai" });
    expect(isAiConfigured(env)).toBe(false);
  });
});
