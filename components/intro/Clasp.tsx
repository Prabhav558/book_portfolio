import { forwardRef } from "react";

/** Brushed-steel clasp on a cloth strap that latches the first volume shut. */
export const Clasp = forwardRef<HTMLButtonElement, { onOpen: () => void }>(function Clasp({ onOpen }, ref) {
  return (
    <div className="clasp-pos">
      <button ref={ref} type="button" className="clasp" aria-label="Open the book" data-cursor="open" onClick={onOpen}>
        <span className="clasp-face">
          <span className="clasp-glow" />
          <span className="clasp-strap" />
          <span className="clasp-plate" />
          <span className="clasp-barrel" />
        </span>
      </button>
    </div>
  );
});
