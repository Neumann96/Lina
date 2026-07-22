import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("stores revocable opaque sessions with absolute and idle expiry", async () => {
  const auth = await read("src/lib/auth.ts");
  const migration = await read("db/migrations/005_server_sessions.sql");

  assert.match(auth, /randomBytes\(32\)\.toString\("base64url"\)/);
  assert.match(auth, /INSERT INTO auth_sessions/);
  assert.match(auth, /DELETE FROM auth_sessions WHERE token_hash/);
  assert.match(auth, /SESSION_LIFETIME_SECONDS = 60 \* 60 \* 24 \* 30/);
  assert.match(auth, /SESSION_IDLE_TIMEOUT_SECONDS = 60 \* 60 \* 24 \* 7/);
  assert.match(migration, /token_hash char\(43\) PRIMARY KEY/);
  assert.match(migration, /REFERENCES users\(id\) ON DELETE CASCADE/);
});

test("binds Telegram browser login to a one-time state cookie", async () => {
  const setupRoute = await read("src/app/api/auth/telegram/route.ts");
  const callbackRoute = await read("src/app/api/auth/telegram/callback/route.ts");
  const client = await read("src/components/home-client.tsx");

  assert.match(setupRoute, /lina_telegram_state/);
  assert.match(setupRoute, /httpOnly: true/);
  assert.match(callbackRoute, /statesMatch/);
  assert.match(callbackRoute, /cookieStore\.set\(TELEGRAM_STATE_COOKIE, ""/);
  assert.match(callbackRoute, /maxAge: 0/);
  assert.match(callbackRoute, /url\.searchParams\.delete\("state"\)/);
  assert.match(client, /callbackUrl\.searchParams\.set\("state", setup\.state\)/);
});
