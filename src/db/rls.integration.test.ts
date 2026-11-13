import postgres from "postgres";
import { describe, expect, it } from "vitest";

const databaseUrl = process.env.DATABASE_URL;
const describeDb = databaseUrl ? describe : describe.skip;

describeDb("single-owner database", () => {
  it("stores goals without a user owner column", async () => {
    const sql = postgres(databaseUrl ?? "", { max: 1 });
    const columns = await sql<{ column_name: string }[]>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'goals' AND column_name = 'user_id'
    `;
    expect(columns).toEqual([]);
    const id = crypto.randomUUID();
    await sql`
      INSERT INTO goals (id, name, category, manual_priority, difficulty)
      VALUES (${id}, ${"Bez właściciela"}, ${"training"}, 2, 4)
    `;
    const rows = await sql<{ name: string }[]>`SELECT name FROM goals WHERE id = ${id}`;
    expect(rows.map((row) => row.name)).toEqual(["Bez właściciela"]);
    await sql`DELETE FROM goals WHERE id = ${id}`;
    await sql.end();
  });
});
