import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import test from "node:test";
import { parseTelegramBotToken, verifyTelegramAuthSignature } from "../src/lib/telegram-auth-signature.ts";
import { parseTelegramAuthResult } from "../src/lib/telegram-auth-result.ts";

const token = "123456789:test_token-for-signature";

function signedPayload(overrides = {}) {
  const payload = {
    id: 987654321,
    first_name: "Лина",
    username: "lina_user",
    auth_date: 1_800_000_000,
    ...overrides,
  };
  const dataCheckString = Object.entries(payload)
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join("\n");
  const secret = createHash("sha256").update(token).digest();
  return {
    ...payload,
    hash: createHmac("sha256", secret).update(dataCheckString).digest("hex"),
  };
}

test("derives the public bot id without exposing the token", () => {
  assert.equal(parseTelegramBotToken(token).botId, "123456789");
});

test("accepts a fresh Telegram payload with a valid signature", () => {
  assert.deepEqual(verifyTelegramAuthSignature(signedPayload(), token, 1_800_000_020), {
    telegramId: "987654321",
    name: "Лина",
  });
});

test("accepts Telegram callback query values serialized as strings", () => {
  const signed = signedPayload();
  assert.deepEqual(verifyTelegramAuthSignature({
    ...signed,
    id: String(signed.id),
    auth_date: String(signed.auth_date),
  }, token, 1_800_000_020), {
    telegramId: "987654321",
    name: "Лина",
  });
});

test("rejects tampered and expired Telegram payloads", () => {
  const signed = signedPayload();
  assert.throws(
    () => verifyTelegramAuthSignature({ ...signed, first_name: "Злоумышленник" }, token, 1_800_000_020),
    /signature/,
  );
  assert.throws(
    () => verifyTelegramAuthSignature(signed, token, 1_800_000_301),
    /Expired/,
  );
});

test("parses the auth result returned by Telegram after a mobile redirect", () => {
  const payload = signedPayload();
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");

  assert.deepEqual(parseTelegramAuthResult(`#tgAuthResult=${encoded}`), payload);
  assert.deepEqual(parseTelegramAuthResult(`#section&tgAuthResult=${encoded}`), payload);
  assert.equal(parseTelegramAuthResult("#tgAuthResult=broken"), null);
  assert.equal(parseTelegramAuthResult("#section"), null);
});
