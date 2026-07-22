import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const learning = await readFile(new URL("../src/lib/learning.ts", import.meta.url), "utf8");
const reviewGroups = await readFile(new URL("../src/lib/review-groups.ts", import.meta.url), "utf8");
const folderMigration = await readFile(new URL("../db/migrations/007_study_folders.sql", import.meta.url), "utf8");
const migration = await readFile(new URL("../db/migrations/003_study_set_progress.sql", import.meta.url), "utf8");
const spacedMigration = await readFile(new URL("../db/migrations/004_spaced_repetition.sql", import.meta.url), "utf8");
const scienceMigration = await readFile(new URL("../db/migrations/006_science_based_repetition.sql", import.meta.url), "utf8");
const studySession = await readFile(new URL("../src/components/study-session.tsx", import.meta.url), "utf8");
const restartRoute = await readFile(new URL("../src/app/api/sets/[setId]/restart/route.ts", import.meta.url), "utf8");
const reviewsPage = await readFile(new URL("../src/app/study/reviews/page.tsx", import.meta.url), "utf8");
const scopedReviewsPage = await readFile(new URL("../src/app/study/reviews/[scopeKind]/[scopeId]/page.tsx", import.meta.url), "utf8");
const notifyRoute = await readFile(new URL("../src/app/api/reviews/notify/route.ts", import.meta.url), "utf8");

test("stores and displays the next card position independently from answer history", () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS study_set_progress/);
  assert.match(learning, /p\.next_position/);
  assert.match(learning, /VALUES \(\$1, \$2, \$3 \+ 1, NOW\(\)\)/);
  assert.match(learning, /progress: count \? Math\.round\(studiedCount \/ count \* 100\) : 0/);
});

test("puts the most recently studied or created set first", () => {
  assert.match(learning, /ORDER BY COALESCE\(p\.updated_at, s\.created_at\) DESC/);
});

test("resumes at the next unfinished card", () => {
  assert.match(learning, /startIndex: Math\.min\(result\.rows\[0\]\.nextPosition \?\? 0, cards\.length\)/);
  assert.match(studySession, /studySet\.cards\.slice\(studySet\.startIndex\)/);
  assert.match(studySession, /scheduledAnswered \/ initialTotal \* 100/);
});

test("groups confident recalls in green and difficult or forgotten recalls in red", () => {
  assert.match(studySession, /study-counter learning[^\n]+\{ratings\.B \+ ratings\.C\}/);
  assert.match(studySession, /study-counter known[^\n]+\{ratings\.A\}/);
});

test("can restart a set without deleting review history", () => {
  assert.match(learning, /SET next_position = 0, updated_at = NOW\(\)/);
  assert.doesNotMatch(learning, /DELETE FROM card_reviews/);
  assert.match(restartRoute, /restartStudySet\(user\.id, setId\)/);
});

test("stores each reviewed card in spaced repetition schedule", () => {
  assert.match(spacedMigration, /CREATE TABLE IF NOT EXISTS card_spaced_repetitions/);
  assert.match(spacedMigration, /PRIMARY KEY \(user_id, card_id\)/);
  assert.match(learning, /INSERT INTO card_spaced_repetitions/);
  assert.match(learning, /due_at = EXCLUDED\.due_at/);
  assert.match(learning, /NOW\(\) \+ \$4::integer \* INTERVAL '1 day'/);
  assert.doesNotMatch(learning, /NOW\(\) \+ \$4 \* INTERVAL '1 day'/);
  assert.match(scienceMigration, /successful_reviews/);
  assert.match(scienceMigration, /rating IN \('A', 'B', 'C'\)/);
});

test("can study due spaced repetition cards separately", () => {
  assert.match(reviewGroups, /getDueReviewStudySet/);
  assert.match(reviewGroups, /sr\.due_at <= NOW\(\)/);
  assert.match(reviewsPage, /getDueReviewGroups\(user\.id\)/);
  assert.match(scopedReviewsPage, /getDueReviewStudySet\(user\.id, scopeKind as ReviewScopeKind, scopeId\)/);
  assert.match(studySession, /studySet\.mode === "reviews"/);
});

test("groups reviews by one unfiled set or one folder", () => {
  assert.match(folderMigration, /CREATE TABLE IF NOT EXISTS study_folders/);
  assert.match(folderMigration, /ADD COLUMN IF NOT EXISTS folder_id/);
  assert.match(reviewGroups, /CASE WHEN s\.folder_id IS NULL THEN 'set' ELSE 'folder' END/);
  assert.match(reviewGroups, /COALESCE\(s\.folder_id, s\.id\)/);
  assert.match(reviewGroups, /\$2 = 'folder' AND s\.folder_id = \$3/);
  assert.match(reviewGroups, /\$2 = 'set' AND s\.id = \$3 AND s\.folder_id IS NULL/);
});

test("supports group-specific telegram reminders for due cards", () => {
  assert.match(reviewGroups, /getDueReviewNotifications/);
  assert.match(reviewGroups, /reminder_sent_at < sr\.due_at/);
  assert.match(reviewGroups, /MAX\(sr\.reminder_attempted_at\) FILTER[\s\S]+< NOW\(\) - INTERVAL '1 hour'/);
  assert.match(reviewGroups, /markDueReviewReminderAttempted/);
  assert.match(reviewGroups, /markDueReviewReminderSent/);
  assert.match(notifyRoute, /x-lina-reminder-secret/);
  assert.match(notifyRoute, /sendTelegramReviewReminder/);
  assert.match(notifyRoute, /withAdvisoryLock\("lina-review-reminder-dispatch"/);
});
