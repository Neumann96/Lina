import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("rate limits authenticated write-heavy endpoints", async () => {
  const routes = await Promise.all([
    read("src/app/api/sets/route.ts"),
    read("src/app/api/reviews/route.ts"),
    read("src/app/api/sets/[setId]/restart/route.ts"),
    read("src/app/api/imports/quizlet/route.ts"),
  ]);

  for (const source of routes) {
    assert.match(source, /consumeRateLimit\(user\.id/);
    assert.match(source, /rateLimitResponse/);
  }
});

test("bounds import concurrency and per-user storage", async () => {
  const importRoute = await read("src/app/api/imports/quizlet/route.ts");
  const learning = await read("src/lib/learning.ts");
  const limiter = await read("src/lib/rate-limit.ts");

  assert.match(importRoute, /MAX_ACTIVE_IMPORTS = 4/);
  assert.match(importRoute, /finally\s*{\s*activeImports -= 1/);
  assert.match(learning, /MAX_STUDY_SETS_PER_USER = 200/);
  assert.match(learning, /MAX_CARDS_PER_USER = 50_000/);
  assert.match(learning, /pg_advisory_xact_lock\(hashtextextended\(\$2::uuid::text, 0\)\)/);
  assert.doesNotMatch(learning, /hashtextextended\(\$2::text/);
  assert.match(limiter, /DELETE FROM auth_rate_limits/);
});
