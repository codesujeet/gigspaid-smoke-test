import { test, expect } from '@playwright/test';
import { LOAD_BUDGET_MS } from './support/routes';

/**
 * NETWORK & ASSETS: raw HTTP checks (no browser rendering), so they run only once, on desktop.
 * Protocol checks need the real production host and are skipped for any other BASE_URL.
 */
test.describe('network & assets @network', () => {
  test.skip(({ isMobile }) => isMobile, 'HTTP-level checks do not depend on viewport');

  test('HTML is served over HTTPS with gzip and basic security headers', async ({ request }) => {
    const res = await request.get('/');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('text/html');
    expect(res.headers()['content-encoding'], 'HTML should be compressed').toMatch(/gzip|br|zstd/);
    expect(res.headers()['strict-transport-security'], 'HSTS header').toMatch(/max-age=\d+/);
    expect(res.headers()['x-content-type-options']).toBe('nosniff');
  });

  test('plain http:// redirects to https://', async ({ request, baseURL }) => {
    test.skip(baseURL !== 'https://gigspaid.com', 'production host only');
    const res = await request.get('http://gigspaid.com/', { maxRedirects: 0 });
    expect([301, 302, 307, 308]).toContain(res.status());
    expect(res.headers()['location']).toMatch(/^https:\/\/gigspaid\.com\/?$/);
  });

  test('PWA manifest is valid JSON with a name and icons', async ({ request }) => {
    const res = await request.get('/manifest.webmanifest');
    expect(res.status()).toBe(200);
    const manifest = await res.json();
    expect(manifest.name ?? manifest.short_name).toBeTruthy();
    expect(Array.isArray(manifest.icons) && manifest.icons.length).toBeGreaterThan(0);
  });

  for (const [path, type] of [
    ['/logo.svg', 'image/svg+xml'],
    ['/icons/icon-512.png', 'image/png'],
    ['/icons/apple-touch-icon.png', 'image/png'],
    ['/icons/favicon-32.png', 'image/png'],
  ] as const) {
    test(`static asset ${path} is served as ${type}`, async ({ request }) => {
      const res = await request.get(path);
      expect(res.status()).toBe(200);
      expect(res.headers()['content-type']).toContain(type);
      expect((await res.body()).length).toBeGreaterThan(100);
    });
  }

  test('every script and stylesheet referenced by index.html loads (no broken bundle)', async ({ request }) => {
    const html = await (await request.get('/')).text();
    const assets = [...html.matchAll(/(?:src|href)="(\.\/assets\/[^"]+)"/g)].map((m) => m[1].replace(/^\.\//, '/'));
    expect(assets.length, 'index.html references no bundles').toBeGreaterThan(0);
    for (const asset of assets) {
      const res = await request.get(asset);
      expect(res.status(), asset).toBe(200);
    }
  });

  test('anonymous GET /api/me answers 401 as JSON (not a 5xx or an HTML page)', async ({ request }) => {
    const started = Date.now();
    const res = await request.get('/api/me');
    expect(res.status()).toBe(401);
    expect(res.headers()['content-type']).toContain('application/json');
    expect(Date.now() - started, 'API too slow').toBeLessThan(LOAD_BUDGET_MS);
  });
});

/**
 * KNOWN SITE BUG (tracked, not hidden): a *path* 404 such as /no-such-page/ never renders.
 * index.html references assets relatively (./assets/...), so on a nested path they resolve to
 * /no-such-page/assets/... which 404, and the visitor is stuck on the boot splash forever.
 * test.fail() keeps the suite green while the bug exists and turns it RED once it is fixed.
 */
test('known bug: unknown PATH (/no-such-page/) should render a 404 page but sticks on the splash', async ({ page }) => {
  test.fail(true, 'Relative asset URLs break on nested paths, so the app never boots');
  test.setTimeout(15_000);
  await page.goto('/no-such-page/', { waitUntil: 'commit' });
  await expect(page.locator('h1').first()).toBeVisible({ timeout: LOAD_BUDGET_MS });
});
