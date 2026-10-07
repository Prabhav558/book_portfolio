import { gsap } from "./gsap";

/**
 * The opening drawing.
 *
 * The first volume is drawn in ink exactly over where the real book lies: the cover opens
 * out from its binding, the two halves of the line close at the clasp, the tooling and the
 * lettering follow, then the ledge grows from its middle and the other volumes rise from it.
 * Every stroke starts on the object's own axis or where another stroke ended, so nothing
 * arrives from nowhere. And because the drawing is registered to the real scene, the sheet
 * it is drawn on can simply dissolve: the lines become the thing itself.
 */

export type Rect = { x: number; y: number; w: number; h: number };

export type SketchLayout = {
  /** the first volume's cover as it lies on the table */
  book: Rect;
  /** width of the oak band along the binding */
  band: number;
  /** corner radii of the cover: at the fore-edge and at the binding */
  radius: { fore: number; spine: number };
  /** the cover icon's square (48 units a side — see CoverIcon) */
  icon: Rect | null;
  /** lettering on the cover; redrawn as ink in the same place */
  labels: HTMLElement[];
  clasp: { plate: Rect | null; strap: Rect | null; barrel: Rect | null };
  plank: Rect | null;
  /** the other volumes, standing on the ledge */
  shelfBooks: Rect[];
};

const NS = "http://www.w3.org/2000/svg";
const INK = "#1b1a18";
/** One number to make the whole drawing quicker or slower. */
const PACE = 0.88;
const f = (n: number) => n.toFixed(1);

type Stroke = { d: string; at: number; dur: number; w?: number; o?: number; ease?: string };

/** Rounded rectangle, drawn clockwise from the middle of its left side (or anticlockwise from the right). */
function rrect(r: Rect, rad: number, fromRight = false) {
  const { x, y, w, h } = r;
  const a = Math.min(rad, w / 2, h / 2);
  const [l, t, rt, b] = [x, y, x + w, y + h];
  return fromRight
    ? `M${f(rt)},${f(y + h / 2)} L${f(rt)},${f(t + a)} Q${f(rt)},${f(t)} ${f(rt - a)},${f(t)} L${f(l + a)},${f(t)} Q${f(l)},${f(t)} ${f(l)},${f(t + a)} L${f(l)},${f(b - a)} Q${f(l)},${f(b)} ${f(l + a)},${f(b)} L${f(rt - a)},${f(b)} Q${f(rt)},${f(b)} ${f(rt)},${f(b - a)} Z`
    : `M${f(l)},${f(y + h / 2)} L${f(l)},${f(t + a)} Q${f(l)},${f(t)} ${f(l + a)},${f(t)} L${f(rt - a)},${f(t)} Q${f(rt)},${f(t)} ${f(rt)},${f(t + a)} L${f(rt)},${f(b - a)} Q${f(rt)},${f(b)} ${f(rt - a)},${f(b)} L${f(l + a)},${f(b)} Q${f(l)},${f(b)} ${f(l)},${f(b - a)} Z`;
}

/** Half of the cover's outline: from the middle of the binding, round one corner pair, to `endY` on the fore-edge. */
function half(B: Rect, up: boolean, endY: number, rl: number, rr: number) {
  const { x, y, w, h } = B;
  const edge = up ? y : y + h;
  const s = up ? 1 : -1;
  return `M${f(x)},${f(y + h / 2)} L${f(x)},${f(edge + s * rl)} Q${f(x)},${f(edge)} ${f(x + rl)},${f(edge)} L${f(x + w - rr)},${f(edge)} Q${f(x + w)},${f(edge)} ${f(x + w)},${f(edge + s * rr)} L${f(x + w)},${f(endY)}`;
}

/** A volume standing on the ledge: up the binding, over the top, down the fore-edge. */
function standing(r: Rect) {
  const { x, y, w, h } = r;
  const a = Math.min(h * 0.03, w / 4);
  return `M${f(x)},${f(y + h)} L${f(x)},${f(y + a)} Q${f(x)},${f(y)} ${f(x + a)},${f(y)} L${f(x + w - a)},${f(y)} Q${f(x + w)},${f(y)} ${f(x + w)},${f(y + a)} L${f(x + w)},${f(y + h)}`;
}

/** The same lettering as the real element, in ink, each letter waiting below its own baseline. */
function letter(host: HTMLElement, el: HTMLElement): HTMLElement[] {
  const r = el.getBoundingClientRect();
  if (!r.width || !el.offsetWidth) return [];
  const cs = getComputedStyle(el);
  const k = r.width / el.offsetWidth; // the cover sits a little toward the camera, so it is drawn a touch larger
  const px = (v: string) => `${((parseFloat(v) || 0) * k).toFixed(2)}px`;
  const size = (parseFloat(cs.fontSize) || 12) * k;
  const lines = r.height > size * 1.9;
  const box = document.createElement("div");
  box.className = "ink-label";
  Object.assign(box.style, {
    left: `${r.left}px`,
    top: `${r.top}px`,
    width: `${r.width}px`,
    height: `${r.height}px`,
    fontFamily: cs.fontFamily,
    fontWeight: cs.fontWeight,
    fontSize: `${size.toFixed(2)}px`,
    letterSpacing: px(cs.letterSpacing),
    paddingLeft: px(cs.paddingLeft),
    textTransform: cs.textTransform,
    lineHeight: lines ? px(cs.lineHeight) : `${r.height}px`,
    whiteSpace: lines ? "normal" : "nowrap",
    overflow: lines ? "visible" : "hidden",
  });
  const out: HTMLElement[] = [];
  for (const ch of el.textContent ?? "") {
    const s = document.createElement("span");
    s.textContent = ch === " " ? " " : ch;
    box.appendChild(s);
    out.push(s);
  }
  host.appendChild(box);
  return out;
}

export function buildSketch(svg: SVGSVGElement, host: HTMLElement, layout: SketchLayout) {
  svg.replaceChildren();
  host.querySelectorAll(".ink-label").forEach((n) => n.remove());
  const g = document.createElementNS(NS, "g");
  g.setAttribute("fill", "none");
  g.setAttribute("stroke", INK);
  g.setAttribute("stroke-linecap", "round");
  g.setAttribute("stroke-linejoin", "round");
  svg.appendChild(g);

  const { book: B, plank: P, clasp: C, icon: S } = layout;
  const cy = B.y + B.h / 2;
  const fore = B.x + B.w;
  const strokes: Stroke[] = [];

  // 1 · the cover opens out from the middle of its binding; the oak band follows the same axis
  const top = C.strap ? C.strap.y : cy;
  const bottom = C.strap ? C.strap.y + C.strap.h : cy;
  const { fore: rf, spine: rs } = layout.radius;
  strokes.push({ d: half(B, true, top, rs, rf), at: 0, dur: 1.3, w: 1.5, ease: "power3.inOut" });
  strokes.push({ d: half(B, false, bottom, rs, rf), at: 0, dur: 1.3, w: 1.5, ease: "power3.inOut" });
  const bx = B.x + layout.band;
  strokes.push({ d: `M${f(bx)},${f(cy)} L${f(bx)},${f(B.y + 1)}`, at: 0.14, dur: 0.8 });
  strokes.push({ d: `M${f(bx)},${f(cy)} L${f(bx)},${f(B.y + B.h - 1)}`, at: 0.14, dur: 0.8 });

  // 2 · where the two halves arrive on the fore-edge, the line carries on as the strap and closes in the clasp
  if (C.strap) {
    const from = fore;
    const toPlate = C.plate ? C.plate.x + C.plate.w : C.strap.x;
    const toBarrel = C.barrel ? C.barrel.x : C.strap.x + C.strap.w;
    for (const y of [top, bottom]) {
      strokes.push({ d: `M${f(from)},${f(y)} L${f(toPlate)},${f(y)}`, at: 1.16, dur: 0.34, ease: "power2.out" });
      strokes.push({ d: `M${f(from)},${f(y)} L${f(toBarrel)},${f(y)}`, at: 1.16, dur: 0.2, ease: "power2.out" });
    }
  }
  if (C.plate) strokes.push({ d: rrect(C.plate, Math.min(C.plate.w, C.plate.h) * 0.16, true), at: 1.38, dur: 0.6 });
  if (C.barrel) strokes.push({ d: rrect(C.barrel, 2.5), at: 1.3, dur: 0.45 });

  // 3 · the tooling: the little book on the cover, in the order you would draw it
  if (S) {
    const u = S.w / 48;
    const at = (ux: number, uy: number) => `${f(S.x + ux * u)},${f(S.y + uy * u)}`;
    const w = Math.max(1.1, 1.15 * u);
    strokes.push({ d: rrect({ x: S.x + 9 * u, y: S.y + 5 * u, w: 30 * u, h: 38 * u }, 2.5 * u), at: 0.62, dur: 0.8, w });
    strokes.push({ d: `M${at(15, 5)} L${at(15, 43)}`, at: 0.92, dur: 0.5, w });
    strokes.push({ d: rrect({ x: S.x + 20 * u, y: S.y + 13 * u, w: 13 * u, h: 14 * u }, 1.5 * u), at: 1.1, dur: 0.55, w });
    strokes.push({ d: `M${at(20, 33)} L${at(33, 33)}`, at: 1.38, dur: 0.32, w, ease: "power2.out" });
    strokes.push({ d: `M${at(20, 37)} L${at(28, 37)}`, at: 1.5, dur: 0.26, w, ease: "power2.out" });
  }

  // 4 · the ledge grows out from its middle, and the other volumes rise from it
  const shelfAt = 1.42;
  if (P) {
    const mid = P.x + P.w / 2;
    const [l, r, t, b] = [P.x, P.x + P.w, P.y, P.y + P.h];
    strokes.push({ d: `M${f(mid)},${f(t)} L${f(r)},${f(t)} L${f(r)},${f(b)} L${f(mid)},${f(b)}`, at: shelfAt, dur: 0.85, ease: "power3.inOut" });
    strokes.push({ d: `M${f(mid)},${f(t)} L${f(l)},${f(t)} L${f(l)},${f(b)} L${f(mid)},${f(b)}`, at: shelfAt, dur: 0.85, ease: "power3.inOut" });
  }
  layout.shelfBooks.forEach((r, i) => {
    const at = shelfAt + 0.5 + i * 0.12;
    strokes.push({ d: standing(r), at, dur: 0.62 });
    const sx = r.x + r.w * 0.16;
    strokes.push({ d: `M${f(sx)},${f(r.y + r.h)} L${f(sx)},${f(r.y + 1)}`, at: at + 0.12, dur: 0.42, w: 1, ease: "power2.out" });
  });

  const tl = gsap.timeline();
  let end = 0;
  for (const s of strokes) {
    const path = document.createElementNS(NS, "path");
    path.setAttribute("d", s.d);
    path.setAttribute("pathLength", "1");
    path.setAttribute("stroke-width", String(s.w ?? 1.25));
    path.setAttribute("stroke-opacity", String(s.o ?? 0.88));
    // the dash starts a little way off the path, so its round cap never shows as a dot before the stroke begins
    path.style.strokeDasharray = "1 1.5";
    path.style.strokeDashoffset = "1.02";
    path.style.visibility = "hidden";
    g.appendChild(path);
    tl.fromTo(
      path,
      { strokeDashoffset: 1.02 },
      {
        strokeDashoffset: 0,
        duration: s.dur * PACE,
        ease: s.ease ?? "power2.inOut",
        immediateRender: false,
        onStart: () => {
          path.style.visibility = "visible";
        },
      },
      s.at * PACE,
    );
    end = Math.max(end, (s.at + s.dur) * PACE);
  }

  // 5 · the lettering is set, a letter at a time, each rising onto its line
  layout.labels.forEach((el, i) => {
    const letters = letter(host, el);
    if (!letters.length) return;
    const at = (1.3 + i * 0.3) * PACE;
    const each = Math.min(0.03, 0.5 / letters.length);
    tl.fromTo(
      letters,
      { yPercent: 115, opacity: 0 },
      { yPercent: 0, opacity: 1, duration: 0.75, ease: "expo.out", stagger: each, immediateRender: true },
      at,
    );
    end = Math.max(end, at + 0.75 * 0.6 + each * letters.length);
  });

  return { tl, duration: end };
}
