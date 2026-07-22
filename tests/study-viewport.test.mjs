import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("fits recall practice to the mobile visual viewport while the answer is focused", async () => {
  const [component, css, layout] = await Promise.all([
    read("src/components/study-session.tsx"),
    read("src/app/study-session.css"),
    read("src/app/layout.tsx"),
  ]);

  assert.match(component, /window\.visualViewport/);
  assert.match(component, /viewport\.addEventListener\("resize", syncVisibleViewport\)/);
  assert.match(component, /--study-viewport-height/);
  assert.match(component, /recall-input-active/);
  assert.match(component, /answerInput\.current\?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(component, /onFocus=\{\(\) => setAnswerFocused\(true\)\}/);
  assert.match(layout, /import "\.\/study-session\.css"/);
  assert.match(layout, /<html lang="ru" suppressHydrationWarning>/);
  assert.match(layout, /<body>[\s\S]*?<Script[^>]+telegram-web-app\.js\?61[^>]+\/>[\s\S]*?<TelegramMiniApp \/>[\s\S]*?<\/body>/);
  assert.match(css, /height: var\(--study-viewport-height\)/);
  assert.match(css, /\.study-page\.recall-input-active \.study-card-wrap \{[\s\S]*?height: 100%;[\s\S]*?min-height: 0;/);
  assert.match(css, /\.study-page\.recall-input-active \.recall-form > small \{[\s\S]*?display: none;/);
});
