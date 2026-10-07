import Link from "next/link";
import type { ReactNode } from "react";
import {
  awards,
  education,
  experience,
  extraHighlights,
  featuredProjects,
  highlights,
  learning,
  moreProjects,
  profile,
  skills,
  socials,
} from "@/content/portfolio";

const pad = (n: number) => String(n).padStart(2, "0");
const meta = "text-[10.5px] font-medium tracking-[0.09em] text-[var(--ink-3)] uppercase tabular-nums";

function Section({ id, num, title, children }: { id: string; num: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="grid gap-x-10 gap-y-6 border-t border-[var(--hair)] py-14 md:grid-cols-[180px_1fr] md:py-20">
      <div className="flex items-baseline gap-4 md:block">
        <div className={meta}>{num}</div>
        <h2 className="font-serif text-[34px] leading-none tracking-[-0.01em] md:mt-3 md:text-[40px]">{title}</h2>
      </div>
      <div>{children}</div>
    </section>
  );
}

/** The whole portfolio on one calm page — for skimming, for reduced motion, and for search engines. */
export function QuickView({ banner }: { banner?: ReactNode }) {
  const projects = [...featuredProjects, ...moreProjects];
  return (
    <main className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <div className="mx-auto max-w-[980px] px-5 pb-24 sm:px-10">
        <header className="flex items-center justify-between py-6">
          <span className="font-serif text-[22px] leading-none">{profile.name}</span>
          <nav className="flex items-center gap-6 text-[13px] font-medium text-[var(--ink-2)]">
            <a href="#work" className="hidden hover:text-[var(--ink)] sm:inline">
              Work
            </a>
            <a href="#experience" className="hidden hover:text-[var(--ink)] sm:inline">
              Experience
            </a>
            <a href="#contact" className="hidden hover:text-[var(--ink)] sm:inline">
              Contact
            </a>
            {banner ?? (
              <Link href="/" className="link">
                Open the books
              </Link>
            )}
          </nav>
        </header>

        <section className="pt-16 pb-16 md:pt-28 md:pb-24">
          <div className={meta}>
            {profile.role} — {profile.location}
          </div>
          <h1 className="mt-6 font-serif text-[clamp(64px,13vw,168px)] leading-[0.86] tracking-[-0.025em]">
            {profile.firstName}
            <br />
            <em className="text-[var(--ink-2)]">{profile.lastName}</em>
          </h1>
          <p className="mt-10 max-w-[19em] font-serif text-[clamp(26px,3.6vw,40px)] leading-[1.12] tracking-[-0.01em]">{profile.tagline}</p>
          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 text-[15px]">
            <a href={`mailto:${profile.email}`} className="link">
              {profile.email}
            </a>
            <a href={profile.resumeUrl} download className="link">
              Résumé, PDF
            </a>
          </div>
          <p className={`${meta} mt-8`}>{profile.availability}</p>
        </section>

        <Section id="about" num="01" title="About">
          <p className="max-w-[34em] text-[19px] leading-[1.5]">{profile.about[0]}</p>
          {profile.about.slice(1).map((p) => (
            <p key={p} className="mt-4 max-w-[38em] text-[16px] leading-[1.6] text-[var(--ink-2)]">
              {p}
            </p>
          ))}
          <div className="mt-12 grid grid-cols-3 gap-6 border-t border-[var(--hair)] pt-8">
            {highlights.map((h) => (
              <div key={h.label}>
                <div className="font-serif text-[clamp(40px,6vw,72px)] leading-none tracking-[-0.02em]">{h.value}</div>
                <div className="mt-3 max-w-[14em] text-[14px] leading-snug text-[var(--ink-2)]">{h.label}</div>
              </div>
            ))}
          </div>
          <dl className="mt-12">
            {skills.map((g) => (
              <div key={g.group} className="grid grid-cols-[120px_1fr] items-baseline gap-4 border-t border-[var(--hair)] py-3 last:border-b">
                <dt className={meta}>{g.group}</dt>
                <dd className="text-[15px]">{g.items.join(", ")}</dd>
              </div>
            ))}
          </dl>
        </Section>

        <Section id="work" num="02" title="Projects">
          <div>
            {projects.map((p, i) => (
              <article key={p.title} className="grid grid-cols-[40px_1fr] gap-x-2 border-t border-[var(--hair)] py-6 last:border-b">
                <span className={`${meta} pt-[9px]`}>{pad(i + 1)}</span>
                <div>
                  <div className="flex items-baseline justify-between gap-4">
                    <h3 className="font-serif text-[28px] leading-tight tracking-[-0.005em]">{p.title}</h3>
                    <span className={meta}>{p.year}</span>
                  </div>
                  <p className="mt-1 max-w-[40em] text-[15.5px] leading-[1.6] text-[var(--ink-2)]">{p.summary}</p>
                  <div className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-2">
                    <span className={meta}>{p.tags.join(" / ")}</span>
                    {p.live && (
                      <a className="link text-[14px]" href={p.live} target="_blank" rel="noreferrer">
                        Visit
                      </a>
                    )}
                    {p.code && (
                      <a className="link text-[14px]" href={p.code} target="_blank" rel="noreferrer">
                        Source
                      </a>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
          <dl className="mt-10">
            {extraHighlights.map((h) => (
              <div key={h.title} className="grid grid-cols-[120px_1fr] items-baseline gap-4 border-t border-[var(--hair)] py-3 last:border-b">
                <dt className={meta}>{h.title}</dt>
                <dd className="text-[15px]">{h.body}</dd>
              </div>
            ))}
          </dl>
        </Section>

        <Section id="experience" num="03" title="Experience">
          <ol>
            {experience.map((r) => (
              <li key={r.company + r.period} className="grid gap-x-6 gap-y-2 border-t border-[var(--hair)] py-6 last:border-b sm:grid-cols-[150px_1fr]">
                <div className={`${meta} sm:pt-[7px]`}>{r.period}</div>
                <div>
                  <h3 className="font-serif text-[26px] leading-tight">{r.title}</h3>
                  <div className="mt-1 text-[15px] font-medium">
                    {r.company} <span className="font-normal text-[var(--ink-3)]">— {r.location}</span>
                  </div>
                  <ul className="mt-3 grid max-w-[40em] gap-1.5 text-[15.5px] leading-[1.55] text-[var(--ink-2)]">
                    {r.points.map((pt) => (
                      <li key={pt}>{pt}</li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ol>
          <dl className="mt-10">
            <div className="grid grid-cols-[120px_1fr] items-baseline gap-4 border-t border-[var(--hair)] py-3">
              <dt className={meta}>Education</dt>
              <dd className="text-[15px]">
                {education.school} — {education.degree}, {education.period}
              </dd>
            </div>
            <div className="grid grid-cols-[120px_1fr] items-baseline gap-4 border-t border-[var(--hair)] py-3">
              <dt className={meta}>Recognition</dt>
              <dd className="text-[15px]">{awards.map((a) => `${a.title} (${a.year})`).join(", ")}</dd>
            </div>
            <div className="grid grid-cols-[120px_1fr] items-baseline gap-4 border-y border-[var(--hair)] py-3">
              <dt className={meta}>Studying</dt>
              <dd className="text-[15px]">{learning.map((l) => l.topic).join(", ")}</dd>
            </div>
          </dl>
        </Section>

        <Section id="contact" num="04" title="Contact">
          <a href={`mailto:${profile.email}`} className="font-serif text-[clamp(30px,5.4vw,64px)] leading-none tracking-[-0.015em] hover:text-[var(--ink-2)]">
            {profile.email}
          </a>
          <div className="mt-10">
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-baseline justify-between gap-4 border-t border-[var(--hair)] py-3 text-[15px] font-medium last:border-b hover:text-[var(--ink-2)]"
              >
                {s.label}
                <span className={meta}>{s.handle}</span>
              </a>
            ))}
          </div>
        </Section>
      </div>
    </main>
  );
}
