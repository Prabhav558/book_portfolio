import { forwardRef, type CSSProperties, type MouseEvent } from "react";
import type { BookDef } from "@/components/book/types";

/** Minimal wooden shelf at the top of the stage. Books fly into the [data-slot] boxes. */
/** Pointer clicks shouldn't leave a focus ring behind; keyboard activation keeps it. */
const pick = (e: MouseEvent<HTMLButtonElement>, onPick: (i: number) => void, i: number) => {
  if (e.detail > 0) e.currentTarget.blur();
  onPick(i);
};

export const Shelf = forwardRef<
  HTMLDivElement,
  { books: BookDef[]; onPick: (i: number) => void; dir: "row" | "col"; labels: boolean }
>(function Shelf(
  { books, onPick, dir, labels },
  ref,
) {
  return (
    <div ref={ref} className="shelf" aria-label="Bookshelf" data-dir={dir} data-labels={labels ? "" : undefined}>
      <div className="shelf-slots">
        {books.map((b, i) => (
          <button
            key={b.id}
            type="button"
            data-slot={i}
            className="shelf-slot"
            style={{ "--c": b.palette.accent } as CSSProperties}
            aria-label={`Open ${b.label}`}
            onClick={(e) => pick(e, onPick, i)}
          />
        ))}
      </div>
      <div className="plank" />
      <div className="shelf-labels">
        {books.map((b, i) => (
          <button
            key={b.id}
            type="button"
            data-shelf-label={i}
            className="shelf-label"
            style={{ "--c": b.palette.accent } as CSSProperties} onClick={(e) => pick(e, onPick, i)}>
            {b.label}
          </button>
        ))}
      </div>
    </div>
  );
});
