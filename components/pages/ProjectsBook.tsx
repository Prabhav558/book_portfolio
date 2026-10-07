"use client";

import { motion } from "framer-motion";
import { extraHighlights, featuredProjects, moreProjects, techStack, type Project } from "@/content/portfolio";
import type { BookDef } from "@/components/book/types";
import { ArrowUpRight, CoverTitle, Fleuron, Page } from "./primitives";

/** An engraved "plate" illustration generated from the project's hue — no images needed. */
function Plate({ p, seed }: { p: Project; seed: number }) {
  const h = p.hue;
  const ink = `hsl(${h} 38% 26%)`;
  const lines = Array.from({ length: 22 }, (_, i) => i);
  return (
    <div className="plate aspect-[16/10] w-full">
      <svg viewBox="0 0 320 200" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <defs>
          <linearGradient id={`pg-${seed}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={`hsl(${h} 45% 88%)`} />
            <stop offset="1" stopColor={`hsl(${(h + 30) % 360} 40% 78%)`} />
          </linearGradient>
          <clipPath id={`pc-${seed}`}>
            <circle cx={200 + (seed % 3) * 18} cy="96" r="70" />
          </clipPath>
        </defs>
        <rect width="320" height="200" fill={`url(#pg-${seed})`} />
        <g clipPath={`url(#pc-${seed})`} stroke={ink} strokeOpacity="0.35" strokeWidth="1">
          {lines.map((i) => (
            <line key={i} x1={100 + i * 9} y1="0" x2={40 + i * 9} y2="200" />
          ))}
        </g>
        <circle cx={200 + (seed % 3) * 18} cy="96" r="70" fill="none" stroke={ink} strokeOpacity="0.55" />
        <circle cx={92 - (seed % 2) * 20} cy="138" r="34" fill={`hsl(${h} 42% 36%)`} fillOpacity="0.85" />
        <path d="M0 168 C 60 150, 120 182, 180 164 S 280 150, 320 162 L320 200 L0 200 Z" fill={ink} fillOpacity="0.22" />
        <text x="22" y="46" fontFamily="var(--font-playfair), serif" fontSize="34" fontStyle="italic" fill={ink} fillOpacity="0.8">
          {p.title}
        </text>
        <text x="24" y="66" fontFamily="var(--font-inter), sans-serif" fontSize="8.5" letterSpacing="2.4" fill={ink} fillOpacity="0.6">
          PLATE {String(seed + 1).padStart(2, "0")} · {p.year}
        </text>
      </svg>
    </div>
  );
}

function Links({ p }: { p: Project }) {
  return (
    <div className="flex gap-[1.1em] text-[0.72em] font-medium">
      {p.live && (
        <a href={p.live} target="_blank" rel="noreferrer" className="ink-link inline-flex items-center gap-[0.25em]">
          Live site <ArrowUpRight />
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

function Featured({ p, seed, folio }: { p: Project; seed: number; folio: number }) {
  return (
    <Page runner={["Volume II", "Featured work"]} folio={folio}>
      <motion.article
        className="flex flex-1 flex-col"
        whileHover={{ y: -3 }}
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
      >
        <Plate p={p} seed={seed} />
        <div className="mt-[1.1em] flex items-baseline justify-between">
          <span className="pg-kicker">Featured · {p.year}</span>
          <span className="pg-small">No. {String(seed + 1).padStart(2, "0")}</span>
        </div>
        <h3 className="pg-title mt-[0.3em]">{p.title}</h3>
        <p className="pg-body mt-[0.6em]">{p.summary}</p>
        <div className="mt-[0.9em] flex flex-wrap gap-[0.4em]">
          {p.tags.map((t) => (
            <span key={t} className="tag">
              {t}
            </span>
          ))}
        </div>
        <div className="flex-1" />
        <div className="border-t border-[var(--rule)] pt-[0.8em]">
          <Links p={p} />
        </div>
      </motion.article>
      <div className="h-[1.6em]" />
    </Page>
  );
}

function MoreList({ items, title, folio, offset }: { items: Project[]; title?: string; folio: number; offset: number }) {
  return (
    <Page runner={["Volume II", "More work"]} folio={folio}>
      {title ? (
        <>
          <div className="pg-kicker">Index</div>
          <h2 className="pg-title mt-[0.35em]">{title}</h2>
        </>
      ) : (
        <div className="pg-kicker">Index, continued</div>
      )}
      <div className="mt-[1.1em] grid gap-[0.2em]">
        {items.map((p, i) => (
          <motion.article
            key={p.title}
            className="-mx-[0.6em] grid grid-cols-[2.2em_1fr] gap-[0.5em] rounded-[0.4em] px-[0.6em] py-[0.75em]"
            whileHover={{ y: -2, backgroundColor: "rgba(255,255,255,0.45)" }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
          >
            <span className="font-serif text-[0.95em] italic text-[var(--accent)]">
              {String(offset + i + 1).padStart(2, "0")}
            </span>
            <div>
              <div className="flex items-baseline justify-between gap-[0.6em]">
                <h3 className="pg-h3">{p.title}</h3>
                <span className="pg-small">{p.year}</span>
              </div>
              <p className="pg-body mt-[0.25em]">{p.summary}</p>
              <div className="mt-[0.5em] flex items-center justify-between gap-[0.5em]">
                <div className="flex flex-wrap gap-[0.35em]">
                  {p.tags.map((t) => (
                    <span key={t} className="tag">
                      {t}
                    </span>
                  ))}
                </div>
                <Links p={p} />
              </div>
            </div>
          </motion.article>
        ))}
      </div>
      <div className="flex-1" />
      <div className="h-[1.6em]" />
    </Page>
  );
}

function Stack() {
  return (
    <Page runner={["Volume II", "The workshop"]} folio={5}>
      <div className="pg-kicker">Tech stack</div>
      <h2 className="pg-title mt-[0.35em]">The workshop</h2>
      <p className="pg-body mt-[0.7em]">The tools behind everything in this volume — the ones I reach for first, and know deeply.</p>
      <div className="mt-[1.4em] grid grid-cols-3 gap-[0.55em]">
        {techStack.map((t) => (
          <motion.div
            key={t}
            className="grid aspect-[5/3] place-items-center rounded-[0.35em] border border-[var(--rule)] bg-white/30 text-center font-serif text-[0.86em] text-[var(--ink)]"
            whileHover={{ y: -2, backgroundColor: "rgba(255,255,255,0.6)" }}
            transition={{ type: "spring", stiffness: 320, damping: 24 }}
          >
            {t}
          </motion.div>
        ))}
      </div>
      <div className="flex-1" />
      <div className="h-[1.6em]" />
    </Page>
  );
}

function Beyond() {
  return (
    <Page runner={["Volume II", "Beyond"]} folio={6}>
      <div className="pg-kicker">Beyond the day job</div>
      <h2 className="pg-title mt-[0.35em]">Notes in the margin</h2>
      <div className="mt-[1.2em] grid gap-[1em]">
        {extraHighlights.map((h) => (
          <div key={h.title} className="border-l-2 border-[var(--accent)]/40 pl-[0.9em]">
            <div className="pg-h3">{h.title}</div>
            <p className="pg-body mt-[0.2em]">{h.body}</p>
          </div>
        ))}
      </div>
      <div className="flex-1" />
      <div className="text-center">
        <Fleuron className="mx-auto w-[7em] text-[var(--accent)] opacity-60" />
        <div className="pg-small mt-[0.6em] italic">Next — Volume III, Experience</div>
      </div>
      <div className="h-[1.6em]" />
    </Page>
  );
}

export const projectsBook: BookDef = {
  id: "projects",
  label: "Projects",
  leather: "#8ea596",
  accent: "#4f7a63",
  silk: "#4f7a63",
  glow: [0.82, 0.96, 0.88],
  cover: <CoverTitle volume="Volume II" title="Projects" subtitle="Selected works" icon="grid" />,
  spreads: [
    [<Featured key="f0" p={featuredProjects[0]} seed={0} folio={1} />, <Featured key="f1" p={featuredProjects[1]} seed={1} folio={2} />],
    [
      <MoreList key="m0" items={moreProjects.slice(0, 3)} title="More from the archive" folio={3} offset={2} />,
      <MoreList key="m1" items={moreProjects.slice(3, 6)} folio={4} offset={5} />,
    ],
    [<Stack key="st" />, <Beyond key="by" />],
  ],
};
