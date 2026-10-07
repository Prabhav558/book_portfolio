"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cursorProbe } from "@/lib/cursor";

/**
 * The cursor: a small dot that shows what a click will do, with its own sign and its own
 * small movement for each kind of thing it is over.
 *
 *   badge  a little disc beside the dot (the target stays in view): open, visit, write, save…
 *   lens   the cursor becomes a disc centred on the pointer: looking at a picture
 *   ring   an open ring with an arrow: a page that can be turned
 *
 * Anything can ask for a sign with `data-cursor="<kind>"`; links that open elsewhere, download
 * or write mail are recognised by themselves, and the scene answers for the edges of a page
 * (lib/cursor.ts). Mouse and trackpad only; text fields keep the ordinary caret. The dot is
 * moved in the pointer event itself, not on the next frame, so it never trails.
 */

type Shape = "badge" | "lens" | "ring";
const KINDS: Record<string, { icon: string; shape: Shape }> = {
  open: { icon: "book", shape: "badge" },
  view: { icon: "camera", shape: "lens" },
  turn: { icon: "right", shape: "ring" },
  back: { icon: "left", shape: "ring" },
  next: { icon: "right", shape: "badge" },
  prev: { icon: "left", shape: "badge" },
  go: { icon: "right", shape: "badge" },
  visit: { icon: "out", shape: "badge" },
  write: { icon: "mail", shape: "badge" },
  save: { icon: "down", shape: "badge" },
  send: { icon: "plane", shape: "badge" },
  copy: { icon: "copy", shape: "badge" },
  index: { icon: "list", shape: "badge" },
  close: { icon: "cross", shape: "badge" },
  skip: { icon: "skip", shape: "badge" },
  "sound-on": { icon: "sound", shape: "badge" },
  "sound-off": { icon: "mute", shape: "badge" },
  // the people in the room behind the book
  grab: { icon: "hand", shape: "badge" },
  grabbing: { icon: "fist", shape: "badge" },
};

const ICONS: Record<string, ReactNode> = {
  book: <path d="M8 4.3C6.6 3.3 4.6 3.1 2.5 3.5v8.3c2.1-.4 4.1-.2 5.5.8 1.4-1 3.4-1.2 5.5-.8V3.5C11.4 3.1 9.4 3.3 8 4.3zm0 0v8.3" />,
  camera: (
    <>
      <path d="M2.5 5.6h2.3l1-1.6h4.4l1 1.6h2.3v6.9h-11z" />
      <circle cx="8" cy="8.9" r="2.1" />
    </>
  ),
  right: <path d="M3 8h10M9 4l4 4-4 4" />,
  left: <path d="M13 8H3M7 4L3 8l4 4" />,
  out: <path d="M5 11l6-6M6 5h5v5" />,
  mail: <path d="M2.5 4.5h11v7h-11zM2.8 4.9L8 8.8l5.2-3.9" />,
  down: <path d="M8 2.5V10M5 7.2l3 3 3-3M3 13h10" />,
  plane: <path d="M13.5 2.5L2.5 7l4 1.6 1.5 4zM6.5 8.6l7-6.1" />,
  copy: <path d="M5.5 5.5h7v7h-7zM3.5 10.5v-7h7" />,
  list: <path d="M3 4.5h10M3 8h10M3 11.5h6" />,
  cross: <path d="M4 4l8 8M12 4l-8 8" />,
  skip: <path d="M3.5 4l4 4-4 4M8.5 4l4 4-4 4" />,
  sound: <path d="M2.8 6.4h2.2L8 4v8L5 9.6H2.8zM10.4 6.1c.9.8.9 3 0 3.8M12.2 4.6c1.7 1.7 1.7 5.1 0 6.8" />,
  mute: <path d="M2.8 6.4h2.2L8 4v8L5 9.6H2.8zM10.6 6.4l3 3.2M13.6 6.4l-3 3.2" />,
  hand: <path d="M5.2 8.2V4.4a.9.9 0 0 1 1.8 0v3M7 7V3.4a.9.9 0 0 1 1.8 0V7m0-3a.9.9 0 0 1 1.8 0v3.2m0-2a.9.9 0 0 1 1.8 0v3.4c0 2.2-1.4 4-3.6 4H8c-1.4 0-2.3-.6-3.1-1.7L3.2 9.4a.9.9 0 0 1 1.4-1.1z" />,
  fist: <path d="M4 7.6c0-.7.5-1.2 1.2-1.2h5.6c.7 0 1.2.5 1.2 1.2v2.2c0 1.8-1.4 3.1-3.2 3.1H7.2C5.4 12.9 4 11.6 4 9.8zM6.4 6.4V5M8 6.4V4.6M9.6 6.4V5" />,
};

export function Cursor() {
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const node = el.current!;
    const html = document.documentElement;
    html.classList.add("has-cursor");

    let on = false;
    let mode = "";
    let kind = "";
    const show = (v: boolean) => {
      if (v === on) return;
      on = v;
      node.dataset.on = v ? "1" : "0";
    };
    /** mode: "" plain dot · "ring" a link with nothing more to say · "icon" a sign · "text" a text field */
    const set = (m: string, k = "") => {
      if (m !== mode) {
        mode = m;
        node.dataset.mode = m;
      }
      if (k && k !== kind) {
        kind = k;
        node.dataset.kind = k;
        node.dataset.icon = KINDS[k].icon;
        node.dataset.shape = KINDS[k].shape;
      }
    };

    const read = (target: EventTarget | null, x: number, y: number) => {
      const t = target as Element | null;
      if (!t?.closest) return set("");
      if (t.closest("input, textarea, select, [contenteditable]")) return set("text");
      const tagged = t.closest<HTMLElement>("[data-cursor]")?.dataset.cursor;
      if (tagged && KINDS[tagged]) return set("icon", tagged);
      const link = t.closest<HTMLElement>("a, button");
      if (link && !(link as HTMLButtonElement).disabled) {
        if (link.matches('a[target="_blank"]')) return set("icon", "visit");
        if (link.matches("a[download]")) return set("icon", "save");
        if (link.matches('a[href^="mailto:"]')) return set("icon", "write");
        return set("ring");
      }
      const hint = cursorProbe.at?.(x, y) ?? cursorProbe.world?.(x, y);
      return hint && KINDS[hint] ? set("icon", hint) : set("");
    };

    // The scene changes under a pointer that is not moving (a button is clicked away, a page
    // turns from the keyboard), so after anything that can change it, look again where the pointer rests.
    let px = -1;
    let py = -1;
    const timers: number[] = [];
    const again = () => {
      timers.splice(0).forEach((t) => window.clearTimeout(t));
      for (const ms of [380, 1300, 2600]) {
        timers.push(window.setTimeout(() => on && px >= 0 && read(document.elementFromPoint(px, py), px, py), ms));
      }
    };

    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return show(false);
      px = e.clientX;
      py = e.clientY;
      node.style.transform = `translate3d(${e.clientX}px,${e.clientY}px,0)`;
      // near the right or bottom edge the badge comes out on the other side, so it is never cut off
      const fx = e.clientX > window.innerWidth - 56 ? "1" : "0";
      const fy = e.clientY > window.innerHeight - 56 ? "1" : "0";
      if (node.dataset.fx !== fx) node.dataset.fx = fx;
      if (node.dataset.fy !== fy) node.dataset.fy = fy;
      show(true);
      // while a button is held (a page being dragged) it keeps showing what it showed;
      // somebody being carried is the one thing that changes it
      if (!e.buttons) read(e.target, e.clientX, e.clientY);
      else if (cursorProbe.held && KINDS[cursorProbe.held]) set("icon", cursorProbe.held);
    };
    const down = () => {
      node.dataset.down = "1";
      // the world's press handler runs on the same event; look again once it has said what it took hold of
      queueMicrotask(() => cursorProbe.held && KINDS[cursorProbe.held] && set("icon", cursorProbe.held));
    };
    const up = (e: PointerEvent) => {
      node.dataset.down = "0";
      if (e.pointerType === "mouse") read(e.target, e.clientX, e.clientY);
      again();
    };
    const leave = () => show(false);

    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", down, { passive: true });
    window.addEventListener("pointerup", up, { passive: true });
    window.addEventListener("keydown", again);
    window.addEventListener("wheel", again, { passive: true });
    html.addEventListener("mouseleave", leave);
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      window.removeEventListener("keydown", again);
      window.removeEventListener("wheel", again);
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
      <span className="cursor-badge">
        {Object.entries(ICONS).map(([name, shape]) => (
          <svg key={name} data-i={name} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            {shape}
          </svg>
        ))}
      </span>
    </div>
  );
}
