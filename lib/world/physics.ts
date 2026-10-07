import type { KeepOut, Rect, Vec } from "./types";

/**
 * A small 2D model, not an engine: friction, a soft wall around the book, people nudging each other.
 * Everything here works on plain objects and allocates nothing per frame.
 */

export const inflate = (r: Rect, d: number): Rect => ({ x: r.x - d, y: r.y - d, w: r.w + 2 * d, h: r.h + 2 * d });
export const inside = (r: Rect, x: number, y: number) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
export const dist = (ax: number, ay: number, bx: number, by: number) => Math.hypot(ax - bx, ay - by);
export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** Whether the segment p→q passes through the rectangle (slab method). */
export function segHits(px: number, py: number, qx: number, qy: number, r: Rect) {
  let t0 = 0;
  let t1 = 1;
  const dx = qx - px;
  const dy = qy - py;
  const edge = (p: number, d: number, lo: number, hi: number) => {
    if (Math.abs(d) < 1e-9) return p >= lo && p <= hi;
    let a = (lo - p) / d;
    let b = (hi - p) / d;
    if (a > b) [a, b] = [b, a];
    t0 = Math.max(t0, a);
    t1 = Math.min(t1, b);
    return t0 <= t1;
  };
  return edge(px, dx, r.x, r.x + r.w) && edge(py, dy, r.y, r.y + r.h);
}

/**
 * Where a walker should head so as to go round the keep-outs rather than through them. `d` is the
 * wanted direction (unit); the result is a unit vector, and `hard` says how much it had to bend.
 * `side` is remembered by the caller so that a walker commits to one way round.
 */
export function steerAround(
  px: number,
  py: number,
  dx: number,
  dy: number,
  reach: number,
  keep: KeepOut[],
  radius: number,
  side: { v: 0 | 1 | -1 },
  out: Vec,
): number {
  let hard = 0;
  let ox = dx;
  let oy = dy;
  const qx = px + dx * reach;
  const qy = py + dy * reach;
  for (let i = 0; i < keep.length; i++) {
    const k = keep[i];
    const r = inflate(k.rect, k.pad + radius);
    if (!inside(r, px, py) && !segHits(px, py, qx, qy, r)) continue;
    // away from the middle of the rectangle, and along its edge
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    let ax = px - cx;
    let ay = py - cy;
    // squash so a wide book is left by its top or bottom, a tall shelf by its side
    const nx = ax / (r.w / 2);
    const ny = ay / (r.h / 2);
    if (Math.abs(nx) > Math.abs(ny)) ay = 0;
    else ax = 0;
    const al = Math.hypot(ax, ay) || 1;
    ax /= al;
    ay /= al;
    let tx = -ay;
    let ty = ax;
    if (side.v === 0) side.v = tx * dx + ty * dy >= 0 ? 1 : -1;
    tx *= side.v;
    ty *= side.v;
    const depth = inside(r, px, py) ? 1 : 0.55;
    ox = ox * 0.35 + tx * 1 + ax * depth;
    oy = oy * 0.35 + ty * 1 + ay * depth;
    hard = Math.max(hard, depth);
  }
  if (!hard) side.v = 0;
  const l = Math.hypot(ox, oy) || 1;
  out.x = ox / l;
  out.y = oy / l;
  return hard;
}

/**
 * Put a body back outside every keep-out it has ended up in (it was dropped there, thrown there, or the
 * book grew under it). Velocity into the wall is reflected with some loss.
 */
export function pushOut(n: { x: number; y: number; vx: number; vy: number }, keep: KeepOut[], radius: number, bounce: number) {
  for (let i = 0; i < keep.length; i++) {
    const k = keep[i];
    const r = inflate(k.rect, k.pad + radius);
    if (!inside(r, n.x, n.y)) continue;
    const l = n.x - r.x;
    const rr = r.x + r.w - n.x;
    const t = n.y - r.y;
    const b = r.y + r.h - n.y;
    const m = Math.min(l, rr, t, b);
    if (m === l) {
      n.x = r.x;
      if (n.vx > 0) n.vx *= -bounce;
    } else if (m === rr) {
      n.x = r.x + r.w;
      if (n.vx < 0) n.vx *= -bounce;
    } else if (m === t) {
      n.y = r.y;
      if (n.vy > 0) n.vy *= -bounce;
    } else {
      n.y = r.y + r.h;
      if (n.vy < 0) n.vy *= -bounce;
    }
  }
}

/** Keep a body inside the walkable rectangle; a fast one bounces off. */
export function confine(n: { x: number; y: number; vx: number; vy: number }, b: Rect, bounce: number) {
  if (n.x < b.x) {
    n.x = b.x;
    n.vx = Math.abs(n.vx) * bounce;
  } else if (n.x > b.x + b.w) {
    n.x = b.x + b.w;
    n.vx = -Math.abs(n.vx) * bounce;
  }
  if (n.y < b.y) {
    n.y = b.y;
    n.vy = Math.abs(n.vy) * bounce;
  } else if (n.y > b.y + b.h) {
    n.y = b.y + b.h;
    n.vy = -Math.abs(n.vy) * bounce;
  }
}

/** Two people never stand in each other. A shoved one passes some of its speed on. */
export function separate(
  a: { x: number; y: number; vx: number; vy: number; scale: number; state: string },
  b: { x: number; y: number; vx: number; vy: number; scale: number; state: string },
  R: number,
) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.hypot(dx, dy);
  const min = R * (a.scale + b.scale) * 0.5;
  if (d >= min || d < 1e-4) return;
  const nx = dx / d;
  const ny = dy / d;
  const over = (min - d) * 0.5;
  const aFixed = a.state === "DRAGGED" || a.state === "SITTING";
  const bFixed = b.state === "DRAGGED" || b.state === "SITTING";
  if (!aFixed) {
    a.x -= nx * over * (bFixed ? 2 : 1);
    a.y -= ny * over * (bFixed ? 2 : 1);
  }
  if (!bFixed) {
    b.x += nx * over * (aFixed ? 2 : 1);
    b.y += ny * over * (aFixed ? 2 : 1);
  }
  // momentum: whoever is moving into the other gives some of it away
  const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  if (rv < 0) {
    const j = -rv * 0.6;
    if (!aFixed) {
      a.vx -= nx * j;
      a.vy -= ny * j;
    }
    if (!bFixed) {
      b.vx += nx * j;
      b.vy += ny * j;
    }
  }
}
