/**
 * The living background: shared types.
 * Coordinates are CSS pixels in the viewport; the canvas covers it.
 */

export type Vec = { x: number; y: number };
export type Rect = { x: number; y: number; w: number; h: number };

export type NPCState = "WALKING" | "IDLE" | "PAUSED" | "DRAGGED" | "PUSHED" | "SITTING" | "LOOKING" | "AVOIDING";
export type Role = "walker" | "reader" | "worker" | "coffee" | "librarian" | "explorer";
export type Period = "DAWN" | "MORNING" | "DAY" | "EVENING" | "NIGHT";
export type SceneName = "library" | "studio";
export type BookEvent = "open" | "shelf" | "close" | "flip";

export type ZoneKind = "desk" | "shelf" | "rug" | "table" | "plant" | "lamp";
export type Zone = {
  id: number;
  kind: ZoneKind;
  /** Where somebody stands to use it. */
  x: number;
  y: number;
  /** Which way they face there. */
  face: 1 | -1;
  /** Where somebody sits (desks and armchairs). */
  seat?: Vec;
  /** Id of whoever is using it, or -1. */
  taken: number;
};

/** A rectangle people walk around. */
export type KeepOut = { rect: Rect; pad: number };

export type Pointer = { x: number; y: number; vx: number; vy: number; on: boolean };
