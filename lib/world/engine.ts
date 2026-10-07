import { drawLamps, drawStatic, layoutScene, type Layout } from "./environment";
import { drawFigure } from "./figures";
import { Interaction } from "./interaction";
import { makeNPCs, pickTarget, stepNPC, type NPC, type WorldCtx } from "./npc";
import { clamp, pushOut, separate } from "./physics";
import { TimeOfDay } from "./timeOfDay";
import type { BookEvent, KeepOut, Period, Rect, SceneName } from "./types";

/**
 * The room around the book. One canvas, one loop, no React: the page hands it a canvas and a few facts
 * about the book (where it is, what it is doing), and the people, the furniture and the light look after
 * themselves. Desktop gets the whole of it; a phone gets a few slow figures and the light.
 *
 *   pause() / resume()          the loop (it also stops by itself when the tab is hidden)
 *   setScene(name)              which room
 *   setIntensity(0…1)           how much of it shows
 *   setTimeOfDay(hour|period|null)   pin the light, or follow the clock again
 *   setBookBounds(rect|null)    the book, which people walk round
 *   setKeepOut(name, rect|null) other things in the way (the shelf)
 *   notifyBook(event)           the book opened, went to the shelf, closed, turned a page
 */

const HOUR_OF: Record<Period, number> = { DAWN: 6, MORNING: 8.5, DAY: 13, EVENING: 18.5, NIGHT: 23 };

function mulberry(seed: number) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type WorldMode = "desktop" | "tablet" | "mobile";

export class WorldEngine {
  readonly tod: TimeOfDay;
  private canvas: HTMLCanvasElement;
  private c: CanvasRenderingContext2D;
  private env = document.createElement("canvas");
  private W = 0;
  private H = 0;
  private dpr = 1;
  private unit = 1;
  private mode: WorldMode = "desktop";
  private layout: Layout = { props: [], zones: [], lamps: [] };
  private scene: SceneName = "library";
  private npcs: NPC[] = [];
  private order: NPC[] = [];
  private world: WorldCtx;
  private inter: Interaction;
  private keeps = new Map<string, KeepOut>();
  private book: Rect | null = null;
  private bookTo: Rect | null = null;
  private raf = 0;
  /** Whether the room has been shown yet. */
  private live = false;
  private paused = true;
  private last = 0;
  private acc = 0;
  private time = 0;
  private alpha = 0;
  private intensity = 1;
  private slowUntil = 0;
  private eventId = 0;
  private cost = 0;
  private lowRate = false;
  private parity = 0;
  private reduced = false;
  private envDirty = true;
  private offTod = () => {};
  private rm: MediaQueryList;

  constructor(canvas: HTMLCanvasElement, opts: { scene?: SceneName } = {}) {
    this.canvas = canvas;
    this.c = canvas.getContext("2d", { alpha: true })!;
    this.scene = opts.scene ?? "library";
    this.tod = new TimeOfDay();
    this.rm = window.matchMedia("(prefers-reduced-motion: reduce)");
    this.reduced = this.rm.matches;
    const rand = mulberry(Date.now() & 0xffffff);
    this.world = {
      W: 0,
      H: 0,
      bounds: { x: 0, y: 0, w: 0, h: 0 },
      keep: [],
      zones: [],
      npcs: this.npcs,
      pointer: { x: -999, y: -999, vx: 0, vy: 0, on: false },
      book: null,
      slow: 1,
      activity: 1,
      present: 0,
      reactive: false,
      still: this.reduced,
      rand,
    };
    this.inter = new Interaction(this.world, () => this.wake());
    this.world.pointer = this.inter.pointer;
    this.resize();
    this.offTod = this.tod.onChange(() => {
      this.envDirty = true;
      if (this.reduced || this.paused) this.drawOnce();
    });
    this.tod.start();
    window.addEventListener("resize", this.onResize);
    document.addEventListener("visibilitychange", this.onVisible);
    this.rm.addEventListener("change", this.onMotion);
    (window as unknown as { __world?: WorldEngine }).__world = this;
    this.drawOnce();
  }

  // ───────── the page's side ─────────

  pause() {
    this.paused = true;
    this.stopLoop();
  }
  resume() {
    this.paused = false;
    this.live = true;
    this.wake();
  }
  setScene(scene: SceneName) {
    if (scene === this.scene) return;
    this.scene = scene;
    this.build();
  }
  setIntensity(v: number) {
    this.intensity = clamp(v, 0, 1);
    this.wake();
  }
  setTimeOfDay(v: number | Period | null) {
    this.tod.setOverride(v === null ? null : typeof v === "string" ? HOUR_OF[v] : v);
  }
  /** The book's box on the screen. People walk round it. It grows and shrinks smoothly. */
  setBookBounds(r: Rect | null, instant = false) {
    this.bookTo = r;
    if (instant || !this.book || !r) this.book = r ? { ...r } : null;
    this.syncKeep();
    this.wake();
  }
  setKeepOut(name: string, r: Rect | null, pad = 12) {
    if (r) this.keeps.set(name, { rect: r, pad });
    else this.keeps.delete(name);
    this.syncKeep();
  }
  notifyBook(ev: BookEvent) {
    const w = this.world;
    const now = this.time;
    if (ev === "open") {
      // somebody notices; a couple of others stop for a moment; the room goes quiet for a few seconds
      this.eventId++;
      this.slowUntil = now + 6;
      const b = this.bookTo ?? this.book;
      if (!b || w.still) return;
      const cx = b.x + b.w / 2;
      const cy = b.y + b.h / 2;
      const near = this.npcs
        .filter((n) => !n.away && !n.leaving && n.state !== "DRAGGED" && n.state !== "SITTING")
        .sort((p, q) => Math.hypot(p.x - cx, p.y - cy) - Math.hypot(q.x - cx, q.y - cy));
      near.slice(0, 2).forEach((n, i) => {
        n.state = "LOOKING";
        n.stateT = 2.4 + i * 1.1 + w.rand() * 1.5;
        n.lookX = cx;
        n.lookY = cy;
        n.noticed = this.eventId;
        n.react = 0.5;
      });
      near.slice(2, 4).forEach((n) => {
        n.state = "PAUSED";
        n.stateT = 1.2 + w.rand() * 1.2;
      });
    } else if (ev === "close") {
      this.slowUntil = 0;
      for (const n of this.npcs) if (n.state === "LOOKING" && n.noticed === this.eventId) n.stateT = Math.min(n.stateT, 0.6);
    } else if (ev === "shelf") {
      this.slowUntil = Math.max(this.slowUntil, now + 2);
    }
    // a page turn changes nothing: the room carries on
  }
  stats() {
    return { mode: this.mode, people: this.npcs.length, present: this.world.present, lowRate: this.lowRate, costMs: this.cost, running: !!this.raf, reduced: this.reduced, period: this.tod.cur.period };
  }
  destroy() {
    this.stopLoop();
    this.inter.detach();
    this.tod.stop();
    this.offTod();
    window.removeEventListener("resize", this.onResize);
    document.removeEventListener("visibilitychange", this.onVisible);
    this.rm.removeEventListener("change", this.onMotion);
    const g = window as unknown as { __world?: WorldEngine };
    if (g.__world === this) delete g.__world;
  }

  // ───────── set-up ─────────

  private onResize = () => {
    window.clearTimeout(this.rz);
    this.rz = window.setTimeout(() => this.resize(), 120);
  };
  private rz = 0;
  private onVisible = () => {
    if (document.hidden) this.stopLoop();
    else if (!this.paused) this.wake();
  };
  private onMotion = () => {
    this.reduced = this.rm.matches;
    this.world.still = this.reduced;
    if (this.reduced) this.placeStill();
    this.wake();
  };

  private resize() {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    this.mode = fine && W >= 900 ? "desktop" : W >= 600 ? "tablet" : "mobile";
    this.W = W;
    this.H = H;
    this.dpr = Math.min(window.devicePixelRatio || 1, this.mode === "mobile" ? 1.5 : 2);
    for (const cv of [this.canvas, this.env]) {
      cv.width = Math.floor(W * this.dpr);
      cv.height = Math.floor(H * this.dpr);
    }
    this.unit = clamp(Math.min(W, H * 1.4) / 1000, 0.55, 1.25) * (this.mode === "mobile" ? 0.82 : 1);
    this.world.W = W;
    this.world.H = H;
    this.world.reactive = this.mode === "desktop";
    this.world.bounds = { x: 16, y: 64, w: W - 32, h: H - 64 - 14 };
    this.build();
    if (this.mode === "desktop") this.inter.attach();
    else this.inter.detach();
  }

  /** The room, its places, and the people in it. */
  private build() {
    const w = this.world;
    this.layout = layoutScene(this.scene, this.W, this.H, this.mode === "mobile");
    w.zones = this.layout.zones;
    this.envDirty = true;
    this.syncKeep();
    const want = this.mode === "desktop" ? 10 : this.mode === "tablet" ? 5 : 3;
    if (this.npcs.length !== want) {
      this.npcs.length = 0;
      this.npcs.push(...makeNPCs(want, this.unit, w));
      // a phone's people are a little slower
      if (this.mode !== "desktop") for (const n of this.npcs) n.speed *= 0.8;
      w.npcs = this.npcs;
    } else {
      for (const n of this.npcs) {
        n.scale = n.rel * this.unit;
        if (n.zone) n.zone.taken = -1;
        n.zone = null;
        n.x = clamp(n.x, w.bounds.x, w.bounds.x + w.bounds.w);
        n.y = clamp(n.y, w.bounds.y, w.bounds.y + w.bounds.h);
        pickTarget(n, w);
      }
    }
    this.order.length = 0;
    this.order.push(...this.npcs);
    w.present = Math.ceil(this.tod.cur.present * this.npcs.length);
    if (this.reduced) this.placeStill();
    this.drawOnce();
  }

  /** Reduced motion: everybody stands in their own place, and stays there. */
  private placeStill() {
    const z = this.layout.zones;
    this.npcs.forEach((n, i) => {
      const t = z[i % Math.max(1, z.length)];
      if (!t) return;
      n.x = t.x + (i >= z.length ? 30 : 0);
      n.y = t.y;
      n.dir = t.face;
      n.state = "IDLE";
      n.vx = n.vy = 0;
    });
  }

  private syncKeep() {
    const w = this.world;
    const list: KeepOut[] = [];
    if (this.book) list.push({ rect: this.book, pad: 18 });
    this.keeps.forEach((k) => list.push(k));
    // the page's own controls: the name, the index and sound, the pager
    list.push({ rect: { x: 0, y: 0, w: 240, h: 66 }, pad: 0 });
    list.push({ rect: { x: this.W - 230, y: 0, w: 230, h: 66 }, pad: 0 });
    list.push({ rect: { x: 0, y: this.H - 60, w: this.W, h: 60 }, pad: 0 });
    w.keep = list;
    w.book = this.book;
    // only while nobody can see it (the first layout) are people moved out of a keep-out at once; later they walk out
    if (!this.live) {
      for (const n of this.npcs) pushOut(n, list, 6 * n.scale, 0);
    }
  }

  // ───────── the loop ─────────

  private wake() {
    if (this.raf || this.paused || document.hidden) return;
    if (this.reduced) return void this.drawOnce();
    this.last = 0;
    this.raf = requestAnimationFrame(this.frame);
  }
  private stopLoop() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private frame = (ts: number) => {
    this.raf = 0;
    if (this.paused || document.hidden) return;
    const dt = this.last ? Math.min(0.05, (ts - this.last) / 1000) : 1 / 60;
    this.last = ts;
    this.acc += dt;
    // if frames are costing too much, the room runs at half rate and the page keeps its 60
    this.parity ^= 1;
    if (!(this.lowRate && this.parity)) {
      const t0 = performance.now();
      this.step(this.acc);
      this.draw();
      this.acc = 0;
      const cost = performance.now() - t0;
      this.cost += (cost - this.cost) * 0.05;
      if (!this.lowRate && this.cost > 8) this.lowRate = true;
      else if (this.lowRate && this.cost < 3) this.lowRate = false;
    }
    this.raf = requestAnimationFrame(this.frame);
  };

  private step(dt: number) {
    const w = this.world;
    this.time += dt;
    // the intensity eases in and out
    this.alpha += (this.intensity - this.alpha) * Math.min(1, dt * 2.2);
    if (this.bookTo && this.book) {
      const k = 1 - Math.exp(-dt * 5);
      const b = this.book;
      const t = this.bookTo;
      b.x += (t.x - b.x) * k;
      b.y += (t.y - b.y) * k;
      b.w += (t.w - b.w) * k;
      b.h += (t.h - b.h) * k;
    }
    w.present = Math.ceil(this.tod.cur.present * this.npcs.length);
    w.activity = this.tod.cur.activity * (this.mode === "desktop" ? 1 : 0.8);
    const calm = this.time < this.slowUntil ? 0.62 : 1;
    w.slow += (calm - w.slow) * Math.min(1, dt * 1.5);
    this.inter.update(dt);
    const list = this.npcs;
    for (let i = 0; i < list.length; i++) stepNPC(list[i], dt, w);
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      if (a.away) continue;
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j];
        if (!b.away) separate(a, b, 24);
      }
    }
  }

  private drawOnce() {
    this.draw();
  }

  private paintEnv() {
    const e = this.env.getContext("2d")!;
    e.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    e.clearRect(0, 0, this.W, this.H);
    drawStatic(e, this.layout);
    this.envDirty = false;
  }

  private draw() {
    const c = this.c;
    const a = this.alpha;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.clearRect(0, 0, this.W, this.H);
    if (a < 0.005) return;
    if (this.envDirty) this.paintEnv();
    const tod = this.tod.cur;
    // the furniture, quieter than the people
    c.globalAlpha = a * 0.78;
    c.drawImage(this.env, 0, 0, this.W, this.H);
    // the people, back to front; whoever is being carried is on top
    const o = this.order;
    for (let i = 1; i < o.length; i++) {
      const v = o[i];
      let j = i - 1;
      while (j >= 0 && o[j].y > v.y) {
        o[j + 1] = o[j];
        j--;
      }
      o[j + 1] = v;
    }
    const held = this.inter.drag?.npc ?? null;
    for (let i = 0; i < o.length; i++) {
      const n = o[i];
      if (n.away || n === held) continue;
      drawFigure(c, n, this.time, a * 0.9);
    }
    if (held) drawFigure(c, held, this.time, a * 0.96);
    // the light: one tint over the room, then the lamps
    c.globalAlpha = a;
    const [r, g, b, wa] = tod.wash;
    if (wa > 0.002) {
      c.fillStyle = `rgba(${r | 0}, ${g | 0}, ${b | 0}, ${wa.toFixed(3)})`;
      c.fillRect(0, 0, this.W, this.H);
    }
    drawLamps(c, this.layout, tod.lamps * a, this.time);
    c.globalAlpha = 1;
  }
}
