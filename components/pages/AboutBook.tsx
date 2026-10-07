"use client";

import { highlights, principles, profile, skills } from "@/content/portfolio";
import type { Block, BookDef } from "@/components/book/types";
import { Arrow, CoverTitle, EndCard, Heading, QuotePage, useNav } from "./primitives";

function Hero() {
  const { goToBook } = useNav();
  return (
    <div className="flex h-full flex-col justify-between">
      <div>
        <div className="pg-kicker">A portfolio in four volumes</div>
        <div className="mt-[0.5em] h-px w-[3.2em] bg-[var(--accent)] opacity-60" />
      </div>
      <div>
        <h1 className="font-serif text-[3.9em] leading-[0.9] tracking-[-0.02em] text-[var(--ink)]">
          {profile.firstName}
          <br />
          <span className="text-[var(--accent)] italic">{profile.lastName}.</span>
        </h1>
        <p className="mt-[0.9em] max-w-[19em] font-serif text-[1.22em] leading-[1.35] text-[#45464a] italic">{profile.tagline}</p>
        <div className="mt-[1.1em] flex flex-wrap items-center gap-x-[0.7em] gap-y-[0.2em] text-[0.66em] font-medium tracking-[0.14em] text-[var(--muted)] uppercase">
          <span>{profile.role}</span>
          <span className="h-[0.25em] w-[0.25em] rounded-full bg-current" />
          <span>{profile.location}</span>
        </div>
        <div className="mt-[1.5em] flex flex-wrap gap-[0.6em]">
          <button type="button" className="btn-ink" onClick={() => goToBook(1)}>
            View projects <Arrow />
          </button>
          <button type="button" className="btn-ghost" onClick={() => goToBook(3)}>
            Get in touch
          </button>
        </div>
      </div>
      <div className="flex items-center gap-[0.6em] text-[0.7em] text-[#55565a]">
        <span className="relative flex h-[0.6em] w-[0.6em] shrink-0">
          <span className="absolute inset-0 animate-ping rounded-full bg-emerald-600/40" />
          <span className="relative h-full w-full rounded-full bg-emerald-600/80" />
        </span>
        {profile.availability}
      </div>
    </div>
  );
}

function Facts() {
  return (
    <dl className="grid gap-[0.5em] border-t border-[var(--rule)] pt-[0.9em]">
      {profile.facts.map((f) => (
        <div key={f.label} className="flex items-baseline gap-[0.8em]">
          <dt className="w-[7.4em] shrink-0 text-[0.62em] tracking-[0.16em] text-[var(--muted)] uppercase">{f.label}</dt>
          <dd className="pg-body text-[var(--ink)]">{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function End() {
  const { goToBook } = useNav();
  return (
    <EndCard
      kicker="End of Volume I"
      line="Next, the work"
      accent="itself."
      note="Turn the page — this volume returns to the shelf and the next one opens."
      action={
        <button type="button" className="btn-ghost" onClick={() => goToBook(1)}>
          Open Volume II <Arrow />
        </button>
      }
    />
  );
}

const numerals = ["I", "II", "III", "IV", "V"];

const blocks: Block[] = [
  { id: "hero", full: true, section: "The author", node: <Hero /> },

  { id: "about-h", keep: true, section: "About", node: <Heading kicker="Chapter I" title="A little about me" /> },
  ...profile.about.map((p, i) => ({
    id: `about-${i}`,
    node: <p className="pg-body">{p}</p>,
  })),
  { id: "facts", node: <Facts /> },

  {
    id: "skills-h",
    keep: true,
    section: "Skills",
    node: <Heading kicker="Skills" title="Tools of the trade" lede="A working toolkit, sharpened on real products — chosen for leverage, not novelty." />,
  },
  ...skills.map((g) => ({
    id: `skill-${g.group}`,
    node: (
      <div>
        <div className="flex items-baseline gap-[0.6em]">
          <span className="pg-h3">{g.group}</span>
          <span className="h-px flex-1 translate-y-[-0.25em] border-b border-dotted border-[rgba(38,39,42,0.28)]" />
        </div>
        <div className="mt-[0.5em] flex flex-wrap gap-[0.4em]">
          {g.items.map((s) => (
            <span key={s} className="tag">
              {s}
            </span>
          ))}
        </div>
      </div>
    ),
  })),

  { id: "hl-h", keep: true, section: "Highlights", node: <Heading kicker="Highlights" title="By the numbers" /> },
  ...highlights.map((h) => ({
    id: `hl-${h.value}`,
    node: (
      <div className="flex items-baseline gap-[0.8em] border-b border-[var(--rule)] pb-[0.7em]">
        <span className="w-[2.5em] shrink-0 font-serif text-[2.5em] leading-none text-[var(--accent)]">{h.value}</span>
        <span className="pg-body">{h.label}</span>
      </div>
    ),
  })),

  { id: "pr-h", keep: true, section: "Principles", node: <Heading kicker="Principles" title="What I believe about building" /> },
  ...principles.map((p, i) => ({
    id: `pr-${i}`,
    node: (
      <div className="grid grid-cols-[2em_1fr] gap-[0.4em]">
        <span className="font-serif text-[1.35em] leading-[1.05] text-[var(--accent)] italic">{numerals[i]}.</span>
        <div>
          <div className="pg-h3">{p.title}</div>
          <p className="pg-body mt-[0.25em]">{p.body}</p>
        </div>
      </div>
    ),
  })),

  { id: "end", full: true, node: <End /> },
];

export const aboutBook: BookDef = {
  id: "about",
  label: "About",
  volume: "Volume I",
  leather: "#8e9194",
  accent: "#8a6d4b",
  silk: "#b88a4a",
  glow: [1, 0.96, 0.9],
  cover: <CoverTitle volume="A Portfolio" title={profile.name} subtitle={profile.role} icon="book" />,
  blocks,
  filler: <QuotePage quote="Make it work, make it right, make it fast — and then make it beautiful." by="A rule taped to my monitor" />,
};
