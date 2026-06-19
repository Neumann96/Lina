import "server-only";

import { createHmac, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { cookies } from "next/headers";

const scrypt = promisify(scryptCallback);
const SESSION_COOKIE = "lina_session";
const SESSION_LIFETIME_SECONDS = 60 * 60 * 24 * 30;

type StoredUser = {
  id: string;
  email: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
};

export type AuthUser = { id: string; email: string; name: string };

const dataDirectory = process.env.LINA_DATA_DIR ?? path.join(process.cwd(), "data");
const usersFile = path.join(dataDirectory, "users.json");
let writeQueue = Promise.resolve();

function displayName(email: string) {
  const localPart = email.split("@")[0].replace(/[._-]+/g, " ").trim();
  return localPart ? localPart.charAt(0).toUpperCase() + localPart.slice(1) : "Пользователь";
}

async function readUsers(): Promise<StoredUser[]> {
  try {
    return JSON.parse(await readFile(usersFile, "utf8")) as StoredUser[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function updateUsers<T>(operation: (users: StoredUser[]) => Promise<T> | T): Promise<T> {
  let result!: T;
  const run = writeQueue.then(async () => {
    await mkdir(dataDirectory, { recursive: true });
    const users = await readUsers();
    result = await operation(users);
    const temporaryFile = `${usersFile}.${randomUUID()}.tmp`;
    await writeFile(temporaryFile, JSON.stringify(users, null, 2), { encoding: "utf8", mode: 0o600 });
    await rename(temporaryFile, usersFile);
  });
  writeQueue = run.catch(() => undefined);
  await run;
  return result;
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
  return updateUsers(async (users) => {
    if (users.some((user) => user.email === email)) return null;
    const salt = randomBytes(16).toString("hex");
    const user: StoredUser = {
      id: randomUUID(),
      email,
      salt,
      passwordHash: await hashPassword(password, salt),
      createdAt: new Date().toISOString(),
    };
    users.push(user);
    return { id: user.id, email: user.email, name: displayName(user.email) };
  });
}

export async function authenticateUser(email: string, password: string): Promise<AuthUser | null> {
  const user = (await readUsers()).find((candidate) => candidate.email === email);
  if (!user) return null;
  const actual = Buffer.from(await hashPassword(password, user.salt), "hex");
  const expected = Buffer.from(user.passwordHash, "hex");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  return { id: user.id, email: user.email, name: displayName(user.email) };
}

function sessionSecret() {
  return process.env.AUTH_SECRET ?? "lina-development-secret-change-in-production";
}

function sign(value: string) {
  return createHmac("sha256", sessionSecret()).update(value).digest("base64url");
}

function createSessionToken(user: AuthUser) {
  const payload = Buffer.from(JSON.stringify({ ...user, expiresAt: Date.now() + SESSION_LIFETIME_SECONDS * 1000 })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function readSessionToken(token?: string): AuthUser | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const actual = Buffer.from(signature);
  const expected = Buffer.from(sign(payload));
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as AuthUser & { expiresAt: number };
    if (!session.id || !session.email || session.expiresAt < Date.now()) return null;
    return { id: session.id, email: session.email, name: session.name };
  } catch {
    return null;
  }
}

export async function setSession(user: AuthUser) {
  (await cookies()).set(SESSION_COOKIE, createSessionToken(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.AUTH_COOKIE_SECURE === "true",
    maxAge: SESSION_LIFETIME_SECONDS,
    path: "/",
  });
}

export async function clearSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function getCurrentUser() {
  return readSessionToken((await cookies()).get(SESSION_COOKIE)?.value);
}
