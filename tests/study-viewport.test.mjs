import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("keeps recall practice stable when the mobile answer field is focused", async () => {
  const [component, telegram, css, rootLayout, productLayout] = await Promise.all([
    read("src/components/study-session.tsx"),
    read("src/components/telegram-mini-app.tsx"),
    read("src/app/study-session.css"),
    read("src/app/layout.tsx"),
    read("src/app/(product)/layout.tsx"),
  ]);

  assert.match(component, /window\.visualViewport/);
  assert.match(component, /window\.Telegram\?\.WebApp/);
  assert.match(component, /webApp\.hideKeyboard\?\.\(\)/);
  assert.match(component, /Math\.min\(browserHeight, telegramHeight\)/);
  assert.match(component, /viewport\?\.addEventListener\("resize", syncVisibleViewport\)/);
  assert.match(component, /webApp\?\.onEvent\("viewportChanged", syncVisibleViewport\)/);
  assert.match(component, /--study-viewport-height/);
  assert.doesNotMatch(component, /recall-input-active/);
  assert.doesNotMatch(component, /\.focus\(\{ preventScroll: true \}\)/);
  assert.doesNotMatch(component, /\bautoFocus\b/);
  assert.match(telegram, /viewportHeight\?: number/);
  assert.match(telegram, /hideKeyboard\?: \(\) => void/);
  assert.match(productLayout, /import "\.\.\/study-session\.css"/);
  assert.match(rootLayout, /<html lang="ru" suppressHydrationWarning>/);
  assert.match(productLayout, /<Script[^>]+telegram-web-app\.js\?61[^>]+\/>[\s\S]*?<TelegramMiniApp \/>/);
  assert.match(css, /--study-viewport-height: var\(--tg-viewport-height, 100dvh\)/);
  assert.match(css, /height: var\(--study-viewport-height\)/);
  assert.match(component, /--study-card-viewport-height/);
  assert.match(css, /\.study-card-wrap \{[\s\S]*?height: min\(var\(--study-card-viewport-height, 66dvh\), 610px\);/);
  assert.doesNotMatch(css, /\.study-page\.recall-input-active/);
  assert.match(css, /@media \(max-width: 700px\) \{[\s\S]*?\.recall-form textarea \{[\s\S]*?font-size: 16px;/);
});
