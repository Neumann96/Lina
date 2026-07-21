import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_SCHEDULE,
  scheduleReview,
} from "../src/lib/spaced-repetition.ts";

test("confident delayed recalls expand through 3, 7, and 14 days", () => {
  const first = scheduleReview(DEFAULT_SCHEDULE, "A");
  const second = scheduleReview(first, "A");
  const third = scheduleReview(second, "A");

  assert.equal(first.dueInDays, 3);
  assert.equal(second.dueInDays, 7);
  assert.equal(third.dueInDays, 14);
  assert.equal(third.repetitions, 3);
  assert.equal(third.stage, "review");
});

test("effortful recall returns tomorrow and reduces stability", () => {
  const learned = scheduleReview(scheduleReview(DEFAULT_SCHEDULE, "A"), "A");
  const effortful = scheduleReview(learned, "B");

  assert.equal(effortful.dueInDays, 1);
  assert.equal(effortful.repetitions, learned.repetitions - 1);
  assert.ok(effortful.ease < learned.ease);
  assert.equal(effortful.successfulReviews, learned.successfulReviews + 1);
});

test("failed recall enters relearning and increments lapses", () => {
  const learned = scheduleReview(DEFAULT_SCHEDULE, "A");
  const forgotten = scheduleReview(learned, "C");

  assert.equal(forgotten.dueInDays, 1);
  assert.equal(forgotten.repetitions, 0);
  assert.equal(forgotten.lapses, 1);
  assert.equal(forgotten.stage, "relearning");
});

test("same-session correction never skips the next-day delayed check", () => {
  const forgotten = scheduleReview(DEFAULT_SCHEDULE, "C");
  const corrected = scheduleReview(forgotten, "A", "same_session");

  assert.equal(corrected.dueInDays, 1);
  assert.equal(corrected.repetitions, forgotten.repetitions);
  assert.equal(corrected.successfulReviews, forgotten.successfulReviews);
  assert.equal(corrected.lapses, forgotten.lapses);
});

test("adaptive mature intervals use the card's learned ease", () => {
  const third = scheduleReview(
    scheduleReview(scheduleReview(DEFAULT_SCHEDULE, "A"), "A"),
    "A",
  );
  const mature = scheduleReview(third, "A");

  assert.equal(mature.dueInDays, Math.ceil(14 * third.ease));
  assert.ok(mature.dueInDays > 14);
});
