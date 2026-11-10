/** Routes under test. `marker` is stable body copy (headings animate, so never match on h1 text). */
export type Route = { name: string; path: string; marker?: RegExp };

/** The six pages the brief asks for. */
export const CORE_ROUTES: Route[] = [
  { name: 'home', path: '/', marker: /Paid tech work/i },
  { name: 'work', path: '/#/work', marker: /Tap Claim and the job is yours/i },
  { name: 'bounties', path: '/#/bounties', marker: /Open-source issues with money on them/i },
  { name: 'leaderboard', path: '/#/leaderboard', marker: /Real money, paid for real work/i },
  { name: 'hire', path: '/#/hire', marker: /Put a price on the work/i },
  // The SPA's in-app 404 page (unknown hash route).
  { name: '404', path: '/#/this-route-does-not-exist', marker: /Or it never existed/i },
];

/** Other public pages linked from the footer / header. Same checks, no copy marker. */
export const SECONDARY_ROUTES: Route[] = [
  'vetted',
  'radar',
  'activity',
  'about',
  'terms',
  'privacy',
  'refunds',
  'contact',
  'premium',
  'signin',
].map((slug) => ({ name: slug, path: `/#/${slug}` }));

export const ALL_ROUTES: Route[] = [...CORE_ROUTES, ...SECONDARY_ROUTES];

/** Content must be visible within this long, measured from the start of navigation. */
export const LOAD_BUDGET_MS = 5_000;
/** Keep listening after content appears so late/async errors are still caught. */
export const SETTLE_MS = 1_000;
/** "Not blank" threshold: characters of text in the content area. */
export const MIN_CONTENT_CHARS = 20;
