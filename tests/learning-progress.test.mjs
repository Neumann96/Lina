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
  assert.match(reviewGroups, /sr\.due_at < \$\{REVIEW_DAY_END_SQL\}/);
  assert.match(reviewsPage, /getDueReviewStudySet\(user\.id\)/);
  assert.match(scopedReviewsPage, /redirect\("\/study\/reviews"\)/);
  assert.match(studySession, /studySet\.mode === "reviews"/);
});

test("collects every review scheduled for today into one daily queue", () => {
  assert.match(folderMigration, /CREATE TABLE IF NOT EXISTS study_folders/);
  assert.match(folderMigration, /ADD COLUMN IF NOT EXISTS folder_id/);
  assert.match(reviewGroups, /AT TIME ZONE 'Europe\/Moscow'/);
  assert.match(reviewGroups, /scopeKind: "day"/);
  assert.match(reviewGroups, /href: DAILY_REVIEW_HREF/);
  assert.doesNotMatch(reviewGroups, /LIMIT 50/);
  assert.doesNotMatch(reviewGroups, /s\.folder_id = \$3/);
});

test("sends one daily telegram reminder per user before the exact due hour", () => {
  assert.match(reviewGroups, /getDueReviewNotifications/);
  assert.match(reviewGroups, /GROUP BY "userId", "telegramId"/);
  assert.match(reviewGroups, /date_trunc\('day', sr\.due_at AT TIME ZONE 'Europe\/Moscow'\)/);
  assert.match(reviewGroups, /MAX\("reminderAttemptedAt"\) < NOW\(\) - INTERVAL '1 hour'/);
  assert.match(reviewGroups, /markDueReviewReminderAttempted/);
  assert.match(reviewGroups, /markDueReviewReminderSent/);
  assert.match(notifyRoute, /x-lina-reminder-secret/);
  assert.match(notifyRoute, /sendTelegramReviewReminder/);
  assert.match(notifyRoute, /withAdvisoryLock\("lina-review-reminder-dispatch"/);
});
