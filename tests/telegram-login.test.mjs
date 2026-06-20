import assert from "node:assert/strict";
import test from "node:test";
import { telegramAccountSwitchUrl } from "../src/lib/telegram-login.ts";

test("builds the Telegram account switch URL without redirecting to documentation", () => {
  const result = new URL(telegramAccountSwitchUrl(
    "8856635978",
    "https://lina-lern.ru",
    "https://lina-lern.ru/",
  ));

  assert.equal(result.origin, "https://oauth.telegram.org");
  assert.equal(result.pathname, "/auth/logout");
  assert.equal(result.searchParams.get("bot_id"), "8856635978");
  assert.equal(result.searchParams.get("origin"), "https://lina-lern.ru");
  assert.equal(result.searchParams.get("return_to"), "https://lina-lern.ru/");
  assert.equal(result.searchParams.get("lang"), "ru");
});
