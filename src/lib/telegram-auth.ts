import "server-only";

import { createRemoteJWKSet, jwtVerify } from "jose";

const TELEGRAM_ISSUER = "https://oauth.telegram.org";
const telegramJwks = createRemoteJWKSet(new URL("https://oauth.telegram.org/.well-known/jwks.json"));

function telegramClientId() {
  const clientId = process.env.TELEGRAM_CLIENT_ID?.trim();
  if (!clientId || !/^\d+$/.test(clientId)) {
    throw new Error("TELEGRAM_CLIENT_ID is not configured");
  }
  return clientId;
}

export function getTelegramClientId() {
  return telegramClientId();
}

export async function verifyTelegramIdToken(idToken: string, expectedNonce: string) {
  const { payload } = await jwtVerify(idToken, telegramJwks, {
    issuer: TELEGRAM_ISSUER,
    audience: telegramClientId(),
    requiredClaims: ["sub", "nonce"],
    maxTokenAge: "5 minutes",
  });

  if (payload.nonce !== expectedNonce || typeof payload.sub !== "string" || !/^\d+$/.test(payload.sub)) {
    throw new Error("Invalid Telegram token claims");
  }

  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const username = typeof payload.preferred_username === "string" ? payload.preferred_username.trim() : "";

  return {
    telegramId: payload.sub,
    name: (name || (username ? `@${username}` : "Пользователь Telegram")).slice(0, 120),
  };
}
