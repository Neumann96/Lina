import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { MAX_CARDS_PER_SET, parseStudySetInput } from "../src/lib/study-set-input.ts";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const firstId = "11111111-1111-4111-8111-111111111111";
const secondId = "22222222-2222-4222-8222-222222222222";

test("validates creation and trims new terms", () => {
  const result = parseStudySetInput({
    title: "  Английский B1  ",
    cards: [{ term: "  resilient ", definition: " стойкий  " }],
  });

  assert.deepEqual(result, {
    ok: true,
    value: {
      title: "Английский B1",
      cards: [{ id: null, term: "resilient", definition: "стойкий" }],
    },
  });
});

test("accepts edits to existing cards together with newly added cards", () => {
  const result = parseStudySetInput({
    title: "Обновлённый набор",
    cards: [
      { id: firstId, term: "term edited", definition: "definition edited" },
      { term: "new term", definition: "new definition" },
    ],
  }, { allowCardIds: true });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.value.cards.map((card) => card.id), [firstId, null]);
});

test("rejects malformed, duplicate and incomplete edit rows", () => {
  const duplicate = parseStudySetInput({
    title: "Набор",
    cards: [
      { id: secondId, term: "one", definition: "один" },
      { id: secondId, term: "two", definition: "два" },
    ],
  }, { allowCardIds: true });
  const incomplete = parseStudySetInput({
    title: "Набор",
    cards: [{ id: firstId, term: "one", definition: "" }],
  }, { allowCardIds: true });
  const tooMany = parseStudySetInput({
    title: "Набор",
    cards: Array.from({ length: MAX_CARDS_PER_SET + 1 }, () => ({ term: "one", definition: "один" })),
  });

  assert.deepEqual(duplicate, { ok: false, error: "Некорректный список карточек" });
  assert.deepEqual(incomplete, { ok: false, error: "Заполните обе стороны каждой карточки" });
  assert.deepEqual(tooMany, { ok: false, error: `Добавьте от 1 до ${MAX_CARDS_PER_SET} карточек` });
});

test("wires the library pencil, edit page and atomic update API", async () => {
  const [library, page, editor, route, learning] = await Promise.all([
    read("src/components/folder-library.tsx"),
    read("src/app/sets/[setId]/edit/page.tsx"),
    read("src/components/edit-study-set.tsx"),
    read("src/app/api/sets/[setId]/route.ts"),
    read("src/lib/learning.ts"),
  ]);

  assert.match(library, /href=\{`\/sets\/\$\{set\.id\}\/edit`\}/);
  assert.match(library, /Редактировать набор \$\{set\.title\}/);
  assert.match(page, /getStudySet\(user\.id, setId\)/);
  assert.match(editor, /method: "PATCH"/);
  assert.match(editor, /Добавить карточку/);
  assert.match(editor, /Удалить карточку \$\{index \+ 1\}/);
  assert.match(route, /export async function PATCH/);
  assert.match(route, /updateStudySet\(user\.id, setId/);
  assert.match(learning, /UPDATE cards AS card/);
  assert.match(learning, /INSERT INTO cards/);
  assert.match(learning, /DELETE FROM cards/);
  assert.match(learning, /SET next_position = LEAST\(next_position, \$3\)/);
});
