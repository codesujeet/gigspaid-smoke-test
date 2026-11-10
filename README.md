# gigspaid.com smoke test

A Playwright (TypeScript) test suite for the public pages of https://gigspaid.com. It runs on **desktop Chrome** and a **mobile viewport (Pixel 7)**.

**Status of the latest run:** 96 passed, 10 skipped (desktop-only checks on mobile), 0 failed; slowest page showed content in 2.85 s (budget 5 s). Full output at the [bottom](#latest-run).

## Quick start

```bash
npm ci
npx playwright install chromium
npx playwright test --grep @core     # just the brief: 6 pages x 2 viewports (about 1 min)
npx playwright test                  # everything (about 6 min)
```

**Contents:** [The brief](#the-brief-core-smoke-test) · [Extra coverage](#extra-coverage) · [Run it](#run-it) · [Project layout](#project-layout) · [Design decisions](#design-decisions) · [Findings about the live site](#findings-about-the-live-site) · [Latest run](#latest-run)

## Project layout

```text
playwright.config.ts          2 projects (desktop-chrome, mobile-chrome), 1 worker, no retries
tests/
  smoke.spec.ts               the brief: no console errors, not blank, content within 5 s
  page-quality.spec.ts        metadata, one h1, overflow, alt text, skip link, axe-core
  navigation.spec.ts          footer/header links, back/forward, reload, 404 links, listings
  network.spec.ts             HTTPS/headers, manifest, assets, /api/me, known path-404 bug
  support/
    routes.ts                 route table, 5 s budget and other constants
    problems.ts               console/exception/HTTP error collector (+ the one /api/me 401 exception)
    content.ts                "is the page rendered, not blank" check and timing loop
    fixtures.ts               Playwright fixture that attaches the collector to every test
```

## The brief (core smoke test)

[`tests/smoke.spec.ts`](tests/smoke.spec.ts) opens `/`, `/#/work`, `/#/bounties`, `/#/leaderboard`, `/#/hire` and a 404 route (`/#/this-route-does-not-exist`, the app's in-app 404 page) and **fails if a page**:

1. **throws a console error** (also: uncaught exceptions, failed requests, any HTTP 4xx/5xx),
2. **shows a blank main area** (boot splash still showing, no `<h1>`, or under 20 characters of text in the content area), or
3. **takes over 5 seconds to show content**, timed from the start of navigation (network and render both count).

Each core page also asserts a piece of stable body copy, so `/#/work` can't pass by accidentally rendering the home page. Headings on this site animate (scrambled text for a moment), so the suite never asserts on heading text. The same three checks also run on the ten secondary pages (`vetted`, `radar`, `activity`, `about`, `terms`, `privacy`, `refunds`, `contact`, `premium`, `signin`).

## Extra coverage

| Spec | What it checks | Tag |
| --- | --- | --- |
| [`smoke.spec.ts`](tests/smoke.spec.ts) | The three core checks, on 6 core + 10 secondary pages | `@core` `@extended` |
| [`page-quality.spec.ts`](tests/page-quality.spec.ts) | On the 6 core pages: title, `lang`, viewport and description meta, exactly one `<h1>`, no horizontal scroll, image `alt` text, accessible names on links/buttons, skip-link target, no *critical* [axe-core](https://github.com/dequelabs/axe-core) violations | `@quality` |
| [`navigation.spec.ts`](tests/navigation.spec.ts) | Every footer link, header nav + logo (desktop), back/forward, reload on a deep link, the 404 page's "Browse paid work" / "Post a job" links, `mailto:` link, listings show prices, category tabs switch | `@navigation` `@content` |
| [`network.spec.ts`](tests/network.spec.ts) | HTTPS + gzip + HSTS + `nosniff`, `http://` → `https://` redirect, PWA manifest, icons/logo, every bundle referenced by `index.html` loads, anonymous `/api/me` returns 401 JSON | `@network` |

Run a subset with `npx playwright test --grep @core`.

## Run it

```bash
npm ci
npx playwright install chromium
npx playwright test                              # everything, desktop + mobile
npx playwright test --grep @core                 # just the brief
npx playwright test --project=mobile-chrome      # one viewport
BASE_URL=https://staging.example.com npx playwright test   # another host
npx playwright show-report                       # HTML report (written to playwright-report/)
```

Screenshots and traces are kept for failures only. Expected full run time: about 6 minutes.

## Design decisions

- **One tolerated console error.** Every page load logs `Failed to load resource: 401` for `GET /api/me`: the app asks "who am I?" and a logged-out visitor correctly gets 401. The suite ignores exactly that (path `/api/me` **and** status 401) and nothing else. Any other console error, exception, failed request or 4xx/5xx still fails. See `isExpectedAnonymous401` in [`tests/support/problems.ts`](tests/support/problems.ts).
- **One worker, no retries.** The 5s check is a timing measurement. With 12 browsers in parallel on one laptop I saw false 11s readings, so the config uses `workers: 1`. Retries are off so a flaky page shows up as a failure.
- **Soft assertions on the core test**, so one failure reports the time taken *and* what was on screen (splash, missing heading, blank area) together.
- **Known issues are tracked with `test.fail()`**: the suite stays green while the bug exists and the test turns **red the day it is fixed**, which is the cue to remove the marker. They are not hidden; each one has its reason in the code and is listed below.

## Findings about the live site

The suite found these. None are in the brief's scope, and each is tracked by a `test.fail()` test unless noted.

1. **Unknown paths never render a 404 page.** `https://gigspaid.com/no-such-page/` is stuck on the boot splash forever. `index.html` loads assets with relative URLs (`./assets/index-*.js`), which resolve to `/no-such-page/assets/...` and 404. The in-app `#/…` 404 works fine and is what the core tests cover. Likely fix: `base: '/'` in `vite.config` and serve `index.html` for unknown paths. (`network.spec.ts`)
2. **Home page has no "Skip to content" link** and no `id="main"` landmark; the other pages have both. (`page-quality.spec.ts`)
3. **Leaderboard has a critical accessibility violation** (axe `aria-required-children`: a `tablist` with no `tab` children). (`page-quality.spec.ts`)
4. **Not covered by a test:** `robots.txt` and `sitemap.xml` return 404. axe also reports many *serious* issues on every page (`color-contrast`, `aria-prohibited-attr`) and moderate ones (`heading-order`); the suite records them as annotations in the HTML report but only gates on *critical*.

## Latest run

Production, serial, Windows 11 / Node 22 / Playwright with headless Chromium. The `content visible in … ms` lines are the measured time until content showed (budget 5000 ms; the slowest page in this run took 2852 ms). In the list below `x` marks a **tracked known issue that failed as expected** (counted as passed), and `-` a deliberate skip (desktop-only checks on the mobile project).

```text
Running 106 tests using 1 worker
  ok   1 [desktop-chrome] › tests/navigation.spec.ts:18:3 › navigation @navigation › every footer link opens a rendered page within budget, with no errors (10.9s)
  ok   2 [desktop-chrome] › tests/navigation.spec.ts:38:3 › navigation @navigation › desktop header nav and logo work (2.9s)
  ok   3 [desktop-chrome] › tests/navigation.spec.ts:55:3 › navigation @navigation › back and forward buttons restore pages (1.6s)
  ok   4 [desktop-chrome] › tests/navigation.spec.ts:72:3 › navigation @navigation › reloading a deep link keeps the same page (3.8s)
  ok   5 [desktop-chrome] › tests/navigation.spec.ts:84:3 › navigation @navigation › 404 page offers a way back: "Browse paid work" and "Post a job" (2.0s)
  ok   6 [desktop-chrome] › tests/navigation.spec.ts:99:3 › navigation @navigation › the footer contact link is a valid mailto (2.3s)
  ok   7 [desktop-chrome] › tests/navigation.spec.ts:108:5 › listings show real data @content › #/work shows listings with prices (jobs) (2.8s)
  ok   8 [desktop-chrome] › tests/navigation.spec.ts:108:5 › listings show real data @content › #/bounties shows listings with prices (bounties) (2.5s)
  ok   9 [desktop-chrome] › tests/navigation.spec.ts:117:3 › listings show real data @content › #/work category tabs switch without breaking the page (2.8s)
  ok  10 [desktop-chrome] › tests/network.spec.ts:11:3 › network & assets @network › HTML is served over HTTPS with gzip and basic security headers (706ms)
  ok  11 [desktop-chrome] › tests/network.spec.ts:20:3 › network & assets @network › plain http:// redirects to https:// (37ms)
  ok  12 [desktop-chrome] › tests/network.spec.ts:27:3 › network & assets @network › PWA manifest is valid JSON with a name and icons (596ms)
  ok  13 [desktop-chrome] › tests/network.spec.ts:41:5 › network & assets @network › static asset /logo.svg is served as image/svg+xml (753ms)
  ok  14 [desktop-chrome] › tests/network.spec.ts:41:5 › network & assets @network › static asset /icons/icon-512.png is served as image/png (726ms)
  ok  15 [desktop-chrome] › tests/network.spec.ts:41:5 › network & assets @network › static asset /icons/apple-touch-icon.png is served as image/png (618ms)
  ok  16 [desktop-chrome] › tests/network.spec.ts:41:5 › network & assets @network › static asset /icons/favicon-32.png is served as image/png (648ms)
  ok  17 [desktop-chrome] › tests/network.spec.ts:49:3 › network & assets @network › every script and stylesheet referenced by index.html loads (no broken bundle) (734ms)
  ok  18 [desktop-chrome] › tests/network.spec.ts:59:3 › network & assets @network › anonymous GET /api/me answers 401 as JSON (not a 5xx or an HTML page) (591ms)
  x   19 [desktop-chrome] › tests/network.spec.ts:74:1 › known bug: unknown PATH (/no-such-page/) should render a 404 page but sticks on the splash (16.1s)
  ok  20 [desktop-chrome] › tests/page-quality.spec.ts:22:5 › home (/) @quality › markup hygiene: title, lang, viewport, description, one h1, no overflow, alt text, names (3.0s)
  x   21 [desktop-chrome] › tests/page-quality.spec.ts:51:5 › home (/) @quality › skip link exists and its target is on the page (5.9s)
  ok  22 [desktop-chrome] › tests/page-quality.spec.ts:58:5 › home (/) @quality › no critical accessibility violations (axe-core) (4.5s)
  ok  23 [desktop-chrome] › tests/page-quality.spec.ts:22:5 › work (/#/work) @quality › markup hygiene: title, lang, viewport, description, one h1, no overflow, alt text, names (2.8s)
  ok  24 [desktop-chrome] › tests/page-quality.spec.ts:51:5 › work (/#/work) @quality › skip link exists and its target is on the page (2.6s)
  ok  25 [desktop-chrome] › tests/page-quality.spec.ts:58:5 › work (/#/work) @quality › no critical accessibility violations (axe-core) (9.4s)
  ok  26 [desktop-chrome] › tests/page-quality.spec.ts:22:5 › bounties (/#/bounties) @quality › markup hygiene: title, lang, viewport, description, one h1, no overflow, alt text, names (3.0s)
  ok  27 [desktop-chrome] › tests/page-quality.spec.ts:51:5 › bounties (/#/bounties) @quality › skip link exists and its target is on the page (2.9s)
  ok  28 [desktop-chrome] › tests/page-quality.spec.ts:58:5 › bounties (/#/bounties) @quality › no critical accessibility violations (axe-core) (4.5s)
  ok  29 [desktop-chrome] › tests/page-quality.spec.ts:22:5 › leaderboard (/#/leaderboard) @quality › markup hygiene: title, lang, viewport, description, one h1, no overflow, alt text, names (2.8s)
  ok  30 [desktop-chrome] › tests/page-quality.spec.ts:51:5 › leaderboard (/#/leaderboard) @quality › skip link exists and its target is on the page (2.7s)
  x   31 [desktop-chrome] › tests/page-quality.spec.ts:58:5 › leaderboard (/#/leaderboard) @quality › no critical accessibility violations (axe-core) (3.7s)
  ok  32 [desktop-chrome] › tests/page-quality.spec.ts:22:5 › hire (/#/hire) @quality › markup hygiene: title, lang, viewport, description, one h1, no overflow, alt text, names (2.8s)
  ok  33 [desktop-chrome] › tests/page-quality.spec.ts:51:5 › hire (/#/hire) @quality › skip link exists and its target is on the page (3.0s)
  ok  34 [desktop-chrome] › tests/page-quality.spec.ts:58:5 › hire (/#/hire) @quality › no critical accessibility violations (axe-core) (4.0s)
  ok  35 [desktop-chrome] › tests/page-quality.spec.ts:22:5 › 404 (/#/this-route-does-not-exist) @quality › markup hygiene: title, lang, viewport, description, one h1, no overflow, alt text, names (2.8s)
  ok  36 [desktop-chrome] › tests/page-quality.spec.ts:51:5 › 404 (/#/this-route-does-not-exist) @quality › skip link exists and its target is on the page (3.1s)
  ok  37 [desktop-chrome] › tests/page-quality.spec.ts:58:5 › 404 (/#/this-route-does-not-exist) @quality › no critical accessibility violations (axe-core) (3.3s)
    [desktop-chrome] home: content visible in 1508 ms
  ok  38 [desktop-chrome] › tests/smoke.spec.ts:19:3 › home (/) loads clean, non-blank, within 5s @core (2.8s)
    [desktop-chrome] work: content visible in 1198 ms
  ok  39 [desktop-chrome] › tests/smoke.spec.ts:19:3 › work (/#/work) loads clean, non-blank, within 5s @core (2.7s)
    [desktop-chrome] bounties: content visible in 1496 ms
  ok  40 [desktop-chrome] › tests/smoke.spec.ts:19:3 › bounties (/#/bounties) loads clean, non-blank, within 5s @core (2.8s)
    [desktop-chrome] leaderboard: content visible in 1425 ms
  ok  41 [desktop-chrome] › tests/smoke.spec.ts:19:3 › leaderboard (/#/leaderboard) loads clean, non-blank, within 5s @core (2.7s)
    [desktop-chrome] hire: content visible in 1298 ms
  ok  42 [desktop-chrome] › tests/smoke.spec.ts:19:3 › hire (/#/hire) loads clean, non-blank, within 5s @core (2.6s)
    [desktop-chrome] 404: content visible in 1493 ms
  ok  43 [desktop-chrome] › tests/smoke.spec.ts:19:3 › 404 (/#/this-route-does-not-exist) loads clean, non-blank, within 5s @core (2.7s)
    [desktop-chrome] vetted: content visible in 2515 ms
  ok  44 [desktop-chrome] › tests/smoke.spec.ts:19:3 › vetted (/#/vetted) loads clean, non-blank, within 5s @extended (3.7s)
    [desktop-chrome] radar: content visible in 2302 ms
  ok  45 [desktop-chrome] › tests/smoke.spec.ts:19:3 › radar (/#/radar) loads clean, non-blank, within 5s @extended (3.5s)
    [desktop-chrome] activity: content visible in 2852 ms
  ok  46 [desktop-chrome] › tests/smoke.spec.ts:19:3 › activity (/#/activity) loads clean, non-blank, within 5s @extended (4.1s)
    [desktop-chrome] about: content visible in 1216 ms
  ok  47 [desktop-chrome] › tests/smoke.spec.ts:19:3 › about (/#/about) loads clean, non-blank, within 5s @extended (2.4s)
    [desktop-chrome] terms: content visible in 1199 ms
  ok  48 [desktop-chrome] › tests/smoke.spec.ts:19:3 › terms (/#/terms) loads clean, non-blank, within 5s @extended (2.4s)
    [desktop-chrome] privacy: content visible in 1550 ms
  ok  49 [desktop-chrome] › tests/smoke.spec.ts:19:3 › privacy (/#/privacy) loads clean, non-blank, within 5s @extended (2.7s)
    [desktop-chrome] refunds: content visible in 2258 ms
  ok  50 [desktop-chrome] › tests/smoke.spec.ts:19:3 › refunds (/#/refunds) loads clean, non-blank, within 5s @extended (3.4s)
    [desktop-chrome] contact: content visible in 2049 ms
  ok  51 [desktop-chrome] › tests/smoke.spec.ts:19:3 › contact (/#/contact) loads clean, non-blank, within 5s @extended (3.2s)
    [desktop-chrome] premium: content visible in 2426 ms
  ok  52 [desktop-chrome] › tests/smoke.spec.ts:19:3 › premium (/#/premium) loads clean, non-blank, within 5s @extended (3.6s)
    [desktop-chrome] signin: content visible in 1244 ms
  ok  53 [desktop-chrome] › tests/smoke.spec.ts:19:3 › signin (/#/signin) loads clean, non-blank, within 5s @extended (2.5s)
  ok  54 [mobile-chrome] › tests/navigation.spec.ts:18:3 › navigation @navigation › every footer link opens a rendered page within budget, with no errors (13.8s)
  -   55 [mobile-chrome] › tests/navigation.spec.ts:38:3 › navigation @navigation › desktop header nav and logo work
  ok  56 [mobile-chrome] › tests/navigation.spec.ts:55:3 › navigation @navigation › back and forward buttons restore pages (1.7s)
  ok  57 [mobile-chrome] › tests/navigation.spec.ts:72:3 › navigation @navigation › reloading a deep link keeps the same page (4.3s)
  ok  58 [mobile-chrome] › tests/navigation.spec.ts:84:3 › navigation @navigation › 404 page offers a way back: "Browse paid work" and "Post a job" (2.8s)
  ok  59 [mobile-chrome] › tests/navigation.spec.ts:99:3 › navigation @navigation › the footer contact link is a valid mailto (2.0s)
  ok  60 [mobile-chrome] › tests/navigation.spec.ts:108:5 › listings show real data @content › #/work shows listings with prices (jobs) (3.4s)
  ok  61 [mobile-chrome] › tests/navigation.spec.ts:108:5 › listings show real data @content › #/bounties shows listings with prices (bounties) (3.1s)
  ok  62 [mobile-chrome] › tests/navigation.spec.ts:117:3 › listings show real data @content › #/work category tabs switch without breaking the page (3.0s)
  -   63 [mobile-chrome] › tests/network.spec.ts:11:3 › network & assets @network › HTML is served over HTTPS with gzip and basic security headers
  -   64 [mobile-chrome] › tests/network.spec.ts:20:3 › network & assets @network › plain http:// redirects to https://
  -   65 [mobile-chrome] › tests/network.spec.ts:27:3 › network & assets @network › PWA manifest is valid JSON with a name and icons
  -   66 [mobile-chrome] › tests/network.spec.ts:41:5 › network & assets @network › static asset /logo.svg is served as image/svg+xml
  -   67 [mobile-chrome] › tests/network.spec.ts:41:5 › network & assets @network › static asset /icons/icon-512.png is served as image/png
  -   68 [mobile-chrome] › tests/network.spec.ts:41:5 › network & assets @network › static asset /icons/apple-touch-icon.png is served as image/png
  -   69 [mobile-chrome] › tests/network.spec.ts:41:5 › network & assets @network › static asset /icons/favicon-32.png is served as image/png
  -   70 [mobile-chrome] › tests/network.spec.ts:49:3 › network & assets @network › every script and stylesheet referenced by index.html loads (no broken bundle)
  -   71 [mobile-chrome] › tests/network.spec.ts:59:3 › network & assets @network › anonymous GET /api/me answers 401 as JSON (not a 5xx or an HTML page)
  x   72 [mobile-chrome] › tests/network.spec.ts:74:1 › known bug: unknown PATH (/no-such-page/) should render a 404 page but sticks on the splash (15.7s)
  ok  73 [mobile-chrome] › tests/page-quality.spec.ts:22:5 › home (/) @quality › markup hygiene: title, lang, viewport, description, one h1, no overflow, alt text, names (3.3s)
  x   74 [mobile-chrome] › tests/page-quality.spec.ts:51:5 › home (/) @quality › skip link exists and its target is on the page (6.6s)
  ok  75 [mobile-chrome] › tests/page-quality.spec.ts:58:5 › home (/) @quality › no critical accessibility violations (axe-core) (4.8s)
  ok  76 [mobile-chrome] › tests/page-quality.spec.ts:22:5 › work (/#/work) @quality › markup hygiene: title, lang, viewport, description, one h1, no overflow, alt text, names (3.3s)
  ok  77 [mobile-chrome] › tests/page-quality.spec.ts:51:5 › work (/#/work) @quality › skip link exists and its target is on the page (2.8s)
  ok  78 [mobile-chrome] › tests/page-quality.spec.ts:58:5 › work (/#/work) @quality › no critical accessibility violations (axe-core) (6.5s)
  ok  79 [mobile-chrome] › tests/page-quality.spec.ts:22:5 › bounties (/#/bounties) @quality › markup hygiene: title, lang, viewport, description, one h1, no overflow, alt text, names (3.2s)
  ok  80 [mobile-chrome] › tests/page-quality.spec.ts:51:5 › bounties (/#/bounties) @quality › skip link exists and its target is on the page (2.9s)
  ok  81 [mobile-chrome] › tests/page-quality.spec.ts:58:5 › bounties (/#/bounties) @quality › no critical accessibility violations (axe-core) (4.3s)
  ok  82 [mobile-chrome] › tests/page-quality.spec.ts:22:5 › leaderboard (/#/leaderboard) @quality › markup hygiene: title, lang, viewport, description, one h1, no overflow, alt text, names (2.7s)
  ok  83 [mobile-chrome] › tests/page-quality.spec.ts:51:5 › leaderboard (/#/leaderboard) @quality › skip link exists and its target is on the page (2.7s)
  x   84 [mobile-chrome] › tests/page-quality.spec.ts:58:5 › leaderboard (/#/leaderboard) @quality › no critical accessibility violations (axe-core) (3.6s)
  ok  85 [mobile-chrome] › tests/page-quality.spec.ts:22:5 › hire (/#/hire) @quality › markup hygiene: title, lang, viewport, description, one h1, no overflow, alt text, names (3.2s)
  ok  86 [mobile-chrome] › tests/page-quality.spec.ts:51:5 › hire (/#/hire) @quality › skip link exists and its target is on the page (2.7s)
  ok  87 [mobile-chrome] › tests/page-quality.spec.ts:58:5 › hire (/#/hire) @quality › no critical accessibility violations (axe-core) (3.5s)
  ok  88 [mobile-chrome] › tests/page-quality.spec.ts:22:5 › 404 (/#/this-route-does-not-exist) @quality › markup hygiene: title, lang, viewport, description, one h1, no overflow, alt text, names (3.4s)
  ok  89 [mobile-chrome] › tests/page-quality.spec.ts:51:5 › 404 (/#/this-route-does-not-exist) @quality › skip link exists and its target is on the page (3.4s)
  ok  90 [mobile-chrome] › tests/page-quality.spec.ts:58:5 › 404 (/#/this-route-does-not-exist) @quality › no critical accessibility violations (axe-core) (3.3s)
    [mobile-chrome] home: content visible in 1655 ms
  ok  91 [mobile-chrome] › tests/smoke.spec.ts:19:3 › home (/) loads clean, non-blank, within 5s @core (3.1s)
    [mobile-chrome] work: content visible in 1257 ms
  ok  92 [mobile-chrome] › tests/smoke.spec.ts:19:3 › work (/#/work) loads clean, non-blank, within 5s @core (2.6s)
    [mobile-chrome] bounties: content visible in 1915 ms
  ok  93 [mobile-chrome] › tests/smoke.spec.ts:19:3 › bounties (/#/bounties) loads clean, non-blank, within 5s @core (3.2s)
    [mobile-chrome] leaderboard: content visible in 1274 ms
  ok  94 [mobile-chrome] › tests/smoke.spec.ts:19:3 › leaderboard (/#/leaderboard) loads clean, non-blank, within 5s @core (2.5s)
    [mobile-chrome] hire: content visible in 1338 ms
  ok  95 [mobile-chrome] › tests/smoke.spec.ts:19:3 › hire (/#/hire) loads clean, non-blank, within 5s @core (2.6s)
    [mobile-chrome] 404: content visible in 1269 ms
  ok  96 [mobile-chrome] › tests/smoke.spec.ts:19:3 › 404 (/#/this-route-does-not-exist) loads clean, non-blank, within 5s @core (2.6s)
    [mobile-chrome] vetted: content visible in 1778 ms
  ok  97 [mobile-chrome] › tests/smoke.spec.ts:19:3 › vetted (/#/vetted) loads clean, non-blank, within 5s @extended (3.0s)
    [mobile-chrome] radar: content visible in 1823 ms
  ok  98 [mobile-chrome] › tests/smoke.spec.ts:19:3 › radar (/#/radar) loads clean, non-blank, within 5s @extended (3.0s)
    [mobile-chrome] activity: content visible in 1774 ms
  ok  99 [mobile-chrome] › tests/smoke.spec.ts:19:3 › activity (/#/activity) loads clean, non-blank, within 5s @extended (3.0s)
    [mobile-chrome] about: content visible in 1534 ms
  ok 100 [mobile-chrome] › tests/smoke.spec.ts:19:3 › about (/#/about) loads clean, non-blank, within 5s @extended (2.8s)
    [mobile-chrome] terms: content visible in 1786 ms
  ok 101 [mobile-chrome] › tests/smoke.spec.ts:19:3 › terms (/#/terms) loads clean, non-blank, within 5s @extended (3.0s)
    [mobile-chrome] privacy: content visible in 1222 ms
  ok 102 [mobile-chrome] › tests/smoke.spec.ts:19:3 › privacy (/#/privacy) loads clean, non-blank, within 5s @extended (2.4s)
    [mobile-chrome] refunds: content visible in 1904 ms
  ok 103 [mobile-chrome] › tests/smoke.spec.ts:19:3 › refunds (/#/refunds) loads clean, non-blank, within 5s @extended (3.1s)
    [mobile-chrome] contact: content visible in 1709 ms
  ok 104 [mobile-chrome] › tests/smoke.spec.ts:19:3 › contact (/#/contact) loads clean, non-blank, within 5s @extended (2.9s)
    [mobile-chrome] premium: content visible in 2187 ms
  ok 105 [mobile-chrome] › tests/smoke.spec.ts:19:3 › premium (/#/premium) loads clean, non-blank, within 5s @extended (3.4s)
    [mobile-chrome] signin: content visible in 1290 ms
  ok 106 [mobile-chrome] › tests/smoke.spec.ts:19:3 › signin (/#/signin) loads clean, non-blank, within 5s @extended (2.5s)
  10 skipped
  96 passed (5.6m)
```
