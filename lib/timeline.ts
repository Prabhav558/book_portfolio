import { gsap } from "./gsap";
import type { Mode } from "@/components/book/types";
import type { SoundName } from "./audio";
import { applyCurl, castLanding, castUnder, collectBend, createFill, type RigJob } from "./curl";

/**
 * One timeline per book. Every book lives on the shelf; its timeline plays
 *
 *   pull from slot → open → turn … turn → close → return to slot (→ outro, last book)
 *
 * and ends in the exact visual state it began in, so the director can reset it
 * invisibly and replay it from any entry point (see lib/director.ts).
 * Durations are real seconds.
 */
export const D = { pull: 0.95, open: 1.25, flip: 1.05, close: 0.9, ret: 1, outro: 0.9 };
/** The open book is shown at exactly its laid-out size: growing it would mean redrawing every surface on the way. */
export const CAMERA_ZOOM = 1;
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
  /** Re-copy any page next to this spread whose content can change (forms). */
  refresh: (spread: number) => void;
};

export type BookEls = ReturnType<typeof bookEls>;

export function bookEls(anchor: HTMLElement) {
  const q = (s: string) => anchor.querySelector<HTMLElement>(s);
  const pageLeaves = Array.from(anchor.querySelectorAll<HTMLElement>(".leaf--page"));
  const rigs = Array.from(anchor.querySelectorAll<HTMLElement>(".rig"));
  return {
    anchor,
    mode: (anchor.dataset.mode ?? "spread") as Mode,
    shadow: q(".book-shadow")!,
    body: q(".book-body")!,
    book: q(".book")!,
    leaves: q(".leaves")!,
    cover: q(".leaf.cover")!,
    sheen: q(".cover-sheen")!,
    coverBack: q(".cover-back"),
    base: q(".leaf--base .face")!,
    stackR: q(".stack--r"),
    stackL: q(".stack--l"),
    hinge: q(".hinge"),
    spine: q(".edge-spine"),
    pageLeaves,
    fronts: pageLeaves.map((l) => l.querySelector<HTMLElement>(".face--front")!),
    backs: pageLeaves.map((l) => l.querySelector<HTMLElement>(".face--back")),
    rigs,
    bends: rigs.map(collectBend),
    /** Pending / finished copy jobs, one per leaf. */
    fills: rigs.map(() => null as RigJob | null),
  };
}

const part = (face: Element | null | undefined, cls: string) => face?.querySelector<HTMLElement>(cls) ?? null;

export function slotPose(a: HTMLElement, slot: HTMLElement) {
  const r = slot.getBoundingClientRect();
  // measured inside the scene, so a camera that is panned or pulled back does not skew the pose
  const scene = (a.offsetParent as HTMLElement | null) ?? document.body;
  const o = scene.getBoundingClientRect();
  const k = o.width / (scene.offsetWidth || o.width);
  return {
    x: (r.left - o.left + r.width / 2) / k - a.offsetLeft,
    y: (r.top - o.top + r.height / 2) / k - a.offsetTop,
    // fit inside the slot whatever this book's own proportions are
    s: Math.min(r.height / k / a.offsetHeight, r.width / k / a.offsetWidth),
  };
}

/** Start copying a leaf's pages into its bending sheet (idempotent). */
export function fillJob(e: BookEls, i: number, force = false): RigJob {
  if (!e.fills[i] || force) {
    if (e.fills[i]) e.fills[i]!.cancelled = true;
    e.fills[i] = createFill(e.rigs[i], e.fronts[i], e.backs[i] ?? null);
    e.bends[i].last = -1;
  }
  return e.fills[i]!;
}

/** How far the rest of the page block shows beyond the top sheet, in px (most of the board overhang). */
const peekOf = (e: BookEls) => e.anchor.offsetHeight * 0.013 * 0.82;

/** Everything a book looks like before its timeline has touched it. */
export function resetBook(e: BookEls) {
  gsap.set(e.anchor, { xPercent: -50, yPercent: -50, zIndex: 1, rotation: 0, visibility: "visible" });
  gsap.set(e.body, { rotationX: 0, rotationY: SHELF_TILT, rotation: 0, scale: 1, y: 0 });
  gsap.set(e.book, { xPercent: 0 });
  gsap.set([e.cover, ...e.pageLeaves], { rotationY: 0, opacity: 1 });
  e.pageLeaves.forEach((l) => (l.style.visibility = ""));
  showLeaves(e, false);
  gsap.set(e.anchor.querySelectorAll(".shade, .cast"), { opacity: 0 });
  gsap.set(e.shadow, { opacity: 0, scaleX: 1 });
  gsap.set(e.sheen, { xPercent: -18 });
  if (e.stackR) gsap.set(e.stackR, { x: peekOf(e) });
  if (e.stackL) gsap.set(e.stackL, { x: -0.12 * peekOf(e) });
  if (e.hinge) gsap.set(e.hinge, { autoAlpha: 0 });
  if (e.spine) gsap.set(e.spine, { autoAlpha: 1 });
  e.rigs.forEach((r) => r.classList.remove("on", "armed"));
}

export function applyShelfPose(e: BookEls, slot: HTMLElement) {
  const P = slotPose(e.anchor, slot);
  gsap.set(e.anchor, { x: P.x, y: P.y, scale: P.s });
}

function ft(tl: gsap.core.Timeline, target: gsap.TweenTarget | null, from: gsap.TweenVars, to: gsap.TweenVars, at: number) {
  if (!target || (Array.isArray(target) && target.length === 0)) return;
  tl.fromTo(target, from, { ...to, immediateRender: false }, at);
}

/**
 * The inside of a closed book is switched off. Visibility hides the pages themselves; opacity
 * also takes any armed sheets with them (those keep their own visibility — see .rig.armed).
 */
const SHOWN = { visibility: "inherit", opacity: 1 };
const HIDDEN = { visibility: "hidden", opacity: 0 };
export function showLeaves(e: BookEls, on: boolean) {
  gsap.set(e.leaves, on ? SHOWN : HIDDEN);
}
/** The same switch on the timeline: deterministic and reversible. */
function flipLeaves(tl: gsap.core.Timeline, e: BookEls, on: boolean, at: number) {
  ft(tl, e.leaves, on ? HIDDEN : SHOWN, { ...(on ? SHOWN : HIDDEN), duration: 0.001 }, at);
}

/** Overlay that darkens then clears — a cast shadow sweeping over a page. */
function pulse(tl: gsap.core.Timeline, el: HTMLElement | null, peak: number, at: number, up: number, hold: number, down: number) {
  if (!el) return;
  ft(tl, el, { opacity: 0 }, { opacity: peak, duration: up, ease: "power1.out" }, at);
  ft(tl, el, { opacity: peak }, { opacity: 0, duration: down, ease: "power1.in" }, at + up + hold);
}

/** A book on the shelf rocks a little when its neighbour leaves or lands. */
function nudge(tl: gsap.core.Timeline, el: HTMLElement | undefined, deg: number, at: number) {
  if (!el) return;
  ft(tl, el, { rotation: 0 }, { rotation: deg, duration: 0.14, ease: "power2.out" }, at);
  ft(tl, el, { rotation: deg }, { rotation: 0, duration: 0.5, ease: "elastic.out(1.1, 0.42)" }, at + 0.14);
}

export function buildBook(
  e: BookEls,
  slot: HTMLElement,
  opts: { last: boolean; outro: HTMLElement | null; left?: HTMLElement; right?: HTMLElement },
): BookTL {
  const tl = gsap.timeline({ paused: true, defaults: { ease: "none" } });
  const single = e.mode === "single";
  const P = slotPose(e.anchor, slot);
  const markers: Marker[] = [];
  const labels: Record<string, number> = {};
  const glow = { v: 0 };
  const n = e.pageLeaves.length;
  const spreads = n + 1;
  const END = single ? -150 : -180;
  const lift = P.s * 1.28;

  let t = 0;

  // ───────── pull from the shelf ─────────
  const pull = D.pull;
  ft(tl, e.anchor, { zIndex: 1 }, { zIndex: 6, duration: 0.001 }, 0);
  // in flight the book changes size every frame; this tells the browser to keep the surfaces it has
  // (drawn once, at full size) instead of redrawing them all at each new size
  const flying = (on: boolean, at: number) =>
    ft(tl, e.anchor, { willChange: on ? "auto" : "transform" }, { willChange: on ? "transform" : "auto", duration: 0.001 }, at);
  flying(true, 0);
  ft(tl, slot, { "--filled": 1 }, { "--filled": 0, duration: 0.3 }, 0);
  ft(tl, glow, { v: 0 }, { v: 1, duration: pull, ease: "sine.inOut" }, 0);
  nudge(tl, opts.left, 2.2, 0.06);
  nudge(tl, opts.right, -2.2, 0.06);
  // it lifts off the shelf, then travels: x and y ease differently so the path arcs
  ft(tl, e.anchor, { x: P.x }, { x: 0, duration: pull * 0.86, ease: "power2.inOut" }, pull * 0.14);
  ft(tl, e.anchor, { y: P.y }, { y: 0, duration: pull * 0.86, ease: "power3.inOut" }, pull * 0.14);
  ft(tl, e.anchor, { scale: P.s }, { scale: lift, duration: pull * 0.3, ease: "power2.out" }, 0);
  ft(tl, e.anchor, { scale: lift }, { scale: 1, duration: pull * 0.7, ease: "power3.inOut" }, pull * 0.3);
  ft(tl, e.body, { rotationY: SHELF_TILT }, { rotationY: 0, duration: pull, ease: "power2.inOut" }, 0);
  ft(tl, e.body, { rotationX: 0 }, { rotationX: 16, duration: pull * 0.45, ease: "power2.out" }, 0);
  ft(tl, e.body, { rotationX: 16 }, { rotationX: 0, duration: pull * 0.55, ease: "power2.inOut" }, pull * 0.45);
  ft(tl, e.body, { rotation: 0 }, { rotation: -5, duration: pull * 0.5, ease: "sine.inOut" }, 0);
  ft(tl, e.body, { rotation: -5 }, { rotation: 0, duration: pull * 0.5, ease: "sine.inOut" }, pull * 0.5);
  ft(tl, e.shadow, { opacity: 0 }, { opacity: 1, duration: pull * 0.7, ease: "power1.inOut" }, pull * 0.3);
  markers.push({ time: pull * 0.05, fwd: "shelf", back: "shelf" });
  t = pull;
  labels.open = t;

  // ───────── open: the board has weight — it swings over, lands, and settles ─────────
  const first = e.fronts[0] ?? e.base;
  flipLeaves(tl, e, true, t);
  const O = D.open;
  if (!single) {
    const swing = O * 0.8;
    ft(tl, e.cover, { rotationY: 0 }, { rotationY: -180, duration: swing, ease: "power2.inOut" }, t);
    ft(tl, e.cover, { rotationY: -180 }, { rotationY: -173.5, duration: O * 0.08, ease: "power2.out" }, t + swing);
    ft(tl, e.cover, { rotationY: -173.5 }, { rotationY: -180, duration: O * 0.12, ease: "power2.in" }, t + swing + O * 0.08);
    ft(tl, e.book, { xPercent: 0 }, { xPercent: 50, duration: O * 0.9, ease: "power3.inOut" }, t);
    ft(tl, e.anchor, { scale: 1 }, { scale: CAMERA_ZOOM, duration: O, ease: "power2.inOut" }, t);
    ft(tl, e.shadow, { scaleX: 1 }, { scaleX: 2, duration: O * 0.9, ease: "power3.inOut" }, t);
    ft(tl, part(e.coverBack, ".shade"), { opacity: 0.6 }, { opacity: 0, duration: swing * 0.5, ease: "power1.out" }, t + swing * 0.5);
    // lying open, the spine is flat under the pages: its upright face goes, the strip that joins the boards comes
    ft(tl, e.hinge, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.12 }, t + swing * 0.92);
    ft(tl, e.spine, { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.12 }, t + swing * 0.92);
  } else {
    ft(tl, e.cover, { rotationY: 0 }, { rotationY: -105, duration: O * 0.9, ease: "power2.in" }, t);
    ft(tl, e.cover, { opacity: 1 }, { opacity: 0, duration: O * 0.3, ease: "power1.in" }, t + O * 0.6);
  }
  ft(tl, e.sheen, { xPercent: -18 }, { xPercent: 26, duration: O * 0.7, ease: "power1.inOut" }, t);
  pulse(tl, part(first, ".cast"), 0.85, t, O * 0.3, O * 0.1, O * 0.4);
  markers.push({ time: t + 0.1, fwd: "open", back: "close" });
  t += O;
  labels.s0 = t;
  flying(false, t - 0.002); // just before the book comes to rest, so it is over by the time it lies open

  // ───────── page turns ─────────
  const peek = peekOf(e);
  const stackR = (j: number) => 1 - (0.88 * j) / Math.max(n, 1);
  const stackL = (j: number) => 0.12 + (0.88 * j) / Math.max(n, 1);
  e.pageLeaves.forEach((leaf, i) => {
    const under = e.fronts[i + 1] ?? e.base;
    const prevLeft = i === 0 ? e.coverBack : e.backs[i - 1];
    const castUnderEl = part(under, ".cast");
    const castLandEl = part(prevLeft, ".cast");
    const rig = e.rigs[i];
    const bend = e.bends[i];
    const prox = { p: 0 };
    let state = 0 as 0 | 1 | 2;

    const rest = (turned: boolean) => {
      rig.classList.remove("on");
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
        fillJob(e, i).flush(); // normally finished long ago, in idle time
        rig.classList.add("on");
        leaf.style.visibility = "hidden";
      }
      applyCurl(bend, p, END, single);
      if (castUnderEl) castUnderEl.style.opacity = castUnder(p).toFixed(3);
      if (castLandEl && !single) castLandEl.style.opacity = castLanding(p).toFixed(3);
    };

    tl.fromTo(prox, { p: 0 }, { p: 1, duration: D.flip, ease: "power2.inOut", immediateRender: false, onUpdate: update }, t);
    // the two halves of the page block trade thickness as you read
    ft(tl, e.stackR, { x: peek * stackR(i) }, { x: peek * stackR(i + 1), duration: D.flip * 0.5, ease: "power1.inOut" }, t + D.flip * 0.1);
    ft(tl, e.stackL, { x: -peek * stackL(i) }, { x: -peek * stackL(i + 1), duration: D.flip * 0.4, ease: "power1.inOut" }, t + D.flip * 0.6);
    markers.push({ time: t + D.flip * 0.1, fwd: "flip", back: "flip" });
    t += D.flip;
    labels[`s${i + 1}`] = t;
  });

  // ───────── close ─────────
  labels.close = t;
  flying(true, t);
  const C = D.close;
  if (!single) {
    // the top of the left-hand stack lands first, the cover follows — no planes cross
    const stack = [...e.pageLeaves].reverse().concat(e.cover);
    stack.forEach((el, j) => {
      const d = Math.min(j * 0.025, 0.2);
      ft(tl, el, { rotationY: -180 }, { rotationY: 0, duration: C - d, ease: "power2.inOut" }, t + d);
    });
    ft(tl, e.hinge, { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.1 }, t + 0.04);
    ft(tl, e.spine, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.1 }, t + 0.04);
    ft(tl, e.book, { xPercent: 50 }, { xPercent: 0, duration: C, ease: "power2.inOut" }, t);
    ft(tl, e.anchor, { scale: CAMERA_ZOOM }, { scale: 1, duration: C, ease: "power2.inOut" }, t);
    ft(tl, e.shadow, { scaleX: 2 }, { scaleX: 1, duration: C, ease: "power2.inOut" }, t);
  } else {
    ft(tl, e.cover, { rotationY: -105 }, { rotationY: 0, duration: C, ease: "power2.out" }, t);
    ft(tl, e.cover, { opacity: 0 }, { opacity: 1, duration: C * 0.3, ease: "power1.out" }, t);
  }
  ft(tl, e.sheen, { xPercent: 26 }, { xPercent: -18, duration: C, ease: "power1.inOut" }, t);
  flipLeaves(tl, e, false, t + C);
  markers.push({ time: t + C * 0.92, fwd: "close", back: "open" });
  t += C;

  // ───────── back onto the shelf ─────────
  labels.ret = t;
  const R = D.ret;
  ft(tl, e.anchor, { x: 0 }, { x: P.x, duration: R * 0.86, ease: "power2.inOut" }, t);
  ft(tl, e.anchor, { y: 0 }, { y: P.y, duration: R * 0.86, ease: "power3.inOut" }, t);
  ft(tl, e.anchor, { scale: 1 }, { scale: lift, duration: R * 0.7, ease: "power3.inOut" }, t);
  ft(tl, e.anchor, { scale: lift }, { scale: P.s, duration: R * 0.3, ease: "power2.in" }, t + R * 0.7);
  ft(tl, e.body, { rotationY: 0 }, { rotationY: SHELF_TILT, duration: R, ease: "power2.inOut" }, t);
  ft(tl, e.body, { rotationX: 0 }, { rotationX: 14, duration: R * 0.5, ease: "power2.out" }, t);
  ft(tl, e.body, { rotationX: 14 }, { rotationX: 0, duration: R * 0.5, ease: "power2.inOut" }, t + R * 0.5);
  ft(tl, e.body, { rotation: 0 }, { rotation: 4, duration: R * 0.5, ease: "sine.inOut" }, t);
  ft(tl, e.body, { rotation: 4 }, { rotation: 0, duration: R * 0.5, ease: "sine.inOut" }, t + R * 0.5);
  ft(tl, e.shadow, { opacity: 1 }, { opacity: 0, duration: R * 0.6, ease: "power1.in" }, t + R * 0.4);
  ft(tl, glow, { v: 1 }, { v: 0, duration: R, ease: "sine.inOut" }, t);
  ft(tl, slot, { "--filled": 0 }, { "--filled": 1, duration: 0.25 }, t + R * 0.78);
  ft(tl, e.anchor, { zIndex: 6 }, { zIndex: 1, duration: 0.001 }, t + R);
  // it lands with a little weight and settles
  nudge(tl, e.anchor, -1.5, t + R - 0.02);
  flying(false, t + R + 0.3);
  markers.push({ time: t + R * 0.93, fwd: "shelf", back: "shelf" });
  t += R;
  // the landing rocks its neighbours (the next book has already left by now — see HANDOFF)
  nudge(tl, opts.left, -1.8, t - 0.06);
  nudge(tl, opts.right, 1.8, t - 0.06);
  t += 0.6;
  labels.shelved = t;

  // ───────── epilogue (last book only) ─────────
  if (opts.last && opts.outro) {
    ft(tl, opts.outro, { autoAlpha: 0, y: 28 }, { autoAlpha: 1, y: 0, duration: D.outro, ease: "power2.out" }, t);
    t += D.outro;
  }
  labels.end = t;

  tl.add(() => {}, t); // pin the duration

  const dynamic = (i: number) => !!(e.fronts[i]?.querySelector("[data-dynamic]") || e.backs[i]?.querySelector("[data-dynamic]"));
  const refresh = (spread: number) => {
    for (const i of [spread, spread - 1]) {
      if (i >= 0 && i < n && dynamic(i) && !e.rigs[i].classList.contains("on")) fillJob(e, i, true).flush();
    }
  };

  return { tl, labels, spreads, markers: markers.sort((a, b) => a.time - b.time), glow, end: t, refresh };
}
