import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(new URL("../src/app/globals.css", import.meta.url), "utf8");
const miniApp = await readFile(new URL("../src/components/telegram-mini-app.tsx", import.meta.url), "utf8");

test("keeps the Mini App navigation at the bottom on mobile", () => {
  const rules = [...css.matchAll(/\.telegram-mini-app \.sidebar,\.telegram-mini-app \.sidebar\.collapsed \{([^}]+)\}/g)];
  const mobileRule = rules.at(-1)?.[1] ?? "";

  assert.match(mobileRule, /(?:^|;)\s*top:auto;/);
  assert.match(mobileRule, /(?:^|;)\s*bottom:var\(--tg-content-safe-area-inset-bottom\);/);
});

test("keeps vertical scrolling inside the Telegram Mini App", () => {
  assert.match(miniApp, /webApp\.disableVerticalSwipes\?\.\(\)/);
  assert.match(miniApp, /webApp\.enableVerticalSwipes\?\.\(\)/);
});
