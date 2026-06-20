import "server-only";

import { parseTelegramBotToken, verifyTelegramAuthSignature } from "@/lib/telegram-auth-signature";

function telegramBotToken() {
  return parseTelegramBotToken(process.env.TELEGRAM_BOT_TOKEN?.trim() ?? "");
}

let botUsernameRequest: Promise<string> | null = null;

async function requestTelegramBotUsername() {
  const { token } = telegramBotToken();
  const response = await fetch(`https://api.telegram.org/bot${token}/getMe`, {
    cache: "no-store",
    signal: AbortSignal.timeout(5_000),
  });
  const body = await response.json() as {
    ok?: boolean;
    result?: { username?: string };
  };
  const username = body.ok ? body.result?.username?.trim().replace(/^@/, "") : "";
  if (!username || !/^[A-Za-z0-9_]{5,32}$/.test(username)) {
    throw new Error("Telegram bot username is unavailable");
  }
  return username;
}

export function getTelegramBotId() {
  return telegramBotToken().botId;
}

export async function getTelegramBotUsername() {
  botUsernameRequest ??= requestTelegramBotUsername();
  try {
    return await botUsernameRequest;
  } catch (error) {
    botUsernameRequest = null;
    throw error;
  }
}

export function verifyTelegramAuthPayload(payload: Record<string, unknown>) {
  return verifyTelegramAuthSignature(payload, telegramBotToken().token);
}
