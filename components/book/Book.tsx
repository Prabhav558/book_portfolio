import type { CSSProperties, ReactNode } from "react";
import type { BookDef, Mode } from "./types";

export const STRIPS = 7;

type Side = "L" | "R";

/** One printed side of a sheet: paper, gutter shading and the lighting overlays the flip animates. */
function Face({
  side,
  back,
  step,
  className = "",
  children,
}: {
  side: Side;
  back?: boolean;
  step: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`face ${back ? "face--back" : "face--front"} ${className}`} data-step={step}>
      <div className="paper" data-side={side}>
        <div className="page-content">{children}</div>
        <div className="cast" />
        <div className="shade" />
        <div className="leaf-gloss" />
      </div>
    </div>
  );
}

/**
 * The turning sheet. A chain of hinged strips: strip k+1 is a child of strip k, so rotating each
 * hinge a little bends the sheet like paper. Its pages are copied in just before a turn (lib/curl.ts).
 */
function Strip({ k }: { k: number }) {
  const side = (back: boolean) =>
    ({ "--i": back ? STRIPS - 1 - k : k }) as CSSProperties;
  return (
    <div className="strip">
      <div className="sface sface--front">
        <div className="spage" style={side(false)} />
        <i className="sshade sshade--a" />
        <i className="sshade sshade--b" />
      </div>
      <div className="sface sface--back">
        <div className="spage" style={side(true)} />
        <i className="sshade sshade--a" />
        <i className="sshade sshade--b" />
      </div>
      {k + 1 < STRIPS && <Strip k={k + 1} />}
    </div>
  );
}

type LeafSpec = { front: ReactNode; frontStep: number; back?: ReactNode; backStep?: number };

/**
 * A hardcover book built from CSS 3D planes.
 *
 *  spread mode — cover back = S0.left, leaf i = (S_i.right | S_{i+1}.left), base = S_last.right
 *  single mode — every page is a right-hand page; leaves turn away one at a time
 */
export function Book({ def, index, mode, clasp }: { def: BookDef; index: number; mode: Mode; clasp?: ReactNode }) {
  const spreadMode = mode === "spread";
  const { spreads } = def;

  let coverBack: ReactNode = null;
  let leaves: LeafSpec[];
  let base: { node: ReactNode; step: number };

  if (spreadMode) {
    coverBack = spreads[0][0];
    leaves = spreads.slice(0, -1).map((s, i) => ({
      front: s[1],
      frontStep: i,
      back: spreads[i + 1][0],
      backStep: i + 1,
    }));
    base = { node: spreads[spreads.length - 1][1], step: spreads.length - 1 };
  } else {
    const pages = spreads.flat();
    leaves = pages.slice(0, -1).map((p, i) => ({ front: p, frontStep: i }));
    base = { node: pages[pages.length - 1], step: pages.length - 1 };
  }

  const n = leaves.length;
  const zOf = (i: number) => 0.22 + (0.62 * (n - i)) / Math.max(n, 1);

  return (
    <div
      className="book-anchor"
      data-book={index}
      style={{ "--leather": def.leather, "--accent": def.accent, "--silk": def.silk } as CSSProperties}
    >
      <div className="book-shadow" />
      <div className="book-body">
        <div className="book">
          <div className="board-rear" />
          <div className="edge edge-spine" />
          <div className="edge edge-fore" />
          <div className="edge edge-bottom" />

          <div className="leaves">
            <div className="leaf leaf--base" style={{ "--z": 0.12 } as CSSProperties}>
              <div className="leaf-inner">
                <Face side="R" step={base.step}>
                  {base.node}
                </Face>
              </div>
            </div>
            {leaves.map((lf, i) => (
              <div key={i} className="leaf leaf--page" data-leaf={i} style={{ "--z": zOf(i) } as CSSProperties}>
                <div className="leaf-inner">
                  <Face side="R" step={lf.frontStep}>
                    {lf.front}
                  </Face>
                  {lf.back !== undefined && (
                    <Face side="L" back step={lf.backStep!}>
                      {lf.back}
                    </Face>
                  )}
                </div>
              </div>
            ))}
            <div className="leaf rig" aria-hidden>
              <div className="leaf-inner">
                <Strip k={0} />
              </div>
            </div>
          </div>

          <div className="ribbon" />

          <div className="leaf cover" style={{ "--z": 1 } as CSSProperties}>
            <div className="leaf-inner">
              <div className="face face--front cover-front">
                <div className="cover-sheen" />
                <div className="cover-content">{def.cover}</div>
              </div>
              {spreadMode && (
                <div className="face face--back cover-back" data-step={0}>
                  <div className="paper" data-side="L">
                    <div className="page-content">{coverBack}</div>
                    <div className="cast" />
                    <div className="shade" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        {clasp}
      </div>
    </div>
  );
}
