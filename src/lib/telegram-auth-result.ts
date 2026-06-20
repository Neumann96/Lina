export type TelegramAuthResult = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
};

const TELEGRAM_AUTH_RESULT = /(?:^|&)tgAuthResult=([A-Za-z0-9_=-]+)(?:&|$)/;

export function parseTelegramAuthResult(hash: string): TelegramAuthResult | null {
  const match = hash.replace(/^#/, "").match(TELEGRAM_AUTH_RESULT);
  if (!match) return null;

  try {
    const encoded = match[1].replace(/-/g, "+").replace(/_/g, "/");
    const padding = encoded.length % 4;
    const binary = atob(encoded + (padding ? "=".repeat(4 - padding) : ""));
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const decoded = JSON.parse(new TextDecoder().decode(bytes)) as unknown;
    if (!decoded || typeof decoded !== "object" || Array.isArray(decoded)) return null;

    const result = decoded as Record<string, unknown>;
    if (
      typeof result.id !== "number"
      || typeof result.first_name !== "string"
      || typeof result.auth_date !== "number"
      || typeof result.hash !== "string"
    ) return null;

    return result as TelegramAuthResult;
  } catch {
    return null;
  }
}
