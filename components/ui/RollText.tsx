"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

/**
 * Two lines on the faces of a drum: hover (or focus, or a tap on a touch screen) and the drum rolls over like
 * the page of a desk calendar, and the second line is the one you read. Take the pointer away and it rolls back.
 * The width follows the line on show, so whatever comes after it stays close.
 */
export function RollText({ from, to }: { from: string; to: string }) {
  const root = useRef<HTMLSpanElement>(null);
  const a = useRef<HTMLSpanElement>(null);
  const b = useRef<HTMLSpanElement>(null);

  // each line's width, measured once the font is there, so the box can slide between them
  useLayoutEffect(() => {
    const measure = () => {
      const r = root.current;
      if (!r || !a.current || !b.current) return;
      r.style.setProperty("--wa", `${a.current.offsetWidth}px`);
      r.style.setProperty("--wb", `${b.current.offsetWidth}px`);
    };
    measure();
    void document.fonts?.ready.then(measure);
  }, [from, to]);

  // On a touch screen a tap on a page lands on the page's face, not on the line inside it (the pages are in 3D),
  // so the tap is matched to the line by where it fell.
  useEffect(() => {
    if (!window.matchMedia("(hover: none)").matches) return;
    let down: { x: number; y: number } | null = null;
    const onDown = (e: PointerEvent) => (down = { x: e.clientX, y: e.clientY });
    const onUp = (e: PointerEvent) => {
      const el = root.current;
      const d = down;
      down = null;
      if (!el || !d || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 8) return;
      if (getComputedStyle(el).visibility === "hidden") return;
      const r = el.getBoundingClientRect();
      if (r.width < 1 || e.clientX < r.left - 8 || e.clientX > r.right + 8 || e.clientY < r.top - 8 || e.clientY > r.bottom + 8) return;
      el.toggleAttribute("data-flip");
    };
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  return (
    <span
      ref={root}
      className="roll"
      tabIndex={0}
      aria-label={`${from}, also ${to}`}
      // (a touch screen has no hover: see above, a tap turns it over and a second tap turns it back)
    >
      {/* the drum is in 3D, which touch screens hit-test badly: a flat, invisible plate takes the pointer instead */}
      <span className="roll-hit" aria-hidden />
      <span className="roll-drum" aria-hidden>
        <span ref={a} className="roll-face roll-a">
          {from}
        </span>
        <span ref={b} className="roll-face roll-b">
          {to}
        </span>
      </span>
    </span>
  );
}
