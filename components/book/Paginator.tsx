"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { pageBox, type Layout } from "@/lib/layout";
import type { Block, BookDef, PageSpec } from "./types";

export type Paged = { pages: PageSpec[]; zoom: Record<string, number> };

/** The frame every page shares: running header, the block flow, and the folio. */
export function PageShell({
  volume,
  section,
  folio,
  full,
  children,
}: {
  volume: string;
  section: string;
  folio?: number;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="pc">
      <div className="pg-runner">
        <span>{volume}</span>
        <span>{section}</span>
      </div>
      <div className={`pg-flow ${full ? "pg-flow--full" : ""}`}>{children}</div>
      {folio !== undefined && <div className="pg-folio">{folio}</div>}
    </div>
  );
}

/** Greedy packing with "keep with next" for headings and forced breaks. */
export function paginate(def: BookDef, heights: Record<string, number>, H: number, gap: number, even: boolean): PageSpec[] {
  const pages: PageSpec[] = [];
  let cur: Block[] = [];
  let used = 0;
  let section = "";

  const flush = () => {
    if (!cur.length) return;
    pages.push({ blocks: cur, section: cur.find((b) => b.section)?.section ?? section, full: false });
    section = [...cur].reverse().find((b) => b.section)?.section ?? section;
    cur = [];
    used = 0;
  };

  for (const b of def.blocks) {
    if (b.full) {
      flush();
      if (b.section) section = b.section;
      pages.push({ blocks: [b], section: b.section ?? section, full: true });
      continue;
    }
    const bh = heights[b.id] ?? 0;
    if (b.breakBefore) flush();
    if (cur.length && used + gap + bh > H + 0.5) {
      // a heading must not be stranded at the foot of a page
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

  // a two-page book needs an even page count: slip a quiet page in before the closing one
  if (even && pages.length % 2 === 1) {
    const filler: PageSpec = { blocks: [{ id: `${def.id}-filler`, node: def.filler, full: true }], section: "", full: true };
    pages.splice(Math.max(1, pages.length - 1), 0, filler);
  }
  return pages;
}

/**
 * Renders every block once, invisibly, at the exact size a page will have, then
 * reports how the blocks pack into pages. Re-runs whenever the layout changes.
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
          if (need > f.clientHeight + 1) zoom[shell.dataset.full!] = f.clientHeight / need;
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
          <div key={def.id} data-measure={k} style={{ "--accent": def.accent } as CSSProperties}>
            <div className="paper m-normal" data-side="R" style={shell}>
              <div className="page-content">
                <PageShell volume={def.volume} section="" folio={0}>
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
            {def.blocks
              .filter((b) => b.full)
              .map((b) => (
                <div key={b.id} className="paper m-full" data-full={b.id} data-side="R" style={shell}>
                  <div className="page-content">
                    <PageShell volume={def.volume} section="" folio={0} full>
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
