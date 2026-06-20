import { createHmac, timingSafeEqual } from "node:crypto";

const MINI_APP_MAX_AGE_SECONDS = 15 * 60;

export function verifyTelegramMiniAppSignature(
  initData: string,
  botToken: string,
  nowSeconds = Math.floor(Date.now() / 1000),
) {
  if (!initData || initData.length > 16_384) {
    throw new Error("Invalid Telegram Mini App data");
  }

  const params = new URLSearchParams(initData);
  const hash = params.get("hash")?.toLowerCase() ?? "";
  if (!/^[a-f0-9]{64}$/.test(hash)) {
    throw new Error("Invalid Telegram Mini App hash");
  }

  const seen = new Set<string>();
  const fields: Array<[string, string]> = [];
  for (const [key, value] of params.entries()) {
    if (key === "hash") continue;
    if (seen.has(key) || key.includes("\n")) {
      throw new Error("Invalid Telegram Mini App field");
    }
    seen.add(key);
    fields.push([key, value]);
  }
  const dataCheckString = fields
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  const expected = createHmac("sha256", secret).update(dataCheckString).digest();
  const actual = Buffer.from(hash, "hex");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw new Error("Invalid Telegram Mini App signature");
  }

  const authDate = Number(params.get("auth_date"));
  if (!Number.isInteger(authDate) || authDate > nowSeconds + 30 || nowSeconds - authDate > MINI_APP_MAX_AGE_SECONDS) {
    throw new Error("Expired Telegram Mini App data");
  }

  let user: Record<string, unknown>;
  try {
    user = JSON.parse(params.get("user") ?? "") as Record<string, unknown>;
  } catch {
    throw new Error("Invalid Telegram Mini App user");
  }
  const telegramId = typeof user.id === "number" ? String(user.id) : String(user.id ?? "");
  if (!/^\d+$/.test(telegramId)) {
    throw new Error("Invalid Telegram Mini App user id");
  }

  const firstName = typeof user.first_name === "string" ? user.first_name.trim() : "";
  const lastName = typeof user.last_name === "string" ? user.last_name.trim() : "";
  const username = typeof user.username === "string" ? user.username.trim() : "";
  const name = [firstName, lastName].filter(Boolean).join(" ") || (username ? `@${username}` : "Пользователь Telegram");

  return { telegramId, name: name.slice(0, 120) };
}
