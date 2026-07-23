import "server-only";

import { query } from "@/lib/db";
import type { StudySet } from "@/lib/learning";

export type ReviewScopeKind = "day" | "set" | "folder";

export type ReviewGroupSummary = {
  scopeKind: ReviewScopeKind;
  scopeId: string;
  title: string;
  dueCount: number;
  href: string;
};

export type DueReviewNotification = {
  userId: string;
  telegramId: string;
  dueCount: number;
  href: string;
};

type DailyReviewRow = {
  reviewDate: string;
  dueCount: string;
};

const DAILY_REVIEW_HREF = "/study/reviews";
const REVIEW_DAY_END_SQL = `
  (((NOW() AT TIME ZONE 'Europe/Moscow')::date + INTERVAL '1 day')
    AT TIME ZONE 'Europe/Moscow')
`;
const NEEDS_REMINDER_SQL = `
  (
    sr.reminder_sent_at IS NULL
    OR sr.reminder_sent_at <
      (date_trunc('day', sr.due_at AT TIME ZONE 'Europe/Moscow')
        AT TIME ZONE 'Europe/Moscow')
  )
`;

export async function getDueReviewGroups(userId: string): Promise<ReviewGroupSummary[]> {
  const result = await query<DailyReviewRow>(
    `SELECT
       (NOW() AT TIME ZONE 'Europe/Moscow')::date::text AS "reviewDate",
       COUNT(sr.card_id) AS "dueCount"
     FROM card_spaced_repetitions sr
     JOIN cards c ON c.id = sr.card_id
     JOIN study_sets s ON s.id = c.set_id AND s.user_id = sr.user_id
     WHERE sr.user_id = $1
       AND sr.due_at < ${REVIEW_DAY_END_SQL}
     HAVING COUNT(sr.card_id) > 0`,
    [userId],
  );
  const dailyReview = result.rows[0];
  if (!dailyReview) return [];

  return [{
    scopeKind: "day",
    scopeId: dailyReview.reviewDate,
    title: "Повторение на сегодня",
    dueCount: Number(dailyReview.dueCount),
    href: DAILY_REVIEW_HREF,
  }];
}

export async function getDueReviewStudySet(userId: string): Promise<StudySet> {
  const cardsResult = await query<{ cardId: string; term: string; definition: string }>(
    `SELECT c.id AS "cardId", c.term, c.definition
     FROM card_spaced_repetitions sr
     JOIN cards c ON c.id = sr.card_id
     JOIN study_sets s ON s.id = c.set_id AND s.user_id = sr.user_id
     WHERE sr.user_id = $1
       AND sr.due_at < ${REVIEW_DAY_END_SQL}
     ORDER BY sr.due_at ASC, sr.updated_at ASC`,
    [userId],
  );

  return {
    id: "reviews:today",
    title: "Повторение на сегодня",
    startIndex: 0,
    mode: "reviews",
    cards: cardsResult.rows.map((row) => ({
      id: row.cardId,
      term: row.term,
      definition: row.definition,
    })),
  };
}

export async function getDueReviewNotifications(limit = 100): Promise<DueReviewNotification[]> {
  const result = await query<{ userId: string; telegramId: string; dueCount: string }>(
    `WITH pending_daily_reviews AS (
       SELECT
         u.id AS "userId",
         u.telegram_id AS "telegramId",
         sr.card_id AS "cardId",
         sr.due_at AS "dueAt",
         sr.reminder_attempted_at AS "reminderAttemptedAt"
       FROM users u
       JOIN card_spaced_repetitions sr ON sr.user_id = u.id
       WHERE u.telegram_id IS NOT NULL
         AND sr.due_at < ${REVIEW_DAY_END_SQL}
         AND ${NEEDS_REMINDER_SQL}
     )
     SELECT
       "userId",
       "telegramId",
       COUNT("cardId") AS "dueCount"
     FROM pending_daily_reviews
     GROUP BY "userId", "telegramId"
     HAVING MAX("reminderAttemptedAt") IS NULL
         OR MAX("reminderAttemptedAt") < NOW() - INTERVAL '1 hour'
     ORDER BY MIN("dueAt") ASC
     LIMIT $1`,
    [limit],
  );

  return result.rows.map((row) => ({
    userId: row.userId,
    telegramId: row.telegramId,
    dueCount: Number(row.dueCount),
    href: DAILY_REVIEW_HREF,
  }));
}

async function markDueReviewReminder(
  userId: string,
  field: "reminder_attempted_at" | "reminder_sent_at",
) {
  await query(
    `UPDATE card_spaced_repetitions sr
     SET ${field} = NOW(), updated_at = NOW()
     WHERE sr.user_id = $1
       AND sr.due_at < ${REVIEW_DAY_END_SQL}
       AND ${NEEDS_REMINDER_SQL}`,
    [userId],
  );
}

export function markDueReviewReminderAttempted(userId: string) {
  return markDueReviewReminder(userId, "reminder_attempted_at");
}

export function markDueReviewReminderSent(userId: string) {
  return markDueReviewReminder(userId, "reminder_sent_at");
}
