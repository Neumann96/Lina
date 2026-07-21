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

test("uses one white background across the mobile app shell", () => {
  assert.match(css, /--canvas:#fff;/);
  assert.match(css, /html \{ background:var\(--canvas\);/);
  assert.match(css, /\.topbar,\.mobile-dashboard,\.mobile-tab-screen \{ background:var\(--canvas\); \}/);
  assert.match(miniApp, /webApp\.setBackgroundColor\?\.\("#ffffff"\)/);
});

test("renders the authenticated mobile dashboard and floating navigation", async () => {
  const home = await readFile(new URL("../src/components/home-client.tsx", import.meta.url), "utf8");

  assert.match(home, /className="mobile-dashboard app-view"/);
  assert.match(home, />Вернуться к учёбе</);
  assert.match(home, />Недавние</);
  assert.match(home, /className="mobile-bottom-nav"/);
  assert.match(home, /data-active-tab=\{activeTab\}/);
  assert.match(home, /className="mobile-nav-indicator"/);
  assert.match(home, /latestSet\.studiedCount/);
  assert.match(home, /"Пройти заново"/);
  assert.match(home, /↻ Начать заново/);
  assert.match(home, /href=\{`\/study\/\$\{set\.id\}`\} transitionTypes=\{\["nav-forward"\]\} className="mobile-recent-set"/);
  assert.match(home, /activeTab === "create"/);
  assert.match(home, /activeTab === "library"/);
  assert.match(home, /setActiveTab\("home"\)/);
  assert.match(css, /\.mobile-bottom-nav \{ position:fixed;/);
  assert.match(css, /border-radius:28px/);
  assert.match(css, /\.mobile-nav-indicator \{[^}]*transition:transform/);
  assert.match(css, /\[data-active-tab="library"\] \.mobile-nav-indicator \{ transform:translate3d\(200%,0,0\); \}/);
  assert.match(css, /\.mobile-dashboard \{ min-height:0; \}/);
});

test("exposes the mobile feature set in the desktop workspace", async () => {
  const home = await readFile(new URL("../src/components/home-client.tsx", import.meta.url), "utf8");

  assert.match(home, /type AppTab = "home" \| "create" \| "library"/);
  assert.match(home, /className="desktop-dashboard-stats"/);
  assert.match(home, /className="mobile-tab-screen mobile-create-screen app-view"/);
  assert.match(home, /className="mobile-tab-screen mobile-library-screen app-view"/);
  assert.match(home, /<CreateMethodPicker \/>/);
  assert.match(home, /onClick=\{\(\) => setActiveTab\("library"\)\}/);
  assert.match(home, /onClick=\{\(\) => setActiveTab\("create"\)\}/);
  assert.match(css, /\.app-view \{ min-height:calc\(100dvh - 80px\);/);
  assert.match(css, /\.dashboard-grid \{ display:grid; grid-template-columns:/);
  assert.match(css, /\.mobile-create-screen \.create-method-list \{ grid-template-columns:repeat\(3,minmax\(0,1fr\)\); \}/);
});

test("keeps retrieval practice fixed and saves before advancing", () => {
  assert.match(css, /\.study-page \{[^}]*position:fixed;[^}]*overflow:hidden;/);
  assert.match(css, /\.study-card\.recall-card \{[^}]*touch-action:auto;/);
  assert.doesNotMatch(studySession, /className="study-controls"/);
  assert.doesNotMatch(studySession, /<em>Слово<\/em>|<em>Значение<\/em>/);
  assert.match(studySession, /className="recall-form"/);
  assert.match(studySession, /className="answer-comparison"/);
  assert.match(studySession, /await saveReview\(current\.card\.id, rating, current\.kind\)/);
  assert.match(studySession, /keepalive: true/);
  assert.match(studySession, /await Promise\.allSettled\(\[\.\.\.pendingReviews\.current\]\)/);
  assert.match(studySession, /router\.push\(`\/\?studyExit=\$\{Date\.now\(\)\}`/);
  assert.doesNotMatch(studySession, /window\.location\.assign\("\/"\)/);
  assert.match(studySession, /aria-label="Начать набор заново"/);
});

test("uses three recall ratings and requeues forgotten cards", () => {
  assert.match(studySession, /submitRating\("C"\)/);
  assert.match(studySession, /submitRating\("B"\)/);
  assert.match(studySession, /submitRating\("A"\)/);
  assert.match(studySession, /kind: "same_session"/);
  assert.match(studySession, /return \[\.\.\.remaining,/);
  assert.match(studySession, /Не вспомнил/);
  assert.match(studySession, /С трудом/);
  assert.match(studySession, /Уверенно/);
  assert.doesNotMatch(studySession, /ещё раз \+ завтра|через 3\+ дня/);
  assert.match(studySession, /<kbd>C<\/kbd><strong>Не вспомнил<\/strong><\/button>/);
  assert.match(css, /\.recall-ratings kbd \{[^}]*font-size:21px;[^}]*font-weight:900;[^}]*opacity:1;/);
  assert.doesNotMatch(css, /\.recall-ratings kbd \{ display:none;/);
  assert.match(css, /\.recall-ratings \{ display:grid; grid-template-columns:repeat\(3,1fr\);/);
});

test("marks case-insensitive exact recall answers as correct", () => {
  assert.match(studySession, /recallAnswersMatch\(answerText, card\.definition\)/);
  assert.match(studySession, /answerMatches \? "Ваш ответ · верно" : "Ваш ответ"/);
  assert.match(css, /\.answer-comparison>div\.matches \{[^}]*border-color:#badfd5;[^}]*background:#f4fbf8;/);
});

test("distinguishes server failures from connection failures when saving reviews", () => {
  assert.match(studySession, /response\.status >= 500/);
  assert.match(studySession, /Сервис не смог сохранить ответ\. Попробуйте ещё раз\./);
  assert.match(studySession, /Не удалось связаться с сервером\. Попробуйте ещё раз\./);
  assert.doesNotMatch(studySession, /Проверьте интернет/);
});

test("keeps mobile study controls clear of Telegram chrome and the card", () => {
  assert.match(css, /\.telegram-mini-app \.study-header \{ height:calc\(106px \+ var\(--tg-content-safe-area-inset-top,0px\)\); padding-top:calc\(28px \+ var\(--tg-content-safe-area-inset-top,0px\)\); \}/);
  assert.match(css, /\.telegram-mini-app \.study-stage \{ height:calc\(100dvh - 110px - var\(--tg-content-safe-area-inset-top,0px\)\);/);
  assert.match(css, /\.study-counters \{ top:16px; \}/);
  assert.match(css, /\.study-counter \{ width:62px; height:42px; \}/);
  assert.match(css, /\.study-counter\.learning \{ left:-22px; \}\.study-counter\.known \{ right:-22px; \}/);
  assert.match(css, /\.study-counter\.learning strong \{ transform:translateX\(11px\); \}\.study-counter\.known strong \{ transform:translateX\(-11px\); \}/);
  assert.match(css, /\.study-counter\.learning \{ color:#d6323f;/);
});

test("gives interactive controls a pressed state", () => {
  assert.match(css, /button:active:not\(:disabled\),a:active \{ filter:brightness\(\.94\); transform:scale\(\.975\); \}/);
});
