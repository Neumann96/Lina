import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("manual card fields grow with wrapped content and cannot be resized manually", async () => {
  const [textarea, styles, createEditor, editEditor] = await Promise.all([
    read("src/components/auto-growing-textarea.tsx"),
    read("src/app/globals.css"),
    read("src/components/create-method-picker.tsx"),
    read("src/components/edit-study-set.tsx"),
  ]);

  assert.match(textarea, /textarea\.style\.height = "auto"/);
  assert.match(textarea, /textarea\.scrollHeight/);
  assert.match(textarea, /rows=\{1\}/);
  assert.match(textarea, /wrap="soft"/);
  assert.match(styles, /\.manual-card textarea \{[^}]*overflow:hidden[^}]*border-radius:18px[^}]*resize:none/s);
  assert.match(styles, /\.manual-card textarea:focus \{[^}]*border-color:var\(--accent\)[^}]*box-shadow:/s);
  assert.match(createEditor, /<AutoGrowingTextarea value=\{card\.term\}/);
  assert.match(createEditor, /<AutoGrowingTextarea value=\{card\.definition\}/);
  assert.match(editEditor, /<AutoGrowingTextarea value=\{card\.term\}/);
  assert.match(editEditor, /<AutoGrowingTextarea value=\{card\.definition\}/);
});
