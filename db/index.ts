import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

let sqlClient: ReturnType<typeof neon> | null = null;

export function getSql() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured.");
  }

  sqlClient ??= neon(databaseUrl);
  return sqlClient;
}

function createDb() {
  return drizzle(getSql(), { schema });
}

let database: ReturnType<typeof createDb> | null = null;

export function getDb() {
  database ??= createDb();
  return database;
}
