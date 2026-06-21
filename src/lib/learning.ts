import "server-only";

import { randomUUID } from "node:crypto";
import { query } from "@/lib/db";

export type DashboardStats = {
  cardCount: number;
  setCount: number;
  accuracy: number;
  streak: number;
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
};

export async function getDashboardData(userId: string): Promise<DashboardData> {
  const [countsResult, daysResult, setsResult] = await Promise.all([
    query<{ setCount: string; cardCount: string; reviewCount: string; correctCount: string }>(
      `SELECT
         (SELECT COUNT(*) FROM study_sets WHERE user_id = $1) AS "setCount",
         (SELECT COUNT(*) FROM cards c JOIN study_sets s ON s.id = c.set_id WHERE s.user_id = $1) AS "cardCount",
         (SELECT COUNT(*) FROM card_reviews WHERE user_id = $1) AS "reviewCount",
         (SELECT COUNT(*) FROM card_reviews WHERE user_id = $1 AND is_correct) AS "correctCount"`,
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

export async function createStudySet(userId: string, title: string, cards: Array<{ term: string; definition: string }>) {
  const setId = randomUUID();
  const cardIds = cards.map(() => randomUUID());
  const terms = cards.map((card) => card.term);
  const definitions = cards.map((card) => card.definition);
  const positions = cards.map((_, index) => index);

  await query(
    `WITH new_set AS (
       INSERT INTO study_sets (id, user_id, title)
       VALUES ($1, $2, $3)
       RETURNING id
     )
     INSERT INTO cards (id, set_id, term, definition, position)
     SELECT input.id, new_set.id, input.term, input.definition, input.position
     FROM new_set
     CROSS JOIN UNNEST($4::uuid[], $5::text[], $6::text[], $7::integer[])
       AS input(id, term, definition, position)`,
    [setId, userId, title, cardIds, terms, definitions, positions],
  );

  return setId;
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

export async function recordCardReview(userId: string, cardId: string, isCorrect: boolean) {
  const result = await query(
    `WITH target_card AS (
       SELECT c.id, c.set_id, c.position
       FROM cards c
       JOIN study_sets s ON s.id = c.set_id
       WHERE c.id = $2 AND s.user_id = $1
     ), saved_review AS (
       INSERT INTO card_reviews (user_id, card_id, is_correct)
       SELECT $1, id, $3 FROM target_card
     )
     INSERT INTO study_set_progress (user_id, set_id, next_position, updated_at)
     SELECT $1, set_id, position + 1, NOW()
     FROM target_card
     ON CONFLICT (user_id, set_id) DO UPDATE
     SET next_position = GREATEST(study_set_progress.next_position, EXCLUDED.next_position),
         updated_at = NOW()
     RETURNING set_id`,
    [userId, cardId, isCorrect],
  );
  return (result.rowCount ?? 0) > 0;
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
