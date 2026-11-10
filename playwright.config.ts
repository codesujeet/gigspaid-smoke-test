import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './tests',
  timeout: 45_000,
  expect: { timeout: 7_000 },
  forbidOnly: isCI, // a stray test.only must never reach CI
  retries: 0, // no retries: a flaky page should show up as a failure, not be hidden
  // One worker on purpose: the 5s check is a timing measurement, and several browsers
  // loading at once on one machine inflates it (we saw false 11s readings with 12 in parallel).
  workers: 1,
  reporter: isCI ? [['github'], ['list'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.BASE_URL ?? 'https://gigspaid.com',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop-chrome', use: { ...devices['Desktop Chrome'] } },
    // Pixel 7 is a Chromium-based mobile profile (412x915, touch, mobile UA)
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
  ],
});
