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
  progress: number;
  color: "coral" | "cream" | "violet";
};

export type DashboardData = {
  stats: DashboardStats;
  recentSets: RecentSet[];
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
    query<{ id: string; title: string; cardCount: string; masteredCount: string }>(
      `SELECT s.id, s.title,
         COUNT(c.id) AS "cardCount",
         COUNT(c.id) FILTER (WHERE EXISTS (
           SELECT 1 FROM card_reviews r
           WHERE r.card_id = c.id AND r.user_id = $1 AND r.is_correct
         )) AS "masteredCount"
       FROM study_sets s
       LEFT JOIN cards c ON c.set_id = s.id
       WHERE s.user_id = $1
       GROUP BY s.id
       ORDER BY s.created_at DESC
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
    recentSets: setsResult.rows.map((set, index) => ({
      id: set.id,
      title: set.title,
      count: Number(set.cardCount),
      progress: Number(set.cardCount) ? Math.round(Number(set.masteredCount) / Number(set.cardCount) * 100) : 0,
      color: colors[index % colors.length],
    })),
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
