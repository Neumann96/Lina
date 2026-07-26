export type StudyDirection = "term-to-definition" | "definition-to-term";

type StudyDirectionCard = {
  term: string;
  definition: string;
};

export function getStudyPrompt(card: StudyDirectionCard, direction: StudyDirection) {
  return direction === "term-to-definition" ? card.term : card.definition;
}

export function getExpectedAnswer(card: StudyDirectionCard, direction: StudyDirection) {
  return direction === "term-to-definition" ? card.definition : card.term;
}

export function getStudyDirectionLabel(direction: StudyDirection) {
  return direction === "term-to-definition" ? "Термин → ответ" : "Ответ → термин";
}
