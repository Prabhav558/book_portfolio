"use client";

import { createContext, useContext, type ReactNode } from "react";

/** Lets page content (CTAs, "back to start") drive the scroll experience. */
export const NavContext = createContext<{ goToBook: (i: number) => void; goToStart: () => void }>({
  goToBook: () => {},
  goToStart: () => {},
});
export const useNav = () => useContext(NavContext);

/** Section heading. In the flow it keeps a little air above it unless it opens the page. */
export function Heading({ kicker, title, lede }: { kicker: string; title: ReactNode; lede?: string }) {
  return (
    <div className="pg-head">
      <div className="pg-kicker">{kicker}</div>
      <h2 className="pg-title mt-[0.3em]">{title}</h2>
      {lede && <p className="pg-body mt-[0.6em] max-w-[26em]">{lede}</p>}
    </div>
  );
}

/** Closing page of a volume. */
export function EndCard({
  kicker,
  line,
  accent,
  note,
  action,
}: {
  kicker: string;
  line: string;
  accent: string;
  note?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <Fleuron className="w-[8em] text-[var(--accent)] opacity-70" />
      <div className="pg-kicker mt-[1.4em]">{kicker}</div>
      <p className="pg-title mt-[0.5em] text-[2.3em]">
        {line}
        <br />
        <span className="text-[var(--accent)] italic">{accent}</span>
      </p>
      {note && <p className="pg-body mt-[0.9em] max-w-[18em]">{note}</p>}
      {action && <div className="mt-[1.4em]">{action}</div>}
    </div>
  );
}

/** A quiet typographic page, used when a two-page book needs one more page. */
export function QuotePage({ quote, by }: { quote: string; by: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-[0.5em] text-center">
      <span className="font-serif text-[4em] leading-[0.6] text-[var(--accent)] opacity-40">“</span>
      <p className="pg-title mt-[0.2em] text-[1.7em] leading-[1.2] italic">{quote}</p>
      <div className="mt-[1.2em] h-px w-[3em] bg-[var(--accent)] opacity-50" />
      <p className="pg-small mt-[0.9em] tracking-[0.18em] uppercase">{by}</p>
    </div>
  );
}

export function Fleuron({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 16" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="1">
      <path d="M2 8h44" />
      <path d="M74 8h44" />
      <path d="M60 2c-4 0-7 3-7 6s3 6 7 6 7-3 7-6-3-6-7-6Z" />
      <path d="M53 8c-2-2-4-2-6 0 2 2 4 2 6 0Z M67 8c2-2 4-2 6 0-2 2-4 2-6 0Z" fill="currentColor" />
      <circle cx="60" cy="8" r="1.6" fill="currentColor" />
    </svg>
  );
}

export function Arrow({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} width="1em" height="1em" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ArrowUpRight({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} width="1em" height="1em" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M5 11l6-6M6 5h5v5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}


export type IconKind = "book" | "grid" | "timeline" | "mail";

/** Single-line cover icons, drawn to be debossed into the cloth. */
export function CoverIcon({ kind, className = "" }: { kind: IconKind; className?: string }) {
  const shape =
    kind === "book" ? (
      <>
        <rect x="9" y="5" width="30" height="38" rx="2.5" />
        <path d="M15 5v38" />
        <rect x="20" y="13" width="13" height="14" rx="1.5" />
        <path d="M20 33h13M20 37h8" />
      </>
    ) : kind === "grid" ? (
      <>
        <rect x="7" y="7" width="15" height="15" rx="2.5" />
        <rect x="26" y="7" width="15" height="15" rx="2.5" />
        <rect x="7" y="26" width="15" height="15" rx="2.5" />
        <rect x="26" y="26" width="15" height="15" rx="2.5" />
      </>
    ) : kind === "timeline" ? (
      <>
        <path d="M14 6v36" />
        <circle cx="14" cy="12" r="3" />
        <circle cx="14" cy="24" r="3" />
        <circle cx="14" cy="36" r="3" />
        <path d="M22 12h16M22 24h12M22 36h15" />
      </>
    ) : (
      <>
        <rect x="5" y="11" width="38" height="26" rx="3" />
        <path d="m6 14 18 14 18-14" />
      </>
    );
  // the pressed-in look comes from a dark and a light copy offset by a hair (no filters: they are slow to redraw)
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <g stroke="rgba(0,0,0,0.26)" transform="translate(0 -0.35)">
        {shape}
      </g>
      <g stroke="rgba(255,255,255,0.3)" transform="translate(0 0.35)">
        {shape}
      </g>
      <g stroke="rgba(255,255,255,0.86)">{shape}</g>
    </svg>
  );
}

/** Minimal cover typography shared by all four volumes: a debossed line icon and a quiet label. */
export function CoverTitle({
  volume,
  title,
  subtitle,
  icon,
}: {
  volume: string;
  title: ReactNode;
  subtitle: string;
  icon: IconKind;
}) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-between px-[8cqw] pt-[13cqh] pb-[11cqh] text-center">
      <div className="foil font-sans text-[3.1cqw] font-medium tracking-[0.5em] uppercase">{volume}</div>
      <div className="flex flex-col items-center gap-[8cqw]">
        <CoverIcon kind={icon} className="w-[36cqw]" />
        <div className="foil font-sans text-[5.4cqw] leading-tight font-semibold tracking-[0.3em] uppercase">{title}</div>
      </div>
      <div className="foil font-sans text-[2.9cqw] tracking-[0.28em] uppercase opacity-80">{subtitle}</div>
    </div>
  );
}