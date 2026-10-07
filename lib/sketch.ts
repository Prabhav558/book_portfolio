import { gsap } from "./gsap";

/**
 * Builds the opening pencil sketch: the diary, its clasp, the shelf and the
 * three volumes waiting on it, drawn stroke by stroke with a moving graphite
 * nib. Coordinates come from the real layout, so the sketch lands exactly on
 * what the lights then reveal.
 */

export type Rect = { x: number; y: number; w: number; h: number };
const NS = "http://www.w3.org/2000/svg";
const rnd = (a: number) => (Math.random() * 2 - 1) * a;
/** Global pencil speed — strokes are authored in px/s at 1×. */
const SP = 4.6;

type Stroke = { d: string; len: number; w: number; o: number; speed: number; nib: boolean; overlap?: number };

/** A slightly wandering line with a little overshoot at each end, like a pencil stroke. */
function line(x1: number, y1: number, x2: number, y2: number, amp = 0.9, over = 5): { d: string; len: number } {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len0 = Math.hypot(dx, dy) || 1;
  const ux = dx / len0;
  const uy = dy / len0;
  const o1 = over * (0.4 + Math.random() * 0.8);
  const o2 = over * (0.4 + Math.random() * 0.8);
  const ax = x1 - ux * o1;
  const ay = y1 - uy * o1;
  const bx = x2 + ux * o2;
  const by = y2 + uy * o2;
  const len = len0 + o1 + o2;
  const n = Math.max(2, Math.round(len / 48));
  const nx = -uy;
  const ny = ux;
  const pts: [number, number][] = [[ax + nx * rnd(amp * 0.6), ay + ny * rnd(amp * 0.6)]];
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const o = rnd(amp) * (i === n ? 0.5 : 1);
    pts.push([ax + (bx - ax) * t + nx * o, ay + (by - ay) * t + ny * o]);
  }
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2;
    const my = (pts[i][1] + pts[i + 1][1]) / 2;
    d += ` Q${pts[i][0].toFixed(1)},${pts[i][1].toFixed(1)} ${mx.toFixed(1)},${my.toFixed(1)}`;
  }
  const last = pts[pts.length - 1];
  d += ` L${last[0].toFixed(1)},${last[1].toFixed(1)}`;
  return { d, len };
}

/** A loose handwriting-like wave for the title lines. */
function scribble(x: number, y: number, w: number, amp = 3): { d: string; len: number } {
  const n = Math.max(4, Math.round(w / 14));
  let d = `M${x.toFixed(1)},${y.toFixed(1)}`;
  for (let i = 1; i <= n; i++) {
    const cx = x + (w * (i - 0.5)) / n;
    const ex = x + (w * i) / n;
    d += ` Q${cx.toFixed(1)},${(y + rnd(amp)).toFixed(1)} ${ex.toFixed(1)},${(y + rnd(amp * 0.4)).toFixed(1)}`;
  }
  return { d, len: w * 1.12 };
}

function box(r: Rect, o: { amp?: number; w: number; op: number; speed: number; nib: boolean; over?: number }): Stroke[] {
  const { x, y, w, h } = r;
  const edges: [number, number, number, number][] = [
    [x, y, x + w, y],
    [x + w, y, x + w, y + h],
    [x + w, y + h, x, y + h],
    [x, y + h, x, y],
  ];
  return edges.map(([a, b, c, d]) => ({ ...line(a, b, c, d, o.amp ?? 0.9, o.over ?? 5), w: o.w, o: o.op, speed: o.speed, nib: o.nib }));
}

export function buildSketch(
  svg: SVGSVGElement,
  layout: { book: Rect; plank: Rect; shelfBooks: Rect[] },
) {
  svg.replaceChildren();
  const g = document.createElementNS(NS, "g");
  g.setAttribute("fill", "none");
  g.setAttribute("stroke", "#3a3028");
  g.setAttribute("stroke-linecap", "round");
  g.setAttribute("stroke-linejoin", "round");
  svg.appendChild(g);

  const { book: B, plank: P, shelfBooks } = layout;
  const seq: Stroke[][] = []; // each group runs in order; strokes inside a group overlap

  // 1 · the diary: outline, then a lighter second pass
  const outline = box(B, { w: 1.5, op: 0.85, speed: 1000, nib: true, over: 7 });
  const second = box({ x: B.x + 1.6, y: B.y + 1.4, w: B.w - 2.4, h: B.h - 2.6 }, { w: 0.9, op: 0.32, speed: 1300, nib: false, amp: 1.4, over: 4 });
  seq.push(outline);
  seq.push(second);

  // 2 · details: the oak spine band, the line icon, a quiet label, the steel clasp
  const spine = [{ ...line(B.x + B.w * 0.13, B.y + 2, B.x + B.w * 0.13, B.y + B.h - 2, 0.7, 2), w: 1.2, o: 0.65, speed: 900, nib: true }];
  const cx = B.x + B.w * 0.565;
  const iw = B.w * 0.3;
  const ih = B.w * 0.38;
  const iy = B.y + B.h * 0.4 - ih / 2;
  const icon: Stroke[] = [
    ...box({ x: cx - iw / 2, y: iy, w: iw, h: ih }, { w: 1.3, op: 0.7, speed: 700, nib: true, amp: 0.6, over: 2.5 }),
    { ...line(cx - iw / 2 + iw * 0.2, iy + 2, cx - iw / 2 + iw * 0.2, iy + ih - 2, 0.4, 0), w: 1, o: 0.55, speed: 600, nib: true },
    ...box({ x: cx - iw * 0.08, y: iy + ih * 0.2, w: iw * 0.4, h: ih * 0.32 }, { w: 1, op: 0.6, speed: 500, nib: true, amp: 0.4, over: 1.5 }),
  ];
  const title: Stroke[] = [
    { ...scribble(cx - B.w * 0.1, B.y + B.h * 0.14, B.w * 0.2, 1.4), w: 1, o: 0.5, speed: 420, nib: true },
    { ...scribble(cx - B.w * 0.19, B.y + B.h * 0.6, B.w * 0.38, 2.6), w: 1.5, o: 0.75, speed: 520, nib: true },
    { ...scribble(cx - B.w * 0.14, B.y + B.h * 0.86, B.w * 0.28, 1.8), w: 1, o: 0.5, speed: 440, nib: true },
  ];
  const clasp = box(
    { x: B.x + B.w * 0.78, y: B.y + B.h * 0.445, w: B.w * 0.25, h: B.h * 0.11 },
    { w: 1.3, op: 0.8, speed: 700, nib: true, amp: 0.6, over: 2.5 },
  );
  seq.push(spine, icon, title, clasp);

  // 3 · shading on the table side of the diary
  const hatch: Stroke[] = [];
  for (let i = 0; i < 11; i++) {
    const hx = B.x + B.w + 6 + i * 3.6;
    hatch.push({ ...line(hx + 10, B.y + B.h * 0.06 + i * 3, hx - 12, B.y + B.h * (0.62 + i * 0.03), 0.4, 0), w: 0.8, o: 0.3, speed: 1500, nib: i % 3 === 0, overlap: 0.82 });
  }
  seq.push(hatch);

  // 4 · the shelf and the three volumes waiting on it
  const shelf: Stroke[] = [
    { ...line(P.x - 6, P.y, P.x + P.w + 6, P.y, 0.8, 4), w: 1.5, o: 0.8, speed: 1100, nib: true },
    { ...line(P.x - 2, P.y + P.h, P.x + P.w + 2, P.y + P.h, 0.8, 3), w: 1.2, o: 0.7, speed: 1100, nib: true },
    { ...line(P.x - 6, P.y, P.x - 6, P.y + P.h, 0.3, 1), w: 1, o: 0.6, speed: 300, nib: true },
    { ...line(P.x + P.w + 6, P.y, P.x + P.w + 6, P.y + P.h, 0.3, 1), w: 1, o: 0.6, speed: 300, nib: true },
  ];
  seq.push(shelf);
  shelfBooks.forEach((r) => {
    const bk = box(r, { w: 1.2, op: 0.75, speed: 600, nib: true, amp: 0.6, over: 2.5 });
    bk.push({ ...line(r.x + r.w * 0.14, r.y + 2, r.x + r.w * 0.14, r.y + r.h - 2, 0.4, 0), w: 0.8, o: 0.5, speed: 500, nib: true });
    seq.push(bk);
  });

  // the nib
  const nib = document.createElementNS(NS, "g");
  nib.setAttribute("opacity", "0");
  const tip = document.createElementNS(NS, "circle");
  tip.setAttribute("r", "2.1");
  tip.setAttribute("fill", "#2a2420");
  const ring = document.createElementNS(NS, "circle");
  ring.setAttribute("r", "7");
  ring.setAttribute("fill", "rgba(58,48,40,.12)");
  nib.append(ring, tip);
  svg.appendChild(nib);

  const tl = gsap.timeline();
  let cursor = 0;
  seq.forEach((group) => {
    const parallel = group === second || group === hatch;
    let groupEnd = cursor;
    let gc = cursor + (group === hatch ? 0.5 : 0);
    group.forEach((s, i) => {
      const path = document.createElementNS(NS, "path");
      path.setAttribute("d", s.d);
      path.setAttribute("pathLength", "1");
      path.setAttribute("stroke-width", String(s.w));
      path.setAttribute("stroke-opacity", String(s.o));
      path.style.strokeDasharray = "1 1";
      path.style.strokeDashoffset = "1";
      path.style.visibility = "hidden";
      g.appendChild(path);
      const dur = Math.max(0.08, s.len / (s.speed * SP));
      const prox = { p: 0 };
      const total = path.getTotalLength();
      // the second pass starts a beat after the first stroke, then follows its pace
      const start = group === second ? cursor - 0.5 + i * dur * 0.6 : gc;
      tl.fromTo(
        prox,
        { p: 0 },
        {
          p: 1,
          duration: dur,
          ease: "power1.inOut",
          immediateRender: false,
          onStart: () => {
            path.style.visibility = "visible";
            if (s.nib) gsap.set(nib, { opacity: 1 });
          },
          onUpdate: () => {
            path.style.strokeDashoffset = String(1 - prox.p);
            if (s.nib) {
              const pt = path.getPointAtLength(total * prox.p);
              nib.setAttribute("transform", `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)})`);
            }
          },
          onComplete: () => {
            path.style.strokeDashoffset = "0";
          },
        },
        start,
      );
      groupEnd = Math.max(groupEnd, start + dur);
      gc = start + dur * (s.overlap ?? 0.9) + (group === hatch ? 0.01 : 0.02);
    });
    // the second pass and the shading run alongside the details instead of after them
    if (!parallel) cursor = groupEnd;
  });
  tl.set(nib, { opacity: 0 }, cursor + 0.05);

  return { tl, group: g, nib, duration: cursor + 0.05 };
}
