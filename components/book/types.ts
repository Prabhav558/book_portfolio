import type { ReactNode } from "react";

export type Mode = "spread" | "single";

/**
 * A book is authored as a sequence of composed pages. On wide screens they are read
 * two at a time (left, right); on a phone, one at a time.
 *
 * A block with `full` is one page that lays itself out. Blocks without it flow together
 * and are packed into pages by measurement (kept for long, list-like content).
 */
export type Block = {
  id: string;
  node: ReactNode;
  /** Takes a whole page to itself and lays itself out within it. */
  full?: boolean;
  /** Chapter opener: the page is printed in the volume's cloth colour. */
  tone?: boolean;
  /** Artwork runs to the edges of the page. */
  bleed?: boolean;
  /** In a two-page book this page must be a left-hand page (it starts a spread). */
  left?: boolean;
  /** Always starts a new page (flowing blocks). */
  breakBefore?: boolean;
  /** Never left as the last thing on a page (flowing headings). */
  keep?: boolean;
};

export type PageSpec = { blocks: Block[]; full: boolean; tone: boolean; bleed: boolean };

export type BookDef = {
  id: string;
  /** Name on the shelf, e.g. "Projects". */
  label: string;
  /** Short volume mark, e.g. "Vol. II". */
  volume: string;
  /** Cloth colour of the cover — also the colour of chapter-opener pages. */
  leather: string;
  /** Ink accent for this volume (italics, link hovers). */
  accent: string;
  /** Silk bookmark ribbon. */
  silk: string;
  /** Light tint (0–1 rgb) while this volume is on the table. */
  glow: [number, number, number];
  cover: ReactNode;
  blocks: Block[];
  /** A quiet page used to keep a two-page book's page count even. */
  filler: ReactNode;
};
