import type { CSSProperties, ReactNode } from "react";
import type { BookBox } from "@/lib/layout";
import { paletteVars } from "@/content/palette";
import type { BookDef, PageSpec } from "./types";
import { PageShell, type Paged } from "./Paginator";

type Side = "L" | "R";

/** One printed side of a sheet: paper, gutter shading and the lighting overlays the flip animates. */
function Face({ side, back, step, children }: { side: Side; back?: boolean; step: number; children: ReactNode }) {
  return (
    <div className={`face ${back ? "face--back" : "face--front"}`} data-step={step}>
      <div className="paper" data-side={side}>
        <div className="page-content">{children}</div>
        <div className="cast" />
        <div className="shade" />
      </div>
    </div>
  );
}

/**
 * The turning sheet. A chain of hinged strips: strip k+1 is a child of strip k, so rotating each
 * hinge a little bends the sheet like paper. Its pages are copied in ahead of time (lib/curl.ts).
 */
function Strip({ k, n }: { k: number; n: number }) {
  return (
    <div className="strip">
      <div className="sface sface--front">
        <div className="spage" style={{ "--i": k } as CSSProperties} />
        <i className="sshade sshade--a" />
        <i className="sshade sshade--b" />
      </div>
      <div className="sface sface--back">
        <div className="spage" style={{ "--i": n - 1 - k } as CSSProperties} />
        <i className="sshade sshade--a" />
        <i className="sshade sshade--b" />
      </div>
      {k + 1 < n && <Strip k={k + 1} n={n} />}
    </div>
  );
}

/**
 * A hardcover book built from CSS 3D planes.
 *
 *  spread — cover back = page 0, leaf i = (page 2i+1 | page 2i+2), base = last page
 *  single — every page is a right-hand page; leaves turn away one at a time
 */
export function Book({
  def,
  index,
  box,
  paged,
  strips,
  clasp,
}: {
  def: BookDef;
  index: number;
  box: BookBox;
  paged: Paged;
  strips: number;
  clasp?: ReactNode;
}) {
  const spread = box.mode === "spread";
  const { pages, zoom } = paged;

  const running = `${def.volume} — ${def.label}`;
  const render = (p: PageSpec, i: number) => (
    <PageShell running={running} folio={i + 1} full={p.full} tone={p.tone} bleed={p.bleed}>
      {p.blocks.map((b) => (
        <div key={b.id} data-b={b.id} style={zoom[b.id] ? ({ zoom: zoom[b.id] } as CSSProperties) : undefined}>
          {b.node}
        </div>
      ))}
    </PageShell>
  );

  type Leaf = { front: number; back?: number; step: number };
  const leaves: Leaf[] = [];
  let basePage: number;
  let baseStep: number;
  if (spread) {
    const n = pages.length / 2 - 1;
    for (let i = 0; i < n; i++) leaves.push({ front: 2 * i + 1, back: 2 * i + 2, step: i });
    basePage = pages.length - 1;
    baseStep = n;
  } else {
    for (let i = 0; i < pages.length - 1; i++) leaves.push({ front: i, step: i });
    basePage = pages.length - 1;
    baseStep = pages.length - 1;
  }

  const n = leaves.length;
  // heights inside the block, as a fraction of its thickness (see the hinge note on .leaf)
  const zOf = (i: number) => 0.12 + (0.38 * (n - i)) / Math.max(n, 1);

  return (
    <div
      className="book-anchor"
      data-book={index}
      data-mode={box.mode}
      style={
        {
          "--bh": `${box.bh.toFixed(2)}px`,
          "--bw": `${box.bw.toFixed(2)}px`,
          "--n": strips,
          ...paletteVars(def.palette),
        } as CSSProperties
      }
    >
      <div className="book-shadow" />
      <div className="book-body">
        <div className="book">
          <div className="board-rear" />
          <div className="edge edge-spine" />
          <div className="edge edge-fore" />
          <div className="edge edge-top" />
          <div className="edge edge-bottom" />
          {spread && <div className="hinge" />}

          <div className="leaves">
            <div className="stack stack--r" />
            <div className="leaf leaf--base" style={{ "--z": 0.06 } as CSSProperties}>
              <div className="leaf-inner">
                <Face side="R" step={baseStep}>
                  {render(pages[basePage], basePage)}
                </Face>
              </div>
            </div>
            {leaves.map((lf, i) => (
              <div key={`l${i}`} className="leaf leaf--page" data-leaf={i} style={{ "--z": zOf(i) } as CSSProperties}>
                <div className="leaf-inner">
                  <Face side="R" step={lf.step}>
                    {render(pages[lf.front], lf.front)}
                  </Face>
                  {lf.back !== undefined && (
                    <Face side="L" back step={lf.step + 1}>
                      {render(pages[lf.back], lf.back)}
                    </Face>
                  )}
                </div>
              </div>
            ))}
            {leaves.map((_, i) => (
              <div key={`r${i}`} className="leaf rig" data-rig={i} aria-hidden style={{ "--z": zOf(i) } as CSSProperties}>
                <div className="leaf-inner">
                  <Strip k={0} n={strips} />
                </div>
              </div>
            ))}
          </div>

          <div className="ribbon" />

          <div className="leaf cover" style={{ "--z": 1 } as CSSProperties}>
            <div className="leaf-inner">
              <div className="face face--front cover-front">
                <div className="cover-sheen" />
                <div className="cover-content">{def.cover}</div>
              </div>
              {spread && (
                <div className="face face--back cover-back" data-step={0}>
                  <div className="stack stack--l" />
                  <div className="paper" data-side="L">
                    <div className="page-content">{render(pages[0], 0)}</div>
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
