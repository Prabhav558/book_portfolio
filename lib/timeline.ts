import { gsap } from "./gsap";
import type { Mode } from "@/components/book/types";
import type { SoundName } from "./audio";
import { applyCurl, castLanding, castUnder, collectBend, createFill, fillRig, type RigJob } from "./curl";

/**
 * One timeline per book. Every book lives on the shelf; its timeline plays
 *
 *   pull from slot → open → flip … flip → close → return to slot (→ outro, last book)
 *
 * and ends in the exact visual state it began in, so the director can reset it
 * invisibly and replay it from any entry point (see lib/director.ts).
 * Durations are real seconds.
 */
export const D = { pull: 0.95, open: 1.35, flip: 1.3, close: 0.95, ret: 1, outro: 0.9 };
export const CAMERA_ZOOM = 1.03;
export const SHELF_TILT = 14;
/** Fraction of a book's return after which the next book starts leaving the shelf. */
export const HANDOFF = 0.4;

export type Marker = { time: number; fwd?: SoundName; back?: SoundName };
export type BookTL = {
  tl: gsap.core.Timeline;
  /** open (pull finished, cover closed), s0…sN (resting spreads), close, ret, shelved, end */
  labels: Record<string, number>;
  spreads: number;
  markers: Marker[];
  glow: { v: number };
  end: number;
  /** Build the turning sheet for the leaf about to move, while the reader is still on the spread. */
  prepare: (spread: number, dir: 1 | -1) => void;
};

export type BookEls = ReturnType<typeof bookEls>;

export function bookEls(anchor: HTMLElement) {
  const q = (s: string) => anchor.querySelector<HTMLElement>(s);
  const pageLeaves = Array.from(anchor.querySelectorAll<HTMLElement>(".leaf--page"));
  const rig = q(".rig")!;
  return {
    anchor,
    shadow: q(".book-shadow")!,
    body: q(".book-body")!,
    book: q(".book")!,
    leaves: q(".leaves")!,
    cover: q(".leaf.cover")!,
    sheen: q(".cover-sheen")!,
    ribbon: q(".ribbon")!,
    coverBack: q(".cover-back"),
    base: q(".leaf--base .face")!,
    pageLeaves,
    fronts: pageLeaves.map((l) => l.querySelector<HTMLElement>(".face--front")!),
    backs: pageLeaves.map((l) => l.querySelector<HTMLElement>(".face--back")),
    rig,
    bend: collectBend(rig),
    /** Which leaf the rig currently holds copies of (-1 = none). */
    rigLeaf: -1,
    rigJob: null as RigJob | null,
  };
}

const part = (face: Element | null | undefined, cls: string) => face?.querySelector<HTMLElement>(cls) ?? null;

export function slotPose(a: HTMLElement, slot: HTMLElement) {
  const r = slot.getBoundingClientRect();
  return {
    x: r.left + r.width / 2 - window.innerWidth / 2,
    y: r.top + r.height / 2 - a.offsetTop,
    s: r.height / a.offsetHeight,
  };
}

/** Everything a book looks like before its timeline has touched it. */
export function resetBook(e: BookEls) {
  gsap.set(e.anchor, { xPercent: -50, yPercent: -50, zIndex: 1, visibility: "visible" });
  gsap.set(e.body, { rotationX: 0, rotationY: SHELF_TILT, rotation: 0, scale: 1, y: 0 });
  gsap.set(e.book, { xPercent: 0 });
  gsap.set([e.cover, ...e.pageLeaves], { rotationY: 0, opacity: 1 });
  e.pageLeaves.forEach((l) => (l.style.visibility = ""));
  gsap.set(e.leaves, { visibility: "hidden" });
  gsap.set(e.anchor.querySelectorAll(".shade, .cast, .leaf-gloss"), { opacity: 0 });
  gsap.set(e.shadow, { opacity: 0, scaleX: 1 });
  gsap.set(e.sheen, { xPercent: -18 });
  gsap.set(e.anchor.querySelectorAll("[data-draw]"), { scaleY: 0 });
  e.rig.classList.remove("on");
}

export function applyShelfPose(e: BookEls, slot: HTMLElement) {
  const P = slotPose(e.anchor, slot);
  gsap.set(e.anchor, { x: P.x, y: P.y, scale: P.s });
}

function ft(tl: gsap.core.Timeline, target: gsap.TweenTarget | null, from: gsap.TweenVars, to: gsap.TweenVars, at: number) {
  if (!target || (Array.isArray(target) && target.length === 0)) return;
  tl.fromTo(target, from, { ...to, immediateRender: false }, at);
}

/** Deterministic, reversible visibility switch. */
function flipVis(tl: gsap.core.Timeline, target: gsap.TweenTarget, from: string, to: string, at: number) {
  ft(tl, target, { visibility: from }, { visibility: to, duration: 0.001 }, at);
}

/** Overlay that darkens then clears — a cast shadow sweeping over a page. */
function pulse(tl: gsap.core.Timeline, el: HTMLElement | null, peak: number, at: number, up: number, hold: number, down: number) {
  if (!el) return;
  ft(tl, el, { opacity: 0 }, { opacity: peak, duration: up, ease: "power1.out" }, at);
  ft(tl, el, { opacity: peak }, { opacity: 0, duration: down, ease: "power1.in" }, at + up + hold);
}

export function buildBook(
  k: number,
  e: BookEls,
  slot: HTMLElement,
  mode: Mode,
  opts: { last: boolean; outro: HTMLElement | null },
): BookTL {
  const tl = gsap.timeline({ paused: true, defaults: { ease: "none" } });
  const single = mode === "single";
  const P = slotPose(e.anchor, slot);
  const markers: Marker[] = [];
  const labels: Record<string, number> = {};
  const glow = { v: 0 };
  const spreads = e.pageLeaves.length + 1;
  const stage: (() => void)[] = [];
  const END = single ? -150 : -180;
  void k;

  let t = 0;

  // ───────── pull from the shelf ─────────
  const pull = D.pull;
  ft(tl, e.anchor, { zIndex: 1 }, { zIndex: 6, duration: 0.001 }, 0);
  ft(tl, slot, { "--filled": 1 }, { "--filled": 0, duration: 0.3 }, 0);
  ft(tl, glow, { v: 0 }, { v: 1, duration: pull, ease: "sine.inOut" }, 0);
  // it lifts off the shelf, then travels: x and y ease differently so the path arcs
  ft(tl, e.anchor, { x: P.x }, { x: 0, duration: pull * 0.86, ease: "power2.inOut" }, pull * 0.14);
  ft(tl, e.anchor, { y: P.y }, { y: 0, duration: pull * 0.86, ease: "power3.inOut" }, pull * 0.14);
  ft(tl, e.anchor, { scale: P.s }, { scale: P.s * 1.28, duration: pull * 0.3, ease: "power2.out" }, 0);
  ft(tl, e.anchor, { scale: P.s * 1.28 }, { scale: 1, duration: pull * 0.7, ease: "power3.inOut" }, pull * 0.3);
  ft(tl, e.body, { rotationY: SHELF_TILT }, { rotationY: 0, duration: pull, ease: "power2.inOut" }, 0);
  ft(tl, e.body, { rotationX: 0 }, { rotationX: 16, duration: pull * 0.45, ease: "power2.out" }, 0);
  ft(tl, e.body, { rotationX: 16 }, { rotationX: 0, duration: pull * 0.55, ease: "power2.inOut" }, pull * 0.45);
  ft(tl, e.body, { rotation: 0 }, { rotation: -5, duration: pull * 0.5, ease: "sine.inOut" }, 0);
  ft(tl, e.body, { rotation: -5 }, { rotation: 0, duration: pull * 0.5, ease: "sine.inOut" }, pull * 0.5);
  ft(tl, e.shadow, { opacity: 0 }, { opacity: 1, duration: pull * 0.7, ease: "power1.inOut" }, pull * 0.3);
  markers.push({ time: pull * 0.05, fwd: "shelf", back: "shelf" });
  t = pull;
  labels.open = t;

  // ───────── open ─────────
  const first = e.fronts[0] ?? e.base;
  flipVis(tl, e.leaves, "hidden", "inherit", t);
  const O = D.open;
  if (!single) {
    ft(tl, e.cover, { rotationY: 0 }, { rotationY: -180, duration: O, ease: "power3.inOut" }, t);
    ft(tl, e.book, { xPercent: 0 }, { xPercent: 50, duration: O, ease: "power3.inOut" }, t);
    ft(tl, e.anchor, { scale: 1 }, { scale: CAMERA_ZOOM, duration: O, ease: "power2.inOut" }, t);
    ft(tl, e.shadow, { scaleX: 1 }, { scaleX: 2, duration: O, ease: "power3.inOut" }, t);
    ft(tl, part(e.coverBack, ".shade"), { opacity: 0.6 }, { opacity: 0, duration: O * 0.5, ease: "power1.out" }, t + O * 0.5);
  } else {
    ft(tl, e.cover, { rotationY: 0 }, { rotationY: -105, duration: O * 0.9, ease: "power2.in" }, t);
    ft(tl, e.cover, { opacity: 1 }, { opacity: 0, duration: O * 0.3, ease: "power1.in" }, t + O * 0.6);
  }
  ft(tl, e.sheen, { xPercent: -18 }, { xPercent: 26, duration: O * 0.7, ease: "power1.inOut" }, t);
  pulse(tl, part(first, ".cast"), 0.85, t, O * 0.3, O * 0.1, O * 0.5);
  const drawIn = (step: number, at: number) => {
    const els = e.anchor.querySelectorAll(`.face[data-step="${step}"] [data-draw]`);
    if (els.length) ft(tl, els, { scaleY: 0 }, { scaleY: 1, duration: 0.5, ease: "power2.out" }, at);
  };
  drawIn(0, t + O * 0.6);
  markers.push({ time: t + 0.1, fwd: "open", back: "close" });
  t += O;
  labels.s0 = t;

  // ───────── page turns ─────────
  e.pageLeaves.forEach((leaf, i) => {
    const front = e.fronts[i];
    const back = e.backs[i];
    const under = e.fronts[i + 1] ?? e.base;
    const prevLeft = i === 0 ? e.coverBack : e.backs[i - 1];
    const castUnderEl = part(under, ".cast");
    const castLandEl = part(prevLeft, ".cast");
    const prox = { p: 0 };
    let state = 0 as 0 | 1 | 2;

    // copy this leaf's pages into the rig ahead of time, so the turn itself has nothing to build
    stage[i] = () => {
      if (state === 2 || e.rigLeaf === i) return;
      if (e.rigJob) e.rigJob.cancelled = true;
      e.rig.style.setProperty("--z", leaf.style.getPropertyValue("--z"));
      const job = createFill(e.rig, front, back);
      e.rigJob = job;
      e.bend.last = -1;
      e.rigLeaf = i;
      e.rig.style.opacity = "0.001";
      e.rig.classList.add("on");
      // one strip per idle slice: no single task ever holds up a frame
      const idle = (fn: () => void) =>
        typeof window.requestIdleCallback === "function" ? window.requestIdleCallback(fn, { timeout: 250 }) : window.setTimeout(fn, 24);
      const run = () => {
        if (!job.step()) idle(run);
      };
      idle(run);
    };

    const rest = (turned: boolean) => {
      if (e.rigLeaf === i && !turned) e.rig.style.opacity = "0.001";
      else {
        e.rig.classList.remove("on");
        if (e.rigLeaf === i) e.rigLeaf = -1;
      }
      if (turned) {
        if (single) leaf.style.visibility = "hidden";
        else {
          leaf.style.visibility = "";
          gsap.set(leaf, { rotationY: END });
        }
      } else {
        leaf.style.visibility = "";
        gsap.set(leaf, { rotationY: 0, opacity: 1 });
      }
      if (castUnderEl) castUnderEl.style.opacity = "0";
      if (castLandEl) castLandEl.style.opacity = "0";
    };

    const update = () => {
      const p = prox.p;
      if (p <= 0.0004) {
        if (state !== 0) {
          state = 0;
          rest(false);
        }
        return;
      }
      if (p >= 0.9996) {
        if (state !== 1) {
          state = 1;
          rest(true);
        }
        return;
      }
      if (state !== 2) {
        state = 2;
        if (e.rigLeaf !== i) {
          if (e.rigJob) e.rigJob.cancelled = true;
          e.rig.style.setProperty("--z", leaf.style.getPropertyValue("--z"));
          fillRig(e.rig, front, back);
          e.bend.last = -1;
          e.rigLeaf = i;
        } else {
          e.rigJob?.flush(); // started early, finish whatever idle time didn't
        }
        e.rig.style.opacity = "";
        e.rig.classList.add("on");
        leaf.style.visibility = "hidden";
      }
      applyCurl(e.bend, p, END, single);
      if (castUnderEl) castUnderEl.style.opacity = castUnder(p).toFixed(3);
      if (castLandEl && !single) castLandEl.style.opacity = castLanding(p).toFixed(3);
    };

    tl.fromTo(prox, { p: 0 }, { p: 1, duration: D.flip, ease: "power2.inOut", immediateRender: false, onUpdate: update }, t);
    drawIn(i + 1, t + D.flip * 0.55);
    markers.push({ time: t + D.flip * 0.1, fwd: "flip", back: "flip" });
    t += D.flip;
    labels[`s${i + 1}`] = t;
  });

  // ───────── close ─────────
  labels.close = t;
  const C = D.close;
  if (!single) {
    // the top of the left-hand stack lands first, the cover follows — no planes cross
    const stack = [...e.pageLeaves].reverse().concat(e.cover);
    stack.forEach((el, j) => {
      ft(tl, el, { rotationY: -180 }, { rotationY: 0, duration: C - j * 0.03, ease: "power2.inOut" }, t + j * 0.03);
    });
    ft(tl, e.book, { xPercent: 50 }, { xPercent: 0, duration: C, ease: "power2.inOut" }, t);
    ft(tl, e.anchor, { scale: CAMERA_ZOOM }, { scale: 1, duration: C, ease: "power2.inOut" }, t);
    ft(tl, e.shadow, { scaleX: 2 }, { scaleX: 1, duration: C, ease: "power2.inOut" }, t);
  } else {
    ft(tl, e.cover, { rotationY: -105 }, { rotationY: 0, duration: C, ease: "power2.out" }, t);
    ft(tl, e.cover, { opacity: 0 }, { opacity: 1, duration: C * 0.3, ease: "power1.out" }, t);
  }
  ft(tl, e.sheen, { xPercent: 26 }, { xPercent: -18, duration: C, ease: "power1.inOut" }, t);
  flipVis(tl, e.leaves, "inherit", "hidden", t + C);
  markers.push({ time: t + C * 0.92, fwd: "close", back: "open" });
  t += C;

  // ───────── back onto the shelf ─────────
  labels.ret = t;
  const R = D.ret;
  ft(tl, e.anchor, { x: 0 }, { x: P.x, duration: R * 0.86, ease: "power2.inOut" }, t);
  ft(tl, e.anchor, { y: 0 }, { y: P.y, duration: R * 0.86, ease: "power3.inOut" }, t);
  ft(tl, e.anchor, { scale: 1 }, { scale: P.s * 1.28, duration: R * 0.7, ease: "power3.inOut" }, t);
  ft(tl, e.anchor, { scale: P.s * 1.28 }, { scale: P.s, duration: R * 0.3, ease: "power2.in" }, t + R * 0.7);
  ft(tl, e.body, { rotationY: 0 }, { rotationY: SHELF_TILT, duration: R, ease: "power2.inOut" }, t);
  ft(tl, e.body, { rotationX: 0 }, { rotationX: 14, duration: R * 0.5, ease: "power2.out" }, t);
  ft(tl, e.body, { rotationX: 14 }, { rotationX: 0, duration: R * 0.5, ease: "power2.inOut" }, t + R * 0.5);
  ft(tl, e.body, { rotation: 0 }, { rotation: 4, duration: R * 0.5, ease: "sine.inOut" }, t);
  ft(tl, e.body, { rotation: 4 }, { rotation: 0, duration: R * 0.5, ease: "sine.inOut" }, t + R * 0.5);
  ft(tl, e.shadow, { opacity: 1 }, { opacity: 0, duration: R * 0.6, ease: "power1.in" }, t + R * 0.4);
  ft(tl, glow, { v: 1 }, { v: 0, duration: R, ease: "sine.inOut" }, t);
  ft(tl, slot, { "--filled": 0 }, { "--filled": 1, duration: 0.25 }, t + R * 0.78);
  ft(tl, e.anchor, { zIndex: 6 }, { zIndex: 1, duration: 0.001 }, t + R);
  markers.push({ time: t + R * 0.93, fwd: "shelf", back: "shelf" });
  t += R;
  labels.shelved = t;

  // ───────── epilogue (last book only) ─────────
  if (opts.last && opts.outro) {
    ft(tl, opts.outro, { autoAlpha: 0, y: 28 }, { autoAlpha: 1, y: 0, duration: D.outro, ease: "power2.out" }, t);
    t += D.outro;
  }
  labels.end = t;

  tl.add(() => {}, t); // pin the duration
  const prepare = (spread: number, dir: 1 | -1) => {
    const i = dir > 0 ? spread : spread - 1;
    if (i >= 0 && i < stage.length) stage[i]();
  };
  return { tl, labels, spreads, markers: markers.sort((a, b) => a.time - b.time), glow, end: t, prepare };
}
