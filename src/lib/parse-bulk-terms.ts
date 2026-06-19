export type TermPair = { id: string; term: string; definition: string };

const separators = [/\t+/, /\s+[—–-]\s+/, /\s*[:=]\s+/, /\s*;\s*/, /\s*,\s*/];

export function parseBulkTerms(value: string): TermPair[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      let parts: string[] = [line];
      for (const separator of separators) {
        const candidate = line.split(separator);
        if (candidate.length > 1) {
          parts = candidate;
          break;
        }
      }
      const [term, ...rest] = parts;
      return {
        id: `${Date.now()}-${index}`,
        term: term?.trim() ?? "",
        definition: rest.join(" ").trim(),
      };
    });
}
