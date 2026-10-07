import { cursorProbe } from "../cursor";
import { overlay } from "../overlay";
import type { NPC, WorldCtx } from "./npc";
import { clamp, dist, inside } from "./physics";
import type { Pointer } from "./types";

/**
 * The pointer's dealings with the people: it can look at them, brush them aside, pick one up and
 * let it go with the speed it had. Only a mouse or trackpad does any of this.
 *
 * Wheel events are never touched here, and nothing here is a scroll container: the book keeps
 * the wheel. The listeners are on the window and hit-test the figures themselves, so the canvas
 * can sit underneath the page and still not be in the way of anything.
 */

type Drag = { npc: NPC; ox: number; oy: number; sx: number; sy: number; t0: number; moved: boolean };

export class Interaction {
  readonly pointer: Pointer = { x: -999, y: -999, vx: 0, vy: 0, on: false };
  hover: NPC | null = null;
  drag: Drag | null = null;
  private lastT = 0;
  private active = false;
  private ctx: WorldCtx;
  private wake: () => void;

  constructor(ctx: WorldCtx, wake: () => void) {
    this.ctx = ctx;
    this.wake = wake;
  }

  /** Whether a figure is under this point (and the book and the page's own controls are not). */
  pick(x: number, y: number): NPC | null {
    const book = this.ctx.book;
    if (book && inside(book, x, y)) return null;
    const list = this.ctx.npcs;
    let best: NPC | null = null;
    for (let i = 0; i < list.length; i++) {
      const n = list[i];
      if (n.away || n.leaving && (n.x < 0 || n.x > this.ctx.W)) continue;
      const s = n.scale * (n.state === "DRAGGED" ? 1.08 : 1);
      const cy = n.y - 22 * s - (n.state === "DRAGGED" ? 12 * s : 0);
      const ex = (x - n.x) / (12 * s);
      const ey = (y - cy) / (26 * s);
      if (ex * ex + ey * ey > 1) continue;
      if (!best || n.y > best.y) best = n;
    }
    return best;
  }

  attach(): boolean {
    if (this.active || typeof window === "undefined") return this.active;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return false;
    this.active = true;
    window.addEventListener("pointermove", this.onMove, { passive: true });
    window.addEventListener("pointerdown", this.onDown);
    window.addEventListener("pointerup", this.onUp);
    window.addEventListener("pointercancel", this.onUp);
    window.addEventListener("blur", this.onLeave);
    document.documentElement.addEventListener("mouseleave", this.onLeave);
    cursorProbe.world = (x, y) => (this.drag ? "grabbing" : this.pick(x, y) ? "grab" : null);
    return true;
  }

  detach() {
    if (!this.active) return;
    this.active = false;
    window.removeEventListener("pointermove", this.onMove);
    window.removeEventListener("pointerdown", this.onDown);
    window.removeEventListener("pointerup", this.onUp);
    window.removeEventListener("pointercancel", this.onUp);
    window.removeEventListener("blur", this.onLeave);
    document.documentElement.removeEventListener("mouseleave", this.onLeave);
    cursorProbe.world = null;
    cursorProbe.held = null;
    this.drop(0, 0);
  }

  private onLeave = () => {
    this.pointer.on = false;
  };

  private onMove = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    const p = this.pointer;
    const now = performance.now();
    const dt = Math.max(0.004, (now - this.lastT) / 1000);
    this.lastT = now;
    if (p.on) {
      // a smoothed speed in px/s: one jerky event is not a shove
      p.vx += (clamp((e.clientX - p.x) / dt, -3200, 3200) - p.vx) * 0.45;
      p.vy += (clamp((e.clientY - p.y) / dt, -3200, 3200) - p.vy) * 0.45;
    }
    p.x = e.clientX;
    p.y = e.clientY;
    p.on = true;
    this.wake();
    if (this.drag) {
      const d = this.drag;
      if (!d.moved && dist(p.x, p.y, d.sx, d.sy) > 5) d.moved = true;
      return;
    }
    this.hover = overlay.open || this.ctx.still ? null : this.pick(p.x, p.y);
    if (!e.buttons) this.brush();
  };

  /** A quick pass through somebody sends them off in the direction of travel. */
  private brush() {
    const p = this.pointer;
    const sp = Math.hypot(p.vx, p.vy);
    if (sp < 380 || overlay.open || this.ctx.still) return;
    const list = this.ctx.npcs;
    for (let i = 0; i < list.length; i++) {
      const n = list[i];
      if (n.away || n.pushCool > 0 || n.state === "DRAGGED" || n.state === "SITTING") continue;
      const s = n.scale;
      const cx = n.x;
      const cy = n.y - 22 * s;
      const d = dist(p.x, p.y, cx, cy);
      if (d > 26 * s) continue;
      // only when the pointer is going toward them, not just passing the other way
      if (((cx - p.x) * p.vx + (cy - p.y) * p.vy) / (d * sp + 1e-6) < 0.2) continue;
      const k = 0.55 / Math.max(0.8, s);
      n.vx = clamp(n.vx + p.vx * k, -700, 700);
      n.vy = clamp(n.vy + p.vy * k * 0.7, -700, 700);
      n.state = "PUSHED";
      n.pushCool = 0.35;
      n.react = 0.7;
      n.zone = null;
      n.reading = false;
    }
  }

  private onDown = (e: PointerEvent) => {
    if (e.pointerType !== "mouse" || e.button !== 0 || overlay.open || this.ctx.still) return;
    if ((e.target as HTMLElement | null)?.closest?.("a, button, input, textarea, select, label, [data-nodrag]")) return;
    const n = this.pick(e.clientX, e.clientY);
    if (!n) return;
    // taking somebody by the shoulders: neither the page nor the browser gets this press
    e.preventDefault();
    window.getSelection()?.removeAllRanges();
    if (n.zone && n.zone.taken === n.id) n.zone.taken = -1;
    n.zone = null;
    n.reading = false;
    n.state = "DRAGGED";
    n.vx = n.vy = 0;
    this.drag = { npc: n, ox: n.x - e.clientX, oy: n.y - e.clientY, sx: e.clientX, sy: e.clientY, t0: performance.now(), moved: false };
    cursorProbe.held = "grabbing";
    this.wake();
  };

  private onUp = (e: PointerEvent) => {
    if (e.pointerType !== "mouse" || !this.drag) return;
    this.drop(this.pointer.vx, this.pointer.vy);
    this.hover = this.pick(e.clientX, e.clientY);
  };

  /** Let go with the speed the pointer had; a press without movement is a poke. */
  private drop(vx: number, vy: number) {
    const d = this.drag;
    if (!d) return;
    this.drag = null;
    cursorProbe.held = null;
    const n = d.npc;
    const quick = performance.now() - d.t0 < 320;
    if (!d.moved && quick) {
      // a click: a small start of surprise
      n.state = "PAUSED";
      n.stateT = 1 + this.ctx.rand();
      n.react = 1;
      return;
    }
    // somewhere to sit? Put them on the chair.
    for (const z of this.ctx.zones) {
      if (!z.seat || z.taken >= 0 || (z.kind !== "desk" && z.kind !== "rug")) continue;
      if (dist(n.x, n.y, z.seat.x, z.seat.y) < 52) {
        z.taken = n.id;
        n.zone = z;
        n.state = "SITTING";
        n.stateT = 9 + this.ctx.rand() * 6;
        n.dir = z.face;
        n.vx = n.vy = 0;
        return;
      }
    }
    const s = Math.hypot(vx, vy);
    const cap = s > 900 ? 900 / s : 1;
    n.vx = vx * 0.85 * cap;
    n.vy = vy * 0.85 * cap;
    n.state = "PUSHED";
  }

  /** Each frame: the held figure follows the hand, a little behind it; and the pointer's speed dies away. */
  update(dt: number) {
    const p = this.pointer;
    const f = Math.exp(-dt * 7);
    p.vx *= f;
    p.vy *= f;
    const d = this.drag;
    if (!d) return;
    const n = d.npc;
    const tx = p.x + d.ox;
    const ty = p.y + d.oy;
    const k = Math.min(1, dt * 18);
    const x0 = n.x;
    const y0 = n.y;
    n.x += (tx - n.x) * k;
    n.y += (ty - n.y) * k;
    n.x = clamp(n.x, 4, this.ctx.W - 4);
    n.y = clamp(n.y, 30, this.ctx.H - 2);
    n.vx = (n.x - x0) / Math.max(dt, 1e-3);
    n.vy = (n.y - y0) / Math.max(dt, 1e-3);
    if (Math.abs(n.vx) > 30) n.dir = n.vx > 0 ? 1 : -1;
    // dragged beside somebody: they turn and look
    for (const o of this.ctx.npcs) {
      if (o === n || o.away || o.dodgeCool > 0 || o.state === "DRAGGED" || o.state === "SITTING") continue;
      if (dist(n.x, n.y, o.x, o.y) < 44 * (n.scale + o.scale) * 0.5) {
        o.state = "LOOKING";
        o.stateT = 2.2 + this.ctx.rand();
        o.lookX = n.x;
        o.lookY = n.y - 24;
        o.dodgeCool = 3.2;
        o.react = 0.7;
        n.react = 0.5;
      }
    }
  }
}
