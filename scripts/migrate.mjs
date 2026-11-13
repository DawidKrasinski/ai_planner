import postgres from "postgres";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const sql = postgres(url, { max: 1 });
await sql.unsafe(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    id text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  );
`);

const directory = resolve("supabase/migrations");
const files = readdirSync(directory).filter((file) => file.endsWith(".sql")).sort();
for (const file of files) {
  const id = file.replace(/\.sql$/, "");
  const existing = await sql`SELECT id FROM schema_migrations WHERE id = ${id}`;
  if (existing.length > 0) {
    console.log(`Migration already applied: ${id}`);
    continue;
  }
  await sql.unsafe(readFileSync(resolve(directory, file), "utf8"));
  await sql`INSERT INTO schema_migrations (id) VALUES (${id})`;
  console.log(`Applied ${id}`);
}

await sql.end();
