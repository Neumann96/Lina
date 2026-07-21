import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const learning = await readFile(new URL("../src/lib/learning.ts", import.meta.url), "utf8");
const migration = await readFile(new URL("../db/migrations/003_study_set_progress.sql", import.meta.url), "utf8");
const spacedMigration = await readFile(new URL("../db/migrations/004_spaced_repetition.sql", import.meta.url), "utf8");
const scienceMigration = await readFile(new URL("../db/migrations/006_science_based_repetition.sql", import.meta.url), "utf8");
const studySession = await readFile(new URL("../src/components/study-session.tsx", import.meta.url), "utf8");
const restartRoute = await readFile(new URL("../src/app/api/sets/[setId]/restart/route.ts", import.meta.url), "utf8");
const reviewsPage = await readFile(new URL("../src/app/study/reviews/page.tsx", import.meta.url), "utf8");
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
  assert.match(learning, /NOW\(\) \+ \$4 \* INTERVAL '1 day'/);
  assert.match(scienceMigration, /successful_reviews/);
  assert.match(scienceMigration, /rating IN \('A', 'B', 'C'\)/);
});

test("can study due spaced repetition cards separately", () => {
  assert.match(learning, /getDueReviewStudySet/);
  assert.match(learning, /sr\.due_at <= NOW\(\)/);
  assert.match(reviewsPage, /getDueReviewStudySet\(user\.id\)/);
  assert.match(studySession, /studySet\.mode === "reviews"/);
});

test("supports scheduled telegram reminders for due cards", () => {
  assert.match(learning, /getDueReviewUsers/);
  assert.match(learning, /reminder_sent_at < sr\.due_at/);
  assert.match(learning, /MAX\(sr\.reminder_attempted_at\) < NOW\(\) - INTERVAL '1 hour'/);
  assert.match(learning, /markDueReviewReminderAttempted/);
  assert.match(learning, /markDueReviewReminderSent/);
  assert.match(notifyRoute, /x-lina-reminder-secret/);
  assert.match(notifyRoute, /sendTelegramReviewReminder/);
  assert.match(notifyRoute, /withAdvisoryLock\("lina-review-reminder-dispatch"/);
});
