/**
 * Lets the scene tell the cursor what the pointer is over where no element says so itself —
 * the edge of a page that can be turned, for instance. Returns a short word, or null.
 *
 *   at    the book (set by the stage)
 *   world the people in the room behind it (lib/world/interaction.ts)
 *   held  a sign the cursor must keep while a button is down (a person being carried)
 */
export const cursorProbe: {
  at: ((x: number, y: number) => string | null) | null;
  world: ((x: number, y: number) => string | null) | null;
  held: string | null;
} = { at: null, world: null, held: null };
