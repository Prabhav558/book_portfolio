import type { SceneName, Zone } from "./types";

/**
 * The room around the book: a few pieces of furniture drawn the way a magazine would draw them, flat
 * and quiet, pushed to the margins so the middle stays empty. Drawn once into a cache (and again only
 * when the size or the light changes); the lamps' glow is the one thing painted live.
 */

export type PropKind = "shelf" | "desk" | "chair" | "rug" | "armchair" | "plant" | "lamp" | "table" | "markings";
export type Prop = { kind: PropKind; x: number; y: number; w: number; h: number; face: 1 | -1; seed: number };
export type Layout = { props: Prop[]; zones: Zone[]; lamps: { x: number; y: number; r: number }[] };

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

function rng(seed: number) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Where everything stands, for a viewport. `lite` is the phone's version: almost nothing, at the edges. */
export function layoutScene(scene: SceneName, W: number, H: number, lite: boolean): Layout {
  const u = clamp(Math.min(W, H * 1.4) / 1000, 0.55, 1.25);
  const props: Prop[] = [];
  const zones: Zone[] = [];
  let zid = 0;
  const add = (kind: PropKind, x: number, y: number, w: number, h: number, face: 1 | -1 = 1) => {
    const p: Prop = { kind, x, y, w, h, face, seed: 11 + props.length * 7 };
    props.push(p);
    return p;
  };
  const zone = (kind: Zone["kind"], x: number, y: number, face: 1 | -1, seat?: { x: number; y: number }) =>
    zones.push({ id: zid++, kind, x, y, face, seat, taken: -1 });
  const lamps: Layout["lamps"] = [];

  if (lite) {
    // a phone has no spare floor: the book and the controls take all of it, so nothing is set down here
    return { props, zones, lamps };
  }

  // everything is drawn at the people's scale (a person is about 46 units tall): a shelf is a little over twice that
  const studio = scene === "studio";

  // shelves stand in the margins either side
  const sw = (studio ? 40 : 46) * u;
  const shelfL = add("shelf", W * 0.026, H * 0.5, sw, 80 * u);
  const shelfR = add("shelf", W * 0.974 - sw, H * 0.42, sw, 80 * u);
  zone("shelf", shelfL.x + sw / 2, shelfL.y + 9 * u, 1);
  zone("shelf", shelfR.x + sw / 2, shelfR.y + 9 * u, -1);
  zone("shelf", shelfL.x + sw + 16 * u, shelfL.y + 5 * u, -1);

  // a desk with a chair, lower left
  const dx = W * 0.045;
  const dy = H * 0.86;
  const desk = add("desk", dx, dy, 96 * u, 22 * u, 1);
  const chair = add("chair", dx + desk.w + 6 * u, dy + 1 * u, 22 * u, 34 * u, -1);
  zone("desk", chair.x - 4 * u, chair.y - 2, -1, { x: chair.x + 2 * u, y: chair.y - 2 });

  // a reading corner, lower right: a rug, an armchair, a lamp
  const rx = W * 0.832;
  const ry = H * 0.8;
  add("rug", rx, ry, 130 * u, 46 * u);
  const arm = add("armchair", rx + 70 * u, ry + 30 * u, 40 * u, 30 * u, -1);
  zone("rug", rx + 48 * u, ry + 36 * u, -1, { x: arm.x + 12 * u, y: arm.y + 1 * u });
  zone("rug", rx + 22 * u, ry + 40 * u, 1);
  const lp = add("lamp", W * 0.968, H * 0.83, 14 * u, 62 * u);
  lamps.push({ x: lp.x + lp.w / 2, y: lp.y - lp.h + 6 * u, r: 110 * u });
  zone("lamp", lp.x - 16 * u, lp.y - 2, 1);

  // a little table and the plants
  const tb = add("table", W * 0.9, H * 0.66, 48 * u, 24 * u);
  zone("table", tb.x - 8 * u, tb.y + 6 * u, 1);
  const pl1 = add("plant", W * 0.05, H * 0.27, 20 * u, 30 * u);
  const pl2 = add("plant", W * 0.935, H * 0.27, 22 * u, 34 * u);
  zone("plant", pl1.x + 24 * u, pl1.y + 2, -1);
  zone("plant", pl2.x - 20 * u, pl2.y + 2, 1);
  const lp2 = add("lamp", W * 0.115, H * 0.64, 12 * u, 56 * u);
  lamps.push({ x: lp2.x + lp2.w / 2, y: lp2.y - lp2.h + 6 * u, r: 90 * u });

  // marks on the floor: where people tend to cross
  add("markings", W * 0.02, H * 0.08, W * 0.96, H * 0.88);
  return { props, zones, lamps };
}

// ───────── drawing ─────────

const WOOD = "#d8c3a0";
const WOOD_D = "#bfa57d";
const LINE = "rgba(48, 40, 32, 0.34)";
const SPINES = ["#9aa6a0", "#b49a82", "#7f93ab", "#a58a7c", "#8e9f8a", "#c0aa84", "#9a8fb0", "#6f7a85", "#b3877c"];

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const k = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + k, y);
  ctx.arcTo(x + w, y, x + w, y + h, k);
  ctx.arcTo(x + w, y + h, x, y + h, k);
  ctx.arcTo(x, y + h, x, y, k);
  ctx.arcTo(x, y, x + w, y, k);
  ctx.closePath();
}

function drawShelf(ctx: CanvasRenderingContext2D, p: Prop) {
  const top = p.y - p.h;
  ctx.fillStyle = WOOD;
  rr(ctx, p.x, top, p.w, p.h, 3);
  ctx.fill();
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1;
  ctx.stroke();
  const rows = Math.max(3, Math.round(p.h / 26));
  const rh = (p.h - 12) / rows;
  const r = rng(p.seed);
  for (let i = 0; i < rows; i++) {
    const y1 = top + 6 + (i + 1) * rh;
    ctx.fillStyle = "rgba(235, 228, 214, 0.9)";
    ctx.fillRect(p.x + 4, top + 6 + i * rh, p.w - 8, rh - 1.5);
    // the books, packed and uneven; one leans
    let x = p.x + 6;
    const lean = Math.floor(r() * 7);
    while (x < p.x + p.w - 10) {
      const bw = 4 + r() * 6;
      const bh = rh * (0.55 + r() * 0.38);
      if (x + bw > p.x + p.w - 7) break;
      ctx.fillStyle = SPINES[Math.floor(r() * SPINES.length)];
      if (Math.floor((x - p.x) / 9) === lean) {
        ctx.save();
        ctx.translate(x + bw, y1 - 1.5);
        ctx.rotate(-0.22);
        ctx.fillRect(-bw, -bh, bw, bh);
        ctx.restore();
        x += bw + 6;
      } else {
        ctx.fillRect(x, y1 - 1.5 - bh, bw, bh);
        x += bw + 0.6;
      }
    }
    ctx.fillStyle = WOOD_D;
    ctx.fillRect(p.x + 4, y1 - 1.5, p.w - 8, 2);
  }
}

function drawDesk(ctx: CanvasRenderingContext2D, p: Prop) {
  const top = p.y - p.h;
  ctx.fillStyle = WOOD_D;
  ctx.fillRect(p.x + 8, top + 10, 5, p.h - 10);
  ctx.fillRect(p.x + p.w - 13, top + 10, 5, p.h - 10);
  ctx.fillStyle = WOOD;
  rr(ctx, p.x, top, p.w, 11, 2.5);
  ctx.fill();
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1;
  ctx.stroke();
  // a drawer
  ctx.fillStyle = "rgba(200, 178, 142, 0.95)";
  rr(ctx, p.x + 16, top + 11, p.w * 0.34, 16, 2);
  ctx.fill();
  ctx.stroke();
  // on it: a laptop, papers, a mug
  ctx.fillStyle = "rgba(150, 156, 162, 0.95)";
  rr(ctx, p.x + p.w * 0.46, top - 2, 30, 3, 1);
  ctx.fill();
  ctx.fillStyle = "rgba(204, 210, 214, 0.95)";
  ctx.save();
  ctx.translate(p.x + p.w * 0.46 + 28, top - 2);
  ctx.rotate(-1.3);
  ctx.fillRect(0, -22, 3, 22);
  ctx.restore();
  ctx.fillStyle = "rgba(246, 242, 232, 0.95)";
  ctx.fillRect(p.x + 14, top - 3, 22, 2);
  ctx.fillRect(p.x + 18, top - 5, 20, 2);
  ctx.fillStyle = "rgba(240, 236, 226, 0.98)";
  rr(ctx, p.x + p.w - 36, top - 10, 9, 10, 2);
  ctx.fill();
  ctx.stroke();
}

function drawChair(ctx: CanvasRenderingContext2D, p: Prop) {
  const seat = p.h * 0.36;
  const top = p.y - p.h;
  ctx.fillStyle = WOOD_D;
  ctx.fillRect(p.x + 2, p.y - seat, 3, seat);
  ctx.fillRect(p.x + p.w - 5, p.y - seat, 3, seat);
  ctx.fillStyle = WOOD;
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1;
  rr(ctx, p.x, p.y - seat - 4, p.w, 4, 1.5);
  ctx.fill();
  ctx.stroke();
  // the back is on the side away from the desk
  const bx = p.face === -1 ? p.x + p.w - 4 : p.x;
  rr(ctx, bx, top, 4, p.h - seat - 3, 1.5);
  ctx.fill();
  ctx.stroke();
}

function drawRug(ctx: CanvasRenderingContext2D, p: Prop) {
  ctx.fillStyle = "rgba(188, 176, 156, 0.7)";
  rr(ctx, p.x, p.y, p.w, p.h, 12);
  ctx.fill();
  ctx.strokeStyle = "rgba(250, 244, 230, 0.8)";
  ctx.lineWidth = 1.2;
  rr(ctx, p.x + 8, p.y + 8, p.w - 16, p.h - 16, 8);
  ctx.stroke();
  ctx.setLineDash([2, 5]);
  rr(ctx, p.x + 16, p.y + 16, p.w - 32, p.h - 32, 5);
  ctx.stroke();
  ctx.setLineDash([]);
  // the fringe
  ctx.strokeStyle = "rgba(188, 176, 156, 0.9)";
  ctx.lineWidth = 1;
  for (let x = p.x + 6; x < p.x + p.w - 4; x += 6) {
    ctx.beginPath();
    ctx.moveTo(x, p.y + p.h);
    ctx.lineTo(x, p.y + p.h + 4);
    ctx.stroke();
  }
}

function drawArmchair(ctx: CanvasRenderingContext2D, p: Prop) {
  const x = p.x;
  const y = p.y;
  const seat = p.h * 0.4;
  ctx.fillStyle = "rgba(142, 159, 138, 0.95)";
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1;
  // back, seat, cushion
  rr(ctx, p.face === -1 ? x + p.w - 13 : x, y - p.h, 13, p.h, 6);
  ctx.fill();
  ctx.stroke();
  rr(ctx, x, y - seat, p.w, seat, 5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(162, 178, 156, 0.95)";
  rr(ctx, p.face === -1 ? x + 3 : x + 16, y - seat - 3, p.w - 19, 6, 3);
  ctx.fill();
  ctx.fillStyle = WOOD_D;
  ctx.fillRect(x + 4, y, 3, 3);
  ctx.fillRect(x + p.w - 7, y, 3, 3);
}

function drawPlant(ctx: CanvasRenderingContext2D, p: Prop) {
  const r = rng(p.seed);
  const pot = p.h * 0.34;
  ctx.fillStyle = "rgba(190, 150, 122, 0.95)";
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(p.x + p.w * 0.14, p.y - pot);
  ctx.lineTo(p.x + p.w * 0.86, p.y - pot);
  ctx.lineTo(p.x + p.w * 0.72, p.y);
  ctx.lineTo(p.x + p.w * 0.28, p.y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  const cx = p.x + p.w / 2;
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI / 2 + (r() - 0.5) * 2.2;
    const len = (p.h - pot) * (0.5 + r() * 0.5);
    ctx.save();
    ctx.translate(cx, p.y - pot);
    ctx.rotate(a + Math.PI / 2);
    ctx.fillStyle = `rgba(${118 + Math.floor(r() * 30)}, ${150 + Math.floor(r() * 26)}, ${124 + Math.floor(r() * 20)}, 0.95)`;
    ctx.beginPath();
    ctx.ellipse(0, -len / 2, p.w * 0.13, len / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawLamp(ctx: CanvasRenderingContext2D, p: Prop) {
  const cx = p.x + p.w / 2;
  ctx.strokeStyle = "rgba(96, 90, 84, 0.9)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, p.y);
  ctx.lineTo(cx, p.y - p.h + 12);
  ctx.stroke();
  ctx.fillStyle = "rgba(96, 90, 84, 0.9)";
  ctx.beginPath();
  ctx.ellipse(cx, p.y, p.w * 0.4, 2.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(244, 232, 208, 0.98)";
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - p.w * 0.3, p.y - p.h + 14);
  ctx.lineTo(cx + p.w * 0.3, p.y - p.h + 14);
  ctx.lineTo(cx + p.w * 0.5, p.y - p.h);
  ctx.lineTo(cx - p.w * 0.5, p.y - p.h);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawTable(ctx: CanvasRenderingContext2D, p: Prop) {
  ctx.fillStyle = WOOD_D;
  ctx.fillRect(p.x + 8, p.y - p.h + 8, 4, p.h - 8);
  ctx.fillRect(p.x + p.w - 12, p.y - p.h + 8, 4, p.h - 8);
  ctx.fillStyle = WOOD;
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1;
  rr(ctx, p.x, p.y - p.h, p.w, 9, 4);
  ctx.fill();
  ctx.stroke();
  // two cups and a book
  ctx.fillStyle = "rgba(244, 240, 230, 0.98)";
  rr(ctx, p.x + 14, p.y - p.h - 9, 9, 9, 2);
  ctx.fill();
  ctx.stroke();
  rr(ctx, p.x + 28, p.y - p.h - 8, 8, 8, 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(176, 134, 112, 0.95)";
  ctx.fillRect(p.x + p.w - 36, p.y - p.h - 4, 22, 4);
}

function drawMarkings(ctx: CanvasRenderingContext2D, p: Prop) {
  // a few long, faint dashed lines, the way a plan marks where people go
  ctx.strokeStyle = "rgba(60, 52, 44, 0.12)";
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 8]);
  ctx.beginPath();
  ctx.moveTo(p.x, p.y + p.h * 0.18);
  ctx.bezierCurveTo(p.x + p.w * 0.2, p.y + p.h * 0.05, p.x + p.w * 0.1, p.y + p.h * 0.5, p.x + p.w * 0.16, p.y + p.h * 0.95);
  ctx.moveTo(p.x + p.w, p.y + p.h * 0.1);
  ctx.bezierCurveTo(p.x + p.w * 0.86, p.y + p.h * 0.3, p.x + p.w * 0.92, p.y + p.h * 0.6, p.x + p.w * 0.84, p.y + p.h);
  ctx.stroke();
  ctx.setLineDash([]);
}

/** The still furniture, back to front. */
export function drawStatic(ctx: CanvasRenderingContext2D, layout: Layout) {
  const order: PropKind[] = ["markings", "rug", "shelf", "desk", "chair", "table", "armchair", "plant", "lamp"];
  for (const kind of order) {
    for (const p of layout.props) {
      if (p.kind !== kind) continue;
      ctx.save();
      switch (kind) {
        case "shelf":
          drawShelf(ctx, p);
          break;
        case "desk":
          drawDesk(ctx, p);
          break;
        case "chair":
          drawChair(ctx, p);
          break;
        case "rug":
          drawRug(ctx, p);
          break;
        case "armchair":
          drawArmchair(ctx, p);
          break;
        case "plant":
          drawPlant(ctx, p);
          break;
        case "lamp":
          drawLamp(ctx, p);
          break;
        case "table":
          drawTable(ctx, p);
          break;
        case "markings":
          drawMarkings(ctx, p);
          break;
      }
      ctx.restore();
    }
  }
}

/** The lamps' glow: warm light that comes up in the evening and burns at night. */
export function drawLamps(ctx: CanvasRenderingContext2D, layout: Layout, lamps: number, t: number) {
  if (lamps < 0.02) return;
  for (let i = 0; i < layout.lamps.length; i++) {
    const l = layout.lamps[i];
    // a lamp breathes a little, each in its own time
    const flick = 1 + Math.sin(t * 1.3 + i * 2.1) * 0.025;
    const g = ctx.createRadialGradient(l.x, l.y, 2, l.x, l.y, l.r * flick);
    g.addColorStop(0, `rgba(255, 214, 150, ${0.34 * lamps})`);
    g.addColorStop(0.45, `rgba(255, 206, 140, ${0.12 * lamps})`);
    g.addColorStop(1, "rgba(255, 200, 130, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
  }
}
