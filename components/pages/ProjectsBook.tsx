"use client";

import type { CSSProperties } from "react";
import { extraHighlights, featuredProjects, moreProjects, type Project } from "@/content/portfolio";
import type { Block, BookDef } from "@/components/book/types";
import { PALETTE } from "@/content/palette";
import { CoverTitle, NextPage, Opener, QuotePage, TextLink, useNav } from "./primitives";

const all = [...featuredProjects, ...moreProjects];
const pad = (n: number) => String(n).padStart(2, "0");
const years = all.map((p) => Number(p.year)).filter(Boolean);
const span = years.length ? `${Math.min(...years)}–${Math.max(...years)}` : "";

/**
 * Left-hand page of a featured project: its two pictures, stepped down the page. Until
 * `images` is set, tinted frames in the volume's colours stand in for them.
 */
function Figures({ p, index }: { p: Project; index: number }) {
  const shots = p.images ?? [];
  return (
    <div className="flex h-full flex-col">
      <div className="t-meta flex justify-between">
        <span>Fig. {pad(index + 1)}</span>
        <span>{p.title}</span>
      </div>
      <div className="figs">
        {[0, 1].map((k) => (
          <figure key={k} className={`fig fig--${k ? "b" : "a"}`} data-cursor="view">
            <div className="fig-frame" style={{ "--plate": k ? "var(--endpaper)" : "var(--tint)" } as CSSProperties}>
              {shots[k] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={shots[k]} alt={`${p.title} — view ${k + 1}`} loading="lazy" />
              ) : (
                <span className="fig-mark" aria-hidden>
                  {k ? p.year : p.title.charAt(0)}
                </span>
              )}
            </div>
            <figcaption className="t-meta">
              {pad(index + 1)}
              {k ? "b" : "a"}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

/** "ledgerline.app", "github.com/alex/ledgerline" — an address as you would say it. */
const address = (url: string) => {
  try {
    const u = new URL(url);
    return (u.host.replace(/^www\./, "") + u.pathname).replace(/\/$/, "");
  } catch {
    return url;
  }
};

/** Right-hand page: the name, what it is, then year, tech and where to find it. */
function Detail({ p, index }: { p: Project; index: number }) {
  const row = "grid grid-cols-[5.6em_1fr] items-baseline gap-[1em]";
  return (
    <div className="flex h-full flex-col justify-between">
      <div className="t-meta flex justify-between">
        <span>Project</span>
        <span>
          {pad(index + 1)} / {pad(featuredProjects.length)}
        </span>
      </div>
      <div>
        <h3 className="t-h1">{p.title}</h3>
        <div className="t-meta mt-[6.5cqw]">About</div>
        <p className="t-lede mt-[2cqw]">{p.summary}</p>
      </div>
      <dl className="rows rows--tight">
        <div className={row}>
          <dt className="t-meta">Year</dt>
          <dd className="text-[0.95em]">{p.year}</dd>
        </div>
        <div className={row}>
          <dt className="t-meta">Tech</dt>
          <dd className="text-[0.95em]">{p.tags.join(", ")}</dd>
        </div>
        {p.live && (
          <div className={row}>
            <dt className="t-meta">Website</dt>
            <dd className="text-[0.95em]">
              <TextLink href={p.live} external>
                {address(p.live)}
              </TextLink>
            </dd>
          </div>
        )}
        {p.code && (
          <div className={row}>
            <dt className="t-meta">Source</dt>
            <dd className="text-[0.95em]">
              <TextLink href={p.code} external>
                {address(p.code)}
              </TextLink>
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}

/** Links for the shorter entries further on. */
function Links({ p }: { p: Project }) {
  if (!p.live && !p.code) return null;
  return (
    <span className="flex gap-[1.4em]">
      {p.live && (
        <TextLink href={p.live} external>
          Visit
        </TextLink>
      )}
      {p.code && (
        <TextLink href={p.code} external>
          Source
        </TextLink>
      )}
    </span>
  );
}

function Contents() {
  return (
    <div className="flex h-full flex-col justify-between">
      <div className="t-meta flex justify-between">
        <span>Contents</span>
        <span>{all.length} projects</span>
      </div>
      <div className="rows rows--tight">
        {all.map((p, i) => (
          <div key={p.title} className="flex items-baseline gap-[1em]">
            <span className="t-fig w-[2.1em] shrink-0">{pad(i + 1)}</span>
            <span className="flex-1 text-[1.02em] font-medium">{p.title}</span>
            <span className="t-fig">{p.year}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function More({ items, from }: { items: Project[]; from: number }) {
  return (
    <div className="flex h-full flex-col justify-between">
      <div className="t-meta flex justify-between">
        <span>More work</span>
        <span>
          {pad(from + 1)}–{pad(from + items.length)}
        </span>
      </div>
      <div className="rows">
        {items.map((p) => (
          <article key={p.title}>
            <div className="flex items-baseline justify-between gap-[1em]">
              <h3 className="t-h3">{p.title}</h3>
              <span className="t-fig">{p.year}</span>
            </div>
            <p className="t-body mt-[0.25em]">{p.summary}</p>
            <div className="mt-[0.6em] flex flex-wrap items-baseline justify-between gap-x-[1em] gap-y-[0.4em]">
              <span className="t-meta">{p.tags.join(" / ")}</span>
              <span className="text-[0.9em]">
                <Links p={p} />
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function Elsewhere() {
  return (
    <div className="flex h-full flex-col justify-between">
      <div className="t-meta">Elsewhere</div>
      <div>
        <h2 className="t-h2">
          Notes in the <em>margin</em>
        </h2>
        <div className="rows mt-[7cqw]">
          {extraHighlights.map((h) => (
            <div key={h.title} className="grid grid-cols-[7.4em_1fr] items-baseline gap-[1em]">
              <span className="t-meta">{h.title}</span>
              <span className="text-[0.98em] text-[var(--ink)]">{h.body}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function End() {
  const { goToBook } = useNav();
  return <NextPage meta="End of Vol. II" title="Experience" sub="Vol. III — a working history" onClick={() => goToBook(2)} />;
}

/** Split a list into pages of `n`. */
const chunk = <T,>(list: T[], n: number) => Array.from({ length: Math.ceil(list.length / n) }, (_, i) => list.slice(i * n, i * n + n));

const blocks: Block[] = [
  {
    id: "opener",
    full: true,
    tone: true,
    node: <Opener num="02" chapter="II" title="Projects" blurb={`Selected work${span ? `, ${span}` : ""}. Two in depth, the rest in brief.`} />,
  },
  { id: "contents", name: "Contents", full: true, node: <Contents /> },
  ...featuredProjects.flatMap((p, i): Block[] => [
    { id: `figures-${i}`, full: true, left: true, node: <Figures p={p} index={i} /> },
    { id: `detail-${i}`, name: p.title, full: true, node: <Detail p={p} index={i} /> },
  ]),
  ...chunk(moreProjects, 3).map((items, i): Block => ({
    id: `more-${i}`,
    name: i ? undefined : "More work",
    full: true,
    node: <More items={items} from={featuredProjects.length + i * 3} />,
  })),
  { id: "elsewhere", name: "Notes in the margin", full: true, node: <Elsewhere /> },
  { id: "end", full: true, node: <End /> },
];

export const projectsBook: BookDef = {
  id: "projects",
  label: "Projects",
  volume: "Vol. II",
  palette: PALETTE.projects,
  cover: <CoverTitle volume="Vol. II" title="Projects" icon="grid" />,
  blocks,
  filler: <QuotePage quote="Good work is mostly the patience to do the dull parts well." by="Workshop note" />,
};
