"use client";

import { useState, type FormEvent } from "react";
import { contactForm, profile, socials } from "@/content/portfolio";
import type { Block, BookDef } from "@/components/book/types";
import { PALETTE } from "@/content/palette";
import { Arrow, ArrowUpRight, CoverTitle, Opener, QuotePage, TextLink, fit, useNav } from "./primitives";

function Reach() {
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
    <div className="flex h-full flex-col justify-between">
      <div className="t-meta">Write to</div>
      <div>
        <a href={`mailto:${profile.email}`} className="t-h2 block" style={fit(profile.email, 8.6, 79, 0.43)}>
          {profile.email}
        </a>
        <div className="mt-[5cqw] flex flex-wrap gap-x-[1.6em] gap-y-[0.6em] text-[0.95em]">
          <button type="button" className="link" onClick={copy}>
            {copied ? "Copied" : "Copy address"}
          </button>
          <TextLink href={profile.resumeUrl} download>
            Résumé, PDF
          </TextLink>
        </div>
      </div>
      <div className="rows rows--tight">
        {socials.map((s) => (
          <a key={s.label} href={s.url} target="_blank" rel="noreferrer" className="social flex items-baseline justify-between gap-[1em]">
            <span className="text-[0.98em] font-medium">{s.label}</span>
            <span className="t-fig flex items-center gap-[0.6em]">
              {s.handle}
              <ArrowUpRight className="h-[0.9em] w-[0.9em]" />
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}

type Status = "idle" | "sending" | "sent" | "error";

/** What has been typed survives re-layouts (rotating a phone rebuilds the pages). */
const draft = { name: "", email: "", message: "" };

function Letter() {
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
      setError("Add your name, a valid email and a few words.");
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
        body: JSON.stringify({ access_key: contactForm.accessKey, subject: `Portfolio message from ${name}`, from_name: name, name, email, message }),
      });
      const json = (await res.json()) as { success?: boolean; message?: string };
      if (!res.ok || !json.success) throw new Error(json.message || "Something went wrong.");
      draft.name = draft.email = draft.message = "";
      setV({ ...draft });
      setStatus("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="flex h-full flex-col justify-between" data-dynamic>
        <div className="t-meta">A letter</div>
        <div>
          <p className="t-h2">
            Sent. <em>Thank you.</em>
          </p>
          <p className="t-body mt-[4cqw] max-w-[20em]">I read everything and reply within two days.</p>
        </div>
        <div>
          <button type="button" className="link" onClick={() => setStatus("idle")}>
            Write another
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex h-full flex-col" data-dynamic>
      <div className="t-meta">A letter</div>
      <h2 className="t-h2 mt-[5cqw]">
        Dear <em>{profile.firstName},</em>
      </h2>
      <div className="mt-[5cqw] flex min-h-0 flex-1 flex-col gap-[0.9em]">
        <label className="block">
          <span className="t-meta">Your name</span>
          <input name="name" className="field" autoComplete="name" value={v.name} onChange={set("name")} />
        </label>
        <label className="block">
          <span className="t-meta">Email</span>
          <input name="email" type="email" className="field" autoComplete="email" value={v.email} onChange={set("email")} />
        </label>
        <label className="flex min-h-[5.5em] flex-1 flex-col">
          <span className="t-meta">Message</span>
          <textarea name="message" className="field field--lined min-h-0 flex-1 resize-none" value={v.message} onChange={set("message")} />
        </label>
      </div>
      <div className="mt-[1em] flex items-center justify-between gap-[1em]">
        <span className={`t-meta ${status === "error" ? "!text-[#a2483a]" : ""}`} role="status">
          {status === "error" ? error : "Goes straight to my inbox"}
        </span>
        <button type="submit" className="btn shrink-0" disabled={status === "sending"}>
          {status === "sending" ? "Sending" : "Send"} <Arrow />
        </button>
      </div>
    </form>
  );
}

function Colophon() {
  const { goToStart } = useNav();
  return (
    <div className="flex h-full flex-col justify-between">
      <div className="t-meta">Colophon</div>
      <div>
        <p className="t-h1">
          Thank <em>you.</em>
        </p>
        <p className="t-body mt-[5cqw] max-w-[19em]">
          Set in Instrument Serif and Instrument Sans. Built with Next.js, animated with GSAP, lit with Three.js.
        </p>
      </div>
      <div>
        <TextLink onClick={goToStart}>Back to the beginning</TextLink>
      </div>
    </div>
  );
}

const blocks: Block[] = [
  {
    id: "opener",
    full: true,
    tone: true,
    node: <Opener num="04" chapter="IV" title="Contact" blurb="Hiring, collaborating, or just want to talk shop? I answer every message." />,
  },
  { id: "reach", full: true, node: <Reach /> },
  { id: "letter", full: true, node: <Letter /> },
  { id: "colophon", full: true, node: <Colophon /> },
];

export const contactBook: BookDef = {
  id: "contact",
  label: "Contact",
  volume: "Vol. IV",
  palette: PALETTE.contact,
  cover: <CoverTitle volume="Vol. IV" title="Contact" icon="mail" />,
  blocks,
  filler: <QuotePage quote="The best projects started with a short, honest message." by="An open invitation" />,
};
