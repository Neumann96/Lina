export type TermPair = { id: string; term: string; definition: string };

// Prefer strong column gaps and explicit punctuation, then accept a single
// space as a fallback. Tesseract may emit a visual gap as spaces or a tab.
const separators = [
  /\t+| {2,}/,
  /\s*[—–]\s*/,
  /\s+-\s*|\s*-\s+/,
  /\s*[:=]\s*/,
  /\s*;\s*/,
  /\s*,\s*/,
  / +/,
];

function splitPair(line: string): [string, string] {
  for (const separator of separators) {
    const match = separator.exec(line);
    if (match?.index !== undefined) {
      return [
        line.slice(0, match.index),
        line.slice(match.index + match[0].length),
      ];
    }
  }

  return [line, ""];
}

export function parseBulkTerms(value: string): TermPair[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [term, definition] = splitPair(line);
      return {
        id: `${Date.now()}-${index}`,
        term: term.trim(),
        definition: definition.trim(),
      };
    });
}
