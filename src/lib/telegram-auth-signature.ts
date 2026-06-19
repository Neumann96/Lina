import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const AUTH_MAX_AGE_SECONDS = 5 * 60;

export function parseTelegramBotToken(token: string) {
  if (!/^\d+:[A-Za-z0-9_-]+$/.test(token)) {
    throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  }
  return { token, botId: token.split(":", 1)[0] };
}

export function verifyTelegramAuthSignature(
  payload: Record<string, unknown>,
  botToken: string,
  nowSeconds = Math.floor(Date.now() / 1000),
) {
  parseTelegramBotToken(botToken);
  const hash = typeof payload.hash === "string" ? payload.hash.toLowerCase() : "";
  const authDate = typeof payload.auth_date === "number"
    ? payload.auth_date
    : Number(payload.auth_date);
  const telegramId = typeof payload.id === "number" ? String(payload.id) : String(payload.id ?? "");

  if (!/^[a-f0-9]{64}$/.test(hash) || !Number.isInteger(authDate) || !/^\d+$/.test(telegramId)) {
    throw new Error("Invalid Telegram auth payload");
  }
  if (authDate > nowSeconds + 30 || nowSeconds - authDate > AUTH_MAX_AGE_SECONDS) {
    throw new Error("Expired Telegram auth payload");
  }

  const fields = Object.entries(payload)
    .filter(([key]) => key !== "hash")
    .map(([key, value]) => {
      if ((typeof value !== "string" && typeof value !== "number") || key.includes("\n")) {
        throw new Error("Invalid Telegram auth field");
      }
      return `${key}=${String(value)}`;
    })
    .sort()
    .join("\n");
  const secret = createHash("sha256").update(botToken).digest();
  const expected = Buffer.from(createHmac("sha256", secret).update(fields).digest("hex"), "hex");
  const actual = Buffer.from(hash, "hex");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw new Error("Invalid Telegram auth signature");
  }

  const firstName = typeof payload.first_name === "string" ? payload.first_name.trim() : "";
  const lastName = typeof payload.last_name === "string" ? payload.last_name.trim() : "";
  const username = typeof payload.username === "string" ? payload.username.trim() : "";
  const name = [firstName, lastName].filter(Boolean).join(" ") || (username ? `@${username}` : "Пользователь Telegram");

  return { telegramId, name: name.slice(0, 120) };
}
