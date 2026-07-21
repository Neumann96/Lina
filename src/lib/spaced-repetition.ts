export type ReviewRating = "A" | "B" | "C";
export type ReviewKind = "scheduled" | "same_session";
export type LearningStage = "learning" | "review" | "relearning";

export type ScheduleState = {
  ease: number;
  intervalDays: number;
  repetitions: number;
  successfulReviews: number;
  lapses: number;
  stage: LearningStage;
};

export type ReviewResult = ScheduleState & {
  dueInDays: number;
};

export const DEFAULT_SCHEDULE: ScheduleState = {
  ease: 2.5,
  intervalDays: 0,
  repetitions: 0,
  successfulReviews: 0,
  lapses: 0,
  stage: "learning",
};

function roundEase(value: number) {
  return Math.round(value * 100) / 100;
}

/**
 * A = recalled accurately and confidently, B = recalled with effort,
 * C = not recalled. Same-session correction is retrieval practice, but it
 * never skips the next-day check: spacing starts only after a delayed recall.
 */
export function scheduleReview(
  current: ScheduleState,
  rating: ReviewRating,
  kind: ReviewKind = "scheduled",
): ReviewResult {
  if (kind === "same_session") {
    return {
      ...current,
      intervalDays: 1,
      dueInDays: 1,
    };
  }

  if (rating === "C") {
    return {
      ease: roundEase(Math.max(1.3, current.ease - 0.2)),
      intervalDays: 1,
      repetitions: 0,
      successfulReviews: current.successfulReviews,
      lapses: current.lapses + 1,
      stage: "relearning",
      dueInDays: 1,
    };
  }

  if (rating === "B") {
    const repetitions = Math.max(0, current.repetitions - 1);
    return {
      ease: roundEase(Math.max(1.3, current.ease - 0.08)),
      intervalDays: 1,
      repetitions,
      successfulReviews: current.successfulReviews + 1,
      lapses: current.lapses,
      stage: current.lapses > 0 ? "relearning" : "learning",
      dueInDays: 1,
    };
  }

  const repetitions = current.repetitions + 1;
  const intervalDays = repetitions === 1
    ? 3
    : repetitions === 2
      ? 7
      : repetitions === 3
        ? 14
        : Math.max(14, Math.ceil(current.intervalDays * current.ease));

  return {
    ease: roundEase(Math.min(3, current.ease + 0.1)),
    intervalDays,
    repetitions,
    successfulReviews: current.successfulReviews + 1,
    lapses: current.lapses,
    stage: repetitions >= 3 ? "review" : current.lapses > 0 ? "relearning" : "learning",
    dueInDays: intervalDays,
  };
}
