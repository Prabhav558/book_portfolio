/**
 * Turns wheel, touch and keyboard input into single "turn the page" intents.
 * Trackpad inertia and rapid wheel notches never double-fire: a new intent needs
 * a pause, or a clearly stronger flick than the tail of the previous one.
 */
export function bindInput(o: {
  step: (dir: 1 | -1) => void;
  home: () => void;
  end: () => void;
  enabled: () => boolean;
}) {
  let lastWheel = 0;
  let lastAbs = 0;

  const onWheel = (e: WheelEvent) => {
    if (!o.enabled()) return;
    e.preventDefault();
    const d = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    const abs = Math.abs(d);
    const now = performance.now();
    const fresh = now - lastWheel > 110 || abs > lastAbs * 1.7 + 12;
    lastWheel = now;
    lastAbs = abs;
    if (abs < 4 || !fresh) return;
    o.step(d > 0 ? 1 : -1);
  };

  let y0: number | null = null;
  let t0 = 0;
  const onTouchStart = (e: TouchEvent) => {
    y0 = e.touches[0].clientY;
    t0 = performance.now();
  };
  const onTouchMove = (e: TouchEvent) => {
    if (o.enabled()) e.preventDefault();
  };
  const onTouchEnd = (e: TouchEvent) => {
    if (y0 === null || !o.enabled()) return;
    const dy = y0 - e.changedTouches[0].clientY;
    const dt = performance.now() - t0;
    y0 = null;
    if (Math.abs(dy) > 38 || (Math.abs(dy) > 18 && dt < 160)) o.step(dy > 0 ? 1 : -1);
  };

  const onKey = (e: KeyboardEvent) => {
    if (!o.enabled()) return;
    const t = e.target as HTMLElement | null;
    if (t?.closest("input, textarea, select, [contenteditable]")) return;
    const onControl = !!t?.closest("button, a");
    const fwd = ["ArrowDown", "ArrowRight", "PageDown"].includes(e.key) || (e.key === " " && !e.shiftKey && !onControl);
    const back = ["ArrowUp", "ArrowLeft", "PageUp"].includes(e.key) || (e.key === " " && e.shiftKey);
    if (fwd || back) {
      e.preventDefault();
      o.step(fwd ? 1 : -1);
    } else if (e.key === "Home") {
      e.preventDefault();
      o.home();
    } else if (e.key === "End") {
      e.preventDefault();
      o.end();
    }
  };

  window.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("touchstart", onTouchStart, { passive: true });
  window.addEventListener("touchmove", onTouchMove, { passive: false });
  window.addEventListener("touchend", onTouchEnd, { passive: true });
  window.addEventListener("keydown", onKey);
  return () => {
    window.removeEventListener("wheel", onWheel);
    window.removeEventListener("touchstart", onTouchStart);
    window.removeEventListener("touchmove", onTouchMove);
    window.removeEventListener("touchend", onTouchEnd);
    window.removeEventListener("keydown", onKey);
  };
}
