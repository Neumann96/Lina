import "server-only";

import { randomUUID } from "node:crypto";
import { query, withTransaction } from "@/lib/db";

export type StudyFolder = {
  id: string;
  name: string;
};

export type LibraryStudySet = {
  id: string;
  title: string;
  folderId: string | null;
  count: number;
  studiedCount: number;
  progress: number;
  dueCount: number;
};

export type LibraryData = {
  folders: StudyFolder[];
  sets: LibraryStudySet[];
};

const MAX_FOLDERS_PER_USER = 100;

export async function getLibraryData(userId: string): Promise<LibraryData> {
  const [foldersResult, setsResult] = await Promise.all([
    query<StudyFolder>(
      `SELECT id, name
       FROM study_folders
       WHERE user_id = $1
       ORDER BY lower(name) ASC, created_at ASC`,
      [userId],
    ),
    query<{
      id: string;
      title: string;
      folderId: string | null;
      cardCount: string;
      studiedCount: string;
      dueCount: string;
    }>(
      `SELECT
         s.id,
         s.title,
         s.folder_id AS "folderId",
         COUNT(DISTINCT c.id) AS "cardCount",
         LEAST(COALESCE(p.next_position, 0), COUNT(DISTINCT c.id)) AS "studiedCount",
         COUNT(DISTINCT sr.card_id) FILTER (WHERE sr.due_at <= NOW()) AS "dueCount"
       FROM study_sets s
       LEFT JOIN cards c ON c.set_id = s.id
       LEFT JOIN card_spaced_repetitions sr ON sr.card_id = c.id AND sr.user_id = $1
       LEFT JOIN study_set_progress p ON p.set_id = s.id AND p.user_id = $1
       WHERE s.user_id = $1
       GROUP BY s.id, p.next_position, p.updated_at
       ORDER BY COALESCE(p.updated_at, s.created_at) DESC`,
      [userId],
    ),
  ]);

  return {
    folders: foldersResult.rows,
    sets: setsResult.rows.map((set) => {
      const count = Number(set.cardCount);
      const studiedCount = Number(set.studiedCount);
      return {
        id: set.id,
        title: set.title,
        folderId: set.folderId,
        count,
        studiedCount,
        progress: count ? Math.round(studiedCount / count * 100) : 0,
        dueCount: Number(set.dueCount),
      };
    }),
  };
}

export async function createStudyFolder(userId: string, name: string) {
  const id = randomUUID();
  const result = await query<StudyFolder>(
    `INSERT INTO study_folders (id, user_id, name)
     SELECT $1, $2, $3
     WHERE (SELECT COUNT(*) FROM study_folders WHERE user_id = $2) < $4
       AND NOT EXISTS (
         SELECT 1 FROM study_folders WHERE user_id = $2 AND lower(name) = lower($3)
       )
     RETURNING id, name`,
    [id, userId, name, MAX_FOLDERS_PER_USER],
  );
  return result.rows[0] ?? null;
}

export async function renameStudyFolder(userId: string, folderId: string, name: string) {
  const result = await query<StudyFolder>(
    `UPDATE study_folders
     SET name = $3, updated_at = NOW()
     WHERE id = $1 AND user_id = $2
       AND NOT EXISTS (
         SELECT 1
         FROM study_folders existing
         WHERE existing.user_id = $2
           AND existing.id <> $1
           AND lower(existing.name) = lower($3)
       )
     RETURNING id, name`,
    [folderId, userId, name],
  );
  return result.rows[0] ?? null;
}

export async function deleteStudyFolder(userId: string, folderId: string) {
  return withTransaction(async (client) => {
    const folder = await client.query(
      `SELECT id FROM study_folders WHERE id = $1 AND user_id = $2 FOR UPDATE`,
      [folderId, userId],
    );
    if (!folder.rowCount) return false;

    await client.query(
      `UPDATE card_spaced_repetitions sr
       SET reminder_sent_at = NULL, reminder_attempted_at = NULL, updated_at = NOW()
       FROM cards c
       JOIN study_sets s ON s.id = c.set_id
       WHERE sr.user_id = $1
         AND sr.card_id = c.id
         AND s.user_id = $1
         AND s.folder_id = $2`,
      [userId, folderId],
    );
    await client.query(
      `DELETE FROM study_folders WHERE id = $1 AND user_id = $2`,
      [folderId, userId],
    );
    return true;
  });
}

export async function moveStudySetToFolder(userId: string, setId: string, folderId: string | null) {
  return withTransaction(async (client) => {
    if (folderId) {
      const folder = await client.query(
        `SELECT id FROM study_folders WHERE id = $1 AND user_id = $2`,
        [folderId, userId],
      );
      if (!folder.rowCount) return false;
    }

    const moved = await client.query(
      `UPDATE study_sets
       SET folder_id = $3
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [setId, userId, folderId],
    );
    if (!moved.rowCount) return false;

    await client.query(
      `UPDATE card_spaced_repetitions sr
       SET reminder_sent_at = NULL, reminder_attempted_at = NULL, updated_at = NOW()
       FROM cards c
       WHERE sr.user_id = $1 AND sr.card_id = c.id AND c.set_id = $2`,
      [userId, setId],
    );
    return true;
  });
}
