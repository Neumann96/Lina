import assert from "node:assert/strict";
import test from "node:test";
import {
  getExpectedAnswer,
  getStudyDirectionLabel,
  getStudyPrompt,
} from "../src/lib/study-direction.ts";

const card = {
  term: "die Erinnerung",
  definition: "воспоминание",
};

test("prompts in the original term-to-definition direction", () => {
  assert.equal(getStudyPrompt(card, "term-to-definition"), "die Erinnerung");
  assert.equal(getExpectedAnswer(card, "term-to-definition"), "воспоминание");
  assert.equal(getStudyDirectionLabel("term-to-definition"), "Термин → ответ");
});

test("reverses prompt and expected answer for definition-to-term practice", () => {
  assert.equal(getStudyPrompt(card, "definition-to-term"), "воспоминание");
  assert.equal(getExpectedAnswer(card, "definition-to-term"), "die Erinnerung");
  assert.equal(getStudyDirectionLabel("definition-to-term"), "Ответ → термин");
});
