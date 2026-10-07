"use client";

import { awards, education, experience, learning, type Role } from "@/content/portfolio";
import type { Block, BookDef } from "@/components/book/types";
import { PALETTE } from "@/content/palette";
import { CoverTitle, NextPage, Opener, QuotePage, useNav } from "./primitives";

const pad = (n: number) => String(n).padStart(2, "0");

function Timeline() {
  return (
    <div className="flex h-full flex-col justify-between">
      <div className="t-meta flex justify-between">
        <span>Timeline</span>
        <span>{experience.length} roles</span>
      </div>
      <div className="rows">
        {experience.map((r) => (
          <div key={r.company + r.period} className="grid grid-cols-[8.6em_1fr] items-baseline gap-[1em]">
            <span className="t-fig">{r.period}</span>
            <div>
              <div className="text-[1.02em] font-medium">{r.title}</div>
              <div className="text-[0.92em] text-[var(--ink-3)]">
                {r.company}, {r.location}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RolePage({ r, index }: { r: Role; index: number }) {
  return (
    <div className="flex h-full flex-col justify-between">
      <div className="t-meta flex justify-between">
        <span>Role</span>
        <span>
          {pad(index + 1)} / {pad(experience.length)}
        </span>
      </div>
      <div>
        <div className="t-meta">{r.period}</div>
        <h3 className="t-h2 mt-[3cqw]">{r.title}</h3>
        <div className="mt-[3cqw] text-[1.05em] font-medium">
          {r.company} <span className="font-normal text-[var(--ink-3)]">— {r.location}</span>
        </div>
      </div>
      <ul className="rows">
        {r.points.map((pt, i) => (
          <li key={pt} className="grid grid-cols-[2.3em_1fr] items-baseline">
            <span className="t-fig">{pad(i + 1)}</span>
            <span className="t-body">{pt}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Education() {
  return (
    <div className="flex h-full flex-col justify-between">
      <div className="t-meta">Education and recognition</div>
      <div>
        <div className="t-meta">{education.period}</div>
        <h3 className="t-h3 mt-[2.5cqw]">{education.school}</h3>
        <p className="t-body mt-[0.3em]">{education.degree}</p>
        <p className="mt-[0.2em] text-[0.92em] text-[var(--ink-3)]">{education.notes.join(" · ")}</p>
      </div>
      <div className="rows rows--tight">
        {awards.map((a) => (
          <div key={a.title} className="flex items-baseline justify-between gap-[1em]">
            <span className="text-[0.98em] font-medium">{a.title}</span>
            <span className="t-fig">{a.year}</span>
          </div>
        ))}
      </div>
      <div>
        <div className="t-meta">Currently studying</div>
        <p className="t-body mt-[0.4em]">{learning.map((l) => l.topic).join(", ")}</p>
      </div>
    </div>
  );
}

function End() {
  const { goToBook } = useNav();
  return <NextPage meta="End of Vol. III" title="Contact" sub="Vol. IV — say hello" onClick={() => goToBook(3)} />;
}

const blocks: Block[] = [
  {
    id: "opener",
    full: true,
    tone: true,
    node: <Opener num="03" chapter="III" title="Experience" blurb="Where I have worked, what I owned there, and what changed because of it." />,
  },
  { id: "timeline", name: "Timeline", full: true, node: <Timeline /> },
  ...experience.map((r, i): Block => ({ id: `role-${i}`, name: r.company, full: true, node: <RolePage r={r} index={i} /> })),
  { id: "education", name: "Education", full: true, node: <Education /> },
  { id: "end", full: true, node: <End /> },
];

export const experienceBook: BookDef = {
  id: "experience",
  label: "Experience",
  blurb: "Career & education",
  volume: "Vol. III",
  palette: PALETTE.experience,
  cover: <CoverTitle volume="Vol. III" title="Experience" icon="timeline" />,
  blocks,
  filler: <QuotePage quote="Every role taught me one thing I still use every day." by="Looking back" />,
};
