export function normalizeRecallAnswer(value: string) {
  return value
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("ru-RU");
}

export function recallAnswersMatch(answer: string, expected: string) {
  const normalizedAnswer = normalizeRecallAnswer(answer);
  return Boolean(normalizedAnswer) && normalizedAnswer === normalizeRecallAnswer(expected);
}
