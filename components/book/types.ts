import type { ReactNode } from "react";
import type { Palette } from "@/content/palette";

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
  /** What this page is called in the index; pages without a name are not listed. */
  name?: string;
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
  /** This volume's colours (content/palette.ts). */
  palette: Palette;
  cover: ReactNode;
  blocks: Block[];
  /** A quiet page used to keep a two-page book's page count even. */
  filler: ReactNode;
};
