"use client";

import { useEffect, useRef, useState } from "react";
import type { Mode } from "@/components/book/types";
import { Stage } from "@/components/stage/Stage";
import { QuickView } from "@/components/quick/QuickView";

/**
 * Picks the right experience for the device:
 *  ≥768px  → full two-page spreads
 *  <768px  → single-page books
 *  reduced motion → the calm Quick view (with an opt-in to the animated version)
 */
export default function Experience() {
  const [mode, setMode] = useState<Mode | null>(null);
  const [reduced, setReduced] = useState(false);
  const [optIn, setOptIn] = useState(false);
  const introSeen = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const rm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setMode(mq.matches ? "single" : "spread");
    const updateReduced = () => setReduced(rm.matches);
    update();
    updateReduced();
    mq.addEventListener("change", update);
    rm.addEventListener("change", updateReduced);
    return () => {
      mq.removeEventListener("change", update);
      rm.removeEventListener("change", updateReduced);
    };
  }, []);

  if (!mode) return <div className="fixed inset-0 bg-white" />;

  if (reduced && !optIn) {
    return (
      <QuickView
        banner={
          <button
            type="button"
            onClick={() => setOptIn(true)}
            className="rounded-full border border-white/15 px-3 py-2 tracking-[0.2em] uppercase hover:border-white/40 hover:text-[var(--ivory)]"
          >
            Animated version
          </button>
        }
      />
    );
  }

  return (
    <Stage
      key={mode}
      mode={mode}
      skipIntro={introSeen.current}
      onIntroDone={() => {
        introSeen.current = true;
      }}
    />
  );
}
