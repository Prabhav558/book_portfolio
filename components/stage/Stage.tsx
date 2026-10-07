"use client";

import { useEffect, useMemo, useRef, type CSSProperties } from "react";
import { gsap } from "@/lib/gsap";
import { sound } from "@/lib/audio";
import { installTextures } from "@/lib/textures";
import { applyShelfPose, bookEls, buildBook, fillJob, resetBook, CAMERA_ZOOM, type BookTL } from "@/lib/timeline";
import type { RigJob } from "@/lib/curl";
import type { Layout } from "@/lib/layout";
import { createDirector, type Director } from "@/lib/director";
import { bindInput } from "@/lib/input";
import { buildSketch } from "@/lib/sketch";
import type { Ambient } from "@/components/three/ambient";
import { Book } from "@/components/book/Book";
import type { Paged } from "@/components/book/Paginator";
import { Clasp } from "@/components/intro/Clasp";
import { Shelf } from "@/components/shelf/Shelf";
import { IntroControls, NowReading, Rail, ScrollHint, TopBar } from "@/components/ui/Chrome";
import { NavContext, Arrow } from "@/components/pages/primitives";
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
  const outroRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const nowRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
  const claspRef = useRef<HTMLButtonElement>(null);

  const cfg = useRef({ skipIntro, onIntroDone, onPosition, layout, paged, start });
  cfg.current = { skipIntro, onIntroDone, onPosition, layout, paged, start };
  const relayout = useRef<() => void>(() => {});

  // stable handles the page content can call before/after the director exists
  const api = useRef<{ goToBook: (i: number) => void; goToStart: () => void; open: () => void; skip: () => void }>({
    goToBook: () => {},
    goToStart: () => {},
    open: () => {},
    skip: () => {},
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
    const railItems = gsap.utils.toArray<HTMLElement>("[data-rail]", rootEl);
    const railFills = gsap.utils.toArray<HTMLElement>("[data-rail-fill]", rootEl);
    const nowVol = nowRef.current!.querySelector<HTMLElement>("[data-now-vol]")!;
    const nowTitle = nowRef.current!.querySelector<HTMLElement>("[data-now-title]")!;
    const nowText = nowRef.current!.querySelector<HTMLElement>(".now-text")!;
    const nowPage = nowRef.current!.querySelector<HTMLElement>("[data-now-page]")!;
    const hintEl = rootEl.querySelector<HTMLElement>("[data-intro-hint]")!;
    const skipEl = rootEl.querySelector<HTMLElement>("[data-skip]")!;
    const clasp = claspRef.current!;
    const paper = paperRef.current!;
    const sketchSvg = sketchRef.current!;

    // ───────── first look: everything at rest, hidden behind the white page ─────────
    els.forEach(resetBook);
    slots.forEach((s, k) => gsap.set(s, { "--filled": k === 0 ? 0 : 1 }));
    gsap.set([topRef.current, nowRef.current, railRef.current, hintRef.current, introRef.current], { autoAlpha: 0 });
    gsap.set(clasp, { x: 16, rotation: -1.4 });
    gsap.set(hintEl, { opacity: 0 });
    gsap.set(skipEl, { color: "#3a3028", borderColor: "rgba(58,48,40,.25)" });

    // ───────── state ─────────
    let tls: BookTL[] = [];
    let director: Director | null = null;
    let ambient: Ambient | null = null;
    const amb = { intensity: skipIntro ? 1 : 0, scroll: 0 };
    let ready = false;
    let opened = false;
    let move = { from: 0, to: 0 };
    let hintHidden = false;
    let intro: gsap.core.Timeline | null = null;
    let idle: gsap.core.Tween | null = null;
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
          railFills[k]?.style.setProperty("transform", `scaleX(${fill})`);
          shelfLabels[k]?.style.setProperty("--p", fill.toFixed(3));
        }
        const on = t <= 0.0001 || t >= b.labels.shelved - 0.0001;
        if (on !== shelved[k]) {
          shelved[k] = on;
          slots[k]?.toggleAttribute("data-filled", on);
          shelfLabels[k]?.toggleAttribute("data-filled", on);
          if (!on) lift(k, false);
        }
        const g = BOOKS[k].glow;
        const w = b.glow.v;
        tr += (g[0] - BASE_TINT[0]) * w;
        tg += (g[1] - BASE_TINT[1]) * w;
        tb += (g[2] - BASE_TINT[2]) * w;
        sw += w;
      });
      const mix = 0.55 / Math.max(1, sw);
      ambient?.setTint(BASE_TINT[0] + tr * mix, BASE_TINT[1] + tg * mix, BASE_TINT[2] + tb * mix);
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
        nowVol.textContent = `Volume ${ROMAN[book]}`;
        nowTitle.textContent = BOOKS[book].label;
        nowRef.current!.style.setProperty("--c", BOOKS[book].silk);
        railItems.forEach((r, k) => r.toggleAttribute("data-active", k === book));
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
      if (s.label === "end") {
        nowPage.textContent = "";
        return;
      }
      const step = Number(s.label.slice(1));
      nowPage.textContent = els[s.book].mode === "spread" ? `${2 * step + 1}–${2 * step + 2} / ${total}` : `${step + 1} / ${total}`;
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
        if (fillJobNow.step()) fillJobNow = null;
        idleCb(run);
      };
      idleCb(run);
    };
    /**
     * Keep the open book's sheets painted and ready to be picked up: all of them on capable
     * devices (so even riffling the book shut is instant), the two beside the spread on weak ones.
     */
    const arm = (book: number, step: number) => {
      const all = cfg.current.layout.strips >= 7;
      els.forEach((e, k) =>
        e.rigs.forEach((r, i) => r.classList.toggle("armed", k === book && (all ? !!e.fills[i] : i === step || i === step - 1))),
      );
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

    function finishIntro() {
      ready = true;
      const at = director!.states[director!.cur];
      setNow(at.book, true);
      setPage(director!.cur);
      setLive(director!.cur);
      if (at.label !== "end") arm(at.book, Number(at.label.slice(1)));
      pump();
      gsap.to([topRef.current, nowRef.current, railRef.current, hintRef.current], {
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
        grab: (d) => director!.scrub(d),
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

    // ───────── the drawing ─────────
    const startIntro = () => {
      const rect = (r: DOMRect) => ({ x: r.left, y: r.top, w: r.width, h: r.height });
      const br = e0.anchor.getBoundingClientRect();
      const plank = rect(rootEl.querySelector<HTMLElement>(".plank")!.getBoundingClientRect());
      const first = slots[0].getBoundingClientRect();
      const lastSlot = slots[N - 1].getBoundingClientRect();
      const shelfBooks = slots.slice(1).map((sl) => rect(sl.getBoundingClientRect()));
      const plankSpan = plank.h > 0 ? { x: first.left - 8, y: plank.y, w: lastSlot.right - first.left + 16, h: plank.h } : null;
      sketchSvg.setAttribute("viewBox", `0 0 ${window.innerWidth} ${window.innerHeight}`);
      const sk = buildSketch(sketchSvg, { book: rect(br), plank: plankSpan, shelfBooks });

      const W = window.innerWidth;
      const H = window.innerHeight;
      const cx = br.left + br.width / 2;
      const cy = br.top + br.height / 2;
      const ring = paper.querySelector<HTMLElement>(".iris-ring")!;
      const [pt, pb, pl, pr] = ["t", "b", "l", "r"].map((k) => paper.querySelector<HTMLElement>(`.iris-${k}`)!);
      Object.assign(ring.style, { left: `${cx - 400}px`, top: `${cy - 400}px` });
      Object.assign(pt.style, { left: "0", width: "100%", height: `${H}px`, top: `${cy - H}px` });
      Object.assign(pb.style, { left: "0", width: "100%", height: `${H}px`, top: `${cy}px` });
      Object.assign(pl.style, { top: "0", height: "100%", width: `${W}px`, left: `${cx - W}px` });
      Object.assign(pr.style, { top: "0", height: "100%", width: `${W}px`, left: `${cx}px` });
      const reach = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy));
      const iris = { s: 0.001 };
      const setIris = () => {
        const d = 400 * iris.s;
        ring.style.transform = `scale(${iris.s.toFixed(4)})`;
        pt.style.transform = `translate3d(0,${-d}px,0)`;
        pb.style.transform = `translate3d(0,${d}px,0)`;
        pl.style.transform = `translate3d(${-d}px,0,0)`;
        pr.style.transform = `translate3d(${d}px,0,0)`;
      };
      setIris();
      const maxS = (reach + 60) / (400 * 0.38);
      const irisAt = Math.max(1, sk.duration - 1.1);

      // a small rise only: scaling would make the browser redraw the whole cover every frame
      gsap.set(e0.body, { y: 12 });
      intro = gsap.timeline({ delay: 0.1 });
      intro
        .to(introRef.current, { autoAlpha: 1, duration: 0.6, ease: "power1.out" }, 0.3)
        .add(sk.tl, 0)
        // the lights come up from the diary outward, burning the white page away
        .fromTo(iris, { s: 0.001 }, { s: maxS, duration: 2.4, ease: "power2.inOut", onUpdate: setIris }, irisAt)
        .to(amb, { intensity: 1, duration: 2.4, ease: "power2.inOut", onUpdate: () => ambient?.setIntensity(amb.intensity) }, irisAt)
        .to(sk.group, { opacity: 0, duration: 1.1, ease: "power1.in" }, irisAt + 0.2)
        .to(e0.body, { y: 0, duration: 2.4, ease: "power3.out" }, irisAt)
        .fromTo(e0.sheen, { xPercent: -75 }, { xPercent: -18, duration: 1.6, ease: "power2.inOut" }, irisAt + 0.9)
        .to(skipEl, { color: "rgba(37,39,42,.58)", borderColor: "rgba(37,39,42,.14)", duration: 1.6, ease: "power2.inOut", clearProps: "color,borderColor" }, irisAt + 0.3)
        .to(topRef.current, { autoAlpha: 1, duration: 0.9, ease: "power1.out" }, irisAt + 1.3)
        .to(clasp, { x: 0, duration: 0.9, ease: "power3.out" }, irisAt + 1.5)
        .to(hintEl, { opacity: 1, duration: 0.9 }, irisAt + 2.1)
        .add(() => {
          idle = gsap.to(clasp, { rotation: 1.4, duration: 1.8, ease: "sine.inOut", yoyo: true, repeat: -1 });
          if (fine) window.addEventListener("pointermove", onMove);
        }, irisAt + 1.9)
        .eventCallback("onComplete", () => {
          // the panels are off-screen and the pencil is invisible by now; leaving them alone avoids a layer teardown mid-animation
          paper.style.visibility = "hidden";
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
      const L0 = cfg.current.layout;
      ambient = amod.createAmbient(canvasRef.current!, { particles: L0.kind === "phone" ? 150 : L0.strips < 7 ? 220 : 380 });
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
      els.forEach((e) => gsap.set(e.leaves, { visibility: "visible" }));
      await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => r()))));
      els.forEach((e, k) => {
        const t = tls[k].tl.time();
        gsap.set(e.leaves, { visibility: t >= tls[k].labels.open && t < tls[k].labels.shelved ? "inherit" : "hidden" });
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
        gsap.set(paper, { display: "none" });
        gsap.set(sketchSvg, { display: "none" });
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

          <div ref={outroRef} className="outro">
            <div className="outro-inner">
              <div className="text-[11px] font-semibold tracking-[0.42em] text-[var(--gold)] uppercase">The End</div>
              <h2 className="mt-4 font-serif text-[clamp(36px,5vw,56px)] leading-[1.05] text-[var(--ivory)]">
                Thanks for <span className="italic text-[var(--gold-hi)]">reading.</span>
              </h2>
              <p className="mx-auto mt-4 max-w-[420px] text-[15px] leading-relaxed text-[var(--ivory-dim)]">
                Four volumes, one engineer. If any of it resonated, I&apos;d love to hear from you — the shelf above
                will take you back to any chapter.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <a href={`mailto:${profile.email}`} className="btn-light">
                  Email me <Arrow />
                </a>
                <a href={profile.resumeUrl} download className="btn-outline-light">
                  Résumé
                </a>
                <button type="button" className="btn-outline-light" onClick={() => api.current.goToStart()}>
                  Read again <Arrow className="-rotate-90" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div ref={paperRef} className="iris">
          <i className="iris-p iris-t" />
          <i className="iris-p iris-b" />
          <i className="iris-p iris-l" />
          <i className="iris-p iris-r" />
          <i className="iris-ring" />
        </div>
        <svg ref={sketchRef} className="sketch" aria-hidden />

        <div className="ui-layer" style={{ pointerEvents: "none" }}>
          <TopBar ref={topRef} />
          <NowReading ref={nowRef} />
          <Rail ref={railRef} books={BOOKS} onPick={(i) => api.current.goToBook(i)} />
          <ScrollHint ref={hintRef} />
          <IntroControls ref={introRef} onSkip={() => api.current.skip()} />
        </div>
      </div>
    </NavContext.Provider>
  );
}
