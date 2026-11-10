import { test as base, expect } from '@playwright/test';
import { watchForProblems } from './problems';

/**
 * `test` with a `problems` fixture: console errors, exceptions and failed/4xx/5xx requests are
 * collected from the first navigation. Tests assert `expect(problems).toEqual([])` when done.
 */
export const test = base.extend<{ problems: string[] }>({
  problems: async ({ page }, use) => {
    await use(watchForProblems(page));
  },
});

export { expect };

export function describeProblems(path: string, problems: string[]): string {
  return `problems found on ${path}:\n${problems.join('\n')}`;
}
