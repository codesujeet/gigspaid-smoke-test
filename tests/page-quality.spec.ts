import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './support/fixtures';
import { waitForContent } from './support/content';
import { CORE_ROUTES } from './support/routes';

/**
 * PAGE QUALITY on the six core pages: HTML hygiene, responsive layout and accessibility.
 * Where the live site currently violates a check, the test is marked test.fail() with the reason:
 * the suite stays green, the bug stays visible, and the test turns RED the day it is fixed
 * (the cue to remove the marker).
 */
for (const route of CORE_ROUTES) {
  test.describe(`${route.name} (${route.path}) @quality`, () => {
    test.beforeEach(async ({ page }) => {
      const startedAt = Date.now();
      await page.goto(route.path, { waitUntil: 'commit' });
      const { state } = await waitForContent(page, startedAt, 10_000);
      expect(state.ready, 'page never rendered, cannot run quality checks').toBe(true);
      await page.waitForTimeout(1_200); // let text-scramble headings and lazy content settle
    });

    test('markup hygiene: title, lang, viewport, description, one h1, no overflow, alt text, names', async ({ page }) => {
      await expect.soft(page).toHaveTitle(/\S/);
      await expect.soft(page.locator('html')).toHaveAttribute('lang', /^[a-z]{2}/i);
      await expect.soft(page.locator('meta[name="viewport"]')).toHaveAttribute('content', /width=device-width/);
      await expect.soft(page.locator('meta[name="description"]')).toHaveAttribute('content', /.{20,}/);
      await expect.soft(page.locator('h1'), 'expected exactly one <h1>').toHaveCount(1);

      const overflowPx = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect.soft(overflowPx, 'page is wider than the viewport (horizontal scroll)').toBeLessThanOrEqual(1);

      const offenders = await page.evaluate(() => {
        const bad: string[] = [];
        document.querySelectorAll('img').forEach((img) => {
          if (!img.hasAttribute('alt')) bad.push(`img without alt: ${img.getAttribute('src')}`);
        });
        document.querySelectorAll('a[href], button').forEach((el) => {
          const name =
            (el.textContent ?? '').trim() ||
            el.getAttribute('aria-label') ||
            el.getAttribute('title') ||
            el.querySelector('img[alt]:not([alt=""])')?.getAttribute('alt') ||
            el.querySelector('svg title')?.textContent;
          if (!name) bad.push(`unnamed <${el.tagName.toLowerCase()}>: ${el.outerHTML.slice(0, 100)}`);
        });
        return bad;
      });
      expect.soft(offenders, 'images without alt / links and buttons without an accessible name').toEqual([]);
    });

    test('skip link exists and its target is on the page', async ({ page }) => {
      test.fail(route.name === 'home', 'Home has no "Skip to content" link and no id="main" landmark (the other pages have both).');
      const href = await page.locator('a.skip').first().getAttribute('href', { timeout: 3_000 });
      expect(href, 'no "Skip to content" link').toMatch(/^#\w+/);
      await expect(page.locator(href!), 'skip-link target is missing').toHaveCount(1);
    });

    test('no critical accessibility violations (axe-core)', async ({ page }, testInfo) => {
      test.fail(route.name === 'leaderboard', 'axe "aria-required-children" (critical): a tablist on the leaderboard has no tab children.');
      const { violations } = await new AxeBuilder({ page }).analyze();

      // Record everything so the report shows the full picture, but only gate on "critical".
      for (const v of violations) {
        testInfo.annotations.push({ type: `axe-${v.impact}`, description: `${v.id} x${v.nodes.length}` });
      }
      const critical = violations.filter((v) => v.impact === 'critical');
      expect(
        critical.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target.join(' ')}`),
        'critical accessibility violations',
      ).toEqual([]);
    });
  });
}
