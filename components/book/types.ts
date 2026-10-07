import type { ReactNode } from "react";

export type Mode = "spread" | "single";

/**
 * Content is written as a flow of blocks, not fixed pages. The paginator packs
 * them into as many pages as the current page size needs.
 */
export type Block = {
  id: string;
  node: ReactNode;
  /** Takes a whole page to itself and lays itself out within it. */
  full?: boolean;
  /** Always starts a new page. */
  breakBefore?: boolean;
  /** Never left as the last thing on a page (headings). */
  keep?: boolean;
  /** Shown in the page's running header from this block on. */
  section?: string;
};

export type PageSpec = { blocks: Block[]; section: string; full: boolean };

export type BookDef = {
  id: string;
  /** Short label used on the shelf and progress rail. */
  label: string;
  /** Running header on every page, e.g. "Volume II". */
  volume: string;
  leather: string;
  /** Ink colour for this volume's kickers, rules and links. */
  accent: string;
  /** Silk bookmark ribbon. */
  silk: string;
  /** Lamp tint (0–1 rgb) while this volume is on the table. */
  glow: [number, number, number];
  cover: ReactNode;
  blocks: Block[];
  /** A quiet page used to keep a two-page book's page count even. */
  filler: ReactNode;
};
