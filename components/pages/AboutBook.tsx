"use client";

import { highlights, principles, profile, skills } from "@/content/portfolio";
import type { BookDef } from "@/components/book/types";
import { Arrow, CoverTitle, Fleuron, Page, useNav } from "./primitives";

function Hero() {
  const { goToBook } = useNav();
  return (
    <Page className="justify-between">
      <div>
        <div className="pg-kicker">Volume I · The Author</div>
        <div className="mt-[0.4em] h-px w-[3.2em] bg-[var(--accent)] opacity-60" />
      </div>
      <div>
        <h1 className="font-serif text-[3.7em] leading-[0.92] tracking-[-0.02em] text-[var(--ink)]">
          {profile.firstName}
          <br />
          <span className="italic text-[var(--accent)]">{profile.lastName}.</span>
        </h1>
        <p className="mt-[0.9em] max-w-[20em] font-serif text-[1.04em] leading-[1.45] italic text-[#4a3b2e]">
          {profile.tagline}
        </p>
        <div className="mt-[1.1em] flex items-center gap-[0.7em] text-[0.68em] font-medium tracking-[0.14em] text-[var(--muted)] uppercase">
          <span>{profile.role}</span>
          <span className="h-[0.25em] w-[0.25em] rounded-full bg-current" />
          <span>{profile.location}</span>
        </div>
        <div className="mt-[1.7em] flex flex-wrap gap-[0.6em]">
          <button type="button" className="btn-ink" onClick={() => goToBook(1)}>
            View projects <Arrow />
          </button>
          <button type="button" className="btn-ghost" onClick={() => goToBook(3)}>
            Get in touch
          </button>
        </div>
      </div>
      <div className="flex items-center gap-[0.6em] text-[0.66em] text-[#5d4b3b]">
        <span className="relative flex h-[0.6em] w-[0.6em]">
          <span className="absolute inset-0 animate-ping rounded-full bg-emerald-600/40" />
          <span className="relative h-full w-full rounded-full bg-emerald-600/80" />
        </span>
        {profile.availability}
      </div>
    </Page>
  );
}

function About() {
  return (
    <Page runner={["Chapter I", "About"]} folio={1}>
      <div className="pg-kicker">Chapter I</div>
      <h2 className="pg-title mt-[0.35em]">A little about me</h2>
      <div className="mt-[1.1em] space-y-[0.9em]">
        <p className="pg-body dropcap">{profile.about[0]}</p>
        <p className="pg-body">{profile.about[1]}</p>
      </div>
      <div className="flex-1" />
      <dl className="grid gap-[0.55em] border-t border-[var(--rule)] pt-[1em]">
        {profile.facts.map((f) => (
          <div key={f.label} className="flex items-baseline gap-[0.6em] text-[0.74em]">
            <dt className="w-[6.5em] shrink-0 text-[0.86em] tracking-[0.16em] text-[var(--muted)] uppercase">{f.label}</dt>
            <dd className="font-serif text-[1.08em] text-[var(--ink)]">{f.value}</dd>
          </div>
        ))}
      </dl>
      <div className="h-[1.6em]" />
    </Page>
  );
}

function Skills() {
  return (
    <Page runner={["The Author", "Skills"]} folio={2}>
      <div className="pg-kicker">Skills</div>
      <h2 className="pg-title mt-[0.35em]">Tools of the trade</h2>
      <p className="pg-body mt-[0.7em] max-w-[22em]">
        A working toolkit, sharpened on real products — chosen for leverage, not novelty.
      </p>
      <div className="mt-[1.4em] grid flex-1 content-start gap-[1.15em]">
        {skills.map((g) => (
          <div key={g.group}>
            <div className="flex items-baseline gap-[0.6em]">
              <span className="font-serif text-[1.02em] italic text-[var(--accent)]">{g.group}</span>
              <span className="h-px flex-1 translate-y-[-0.2em] border-b border-dotted border-[rgba(43,33,24,0.3)]" />
            </div>
            <div className="mt-[0.45em] flex flex-wrap gap-[0.4em]">
              {g.items.map((s) => (
                <span key={s} className="tag">
                  {s}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="h-[1.6em]" />
    </Page>
  );
}

function Highlights() {
  return (
    <Page runner={["The Author", "Highlights"]} folio={3}>
      <div className="pg-kicker">Highlights</div>
      <h2 className="pg-title mt-[0.35em]">By the numbers</h2>
      <div className="mt-[1.2em] grid gap-[1em]">
        {highlights.map((h) => (
          <div key={h.label} className="flex items-baseline gap-[0.7em] border-b border-[var(--rule)] pb-[0.8em]">
            <span className="w-[2.6em] shrink-0 font-serif text-[2.3em] leading-none text-[var(--accent)]">{h.value}</span>
            <span className="pg-body">{h.label}</span>
          </div>
        ))}
      </div>
      <div className="flex-1" />
      <blockquote className="relative pl-[1.1em]">
        <span className="absolute top-[-0.3em] left-0 font-serif text-[2.4em] leading-none text-[var(--accent)] opacity-50">“</span>
        <p className="font-serif text-[1.02em] leading-[1.45] italic text-[#4a3b2e]">
          Make it work, make it right, make it fast — and then, make it beautiful.
        </p>
        <footer className="pg-small mt-[0.5em]">— a rule I keep taped to my monitor</footer>
      </blockquote>
      <div className="h-[1.6em]" />
    </Page>
  );
}

function Principles() {
  const numerals = ["I", "II", "III"];
  return (
    <Page runner={["The Author", "Principles"]} folio={4}>
      <div className="pg-kicker">Principles</div>
      <h2 className="pg-title mt-[0.35em]">What I believe about building</h2>
      <ol className="mt-[1.5em] grid gap-[1.35em]">
        {principles.map((p, i) => (
          <li key={p.title} className="grid grid-cols-[2.2em_1fr] gap-[0.4em]">
            <span className="font-serif text-[1.3em] italic leading-[1.1] text-[var(--accent)]">{numerals[i]}.</span>
            <div>
              <div className="pg-h3">{p.title}</div>
              <p className="pg-body mt-[0.3em]">{p.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="flex-1" />
      <div className="h-[1.6em]" />
    </Page>
  );
}

function EndOfVolume() {
  const { goToBook } = useNav();
  return (
    <Page folio={5} className="items-center justify-center text-center">
      <Fleuron className="w-[9em] text-[var(--accent)] opacity-70" />
      <div className="mt-[1.4em] pg-kicker">End of Volume I</div>
      <p className="mt-[0.8em] font-serif text-[1.7em] leading-[1.15] text-[var(--ink)]">
        Next, the work
        <br />
        <span className="italic text-[var(--accent)]">itself.</span>
      </p>
      <p className="pg-body mt-[1em] max-w-[17em]">Keep scrolling — this volume returns to the shelf and the next one opens.</p>
      <button type="button" className="btn-ghost mt-[1.6em]" onClick={() => goToBook(1)}>
        Open Volume II <Arrow />
      </button>
    </Page>
  );
}

export const aboutBook: BookDef = {
  id: "about",
  label: "About",
  leather: "#8e9194",
  accent: "#8a6d4b",
  silk: "#b88a4a",
  glow: [1, 0.96, 0.9],
  cover: <CoverTitle volume="A Portfolio" title={profile.name} subtitle={profile.role} icon="book" />,
  spreads: [
    [<Hero key="hero" />, <About key="about" />],
    [<Skills key="skills" />, <Highlights key="hl" />],
    [<Principles key="pr" />, <EndOfVolume key="end" />],
  ],
};
