import { loadEnvConfig } from "@next/env";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";

const root = process.cwd();
loadEnvConfig(root);

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: true } : undefined,
});

try {
  const sql = await readFile(path.join(root, "db/migrations/001_auth.sql"), "utf8");
  await pool.query(sql);
  console.log("PostgreSQL migrations completed");
} finally {
  await pool.end();
}
