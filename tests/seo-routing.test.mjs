import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import { safeAppPath } from "../src/lib/navigation.ts";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const publicPages = [
  "src/app/(marketing)/page.tsx",
  "src/app/(marketing)/how-it-works/page.tsx",
  "src/app/(marketing)/features/page.tsx",
  "src/app/(marketing)/features/card-import/page.tsx",
  "src/app/(marketing)/features/spaced-repetition/page.tsx",
  "src/app/(marketing)/features/telegram-reminders/page.tsx",
  "src/app/(marketing)/science/page.tsx",
  "src/app/(marketing)/for-school/page.tsx",
  "src/app/(marketing)/for-students/page.tsx",
  "src/app/(marketing)/for-language-learning/page.tsx",
  "src/app/(marketing)/for-exams/page.tsx",
  "src/app/(marketing)/about/page.tsx",
  "src/app/(marketing)/guides/page.tsx",
  "src/app/(marketing)/guides/[slug]/page.tsx",
];

test("publishes a crawlable page for every approved search intent", async () => {
  await Promise.all(publicPages.map((path) => access(new URL(`../${path}`, import.meta.url))));

  const [rootPage, seo, sitemap, robots, structuredData] = await Promise.all([
    read(publicPages[0]),
    read("src/lib/seo.ts"),
    read("src/app/sitemap.ts"),
    read("src/app/robots.ts"),
    read("src/components/structured-data.tsx"),
  ]);

  assert.match(rootPage, /<GuestLanding/);
  assert.doesNotMatch(rootPage, /getCurrentUser|cookies\(/);
  assert.match(seo, /alternates: \{ canonical: url \}/);
  assert.match(seo, /images: \[SOCIAL_IMAGE\]/);
  assert.match(seo, /card: "summary_large_image"/);
  assert.match(sitemap, /"\/for-school"/);
  assert.match(sitemap, /GUIDES\.map\(\(\{ slug \}\) => `\/guides\/\$\{slug\}`\)/);
  assert.doesNotMatch(sitemap, /"\/app"|\"\/login\"/);
  assert.match(robots, /userAgent: "OAI-SearchBot"/);
  assert.match(robots, /userAgent: "GPTBot"/);
  assert.match(robots, /privatePaths = \["\/api\/", "\/app\/", "\/figma-import"\]/);
  assert.match(structuredData, /application\/ld\+json/);
});

test("uses one identical public header on the landing and marketing pages", async () => {
  const [landing, marketing, header, globals, marketingCss] = await Promise.all([
    read("src/components/home-client.tsx"),
    read("src/components/marketing/marketing-page.tsx"),
    read("src/components/marketing/public-header.tsx"),
    read("src/app/globals.css"),
    read("src/app/(marketing)/marketing.css"),
  ]);

  assert.match(landing, /<PublicHeader \/>/);
  assert.match(marketing, /<PublicHeader \/>/);
  assert.match(header, /className="landing-header"/);
  assert.match(header, /className="create-button"/);
  assert.match(globals, /\.create-button \{[^}]*background:var\(--ink\)/);
  assert.doesNotMatch(marketingCss, /\.marketing-header|\.marketing-signup/);
});

test("does not advertise Lina as an installable browser PWA", async () => {
  await assert.rejects(
    access(new URL("../src/app/manifest.ts", import.meta.url)),
    (error) => error?.code === "ENOENT",
  );
});

test("serves the Yandex Webmaster ownership verification file", async () => {
  const verification = await read("public/yandex_a5b0046f2f2bffb1.html");

  assert.match(verification, /<meta http-equiv="Content-Type" content="text\/html; charset=UTF-8">/);
  assert.match(verification, /<body>Verification: a5b0046f2f2bffb1<\/body>/);
});

test("keeps private application routes out of search and preserves old URLs", async () => {
  const [appPage, privateMetadata, legacyLibrary, legacyStudy, legacyEdit, legacyReviews] = await Promise.all([
    read("src/app/(product)/app/page.tsx"),
    read("src/lib/seo.ts"),
    read("src/app/library/page.tsx"),
    read("src/app/study/[setId]/page.tsx"),
    read("src/app/sets/[setId]/edit/page.tsx"),
    read("src/app/study/reviews/page.tsx"),
  ]);

  assert.match(appPage, /getAppShellData\("\/app"\)/);
  assert.match(privateMetadata, /index: false, follow: false, nocache: true/);
  assert.match(legacyLibrary, /permanentRedirect\("\/app\/library"\)/);
  assert.match(legacyStudy, /permanentRedirect\(`\/app\/study\/\$\{setId\}`\)/);
  assert.match(legacyEdit, /permanentRedirect\(`\/app\/sets\/\$\{setId\}\/edit`\)/);
  assert.match(legacyReviews, /permanentRedirect\("\/app\/reviews"\)/);
});

test("only accepts internal application destinations after authentication", () => {
  assert.equal(safeAppPath("/app"), "/app");
  assert.equal(safeAppPath("/app/library?folder=one"), "/app/library?folder=one");
  assert.equal(safeAppPath("/app-fake"), "/app");
  assert.equal(safeAppPath("//evil.example/app"), "/app");
  assert.equal(safeAppPath("https://evil.example/app"), "/app");
});

test("canonicalizes the production host and keeps Telegram on the app shell", async () => {
  const [nginx, telegram, callback, marketingLayout, miniApp] = await Promise.all([
    read("deploy/nginx.ssl.conf"),
    read("src/lib/telegram-bot.ts"),
    read("src/app/api/auth/telegram/callback/route.ts"),
    read("src/app/(marketing)/layout.tsx"),
    read("src/components/telegram-mini-app.tsx"),
  ]);

  assert.match(nginx, /server_name www\.lina-lern\.ru;[\s\S]*return 308 https:\/\/lina-lern\.ru\$request_uri;/);
  assert.match(telegram, /TELEGRAM_MINI_APP_URL = `\$\{TELEGRAM_SITE_ORIGIN\}\/app`/);
  assert.match(callback, /const nextPath = safeAppPath\(url\.searchParams\.get\("next"\)\)/);
  assert.match(callback, /url\.searchParams\.delete\("next"\)/);
  assert.match(marketingLayout, /telegram-web-app\.js\?61/);
  assert.match(marketingLayout, /<TelegramMiniApp redirectTo="\/app" \/>/);
  assert.match(miniApp, /window\.location\.replace\(redirectTo\)/);
  assert.match(miniApp, /webApp\.requestFullscreen\?\.\(\)/);
  assert.match(miniApp, /window\.setTimeout\(maximize, 250\)/);
});
