import "server-only";

import { Pool, type QueryResultRow } from "pg";

declare global {
  var linaPostgresPool: Pool | undefined;
}

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }

  return new Pool({
    connectionString,
    max: Number(process.env.DATABASE_POOL_SIZE ?? 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: true } : undefined,
  });
}

function getPool() {
  if (process.env.NODE_ENV === "development") {
    globalThis.linaPostgresPool ??= createPool();
    return globalThis.linaPostgresPool;
  }

  globalThis.linaPostgresPool ??= createPool();
  return globalThis.linaPostgresPool;
}

export function query<T extends QueryResultRow>(text: string, values: readonly unknown[] = []) {
  return getPool().query<T>(text, [...values]);
}
