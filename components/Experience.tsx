"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { computeLayout, type Layout } from "@/lib/layout";
import { Measure, type Paged } from "@/components/book/Paginator";
import { Stage, type Position } from "@/components/stage/Stage";
import { QuickView } from "@/components/quick/QuickView";
import { BOOKS } from "@/components/pages";

type Scene = { layout: Layout; paged: Paged[]; sig: string; start: { book: number; step: number } | null };

/** Structure of the scene: changes only when books must be rebuilt (modes, strips, or how blocks fall into pages). */
const signature = (layout: Layout, paged: Paged[]) =>
  `${layout.key}#${paged.map((p) => p.pages.map((pg) => pg.blocks.map((b) => b.id).join(",")).join("|")).join("#")}`;

/**
 * Sizes the scene for the device, flows the content into pages for that size,
 * and keeps the reader's place when the screen changes.
 * Reduced motion → the calm Quick view (with an opt-in to the animated version).
 */
export default function Experience() {
  const [pending, setPending] = useState<Layout | null>(null);
  const [scene, setScene] = useState<Scene | null>(null);
  const [reduced, setReduced] = useState(false);
  const [optIn, setOptIn] = useState(false);
  const introSeen = useRef(false);
  const pos = useRef<Position>({ book: 0, block: null });

  useEffect(() => {
    const rm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateReduced = () => setReduced(rm.matches);
    updateReduced();
    rm.addEventListener("change", updateReduced);

    let last = { w: window.innerWidth, h: window.innerHeight };
    setPending(computeLayout(last.w, last.h, BOOKS.length));
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    let timer = 0;
    const onResize = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        // a phone's address bar sliding away is not a new layout
        if (coarse && w === last.w && Math.abs(h - last.h) < 130) return;
        if (w === last.w && h === last.h) return;
        last = { w, h };
        setPending(computeLayout(w, h, BOOKS.length));
      }, 140);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", onResize);
      rm.removeEventListener("change", updateReduced);
    };
  }, []);

  const onMeasured = useCallback((paged: Paged[], layout: Layout) => {
    const sig = signature(layout, paged);
    setScene((prev) => {
      // find the page that now holds whatever the reader was looking at
      let start: Scene["start"] = null;
      if (prev && prev.sig !== sig && introSeen.current) {
        const { book, block } = pos.current;
        const pages = paged[book].pages;
        const at = block ? Math.max(0, pages.findIndex((pg) => pg.blocks.some((b) => b.id === block))) : pages.length - 1;
        start = { book, step: layout.books[book].mode === "spread" ? Math.floor(at / 2) : at };
      }
      return { layout, paged, sig, start };
    });
    setPending(null);
  }, []);

  const onIntroDone = useCallback(() => {
    introSeen.current = true;
  }, []);
  const onPosition = useCallback((p: Position) => {
    pos.current = p;
  }, []);

  if (reduced && !optIn) {
    return (
      <QuickView
        banner={
          <button
            type="button"
            onClick={() => setOptIn(true)}
            className="link"
          >
            Animated version
          </button>
        }
      />
    );
  }

  return (
    <>
      {!scene && <div className="fixed inset-0 bg-white" />}
      {pending && <Measure defs={BOOKS} layout={pending} onDone={onMeasured} />}
      {scene && (
        <Stage
          key={scene.sig}
          layout={scene.layout}
          paged={scene.paged}
          skipIntro={introSeen.current}
          start={scene.start}
          onIntroDone={onIntroDone}
          onPosition={onPosition}
        />
      )}
    </>
  );
}
