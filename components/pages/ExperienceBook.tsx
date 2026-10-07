"use client";

import { awards, education, experience, learning, type Role } from "@/content/portfolio";
import type { BookDef } from "@/components/book/types";
import { CoverTitle, Fleuron, Page } from "./primitives";

/** A vertical rule that the scroll timeline "inks in" as the page lands (see [data-draw]). */
function Rail({ end }: { end?: boolean }) {
  return (
    <div className="absolute top-[0.35em] bottom-0 left-[0.32em] w-px">
      <div className="absolute inset-0 bg-[var(--rule)]" />
      <div data-draw className="absolute inset-0 origin-top bg-[var(--accent)] opacity-70" />
      {end && <div className="absolute -bottom-[0.3em] -left-[0.25em] h-[0.55em] w-[0.55em] rotate-45 border border-[var(--accent)] bg-[var(--paper)]" />}
    </div>
  );
}

function RoleBlock({ r, index }: { r: Role; index: number }) {
  return (
    <article className="relative pl-[1.7em]">
      <span className="absolute top-[0.35em] left-0 h-[0.68em] w-[0.68em] rounded-full border-[1.5px] border-[var(--accent)] bg-[var(--paper)]" />
      <div className="pg-kicker">{r.period}</div>
      <h3 className="pg-title mt-[0.3em] text-[1.65em]">{r.title}</h3>
      <div className="mt-[0.35em] font-serif text-[1em] italic text-[var(--accent)]">
        {r.company} <span className="text-[var(--muted)] not-italic">· {r.location}</span>
      </div>
      <ul className="mt-[1em] grid gap-[0.65em]">
        {r.points.map((pt) => (
          <li key={pt} className="pg-body relative pl-[1em]">
            <span className="absolute top-[0.72em] left-0 h-px w-[0.5em] bg-[var(--accent)]" />
            {pt}
          </li>
        ))}
      </ul>
      <div className="pg-small mt-[1.1em] tracking-[0.18em] uppercase">Stage {String(index + 1).padStart(2, "0")}</div>
    </article>
  );
}

function RolePage({ i, folio, intro }: { i: number; folio: number; intro?: boolean }) {
  return (
    <Page runner={["Volume III", "Experience"]} folio={folio}>
      {intro && (
        <div className="mb-[1.5em]">
          <div className="pg-kicker">Chapter III</div>
          <h2 className="pg-title mt-[0.35em]">A working history</h2>
        </div>
      )}
      <div className="relative flex-1">
        <Rail end={i === experience.length - 1} />
        <RoleBlock r={experience[i]} index={i} />
        <div className="pointer-events-none absolute right-0 bottom-[0.2em] font-serif text-[7.5em] leading-none text-[var(--accent)] italic opacity-[0.07] select-none">
          {String(i + 1).padStart(2, "0")}
        </div>
      </div>
      <div className="h-[1.6em]" />
    </Page>
  );
}

function Education() {
  return (
    <Page runner={["Volume III", "Education"]} folio={5}>
      <div className="pg-kicker">Education</div>
      <h2 className="pg-title mt-[0.35em]">Where it started</h2>
      <div className="mt-[1.4em] rounded-[0.4em] border border-[var(--rule)] bg-white/25 p-[1.2em]">
        <div className="pg-small tracking-[0.18em] uppercase">{education.period}</div>
        <div className="pg-h3 mt-[0.4em]">{education.school}</div>
        <div className="mt-[0.3em] font-serif italic text-[var(--accent)]">{education.degree}</div>
        <ul className="mt-[0.9em] grid gap-[0.4em]">
          {education.notes.map((n) => (
            <li key={n} className="pg-body">
              — {n}
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-[1.8em] pg-kicker">Currently studying</div>
      <ul className="mt-[0.7em] grid gap-[0.75em]">
        {learning.map((l) => (
          <li key={l.topic} className="grid grid-cols-[1.4em_1fr] items-baseline">
            <span className="font-serif text-[0.9em] text-[var(--accent)] italic">✦</span>
            <div>
              <span className="pg-h3 text-[1em]">{l.topic}</span>
              <span className="pg-body"> — {l.note}</span>
            </div>
          </li>
        ))}
      </ul>
      <div className="flex-1" />
      <div className="h-[1.6em]" />
    </Page>
  );
}

function Recognition() {
  return (
    <Page runner={["Volume III", "Recognition"]} folio={6}>
      <div className="pg-kicker">Recognition</div>
      <h2 className="pg-title mt-[0.35em]">Awards &amp; certificates</h2>
      <ul className="mt-[1.3em] grid gap-[0.2em]">
        {awards.map((a) => (
          <li key={a.title} className="flex items-baseline gap-[0.6em] border-b border-[var(--rule)] py-[0.7em]">
            <span className="font-serif text-[1.05em] text-[var(--ink)]">{a.title}</span>
            <span className="h-px flex-1 border-b border-dotted border-[rgba(43,33,24,0.25)]" />
            <span className="pg-small">{a.year}</span>
          </li>
        ))}
      </ul>
      <div className="flex-1" />
      <div className="text-center">
        <Fleuron className="mx-auto w-[7em] text-[var(--accent)] opacity-60" />
        <div className="pg-small mt-[0.6em] italic">Next — Volume IV, Correspondence</div>
      </div>
      <div className="h-[1.6em]" />
    </Page>
  );
}

export const experienceBook: BookDef = {
  id: "experience",
  label: "Experience",
  leather: "#8ba1b5",
  accent: "#46698d",
  silk: "#46698d",
  glow: [0.84, 0.9, 1],
  cover: <CoverTitle volume="Volume III" title="Experience" subtitle="A working history" icon="timeline" />,
  spreads: [
    [<RolePage key="r0" i={0} folio={1} intro />, <RolePage key="r1" i={1} folio={2} />],
    [<RolePage key="r2" i={2} folio={3} />, <RolePage key="r3" i={3} folio={4} />],
    [<Education key="ed" />, <Recognition key="rc" />],
  ],
};
