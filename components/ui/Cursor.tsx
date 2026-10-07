"use client";

import { useEffect, useRef } from "react";
import { cursorProbe } from "@/lib/cursor";

/**
 * The cursor: a small dot that says what a click will do. Over anything marked `data-cursor`
 * (or the turnable edge of a page) a word comes out beside it; over other links it opens into
 * a ring. Only with a mouse or trackpad — touch screens never see it — and text fields keep the
 * ordinary caret.
 *
 * The dot is moved in the pointer event itself, not on the next frame, so it never trails.
 */
export function Cursor() {
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const node = el.current!;
    const label = node.querySelector<HTMLElement>(".cursor-label")!;
    const html = document.documentElement;
    html.classList.add("has-cursor");

    let on = false;
    let mode = "";
    let text = "";
    const show = (v: boolean) => {
      if (v === on) return;
      on = v;
      node.dataset.on = v ? "1" : "0";
    };
    const set = (m: string, t = "") => {
      if (m !== mode) {
        mode = m;
        node.dataset.mode = m;
      }
      if (t !== text) {
        text = t;
        if (t) label.textContent = t;
      }
    };

    const read = (target: EventTarget | null, x: number, y: number) => {
      const t = target as Element | null;
      if (!t?.closest) return set("");
      if (t.closest("input, textarea, select, [contenteditable]")) return set("text");
      const tagged = t.closest<HTMLElement>("[data-cursor]");
      if (tagged?.dataset.cursor) return set("label", tagged.dataset.cursor);
      const link = t.closest<HTMLElement>("a, button");
      if (link && !(link as HTMLButtonElement).disabled) {
        if (link.matches('a[target="_blank"]')) return set("label", "Visit");
        if (link.matches("a[download]")) return set("label", "Save");
        if (link.matches('a[href^="mailto:"]')) return set("label", "Write");
        return set("ring");
      }
      const hint = cursorProbe.at?.(x, y);
      return hint ? set("label", hint) : set("");
    };

    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return show(false);
      node.style.transform = `translate3d(${e.clientX}px,${e.clientY}px,0)`;
      // near the right or bottom edge the word comes out on the other side, so it is never cut off
      const fx = e.clientX > window.innerWidth - 120 ? "1" : "0";
      const fy = e.clientY > window.innerHeight - 48 ? "1" : "0";
      if (node.dataset.fx !== fx) node.dataset.fx = fx;
      if (node.dataset.fy !== fy) node.dataset.fy = fy;
      show(true);
      // while a button is held (a page being dragged) it keeps saying what it said
      if (!e.buttons) read(e.target, e.clientX, e.clientY);
    };
    const down = () => (node.dataset.down = "1");
    const up = (e: PointerEvent) => {
      node.dataset.down = "0";
      if (e.pointerType === "mouse") read(e.target, e.clientX, e.clientY);
    };
    const leave = () => show(false);

    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", down, { passive: true });
    window.addEventListener("pointerup", up, { passive: true });
    html.addEventListener("mouseleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      html.removeEventListener("mouseleave", leave);
      html.classList.remove("has-cursor");
    };
  }, []);

  return (
    <div ref={el} className="cursor" aria-hidden>
      <i className="cursor-dot" />
      <span className="cursor-label" />
    </div>
  );
}
