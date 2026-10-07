/**
 * Lets the scene tell the cursor what the pointer is over where no element says so itself —
 * the edge of a page that can be turned, for instance. Returns a short word, or null.
 */
export const cursorProbe: { at: ((x: number, y: number) => string | null) | null } = { at: null };
