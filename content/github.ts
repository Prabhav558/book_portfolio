import raw from "./github.json";

/**
 * Public contributions for the last 365 days, as a sparse map of date → count. The file is refreshed by
 * `node tools/github.mjs`, which the deploy workflow runs before every build, so the page is never live data
 * in the browser (nothing is fetched, nothing can fail, no token is shipped).
 */
export const github = {
  user: raw.user,
  /** The last day the calendar covers (YYYY-MM-DD). */
  to: raw.to,
  days: raw.days as Record<string, number>,
};
