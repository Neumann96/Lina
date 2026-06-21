import nextEnv from "@next/env";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";

const root = process.cwd();
const { loadEnvConfig } = nextEnv;
loadEnvConfig(root);

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: true } : undefined,
});

try {
  const migrationsDirectory = path.join(root, "db/migrations");
  const migrations = (await readdir(migrationsDirectory))
    .filter((file) => file.endsWith(".sql"))
    .sort();
  for (const migration of migrations) {
    const sql = await readFile(path.join(migrationsDirectory, migration), "utf8");
    await pool.query(sql);
  }
  console.log("PostgreSQL migrations completed");
} finally {
  await pool.end();
}
