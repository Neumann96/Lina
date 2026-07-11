import "server-only";

import { createHash } from "node:crypto";
import { query } from "@/lib/db";

type RateLimitOptions = {
  scope:
    | "register-ip"
    | "register-email"
    | "login-ip"
    | "login-email"
    | "telegram-ip"
    | "telegram-user"
    | "sets-user"
    | "reviews-user"
    | "restart-user"
    | "quizlet-user";
  limit: number;
  windowSeconds: number;
};

type RateLimitRow = {
  attempts: number;
  retry_after: number;
};

function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

let nextCleanupAt = 0;

async function cleanupExpiredLimits() {
  const now = Date.now();
  if (now < nextCleanupAt) return;
  nextCleanupAt = now + 60 * 60 * 1000;
  try {
    await query("DELETE FROM auth_rate_limits WHERE window_started_at < NOW() - INTERVAL '2 days'");
  } catch {
    // A cleanup failure must not turn rate limiting into an application outage.
    nextCleanupAt = now + 5 * 60 * 1000;
  }
}

export async function consumeRateLimit(value: string, options: RateLimitOptions) {
  await cleanupExpiredLimits();
  const result = await query<RateLimitRow>(
    `INSERT INTO auth_rate_limits (scope, key_hash, window_started_at, attempts)
     VALUES ($1, $2, NOW(), 1)
     ON CONFLICT (scope, key_hash) DO UPDATE SET
       window_started_at = CASE
         WHEN auth_rate_limits.window_started_at <= NOW() - make_interval(secs => $3::int) THEN NOW()
         ELSE auth_rate_limits.window_started_at
       END,
       attempts = CASE
         WHEN auth_rate_limits.window_started_at <= NOW() - make_interval(secs => $3::int) THEN 1
         ELSE auth_rate_limits.attempts + 1
       END
     RETURNING attempts,
       GREATEST(1, CEIL(EXTRACT(EPOCH FROM (
         window_started_at + make_interval(secs => $3::int) - NOW()
       ))))::int AS retry_after`,
    [options.scope, digest(value), options.windowSeconds],
  );

  const row = result.rows[0];
  return {
    allowed: row.attempts <= options.limit,
    retryAfter: row.retry_after,
  };
}
