/**
 * Turns wheel, pointer and keyboard input into page turns.
 *
 *  - wheel / vertical swipe / keys → one authored turn per intent (trackpad inertia never double-fires)
 *  - horizontal drag on the open book → the page follows the pointer and is released with its velocity
 */

export type Grab = { set: (q: number) => void; release: (commit: boolean, rate?: number) => void };
export type Hit = { side: "L" | "R" | "any"; pageW: number } | null;

export function bindInput(o: {
  step: (dir: 1 | -1) => void;
  home: () => void;
  end: () => void;
  enabled: () => boolean;
  /** Which half of the open book is under this point (null = not on the book). */
  hit: (x: number, y: number) => Hit;
  /** Take hold of the page that turns in this direction. */
  grab: (dir: 1 | -1) => Grab | null;
}) {
  // ───────── wheel ─────────
  let lastWheel = 0;
  let lastAbs = 0;
  const onWheel = (e: WheelEvent) => {
    if (e.ctrlKey) return; // pinch-zoom on trackpads
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

  // ───────── pointer: drag a page, or swipe ─────────
  type Phase = "idle" | "pending" | "drag" | "swipe" | "dead";
  let phase: Phase = "idle";
  let id = -1;
  let x0 = 0;
  let y0 = 0;
  let t0 = 0;
  let hit: Hit = null;
  let dir: 1 | -1 = 1;
  let grab: Grab | null = null;
  let q = 0;
  let touch = false;
  let swallowClick = false;
  const trail: { x: number; t: number }[] = [];

  const interactive = (t: EventTarget | null) =>
    !!(t as HTMLElement | null)?.closest?.("a, button, input, textarea, select, label, [data-nodrag]");

  const onDown = (e: PointerEvent) => {
    if (!o.enabled() || phase !== "idle" || (e.pointerType === "mouse" && e.button !== 0)) return;
    if (interactive(e.target)) return;
    phase = "pending";
    id = e.pointerId;
    x0 = e.clientX;
    y0 = e.clientY;
    t0 = performance.now();
    touch = e.pointerType !== "mouse";
    hit = o.hit(x0, y0);
    trail.length = 0;
  };

  const onMove = (e: PointerEvent) => {
    if (e.pointerId !== id || phase === "idle" || phase === "dead") return;
    const dx = e.clientX - x0;
    const dy = e.clientY - y0;
    if (phase === "pending") {
      if (Math.abs(dx) > 7 && Math.abs(dx) > Math.abs(dy) * 1.15 && hit) {
        dir = dx < 0 ? 1 : -1;
        // a page is picked up from the side it lies on
        const ok = hit.side === "any" || (dir > 0 ? hit.side === "R" : hit.side === "L");
        grab = ok ? o.grab(dir) : null;
        phase = grab ? "drag" : "dead";
        if (grab) window.getSelection()?.removeAllRanges();
      } else if (touch && Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) {
        phase = "swipe";
      }
    }
    if (phase === "drag" && grab && hit) {
      e.preventDefault();
      const travel = hit.pageW * 1.45;
      q = Math.min(1, Math.max(0, (-dir * dx - 7) / travel));
      grab.set(q);
      const now = performance.now();
      trail.push({ x: e.clientX, t: now });
      while (trail.length > 2 && now - trail[0].t > 90) trail.shift();
    }
  };

  const finish = (e: PointerEvent, cancelled: boolean) => {
    if (e.pointerId !== id) return;
    if (phase === "drag" && grab) {
      const a = trail[0];
      const b = trail[trail.length - 1];
      // px/ms in the turning direction (positive = with the turn)
      const v = a && b && b.t > a.t ? (-dir * (b.x - a.x)) / (b.t - a.t) : 0;
      const commit = !cancelled && (v > 0.35 || (q > 0.5 && v > -0.25));
      grab.release(commit, Math.min(2.6, 1 + Math.abs(v) * 1.1));
      swallowClick = true;
      window.setTimeout(() => (swallowClick = false), 0);
    } else if (phase === "swipe" && !cancelled) {
      const dy = y0 - e.clientY;
      const dt = performance.now() - t0;
      if (Math.abs(dy) > 38 || (Math.abs(dy) > 18 && dt < 160)) o.step(dy > 0 ? 1 : -1);
    }
    phase = "idle";
    grab = null;
    id = -1;
  };
  const onUp = (e: PointerEvent) => finish(e, false);
  const onCancel = (e: PointerEvent) => finish(e, true);
  const onClick = (e: MouseEvent) => {
    if (swallowClick) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  // ───────── keys ─────────
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
  window.addEventListener("pointerdown", onDown);
  window.addEventListener("pointermove", onMove, { passive: false });
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onCancel);
  window.addEventListener("click", onClick, true);
  window.addEventListener("keydown", onKey);
  return () => {
    window.removeEventListener("wheel", onWheel);
    window.removeEventListener("pointerdown", onDown);
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onCancel);
    window.removeEventListener("click", onClick, true);
    window.removeEventListener("keydown", onKey);
  };
}
