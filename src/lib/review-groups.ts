import "server-only";

import { query } from "@/lib/db";
import type { StudySet } from "@/lib/learning";

export type ReviewScopeKind = "set" | "folder";

export type ReviewGroupSummary = {
  scopeKind: ReviewScopeKind;
  scopeId: string;
  title: string;
  dueCount: number;
  href: string;
};

export type DueReviewNotification = ReviewGroupSummary & {
  userId: string;
  telegramId: string;
};

type ReviewGroupRow = {
  scopeKind: ReviewScopeKind;
  scopeId: string;
  title: string;
  dueCount: string;
};

export function reviewGroupHref(scopeKind: ReviewScopeKind, scopeId: string) {
  return `/study/reviews/${scopeKind}/${scopeId}`;
}

function toReviewGroup(row: ReviewGroupRow): ReviewGroupSummary {
  return {
    scopeKind: row.scopeKind,
    scopeId: row.scopeId,
    title: row.title,
    dueCount: Number(row.dueCount),
    href: reviewGroupHref(row.scopeKind, row.scopeId),
  };
}

export async function getDueReviewGroups(userId: string): Promise<ReviewGroupSummary[]> {
  const result = await query<ReviewGroupRow>(
    `SELECT
       CASE WHEN s.folder_id IS NULL THEN 'set' ELSE 'folder' END AS "scopeKind",
       COALESCE(s.folder_id, s.id)::text AS "scopeId",
       COALESCE(f.name, s.title) AS title,
       COUNT(sr.card_id) AS "dueCount"
     FROM card_spaced_repetitions sr
     JOIN cards c ON c.id = sr.card_id
     JOIN study_sets s ON s.id = c.set_id AND s.user_id = sr.user_id
     LEFT JOIN study_folders f ON f.id = s.folder_id AND f.user_id = s.user_id
     WHERE sr.user_id = $1 AND sr.due_at <= NOW()
     GROUP BY
       CASE WHEN s.folder_id IS NULL THEN 'set' ELSE 'folder' END,
       COALESCE(s.folder_id, s.id),
       COALESCE(f.name, s.title)
     ORDER BY MIN(sr.due_at) ASC, COALESCE(f.name, s.title) ASC`,
    [userId],
  );

  return result.rows.map(toReviewGroup);
}

export async function getDueReviewStudySet(
  userId: string,
  scopeKind: ReviewScopeKind,
  scopeId: string,
): Promise<StudySet | null> {
  const scopeResult = scopeKind === "folder"
    ? await query<{ title: string }>(
      `SELECT name AS title
       FROM study_folders
       WHERE id = $1 AND user_id = $2`,
      [scopeId, userId],
    )
    : await query<{ title: string }>(
      `SELECT title
       FROM study_sets
       WHERE id = $1 AND user_id = $2 AND folder_id IS NULL`,
      [scopeId, userId],
    );
  const scope = scopeResult.rows[0];
  if (!scope) return null;

  const cardsResult = await query<{ cardId: string; term: string; definition: string }>(
    `SELECT c.id AS "cardId", c.term, c.definition
     FROM card_spaced_repetitions sr
     JOIN cards c ON c.id = sr.card_id
     JOIN study_sets s ON s.id = c.set_id AND s.user_id = sr.user_id
     WHERE sr.user_id = $1
       AND sr.due_at <= NOW()
       AND (
         ($2 = 'folder' AND s.folder_id = $3)
         OR ($2 = 'set' AND s.id = $3 AND s.folder_id IS NULL)
       )
     ORDER BY sr.due_at ASC, sr.updated_at ASC
     LIMIT 50`,
    [userId, scopeKind, scopeId],
  );

  return {
    id: `reviews:${scopeKind}:${scopeId}`,
    title: `Повторение · ${scope.title}`,
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
  const result = await query<ReviewGroupRow & { userId: string; telegramId: string }>(
    `SELECT
       u.id AS "userId",
       u.telegram_id AS "telegramId",
       CASE WHEN s.folder_id IS NULL THEN 'set' ELSE 'folder' END AS "scopeKind",
       COALESCE(s.folder_id, s.id)::text AS "scopeId",
       COALESCE(f.name, s.title) AS title,
       COUNT(sr.card_id) AS "dueCount"
     FROM users u
     JOIN card_spaced_repetitions sr ON sr.user_id = u.id
     JOIN cards c ON c.id = sr.card_id
     JOIN study_sets s ON s.id = c.set_id AND s.user_id = u.id
     LEFT JOIN study_folders f ON f.id = s.folder_id AND f.user_id = u.id
     WHERE u.telegram_id IS NOT NULL
       AND sr.due_at <= NOW()
     GROUP BY
       u.id,
       u.telegram_id,
       CASE WHEN s.folder_id IS NULL THEN 'set' ELSE 'folder' END,
       COALESCE(s.folder_id, s.id),
       COALESCE(f.name, s.title)
     HAVING COUNT(*) FILTER (
       WHERE sr.reminder_sent_at IS NULL OR sr.reminder_sent_at < sr.due_at
     ) > 0
       AND (
         MAX(sr.reminder_attempted_at) FILTER (
           WHERE sr.reminder_sent_at IS NULL OR sr.reminder_sent_at < sr.due_at
         ) IS NULL
         OR MAX(sr.reminder_attempted_at) FILTER (
           WHERE sr.reminder_sent_at IS NULL OR sr.reminder_sent_at < sr.due_at
         ) < NOW() - INTERVAL '1 hour'
       )
     ORDER BY MIN(sr.due_at) ASC
     LIMIT $1`,
    [limit],
  );

  return result.rows.map((row) => ({
    userId: row.userId,
    telegramId: row.telegramId,
    ...toReviewGroup(row),
  }));
}

async function markDueReviewReminder(
  userId: string,
  scopeKind: ReviewScopeKind,
  scopeId: string,
  field: "reminder_attempted_at" | "reminder_sent_at",
) {
  await query(
    `UPDATE card_spaced_repetitions sr
     SET ${field} = NOW(), updated_at = NOW()
     FROM cards c
     JOIN study_sets s ON s.id = c.set_id
     WHERE sr.user_id = $1
       AND sr.card_id = c.id
       AND s.user_id = $1
       AND sr.due_at <= NOW()
       AND (sr.reminder_sent_at IS NULL OR sr.reminder_sent_at < sr.due_at)
       AND (
         ($2 = 'folder' AND s.folder_id = $3)
         OR ($2 = 'set' AND s.id = $3 AND s.folder_id IS NULL)
       )`,
    [userId, scopeKind, scopeId],
  );
}

export function markDueReviewReminderAttempted(
  userId: string,
  scopeKind: ReviewScopeKind,
  scopeId: string,
) {
  return markDueReviewReminder(userId, scopeKind, scopeId, "reminder_attempted_at");
}

export function markDueReviewReminderSent(
  userId: string,
  scopeKind: ReviewScopeKind,
  scopeId: string,
) {
  return markDueReviewReminder(userId, scopeKind, scopeId, "reminder_sent_at");
}
