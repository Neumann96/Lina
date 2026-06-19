import "server-only";

import { parseTelegramBotToken, verifyTelegramAuthSignature } from "@/lib/telegram-auth-signature";

function telegramBotToken() {
  return parseTelegramBotToken(process.env.TELEGRAM_BOT_TOKEN?.trim() ?? "");
}

export function getTelegramBotId() {
  return telegramBotToken().botId;
}

export function verifyTelegramAuthPayload(payload: Record<string, unknown>) {
  return verifyTelegramAuthSignature(payload, telegramBotToken().token);
}
