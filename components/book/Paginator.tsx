"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { pageBox, type Layout } from "@/lib/layout";
import type { Block, BookDef, PageSpec } from "./types";

export type Paged = { pages: PageSpec[]; zoom: Record<string, number> };

/** The frame every page shares: the content area and one quiet line at the foot. */
export function PageShell({
  running,
  folio,
  full,
  tone,
  bleed,
  children,
}: {
  running: string;
  folio?: number;
  full?: boolean;
  tone?: boolean;
  bleed?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`pc ${tone ? "pc--tone" : ""} ${bleed ? "pc--bleed" : ""}`}>
      <div className={`pg-flow ${full ? "pg-flow--full" : ""}`}>{children}</div>
      <div className="pg-foot">
        <span>{folio !== undefined ? String(folio).padStart(2, "0") : ""}</span>
        <span>{running}</span>
      </div>
    </div>
  );
}

const spec = (blocks: Block[]): PageSpec => ({
  blocks,
  full: !!blocks[0]?.full,
  tone: !!blocks[0]?.tone,
  bleed: !!blocks[0]?.bleed,
});

/**
 * Turns a book's blocks into pages. Composed (`full`) blocks are one page each;
 * flowing blocks are packed greedily, with "keep with next" for headings.
 * In a two-page book, spreads stay aligned and the page count stays even.
 */
export function paginate(def: BookDef, heights: Record<string, number>, H: number, gap: number, even: boolean): PageSpec[] {
  const pages: PageSpec[] = [];
  let cur: Block[] = [];
  let used = 0;
  let fillers = 0;

  const filler = (): PageSpec => spec([{ id: `${def.id}-filler-${fillers++}`, node: def.filler, full: true }]);
  const flush = () => {
    if (!cur.length) return;
    pages.push(spec(cur));
    cur = [];
    used = 0;
  };

  for (const b of def.blocks) {
    if (b.full) {
      flush();
      // a spread must open on a left-hand page (page 0 is a left-hand page)
      if (even && b.left && pages.length % 2 === 1) pages.push(filler());
      pages.push(spec([b]));
      continue;
    }
    const bh = heights[b.id] ?? 0;
    if (b.breakBefore) flush();
    if (cur.length && used + gap + bh > H + 0.5) {
      const carry: Block[] = [];
      while (cur.length > 1 && cur[cur.length - 1].keep) carry.unshift(cur.pop()!);
      flush();
      cur = carry;
      used = carry.reduce((s, c, i) => s + (heights[c.id] ?? 0) + (i ? gap : 0), 0);
    }
    used += (cur.length ? gap : 0) + bh;
    cur.push(b);
  }
  flush();

  // even page count: slip a quiet page in before the closing one
  if (even && pages.length % 2 === 1) pages.splice(Math.max(1, pages.length - 1), 0, filler());
  return pages;
}

/**
 * Renders every block once, invisibly, at the exact size a page will have, then reports
 * how the book paginates and which pages need to be scaled down a touch to fit.
 * Re-runs whenever the layout changes.
 */
export function Measure({ defs, layout, onDone }: { defs: BookDef[]; layout: Layout; onDone: (paged: Paged[], layout: Layout) => void }) {
  const root = useRef<HTMLDivElement>(null);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    let cancelled = false;
    const run = () => {
      if (cancelled || !root.current) return;
      const out: Paged[] = defs.map((def, k) => {
        const host = root.current!.querySelector<HTMLElement>(`[data-measure="${k}"]`)!;
        const flow = host.querySelector<HTMLElement>(":scope > .m-normal .pg-flow")!;
        const H = flow.clientHeight;
        const gap = parseFloat(getComputedStyle(flow).rowGap) || 0;
        const heights: Record<string, number> = {};
        const zoom: Record<string, number> = {};
        flow.querySelectorAll<HTMLElement>(":scope > [data-b]").forEach((el) => {
          const h = el.getBoundingClientRect().height;
          heights[el.dataset.b!] = h;
          if (h > H) {
            zoom[el.dataset.b!] = H / h;
            heights[el.dataset.b!] = H;
          }
        });
        host.querySelectorAll<HTMLElement>(":scope > .m-full").forEach((shell) => {
          const f = shell.querySelector<HTMLElement>(".pg-flow")!;
          const need = (f.firstElementChild as HTMLElement | null)?.scrollHeight ?? 0;
          if (need > f.clientHeight + 1) zoom[shell.dataset.full!] = Math.max(0.6, f.clientHeight / need);
        });
        return { pages: paginate(def, heights, H, gap, layout.books[k].mode === "spread"), zoom };
      });
      done.current(out, layout);
    };
    const fonts = document.fonts?.ready ?? Promise.resolve();
    void fonts.then(() => requestAnimationFrame(run));
    return () => {
      cancelled = true;
    };
  }, [defs, layout]);

  return (
    <div ref={root} className="measure" aria-hidden style={{ "--min-em": `${layout.minEm}px` } as CSSProperties}>
      {defs.map((def, k) => {
        const p = pageBox(layout.books[k]);
        const shell: CSSProperties = { position: "absolute", left: 0, top: 0, width: p.w, height: p.h };
        return (
          <div key={def.id} data-measure={k} style={{ "--accent": def.accent, "--leather": def.leather } as CSSProperties}>
            <div className="paper m-normal" data-side="R" style={shell}>
              <div className="page-content">
                <PageShell running="" folio={0}>
                  {def.blocks
                    .filter((b) => !b.full)
                    .map((b) => (
                      <div key={b.id} data-b={b.id}>
                        {b.node}
                      </div>
                    ))}
                </PageShell>
              </div>
            </div>
            {[...def.blocks, { id: `${def.id}-filler-0`, node: def.filler, full: true } as Block]
              .filter((b) => b.full && !b.bleed)
              .map((b) => (
                <div key={b.id} className="paper m-full" data-full={b.id} data-side="R" style={shell}>
                  <div className="page-content">
                    <PageShell running="" folio={0} full tone={b.tone}>
                      <div>{b.node}</div>
                    </PageShell>
                  </div>
                </div>
              ))}
          </div>
        );
      })}
    </div>
  );
}
