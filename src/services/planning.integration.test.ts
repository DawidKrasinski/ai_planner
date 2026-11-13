import postgres from "postgres";
import { afterAll, describe, expect, it } from "vitest";
import { defaultSettings } from "@/domain/defaults";
import { generateWeekPlan } from "@/services/planning";

const databaseUrl = process.env.DATABASE_URL;
const describeDb = databaseUrl ? describe : describe.skip;

describeDb("week plan persistence", () => {
  const userId = crypto.randomUUID();
  const sql = postgres(databaseUrl ?? "", { max: 1 });

  afterAll(async () => {
    await sql`DELETE FROM user_profiles WHERE id = ${userId}`;
    await sql`DELETE FROM auth.users WHERE id = ${userId}`;
    await sql.end();
  });

  it("stores a feasible system plan without an AI provider", async () => {
    await sql`INSERT INTO auth.users (id, email) VALUES (${userId}, ${"plan@example.com"})`;
    await sql`INSERT INTO user_profiles (id, display_name, timezone) VALUES (${userId}, ${"Plan"}, ${"Europe/Warsaw"})`;
    await sql`INSERT INTO user_settings (user_id, settings) VALUES (${userId}, ${sql.json(defaultSettings)})`;
    await sql`INSERT INTO goals (user_id, name, category, manual_priority, difficulty, status) VALUES (${userId}, ${"Angielski"}, ${"learning_work"}, 3, 5, ${"active"})`;
    const result = await generateWeekPlan(userId, {
      anchorDate: "2026-11-16",
      reason: "integration",
      actor: "system",
      source: "system",
    });
    expect(result.planId).toBeTruthy();
    expect(result.summary).toContain("bez modelu AI");
    const plans = await sql<{ status: string }[]>`SELECT status FROM weekly_plans WHERE user_id = ${userId}`;
    expect(plans.some((plan) => plan.status === "active")).toBe(true);
    const blocks = await sql<{ count: string }[]>`SELECT count(*) FROM calendar_items WHERE user_id = ${userId} AND item_type = 'goal_session'`;
    expect(Number(blocks[0]?.count ?? 0)).toBeGreaterThan(0);
  });
});
