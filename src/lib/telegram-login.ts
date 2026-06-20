export function telegramAccountSwitchUrl(botId: string, origin: string, returnTo: string, lang = "ru") {
  const url = new URL("https://oauth.telegram.org/auth/logout");
  url.searchParams.set("bot_id", botId);
  url.searchParams.set("origin", origin);
  url.searchParams.set("return_to", returnTo);
  url.searchParams.set("lang", lang);
  return url.toString();
}
