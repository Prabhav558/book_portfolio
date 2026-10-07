"use client";

import { useId } from "react";
import { extraHighlights, featuredProjects, moreProjects, techStack, type Project } from "@/content/portfolio";
import type { Block, BookDef } from "@/components/book/types";
import { Arrow, ArrowUpRight, CoverTitle, EndCard, Heading, QuotePage, useNav } from "./primitives";

/** A generated "plate" for each project — swap for a real screenshot when you have one. */
function Plate({ p, seed }: { p: Project; seed: number }) {
  const uid = useId().replace(/:/g, "");
  const h = p.hue;
  const ink = `hsl(${h} 30% 28%)`;
  const lines = Array.from({ length: 22 }, (_, i) => i);
  const cx = 200 + (seed % 3) * 18;
  return (
    <div className="plate aspect-[16/9] w-full">
      <svg viewBox="0 0 320 180" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <defs>
          <linearGradient id={`g${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={`hsl(${h} 32% 90%)`} />
            <stop offset="1" stopColor={`hsl(${(h + 24) % 360} 30% 82%)`} />
          </linearGradient>
          <clipPath id={`c${uid}`}>
            <circle cx={cx} cy="86" r="62" />
          </clipPath>
        </defs>
        <rect width="320" height="180" fill={`url(#g${uid})`} />
        <g clipPath={`url(#c${uid})`} stroke={ink} strokeOpacity="0.32" strokeWidth="1">
          {lines.map((i) => (
            <line key={i} x1={100 + i * 9} y1="0" x2={40 + i * 9} y2="180" />
          ))}
        </g>
        <circle cx={cx} cy="86" r="62" fill="none" stroke={ink} strokeOpacity="0.5" />
        <circle cx={90 - (seed % 2) * 20} cy="124" r="30" fill={`hsl(${h} 30% 42%)`} fillOpacity="0.85" />
        <path d="M0 150 C 60 134, 120 164, 180 148 S 280 134, 320 146 L320 180 L0 180 Z" fill={ink} fillOpacity="0.18" />
        <text x="22" y="34" fontFamily="var(--font-inter), sans-serif" fontSize="8" letterSpacing="2.4" fill={ink} fillOpacity="0.65">
          PLATE {String(seed + 1).padStart(2, "0")} · {p.year}
        </text>
      </svg>
    </div>
  );
}

function Links({ p }: { p: Project }) {
  if (!p.live && !p.code) return null;
  return (
    <div className="flex shrink-0 gap-[1em] text-[0.74em] font-medium">
      {p.live && (
        <a href={p.live} target="_blank" rel="noreferrer" className="ink-link inline-flex items-center gap-[0.25em]">
          Live <ArrowUpRight />
        </a>
      )}
      {p.code && (
        <a href={p.code} target="_blank" rel="noreferrer" className="ink-link inline-flex items-center gap-[0.25em]">
          Source <ArrowUpRight />
        </a>
      )}
    </div>
  );
}

function Tags({ tags }: { tags: string[] }) {
  return (
    <div className="flex flex-wrap gap-[0.4em]">
      {tags.map((t) => (
        <span key={t} className="tag">
          {t}
        </span>
      ))}
    </div>
  );
}

function End() {
  const { goToBook } = useNav();
  return (
    <EndCard
      kicker="End of Volume II"
      line="Then, where it"
      accent="was learned."
      action={
        <button type="button" className="btn-ghost" onClick={() => goToBook(2)}>
          Open Volume III <Arrow />
        </button>
      }
    />
  );
}

const featured: Block[] = featuredProjects.flatMap((p, i) => [
  {
    id: `feat-${i}-plate`,
    keep: true,
    breakBefore: true,
    section: "Featured work",
    node: (
      <div>
        <Plate p={p} seed={i} />
        <div className="mt-[0.9em] flex items-baseline justify-between">
          <span className="pg-kicker">Featured · {p.year}</span>
          <span className="pg-small">No. {String(i + 1).padStart(2, "0")}</span>
        </div>
        <h3 className="pg-title mt-[0.2em]">{p.title}</h3>
      </div>
    ),
  },
  {
    id: `feat-${i}-body`,
    node: (
      <div>
        <p className="pg-body">{p.summary}</p>
        <div className="mt-[0.8em] flex flex-wrap items-center justify-between gap-[0.6em]">
          <Tags tags={p.tags} />
          <Links p={p} />
        </div>
      </div>
    ),
  },
]);

const more: Block[] = moreProjects.map((p, i) => ({
  id: `more-${i}`,
  node: (
    <article className="grid grid-cols-[1.9em_1fr] gap-[0.4em] border-t border-[var(--rule)] pt-[0.8em]">
      <span className="font-serif text-[1.05em] text-[var(--accent)] italic">{String(i + 3).padStart(2, "0")}</span>
      <div>
        <div className="flex items-baseline justify-between gap-[0.6em]">
          <h3 className="pg-h3">{p.title}</h3>
          <span className="pg-small">{p.year}</span>
        </div>
        <p className="pg-body mt-[0.2em]">{p.summary}</p>
        <div className="mt-[0.5em] flex flex-wrap items-center justify-between gap-[0.5em]">
          <Tags tags={p.tags} />
          <Links p={p} />
        </div>
      </div>
    </article>
  ),
}));

const blocks: Block[] = [
  ...featured,
  { id: "more-h", keep: true, breakBefore: true, section: "More work", node: <Heading kicker="Index" title="More from the archive" /> },
  ...more,
  {
    id: "stack-h",
    keep: true,
    section: "The workshop",
    node: <Heading kicker="Tech stack" title="The workshop" lede="The tools behind everything in this volume — the ones I reach for first, and know deeply." />,
  },
  {
    id: "stack",
    node: (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(6.2em,1fr))] gap-[0.5em]">
        {techStack.map((t) => (
          <div key={t} className="chip">
            {t}
          </div>
        ))}
      </div>
    ),
  },
  { id: "beyond-h", keep: true, section: "Beyond", node: <Heading kicker="Beyond the day job" title="Notes in the margin" /> },
  ...extraHighlights.map((h, i) => ({
    id: `beyond-${i}`,
    node: (
      <div className="border-l-2 border-[color-mix(in_srgb,var(--accent)_45%,transparent)] pl-[0.9em]">
        <div className="pg-h3">{h.title}</div>
        <p className="pg-body mt-[0.15em]">{h.body}</p>
      </div>
    ),
  })),
  { id: "end", full: true, node: <End /> },
];

export const projectsBook: BookDef = {
  id: "projects",
  label: "Projects",
  volume: "Volume II",
  leather: "#8ea596",
  accent: "#4f7a63",
  silk: "#4f7a63",
  glow: [0.82, 0.96, 0.88],
  cover: <CoverTitle volume="Volume II" title="Projects" subtitle="Selected works" icon="grid" />,
  blocks,
  filler: <QuotePage quote="Good work is mostly the patience to do the dull parts well." by="Workshop note" />,
};
