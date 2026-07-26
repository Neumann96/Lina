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
import { getDueReviewGroups, type ReviewGroupSummary } from "@/lib/review-groups";

export type DashboardStats = {
  cardCount: number;
  studiedCardCount: number;
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
  reviewGroups: ReviewGroupSummary[];
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

const MAX_STUDY_SETS_PER_USER = 200;
const MAX_CARDS_PER_USER = 50_000;

export async function getDashboardData(userId: string): Promise<DashboardData> {
  const [countsResult, daysResult, setsResult, reviewGroups] = await Promise.all([
    query<{ setCount: string; cardCount: string; studiedCardCount: string; reviewCount: string; correctCount: string; dueReviewCount: string; nextReviewAt: string | null }>(
      `SELECT
         (SELECT COUNT(*) FROM study_sets WHERE user_id = $1) AS "setCount",
         (SELECT COUNT(*) FROM cards c JOIN study_sets s ON s.id = c.set_id WHERE s.user_id = $1) AS "cardCount",
         (SELECT COUNT(*)
          FROM cards c
          JOIN study_sets s ON s.id = c.set_id
          LEFT JOIN study_set_progress p ON p.set_id = s.id AND p.user_id = $1
          WHERE s.user_id = $1
            AND c.position < COALESCE(p.next_position, 0)) AS "studiedCardCount",
         (SELECT COUNT(*) FROM card_reviews WHERE user_id = $1) AS "reviewCount",
         (SELECT COUNT(*) FROM card_reviews WHERE user_id = $1 AND is_correct) AS "correctCount",
         (SELECT COUNT(*)
          FROM card_spaced_repetitions
          WHERE user_id = $1
            AND due_at < (((NOW() AT TIME ZONE 'Europe/Moscow')::date + INTERVAL '1 day')
              AT TIME ZONE 'Europe/Moscow')) AS "dueReviewCount",
         (SELECT MIN(due_at)::text
          FROM card_spaced_repetitions
          WHERE user_id = $1
            AND due_at >= (((NOW() AT TIME ZONE 'Europe/Moscow')::date + INTERVAL '1 day')
              AT TIME ZONE 'Europe/Moscow')) AS "nextReviewAt"`,
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
    getDueReviewGroups(userId),
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
      studiedCardCount: Number(counts.studiedCardCount),
      setCount: Number(counts.setCount),
      accuracy: reviewCount ? Math.round(Number(counts.correctCount) / reviewCount * 100) : 0,
      streak,
      dueReviewCount: Number(counts.dueReviewCount),
      nextReviewAt: counts.nextReviewAt,
    },
    reviewGroups,
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

export type UpdateStudySetCard = {
  id: string | null;
  term: string;
  definition: string;
};

export type UpdateStudySetResult = "updated" | "not-found" | "invalid-cards" | "limit-exceeded";

export async function updateStudySet(
  userId: string,
  setId: string,
  title: string,
  cards: UpdateStudySetCard[],
): Promise<UpdateStudySetResult> {
  return withTransaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1::uuid::text, 0))", [userId]);

    const target = await client.query(
      `SELECT id
       FROM study_sets
       WHERE id = $1 AND user_id = $2
       FOR UPDATE`,
      [setId, userId],
    );
    if (!target.rowCount) return "not-found";

    const usage = await client.query<{ cardCount: string }>(
      `SELECT COUNT(*) AS "cardCount"
       FROM cards c
       JOIN study_sets s ON s.id = c.set_id
       WHERE s.user_id = $1 AND s.id <> $2`,
      [userId, setId],
    );
    if (Number(usage.rows[0]?.cardCount ?? 0) + cards.length > MAX_CARDS_PER_USER) {
      return "limit-exceeded";
    }

    const existing = await client.query<{ id: string }>(
      `SELECT id
       FROM cards
       WHERE set_id = $1
       FOR UPDATE`,
      [setId],
    );
    const existingIds = new Set(existing.rows.map((card) => card.id));
    const retainedCards = cards.filter((card): card is UpdateStudySetCard & { id: string } => card.id !== null);
    if (retainedCards.some((card) => !existingIds.has(card.id))) return "invalid-cards";

    const preparedCards = cards.map((card, position) => ({
      id: card.id ?? randomUUID(),
      term: card.term,
      definition: card.definition,
      position,
      retained: card.id !== null,
    }));
    const retainedIds = retainedCards.map((card) => card.id);

    await client.query(
      `UPDATE study_sets
       SET title = $3
       WHERE id = $1 AND user_id = $2`,
      [setId, userId, title],
    );
    await client.query(
      `UPDATE cards
       SET position = position + 1000000
       WHERE set_id = $1`,
      [setId],
    );
    await client.query(
      `DELETE FROM cards
       WHERE set_id = $1
         AND NOT (id = ANY($2::uuid[]))`,
      [setId, retainedIds],
    );

    const retained = preparedCards.filter((card) => card.retained);
    if (retained.length) {
      await client.query(
        `UPDATE cards AS card
         SET term = input.term,
             definition = input.definition,
             position = input.position
         FROM UNNEST($2::uuid[], $3::text[], $4::text[], $5::integer[])
           AS input(id, term, definition, position)
         WHERE card.set_id = $1 AND card.id = input.id`,
        [
          setId,
          retained.map((card) => card.id),
          retained.map((card) => card.term),
          retained.map((card) => card.definition),
          retained.map((card) => card.position),
        ],
      );
    }

    const added = preparedCards.filter((card) => !card.retained);
    if (added.length) {
      await client.query(
        `INSERT INTO cards (id, set_id, term, definition, position)
         SELECT input.id, $1, input.term, input.definition, input.position
         FROM UNNEST($2::uuid[], $3::text[], $4::text[], $5::integer[])
           AS input(id, term, definition, position)`,
        [
          setId,
          added.map((card) => card.id),
          added.map((card) => card.term),
          added.map((card) => card.definition),
          added.map((card) => card.position),
        ],
      );
    }

    await client.query(
      `UPDATE study_set_progress
       SET next_position = LEAST(next_position, $3)
       WHERE user_id = $1 AND set_id = $2`,
      [userId, setId, cards.length],
    );
    return "updated";
  });
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
         NOW() + $4::integer * INTERVAL '1 day', NOW(), $9, $10, NULL, NULL, NOW()
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

export async function deleteStudySet(userId: string, setId: string) {
  const result = await query(
    `DELETE FROM study_sets
     WHERE id = $1 AND user_id = $2
     RETURNING id`,
    [setId, userId],
  );
  return (result.rowCount ?? 0) > 0;
}
