import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const learning = await readFile(new URL("../src/lib/learning.ts", import.meta.url), "utf8");

test("counts every reviewed card as studied regardless of the answer", () => {
  const studiedFilter = learning.match(/COUNT\(c\.id\) FILTER \(WHERE EXISTS \(([\s\S]*?)\)\) AS "studiedCount"/)?.[1] ?? "";

  assert.match(studiedFilter, /r\.card_id = c\.id/);
  assert.doesNotMatch(studiedFilter, /r\.is_correct/);
  assert.match(learning, /progress: count \? Math\.round\(studiedCount \/ count \* 100\) : 0/);
});

test("puts the most recently studied or created set first", () => {
  assert.match(learning, /ORDER BY COALESCE\([\s\S]*?MAX\(r\.reviewed_at\)/);
});
