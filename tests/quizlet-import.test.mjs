import assert from "node:assert/strict";
import test from "node:test";
import { normalizeQuizletUrl, parseQuizletHtml } from "../src/lib/quizlet-import.ts";

test("only accepts secure Quizlet links", () => {
  assert.equal(normalizeQuizletUrl("https://quizlet.com/123/example-flash-cards/")?.hostname, "quizlet.com");
  assert.equal(normalizeQuizletUrl("https://evil.example/quizlet.com/123"), null);
  assert.equal(normalizeQuizletUrl("http://quizlet.com/123"), null);
});

test("extracts cards from embedded page JSON", () => {
  const html = `<!doctype html><html><head>
    <meta property="og:title" content="Travel words | Quizlet">
  </head><body><script type="application/json">${JSON.stringify({
    set: {
      terms: [
        { word: "hello", definition: "привет" },
        { word: "goodbye", definition: "до свидания" },
      ],
    },
  })}</script></body></html>`;

  assert.deepEqual(parseQuizletHtml(html), {
    title: "Travel words",
    cards: [
      { term: "hello", definition: "привет" },
      { term: "goodbye", definition: "до свидания" },
    ],
  });
});

test("falls back to word and definition fields inside JavaScript", () => {
  const html = `<title>Fallback — Quizlet</title><script>window.data={"items":[
    {"word":"one","definition":"один"},
    {"word":"two","definition":"два"}
  ]}</script>`;
  assert.equal(parseQuizletHtml(html)?.cards.length, 2);
});
