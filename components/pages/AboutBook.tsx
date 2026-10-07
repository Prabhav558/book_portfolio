"use client";

import { highlights, principles, profile, skills } from "@/content/portfolio";
import type { Block, BookDef } from "@/components/book/types";
import { PALETTE } from "@/content/palette";
import { CoverTitle, NextPage, Opener, QuotePage, TextLink, fit, useNav } from "./primitives";

function Title() {
  const longest = profile.firstName.length >= profile.lastName.length ? profile.firstName : profile.lastName;
  return (
    <div className="flex h-full flex-col justify-between">
      <div className="t-meta flex justify-between">
        <span>Portfolio</span>
        <span>Vol. I of IV</span>
      </div>
      <div>
        <h1 className="t-mega" style={fit(longest, 24, 79, 0.43)}>
          {profile.firstName}
          <br />
          <em>{profile.lastName}</em>
        </h1>
        <div className="t-meta mt-[7cqw]">
          {profile.role} — {profile.location}
        </div>
      </div>
    </div>
  );
}

function Statement() {
  const { goToBook } = useNav();
  return (
    <div className="flex h-full flex-col justify-between">
      <div className="t-meta">Introduction</div>
      <p className="t-statement">{profile.tagline}</p>
      <div>
        <div className="flex flex-wrap gap-x-[1.7em] gap-y-[0.7em]">
          <TextLink onClick={() => goToBook(1)}>Selected work</TextLink>
          <TextLink onClick={() => goToBook(3)}>Get in touch</TextLink>
        </div>
        <div className="t-meta mt-[1.8em]">{profile.availability}</div>
      </div>
    </div>
  );
}

function Story() {
  const [first, ...rest] = profile.about;
  return (
    <div className="flex h-full flex-col justify-between">
      <div className="t-meta">About</div>
      <div>
        <p className="t-lede">{first}</p>
        {rest.map((p) => (
          <p key={p} className="t-body mt-[1.1em]">
            {p}
          </p>
        ))}
      </div>
    </div>
  );
}

function Glance() {
  return (
    <div className="flex h-full flex-col justify-between">
      <div className="t-meta">At a glance</div>
      <div className="rows">
        {highlights.map((h) => (
          <div key={h.label} className="grid grid-cols-[32cqw_1fr] items-end gap-[4cqw]">
            <span className="t-h1">{h.value}</span>
            <span className="t-body pb-[0.35em]">{h.label}</span>
          </div>
        ))}
      </div>
      <dl className="grid gap-[0.5em]">
        {profile.facts.map((f) => (
          <div key={f.label} className="flex items-baseline gap-[1em]">
            <dt className="t-meta w-[7.6em] shrink-0">{f.label}</dt>
            <dd className="text-[0.95em] text-[var(--ink)]">{f.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Toolkit() {
  return (
    <div className="flex h-full flex-col justify-between">
      <div className="t-meta">Toolkit</div>
      <div>
        <h2 className="t-h2">
          Tools of the <em>trade</em>
        </h2>
        <div className="rows mt-[7cqw]">
          {skills.map((g) => (
            <div key={g.group} className="grid grid-cols-[7.4em_1fr] items-baseline gap-[1em]">
              <span className="t-meta">{g.group}</span>
              <span className="text-[0.98em] text-[var(--ink)]">{g.items.join(", ")}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Principles() {
  return (
    <div className="flex h-full flex-col justify-between">
      <div className="t-meta">Principles</div>
      <ol className="grid gap-[6.5cqw]">
        {principles.map((p, i) => (
          <li key={p.title} className="grid grid-cols-[2.7em_1fr]">
            <span className="t-fig pt-[0.55em]">{String(i + 1).padStart(2, "0")}</span>
            <div>
              <h3 className="t-h3">{p.title}</h3>
              <p className="t-body mt-[0.35em]">{p.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function End() {
  const { goToBook } = useNav();
  return <NextPage meta="End of Vol. I" title="Projects" sub="Vol. II — selected work" onClick={() => goToBook(1)} />;
}

const blocks: Block[] = [
  { id: "title", full: true, node: <Title /> },
  { id: "statement", name: "Introduction", full: true, node: <Statement /> },
  {
    id: "opener",
    full: true,
    tone: true,
    node: <Opener num="01" chapter="I" title="About" blurb="Who I am, what I am good at, and how I like to work." />,
  },
  { id: "story", name: "About", full: true, node: <Story /> },
  { id: "glance", name: "At a glance", full: true, node: <Glance /> },
  { id: "toolkit", name: "Toolkit", full: true, node: <Toolkit /> },
  { id: "principles", name: "Principles", full: true, node: <Principles /> },
  { id: "end", full: true, node: <End /> },
];

export const aboutBook: BookDef = {
  id: "about",
  label: "About",
  blurb: "Introduction, skills, background",
  volume: "Vol. I",
  palette: PALETTE.about,
  cover: <CoverTitle volume="Vol. I" title={profile.name} icon="book" />,
  blocks,
  filler: <QuotePage quote="Make it work, make it right, make it fast. Then make it beautiful." by="A rule taped to my monitor" />,
};
