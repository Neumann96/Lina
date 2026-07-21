import "server-only";

import { Pool, type PoolClient, type QueryResultRow } from "pg";

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

export async function withTransaction<T>(callback: (client: PoolClient) => Promise<T>) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function withAdvisoryLock<T>(
  name: string,
  callback: () => Promise<T>,
): Promise<{ acquired: true; value: T } | { acquired: false }> {
  const client = await getPool().connect();
  let acquired = false;
  try {
    const lockResult = await client.query<{ acquired: boolean }>(
      "SELECT pg_try_advisory_lock(hashtextextended($1, 0)) AS acquired",
      [name],
    );
    acquired = lockResult.rows[0]?.acquired === true;
    if (!acquired) return { acquired: false };
    return { acquired: true, value: await callback() };
  } finally {
    if (acquired) {
      await client.query("SELECT pg_advisory_unlock(hashtextextended($1, 0))", [name]);
    }
    client.release();
  }
}
