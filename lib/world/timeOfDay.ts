import type { Period } from "./types";

/**
 * Local time of day for the background. It reads the browser's own timezone and clock (no location
 * is asked for), blends smoothly between periods, and keeps itself up to date while the page stays open.
 * The five hours are the starts of each period; `blend` is how many hours each change takes, either side.
 */
export type TodConfig = { dawn: number; morning: number; day: number; evening: number; night: number; blend: number };
export const DEFAULT_TOD: TodConfig = { dawn: 5, morning: 7, day: 10, evening: 17, night: 20, blend: 0.75 };

export type Tod = {
  period: Period;
  /** Hours since midnight in the viewer's timezone. */
  hour: number;
  tz: string;
  /** 0 = full daylight … 1 = deepest night. */
  dim: number;
  /** 0 … 1: how warm the light is. */
  warm: number;
  /** 0 … 1: how brightly the lamps burn. */
  lamps: number;
  /** 0 … 1: how busy people are (speed, how often they stop). */
  activity: number;
  /** 0 … 1: what share of the people are about. */
  present: number;
  /** The tint laid over the floor: r, g, b, alpha. */
  wash: [number, number, number, number];
};

type Level = { dim: number; warm: number; lamps: number; activity: number; present: number };
const LEVEL: Record<Period, Level> = {
  NIGHT: { dim: 1, warm: 0.55, lamps: 1, activity: 0.55, present: 0.5 },
  DAWN: { dim: 0.25, warm: 0.9, lamps: 0.35, activity: 0.6, present: 0.7 },
  MORNING: { dim: 0, warm: 0.25, lamps: 0, activity: 0.9, present: 1 },
  DAY: { dim: 0, warm: 0, lamps: 0, activity: 1, present: 1 },
  EVENING: { dim: 0.35, warm: 1, lamps: 0.75, activity: 0.8, present: 0.85 },
};

const smooth = (t: number) => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const mixLevel = (a: Level, b: Level, t: number): Level => ({
  dim: mix(a.dim, b.dim, t),
  warm: mix(a.warm, b.warm, t),
  lamps: mix(a.lamps, b.lamps, t),
  activity: mix(a.activity, b.activity, t),
  present: mix(a.present, b.present, t),
});

/** 0 before the boundary `b` (in hours), 1 after it, easing across `bw` hours either side. Within one day: night is simply what the
 *  day starts and ends in, so no boundary has to wrap past midnight. */
const across = (h: number, b: number, bw: number) => smooth((h - b + bw) / (2 * bw));

export function periodAt(h: number, c: TodConfig): Period {
  if (h >= c.night || h < c.dawn) return "NIGHT";
  if (h >= c.evening) return "EVENING";
  if (h >= c.day) return "DAY";
  if (h >= c.morning) return "MORNING";
  return "DAWN";
}

export function todAt(h: number, c: TodConfig, tz: string): Tod {
  let v = LEVEL.NIGHT;
  v = mixLevel(v, LEVEL.DAWN, across(h, c.dawn, c.blend));
  v = mixLevel(v, LEVEL.MORNING, across(h, c.morning, c.blend));
  v = mixLevel(v, LEVEL.DAY, across(h, c.day, c.blend));
  v = mixLevel(v, LEVEL.EVENING, across(h, c.evening, c.blend));
  v = mixLevel(v, LEVEL.NIGHT, across(h, c.night, c.blend));
  // the floor is tinted, never blacked out: a warm amber for dusk and dawn, a warm brown for night
  const aDark = 0.2 * v.dim;
  const aWarm = 0.1 * v.warm * (1 - 0.55 * v.dim);
  const a = aDark + aWarm;
  const k = a > 0 ? aDark / a : 0;
  const wash: Tod["wash"] = [mix(255, 58, k), mix(198, 44, k), mix(138, 34, k), a];
  return { period: periodAt(h, c), hour: h, tz, ...v, wash };
}

/** Hours since midnight in the given timezone. */
function hourIn(tz: string): number {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", { hour: "numeric", minute: "numeric", hourCycle: "h23", timeZone: tz }).formatToParts(new Date());
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
    return (get("hour") % 24) + get("minute") / 60;
  } catch {
    const d = new Date();
    return d.getHours() + d.getMinutes() / 60;
  }
}

/** `?worldTime=21` or `?worldTime=21:30` pins the clock (for looking at a time of day without waiting for it). */
function pinned(): number | null {
  if (typeof location === "undefined") return null;
  const q = new URLSearchParams(location.search).get("worldTime");
  if (!q) return null;
  const [h, m] = q.split(":");
  const v = Number(h) + (m ? Number(m) / 60 : 0);
  return Number.isFinite(v) ? ((v % 24) + 24) % 24 : null;
}

export class TimeOfDay {
  readonly tz: string;
  cfg: TodConfig;
  cur: Tod;
  private override: number | null = pinned();
  private timer = 0;
  private listeners = new Set<(t: Tod) => void>();
  private css = "";

  constructor(cfg: Partial<TodConfig> = {}) {
    this.tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    this.cfg = { ...DEFAULT_TOD, ...cfg };
    this.cur = todAt(this.hour(), this.cfg, this.tz);
    this.apply();
  }

  hour() {
    return this.override ?? hourIn(this.tz);
  }

  /** Pin the hour (0–24), or pass null to follow the clock again. */
  setOverride(h: number | null) {
    this.override = h === null ? null : ((h % 24) + 24) % 24;
    this.update(true);
  }

  onChange(fn: (t: Tod) => void) {
    this.listeners.add(fn);
    return () => void this.listeners.delete(fn);
  }

  /** Re-read the clock. Cheap; listeners hear about it only when something moved enough to see. */
  update(force = false) {
    const next = todAt(this.hour(), this.cfg, this.tz);
    const p = this.cur;
    const moved =
      force ||
      next.period !== p.period ||
      Math.abs(next.dim - p.dim) > 0.004 ||
      Math.abs(next.warm - p.warm) > 0.004 ||
      Math.abs(next.lamps - p.lamps) > 0.004 ||
      Math.abs(next.present - p.present) > 0.004;
    this.cur = next;
    if (!moved) return;
    this.apply();
    this.listeners.forEach((f) => f(next));
  }

  /** Check twice a minute, and straight away when the tab comes back. */
  start() {
    if (this.timer) return;
    this.timer = window.setInterval(() => this.update(), 30000);
    document.addEventListener("visibilitychange", this.visible);
  }
  stop() {
    window.clearInterval(this.timer);
    this.timer = 0;
    document.removeEventListener("visibilitychange", this.visible);
  }
  private visible = () => {
    if (!document.hidden) this.update();
  };

  /** The atmosphere as CSS variables, for anything on the page that wants to follow it. */
  private apply() {
    if (typeof document === "undefined") return;
    const t = this.cur;
    const [r, g, b, a] = t.wash;
    const css = `${t.period}|${a.toFixed(3)}|${t.lamps.toFixed(2)}|${t.present.toFixed(2)}`;
    if (css === this.css) return;
    this.css = css;
    const s = document.documentElement.style;
    s.setProperty("--world-bg", `rgba(${r | 0}, ${g | 0}, ${b | 0}, ${a.toFixed(3)})`);
    s.setProperty("--world-light", (1 - t.dim).toFixed(3));
    s.setProperty("--world-shadow", `rgba(40, 32, 22, ${(0.1 + 0.08 * t.warm).toFixed(3)})`);
    s.setProperty("--world-accent", `rgba(255, 196, 120, ${(0.8 * t.lamps).toFixed(3)})`);
    s.setProperty("--world-opacity", t.present.toFixed(3));
    document.documentElement.dataset.period = t.period.toLowerCase();
  }
}
