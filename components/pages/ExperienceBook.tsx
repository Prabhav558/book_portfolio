"use client";

import { awards, education, experience, learning, type Role } from "@/content/portfolio";
import type { Block, BookDef } from "@/components/book/types";
import { Arrow, CoverTitle, EndCard, Heading, QuotePage, useNav } from "./primitives";

function RoleBlock({ r, index, last }: { r: Role; index: number; last: boolean }) {
  return (
    <article className="relative pl-[1.7em]">
      {/* the timeline: a rule that runs on into the gap below, so consecutive roles join up */}
      <span className={`absolute top-[0.6em] left-[0.32em] w-px bg-[var(--accent)] opacity-45 ${last ? "bottom-0" : "bottom-[-1.2em]"}`} />
      <span className="absolute top-[0.25em] left-0 h-[0.7em] w-[0.7em] rounded-full border-[1.5px] border-[var(--accent)] bg-[var(--paper)]" />
      <div className="flex items-baseline justify-between gap-[0.6em]">
        <div className="pg-kicker">{r.period}</div>
        <div className="pg-small tracking-[0.14em] uppercase">Stage {String(index + 1).padStart(2, "0")}</div>
      </div>
      <h3 className="pg-title mt-[0.25em] text-[1.75em]">{r.title}</h3>
      <div className="pg-h3 mt-[0.2em] text-[0.95em] text-[var(--accent)]">
        {r.company} <span className="font-normal text-[var(--muted)]">· {r.location}</span>
      </div>
      <ul className="mt-[0.7em] grid gap-[0.45em]">
        {r.points.map((pt) => (
          <li key={pt} className="pg-body relative pl-[1em]">
            <span className="absolute top-[0.78em] left-0 h-px w-[0.5em] bg-[var(--accent)]" />
            {pt}
          </li>
        ))}
      </ul>
    </article>
  );
}

function End() {
  const { goToBook } = useNav();
  return (
    <EndCard
      kicker="End of Volume III"
      line="Last, a way"
      accent="to reach me."
      action={
        <button type="button" className="btn-ghost" onClick={() => goToBook(3)}>
          Open Volume IV <Arrow />
        </button>
      }
    />
  );
}

const blocks: Block[] = [
  { id: "exp-h", keep: true, section: "Experience", node: <Heading kicker="Chapter III" title="A working history" /> },
  ...experience.map((r, i) => ({
    id: `role-${i}`,
    node: <RoleBlock r={r} index={i} last={i === experience.length - 1} />,
  })),

  { id: "edu-h", keep: true, section: "Education", node: <Heading kicker="Education" title="Where it started" /> },
  {
    id: "edu",
    node: (
      <div className="card">
        <div className="pg-small tracking-[0.16em] uppercase">{education.period}</div>
        <div className="pg-h3 mt-[0.35em]">{education.school}</div>
        <div className="pg-body mt-[0.1em] text-[var(--accent)]">{education.degree}</div>
        <ul className="mt-[0.6em] grid gap-[0.25em]">
          {education.notes.map((n) => (
            <li key={n} className="pg-body">
              — {n}
            </li>
          ))}
        </ul>
      </div>
    ),
  },

  { id: "learn-h", keep: true, section: "Now", node: <Heading kicker="Currently studying" title="Still learning" /> },
  ...learning.map((l) => ({
    id: `learn-${l.topic}`,
    node: (
      <div className="grid grid-cols-[1.3em_1fr] items-baseline">
        <span className="text-[0.8em] text-[var(--accent)]">✦</span>
        <p className="pg-body">
          <span className="pg-h3 text-[1em]">{l.topic}</span> — {l.note}
        </p>
      </div>
    ),
  })),

  { id: "awards-h", keep: true, section: "Recognition", node: <Heading kicker="Recognition" title="Awards & certificates" /> },
  ...awards.map((a) => ({
    id: `award-${a.title}`,
    node: (
      <div className="flex items-baseline gap-[0.6em] border-b border-[var(--rule)] pb-[0.6em]">
        <span className="pg-h3 text-[0.98em]">{a.title}</span>
        <span className="h-px min-w-[1em] flex-1 border-b border-dotted border-[rgba(38,39,42,0.25)]" />
        <span className="pg-small">{a.year}</span>
      </div>
    ),
  })),

  { id: "end", full: true, node: <End /> },
];

export const experienceBook: BookDef = {
  id: "experience",
  label: "Experience",
  volume: "Volume III",
  leather: "#8ba1b5",
  accent: "#46698d",
  silk: "#46698d",
  glow: [0.84, 0.9, 1],
  cover: <CoverTitle volume="Volume III" title="Experience" subtitle="A working history" icon="timeline" />,
  blocks,
  filler: <QuotePage quote="Every role taught me one thing I still use every day." by="Looking back" />,
};
