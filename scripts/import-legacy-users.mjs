import nextEnv from "@next/env";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";

const root = process.cwd();
const { loadEnvConfig } = nextEnv;
loadEnvConfig(root);

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

const source = path.resolve(process.argv[2] ?? path.join(root, "data/users.json"));
const users = JSON.parse(await readFile(source, "utf8"));
if (!Array.isArray(users)) throw new Error("Legacy users file must contain an array");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: true } : undefined,
});
const client = await pool.connect();
let imported = 0;

try {
  await client.query("BEGIN");
  for (const user of users) {
    if (
      !user || typeof user !== "object"
      || typeof user.id !== "string"
      || typeof user.email !== "string"
      || typeof user.passwordHash !== "string"
      || typeof user.salt !== "string"
      || typeof user.createdAt !== "string"
    ) {
      throw new Error("Legacy users file contains an invalid record");
    }

    const result = await client.query(
      `INSERT INTO users (id, email, password_hash, salt, created_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO NOTHING`,
      [user.id, user.email.trim().toLowerCase(), user.passwordHash, user.salt, user.createdAt],
    );
    imported += result.rowCount ?? 0;
  }
  await client.query("COMMIT");
  console.log(`Legacy user import completed: ${imported} added, ${users.length - imported} already present`);
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
