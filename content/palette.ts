import type { CSSProperties } from "react";

/**
 * The colour system.
 *
 * Every volume has the same six roles, and each role has one lightness and one saturation
 * across all four volumes — only the hue changes — so the set reads as a family on the shelf
 * and each book keeps its own identity inside. Values are OKLCH (lightness, chroma, hue)
 * converted to sRGB:
 *
 *   cloth     0.63  0.05    cover and boards
 *   tone      0.55  0.05    chapter-opener pages (white text on it passes 4.5:1)
 *   accent    0.44  0.075   ink on paper: italics, links, the pager dot, focus rings (about 7:1)
 *   tint      0.90  0.022   plates and quiet fields
 *   endpaper  0.84  0.03    the lining inside the boards
 *   ribbon    0.60  0.11    the bookmark
 *
 * Hues: Projects 162 (green), Experience 248 (blue), Contact 42 (clay). Volume I is the
 * neutral one — grey cloth (chroma 0.008) — and takes its accent from the oak of its spine (70).
 */
export type Palette = {
  cloth: string;
  tone: string;
  accent: string;
  tint: string;
  endpaper: string;
  ribbon: string;
  /** How the room's light leans while this volume is open (RGB multipliers). */
  glow: [number, number, number];
};

export const PALETTE = {
  about: { cloth: "#858a8e", tone: "#6e7276", accent: "#6d4b1f", tint: "#e4ddd5", endpaper: "#d2c9be", ribbon: "#aa732b", glow: [1, 0.97, 0.92] },
  projects: { cloth: "#6e9380", tone: "#577b69", accent: "#255f46", tint: "#d2e3da", endpaper: "#bad1c5", ribbon: "#34946c", glow: [0.86, 0.97, 0.9] },
  experience: { cloth: "#728ca6", tone: "#5a758e", accent: "#2e567a", tint: "#d3e0ec", endpaper: "#bccdde", ribbon: "#4585bf", glow: [0.88, 0.93, 1] },
  contact: { cloth: "#a48072", tone: "#8b685b", accent: "#754430", tint: "#ecdad3", endpaper: "#ddc5bc", ribbon: "#b76849", glow: [1, 0.92, 0.88] },
} satisfies Record<string, Palette>;

/** A palette as CSS custom properties, for the element that wraps a volume's cover and pages. */
export const paletteVars = (p: Palette) =>
  ({
    "--cloth": p.cloth,
    "--tone": p.tone,
    "--accent": p.accent,
    "--tint": p.tint,
    "--endpaper": p.endpaper,
    "--ribbon": p.ribbon,
  }) as CSSProperties;
