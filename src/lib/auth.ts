import "server-only";

import { createHmac, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { query } from "@/lib/db";
import { cookies } from "next/headers";

const scrypt = promisify(scryptCallback);
const SESSION_COOKIE = "lina_session";
const SESSION_LIFETIME_SECONDS = 60 * 60 * 24 * 30;
const SESSION_IDLE_TIMEOUT_SECONDS = 60 * 60 * 24 * 7;
const SESSION_TOUCH_INTERVAL_MS = 15 * 60 * 1000;
const MAX_SESSIONS_PER_USER = 10;

export type AuthUser = { id: string; email: string | null; name: string };

function displayName(email: string) {
  const localPart = email.split("@")[0].replace(/[._-]+/g, " ").trim();
  return localPart ? localPart.charAt(0).toUpperCase() + localPart.slice(1) : "Пользователь";
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function validateEmail(email: string): string | null {
  if (!email) return "Введите почту";
  if (email.length > 254) return "Почта слишком длинная";
  const parts = email.split("@");
  if (parts.length !== 2) return "Введите почту в формате name@example.com";
  const [local, domain] = parts;
  if (!local || local.length > 64 || local.startsWith(".") || local.endsWith(".") || local.includes("..")) {
    return "Проверьте часть адреса перед @";
  }
  if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(local)) return "В почте есть недопустимые символы";
  if (domain.length < 3 || !domain.includes(".") || domain.includes("..")) return "Укажите полный домен почты";
  const labels = domain.split(".");
  if (labels.some((label) => !label || label.length > 63 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label))) {
    return "Проверьте домен почты";
  }
  if (labels.at(-1)!.length < 2 || /^\d+$/.test(labels.at(-1)!)) return "Проверьте домен почты";
  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) return "Минимум 8 символов";
  if (password.length > 128) return "Максимум 128 символов";
  if (!/[a-zа-яё]/u.test(password)) return "Добавьте строчную букву";
  if (!/[A-ZА-ЯЁ]/u.test(password)) return "Добавьте заглавную букву";
  if (!/\d/.test(password)) return "Добавьте хотя бы одну цифру";
  return null;
}

async function hashPassword(password: string, salt: string) {
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return derived.toString("hex");
}

export async function registerUser(email: string, password: string): Promise<AuthUser | null> {
  const salt = randomBytes(16).toString("hex");
  const passwordHash = await hashPassword(password, salt);
  const result = await query<{ id: string; email: string }>(
    `INSERT INTO users (id, email, password_hash, salt)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO NOTHING
     RETURNING id, email`,
    [randomUUID(), email, passwordHash, salt],
  );
  const user = result.rows[0];
  return user ? { ...user, name: displayName(user.email) } : null;
}

export async function authenticateUser(email: string, password: string): Promise<AuthUser | null> {
  const result = await query<{ id: string; email: string; passwordHash: string; salt: string }>(
    `SELECT id, email, password_hash AS "passwordHash", salt
     FROM users
     WHERE email = $1
     LIMIT 1`,
    [email],
  );
  const user = result.rows[0];
  if (!user) return null;
  const actual = Buffer.from(await hashPassword(password, user.salt), "hex");
  const expected = Buffer.from(user.passwordHash, "hex");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  return { id: user.id, email: user.email, name: displayName(user.email) };
}

export async function authenticateTelegramUser(telegramId: string, name: string): Promise<AuthUser> {
  const result = await query<{ id: string; email: string | null; name: string }>(
    `INSERT INTO users (id, telegram_id, display_name)
     VALUES ($1, $2, $3)
     ON CONFLICT (telegram_id) WHERE telegram_id IS NOT NULL
     DO UPDATE SET display_name = EXCLUDED.display_name
     RETURNING id, email, display_name AS name`,
    [randomUUID(), telegramId, name],
  );
  return result.rows[0];
}

function sessionSecret() {
  const secret = process.env.AUTH_SECRET;
  if (process.env.NODE_ENV === "production" && (!secret || secret.length < 32)) {
    throw new Error("AUTH_SECRET must contain at least 32 characters in production");
  }
  return secret ?? "lina-development-secret-change-in-production";
}

function sessionTokenDigest(value: string) {
  return createHmac("sha256", sessionSecret()).update(value).digest("base64url");
}

function validSessionToken(token?: string): token is string {
  return Boolean(token && /^[A-Za-z0-9_-]{43}$/.test(token));
}

export async function setSession(user: AuthUser) {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = sessionTokenDigest(token);
  await query(
    `INSERT INTO auth_sessions (token_hash, user_id, expires_at)
     VALUES ($1, $2, NOW() + make_interval(secs => $3::int))`,
    [tokenHash, user.id, SESSION_LIFETIME_SECONDS],
  );
  await query(
    `DELETE FROM auth_sessions
     WHERE expires_at <= NOW()
        OR last_seen_at <= NOW() - make_interval(secs => $2::int)
        OR token_hash IN (
          SELECT token_hash
          FROM auth_sessions
          WHERE user_id = $1
          ORDER BY created_at DESC
          OFFSET $3
        )`,
    [user.id, SESSION_IDLE_TIMEOUT_SECONDS, MAX_SESSIONS_PER_USER],
  );

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" || process.env.AUTH_COOKIE_SECURE === "true",
    maxAge: SESSION_LIFETIME_SECONDS,
    path: "/",
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  try {
    if (validSessionToken(token)) {
      await query("DELETE FROM auth_sessions WHERE token_hash = $1", [sessionTokenDigest(token)]);
    }
  } finally {
    cookieStore.delete(SESSION_COOKIE);
  }
}

export async function getCurrentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!validSessionToken(token)) return null;

  const result = await query<{ id: string; email: string | null; name: string | null; lastSeenAt: Date }>(
    `SELECT u.id, u.email, u.display_name AS name, s.last_seen_at AS "lastSeenAt"
     FROM auth_sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1
       AND s.expires_at > NOW()
       AND s.last_seen_at > NOW() - make_interval(secs => $2::int)
     LIMIT 1`,
    [sessionTokenDigest(token), SESSION_IDLE_TIMEOUT_SECONDS],
  );
  const session = result.rows[0];
  if (!session) return null;

  if (Date.now() - session.lastSeenAt.getTime() >= SESSION_TOUCH_INTERVAL_MS) {
    await query(
      `UPDATE auth_sessions
       SET last_seen_at = NOW()
       WHERE token_hash = $1 AND last_seen_at = $2`,
      [sessionTokenDigest(token), session.lastSeenAt],
    );
  }

  const name = session.name?.trim() || (session.email ? displayName(session.email) : "Пользователь");
  return { id: session.id, email: session.email, name };
}
