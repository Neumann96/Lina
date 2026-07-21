import "server-only";

import { randomUUID } from "node:crypto";
import { query, withTransaction } from "@/lib/db";
import {
  DEFAULT_SCHEDULE,
  scheduleReview,
  type LearningStage,
  type ReviewKind,
  type ReviewRating,
} from "@/lib/spaced-repetition";

export type DashboardStats = {
  cardCount: number;
  setCount: number;
  accuracy: number;
  streak: number;
  dueReviewCount: number;
  nextReviewAt: string | null;
};

export type RecentSet = {
  id: string;
  title: string;
  count: number;
  studiedCount: number;
  progress: number;
  color: "coral" | "cream" | "violet";
};

export type DashboardData = {
  stats: DashboardStats;
  recentSets: RecentSet[];
};

export type StudyCard = {
  id: string;
  term: string;
  definition: string;
};

export type StudySet = {
  id: string;
  title: string;
  startIndex: number;
  cards: StudyCard[];
  mode?: "set" | "reviews";
};

export type DueReviewUser = {
  userId: string;
  telegramId: string;
  dueCount: number;
};

const MAX_STUDY_SETS_PER_USER = 200;
const MAX_CARDS_PER_USER = 50_000;

export async function getDashboardData(userId: string): Promise<DashboardData> {
  const [countsResult, daysResult, setsResult] = await Promise.all([
    query<{ setCount: string; cardCount: string; reviewCount: string; correctCount: string; dueReviewCount: string; nextReviewAt: string | null }>(
      `SELECT
         (SELECT COUNT(*) FROM study_sets WHERE user_id = $1) AS "setCount",
         (SELECT COUNT(*) FROM cards c JOIN study_sets s ON s.id = c.set_id WHERE s.user_id = $1) AS "cardCount",
         (SELECT COUNT(*) FROM card_reviews WHERE user_id = $1) AS "reviewCount",
         (SELECT COUNT(*) FROM card_reviews WHERE user_id = $1 AND is_correct) AS "correctCount",
         (SELECT COUNT(*) FROM card_spaced_repetitions WHERE user_id = $1 AND due_at <= NOW()) AS "dueReviewCount",
         (SELECT MIN(due_at)::text FROM card_spaced_repetitions WHERE user_id = $1 AND due_at > NOW()) AS "nextReviewAt"`,
      [userId],
    ),
    query<{ day: string; today: string }>(
      `SELECT
         (reviewed_at AT TIME ZONE 'Europe/Moscow')::date::text AS day,
         (NOW() AT TIME ZONE 'Europe/Moscow')::date::text AS today
       FROM card_reviews
       WHERE user_id = $1
       GROUP BY day, today
       ORDER BY day DESC`,
      [userId],
    ),
    query<{ id: string; title: string; cardCount: string; studiedCount: string }>(
      `SELECT s.id, s.title,
         COUNT(c.id) AS "cardCount",
         LEAST(COALESCE(p.next_position, 0), COUNT(c.id)) AS "studiedCount"
       FROM study_sets s
       LEFT JOIN cards c ON c.set_id = s.id
       LEFT JOIN study_set_progress p ON p.set_id = s.id AND p.user_id = $1
       WHERE s.user_id = $1
       GROUP BY s.id, p.next_position, p.updated_at
       ORDER BY COALESCE(p.updated_at, s.created_at) DESC
       LIMIT 3`,
      [userId],
    ),
  ]);

  const counts = countsResult.rows[0];
  const reviewCount = Number(counts.reviewCount);
  const reviewDays = daysResult.rows.map((row) => row.day);
  const today = daysResult.rows[0]?.today;
  let streak = 0;

  if (today && reviewDays.length) {
    const cursor = new Date(`${today}T00:00:00Z`);
    const first = new Date(`${reviewDays[0]}T00:00:00Z`);
    const dayDifference = Math.round((cursor.getTime() - first.getTime()) / 86_400_000);
    if (dayDifference <= 1) {
      cursor.setUTCDate(cursor.getUTCDate() - dayDifference);
      for (const day of reviewDays) {
        if (day !== cursor.toISOString().slice(0, 10)) break;
        streak += 1;
        cursor.setUTCDate(cursor.getUTCDate() - 1);
      }
    }
  }

  const colors = ["coral", "cream", "violet"] as const;
  return {
    stats: {
      cardCount: Number(counts.cardCount),
      setCount: Number(counts.setCount),
      accuracy: reviewCount ? Math.round(Number(counts.correctCount) / reviewCount * 100) : 0,
      streak,
      dueReviewCount: Number(counts.dueReviewCount),
      nextReviewAt: counts.nextReviewAt,
    },
    recentSets: setsResult.rows.map((set, index) => {
      const count = Number(set.cardCount);
      const studiedCount = Number(set.studiedCount);
      return {
        id: set.id,
        title: set.title,
        count,
        studiedCount,
        progress: count ? Math.round(studiedCount / count * 100) : 0,
        color: colors[index % colors.length],
      };
    }),
  };
}

export async function getDueReviewStudySet(userId: string): Promise<StudySet> {
  const result = await query<{ cardId: string; term: string; definition: string }>(
    `SELECT c.id AS "cardId", c.term, c.definition
     FROM card_spaced_repetitions sr
     JOIN cards c ON c.id = sr.card_id
     JOIN study_sets s ON s.id = c.set_id
     WHERE sr.user_id = $1 AND s.user_id = $1 AND sr.due_at <= NOW()
     ORDER BY sr.due_at ASC, sr.updated_at ASC
     LIMIT 50`,
    [userId],
  );

  return {
    id: "reviews",
    title: "Повторение",
    startIndex: 0,
    mode: "reviews",
    cards: result.rows.map((row) => ({
      id: row.cardId,
      term: row.term,
      definition: row.definition,
    })),
  };
}

export async function createStudySet(userId: string, title: string, cards: Array<{ term: string; definition: string }>) {
  const setId = randomUUID();
  const cardIds = cards.map(() => randomUUID());
  const terms = cards.map((card) => card.term);
  const definitions = cards.map((card) => card.definition);
  const positions = cards.map((_, index) => index);

  const result = await query<{ id: string }>(
    `WITH user_lock AS MATERIALIZED (
       SELECT pg_advisory_xact_lock(hashtextextended($2::uuid::text, 0))
     ), current_usage AS MATERIALIZED (
       SELECT
         (SELECT COUNT(*) FROM study_sets WHERE user_id = $2) AS set_count,
         (SELECT COUNT(*) FROM cards c JOIN study_sets s ON s.id = c.set_id WHERE s.user_id = $2) AS card_count
       FROM user_lock
     ), new_set AS (
       INSERT INTO study_sets (id, user_id, title)
       SELECT $1, $2, $3
       FROM current_usage
       WHERE set_count < $8 AND card_count + $9 <= $10
       RETURNING id
     ), inserted_cards AS (
       INSERT INTO cards (id, set_id, term, definition, position)
     SELECT input.id, new_set.id, input.term, input.definition, input.position
     FROM new_set
     CROSS JOIN UNNEST($4::uuid[], $5::text[], $6::text[], $7::integer[])
         AS input(id, term, definition, position)
       RETURNING set_id
     )
     SELECT id FROM new_set`,
    [setId, userId, title, cardIds, terms, definitions, positions, MAX_STUDY_SETS_PER_USER, cards.length, MAX_CARDS_PER_USER],
  );

  return result.rows[0]?.id ?? null;
}

export async function getStudySet(userId: string, setId: string): Promise<StudySet | null> {
  const result = await query<{ setId: string; title: string; nextPosition: number | null; cardId: string | null; term: string | null; definition: string | null }>(
    `SELECT s.id AS "setId", s.title, p.next_position AS "nextPosition", c.id AS "cardId", c.term, c.definition
     FROM study_sets s
     LEFT JOIN cards c ON c.set_id = s.id
     LEFT JOIN study_set_progress p ON p.set_id = s.id AND p.user_id = $2
     WHERE s.id = $1 AND s.user_id = $2
     ORDER BY c.position`,
    [setId, userId],
  );

  if (!result.rows.length) return null;
  const cards = result.rows.flatMap((row) => row.cardId && row.term && row.definition
    ? [{ id: row.cardId, term: row.term, definition: row.definition }]
    : []);
  return {
    id: result.rows[0].setId,
    title: result.rows[0].title,
    startIndex: Math.min(result.rows[0].nextPosition ?? 0, cards.length),
    cards,
  };
}

export type CardReviewInput = {
  rating: ReviewRating;
  responseMs: number | null;
  kind: ReviewKind;
};

export async function recordCardReview(userId: string, cardId: string, review: CardReviewInput) {
  return withTransaction(async (client) => {
    const targetResult = await client.query<{
      setId: string;
      position: number;
      ease: string | null;
      intervalDays: number | null;
      repetitions: number | null;
      successfulReviews: number | null;
      lapses: number | null;
      stage: LearningStage | null;
    }>(
      `SELECT
         c.set_id AS "setId",
         c.position,
         sr.ease::text AS ease,
         sr.interval_days AS "intervalDays",
         sr.repetitions,
         sr.successful_reviews AS "successfulReviews",
         sr.lapses,
         sr.stage
       FROM cards c
       JOIN study_sets s ON s.id = c.set_id
       LEFT JOIN card_spaced_repetitions sr ON sr.user_id = $1 AND sr.card_id = c.id
       WHERE c.id = $2 AND s.user_id = $1
       FOR UPDATE OF c`,
      [userId, cardId],
    );
    const target = targetResult.rows[0];
    if (!target) return false;

    const next = scheduleReview({
      ease: target.ease === null ? DEFAULT_SCHEDULE.ease : Number(target.ease),
      intervalDays: target.intervalDays ?? DEFAULT_SCHEDULE.intervalDays,
      repetitions: target.repetitions ?? DEFAULT_SCHEDULE.repetitions,
      successfulReviews: target.successfulReviews ?? DEFAULT_SCHEDULE.successfulReviews,
      lapses: target.lapses ?? DEFAULT_SCHEDULE.lapses,
      stage: target.stage ?? DEFAULT_SCHEDULE.stage,
    }, review.rating, review.kind);
    const isCorrect = review.rating !== "C";

    await client.query(
      `INSERT INTO card_reviews (user_id, card_id, is_correct, rating, response_ms, review_kind)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, cardId, isCorrect, review.rating, review.responseMs, review.kind],
    );
    await client.query(
      `INSERT INTO card_spaced_repetitions (
         user_id, card_id, ease, interval_days, repetitions, successful_reviews,
         lapses, stage, due_at, last_reviewed_at, last_is_correct, last_rating,
         reminder_sent_at, reminder_attempted_at, updated_at
       )
       VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8,
         NOW() + $4 * INTERVAL '1 day', NOW(), $9, $10, NULL, NULL, NOW()
       )
       ON CONFLICT (user_id, card_id) DO UPDATE
       SET ease = EXCLUDED.ease,
           interval_days = EXCLUDED.interval_days,
           repetitions = EXCLUDED.repetitions,
           successful_reviews = EXCLUDED.successful_reviews,
           lapses = EXCLUDED.lapses,
           stage = EXCLUDED.stage,
           due_at = EXCLUDED.due_at,
           last_reviewed_at = EXCLUDED.last_reviewed_at,
           last_is_correct = EXCLUDED.last_is_correct,
           last_rating = EXCLUDED.last_rating,
           reminder_sent_at = NULL,
           reminder_attempted_at = NULL,
           updated_at = NOW()`,
      [
        userId,
        cardId,
        next.ease,
        next.intervalDays,
        next.repetitions,
        next.successfulReviews,
        next.lapses,
        next.stage,
        isCorrect,
        review.rating,
      ],
    );
    await client.query(
      `INSERT INTO study_set_progress (user_id, set_id, next_position, updated_at)
       VALUES ($1, $2, $3 + 1, NOW())
       ON CONFLICT (user_id, set_id) DO UPDATE
       SET next_position = GREATEST(study_set_progress.next_position, EXCLUDED.next_position),
           updated_at = NOW()`,
      [userId, target.setId, target.position],
    );
    return true;
  });
}

export async function getDueReviewUsers(limit = 100): Promise<DueReviewUser[]> {
  const result = await query<{ userId: string; telegramId: string; dueCount: string }>(
    `SELECT u.id AS "userId", u.telegram_id AS "telegramId", COUNT(sr.card_id) AS "dueCount"
     FROM users u
     JOIN card_spaced_repetitions sr ON sr.user_id = u.id
     WHERE u.telegram_id IS NOT NULL
       AND sr.due_at <= NOW()
       AND (sr.reminder_sent_at IS NULL OR sr.reminder_sent_at < sr.due_at)
     GROUP BY u.id, u.telegram_id
     HAVING MAX(sr.reminder_attempted_at) IS NULL
         OR MAX(sr.reminder_attempted_at) < NOW() - INTERVAL '1 hour'
     ORDER BY MIN(sr.due_at) ASC
     LIMIT $1`,
    [limit],
  );

  return result.rows.map((row) => ({
    userId: row.userId,
    telegramId: row.telegramId,
    dueCount: Number(row.dueCount),
  }));
}

export async function markDueReviewReminderAttempted(userId: string) {
  await query(
    `UPDATE card_spaced_repetitions
     SET reminder_attempted_at = NOW(), updated_at = NOW()
     WHERE user_id = $1
       AND due_at <= NOW()
       AND (reminder_sent_at IS NULL OR reminder_sent_at < due_at)`,
    [userId],
  );
}

export async function markDueReviewReminderSent(userId: string) {
  await query(
    `UPDATE card_spaced_repetitions
     SET reminder_sent_at = NOW(), updated_at = NOW()
     WHERE user_id = $1
       AND due_at <= NOW()
       AND (reminder_sent_at IS NULL OR reminder_sent_at < due_at)`,
    [userId],
  );
}

export async function restartStudySet(userId: string, setId: string) {
  const result = await query(
    `INSERT INTO study_set_progress (user_id, set_id, next_position, updated_at)
     SELECT $1, s.id, 0, NOW()
     FROM study_sets s
     WHERE s.id = $2 AND s.user_id = $1
     ON CONFLICT (user_id, set_id) DO UPDATE
     SET next_position = 0, updated_at = NOW()
     RETURNING set_id`,
    [userId, setId],
  );
  return (result.rowCount ?? 0) > 0;
}
