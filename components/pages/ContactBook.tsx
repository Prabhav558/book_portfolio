"use client";

import { useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { contactForm, profile, socials } from "@/content/portfolio";
import type { BookDef } from "@/components/book/types";
import { Arrow, ArrowUpRight, CoverTitle, Fleuron, Page, useNav } from "./primitives";

function Letter() {
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
    <Page runner={["Volume IV", "Correspondence"]}>
      <div className="pg-kicker">Chapter IV</div>
      <h2 className="pg-title mt-[0.35em]">
        Let&apos;s write the next chapter <span className="italic text-[var(--accent)]">together.</span>
      </h2>
      <p className="pg-body mt-[0.9em]">
        Hiring, collaborating, or just want to talk shop? My inbox is always open — I reply to every letter within two days.
      </p>
      <div className="mt-[1.3em]">
        <div className="pg-small tracking-[0.18em] uppercase">Write to</div>
        <div className="mt-[0.3em] flex items-center gap-[0.6em]">
          <a href={`mailto:${profile.email}`} className="font-serif text-[1.3em] text-[var(--ink)] underline decoration-[var(--accent)]/40 decoration-1 underline-offset-[0.2em] hover:decoration-[var(--accent)]">
            {profile.email}
          </a>
          <button type="button" onClick={copy} className="tag cursor-pointer transition-colors hover:bg-white/70">
            {copied ? "Copied ✓" : "Copy"}
          </button>
        </div>
      </div>
      <div className="flex-1" />
      <ul className="grid grid-cols-2 gap-x-[1em] border-t border-[var(--rule)] pt-[0.6em]">
        {socials.map((s) => (
          <li key={s.label}>
            <motion.a
              href={s.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between border-b border-[var(--rule)] py-[0.7em] text-[var(--ink)]"
              whileHover={{ x: 3 }}
              transition={{ type: "spring", stiffness: 320, damping: 24 }}
            >
              <span>
                <span className="block font-serif text-[0.98em]">{s.label}</span>
                <span className="pg-small block">{s.handle}</span>
              </span>
              <ArrowUpRight className="text-[var(--accent)]" />
            </motion.a>
          </li>
        ))}
      </ul>
      <div className="h-[1.6em]" />
    </Page>
  );
}

type Status = "idle" | "sending" | "sent" | "error";

function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();
    if (!name || !/^\S+@\S+\.\S+$/.test(email) || message.length < 10) {
      setError("Please add your name, a valid email and a message of at least 10 characters.");
      setStatus("error");
      return;
    }
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
        body: JSON.stringify({
          access_key: contactForm.accessKey,
          subject: `Portfolio message from ${name}`,
          from_name: name,
          name,
          email,
          message,
        }),
      });
      const json = (await res.json()) as { success?: boolean; message?: string };
      if (!res.ok || !json.success) throw new Error(json.message || "Something went wrong.");
      setStatus("sent");
      form.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }

  return (
    <Page runner={["Volume IV", "Send a letter"]}>
      <div className="pg-kicker">Send a letter</div>
      <h2 className="pg-title mt-[0.35em]">Dear {profile.firstName},</h2>
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
            className="mt-[1.1em] flex flex-1 flex-col gap-[1em]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <label className="block">
              <span className="pg-small tracking-[0.16em] uppercase">Your name</span>
              <input name="name" className="field" placeholder="Ada Lovelace" autoComplete="name" />
            </label>
            <label className="block">
              <span className="pg-small tracking-[0.16em] uppercase">Email</span>
              <input name="email" type="email" className="field" placeholder="ada@example.com" autoComplete="email" />
            </label>
            <label className="flex min-h-0 flex-1 flex-col">
              <span className="pg-small tracking-[0.16em] uppercase">Message</span>
              <textarea
                name="message"
                className="field min-h-[4em] flex-1 resize-none leading-[1.6]"
                placeholder="I'd love to talk about…"
                style={{
                  backgroundImage: "repeating-linear-gradient(transparent 0 calc(1.6em - 1px), rgba(43,33,24,0.12) calc(1.6em - 1px) 1.6em)",
                  backgroundAttachment: "local",
                }}
              />
            </label>
            <div className="flex items-center justify-between gap-[0.8em]">
              <span className={`pg-small max-w-[16em] ${status === "error" ? "text-[#9b3b30]" : ""}`} role="status">
                {status === "error" ? error : "Sealed and delivered straight to my inbox."}
              </span>
              <button type="submit" className="btn-ink shrink-0" disabled={status === "sending"}>
                {status === "sending" ? "Sending…" : "Send letter"} <Arrow />
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
      <div className="h-[1.6em]" />
    </Page>
  );
}

function Resume() {
  return (
    <Page runner={["Volume IV", "Résumé"]}>
      <div className="pg-kicker">The short version</div>
      <h2 className="pg-title mt-[0.35em]">Prefer it on one page?</h2>
      <p className="pg-body mt-[0.8em]">
        Everything in these four volumes, condensed into a single-page résumé — ready for your ATS, your inbox or your printer.
      </p>
      <div className="mt-[1.5em] rounded-[0.4em] border border-[var(--rule)] bg-white/30 p-[1.1em]">
        <div className="flex items-center gap-[0.9em]">
          <div className="grid h-[3.2em] w-[2.5em] shrink-0 place-items-center rounded-[0.2em] border border-[var(--rule)] bg-[var(--paper)] font-serif text-[0.7em] italic text-[var(--accent)]">
            PDF
          </div>
          <div className="min-w-0">
            <div className="pg-h3 text-[1.05em]">{profile.name} — Résumé</div>
            <div className="pg-small">{profile.role} · {profile.location}</div>
          </div>
        </div>
        <a href={profile.resumeUrl} download className="btn-ink mt-[1.1em] w-full justify-center">
          Download résumé <Arrow className="rotate-90" />
        </a>
      </div>
      <div className="flex-1" />
      <div className="h-[1.6em]" />
    </Page>
  );
}

function Colophon() {
  const { goToStart } = useNav();
  return (
    <Page className="items-center justify-center text-center">
      <Fleuron className="w-[9em] text-[var(--accent)] opacity-70" />
      <p className="mt-[1.3em] font-serif text-[2em] leading-[1.1] text-[var(--ink)]">
        Until the next
        <br />
        <span className="italic text-[var(--accent)]">chapter.</span>
      </p>
      <p className="mt-[0.9em] font-serif text-[1.1em] italic text-[#4a3b2e]">— {profile.firstName}</p>
      <div className="mt-[2em] max-w-[18em] border-t border-[var(--rule)] pt-[1em]">
        <div className="pg-kicker">Colophon</div>
        <p className="pg-small mt-[0.5em]">
          Set in Playfair Display &amp; Inter. Bound with Next.js, animated with GSAP, lit with Three.js.
        </p>
      </div>
      <button type="button" className="btn-ghost mt-[1.5em]" onClick={goToStart}>
        Back to the beginning <Arrow className="-rotate-90" />
      </button>
    </Page>
  );
}

export const contactBook: BookDef = {
  id: "contact",
  label: "Contact",
  leather: "#c3a091",
  accent: "#a2685a",
  silk: "#b4584a",
  glow: [1, 0.88, 0.84],
  cover: <CoverTitle volume="Volume IV" title="Contact" subtitle="Correspondence" icon="mail" />,
  spreads: [
    [<Letter key="letter" />, <ContactForm key="form" />],
    [<Resume key="resume" />, <Colophon key="colophon" />],
  ],
};
