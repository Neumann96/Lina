import test from "node:test";
import assert from "node:assert/strict";
import { parseBulkTerms } from "../src/lib/parse-bulk-terms.ts";

test("recognizes the supported separators in one pasted list", () => {
  const pairs = parseBulkTerms([
    "apple — яблоко",
    "moon\tлуна",
    "fast: быстрый",
    "book; книга",
    "home, дом",
  ].join("\n"));

  assert.deepEqual(
    pairs.map(({ term, definition }) => ({ term, definition })),
    [
      { term: "apple", definition: "яблоко" },
      { term: "moon", definition: "луна" },
      { term: "fast", definition: "быстрый" },
      { term: "book", definition: "книга" },
      { term: "home", definition: "дом" },
    ],
  );
});

test("keeps commas inside a tab-separated definition", () => {
  const [pair] = parseBulkTerms("resilient\tстойкий, устойчивый");
  assert.equal(pair.definition, "стойкий, устойчивый");
});
