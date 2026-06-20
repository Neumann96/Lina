import assert from "node:assert/strict";
import test from "node:test";

import {
  getStartCommandChatId,
  TELEGRAM_START_MESSAGE,
  telegramWebhookSecret,
  verifyTelegramWebhookSecret,
} from "../src/lib/telegram-bot.ts";

test("uses the requested /start greeting", () => {
  assert.equal(TELEGRAM_START_MESSAGE, `Привет! Я Lina ✨
Превращаю списки слов в карточки быстрее, чем вы успеете решить, что начнёте учить их с понедельника.
Вставляйте слова и переводы — я всё разберу и подготовлю к практике.
Ну что, спасаем первый список?`);
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
