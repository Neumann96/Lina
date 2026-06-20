import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(new URL("../src/app/globals.css", import.meta.url), "utf8");
const miniApp = await readFile(new URL("../src/components/telegram-mini-app.tsx", import.meta.url), "utf8");
const studySession = await readFile(new URL("../src/components/study-session.tsx", import.meta.url), "utf8");

test("keeps the Mini App navigation at the bottom on mobile", () => {
  const mobileRule = css.match(/\.telegram-mini-app \.mobile-bottom-nav \{([^}]+)\}/)?.[1] ?? "";

  assert.match(mobileRule, /bottom:calc\(14px \+ var\(--tg-content-safe-area-inset-bottom\)\);/);
  assert.match(mobileRule, /left:calc\(18px \+ var\(--tg-content-safe-area-inset-left\)\);/);
});

test("keeps vertical scrolling inside the Telegram Mini App", () => {
  assert.match(miniApp, /webApp\.disableVerticalSwipes\?\.\(\)/);
  assert.match(miniApp, /webApp\.enableVerticalSwipes\?\.\(\)/);
});

test("renders the authenticated mobile dashboard and floating navigation", async () => {
  const home = await readFile(new URL("../src/components/home-client.tsx", import.meta.url), "utf8");

  assert.match(home, /className="mobile-dashboard"/);
  assert.match(home, />Вернуться к учёбе</);
  assert.match(home, />Недавние</);
  assert.match(home, /className="mobile-bottom-nav"/);
  assert.match(home, /latestSet\.count \* latestSet\.progress/);
  assert.match(css, /\.mobile-bottom-nav \{ position:fixed;/);
  assert.match(css, /border-radius:28px/);
  assert.match(css, /\.mobile-dashboard \{ min-height:0; \}/);
});

test("keeps card practice fixed and swipe-only", () => {
  assert.match(css, /\.study-page \{[^}]*position:fixed;[^}]*overflow:hidden;/);
  assert.match(css, /\.study-card \{[^}]*touch-action:none;/);
  assert.doesNotMatch(studySession, /className="study-controls"/);
  assert.doesNotMatch(studySession, /<em>Слово<\/em>|<em>Значение<\/em>/);
  assert.match(studySession, /dragX < -8 \? " visible"/);
  assert.match(studySession, /dragX > 8 \? " visible"/);
  assert.match(studySession, /key=\{card\.id\}/);
});

test("keeps mobile study controls clear of Telegram chrome and the card", () => {
  assert.match(css, /\.telegram-mini-app \.study-header \{ height:calc\(96px \+ var\(--tg-content-safe-area-inset-top,0px\)\); padding-top:calc\(18px \+ var\(--tg-content-safe-area-inset-top,0px\)\); \}/);
  assert.match(css, /\.telegram-mini-app \.study-stage \{ height:calc\(100dvh - 100px - var\(--tg-content-safe-area-inset-top,0px\)\);/);
  assert.match(css, /\.study-counters \{ top:14px; \}/);
  assert.match(css, /\.study-counter\.learning \{ left:-32px; \}\.study-counter\.known \{ right:-32px; \}/);
});
