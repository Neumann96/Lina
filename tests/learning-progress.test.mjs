import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const learning = await readFile(new URL("../src/lib/learning.ts", import.meta.url), "utf8");
const migration = await readFile(new URL("../db/migrations/003_study_set_progress.sql", import.meta.url), "utf8");
const studySession = await readFile(new URL("../src/components/study-session.tsx", import.meta.url), "utf8");
const restartRoute = await readFile(new URL("../src/app/api/sets/[setId]/restart/route.ts", import.meta.url), "utf8");

test("stores and displays the next card position independently from answer history", () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS study_set_progress/);
  assert.match(learning, /p\.next_position/);
  assert.match(learning, /position \+ 1/);
  assert.match(learning, /progress: count \? Math\.round\(studiedCount \/ count \* 100\) : 0/);
});

test("puts the most recently studied or created set first", () => {
  assert.match(learning, /ORDER BY COALESCE\(p\.updated_at, s\.created_at\) DESC/);
});

test("resumes at the next unfinished card", () => {
  assert.match(learning, /startIndex: Math\.min\(result\.rows\[0\]\.nextPosition \?\? 0, cards\.length\)/);
  assert.match(studySession, /useState\(studySet\.startIndex\)/);
  assert.match(studySession, /index \/ studySet\.cards\.length \* 100/);
});

test("can restart a set without deleting review history", () => {
  assert.match(learning, /SET next_position = 0, updated_at = NOW\(\)/);
  assert.doesNotMatch(learning, /DELETE FROM card_reviews/);
  assert.match(restartRoute, /restartStudySet\(user\.id, setId\)/);
});
