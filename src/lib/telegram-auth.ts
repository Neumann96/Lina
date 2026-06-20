import "server-only";

import { parseTelegramBotToken, verifyTelegramAuthSignature } from "@/lib/telegram-auth-signature";
import { verifyTelegramMiniAppSignature } from "@/lib/telegram-mini-app-signature";

function telegramBotToken() {
  return parseTelegramBotToken(process.env.TELEGRAM_BOT_TOKEN?.trim() ?? "");
}

export function getTelegramBotUsername() {
  const username = process.env.TELEGRAM_BOT_USERNAME?.trim().replace(/^@/, "") ?? "";
  if (!username || !/^[A-Za-z0-9_]{5,32}$/.test(username)) {
    throw new Error("TELEGRAM_BOT_USERNAME is not configured");
  }
  return username;
}

export function getTelegramBotId() {
  return telegramBotToken().botId;
}

export function verifyTelegramAuthPayload(payload: Record<string, unknown>) {
  return verifyTelegramAuthSignature(payload, telegramBotToken().token);
}

export function verifyTelegramMiniAppData(initData: string) {
  return verifyTelegramMiniAppSignature(initData, telegramBotToken().token);
}
