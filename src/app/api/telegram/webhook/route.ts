import {
  getStartCommandChatId,
  sendTelegramStartMessage,
  verifyTelegramWebhookSecret,
} from "@/lib/telegram-bot";

export async function POST(request: Request) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim() ?? "";
  const webhookSecret = request.headers.get("x-telegram-bot-api-secret-token") ?? "";

  if (!botToken || !verifyTelegramWebhookSecret(webhookSecret, botToken)) {
    return new Response("Unauthorized", { status: 401 });
  }

  let update: unknown;
  try {
    update = await request.json();
  } catch {
    return new Response("Invalid update", { status: 400 });
  }

  const chatId = getStartCommandChatId(update);
  if (chatId === null) return new Response("OK");

  try {
    await sendTelegramStartMessage(botToken, chatId);
  } catch {
    return new Response("Telegram API error", { status: 502 });
  }

  return new Response("OK");
}
