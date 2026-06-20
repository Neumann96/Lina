import assert from "node:assert/strict";
import test from "node:test";

import {
  getStartCommandChatId,
  sendTelegramStartMessage,
  TELEGRAM_MINI_APP_URL,
  TELEGRAM_START_MESSAGE,
  telegramWebhookSecret,
  verifyTelegramWebhookSecret,
} from "../src/lib/telegram-bot.ts";

test("uses the requested /start greeting", () => {
  assert.equal(TELEGRAM_START_MESSAGE, `Привет! Я Lina ✨

Превращаю списки слов в карточки быстрее, чем вы успеете отложить их до понедельника. Просто вставьте слова и переводы — я всё разберу и подготовлю к практике.

Учить всё ещё придётся вам. Мы проверяли...`);
  assert.equal(TELEGRAM_MINI_APP_URL, "https://lina-lern.ru");
});

test("sends an inline button that opens the Mini App", async () => {
  const originalFetch = globalThis.fetch;
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return new Response("OK");
  };

  try {
    await sendTelegramStartMessage("123:token", 42);
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(request.url, "https://api.telegram.org/bot123:token/sendMessage");
  assert.deepEqual(JSON.parse(request.options.body), {
    chat_id: 42,
    text: TELEGRAM_START_MESSAGE,
    reply_markup: {
      inline_keyboard: [[{
        text: "Ладно, давайте учить →",
        web_app: { url: TELEGRAM_MINI_APP_URL },
      }]],
    },
  });
});

test("recognizes ordinary, addressed, and deep-link /start commands", () => {
  assert.equal(getStartCommandChatId({ message: { chat: { id: 42 }, text: "/start" } }), 42);
  assert.equal(getStartCommandChatId({ message: { chat: { id: -42 }, text: "/start@linalernbot" } }), -42);
  assert.equal(getStartCommandChatId({ message: { chat: { id: 42 }, text: "/start campaign" } }), 42);
});

test("ignores unrelated or malformed Telegram updates", () => {
  assert.equal(getStartCommandChatId({ message: { chat: { id: 42 }, text: "/help" } }), null);
  assert.equal(getStartCommandChatId({ message: { chat: {}, text: "/start" } }), null);
  assert.equal(getStartCommandChatId(null), null);
});

test("verifies the webhook secret derived from the bot token", () => {
  const token = "123456:secret-token";
  const secret = telegramWebhookSecret(token);

  assert.equal(secret.length, 64);
  assert.equal(verifyTelegramWebhookSecret(secret, token), true);
  assert.equal(verifyTelegramWebhookSecret("wrong", token), false);
});
