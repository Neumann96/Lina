import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const picker = await readFile(new URL("../src/components/create-method-picker.tsx", import.meta.url), "utf8");
const home = await readFile(new URL("../src/components/home-client.tsx", import.meta.url), "utf8");

test("offers all three creation methods in the mobile create tab", () => {
  assert.match(home, /<CreateMethodPicker \/>/);
  assert.match(picker, /Создать вручную/);
  assert.match(picker, /Распознать камерой/);
  assert.match(picker, /Импортировать/);
  assert.match(picker, /Ссылка Quizlet или готовый текст/);
});

test("camera recognition stays client-side and supports Russian and English", () => {
  assert.match(picker, /navigator\.mediaDevices\.getUserMedia/);
  assert.match(picker, /createWorker\(\["eng", "rus"\]/);
  assert.match(picker, /worker\.recognize\(canvas\)/);
  assert.match(picker, /worker\.terminate\(\)/);
  assert.match(picker, /parseBulkTerms\(recognized\)/);
  assert.match(picker, /tessedit_pageseg_mode: PSM\.SINGLE_BLOCK/);
  assert.match(picker, /prepareCameraFrame\(video\)/);
});

test("camera recognition entry is marked as coming soon and disabled", () => {
  assert.match(picker, /id: "camera"[^\n]+badge: "Скоро", disabled: true/);
  assert.match(picker, /disabled=\{item\.disabled\}/);
});

test("manual creation uses an editable Quizlet-style card list and the sets API", () => {
  assert.match(picker, /function ManualCardEditor/);
  assert.match(picker, /ТЕРМИН/);
  assert.match(picker, /ОПРЕДЕЛЕНИЕ/);
  assert.match(picker, /Добавить карточку/);
  assert.match(picker, /fetch\("\/api\/sets"/);
  assert.match(picker, /window\.location\.assign\(`\/study\/\$\{result\.id\}`\)/);
  assert.doesNotMatch(picker, /id: "manual"[^\n]+badge: "Скоро"/);
});
