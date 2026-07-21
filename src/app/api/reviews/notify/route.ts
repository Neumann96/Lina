import { timingSafeEqual } from "node:crypto";
import { withAdvisoryLock } from "@/lib/db";
import {
  getDueReviewUsers,
  markDueReviewReminderAttempted,
  markDueReviewReminderSent,
} from "@/lib/learning";
import { sendTelegramReviewReminder } from "@/lib/telegram-bot";

function matchesSecret(received: string, expected: string) {
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  return receivedBuffer.length === expectedBuffer.length
    && timingSafeEqual(receivedBuffer, expectedBuffer);
}

export async function POST(request: Request) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim() ?? "";
  const reminderSecret = process.env.REVIEW_REMINDER_SECRET?.trim() ?? "";
  const receivedSecret = request.headers.get("x-lina-reminder-secret") ?? "";

  if (!botToken || !reminderSecret) {
    return Response.json({ error: "Review reminders are not configured" }, { status: 503 });
  }

  if (!matchesSecret(receivedSecret, reminderSecret)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dispatch = await withAdvisoryLock("lina-review-reminder-dispatch", async () => {
    const dueUsers = await getDueReviewUsers(100);
    let sent = 0;
    let failed = 0;

    const batchSize = 5;
    for (let index = 0; index < dueUsers.length; index += batchSize) {
      const batch = dueUsers.slice(index, index + batchSize);
      await Promise.all(batch.map(async (user) => {
        await markDueReviewReminderAttempted(user.userId);
        const chatId = Number(user.telegramId);
        if (!Number.isSafeInteger(chatId)) {
          failed += 1;
          return;
        }

        try {
          await sendTelegramReviewReminder(botToken, chatId, user.dueCount);
          await markDueReviewReminderSent(user.userId);
          sent += 1;
        } catch {
          failed += 1;
        }
      }));
    }

    return { checked: dueUsers.length, sent, failed };
  });

  return dispatch.acquired
    ? Response.json(dispatch.value)
    : Response.json({ checked: 0, sent: 0, failed: 0, skipped: "dispatch_in_progress" });
}
