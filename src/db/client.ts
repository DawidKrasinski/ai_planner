import "server-only";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { AppError } from "@/lib/errors";
import * as schema from "./schema";

type Database = PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as { plannerSql?: ReturnType<typeof postgres> };

export function getDb(): Database | null {
  const url = process.env.DATABASE_URL;
  if (!url) {
    return null;
  }
  if (!globalForDb.plannerSql) {
    globalForDb.plannerSql = postgres(url, { max: 5 });
  }
  return drizzle(globalForDb.plannerSql, { schema });
}

export function requireDb(): Database {
  const db = getDb();
  if (!db) {
    throw new AppError(
      "INTERNAL_ERROR",
      "Baza danych nie jest skonfigurowana. Uzupełnij DATABASE_URL.",
      503,
    );
  }
  return db;
}

export type { Database };
