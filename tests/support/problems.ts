import type { Page } from '@playwright/test';

/**
 * The only tolerated error: GET /api/me -> 401. The app asks "who am I?" on every load and an
 * anonymous visitor correctly gets 401; Chrome logs that as a console error. Matched on exact URL
 * path + status, so a 401/500 anywhere else, or any other console error, still fails.
 */
export function isExpectedAnonymous401(url: string, status?: number): boolean {
  try {
    return new URL(url).pathname === '/api/me' && (status === undefined || status === 401);
  } catch {
    return false;
  }
}

/**
 * Collects everything that should fail a smoke test: console errors, uncaught exceptions,
 * failed requests and any HTTP 4xx/5xx. Attach BEFORE navigating.
 */
export function watchForProblems(page: Page): string[] {
  const problems: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    if (isExpectedAnonymous401(msg.location().url) && /\b401\b/.test(msg.text())) return;
    problems.push(`console.error: ${msg.text()} (${msg.location().url})`);
  });
  page.on('pageerror', (err) => problems.push(`uncaught exception: ${err.message}`));
  page.on('response', (res) => {
    if (res.status() >= 400 && !isExpectedAnonymous401(res.url(), res.status())) {
      problems.push(`HTTP ${res.status()}: ${res.request().method()} ${res.url()}`);
    }
  });
  page.on('requestfailed', (req) => {
    const reason = req.failure()?.errorText ?? 'unknown';
    if (reason.includes('ERR_ABORTED')) return; // the browser cancelling its own request, not a failure
    problems.push(`request failed: ${req.url()} (${reason})`);
  });

  return problems;
}
