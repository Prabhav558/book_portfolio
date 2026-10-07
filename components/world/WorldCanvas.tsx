"use client";

import { useEffect, useRef } from "react";
import { WorldEngine } from "@/lib/world/engine";

/**
 * The room behind the book: one canvas under everything else, no pointer events of its own.
 * The engine (lib/world) owns the loop, so React renders this once and never again; the page
 * is handed the engine through `onReady` and talks to it directly.
 */
export function WorldCanvas({ onReady }: { onReady: (world: WorldEngine | null) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const ready = useRef(onReady);
  ready.current = onReady;

  useEffect(() => {
    const world = new WorldEngine(ref.current!);
    ready.current(world);
    return () => {
      ready.current(null);
      world.destroy();
    };
  }, []);

  return <canvas ref={ref} className="world-canvas" aria-hidden />;
}
