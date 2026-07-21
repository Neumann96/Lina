import assert from "node:assert/strict";
import test from "node:test";
import { normalizeRecallAnswer, recallAnswersMatch } from "../src/lib/recall-answer.ts";

test("matches Russian answers regardless of letter case", () => {
  assert.equal(recallAnswersMatch("Что", "что"), true);
  assert.equal(recallAnswersMatch("чТо", "что"), true);
  assert.equal(recallAnswersMatch("ЧТО", "что"), true);
});

test("normalizes surrounding and repeated whitespace without accepting different text", () => {
  assert.equal(normalizeRecallAnswer("  До   свидания "), "до свидания");
  assert.equal(recallAnswersMatch("До   свидания", "до свидания"), true);
  assert.equal(recallAnswersMatch("почему", "потому что"), false);
  assert.equal(recallAnswersMatch("", "что"), false);
});
