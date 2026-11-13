import postgres from "postgres";
import { describe, expect, it } from "vitest";

const databaseUrl = process.env.DATABASE_URL;
const describeDb = databaseUrl ? describe : describe.skip;

describeDb("row level security", () => {
  it("hides another user's goals from the authenticated role", async () => {
    const sql = postgres(databaseUrl ?? "", { max: 1 });
    const first = crypto.randomUUID();
    const second = crypto.randomUUID();
    await sql`INSERT INTO auth.users (id, email) VALUES (${first}, ${"a@example.com"}), (${second}, ${"b@example.com"})`;
    await sql`INSERT INTO user_profiles (id, display_name) VALUES (${first}, ${"A"}), (${second}, ${"B"})`;
    await sql`INSERT INTO goals (user_id, name, category, manual_priority, difficulty) VALUES (${first}, ${"A goal"}, ${"training"}, 2, 4), (${second}, ${"B goal"}, ${"leisure"}, 3, 5)`;
    await sql.begin(async (tx) => {
      await tx.unsafe("SET LOCAL ROLE authenticated");
      await tx`SELECT set_config('request.jwt.claim.sub', ${first}, true)`;
      const rows = await tx<{ name: string }[]>`SELECT name FROM goals ORDER BY name`;
      expect(rows.map((row) => row.name)).toEqual(["A goal"]);
    });
    await sql`DELETE FROM user_profiles WHERE id IN (${first}, ${second})`;
    await sql`DELETE FROM auth.users WHERE id IN (${first}, ${second})`;
    await sql.end();
  });
});
