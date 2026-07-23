import { createHash, timingSafeEqual } from "node:crypto";

export const TELEGRAM_START_MESSAGE = `Привет! Я Lina ✨

Превращаю списки слов в карточки быстрее, чем вы успеете отложить их до понедельника. Просто вставьте слова и переводы — я всё разберу и подготовлю к практике.

Учить всё ещё придётся вам. Мы проверяли...`;

export const TELEGRAM_MINI_APP_URL = "https://lina-lern.ru";

type TelegramUpdate = {
  message?: {
    chat?: { id?: number };
    text?: string;
  };
};

export function telegramWebhookSecret(botToken: string) {
  return createHash("sha256").update(botToken).digest("hex");
}

export function verifyTelegramWebhookSecret(received: string, botToken: string) {
  const expected = telegramWebhookSecret(botToken);
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);

  return receivedBuffer.length === expectedBuffer.length
    && timingSafeEqual(receivedBuffer, expectedBuffer);
}

export function getStartCommandChatId(update: unknown) {
  if (!update || typeof update !== "object" || Array.isArray(update)) return null;

  const message = (update as TelegramUpdate).message;
  if (!message || typeof message !== "object") return null;

  const chatId = message.chat?.id;
  const text = message.text;
  if (!Number.isSafeInteger(chatId) || typeof text !== "string") return null;
  if (!/^\/start(?:@[A-Za-z0-9_]+)?(?:\s|$)/i.test(text)) return null;

  return chatId as number;
}

export async function sendTelegramStartMessage(botToken: string, chatId: number) {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: TELEGRAM_START_MESSAGE,
      reply_markup: {
        inline_keyboard: [[{
          text: "Ладно, давайте учить →",
          web_app: { url: TELEGRAM_MINI_APP_URL },
        }]],
      },
    }),
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) {
    throw new Error(`Telegram sendMessage failed with status ${response.status}`);
  }
}

export async function sendTelegramReviewReminder(
  botToken: string,
  chatId: number,
  review: { dueCount: number; href: string },
) {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: `Пора повторить ${review.dueCount} карточек. Lina собрала в одну очередь всё, что запланировано на сегодня.`,
      reply_markup: {
        inline_keyboard: [[{
          text: "Повторить сейчас →",
          web_app: { url: `${TELEGRAM_MINI_APP_URL}${review.href}` },
        }]],
      },
    }),
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) {
    throw new Error(`Telegram sendMessage failed with status ${response.status}`);
  }
}
