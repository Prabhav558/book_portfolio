import type { KeepOut, NPCState, Pointer, Rect, Role, Vec, Zone } from "./types";
import { clamp, confine, dist, inflate, inside, pushOut, steerAround } from "./physics";

/**
 * The people. Each has a position, a velocity, a heading, a speed, a target, a state and a walking phase,
 * and a role that decides where it likes to go and what it does when it gets there. The roles are small
 * state machines: perceived life, not simulation.
 */

export type Item = "none" | "book" | "stack" | "cup" | "laptop" | "bag";
export type Skin = {
  skin: string;
  hair: string;
  hairStyle: 0 | 1 | 2 | 3;
  top: string;
  bottom: string;
  shoe: string;
  /** Width of the body, 0.9 … 1.15. */
  build: number;
  /** A long coat (the librarian's). */
  coat: boolean;
  headphones: boolean;
  item: Item;
};

/** What the world tells a person each frame. */
export type WorldCtx = {
  W: number;
  H: number;
  /** Where people may stand. */
  bounds: Rect;
  keep: KeepOut[];
  zones: Zone[];
  npcs: NPC[];
  pointer: Pointer;
  /** The book on the table, if one is. */
  book: Rect | null;
  /** 0.5 … 1: a calm over everything for a moment (the book has just opened). */
  slow: number;
  /** Time of day: how busy people are (0 … 1). */
  activity: number;
  /** How many people are about. */
  present: number;
  /** Whether people react to the pointer at all (desktop only). */
  reactive: boolean;
  /** Everybody is still (reduced motion). */
  still: boolean;
  rand: () => number;
};

const TMP: Vec = { x: 0, y: 0 };

export class NPC {
  id: number;
  role: Role;
  look: Skin;
  /** Relative size, and that size in pixels per body unit. */
  rel: number;
  scale: number;
  /** Walking speed in px/s at full activity. */
  speed: number;
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  /** 1 faces right, -1 left. */
  dir: 1 | -1 = 1;
  heading = 0;
  state: NPCState = "WALKING";
  stateT = 0;
  tx = 0;
  ty = 0;
  phase = 0;
  gait: number;
  wobF: number;
  seed: number;
  side = { v: 0 as 0 | 1 | -1 };
  zone: Zone | null = null;
  /** Where the person is looking, and how far the head has turned toward it (0 … 1). */
  lookX = 0;
  lookY = 0;
  lookW = 0;
  /** 0 … 1, decays: a small hop of surprise. */
  react = 0;
  pushCool = 0;
  dodgeCool = 0;
  reading = false;
  /** Whether this person is off-screen (it has gone home). */
  away = false;
  leaving = false;
  /** Which event this person last noticed (see the engine). */
  noticed = -1;
  /** Seconds that the person has been in the current state. */
  age = 0;

  constructor(id: number, role: Role, look: Skin, rel: number, speed: number, rnd: () => number) {
    this.id = id;
    this.role = role;
    this.look = look;
    this.rel = rel;
    this.scale = rel;
    this.speed = speed;
    this.gait = 0.85 + rnd() * 0.35;
    this.wobF = 0.4 + rnd() * 0.7;
    this.seed = rnd() * 100;
    this.heading = rnd() * Math.PI * 2;
  }
}

// ───────── appearance ─────────

const CLOTH = ["#858a8e", "#6e9380", "#7f93ab", "#a58a7c", "#b49a6e", "#9a8fb0", "#8e9f8a", "#b3877c", "#5f7384", "#8a7f74"];
const PANTS = ["#4a5058", "#56606b", "#6b5f55", "#3f4a44", "#5b5566", "#7b756c"];
const SKIN = ["#e3c3a4", "#d1a47f", "#a97b58", "#f0d4bb", "#8a5e43", "#c68e6a"];
const HAIR = ["#2c2622", "#4a382c", "#7a5a3c", "#b79a6e", "#9a9a9a", "#1f1f1f", "#6a4a3a"];

const ITEM: Record<Role, Item[]> = {
  walker: ["none", "bag", "none"],
  reader: ["book", "book"],
  worker: ["laptop", "none"],
  coffee: ["cup"],
  librarian: ["stack", "book"],
  explorer: ["bag", "laptop", "none"],
};
const SPEED: Record<Role, number> = { walker: 46, reader: 28, worker: 34, coffee: 23, librarian: 30, explorer: 42 };
const ORDER: Role[] = ["walker", "worker", "reader", "librarian", "coffee", "explorer", "walker", "librarian", "reader", "worker", "explorer", "walker"];

const pick = <T,>(a: T[], r: () => number) => a[Math.floor(r() * a.length) % a.length];

export function makeNPCs(count: number, unit: number, w: WorldCtx): NPC[] {
  const out: NPC[] = [];
  for (let i = 0; i < count; i++) {
    const role = ORDER[i % ORDER.length];
    const r = w.rand;
    const look: Skin = {
      skin: pick(SKIN, r),
      hair: pick(HAIR, r),
      hairStyle: Math.floor(r() * 4) as 0 | 1 | 2 | 3,
      top: role === "librarian" ? "#6f7a85" : pick(CLOTH, r),
      bottom: pick(PANTS, r),
      shoe: "#2f2b28",
      build: 0.9 + r() * 0.25,
      coat: role === "librarian",
      headphones: (role === "walker" && r() < 0.6) || (role === "explorer" && r() < 0.25),
      item: pick(ITEM[role], r),
    };
    const rel = 0.9 + r() * 0.26;
    const n = new NPC(i, role, look, rel, SPEED[role] * (0.9 + r() * 0.2), r);
    n.scale = rel * unit;
    const p = randomPoint(w, n);
    n.x = p.x;
    n.y = p.y;
    n.tx = n.x;
    n.ty = n.y;
    n.dir = r() < 0.5 ? 1 : -1;
    n.state = "PAUSED";
    n.stateT = r() * 3;
    out.push(n);
  }
  return out;
}

// ───────── where to go ─────────

/** A place to stand that is in the open. */
export function randomPoint(w: WorldCtx, n: NPC): Vec {
  const b = w.bounds;
  for (let i = 0; i < 18; i++) {
    const x = b.x + w.rand() * b.w;
    const y = b.y + w.rand() * b.h;
    if (w.keep.some((k) => inside(inflate(k.rect, k.pad + 10 * n.scale), x, y))) continue;
    if (Math.hypot(x - n.x, y - n.y) < 70 && i < 12) continue;
    return { x, y };
  }
  return { x: clamp(n.x, b.x, b.x + b.w), y: clamp(n.y, b.y, b.y + b.h) };
}

const LIKES: Record<Role, Zone["kind"][]> = {
  walker: [],
  reader: ["rug", "shelf", "lamp"],
  worker: ["desk"],
  coffee: ["table", "lamp", "plant"],
  librarian: ["shelf"],
  explorer: ["shelf", "rug", "plant", "table", "desk", "lamp"],
};

function release(n: NPC) {
  if (n.zone && n.zone.taken === n.id) n.zone.taken = -1;
  n.zone = null;
}

export function pickTarget(n: NPC, w: WorldCtx) {
  release(n);
  const kinds = LIKES[n.role];
  // walkers wander; everybody else mostly goes somewhere that suits them
  if (kinds.length && w.rand() < 0.86) {
    const free = w.zones.filter((z) => kinds.includes(z.kind) && (z.taken < 0 || z.taken === n.id) && dist(z.x, z.y, n.x, n.y) > 40);
    if (free.length) {
      const z = free[Math.floor(w.rand() * free.length)];
      z.taken = n.id;
      n.zone = z;
      n.tx = z.x + (w.rand() - 0.5) * 8;
      n.ty = z.y + (w.rand() - 0.5) * 4;
      return;
    }
  }
  const p = randomPoint(w, n);
  n.tx = p.x;
  n.ty = p.y;
}

function arrive(n: NPC, w: WorldCtx) {
  const z = n.zone;
  n.vx *= 0.3;
  n.vy *= 0.3;
  if (z && n.role === "worker" && z.kind === "desk" && z.seat) {
    n.state = "SITTING";
    n.stateT = 9 + w.rand() * 14;
    n.dir = z.face;
    return;
  }
  if (z && z.kind === "rug" && z.seat && w.rand() < 0.7) {
    n.state = "SITTING";
    n.stateT = 8 + w.rand() * 12;
    n.dir = z.face;
    n.reading = n.role === "reader";
    return;
  }
  n.reading = n.role === "reader" && w.rand() < 0.8;
  n.state = "PAUSED";
  n.stateT =
    n.role === "walker" ? 0.8 + w.rand() * 2.2 : n.role === "reader" ? 5 + w.rand() * 7 : n.role === "librarian" ? 3 + w.rand() * 4 : n.role === "coffee" ? 4 + w.rand() * 5 : 2 + w.rand() * 3;
  if (z) n.dir = z.face;
}

function startWalking(n: NPC, w: WorldCtx) {
  n.reading = false;
  pickTarget(n, w);
  n.state = "WALKING";
  n.age = 0;
}

/** Walk on in from an edge (somebody who had gone home comes back). */
function spawn(n: NPC, w: WorldCtx) {
  const left = w.rand() < 0.5;
  n.x = left ? -26 : w.W + 26;
  n.y = w.bounds.y + w.rand() * w.bounds.h;
  n.vx = 0;
  n.vy = 0;
  n.away = false;
  n.leaving = false;
  startWalking(n, w);
}

// ───────── the step ─────────

export function stepNPC(n: NPC, dt: number, w: WorldCtx) {
  n.age += dt;
  n.react = Math.max(0, n.react - dt * 2.2);
  n.pushCool = Math.max(0, n.pushCool - dt);
  n.dodgeCool = Math.max(0, n.dodgeCool - dt);

  // some have gone home for the night, and come back with the day
  const want = n.id < w.present;
  if (n.away) {
    if (want) spawn(n, w);
    return;
  }
  if (!want && !n.leaving && n.state !== "DRAGGED") {
    n.leaving = true;
    release(n);
    n.tx = n.x < w.W / 2 ? -34 : w.W + 34;
    n.ty = n.y;
    n.state = "WALKING";
    n.reading = false;
  } else if (want && n.leaving) {
    n.leaving = false;
    startWalking(n, w);
  }

  if (w.still) {
    // reduced motion: everybody stands where they are
    n.vx = n.vy = 0;
    n.state = n.state === "SITTING" ? "SITTING" : "IDLE";
    return;
  }

  // the head: turns toward whoever is near (the pointer, or what an event pointed it at)
  const px = w.pointer.x;
  const py = w.pointer.y;
  const near = w.reactive && w.pointer.on && dist(px, py, n.x, n.y) < 150 * n.scale;
  const calm = n.state === "WALKING" || n.state === "AVOIDING";
  if (near && n.state !== "DRAGGED") {
    n.lookX = px;
    n.lookY = py;
    n.lookW += (1 - n.lookW) * Math.min(1, dt * (calm ? 2.2 : 4.5));
  } else if (n.state === "LOOKING") {
    n.lookW += (1 - n.lookW) * Math.min(1, dt * 3);
  } else {
    n.lookW += (0 - n.lookW) * Math.min(1, dt * 1.6);
  }

  // sidestep a pointer that is coming at somebody fast
  if (near && n.dodgeCool <= 0 && (calm || n.state === "PAUSED") && n.state !== "DRAGGED") {
    const pv = Math.hypot(w.pointer.vx, w.pointer.vy);
    const dx = n.x - px;
    const dy = n.y - py;
    const d = Math.hypot(dx, dy) || 1;
    if (pv > 650 && d < 120 * n.scale && (w.pointer.vx * dx + w.pointer.vy * dy) / (pv * d) > 0.75) {
      n.vx += (dx / d) * 70 + (-dy / d) * 30 * (w.rand() < 0.5 ? 1 : -1);
      n.vy += (dy / d) * 70;
      n.dodgeCool = 1.6;
      n.react = 0.5;
    }
  }

  switch (n.state) {
    case "DRAGGED":
      // the interaction holds the body; the legs just hang
      n.phase += dt * 6;
      return;

    case "PUSHED": {
      // thrown, sliding: friction takes the speed away
      const f = Math.exp(-dt * 3.4);
      n.vx *= f;
      n.vy *= f;
      const rad = 8 * n.scale;
      const was = w.keep.some((k) => inside(inflate(k.rect, k.pad + rad), n.x, n.y));
      n.x += n.vx * dt;
      n.y += n.vy * dt;
      n.phase += Math.hypot(n.vx, n.vy) * dt * 0.05;
      confine(n, w.bounds, 0.45);
      // a thrown person bounces off the book; one who is already inside it (put down there) walks out instead of jumping
      if (was) softOut(n, w, dt);
      else pushOut(n, w.keep, rad, 0.45);
      if (Math.abs(n.vx) > 8) n.dir = n.vx > 0 ? 1 : -1;
      if (Math.hypot(n.vx, n.vy) < 16) {
        n.state = "PAUSED";
        n.stateT = 0.6 + w.rand() * 0.9;
        n.vx = n.vy = 0;
      }
      return;
    }

    case "SITTING": {
      n.vx = n.vy = 0;
      const z = n.zone;
      if (z?.seat) {
        n.x += (z.seat.x - n.x) * Math.min(1, dt * 8);
        n.y += (z.seat.y - n.y) * Math.min(1, dt * 8);
      }
      n.phase += dt * 5;
      n.stateT -= dt;
      if (n.stateT <= 0) startWalking(n, w);
      return;
    }

    case "LOOKING":
    case "IDLE":
    case "PAUSED": {
      n.vx *= Math.exp(-dt * 6);
      n.vy *= Math.exp(-dt * 6);
      n.x += n.vx * dt;
      n.y += n.vy * dt;
      n.phase += dt * 1.3;
      if (n.state === "LOOKING") {
        const dx = n.lookX - n.x;
        if (Math.abs(dx) > 6) n.dir = dx > 0 ? 1 : -1;
      } else if (near && n.lookW > 0.5) {
        const dx = px - n.x;
        if (Math.abs(dx) > 10) n.dir = dx > 0 ? 1 : -1;
      } else if (!n.zone && w.rand() < dt * 0.25) {
        // idly looks the other way now and then
        n.dir = n.dir === 1 ? -1 : 1;
      }
      n.stateT -= dt;
      if (n.stateT <= 0) startWalking(n, w);
      softOut(n, w, dt);
      confine(n, w.bounds, 0.3);
      return;
    }
  }

  // ───── WALKING / AVOIDING ─────
  const dx = n.tx - n.x;
  const dy = n.ty - n.y;
  const d = Math.hypot(dx, dy);
  if (n.leaving) {
    if (n.x < -22 || n.x > w.W + 22) {
      n.away = true;
      return;
    }
  } else if (d < 6 + 4 * n.scale) {
    arrive(n, w);
    return;
  }
  // now and then somebody changes their mind on the way
  if (!n.leaving && (n.role === "walker" || n.role === "explorer") && d > 160 && w.rand() < dt * 0.06) pickTarget(n, w);

  // not a straight line: the heading drifts either side of the bearing, less so near the goal
  const bearing = Math.atan2(dy, dx);
  const drift = Math.sin(n.age * n.wobF + n.seed) * 0.32 * Math.min(1, d / 90);
  let ux = Math.cos(bearing + drift);
  let uy = Math.sin(bearing + drift);
  const hard = n.leaving ? 0 : steerAround(n.x, n.y, ux, uy, 54 + 40 * n.scale, w.keep, 9 * n.scale, n.side, TMP);
  if (hard) {
    ux = TMP.x;
    uy = TMP.y;
  }
  n.state = hard > 0.5 ? "AVOIDING" : "WALKING";

  const ease = Math.min(1, d / (46 * n.scale));
  const sp = n.speed * n.scale * (0.35 + 0.65 * w.activity) * w.slow * (hard ? 0.8 : 1) * (n.leaving ? 1 : 0.25 + 0.75 * ease);
  const k = Math.min(1, dt * 3);
  n.vx += (ux * sp - n.vx) * k;
  n.vy += (uy * sp - n.vy) * k;
  n.x += n.vx * dt;
  n.y += n.vy * dt;
  const v = Math.hypot(n.vx, n.vy);
  n.phase += (v / (15 * n.scale)) * dt * n.gait;
  if (Math.abs(n.vx) > 6) n.dir = n.vx > 0 ? 1 : -1;
  if (!n.leaving) {
    confine(n, w.bounds, 0.3);
    softOut(n, w, dt);
  }
}

/**
 * When the book grows under somebody, or they are put down inside it, they walk out of it: steadily and
 * visibly, by the nearest edge, never snapped there. (The deeper in, the quicker.)
 */
function softOut(n: NPC, w: WorldCtx, dt: number) {
  for (let i = 0; i < w.keep.length; i++) {
    const k = w.keep[i];
    const r = inflate(k.rect, k.pad);
    if (!inside(r, n.x, n.y)) continue;
    const l = n.x - r.x;
    const rr = r.x + r.w - n.x;
    const t = n.y - r.y;
    const b = r.y + r.h - n.y;
    const m = Math.min(l, rr, t, b);
    const sp = (120 + 380 * Math.min(1, m / 60)) * dt;
    if (m === l) n.x -= sp;
    else if (m === rr) n.x += sp;
    else if (m === t) n.y -= sp;
    else n.y += sp;
    n.phase += sp * 0.07;
    n.dir = m === l ? -1 : m === rr ? 1 : n.dir;
  }
}
