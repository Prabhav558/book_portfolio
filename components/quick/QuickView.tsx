import Link from "next/link";
import type { ReactNode } from "react";
import {
  awards,
  education,
  experience,
  extraHighlights,
  featuredProjects,
  highlights,
  moreProjects,
  profile,
  skills,
  socials,
} from "@/content/portfolio";

function Section({ id, kicker, title, children }: { id: string; kicker: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="border-t border-black/10 py-16 sm:py-20">
      <div className="text-[11px] font-semibold tracking-[0.3em] text-[var(--gold)] uppercase">{kicker}</div>
      <h2 className="mt-3 font-serif text-3xl text-[var(--ivory)] sm:text-4xl">{title}</h2>
      <div className="mt-8">{children}</div>
    </section>
  );
}

/** A calm, single-column version of the portfolio — for skimmers, recruiters and reduced-motion users. */
export function QuickView({ banner }: { banner?: ReactNode }) {
  const projects = [...featuredProjects, ...moreProjects];
  return (
    <main className="min-h-screen bg-[radial-gradient(120%_80%_at_50%_0%,#f8f7f5_0%,#e5e3df_70%)] text-[var(--ivory)]">
      <div className="mx-auto max-w-3xl px-5 pb-24 sm:px-8">
        <header className="flex items-center justify-between py-6">
          <span className="font-serif text-lg italic">{profile.monogram}</span>
          <nav className="flex items-center gap-5 text-[11px] tracking-[0.2em] text-[var(--ivory-dim)] uppercase">
            <a href="#work" className="hover:text-[var(--ivory)]">Work</a>
            <a href="#experience" className="hover:text-[var(--ivory)]">Experience</a>
            <a href="#contact" className="hover:text-[var(--ivory)]">Contact</a>
            {banner ?? (
              <Link href="/" className="rounded-full border border-black/15 px-3 py-2 hover:border-black/35 hover:text-[var(--ivory)]">
                Open the books
              </Link>
            )}
          </nav>
        </header>

        <section className="pt-16 pb-20 sm:pt-24">
          <div className="text-[11px] font-semibold tracking-[0.3em] text-[var(--gold)] uppercase">
            {profile.role} · {profile.location}
          </div>
          <h1 className="mt-5 font-serif text-5xl leading-[1.02] sm:text-7xl">
            {profile.firstName} <span className="text-[var(--gold-hi)] italic">{profile.lastName}.</span>
          </h1>
          <p className="mt-6 max-w-xl font-serif text-xl leading-relaxed text-[var(--ivory-dim)] italic">{profile.tagline}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href={`mailto:${profile.email}`} className="btn-light">Get in touch</a>
            <a href={profile.resumeUrl} download className="btn-outline-light">Download résumé</a>
          </div>
          <p className="mt-6 text-sm text-[var(--ivory-dim)]">{profile.availability}</p>
        </section>

        <Section id="about" kicker="About" title="A little about me">
          <div className="space-y-4 text-[15px] leading-relaxed text-[var(--ivory-dim)]">
            {profile.about.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
          <div className="mt-10 grid grid-cols-3 gap-4">
            {highlights.map((h) => (
              <div key={h.label}>
                <div className="font-serif text-3xl text-[var(--gold-hi)] sm:text-4xl">{h.value}</div>
                <div className="mt-1 text-xs leading-snug text-[var(--ivory-dim)]">{h.label}</div>
              </div>
            ))}
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {skills.map((g) => (
              <div key={g.group}>
                <div className="font-serif italic text-[var(--gold)]">{g.group}</div>
                <div className="mt-2 text-sm text-[var(--ivory-dim)]">{g.items.join(" · ")}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section id="work" kicker="Projects" title="Selected work">
          <div className="grid gap-px overflow-hidden rounded-xl border border-black/10 bg-black/10">
            {projects.map((p) => (
              <article key={p.title} className="bg-white p-5 transition-colors hover:bg-[#f6f5f2] sm:p-6">
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="font-serif text-xl">{p.title}</h3>
                  <span className="text-xs text-[var(--ivory-dim)]">{p.year}</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-[var(--ivory-dim)]">{p.summary}</p>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                  <span className="text-[var(--ivory-dim)]">{p.tags.join(" · ")}</span>
                  {p.live && <a className="text-[var(--gold-hi)] hover:underline" href={p.live} target="_blank" rel="noreferrer">Live ↗</a>}
                  {p.code && <a className="text-[var(--gold-hi)] hover:underline" href={p.code} target="_blank" rel="noreferrer">Source ↗</a>}
                </div>
              </article>
            ))}
          </div>
          <ul className="mt-8 grid gap-3 text-sm text-[var(--ivory-dim)]">
            {extraHighlights.map((h) => (
              <li key={h.title}>
                <span className="text-[var(--ivory)]">{h.title}.</span> {h.body}
              </li>
            ))}
          </ul>
        </Section>

        <Section id="experience" kicker="Experience" title="A working history">
          <ol className="relative grid gap-10 border-l border-black/15 pl-6">
            {experience.map((r) => (
              <li key={r.company} className="relative">
                <span className="absolute top-1.5 -left-[29px] h-2.5 w-2.5 rounded-full border border-[var(--gold)] bg-[var(--night)]" />
                <div className="text-[11px] tracking-[0.2em] text-[var(--gold)] uppercase">{r.period}</div>
                <h3 className="mt-1 font-serif text-xl">{r.title}</h3>
                <div className="text-sm text-[var(--ivory-dim)] italic">{r.company} · {r.location}</div>
                <ul className="mt-3 grid gap-1.5 text-sm text-[var(--ivory-dim)]">
                  {r.points.map((pt) => (
                    <li key={pt}>— {pt}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
          <div className="mt-12 grid gap-8 sm:grid-cols-2">
            <div>
              <div className="font-serif italic text-[var(--gold)]">Education</div>
              <div className="mt-2 text-[var(--ivory)]">{education.school}</div>
              <div className="text-sm text-[var(--ivory-dim)]">{education.degree} · {education.period}</div>
            </div>
            <div>
              <div className="font-serif italic text-[var(--gold)]">Recognition</div>
              <ul className="mt-2 grid gap-1 text-sm text-[var(--ivory-dim)]">
                {awards.map((a) => (
                  <li key={a.title}>{a.title} · {a.year}</li>
                ))}
              </ul>
            </div>
          </div>
        </Section>

        <Section id="contact" kicker="Contact" title="Let's write the next chapter">
          <a href={`mailto:${profile.email}`} className="font-serif text-2xl text-[var(--gold-hi)] hover:underline sm:text-3xl">
            {profile.email}
          </a>
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {socials.map((s) => (
              <a key={s.label} href={s.url} target="_blank" rel="noreferrer" className="text-[var(--ivory-dim)] hover:text-[var(--ivory)]">
                {s.label} ↗
              </a>
            ))}
          </div>
        </Section>
      </div>
    </main>
  );
}
