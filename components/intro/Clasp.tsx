import { forwardRef } from "react";

/** Brass clasp + leather strap that latches the first volume shut. */
export const Clasp = forwardRef<HTMLButtonElement, { onOpen: () => void }>(function Clasp({ onOpen }, ref) {
  return (
    <div className="clasp-pos">
      <button ref={ref} type="button" className="clasp" aria-label="Unlock the book" onClick={onOpen}>
        <span className="clasp-face">
          <span className="clasp-glow" />
          <span className="clasp-strap" />
          <span className="clasp-plate">
            <span className="clasp-rivet" style={{ top: "16%", left: "18%" }} />
            <span className="clasp-rivet" style={{ bottom: "16%", left: "18%" }} />
            <span className="clasp-keyhole" />
          </span>
          <span className="clasp-barrel" />
        </span>
      </button>
    </div>
  );
});

