"use client";

import { useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { contactForm, profile, socials } from "@/content/portfolio";
import type { Block, BookDef } from "@/components/book/types";
import { Arrow, ArrowUpRight, CoverTitle, EndCard, Heading, QuotePage, useNav } from "./primitives";

function Email() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(profile.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      window.location.href = `mailto:${profile.email}`;
    }
  };
  return (
    <div>
      <div className="pg-small tracking-[0.18em] uppercase">Write to</div>
      <div className="mt-[0.25em] flex flex-wrap items-center gap-[0.6em]">
        <a href={`mailto:${profile.email}`} className="pg-title text-[1.5em] underline decoration-[color-mix(in_srgb,var(--accent)_45%,transparent)] decoration-1 underline-offset-[0.2em]">
          {profile.email}
        </a>
        <button type="button" onClick={copy} className="tag cursor-pointer transition-colors hover:bg-white">
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
    </div>
  );
}

function Socials() {
  return (
    <ul className="grid grid-cols-2 gap-x-[1em] border-t border-[var(--rule)]">
      {socials.map((s) => (
        <li key={s.label}>
          <a href={s.url} target="_blank" rel="noreferrer" className="row-link">
            <span>
              <span className="pg-h3 block text-[0.98em]">{s.label}</span>
              <span className="pg-small block">{s.handle}</span>
            </span>
            <ArrowUpRight className="text-[var(--accent)]" />
          </a>
        </li>
      ))}
    </ul>
  );
}

type Status = "idle" | "sending" | "sent" | "error";

/** What has been typed survives re-layouts (rotating a phone rebuilds the pages). */
const draft = { name: "", email: "", message: "" };

function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [v, setV] = useState(draft);
  const set = (k: keyof typeof draft) => (e: { target: { value: string } }) => {
    draft[k] = e.target.value;
    setV({ ...draft });
  };

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = v.name.trim();
    const email = v.email.trim();
    const message = v.message.trim();
    if (!name || !/^\S+@\S+\.\S+$/.test(email) || message.length < 10) {
      setError("Please add your name, a valid email and a message of at least 10 characters.");
      setStatus("error");
      return;
    }
    const clear = () => {
      draft.name = draft.email = draft.message = "";
      setV({ ...draft });
    };
    if (!contactForm.accessKey) {
      // No form key configured yet — fall back to the visitor's mail client.
      const body = encodeURIComponent(`${message}\n\n— ${name} (${email})`);
      window.location.href = `mailto:${profile.email}?subject=${encodeURIComponent(`Hello from ${name}`)}&body=${body}`;
      setStatus("sent");
      return;
    }
    setStatus("sending");
    try {
      const res = await fetch(contactForm.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ access_key: contactForm.accessKey, subject: `Portfolio message from ${name}`, from_name: name, name, email, message }),
      });
      const json = (await res.json()) as { success?: boolean; message?: string };
      if (!res.ok || !json.success) throw new Error(json.message || "Something went wrong.");
      setStatus("sent");
      clear();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }

  return (
    <div className="flex h-full flex-col" data-dynamic>
      <div className="pg-kicker">Send a letter</div>
      <h2 className="pg-title mt-[0.3em]">Dear {profile.firstName},</h2>
      <AnimatePresence mode="wait" initial={false}>
        {status === "sent" ? (
          <motion.div
            key="sent"
            className="flex flex-1 flex-col items-center justify-center text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <svg viewBox="0 0 64 64" className="w-[4em] text-[var(--accent)]" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
              <circle cx="32" cy="32" r="28" opacity="0.35" />
              <motion.path
                d="M20 33l8 8 16-17"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
              />
            </svg>
            <div className="pg-h3 mt-[0.8em]">Your letter is on its way.</div>
            <p className="pg-body mt-[0.4em] max-w-[16em]">Thank you for writing — expect a reply within two days.</p>
            <button type="button" className="btn-ghost mt-[1.2em]" onClick={() => setStatus("idle")}>
              Write another
            </button>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            onSubmit={onSubmit}
            noValidate
            className="mt-[0.9em] flex min-h-0 flex-1 flex-col gap-[0.8em]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <label className="block">
              <span className="pg-small tracking-[0.16em] uppercase">Your name</span>
              <input name="name" className="field" placeholder="Ada Lovelace" autoComplete="name" value={v.name} onChange={set("name")} />
            </label>
            <label className="block">
              <span className="pg-small tracking-[0.16em] uppercase">Email</span>
              <input name="email" type="email" className="field" placeholder="ada@example.com" autoComplete="email" value={v.email} onChange={set("email")} />
            </label>
            <label className="flex min-h-[5.5em] flex-1 flex-col">
              <span className="pg-small tracking-[0.16em] uppercase">Message</span>
              <textarea
                name="message"
                className="field field--lined min-h-0 flex-1 resize-none"
                placeholder="I'd love to talk about…"
                value={v.message}
                onChange={set("message")}
              />
            </label>
            <div className="flex flex-wrap items-center justify-between gap-[0.6em]">
              <span className={`pg-small max-w-[15em] ${status === "error" ? "text-[#a2483a]" : ""}`} role="status">
                {status === "error" ? error : "Sealed and delivered straight to my inbox."}
              </span>
              <button type="submit" className="btn-ink shrink-0" disabled={status === "sending"}>
                {status === "sending" ? "Sending…" : "Send letter"} <Arrow />
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

function ResumeCard() {
  return (
    <div className="card">
      <div className="flex items-center gap-[0.9em]">
        <div className="grid h-[3.1em] w-[2.4em] shrink-0 place-items-center rounded-[0.2em] border border-[var(--rule)] bg-[var(--paper)] text-[0.6em] font-semibold tracking-[0.1em] text-[var(--accent)]">
          PDF
        </div>
        <div className="min-w-0">
          <div className="pg-h3">{profile.name} — Résumé</div>
          <div className="pg-small">
            {profile.role} · {profile.location}
          </div>
        </div>
      </div>
      <a href={profile.resumeUrl} download className="btn-ink mt-[1em] w-full justify-center">
        Download résumé <Arrow className="rotate-90" />
      </a>
    </div>
  );
}

function End() {
  const { goToStart } = useNav();
  return (
    <EndCard
      kicker="Colophon"
      line="Until the next"
      accent="chapter."
      note="Set in Instrument Serif & Inter. Bound with Next.js, animated with GSAP, lit with Three.js."
      action={
        <button type="button" className="btn-ghost" onClick={goToStart}>
          Back to the beginning <Arrow className="-rotate-90" />
        </button>
      }
    />
  );
}

const blocks: Block[] = [
  {
    id: "letter-h",
    keep: true,
    section: "Correspondence",
    node: (
      <Heading
        kicker="Chapter IV"
        title={
          <>
            Let&apos;s write the next chapter <span className="text-[var(--accent)] italic">together.</span>
          </>
        }
        lede="Hiring, collaborating, or just want to talk shop? My inbox is always open — I reply to every letter within two days."
      />
    ),
  },
  { id: "email", node: <Email /> },
  { id: "socials", node: <Socials /> },
  { id: "form", full: true, section: "Send a letter", node: <ContactForm /> },
  {
    id: "resume-h",
    keep: true,
    section: "Résumé",
    node: (
      <Heading
        kicker="The short version"
        title="Prefer it on one page?"
        lede="Everything in these four volumes, condensed into a single-page résumé — ready for your ATS, your inbox or your printer."
      />
    ),
  },
  { id: "resume", node: <ResumeCard /> },
  { id: "end", full: true, node: <End /> },
];

export const contactBook: BookDef = {
  id: "contact",
  label: "Contact",
  volume: "Volume IV",
  leather: "#c3a091",
  accent: "#a2685a",
  silk: "#b4584a",
  glow: [1, 0.88, 0.84],
  cover: <CoverTitle volume="Volume IV" title="Contact" subtitle="Correspondence" icon="mail" />,
  blocks,
  filler: <QuotePage quote="The best projects started with a short, honest message." by="An open invitation" />,
};
