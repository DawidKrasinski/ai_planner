import postgres from "postgres";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const sql = postgres(url, { max: 1 });
const migration = readFileSync(resolve("supabase/migrations/0001_init.sql"), "utf8");

await sql.unsafe(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    id text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  );
`);
const existing = await sql`SELECT id FROM schema_migrations WHERE id = '0001_init'`;
if (existing.length === 0) {
  await sql.unsafe(migration);
  await sql`INSERT INTO schema_migrations (id) VALUES ('0001_init')`;
  console.log("Applied 0001_init");
} else {
  console.log("Migration already applied");
}
await sql.end();
