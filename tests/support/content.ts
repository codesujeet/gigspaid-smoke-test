import type { Page } from '@playwright/test';
import { LOAD_BUDGET_MS, MIN_CONTENT_CHARS } from './routes';

export type ContentState = {
  ready: boolean;
  splashStillShown: boolean;
  hasH1: boolean;
  chars: number;
};

/**
 * Runs IN THE BROWSER. Has the app replaced the boot splash with real content?
 * Content area = <main> if the page has one, else the <section> holding the h1
 * (the home page has no <main>).
 */
export function readContent(minChars: number): ContentState {
  const splash = document.querySelector('#root img[alt="GigsPaid"]');
  const h1 = document.querySelector('h1');
  const area = document.querySelector('main') ?? h1?.closest('section') ?? null;
  const text = area instanceof HTMLElement ? area.innerText.trim() : '';
  const box = h1?.getBoundingClientRect();
  return {
    ready: !splash && !!h1 && !!box && box.height > 0 && text.length >= minChars,
    splashStillShown: !!splash,
    hasH1: !!h1,
    chars: text.length,
  };
}

/**
 * Polls until content is visible or the budget (counted from `startedAt`) runs out.
 * Never throws: returns the final state and elapsed time so the caller can assert with good messages.
 */
export async function waitForContent(
  page: Page,
  startedAt: number,
  budgetMs = LOAD_BUDGET_MS,
): Promise<{ elapsedMs: number; state: ContentState }> {
  let state: ContentState = { ready: false, splashStillShown: true, hasH1: false, chars: 0 };
  while (Date.now() - startedAt < budgetMs) {
    try {
      state = await page.evaluate(readContent, MIN_CONTENT_CHARS);
      if (state.ready) break;
    } catch {
      // navigation in progress (execution context destroyed): just poll again
    }
    await page.waitForTimeout(50);
  }
  const elapsedMs = Date.now() - startedAt;
  try {
    state = await page.evaluate(readContent, MIN_CONTENT_CHARS);
  } catch {
    /* keep last known state */
  }
  return { elapsedMs, state };
}
