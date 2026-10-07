/**
 * Turns wheel, pointer and keyboard input into page turns.
 *
 *  - wheel / vertical swipe / keys → one authored turn per intent (trackpad inertia never double-fires)
 *  - a drag on the open book → the page is picked up where it was touched, follows the pointer,
 *    and is let go with the pointer's velocity
 */

export type Grab = { move: (x: number, y: number) => void; release: (vx: number, cancelled: boolean) => void };
export type Hit = { side: "L" | "R" | "any"; pageW: number } | null;

export function bindInput(o: {
  step: (dir: 1 | -1) => void;
  home: () => void;
  end: () => void;
  enabled: () => boolean;
  /** Which half of the open book is under this point (null = not on the book). */
  hit: (x: number, y: number) => Hit;
  /** Take hold of the page that turns in this direction, at this point. */
  grab: (dir: 1 | -1, x: number, y: number) => Grab | null;
}) {
  // ───────── wheel ─────────
  // A turn needs a deliberate gesture: about one mouse-wheel notch, or a firm trackpad swipe, added up.
  // After a turn the rest of that gesture (a trackpad's long inertia tail, a wheel spun fast) is ignored;
  // the next turn waits for a pause or a fresh, stronger push.
  const NEED = 80;
  const COOL = 240;
  let lastWheel = 0;
  let lastAbs = 0;
  let lastSign = 0;
  let acc = 0;
  let open = true;
  let lockUntil = 0;
  const onWheel = (e: WheelEvent) => {
    if (e.ctrlKey) return; // pinch-zoom on trackpads
    if (!o.enabled()) return;
    e.preventDefault();
    const raw = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    // lines and pages (some browsers, some mice) are brought to pixels
    const d = raw * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1);
    const abs = Math.abs(d);
    if (abs < 1) return;
    const sign = d > 0 ? 1 : -1;
    const now = performance.now();
    const gap = now - lastWheel;
    const fresh = gap > 170 || abs > lastAbs * 1.8 + 20 || sign !== lastSign;
    lastWheel = now;
    lastAbs = abs;
    lastSign = sign;
    if (fresh) {
      acc = 0;
      open = true;
    }
    if (!open || now < lockUntil) return;
    acc += d;
    if (Math.abs(acc) >= NEED) {
      o.step(acc > 0 ? 1 : -1);
      acc = 0;
      open = false;
      lockUntil = now + COOL;
    }
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
    // a mouse that moves with no button down has been released somewhere we did not hear
    if (e.pointerType === "mouse" && e.buttons === 0) return dropHold();
    const dx = e.clientX - x0;
    const dy = e.clientY - y0;
    if (phase === "pending") {
      // a corner can be peeled on the diagonal, so the pull only has to lean sideways (a little less so under a finger,
      // where straight up and down is a swipe)
      if (Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy) * (touch ? 0.7 : 0.45) && hit) {
        dir = dx < 0 ? 1 : -1;
        // a page is picked up from the side it lies on
        const ok = hit.side === "any" || (dir > 0 ? hit.side === "R" : hit.side === "L");
        grab = ok ? o.grab(dir, x0, y0) : null;
        phase = grab ? "drag" : "dead";
        if (grab) window.getSelection()?.removeAllRanges();
      } else if (touch && Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx) * 1.4) {
        phase = "swipe";
      }
    }
    if (phase === "drag" && grab) {
      e.preventDefault();
      grab.move(e.clientX, e.clientY);
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
      // px/ms over the last moments of the drag — but a pointer that had come to rest has no speed left
      const still = !b || performance.now() - b.t > 70;
      grab.release(!still && a && b.t > a.t ? (b.x - a.x) / (b.t - a.t) : 0, cancelled);
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
  /**
   * A press that never gets its release (the browser took the touch for a system gesture, the tab lost focus,
   * a long-press menu came up, the mouse went up outside the window) must not leave a page held half-turned.
   * Every way a hold can be lost lets go of it, as a cancelled drag: the sheet falls back.
   */
  const dropHold = () => {
    if (phase === "idle" || id < 0) return;
    finish({ pointerId: id } as PointerEvent, true);
  };
  /** Some phone browsers drop the pointer's release; the touch's own end is the backstop (every finger up). */
  const onTouchEnd = (e: TouchEvent) => {
    if (e.touches.length === 0) window.setTimeout(dropHold, 60);
  };
  const onLost = (e: Event) => {
    if (e.type === "visibilitychange" && !document.hidden) return;
    dropHold();
  };
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
  window.addEventListener("touchend", onTouchEnd, { passive: true });
  window.addEventListener("touchcancel", onLost, { passive: true });
  window.addEventListener("blur", onLost);
  window.addEventListener("contextmenu", onLost);
  document.addEventListener("visibilitychange", onLost);
  return () => {
    window.removeEventListener("touchend", onTouchEnd);
    window.removeEventListener("touchcancel", onLost);
    window.removeEventListener("blur", onLost);
    window.removeEventListener("contextmenu", onLost);
    document.removeEventListener("visibilitychange", onLost);
    window.removeEventListener("wheel", onWheel);
    window.removeEventListener("pointerdown", onDown);
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onCancel);
    window.removeEventListener("click", onClick, true);
    window.removeEventListener("keydown", onKey);
  };
}
