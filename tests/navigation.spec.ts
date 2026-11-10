import { test, expect, describeProblems } from './support/fixtures';
import { waitForContent } from './support/content';
import { LOAD_BUDGET_MS, SETTLE_MS } from './support/routes';

/**
 * NAVIGATION: moving around the SPA like a visitor does (clicks, back/forward, reload).
 * Footer links are used because they are visible on both desktop and mobile; the header nav is
 * hidden behind a different mobile layout, so it is checked on desktop only.
 */

/** Distinct hash targets linked from the footer. */
const FOOTER_TARGETS = [
  'work', 'bounties', 'leaderboard', 'hire', 'vetted', 'radar',
  'activity', 'about', 'terms', 'privacy', 'refunds', 'contact', 'premium',
];

test.describe('navigation @navigation', () => {
  test('every footer link opens a rendered page within budget, with no errors', async ({ page, problems }) => {
    await page.goto('/');
    await waitForContent(page, Date.now());

    for (const slug of FOOTER_TARGETS) {
      await test.step(`footer → #/${slug}`, async () => {
        const startedAt = Date.now();
        await page.locator(`footer a[href="#/${slug}"]`).first().click();
        await expect(page).toHaveURL(new RegExp(`#/${slug}$`));
        await expect(page.locator('main h1'), `#/${slug} has no visible heading`).toBeVisible({ timeout: LOAD_BUDGET_MS });
        const { elapsedMs, state } = await waitForContent(page, startedAt);
        expect.soft(state.ready, `#/${slug} content area is blank`).toBe(true);
        expect.soft(elapsedMs, `#/${slug} took ${elapsedMs} ms after the click`).toBeLessThan(LOAD_BUDGET_MS);
      });
    }

    await page.waitForTimeout(SETTLE_MS);
    expect(problems, describeProblems('footer navigation', problems)).toEqual([]);
  });

  test('desktop header nav and logo work', async ({ page, problems, isMobile }) => {
    test.skip(isMobile, 'Header links are replaced by a different nav on mobile viewports');
    await page.goto('/');
    await waitForContent(page, Date.now());

    for (const [label, slug] of [['Jobs', 'work'], ['Bounties', 'bounties'], ['Leaderboard', 'leaderboard'], ['Hire coders', 'hire']]) {
      await page.locator('header').getByRole('link', { name: label, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`#/${slug}$`));
      await expect(page.locator('main h1')).toBeVisible();
    }

    await page.locator('header a[href="#/"]').first().click(); // logo → home
    await expect(page.locator('h1')).toBeVisible();
    expect(page.url()).toMatch(/\/(#\/?)?$/);
    expect(problems, describeProblems('header navigation', problems)).toEqual([]);
  });

  test('back and forward buttons restore pages', async ({ page, problems }) => {
    await page.goto('/#/work');
    await waitForContent(page, Date.now());
    await page.locator('footer a[href="#/bounties"]').first().click();
    await expect(page).toHaveURL(/#\/bounties$/);
    await expect(page.locator('main')).toContainText(/Open-source issues with money on them/i);

    await page.goBack();
    await expect(page).toHaveURL(/#\/work$/);
    await expect(page.locator('main')).toContainText(/Tap Claim and the job is yours/i);

    await page.goForward();
    await expect(page).toHaveURL(/#\/bounties$/);
    await expect(page.locator('main')).toContainText(/Open-source issues with money on them/i);
    expect(problems, describeProblems('back/forward', problems)).toEqual([]);
  });

  test('reloading a deep link keeps the same page', async ({ page, problems }) => {
    await page.goto('/#/leaderboard');
    await waitForContent(page, Date.now());
    await page.reload();
    const { state } = await waitForContent(page, Date.now());
    expect(state.ready, 'blank after reload').toBe(true);
    await expect(page).toHaveURL(/#\/leaderboard$/);
    await expect(page.locator('main')).toContainText(/Real money, paid for real work/i);
    await page.waitForTimeout(SETTLE_MS);
    expect(problems, describeProblems('reload', problems)).toEqual([]);
  });

  test('404 page offers a way back: "Browse paid work" and "Post a job"', async ({ page }) => {
    await page.goto('/#/this-route-does-not-exist');
    await waitForContent(page, Date.now());
    const main = page.locator('main');
    await expect(main).toContainText(/Or it never existed/i);

    await main.getByRole('link', { name: 'Browse paid work' }).click();
    await expect(page).toHaveURL(/#\/work$/);

    await page.goto('/#/this-route-does-not-exist');
    await waitForContent(page, Date.now());
    await main.getByRole('link', { name: 'Post a job' }).first().click();
    await expect(page).toHaveURL(/#\/hire$/);
  });

  test('the footer contact link is a valid mailto', async ({ page }) => {
    await page.goto('/');
    await waitForContent(page, Date.now());
    await expect(page.locator('footer a[href^="mailto:"]').first()).toHaveAttribute('href', /^mailto:[^@\s]+@[^@\s]+\.[a-z]{2,}$/i);
  });
});

test.describe('listings show real data @content', () => {
  for (const [slug, what] of [['work', 'jobs'], ['bounties', 'bounties']] as const) {
    test(`#/${slug} shows listings with prices (${what})`, async ({ page, problems }) => {
      await page.goto(`/#/${slug}`);
      await waitForContent(page, Date.now());
      // Prices live in plain spans/divs (not always inside links), so match on the text of <main>.
      await expect(page.locator('main'), `no priced ${what} listed`).toContainText(/\$\d/, { timeout: LOAD_BUDGET_MS });
      expect(problems, describeProblems(`/#/${slug}`, problems)).toEqual([]);
    });
  }

  test('#/work category tabs switch without breaking the page', async ({ page, problems }) => {
    await page.goto('/#/work');
    await waitForContent(page, Date.now());
    const tabs = page.getByRole('tab');
    expect(await tabs.count(), 'expected category tabs').toBeGreaterThan(1);

    const second = tabs.nth(1);
    await second.click();
    await expect(second).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('main h1')).toBeVisible();

    await tabs.first().click(); // back to "All"
    await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');
    await page.waitForTimeout(SETTLE_MS);
    expect(problems, describeProblems('/#/work tabs', problems)).toEqual([]);
  });
});
