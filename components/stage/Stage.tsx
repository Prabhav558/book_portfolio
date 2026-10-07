"use client";

import { useEffect, useMemo, useRef, type CSSProperties } from "react";
import { gsap } from "@/lib/gsap";
import { sound } from "@/lib/audio";
import { installTextures } from "@/lib/textures";
import { applyShelfPose, bookEls, buildBook, fillJob, resetBook, showLeaves, CAMERA_ZOOM, type BookTL } from "@/lib/timeline";
import type { RigJob } from "@/lib/curl";
import type { Layout } from "@/lib/layout";
import { createDirector, type Director } from "@/lib/director";
import { bindInput } from "@/lib/input";
import { createPeel, createPeek, type Peek } from "@/lib/fold";
import { cursorProbe } from "@/lib/cursor";
import { Cursor } from "@/components/ui/Cursor";
import { buildSketch, inkShelfBook } from "@/lib/sketch";
import { overlay } from "@/lib/overlay";
import type { Where } from "@/components/ui/IndexCard";
import type { Ambient } from "@/components/three/ambient";
import { Book } from "@/components/book/Book";
import type { Paged } from "@/components/book/Paginator";
import { Clasp } from "@/components/intro/Clasp";
import { Shelf } from "@/components/shelf/Shelf";
import { WorldCanvas } from "@/components/world/WorldCanvas";
import type { WorldEngine } from "@/lib/world/engine";
import type { Rect } from "@/lib/world/types";
import { IntroControls, Pager, ScrollHint, TopBar } from "@/components/ui/Chrome";
import { NavContext, TextLink } from "@/components/pages/primitives";
import { BOOKS } from "@/components/pages";
import { profile } from "@/content/portfolio";

const ROMAN = ["I", "II", "III", "IV"];
/** Volumes that have been taken down at least once. The rest are still drawings on the shelf.
 *  (Outside the component, so it survives the scene being rebuilt for a new screen size.) */
const seen = new Set<number>([0]);
const BASE_TINT: [number, number, number] = [1, 1, 1];
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

const idleCb = (fn: () => void) =>
  typeof window.requestIdleCallback === "function" ? window.requestIdleCallback(fn, { timeout: 400 }) : window.setTimeout(fn, 30);

export type Position = { book: number; block: string | null };

export function Stage({
  layout,
  paged,
  skipIntro,
  start,
  onIntroDone,
  onPosition,
}: {
  layout: Layout;
  paged: Paged[];
  skipIntro: boolean;
  /** Resting state to restore (book + spread/page step) after a re-layout. */
  start: { book: number; step: number } | null;
  onIntroDone: () => void;
  onPosition: (p: Position) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const sketchRef = useRef<SVGSVGElement>(null);
  const shelfRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<HTMLDivElement>(null);
  const outroRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const nowRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
  const claspRef = useRef<HTMLButtonElement>(null);
  const worldRef = useRef<WorldEngine | null>(null);

  const cfg = useRef({ skipIntro, onIntroDone, onPosition, layout, paged, start });
  cfg.current = { skipIntro, onIntroDone, onPosition, layout, paged, start };
  const relayout = useRef<() => void>(() => {});

  // stable handles the page content can call before/after the director exists
  const api = useRef<{
    goToBook: (i: number) => void;
    goToStart: () => void;
    goTo: (book: number, id: string | null) => void;
    open: () => void;
    skip: () => void;
    step: (d: 1 | -1) => void;
  }>({
    goToBook: () => {},
    goToStart: () => {},
    goTo: () => {},
    open: () => {},
    skip: () => {},
    step: () => {},
  });
  const nav = useMemo(
    () => ({
      goToBook: (i: number) => api.current.goToBook(i),
      goToStart: () => api.current.goToStart(),
      goTo: (book: number, id: string | null) => api.current.goTo(book, id),
    }),
    [],
  );
  // the index card: every volume, and the named pages in it with the numbers they have on this screen
  const volumes = useMemo(
    () =>
      BOOKS.map((b, k) => ({
        book: k,
        roman: ROMAN[k],
        label: b.label,
        blurb: b.blurb,
        accent: b.palette.accent,
        pages: paged[k].pages.length,
        entries: paged[k].pages.flatMap((pg, i) => pg.blocks.filter((bl) => bl.name).map((bl) => ({ id: bl.id, name: bl.name!, page: i + 1 }))),
      })),
    [paged],
  );
  const here = useRef<Where>(null);
  const shelfInkRef = useRef<SVGSVGElement>(null);
  const sayRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const rootEl = root.current!;
    const skipIntro = cfg.current.skipIntro;
    let disposed = false;
    const ctx = gsap.context(() => {}, rootEl);
    const undo: (() => void)[] = [];
    const html = document.documentElement;
    html.classList.add("stage-lock");
    undo.push(() => html.classList.remove("stage-lock"));
    history.scrollRestoration = "manual";
    window.scrollTo(0, 0);

    const anchors = gsap.utils.toArray<HTMLElement>(".book-anchor", rootEl);
    const els = anchors.map(bookEls);
    const e0 = els[0];
    const N = els.length;
    const slots = gsap.utils.toArray<HTMLElement>("[data-slot]", rootEl);
    const shelfLabels = gsap.utils.toArray<HTMLElement>("[data-shelf-label]", rootEl);
    const prevBtn = rootEl.querySelector<HTMLButtonElement>("[data-prev]")!;
    const nextBtn = rootEl.querySelector<HTMLButtonElement>("[data-next]")!;
    const nowVol = nowRef.current!.querySelector<HTMLElement>("[data-now-vol]")!;
    const nowTitle = nowRef.current!.querySelector<HTMLElement>("[data-now-title]")!;
    const nowText = nowRef.current!.querySelector<HTMLElement>(".now-text")!;
    const nowPage = nowRef.current!.querySelector<HTMLElement>("[data-now-page]")!;
    const hintEl = rootEl.querySelector<HTMLElement>("[data-intro-hint]")!;
    const clasp = claspRef.current!;
    const paper = paperRef.current!;
    const sketchSvg = sketchRef.current!;
    const ink = sketchSvg.parentElement!;
    const camera = cameraRef.current!;
    const shelfInk = shelfInkRef.current!;
    const stageEl = rootEl.querySelector<HTMLElement>(".stage")!;
    /** An element's box inside the scene (whatever the camera is doing). */
    const sceneRect = (el: Element) => {
      const r = el.getBoundingClientRect();
      const o = stageEl.getBoundingClientRect();
      const k = o.width / (stageEl.offsetWidth || o.width);
      return { x: (r.left - o.left) / k, y: (r.top - o.top) / k, w: r.width / k, h: r.height / k };
    };
    // how far the shot drops toward the shelf when no book is on the table (none where the shelf stands at the side)
    const camDrop = cfg.current.layout.kind === "phone-land" ? 0 : clamp(cfg.current.layout.h * 0.15, 56, 150);
    let camY = 0;
    const ui = rootEl.querySelector<HTMLElement>(".ui-layer")!;

    // ───────── first look: everything at rest, hidden behind the white page ─────────
    els.forEach(resetBook);
    slots.forEach((s, k) => gsap.set(s, { "--filled": k === 0 ? 0 : 1 }));
    gsap.set([topRef.current, nowRef.current, hintRef.current, introRef.current], { autoAlpha: 0 });
    gsap.set(hintEl, { opacity: 0 });

    // ───────── state ─────────
    let tls: BookTL[] = [];
    let director: Director | null = null;
    let ambient: Ambient | null = null;
    const amb = { intensity: skipIntro ? 1 : 0, scroll: 0 };
    let ready = false;
    let opened = false;

    // ───────── the room behind the book (lib/world) ─────────
    // The book is an obstacle in it; the world is told where the book is and what it is doing, and nothing else.
    const world = worldRef.current;
    let noted = -1;
    const rectOf = (book: number, open: boolean): Rect => {
      const L = cfg.current.layout;
      const b = L.books[book];
      if (!open) return { x: L.cx - b.bw / 2, y: L.cy - b.bh / 2, w: b.bw, h: b.bh };
      const spread = b.mode === "spread";
      const halfW = spread ? b.bw * CAMERA_ZOOM : b.bw / 2;
      const halfH = (b.bh * (spread ? CAMERA_ZOOM : 1)) / 2;
      return { x: L.cx - halfW, y: L.cy - halfH, w: halfW * 2, h: halfH * 2 };
    };
    const shelfRect = (): Rect => {
      const L = cfg.current.layout;
      const s = L.shelf;
      const n = L.books.length;
      if (s.dir === "col") {
        const total = n * s.slotH + (n - 1) * s.gap;
        return { x: 0, y: s.top - total / 2 - 8, w: s.left + s.slotW / 2 + 12, h: total + 16 };
      }
      const width = n * s.slotW + (n - 1) * s.gap + 2 * s.gap * 0.9;
      return { x: s.left - width / 2 - 10, y: 0, w: width + 20, h: s.top + s.slotH + 7 + (s.labels ? 34 : 12) + 8 };
    };
    const syncWorld = (instant = false) => {
      if (!world) return;
      world.setKeepOut("shelf", shelfRect());
      const k = director ? director.states[director.cur].book : 0;
      world.setBookBounds(rectOf(k, opened), instant);
    };
    let move = { from: 0, to: 0 };
    let hintHidden = false;
    // "quiet" = the intro or the first hint still owns the bottom row (see the phone rules in globals.css)
    rootEl.dataset.quiet = "";
    undo.push(() => delete rootEl.dataset.quiet);
    let intro: gsap.core.Timeline | null = null;
    let idle: gsap.core.Animation | null = null;
    const lastT: number[] = [];
    const lastFill: number[] = [];
    const shelved: boolean[] = [];
    const focus = () => {
      const L = cfg.current.layout;
      return [L.cx / L.w, 1 - L.cy / L.h] as const;
    };

    // ───────── volumes that have not been opened yet are still drawings on the shelf ─────────
    const inkOf = new Map<number, SVGGElement>();
    let shelfPaths: SVGPathElement[][] = [];
    // the drawings stay out of sight while the scene boots; the intro (or skipping it) shows them
    let shelfInkOn = skipIntro;
    const drawShelfInk = () => {
      shelfInk.style.visibility = shelfInkOn ? "" : "hidden";
      shelfInk.setAttribute("viewBox", `0 0 ${stageEl.offsetWidth} ${stageEl.offsetHeight}`);
      shelfInk.replaceChildren();
      inkOf.clear();
      shelfPaths = [];
      els.forEach((e, k) => {
        e.anchor.style.opacity = seen.has(k) ? "" : "0";
        const cover = e.anchor.querySelector(".cover-front");
        if (seen.has(k) || !cover) return;
        const { g, paths } = inkShelfBook(shelfInk, sceneRect(cover));
        inkOf.set(k, g);
        shelfPaths.push(paths);
      });
    };
    /** The first time a volume is taken down, its drawing turns into the book. */
    const develop = (k: number) => {
      seen.add(k);
      const g = inkOf.get(k);
      inkOf.delete(k);
      gsap.to(els[k].anchor, { opacity: 1, duration: 0.5, ease: "power1.out", clearProps: "opacity" });
      if (g) gsap.to(g, { opacity: 0, duration: 0.5, ease: "power1.in", onComplete: () => g.remove() });
    };

    // ───────── shelf hover: the book comes forward a little ─────────
    function lift(k: number, up: boolean) {
      if (up && (!shelved[k] || director?.busy)) return;
      const h = els[k].anchor.offsetHeight;
      const { body, shadow } = els[k];
      if (!up && !shelved[k]) {
        // the book is leaving the shelf: the timeline owns its pose from here. (This can arrive late, once the
        // book is open, so it only puts back what the timeline never touches.)
        gsap.set(body, { y: 0, scale: 1, rotation: 0 });
        gsap.set(shadow, { y: 0 });
      } else {
        // it comes forward, leans a little and throws a shadow on the wall behind
        gsap.to(body, {
          y: up ? -h * 0.085 : 0,
          scale: up ? 1.07 : 1,
          rotation: up ? -2.2 : 0,
          duration: 0.5,
          ease: "power3.out",
          overwrite: "auto",
        });
        if (up || shelved[k]) gsap.to(shadow, { opacity: up ? 0.6 : 0, y: up ? h * 0.03 : 0, duration: 0.5, ease: "power3.out", overwrite: "auto" });
      }
      const g = inkOf.get(k);
      if (g) gsap.to(g, { y: up ? -slots[k].offsetHeight * 0.085 : 0, duration: 0.45, ease: "power3.out", overwrite: "auto" });
      shelfLabels[k]?.toggleAttribute("data-hover", up);
      slots[k]?.toggleAttribute("data-hover", up);
    }
    const hoverOff: (() => void)[] = [];
    [...slots, ...shelfLabels].forEach((el) => {
      const k = Number(el.dataset.slot ?? el.dataset.shelfLabel);
      const on = () => lift(k, true);
      const off = () => lift(k, false);
      el.addEventListener("pointerenter", on);
      el.addEventListener("pointerleave", off);
      hoverOff.push(() => {
        el.removeEventListener("pointerenter", on);
        el.removeEventListener("pointerleave", off);
      });
    });

    // ───────── per-frame UI + sound ─────────
    const syncUI = () => {
      if (!tls.length || !director) return;
      const curBook = director.states[director.cur].book;
      let tr = 0;
      let tg = 0;
      let tb = 0;
      let sw = 0;
      tls.forEach((b, k) => {
        const involved = k === move.from || k === move.to || k === curBook;
        const t = b.tl.time();
        const fill = involved ? clamp(t / b.end, 0, 1) : k < curBook ? 1 : 0;
        if (Math.abs(fill - (lastFill[k] ?? -1)) > 0.002) {
          lastFill[k] = fill;
          shelfLabels[k]?.style.setProperty("--p", fill.toFixed(3));
        }
        const on = t <= 0.0001 || t >= b.labels.shelved - 0.0001;
        if (on !== shelved[k]) {
          shelved[k] = on;
          slots[k]?.toggleAttribute("data-filled", on);
          shelfLabels[k]?.toggleAttribute("data-filled", on);
          if (!on) lift(k, false);
        }
        const g = BOOKS[k].palette.glow;
        const w = b.glow.v;
        tr += (g[0] - BASE_TINT[0]) * w;
        tg += (g[1] - BASE_TINT[1]) * w;
        tb += (g[2] - BASE_TINT[2]) * w;
        sw += w;
      });
      const mix = 0.55 / Math.max(1, sw);
      ambient?.setTint(BASE_TINT[0] + tr * mix, BASE_TINT[1] + tg * mix, BASE_TINT[2] + tb * mix);

      // the camera: with a book on the table it looks at the book; as that book goes back the shot
      // drifts up to the shelf, and it comes down again with the next one. (A pan only — moving a
      // layer costs nothing, whereas zooming would redraw every surface in the scene.)
      let present = 0;
      tls.forEach((b) => (present = Math.max(present, b.glow.v)));
      const away = 1 - Math.min(1, present);
      const y = Math.round(camDrop * away * away * (3 - 2 * away));
      if (y !== camY) {
        camY = y;
        camera.style.transform = y ? `translate3d(0,${y}px,0)` : "";
      }
    };

    const onTick = (k: number) => {
      const b = tls[k];
      const t = b.tl.time();
      const last = lastT[k] ?? t;
      lastT[k] = t;
      if (t > 0.01 && !seen.has(k)) develop(k);
      // teleports (silent resets) never make noise
      if (Math.abs(t - last) < 0.5) {
        for (const m of b.markers) {
          if (m.fwd && last < m.time && t >= m.time) sound.play(m.fwd);
          else if (m.back && last > m.time && t <= m.time) sound.play(m.back);
        }
      }
      syncUI();
    };

    const build = () => {
      tls = els.map((e, k) =>
        buildBook(e, slots[k], { last: k === N - 1, outro: outroRef.current, left: anchors[k - 1], right: anchors[k + 1] }),
      );
      tls.forEach((b, k) => {
        lastT[k] = 0;
        b.tl.eventCallback("onUpdate", () => onTick(k));
        applyShelfPose(els[k], slots[k]);
      });
      drawShelfInk();
    };

    // ───────── what the UI says ─────────
    const setNow = (book: number, instant = false) => {
      const apply = () => {
        nowVol.textContent = `Vol. ${ROMAN[book]}`;
        nowTitle.textContent = BOOKS[book].label;
        // the open volume lends its colour to everything around the book: the dot, focus rings, the selection
        const p = BOOKS[book].palette;
        // (set on the controls only: a custom property on the root would restyle every page of every book)
        ui.style.setProperty("--vol-accent", p.accent);
        ui.style.setProperty("--vol-cloth", p.cloth);
        ui.style.setProperty("--vol-ribbon", p.ribbon);
        shelfLabels.forEach((l, k) => l.toggleAttribute("data-now", k === book));
        slots.forEach((sl, k) => (k === book ? sl.setAttribute("aria-current", "true") : sl.removeAttribute("aria-current")));
      };
      if (instant) return apply();
      gsap.to(nowText, {
        opacity: 0,
        y: -5,
        duration: 0.25,
        ease: "power1.in",
        overwrite: true,
        onComplete: () => {
          apply();
          gsap.fromTo(nowText, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.45, ease: "power2.out" });
        },
      });
    };

    /** "3-4 / 10" for a spread, "3 / 12" for single pages. */
    const setPage = (idx: number) => {
      const s = director!.states[idx];
      const total = cfg.current.paged[s.book].pages.length;
      prevBtn.disabled = idx <= 0;
      nextBtn.disabled = idx >= director!.states.length - 1;
      if (s.label === "end") {
        nowPage.textContent = "";
        nowRef.current!.style.setProperty("--prog", "1");
        return;
      }
      const step = Number(s.label.slice(1));
      const two = (n: number) => String(n).padStart(2, "0");
      const read = els[s.book].mode === "spread" ? 2 * step + 2 : step + 1;
      nowRef.current!.style.setProperty("--prog", Math.min(1, read / total).toFixed(3));
      nowPage.textContent =
        els[s.book].mode === "spread" ? `${two(2 * step + 1)}–${two(2 * step + 2)} / ${two(total)}` : `${two(step + 1)} / ${two(total)}`;
    };
    const report = (idx: number) => {
      const s = director!.states[idx];
      if (s.label === "end") return cfg.current.onPosition({ book: s.book, block: null });
      const step = Number(s.label.slice(1));
      const page = cfg.current.paged[s.book].pages[els[s.book].mode === "spread" ? 2 * step : step];
      cfg.current.onPosition({ book: s.book, block: page?.blocks[0]?.id ?? null });
    };
    /** Where the reader is, for the index card: the named page on show (the right-hand one first). */
    const locate = (idx: number) => {
      const s = director!.states[idx];
      if (s.label === "end") return (here.current = null);
      const step = Number(s.label.slice(1));
      const pages = cfg.current.paged[s.book].pages;
      const shown = els[s.book].mode === "spread" ? [pages[2 * step + 1], pages[2 * step]] : [pages[step]];
      const named = shown.flatMap((pg) => pg?.blocks ?? []).find((b) => b.name);
      here.current = { book: s.book, id: named?.id ?? null };
    };

    // Copy every leaf's pages into its bending sheet — but only while the scene is at rest,
    // so the work never competes with an animation. (The first book is done before the intro.)
    const fillQueue: (() => RigJob)[] = [];
    let fillJobNow: RigJob | null = null;
    let pumping = false;
    const pump = () => {
      if (pumping) return;
      pumping = true;
      const run = () => {
        if (disposed || !ready || director?.busy) {
          pumping = false;
          return;
        }
        if (!fillJobNow) {
          const next = fillQueue.shift();
          if (!next) {
            pumping = false;
            return;
          }
          fillJobNow = next();
        }
        if (fillJobNow.step()) {
          fillJobNow = null;
          rearm(); // a sheet that has just been copied can be armed straight away
        }
        idleCb(run);
      };
      idleCb(run);
    };
    /**
     * Keep the open book's bending sheets painted and ready: all of them where that is cheap (so
     * even riffling the book shut is instant), only the two beside the spread on weak devices and
     * on high-density screens, where every sheet costs several times the memory.
     * Arming a sheet means painting eighteen strips, so it is done one sheet per idle slice,
     * the ones beside the open spread first, and never while something is moving.
     */
    let armRun = 0;
    const arm = (book: number, step: number) => {
      const all = cfg.current.layout.strips >= 9 && window.devicePixelRatio <= 1.5;
      const todo: { rig: HTMLElement; on: boolean; far: number }[] = [];
      els.forEach((e, k) =>
        e.rigs.forEach((rig, i) => {
          const on = k === book && (all ? !!e.fills[i] : i === step || i === step - 1);
          if (on !== rig.classList.contains("armed")) todo.push({ rig, on, far: on ? Math.abs(i - step + 0.5) : 99 });
        }),
      );
      todo.sort((a, b) => a.far - b.far);
      const run = ++armRun;
      const next = () => {
        if (disposed || run !== armRun || director?.busy) return;
        const job = todo.shift();
        if (!job) return;
        job.rig.classList.toggle("armed", job.on);
        if (todo.length) idleCb(next);
      };
      next();
    };
    const rearm = () => {
      if (!director || director.busy) return;
      const s = director.states[director.cur];
      if (s.label !== "end") arm(s.book, Number(s.label.slice(1)));
    };

    // Only the pages on show can be reached: every other page is inert — out of the tab order
    // and not read out — so a keyboard or a screen reader meets the book one spread at a time.
    rootEl.querySelectorAll<HTMLElement>(".face[data-step]").forEach((f) => (f.inert = true));
    const clearLive = () =>
      rootEl.querySelectorAll<HTMLElement>(".face.is-live").forEach((f) => {
        f.classList.remove("is-live");
        f.inert = true;
      });
    const setLive = (idx: number) => {
      clearLive();
      const s = director!.states[idx];
      if (s.label === "end") return;
      els[s.book].anchor.querySelectorAll<HTMLElement>(`.face[data-step="${s.label.slice(1)}"]`).forEach((f) => {
        f.classList.add("is-live");
        f.inert = false;
      });
    };
    /** Say where the reader is now, in words (the counter in the corner is only for the eye). */
    const say = (idx: number) => {
      const s = director!.states[idx];
      if (s.label === "end") return (sayRef.current!.textContent = "End of the set. All four volumes are back on the shelf.");
      const step = Number(s.label.slice(1));
      const total = cfg.current.paged[s.book].pages.length;
      const where = els[s.book].mode === "spread" ? `Pages ${2 * step + 1} and ${2 * step + 2}` : `Page ${step + 1}`;
      sayRef.current!.textContent = `Volume ${s.book + 1}, ${BOOKS[s.book].label}. ${where} of ${total}.`;
    };

    const makeDirector = () =>
      createDirector(tls, {
        onMove: (from, to) => {
          const a = director!.states[from].book;
          const b = director!.states[to].book;
          move = { from: a, to: b };
          peekOff(true);
          clearLive();
          if (a !== b) {
            setNow(b);
            world?.setBookBounds(rectOf(b, true));
            world?.notifyBook("shelf");
          }
          setPage(to);
          gsap.to(amb, {
            scroll: to * 0.5,
            duration: 1.8,
            ease: "power2.out",
            overwrite: true,
            onUpdate: () => ambient?.setScroll(amb.scroll),
          });
          if (!hintHidden) {
            hintHidden = true;
            delete rootEl.dataset.quiet;
            gsap.to(hintRef.current, { autoAlpha: 0, duration: 0.6 });
          }
        },
        onSettle: (idx) => {
          move = { from: director!.states[idx].book, to: director!.states[idx].book };
          // the room notices a new volume on the table, and when the set is shut again
          const sb = director!.states[idx];
          if (sb.label === "end") world?.notifyBook("close");
          else if (sb.book !== noted) {
            noted = sb.book;
            world?.setBookBounds(rectOf(sb.book, true));
            world?.notifyBook("open");
          }
          setLive(idx);
          setPage(idx);
          syncUI();
          const s = director!.states[idx];
          if (s.label !== "end") {
            const step = Number(s.label.slice(1));
            idleCb(() => {
              if (disposed || director?.cur !== idx || director.busy) return;
              tls[s.book]?.refresh(step);
              arm(s.book, step);
            });
          }
          pump();
          report(idx);
          locate(idx);
          say(idx);
          if (!ready) finishIntro();
        },
      });

    // ───────── the first book: unlatch, then it opens by itself ─────────
    const fine = window.matchMedia("(pointer: fine)").matches;
    const tiltY = gsap.quickTo(e0.body, "rotationY", { duration: 1, ease: "power3.out" });
    const tiltX = gsap.quickTo(e0.body, "rotationX", { duration: 1, ease: "power3.out" });
    const sheenTo = gsap.quickTo(e0.sheen, "xPercent", { duration: 1.4, ease: "power3.out" });
    const onMove = (ev: PointerEvent) => {
      const nx = ev.clientX / window.innerWidth - 0.5;
      const ny = ev.clientY / window.innerHeight - 0.5;
      tiltY(nx * 8);
      tiltX(-ny * 6);
      sheenTo(-18 + nx * 34);
    };

    let unbind: (() => void) | null = null;
    // where the open book lies on screen, for picking up a page
    const hit = (x: number, y: number) => {
      if (!director) return null;
      const s = director.states[director.cur];
      if (s.label === "end") return null;
      const L = cfg.current.layout;
      const b = L.books[s.book];
      const spread = b.mode === "spread";
      const halfW = spread ? b.bw * CAMERA_ZOOM : b.bw / 2;
      const halfH = (b.bh * (spread ? CAMERA_ZOOM : 1)) / 2;
      if (Math.abs(x - L.cx) > halfW || Math.abs(y - L.cy) > halfH) return null;
      return { side: spread ? (x < L.cx ? ("L" as const) : ("R" as const)) : ("any" as const), pageW: b.bw };
    };

    /**
     * Pick the page up by hand. The sheet that turns is folded where it was taken hold of and
     * follows the pointer; the timeline is only moved once it has come to rest on one side.
     */
    // ───────── a corner that lifts when the pointer comes near it ─────────
    let peek: { leaf: HTMLElement; corner: "top" | "bottom"; h: Peek } | null = null;
    /** Put the lifted corner down (or, `now`, drop it at once and say where it had got to). */
    const peekOff = (now = false) => {
      if (!peek) return null;
      const h = peek.h;
      peek = null;
      if (now) return h.drop();
      h.release();
      return null;
    };
    /** Whether the open book can be turned by hand in this direction right now. */
    const canTurn = (d: 1 | -1) => {
      if (!ready || !director || director.busy || overlay.open) return false;
      const a = director.states[director.cur];
      const b = director.states[director.cur + d];
      return !!b && a.label !== "end" && b.label !== "end" && a.book === b.book;
    };
    const onHover = (ev: PointerEvent) => {
      if (ev.pointerType !== "mouse" || ev.buttons) return;
      if (!canTurn(1)) return void peekOff();
      const st = director!.states[director!.cur];
      const e = els[st.book];
      const i = Number(st.label.slice(1));
      const leaf = e.pageLeaves[i];
      const L = cfg.current.layout;
      const b = L.books[st.book];
      // the two fore-edge corners of the right-hand page
      const right = b.mode === "spread" ? L.cx + b.bw : L.cx + b.bw / 2;
      const near = b.bw * 0.19;
      const corner =
        Math.hypot(ev.clientX - right, ev.clientY - (L.cy - b.bh / 2)) < near
          ? "top"
          : Math.hypot(ev.clientX - right, ev.clientY - (L.cy + b.bh / 2)) < near
            ? "bottom"
            : null;
      if (!leaf || !corner) return void peekOff();
      if (peek?.leaf === leaf && peek.corner === corner) return;
      peekOff();
      peek = { leaf, corner, h: createPeek({ leaf, front: e.fronts[i], back: e.backs[i] ?? null, single: e.mode === "single", corner }) };
    };
    if (fine) {
      window.addEventListener("pointermove", onHover, { passive: true });
      undo.push(() => window.removeEventListener("pointermove", onHover));
    }
    undo.push(() => void peekOff(true));
    // what the cursor says at the edge of a page (no element there to say it)
    cursorProbe.at = (x, y) => {
      const h = hit(x, y);
      if (!h || !director) return null;
      const L = cfg.current.layout;
      const b = L.books[director.states[director.cur].book];
      if (h.side === "any") {
        const fx = (x - (L.cx - b.bw / 2)) / b.bw;
        return fx > 0.8 && canTurn(1) ? "turn" : fx < 0.16 && canTurn(-1) ? "back" : null;
      }
      if (Math.abs(x - L.cx) / b.bw < 0.8) return null;
      return h.side === "R" ? (canTurn(1) ? "turn" : null) : canTurn(-1) ? "back" : null;
    };
    undo.push(() => (cursorProbe.at = null));

    const grab = (dir: 1 | -1, x: number, y: number) => {
      const held = director?.hold(dir);
      if (!held) return null;
      const s = director!.states[director!.cur];
      const e = els[s.book];
      const i = Number(s.label.slice(1)) - (dir > 0 ? 0 : 1);
      const leaf = e.pageLeaves[i];
      // a corner that was already lifted is carried on from where it is
      const lifted = peek?.leaf === leaf ? peekOff(true) : (peekOff(true), null);
      if (!leaf) {
        held.end(false);
        return null;
      }
      // a sheet that is brought back starts turned: lay it on the right, folded all the way over
      const was = { rotationY: gsap.getProperty(leaf, "rotationY") as number, visibility: leaf.style.visibility };
      if (dir < 0) {
        gsap.set(leaf, { rotationY: 0 });
        leaf.style.visibility = "";
      }
      return createPeel({
        leaf,
        front: e.fronts[i],
        back: e.backs[i] ?? null,
        dir,
        single: e.mode === "single",
        x,
        y,
        lifted: lifted ?? undefined,
        onStart: held.begin,
        onDone: (turned) => {
          if (dir < 0 && turned) {
            // it fell back to where it was
            gsap.set(leaf, { rotationY: was.rotationY });
            leaf.style.visibility = was.visibility;
          }
          held.end(dir > 0 ? turned : !turned);
        },
      });
    };

    function finishIntro() {
      ready = true;
      const at = director!.states[director!.cur];
      setNow(at.book, true);
      setPage(director!.cur);
      setLive(director!.cur);
      if (at.label !== "end") arm(at.book, Number(at.label.slice(1)));
      pump();
      gsap.to([topRef.current, nowRef.current, hintRef.current], {
        autoAlpha: 1,
        duration: 0.9,
        ease: "power1.out",
        stagger: 0.08,
      });
      unbind = bindInput({
        step: (d) => void director!.go(d),
        home: () => director!.jump(0),
        end: () => director!.jump(director!.states.length - 1),
        enabled: () => ready && !overlay.open,
        hit,
        grab,
      });
      cfg.current.onIntroDone();
    }

    // ───────── the clasp is a latch: slide the plate to unhook it ─────────
    const plate = clasp.querySelector<HTMLElement>(".clasp-plate");
    const strap = clasp.querySelector<HTMLElement>(".clasp-strap");
    const barrel = clasp.querySelector<HTMLElement>(".clasp-barrel");
    const glow = clasp.querySelector<HTMLElement>(".clasp-glow");
    const travel = () => clasp.offsetWidth * 0.4;
    let pull: { id: number; x0: number; p: number; detent: boolean; moved: boolean } | null = null;
    let swallow = false;
    /** The steel catches the light where the pointer is, so it reads as metal under a lamp. */
    const light = (ev: PointerEvent) => {
      const r = clasp.getBoundingClientRect();
      clasp.style.setProperty("--mx", clamp((ev.clientX - r.left) / r.width, 0, 1).toFixed(3));
      clasp.style.setProperty("--my", clamp((ev.clientY - r.top) / r.height, 0, 1).toFixed(3));
    };
    /** Resistance: the plate follows the finger a little less than the whole way, and the strap stretches. */
    const setPull = (p: number) => {
      gsap.set(plate, { x: -travel() * 0.9 * p });
      gsap.set(strap, { scaleX: 1 - 0.03 * p, transformOrigin: "100% 50%" });
      clasp.style.setProperty("--slide", p.toFixed(3));
    };
    const springBack = () => {
      gsap.to(plate, { x: 0, duration: 0.7, ease: "elastic.out(1.1, 0.35)", overwrite: true });
      gsap.to(strap, { scaleX: 1, duration: 0.5, ease: "elastic.out(1.1, 0.4)", overwrite: true });
      clasp.style.setProperty("--slide", "0");
    };
    const onClaspEnter = (ev: PointerEvent) => {
      if (opened || pull || ev.pointerType !== "mouse") return;
      // the catch is tried, the way a thumb tests a lock
      gsap.fromTo(plate, { x: 0 }, { x: -2.2, duration: 0.07, yoyo: true, repeat: 3, ease: "sine.inOut", overwrite: "auto" });
    };
    const onClaspDown = (ev: PointerEvent) => {
      if (opened || (ev.pointerType === "mouse" && ev.button !== 0)) return;
      pull = { id: ev.pointerId, x0: ev.clientX, p: 0, detent: false, moved: false };
      clasp.setPointerCapture(ev.pointerId);
      gsap.killTweensOf(plate);
      gsap.to(plate, { scale: 0.97, duration: 0.1, overwrite: "auto" });
      light(ev);
    };
    const onClaspMove = (ev: PointerEvent) => {
      light(ev);
      if (!pull || ev.pointerId !== pull.id || opened) return;
      const dx = pull.x0 - ev.clientX; // toward the spine
      if (dx > 5) pull.moved = true;
      pull.p = clamp(dx / travel(), 0, 1);
      setPull(pull.p);
      if (!pull.detent && pull.p > 0.55) {
        pull.detent = true;
        navigator.vibrate?.(8);
        sound.play("shelf");
      }
      if (pull.p >= 1) {
        pull = null;
        swallow = true;
        window.setTimeout(() => (swallow = false), 0);
        openBook({ pulled: true });
      }
    };
    const onClaspUp = (ev: PointerEvent) => {
      if (!pull || ev.pointerId !== pull.id) return;
      const was = pull;
      pull = null;
      if (clasp.hasPointerCapture(ev.pointerId)) clasp.releasePointerCapture(ev.pointerId);
      gsap.to(plate, { scale: 1, duration: 0.25, overwrite: "auto" });
      if (was.moved) {
        // let go before it gave way: it snaps back, and the click that follows is not an unlatch
        swallow = true;
        window.setTimeout(() => (swallow = false), 0);
        springBack();
      }
    };
    clasp.addEventListener("pointerenter", onClaspEnter);
    clasp.addEventListener("pointerdown", onClaspDown);
    clasp.addEventListener("pointermove", onClaspMove);
    clasp.addEventListener("pointerup", onClaspUp);
    clasp.addEventListener("pointercancel", onClaspUp);
    undo.push(() => {
      clasp.removeEventListener("pointerenter", onClaspEnter);
      clasp.removeEventListener("pointerdown", onClaspDown);
      clasp.removeEventListener("pointermove", onClaspMove);
      clasp.removeEventListener("pointerup", onClaspUp);
      clasp.removeEventListener("pointercancel", onClaspUp);
    });

    const openBook = (opts: { fast?: boolean; instant?: boolean; pulled?: boolean } = {}) => {
      if (opened || !director) return;
      opened = true;
      sound.unlock();
      intro?.progress(1);
      idle?.kill();
      window.removeEventListener("pointermove", onMove);
      if (opts.instant) {
        gsap.set(clasp.parentElement, { display: "none" });
        gsap.set(introRef.current, { autoAlpha: 0 });
        const st = cfg.current.start;
        const idx = st ? director.states.findIndex((x) => x.book === st.book && x.label === `s${st.step}`) : 0;
        director.place(Math.max(0, idx));
        noted = director.states[director.cur].book;
        syncWorld(true);
        world?.resume();
        syncUI();
        finishIntro();
        return;
      }
      // the latch lets go (pressed, or already slid), then the strap swings out around the fore-edge, over
      // and away behind the book, and is tucked out of sight
      const reach = clasp.offsetWidth;
      const t0 = opts.pulled ? 0.12 : 0.3;
      const o = gsap.timeline();
      o.add(() => sound.play("clasp"), opts.pulled ? 0 : 0.04)
        .to(introRef.current, { autoAlpha: 0, duration: 0.4 }, 0)
        .to(e0.body, { rotationX: 0, rotationY: 0, duration: 0.9, ease: "power2.out" }, 0)
        .to(clasp, { rotation: 0, duration: 0.1, ease: "power2.out" }, 0)
        // the hover glow would show its box edge once the clasp turns in 3D
        .to(glow, { opacity: 0, duration: 0.12 }, 0);
      if (!opts.pulled) {
        o.to(plate, { scale: 0.93, duration: 0.1, ease: "power2.out" }, 0).to(
          strap,
          { scaleX: 0.97, transformOrigin: "100% 50%", duration: 0.1, ease: "power2.out" },
          0,
        );
      }
      o.to(plate, { x: -travel() * 1.15, scale: 1.04, duration: 0.16, ease: "back.out(3)" }, opts.pulled ? 0 : 0.1)
        .to(barrel, { x: 2.5, duration: 0.06, ease: "power1.out", yoyo: true, repeat: 3 }, opts.pulled ? 0 : 0.1)
        .to(strap, { scaleX: 1, duration: 0.22, ease: "elastic.out(1.4, 0.5)" }, opts.pulled ? 0.05 : 0.12)
        // away from the viewer: over the edge and behind the book
        .to(clasp, { rotationY: -180, rotation: 1.5, duration: 1.05, ease: "power2.inOut" }, t0)
        .to(plate, { x: 0, scale: 1, duration: 0.5, ease: "power2.inOut" }, t0 + 0.2)
        // now it hangs outside the fore-edge; it slips in beneath the board
        .to(clasp, { x: -reach * 1.04, duration: 0.42, ease: "power2.in" }, t0 + 1.0)
        .set(clasp.parentElement, { display: "none" }, t0 + 1.5)
        .add(() => {
          sound.play("open");
          director!.start(opts.fast ? 1.8 : 1);
          // the book is open on the table: the room is told, and somebody looks up
          noted = 0;
          syncWorld();
          world?.notifyBook("open");
        }, t0 + 0.45);
    };
    // the closed book opens from the keyboard too, wherever the focus happens to be
    const onIntroKey = (ev: KeyboardEvent) => {
      if (opened || !intro || overlay.open) return;
      if ((ev.target as HTMLElement | null)?.closest?.("button, a, input, textarea, select")) return;
      if (["Enter", " ", "ArrowRight", "ArrowDown", "PageDown"].includes(ev.key)) {
        ev.preventDefault();
        openBook();
      }
    };
    window.addEventListener("keydown", onIntroKey);
    undo.push(() => window.removeEventListener("keydown", onIntroKey));
    api.current.open = () => (swallow ? void 0 : openBook());
    api.current.skip = () => openBook({ fast: true });
    api.current.goToBook = (i: number) => director?.jump(director.stateOfBook(i));
    api.current.goToStart = () => director?.jump(0);
    api.current.goTo = (book, id) => {
      if (!director || !ready) return;
      let step = 0;
      if (id) {
        const at = cfg.current.paged[book].pages.findIndex((pg) => pg.blocks.some((b) => b.id === id));
        if (at >= 0) step = els[book].mode === "spread" ? Math.floor(at / 2) : at;
      }
      const idx = director.states.findIndex((st) => st.book === book && st.label === `s${step}`);
      if (idx >= 0) director.jump(idx);
    };
    api.current.step = (d: 1 | -1) => {
      if (ready) director?.go(d);
    };

    // ───────── the drawing ─────────
    const startIntro = () => {
      const rect = (r: DOMRect) => ({ x: r.left, y: r.top, w: r.width, h: r.height });
      const of = (from: Element, sel: string) => {
        const r = from.querySelector(sel)?.getBoundingClientRect();
        return r && r.width > 0 ? rect(r) : null;
      };
      // everything is measured from the real scene, so the ink lies exactly on what it turns into
      const cover = of(e0.anchor, ".cover-front") ?? rect(e0.anchor.getBoundingClientRect());
      sketchSvg.setAttribute("viewBox", `0 0 ${window.innerWidth} ${window.innerHeight}`);
      const sk = buildSketch(sketchSvg, ink, {
        book: cover,
        band: cover.w * 0.13,
        radius: { fore: cover.h * 0.03, spine: cover.h * 0.008 },
        icon: of(e0.anchor, "[data-cover-icon]"),
        labels: Array.from(e0.anchor.querySelectorAll<HTMLElement>("[data-cover-title], [data-cover-mark]")),
        clasp: { plate: of(e0.anchor, ".clasp-plate"), strap: of(e0.anchor, ".clasp-strap"), barrel: of(e0.anchor, ".clasp-barrel") },
        plank: of(rootEl, ".plank"),
        shelfPaths,
      });
      // every stroke is now waiting to be drawn, so the drawings can be uncovered
      shelfInkOn = true;
      shelfInk.style.visibility = "";

      // the sheet starts to dissolve as the last strokes land, and the ink follows it out
      const develop = Math.max(0.6, sk.duration - 0.3);
      // the shot starts a little way back and comes in while the book is drawn (everything was
      // measured with the camera square on, above)
      gsap.set(camera, { scale: 0.93, willChange: "transform" });
      intro = gsap.timeline({ delay: 0.1 });
      intro
        .to(introRef.current, { autoAlpha: 1, duration: 0.6, ease: "power1.out" }, 0.3)
        .add(sk.tl, 0)
        .to(camera, { scale: 1, duration: develop + 0.9, ease: "power2.out" }, 0)
        .to(paper, { opacity: 0, duration: 1.4, ease: "sine.inOut" }, develop)
        // the room behind the book comes to life as the sheet lifts (it stays still while the drawing is made)
        .add(() => world?.resume(), develop)
        .to(amb, { intensity: 1, duration: 1.8, ease: "sine.inOut", onUpdate: () => ambient?.setIntensity(amb.intensity) }, develop)
        .to(ink, { opacity: 0, duration: 0.9, ease: "sine.in" }, develop + 0.5)
        .fromTo(e0.sheen, { xPercent: -75 }, { xPercent: -18, duration: 1.6, ease: "power2.inOut" }, develop + 0.7)
        .to(topRef.current, { autoAlpha: 1, duration: 0.9, ease: "power1.out" }, develop + 0.9)
        .to(hintEl, { opacity: 1, duration: 0.9 }, develop + 1.2)
        .add(() => {
          idle = gsap
            .timeline()
            .to(clasp, { rotation: 1.4, duration: 0.9, ease: "sine.out" })
            .to(clasp, { rotation: -1.4, duration: 1.8, ease: "sine.inOut", yoyo: true, repeat: -1 });
          if (fine) window.addEventListener("pointermove", onMove);
        }, develop + 1.4)
        .eventCallback("onComplete", () => {
          // invisible by now; hiding (not removing) them avoids a layer teardown mid-animation
          paper.style.visibility = "hidden";
          ink.style.visibility = "hidden";
          gsap.set(camera, { clearProps: "transform,willChange" });
          camY = 0;
        });
    };

    // ───────── boot: load everything heavy first, then draw ─────────
    const init = async () => {
      const [amod] = await Promise.all([
        import("@/components/three/ambient"),
        installTextures(),
        document.fonts?.ready ?? Promise.resolve(),
      ]);
      if (disposed) return;
      ambient = amod.createAmbient(canvasRef.current!, { particles: 0 });
      ambient?.setFocus(...focus());
      if (ambient) {
        // compile shaders and upload buffers now, under the white page
        ambient.setIntensity(0.002);
        ambient.render(0);
        ambient.setIntensity(amb.intensity);
        canvasRef.current!.style.opacity = "1";
      }
      // audio start-up can block for 100ms+: pay for it now, while the page is still blank
      sound.prepare();
      build();
      director = makeDirector();
      syncWorld(true);
      // book one starts out of its slot, closed, in the middle of the table
      tls[0].tl.time(tls[0].labels.open, false);
      syncUI();
      // let the browser paint every book's pages once, hidden under the white page, so opening a book later is instant
      els.forEach((e) => showLeaves(e, true));
      await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => r()))));
      els.forEach((e, k) => {
        const t = tls[k].tl.time();
        showLeaves(e, t >= tls[k].labels.open && t < tls[k].labels.shelved);
      });
      if (disposed) return;
      // the first book's sheets are copied now, a strip per frame, still hidden under the white page
      for (let i = 0; i < els[0].rigs.length; i++) {
        const job = fillJob(els[0], i);
        while (!job.step()) await new Promise<void>((r) => requestAnimationFrame(() => r()));
        if (disposed) return;
      }
      els.slice(1).forEach((e) => e.rigs.forEach((_, i) => fillQueue.push(() => fillJob(e, i))));

      if (skipIntro) {
        gsap.set([paper, ink], { display: "none" });
        openBook({ instant: true });
      } else {
        // start drawing only once the main thread has gone quiet, so the first stroke never stutters
        await new Promise<void>((r) => idleCb(() => requestAnimationFrame(() => r())));
        if (disposed) return;
        startIntro();
      }
    };
    void init();

    // ───────── layout changes: rebuild against the new slot positions ─────────
    let rz = 0;
    const rebuild = () => {
      if (!ready || !director) return;
      const times = tls.map((b) => b.tl.time());
      tls.forEach((b) => {
        b.tl.time(0, false);
        b.tl.kill();
      });
      build();
      tls.forEach((b, k) => b.tl.time(Math.min(times[k], b.end), false));
      director.rebind(tls);
      shelved.length = 0;
      syncUI();
      setLive(director.cur);
    };
    // the parent re-lays the scene out (new sizes, same structure) and asks us to re-aim the timelines
    relayout.current = () => {
      syncWorld();
      ambient?.resize();
      ambient?.setFocus(...focus());
      window.clearTimeout(rz);
      rz = window.setTimeout(rebuild, 30);
    };

    const ticker = (time: number) => ambient?.render(time);
    gsap.ticker.add(ticker);

    return () => {
      disposed = true;
      world?.pause();
      window.clearTimeout(rz);
      relayout.current = () => {};
      window.removeEventListener("pointermove", onMove);
      hoverOff.forEach((f) => f());
      unbind?.();
      gsap.ticker.remove(ticker);
      director?.dispose();
      tls.forEach((b) => b.tl.kill());
      intro?.kill();
      idle?.kill();
      ctx.revert();
      ambient?.dispose();
      undo.forEach((f) => f());
    };
    // one mount per structure; size-only changes go through relayout()
  }, []);

  const firstLayout = useRef(true);
  useEffect(() => {
    if (firstLayout.current) {
      firstLayout.current = false;
      return;
    }
    relayout.current();
  }, [layout]);

  const touch = layout.kind === "phone" || layout.kind === "tablet" || layout.kind === "phone-land";
  const sceneVars = {
    "--cx": `${layout.cx.toFixed(1)}px`,
    "--cy": `${layout.cy.toFixed(1)}px`,
    "--shelf-x": `${layout.shelf.left.toFixed(1)}px`,
    "--shelf-top": `${layout.shelf.top.toFixed(1)}px`,
    "--slot-h": `${layout.shelf.slotH.toFixed(1)}px`,
    "--slot-w": `${layout.shelf.slotW.toFixed(1)}px`,
    "--slot-gap": `${layout.shelf.gap.toFixed(1)}px`,
    "--min-em": `${layout.minEm}px`,
  } as CSSProperties;

  return (
    <NavContext.Provider value={nav}>
      <div ref={root} role="main" aria-label={`${profile.name} — portfolio`} data-kind={layout.kind} style={sceneVars}>
        {/* first stop for a keyboard: the same content as an ordinary page */}
        <a href="/quick" className="skip-link">
          Read it as a plain page
        </a>
        <p ref={sayRef} className="sr-only" aria-live="polite" />
        <div className="backdrop" />
        <canvas ref={canvasRef} className="ambient-canvas" aria-hidden />
        {/* the ambient canvas paints the whole room's light, so the people stand on top of it */}
        <WorldCanvas onReady={(w) => (worldRef.current = w)} />

        {/* the camera: the whole scene sits inside it, so one transform moves the shot */}
        <div ref={cameraRef} className="camera">
          <div className="stage">
            <Shelf ref={shelfRef} books={BOOKS} onPick={(i) => api.current.goToBook(i)} dir={layout.shelf.dir} labels={layout.shelf.labels} />

            {BOOKS.map((b, i) => (
              <Book
                key={b.id}
                def={b}
                index={i}
                box={layout.books[i]}
                paged={paged[i]}
                strips={layout.strips}
                clasp={i === 0 ? <Clasp ref={claspRef} onOpen={() => api.current.open()} /> : undefined}
              />
            ))}
          </div>

          {/* the sheet the opening drawing is made on, and the ink itself (lib/sketch.ts) */}
          <div ref={paperRef} className="sheet" />
          {/* volumes not yet opened stay on the shelf as drawings */}
          <svg ref={shelfInkRef} className="shelf-ink" aria-hidden />
          <div className="ink" aria-hidden>
            <svg ref={sketchRef} className="sketch" />
          </div>
        </div>

        <div ref={outroRef} className="outro">
          <div className="outro-inner">
            <div className="outro-meta">End of the set</div>
            <h2 className="outro-title mt-5">
              Thank you <em>for reading.</em>
            </h2>
            <div className="outro-links mt-9">
              <TextLink href={`mailto:${profile.email}`}>{profile.email}</TextLink>
              <TextLink href={profile.resumeUrl} download>
                Résumé
              </TextLink>
              <TextLink onClick={() => api.current.goToStart()}>Read again</TextLink>
            </div>
          </div>
        </div>

        <div className="ui-layer" style={{ pointerEvents: "none" }}>
          <TopBar ref={topRef} volumes={volumes} where={() => here.current} onGo={(book, id) => api.current.goTo(book, id)} />
          <Pager ref={nowRef} onPrev={() => api.current.step(-1)} onNext={() => api.current.step(1)} />
          <ScrollHint ref={hintRef} touch={touch} />
          <IntroControls ref={introRef} onSkip={() => api.current.skip()} touch={touch} />
        </div>
        <Cursor />
      </div>
    </NavContext.Provider>
  );
}
