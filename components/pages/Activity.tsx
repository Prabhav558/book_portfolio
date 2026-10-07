import { github } from "@/content/github";

/**
 * A year of public commits as a heat map: one column a week, one cell a day, darker where there was more.
 * It is drawn in the volume's own colour on a plate of its paper, so it reads as a plate in the book rather
 * than a screenshot of another site. The numbers come from content/github.json (see tools/github.mjs).
 */

const DAY = 864e5;
const utc = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pretty = (t: number) => `${new Date(t).getUTCDate()} ${MONTH[new Date(t).getUTCMonth()]} ${new Date(t).getUTCFullYear()}`;

type Cell = { date: string; n: number; level: number } | null;

function build() {
  const end = utc(github.to);
  const start = end - 364 * DAY;
  // columns begin on a Sunday, as on GitHub
  const first = start - new Date(start).getUTCDay() * DAY;
  const weeks = Math.floor((end - first) / (7 * DAY)) + 1;

  // levels from the busy days themselves: a quarter of them each, so a single 33-commit day does not
  // wash every ordinary day out to the palest shade
  const busy = Object.values(github.days).filter((n) => n > 0).sort((a, b) => a - b);
  const q = (p: number) => busy[Math.min(busy.length - 1, Math.floor(busy.length * p))] ?? 1;
  const [q1, q2, q3] = [q(0.5), q(0.75), q(0.92)];
  const level = (n: number) => (n <= 0 ? 0 : n <= q1 ? 1 : n <= q2 ? 2 : n <= q3 ? 3 : 4);

  const grid: Cell[][] = [];
  for (let w = 0; w < weeks; w++) {
    const col: Cell[] = [];
    for (let d = 0; d < 7; d++) {
      const t = first + (w * 7 + d) * DAY;
      if (t < start || t > end) col.push(null);
      else {
        const date = iso(t);
        const n = github.days[date] ?? 0;
        col.push({ date, n, level: level(n) });
      }
    }
    grid.push(col);
  }

  let total = 0;
  let peak = 0;
  let best = 0;
  let run = 0;
  for (let t = start; t <= end; t += DAY) {
    const n = github.days[iso(t)] ?? 0;
    total += n;
    peak = Math.max(peak, n);
    run = n > 0 ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return { grid, total, peak, best, end };
}

const Mark = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.55v-2.1c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.76 2.68 1.25 3.34.95.1-.74.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.25.45-2.28 1.18-3.08-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.62 1.59.23 2.76.11 3.05.74.8 1.18 1.83 1.18 3.08 0 4.41-2.69 5.38-5.25 5.67.41.36.78 1.05.78 2.13v3.16c0 .3.21.66.8.55A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z" />
  </svg>
);

export function Activity() {
  const { grid, total, peak, best, end } = build();
  // a month's name goes over the first column it begins in, and not closer than three columns to the last one
  let prev = -1;
  let last = -9;
  const labels = grid.map((col, w) => {
    const c = col.find(Boolean);
    if (!c) return "";
    const m = Number(c.date.slice(5, 7));
    if (m === prev) return "";
    prev = m;
    if (w - last < 3) return "";
    last = w;
    return MONTH[m - 1];
  });
  const empty = total === 0;
  return (
    <div className="flex h-full flex-col justify-between">
      <div className="t-meta flex justify-between">
        <span>Open work</span>
        <span>Synced {pretty(end)}</span>
      </div>

      <div className="gh">
        <div className="gh-head">
          <span className="gh-avatar">
            <Mark />
          </span>
          <span className="gh-who">
            <b>@{github.user}</b>
            <i>Last 365 days · public commits</i>
          </span>
        </div>

        <dl className="gh-stats">
          <div>
            <dd>{total}</dd>
            <dt>Contributions</dt>
          </div>
          <div>
            <dd>{best}</dd>
            <dt>Best streak</dt>
          </div>
          <div>
            <dd>{peak}</dd>
            <dt>Peak / day</dt>
          </div>
        </dl>

        <div className="gh-map" role="img" aria-label={`${total} public contributions in the last year, best streak ${best} days, busiest day ${peak}.`}>
          {grid.map((col, w) => {
            return (
              <div key={w} className="gh-week">
                <span className="gh-month">{labels[w]}</span>
                {col.map((c, d) =>
                  c ? (
                    <i key={d} className="gh-day" data-l={c.level} title={`${c.n} contribution${c.n === 1 ? "" : "s"} on ${pretty(utc(c.date))}`} />
                  ) : (
                    <i key={d} className="gh-day gh-day--none" />
                  ),
                )}
              </div>
            );
          })}
        </div>

        <div className="gh-foot">
          <span>{empty ? "Fills in on the next deploy" : "Public commits only"}</span>
          <span className="gh-legend" aria-hidden>
            less
            {[0, 1, 2, 3, 4].map((l) => (
              <i key={l} className="gh-day" data-l={l} />
            ))}
            more
          </span>
        </div>
      </div>

      <a href={`https://github.com/${github.user}`} target="_blank" rel="noreferrer" className="link link--up w-fit">
        github.com/{github.user}
        <span className="sr-only"> (opens in a new tab)</span>
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M5 11l6-6M6 5h5v5" />
        </svg>
      </a>
    </div>
  );
}
