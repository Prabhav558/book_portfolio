import { gsap } from "./gsap";

/**
 * Turning a page by hand.
 *
 * The sheet folds along a straight crease, the way paper does when you pull a corner or an
 * edge across: the point you took hold of stays under the pointer, and the crease is the
 * perpendicular bisector between where that point was and where it is now. Whatever lies
 * beyond the crease is shown turned over — the sheet's other side, mirrored in the crease.
 * Take it by a corner and the corner peels; take it by the middle of the edge and it turns
 * straight.
 *
 * Everything is a clip-path or a transform on the leaf's own two faces, plus three gradients
 * for light and shadow. Coordinates are the leaf's: x runs from the spine, y from the top.
 *
 *   createPeel — the sheet follows the pointer and is let go
 *   createPeek — a corner lifts a little on its own, to show that it can be taken
 */

export type Pt = { x: number; y: number };

export type Peel = {
  move: (clientX: number, clientY: number) => void;
  /** Let go. `vx` is the pointer's speed in px/ms (negative = leftwards). */
  release: (vx: number, cancelled: boolean) => void;
};
export type Peek = {
  /** Put the corner back down, then tidy up. */
  release: () => void;
  /** Tidy up at once; returns where the corner had got to, so a drag can carry on from there. */
  drop: () => Pt;
};

type Leaf = {
  leaf: HTMLElement;
  front: HTMLElement;
  /** The sheet's other side; single-page books have none, so a blank one is made. */
  back: HTMLElement | null;
  single: boolean;
};

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/** The part of a convex polygon on one side of the line through `m` with normal `n`. */
function cut(poly: Pt[], m: Pt, n: Pt, positive: boolean): Pt[] {
  const side = (p: Pt) => ((p.x - m.x) * n.x + (p.y - m.y) * n.y) * (positive ? 1 : -1);
  const out: Pt[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const sa = side(a);
    const sb = side(b);
    if (sa >= 0) out.push(a);
    if (sa >= 0 !== sb >= 0) {
      const t = sa / (sa - sb);
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  return out;
}

const polygon = (pts: Pt[]) =>
  pts.length < 3 ? "polygon(0 0, 0 0, 0 0)" : `polygon(${pts.map((p) => `${p.x.toFixed(2)}px ${p.y.toFixed(2)}px`).join(",")})`;

/** Everything needed to show one leaf folded: its measurements, the extra layers, and the drawing itself. */
function mount(o: Leaf, lift: boolean) {
  const { leaf, front } = o;
  const inner = front.parentElement!;
  if (lift) leaf.classList.add("folding"); // lifts the sheet clear of both page blocks
  const W = front.offsetWidth;
  const H = front.offsetHeight;
  const box = front.getBoundingClientRect();
  const sx = W / box.width;
  const sy = H / box.height;
  const local = (cx: number, cy: number): Pt => ({ x: (cx - box.left) * sx, y: (cy - box.top) * sy });

  const make = (cls: string, parent: Element) => {
    const el = document.createElement("div");
    el.className = cls;
    parent.appendChild(el);
    return el;
  };
  const made: HTMLElement[] = [];
  let flap = o.back!;
  if (!flap) {
    flap = make("face fold-blank", inner);
    make("paper", flap).dataset.side = "L";
    made.push(flap);
  }
  const before = { transform: flap.style.transform, origin: flap.style.transformOrigin };
  const under = make("fold-under", inner);
  const underG = make("fold-under-g", under);
  const cast = make("fold-cast", inner);
  const castBox = make("fold-cast-box", cast);
  const light = make("fold-light", flap);
  made.push(under, cast, light);

  // shadows and light are long bands laid along the crease
  const S = 2 * (W + H);
  const OX = 1.5 * W;
  const OY = 0.5 * H;
  Object.assign(cast.style, { left: `${-OX}px`, top: `${-OY}px`, width: `${3 * W}px`, height: `${2 * H}px` });
  Object.assign(castBox.style, { width: `${W}px`, height: `${H}px` });
  Object.assign(underG.style, { width: `${0.3 * W}px`, height: `${S}px` });
  Object.assign(light.style, { width: `${0.9 * W}px`, height: `${S}px` });
  flap.style.transformOrigin = "0 0";

  // the sheet's outline, with its rounded fore-edge corners, so a turned corner is cut exactly like the paper
  const paper = front.querySelector<HTMLElement>(".paper");
  const r = Math.min(W / 4, paper ? parseFloat(getComputedStyle(paper).borderTopRightRadius) || 0 : 0);
  const page: Pt[] = [{ x: 0, y: 0 }];
  const arc = (cx: number, cy: number, a0: number) => {
    for (let i = 0; i <= 6; i++) {
      const a = a0 + (i / 6) * (Math.PI / 2);
      page.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
    }
  };
  arc(W - r, r, -Math.PI / 2);
  arc(W - r, H - r, 0);
  page.push({ x: 0, y: H });
  // where a shadow may fall: on the pages (both of them, in a two-page book), not on the table around the book
  const x0 = OX - (o.single ? 0 : W);
  const pages: Pt[] = [
    { x: x0, y: OY },
    { x: OX + W, y: OY },
    { x: OX + W, y: OY + H },
    { x: x0, y: OY + H },
  ];

  /** Show the sheet with its point `G` (on the page as it lies flat) carried to `Q`. */
  function render(G: Pt, Q: Pt) {
    const dx = G.x - Q.x;
    const dy = G.y - Q.y;
    const d = Math.hypot(dx, dy);
    const t = clamp((W - Q.x) / (2 * W), 0, 1); // 0 lying on the right … 1 turned over
    if (d < 0.75) {
      front.style.clipPath = "";
      flap.style.visibility = "hidden";
      under.style.opacity = cast.style.opacity = "0";
      return;
    }
    const n = { x: dx / d, y: dy / d }; // across the crease, toward the part that is turned over
    const m = { x: (G.x + Q.x) / 2, y: (G.y + Q.y) / 2 };

    front.style.clipPath = polygon(cut(page, m, n, false));

    // the other side of the sheet: a point (u, v) of it is the point (W - u, v) of the front, mirrored in the crease
    const k = (W - m.x) * n.x - m.y * n.y;
    const a = -(1 - 2 * n.x * n.x);
    const b = 2 * n.x * n.y;
    const c = -2 * n.x * n.y;
    const e2 = 1 - 2 * n.y * n.y;
    const tx = W - 2 * k * n.x;
    const ty = -2 * k * n.y;
    flap.style.visibility = "visible";
    flap.style.transform = `translate3d(0,0,1px) matrix(${a.toFixed(5)},${b.toFixed(5)},${c.toFixed(5)},${e2.toFixed(5)},${tx.toFixed(2)},${ty.toFixed(2)})`;
    flap.style.clipPath = polygon(cut(page, m, n, true).map((p) => ({ x: W - p.x, y: p.y })));
    if (o.single) flap.style.opacity = (1 - smooth(0.62, 0.96, t)).toFixed(3);

    // light on the turned part: dark in the crease, a highlight where the paper rises, then even
    const ang = (x: number, y: number) => ((Math.atan2(y, x) * 180) / Math.PI).toFixed(3);
    light.style.transform = `translate(${(W - m.x).toFixed(2)}px,${m.y.toFixed(2)}px) rotate(${ang(-n.x, n.y)}deg) translate(0,${-S / 2}px)`;
    light.style.opacity = (1 - smooth(0.8, 1, t)).toFixed(3);

    // shadow on the page uncovered beneath, deepest along the crease
    underG.style.transform = `translate(${m.x.toFixed(2)}px,${m.y.toFixed(2)}px) rotate(${ang(n.x, n.y)}deg) translate(0,${-S / 2}px)`;
    under.style.opacity = (smooth(0, 0.22 * W, d) * (1 - smooth(0.82, 1, t))).toFixed(3);

    // shadow the turned part throws on what it lies over; only on this side of the crease
    castBox.style.transform = `matrix(${a.toFixed(5)},${b.toFixed(5)},${c.toFixed(5)},${e2.toFixed(5)},${(tx + OX).toFixed(2)},${(ty + OY).toFixed(2)})`;
    cast.style.clipPath = polygon(cut(pages, { x: m.x + OX, y: m.y + OY }, n, false));
    cast.style.opacity = (smooth(0, 0.5 * W, d) * (1 - smooth(0.86, 1, t)) * (o.single ? 1 - smooth(0.5, 0.9, t) : 1)).toFixed(3);
  }

  /** Put everything back exactly as it was found. */
  function unmount() {
    front.style.clipPath = "";
    flap.style.clipPath = "";
    flap.style.visibility = "";
    flap.style.opacity = "";
    flap.style.transform = before.transform;
    flap.style.transformOrigin = before.origin;
    made.forEach((el) => el.remove());
    leaf.classList.remove("folding");
  }

  return { W, H, sx, local, render, unmount };
}

export function createPeel(
  o: Leaf & {
    /** +1: the sheet lies on the right and is turned over. -1: it is turned and is brought back. */
    dir: 1 | -1;
    /** Where the pointer took hold. */
    x: number;
    y: number;
    /** Where the held point already is, if a corner was lifted when the drag began. */
    lifted?: Pt;
    /** The first real movement. */
    onStart: () => void;
    /** The sheet has come to rest: turned over, or lying on the right. Everything this module touched is restored first. */
    onDone: (turned: boolean) => void;
  },
): Peel {
  const sheet = mount(o, true);
  const { W, H } = sheet;

  // the point of the sheet that is held: on the fore-edge, at the height of the pointer — or the corner, if it is near one
  const p0 = sheet.local(o.x, o.y);
  const G: Pt = { x: W, y: p0.y < H * 0.24 ? 0 : p0.y > H * 0.76 ? H : clamp(p0.y, 0, H) };
  const turnedAt: Pt = { x: -W, y: G.y };
  const from = o.dir > 0 ? G : turnedAt;
  // on a single page there is no left-hand page to drag across, so the sheet travels further than the finger
  const gain = !o.single ? 1 : o.dir > 0 ? (1.3 * W) / clamp(p0.x, 0.3 * W, W) : (2 * W) / Math.max(0.5 * W, W - p0.x);
  const rest0 = Math.hypot(G.x, G.y); // paper does not stretch: the held point keeps its distance from both ends of the spine
  const rest1 = Math.hypot(G.x, G.y - H);
  const reach = (q: Pt): Pt => {
    let { x, y } = q;
    for (let k = 0; k < 3; k++) {
      let d = Math.hypot(x, y);
      if (d > rest0) {
        x *= rest0 / d;
        y *= rest0 / d;
      }
      d = Math.hypot(x, y - H);
      if (d > rest1) {
        x *= rest1 / d;
        y = H + (y - H) * (rest1 / d);
      }
    }
    return { x, y };
  };

  let want: Pt = { ...from };
  let shown: Pt = o.lifted ? reach(o.lifted) : { ...from };
  let started = false;
  let raf = 0;
  let settling: gsap.core.Tween | null = null;
  const tick = () => {
    // a little easing takes the jitter out of a mouse without making the sheet feel loose
    shown = { x: shown.x + (want.x - shown.x) * 0.55, y: shown.y + (want.y - shown.y) * 0.55 };
    sheet.render(G, shown);
    raf = requestAnimationFrame(tick);
  };
  sheet.render(G, shown);

  const finish = (turned: boolean) => {
    cancelAnimationFrame(raf);
    settling?.kill();
    sheet.unmount();
    o.onDone(turned);
  };

  return {
    move(cx, cy) {
      if (settling) return;
      const p = sheet.local(cx, cy);
      want = reach({ x: from.x + (p.x - p0.x) * gain, y: from.y + (p.y - p0.y) * gain });
      if (!started) {
        started = true;
        o.onStart();
        raf = requestAnimationFrame(tick);
      }
    },
    release(vx, cancelled) {
      if (settling) return;
      if (!started) return finish(o.dir < 0);
      cancelAnimationFrame(raf);
      const t = (W - want.x) / (2 * W);
      const v = -vx * sheet.sx * gain; // px/ms across the page, positive = turning over
      const turned = cancelled ? o.dir < 0 : v > 0.35 ? true : v < -0.35 ? false : t > 0.5;
      const to = turned ? turnedAt : G;
      const start = { ...shown };
      const far = Math.hypot(to.x - start.x, to.y - start.y) / (2 * W);
      const s = { v: 0 };
      settling = gsap.to(s, {
        v: 1,
        duration: clamp((0.3 + 0.5 * far) / clamp(Math.abs(v) * 0.9, 1, 1.8), 0.22, 0.8),
        ease: Math.abs(v) > 0.35 ? "power2.out" : "power2.inOut",
        onUpdate: () => sheet.render(G, reach({ x: start.x + (to.x - start.x) * s.v, y: start.y + (to.y - start.y) * s.v })),
        onComplete: () => finish(turned),
      });
    },
  };
}

/** A corner of the sheet lifts a little way and stays there: an invitation to take it. */
export function createPeek(o: Leaf & { corner: "top" | "bottom" }): Peek {
  const sheet = mount(o, false);
  const { W, H } = sheet;
  const G: Pt = { x: W, y: o.corner === "top" ? 0 : H };
  const up = o.corner === "top" ? 1 : -1;
  const at = (s: number): Pt => ({ x: G.x - 0.085 * W * s, y: G.y + up * 0.07 * W * s });
  const s = { v: 0 };
  let done = false;
  const tw = gsap.to(s, { v: 1, duration: 0.5, ease: "power3.out", onUpdate: () => sheet.render(G, at(s.v)) });
  const end = () => {
    if (done) return;
    done = true;
    sheet.unmount();
  };
  return {
    release() {
      tw.kill();
      gsap.to(s, { v: 0, duration: 0.35, ease: "power2.inOut", onUpdate: () => !done && sheet.render(G, at(s.v)), onComplete: end });
    },
    drop() {
      tw.kill();
      gsap.killTweensOf(s);
      end();
      return at(s.v);
    },
  };
}
