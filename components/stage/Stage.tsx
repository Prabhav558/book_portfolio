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
import { createPeel } from "@/lib/fold";
import { buildSketch } from "@/lib/sketch";
import type { Ambient } from "@/components/three/ambient";
import { Book } from "@/components/book/Book";
import type { Paged } from "@/components/book/Paginator";
import { Clasp } from "@/components/intro/Clasp";
import { Shelf } from "@/components/shelf/Shelf";
import { IntroControls, Pager, ScrollHint, TopBar } from "@/components/ui/Chrome";
import { NavContext, TextLink } from "@/components/pages/primitives";
import { BOOKS } from "@/components/pages";
import { profile } from "@/content/portfolio";

const ROMAN = ["I", "II", "III", "IV"];
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

  const cfg = useRef({ skipIntro, onIntroDone, onPosition, layout, paged, start });
  cfg.current = { skipIntro, onIntroDone, onPosition, layout, paged, start };
  const relayout = useRef<() => void>(() => {});

  // stable handles the page content can call before/after the director exists
  const api = useRef<{
    goToBook: (i: number) => void;
    goToStart: () => void;
    open: () => void;
    skip: () => void;
    step: (d: 1 | -1) => void;
  }>({
    goToBook: () => {},
    goToStart: () => {},
    open: () => {},
    skip: () => {},
    step: () => {},
  });
  const nav = useMemo(
    () => ({ goToBook: (i: number) => api.current.goToBook(i), goToStart: () => api.current.goToStart() }),
    [],
  );

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

    // ───────── shelf hover lift ─────────
    function lift(k: number, up: boolean) {
      if (up && (!shelved[k] || director?.busy)) return;
      gsap.to(els[k].body, { y: up ? -els[k].anchor.offsetHeight * 0.08 : 0, duration: 0.45, ease: "power3.out", overwrite: "auto" });
      shelfLabels[k]?.toggleAttribute("data-hover", up);
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
        return;
      }
      const step = Number(s.label.slice(1));
      const two = (n: number) => String(n).padStart(2, "0");
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

    const clearLive = () => rootEl.querySelectorAll(".face.is-live").forEach((f) => f.classList.remove("is-live"));
    const setLive = (idx: number) => {
      clearLive();
      const s = director!.states[idx];
      if (s.label === "end") return;
      els[s.book].anchor.querySelectorAll(`.face[data-step="${s.label.slice(1)}"]`).forEach((f) => f.classList.add("is-live"));
    };

    const makeDirector = () =>
      createDirector(tls, {
        onMove: (from, to) => {
          const a = director!.states[from].book;
          const b = director!.states[to].book;
          move = { from: a, to: b };
          clearLive();
          if (a !== b) setNow(b);
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
    const grab = (dir: 1 | -1, x: number, y: number) => {
      const held = director?.hold(dir);
      if (!held) return null;
      const s = director!.states[director!.cur];
      const e = els[s.book];
      const i = Number(s.label.slice(1)) - (dir > 0 ? 0 : 1);
      const leaf = e.pageLeaves[i];
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
        enabled: () => ready,
        hit,
        grab,
      });
      cfg.current.onIntroDone();
    }

    const openBook = (opts: { fast?: boolean; instant?: boolean } = {}) => {
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
        syncUI();
        finishIntro();
        return;
      }
      const o = gsap.timeline();
      o.add(() => sound.play("clasp"), 0)
        .to(introRef.current, { autoAlpha: 0, duration: 0.4 }, 0)
        .to(e0.body, { rotationX: 0, rotationY: 0, duration: 0.7, ease: "power2.out" }, 0)
        .to(clasp, { scale: 1.08, x: -3, rotation: 0, duration: 0.09, ease: "power2.out" }, 0)
        .to(clasp, { rotationY: 168, x: 0, scale: 1, duration: 0.8, ease: "power3.inOut" }, 0.09)
        .to(clasp, { opacity: 0, duration: 0.3, ease: "power1.in" }, 0.55)
        // gone for good: an invisible button must not sit on top of the page
        .set(clasp.parentElement, { display: "none" }, 0.9)
        .add(() => {
          sound.play("open");
          director!.start(opts.fast ? 1.8 : 1);
        }, 0.5);
    };
    api.current.open = () => openBook();
    api.current.skip = () => openBook({ fast: true });
    api.current.goToBook = (i: number) => director?.jump(director.stateOfBook(i));
    api.current.goToStart = () => director?.jump(0);
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
        shelfBooks: els.slice(1).flatMap((e) => of(e.anchor, ".cover-front") ?? []),
      });

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
      ambient?.resize();
      ambient?.setFocus(...focus());
      window.clearTimeout(rz);
      rz = window.setTimeout(rebuild, 30);
    };

    const ticker = (time: number) => ambient?.render(time);
    gsap.ticker.add(ticker);

    return () => {
      disposed = true;
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
      <div ref={root} data-kind={layout.kind} style={sceneVars}>
        <div className="backdrop" />
        <canvas ref={canvasRef} className="ambient-canvas" aria-hidden />

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
          <TopBar ref={topRef} />
          <Pager ref={nowRef} onPrev={() => api.current.step(-1)} onNext={() => api.current.step(1)} />
          <ScrollHint ref={hintRef} touch={touch} />
          <IntroControls ref={introRef} onSkip={() => api.current.skip()} touch={touch} />
        </div>
      </div>
    </NavContext.Provider>
  );
}
