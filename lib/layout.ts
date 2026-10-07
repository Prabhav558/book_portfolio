import type { Mode } from "@/components/book/types";

/**
 * One place decides how the scene is laid out for a given viewport.
 * Everything is in CSS pixels and derives from the room that is actually left
 * after the shelf and the controls, so the book is always as large as it can be.
 */

export type Kind = "phone" | "phone-land" | "tablet" | "desktop";

export type BookBox = { mode: Mode; bw: number; bh: number };

export type Layout = {
  kind: Kind;
  w: number;
  h: number;
  /** Centre of the open book. */
  cx: number;
  cy: number;
  shelf: { dir: "row" | "col"; slotH: number; slotW: number; gap: number; top: number; left: number; labels: boolean };
  books: BookBox[];
  /** Smallest size the page "em" may shrink to — body text is 0.9em of this. */
  minEm: number;
  /** Strips in a bending page (fewer on weak devices). */
  strips: number;
  /** Changes only when the DOM structure has to change (modes / strips / shelf direction). */
  key: string;
};

/** Page proportions (width / height). Phones may use a taller page to fill the screen. */
const AR = 0.72;
const AR_TALL = 0.58;
const ZOOM = 1;

/**
 * Tablet portrait mixes layouts per volume: the first two read as single large
 * pages, the last two as two-page spreads.
 */
const TABLET_MODES: Mode[] = ["single", "single", "spread", "spread"];

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export function lowPower() {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = nav.hardwareConcurrency ?? 8;
  const mem = nav.deviceMemory ?? 8;
  const coarse = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
  return cores <= 4 || mem <= 4 || (coarse && cores <= 6);
}

export function computeLayout(w: number, h: number, count: number, low = lowPower()): Layout {
  const portrait = h >= w;
  const kind: Kind = !portrait && h < 520 ? "phone-land" : portrait && w < 600 ? "phone" : portrait && w < 1024 ? "tablet" : "desktop";

  const modes: Mode[] =
    kind === "phone" ? Array(count).fill("single") : kind === "tablet" ? TABLET_MODES.slice(0, count) : Array(count).fill("spread");

  // ── shelf + the rectangle left for the book ──
  let top: number;
  let bottom: number;
  let left: number;
  let right: number;
  const shelf: Layout["shelf"] = { dir: "row", slotH: 0, slotW: 0, gap: 0, top: 0, left: w / 2, labels: false };

  if (kind === "phone-land") {
    shelf.dir = "col";
    shelf.slotH = clamp((h - 28) / count - 12, 40, 76);
    shelf.gap = 12;
    shelf.left = 14 + (shelf.slotH * AR) / 2;
    shelf.top = h / 2;
    left = 28 + shelf.slotH * AR + 10;
    right = w - 58;
    top = 8;
    bottom = h - 8;
  } else if (kind === "phone") {
    shelf.slotH = clamp(h * 0.062, 40, 54);
    shelf.gap = clamp(w * 0.036, 10, 16);
    shelf.top = 12;
    top = shelf.top + shelf.slotH + 7 + 16;
    bottom = h - 64; // pager
    // room for the clasp, which reaches past the fore-edge
    left = 15;
    right = w - 15;
  } else {
    shelf.labels = h >= 640;
    shelf.slotH = clamp(h * 0.088, 48, 100);
    shelf.gap = clamp(shelf.slotH * 0.62, 26, 60);
    shelf.top = clamp(h * 0.018, 10, 20);
    top = shelf.top + shelf.slotH + 7 + (shelf.labels ? 34 : 12) + 6;
    bottom = h - 60; // a clear band for the pager, so nothing ever sits on the book
    const side = kind === "tablet" ? 20 : clamp(w * 0.05, 40, 120);
    left = side;
    right = w - side;
  }
  shelf.slotW = shelf.slotH * AR;

  const availW = Math.max(120, right - left);
  const availH = Math.max(160, bottom - top);

  const books: BookBox[] = modes.map((mode) => {
    if (mode === "spread") {
      // on a portrait tablet a spread is width-bound, so its pages may grow taller to use the height
      const bw = Math.min(availW / (2 * ZOOM), (availH / ZOOM) * AR, 1100 * AR);
      const bh = Math.min(availH / ZOOM, bw / (kind === "tablet" ? AR_TALL : AR));
      return { mode, bh, bw };
    }
    // a single page may grow taller than the classic proportion to use a phone's height
    const bw = Math.min(availW, availH * AR, 760);
    const bh = Math.min(availH, bw / (kind === "phone" ? AR_TALL : AR));
    return { mode, bw, bh };
  });

  const minEm = kind === "phone" ? 15.5 : kind === "phone-land" ? 13.5 : 14.5;
  const strips = low ? 6 : 9;

  return {
    kind,
    w,
    h,
    cx: left + availW / 2,
    cy: top + availH / 2,
    shelf,
    books,
    minEm,
    strips,
    key: `${kind}:${modes.join(",")}:${strips}`,
  };
}

/** Inner page box (the paper inside the boards) for a book. */
export function pageBox(b: BookBox) {
  const o = b.bh * 0.014;
  return { w: b.bw - o, h: b.bh - 2 * o };
}
