import { test, expect, describeProblems } from './support/fixtures';
import { waitForContent } from './support/content';
import { ALL_ROUTES, CORE_ROUTES, LOAD_BUDGET_MS, SETTLE_MS } from './support/routes';

/**
 * CORE SMOKE TEST (the brief): for every public page, on desktop Chrome and a mobile viewport,
 * fail if the page
 *   1. throws a console error (also: uncaught exception, failed request, any 4xx/5xx),
 *   2. shows a blank main area (splash still up, no <h1>, almost no text), or
 *   3. takes over 5 seconds to show content (clock starts at the beginning of navigation).
 *
 * CORE_ROUTES carry a copy marker proving the *right* page rendered; the secondary pages
 * (footer/header links) get the same three checks without one.
 */
for (const route of ALL_ROUTES) {
  const isCore = CORE_ROUTES.includes(route);
  const tag = isCore ? '@core' : '@extended';

  test(`${route.name} (${route.path}) loads clean, non-blank, within ${LOAD_BUDGET_MS / 1000}s ${tag}`, async ({ page, problems }, testInfo) => {
    // Timing: start the clock before navigation so network + render are both counted.
    const startedAt = Date.now();
    await page.goto(route.path, { waitUntil: 'commit' });
    const { elapsedMs, state } = await waitForContent(page, startedAt);

    testInfo.annotations.push({ type: 'time-to-content', description: `${elapsedMs} ms` });
    console.log(`    [${testInfo.project.name}] ${route.name}: content visible in ${elapsedMs} ms`);

    // Soft assertions: one failure reports timing AND blank-page state together.
    // --- check 2: blank main area ---
    expect.soft(state.splashStillShown, 'boot splash is still showing (app never rendered)').toBe(false);
    expect.soft(state.hasH1, 'page has no <h1>').toBe(true);
    expect.soft(state.ready, `content area is blank (only ${state.chars} chars of text)`).toBe(true);
    if (route.marker) {
      await expect.soft(page.locator('#root'), 'wrong page rendered').toContainText(route.marker, { timeout: 1_000 });
    }

    // --- check 3: speed ---
    expect.soft(elapsedMs, `content took ${elapsedMs} ms (budget ${LOAD_BUDGET_MS} ms)`).toBeLessThan(LOAD_BUDGET_MS);

    // --- check 1: errors (keep listening a moment so late errors are caught) ---
    await page.waitForTimeout(SETTLE_MS);
    expect.soft(problems, describeProblems(route.path, problems)).toEqual([]);
  });
}
