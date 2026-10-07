import type { ReactNode } from "react";

export type Mode = "spread" | "single";

export type BookDef = {
  id: string;
  /** Short label used on the shelf and progress rail. */
  label: string;
  leather: string;
  /** Ink colour for this volume's kickers, rules and links. */
  accent: string;
  /** Silk bookmark ribbon. */
  silk: string;
  /** Lamp tint (0–1 rgb) while this volume is on the table. */
  glow: [number, number, number];
  cover: ReactNode;
  /** Two-page spreads, [left, right]. On mobile they are read as a flat page list. */
  spreads: [ReactNode, ReactNode][];
};
