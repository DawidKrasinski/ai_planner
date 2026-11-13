import postgres from "postgres";
import { afterAll, describe, expect, it } from "vitest";
import { generateWeekPlan } from "@/services/planning";

const databaseUrl = process.env.DATABASE_URL;
const describeDb = databaseUrl ? describe : describe.skip;

describeDb("week plan persistence", () => {
  const sql = postgres(databaseUrl ?? "", { max: 1 });
  let goalId = "";

  afterAll(async () => {
    if (goalId) {
      await sql`DELETE FROM goal_sessions WHERE goal_id = ${goalId}`;
      await sql`DELETE FROM calendar_items WHERE source_goal_id = ${goalId}`;
      await sql`DELETE FROM weekly_goal_budgets WHERE goal_id = ${goalId}`;
      await sql`DELETE FROM goals WHERE id = ${goalId}`;
    }
    await sql`DELETE FROM weekly_plans WHERE generation_reason = 'integration'`;
    await sql.end();
  });

  it("stores a feasible system plan without an AI provider or a login", async () => {
    const inserted = await sql<{ id: string }[]>`
      INSERT INTO goals (name, category, manual_priority, difficulty, status)
      VALUES (${"Angielski"}, ${"learning_work"}, 3, 5, ${"active"})
      RETURNING id
    `;
    goalId = inserted[0]?.id ?? "";
    const result = await generateWeekPlan({
      anchorDate: "2026-11-16",
      reason: "integration",
      actor: "system",
      source: "system",
    });
    expect(result.planId).toBeTruthy();
    expect(result.summary).toContain("bez modelu AI");
    const plans = await sql<{ status: string }[]>`
      SELECT status FROM weekly_plans WHERE generation_reason = 'integration'
    `;
    expect(plans.some((plan) => plan.status === "active")).toBe(true);
    const blocks = await sql<{ count: string }[]>`
      SELECT count(*) FROM calendar_items WHERE source_goal_id = ${goalId} AND item_type = 'goal_session'
    `;
    expect(Number(blocks[0]?.count ?? 0)).toBeGreaterThan(0);
  });
});
