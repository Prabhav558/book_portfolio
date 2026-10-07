"use client";

import { createContext, useContext, type CSSProperties, type ReactNode } from "react";

/** Lets page content (links, "back to start") drive the book. */
export const NavContext = createContext<{
  goToBook: (i: number) => void;
  goToStart: () => void;
  /** Open a volume at a named page (null = its first page). */
  goTo: (book: number, id: string | null) => void;
}>({
  goToBook: () => {},
  goToStart: () => {},
  goTo: () => {},
});
export const useNav = () => useContext(NavContext);

export function Arrow({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M2 8h11M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ArrowUpRight({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M4.5 11.5l7-7M6 4.5h5.5V10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** An underlined text link with an arrow — the only kind of link on a page. */
export function TextLink({
  children,
  href,
  onClick,
  external,
  download,
  className = "",
}: {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  external?: boolean;
  download?: boolean;
  className?: string;
}) {
  const cls = `link ${external ? "link--up" : ""} ${className}`;
  const icon = external ? <ArrowUpRight /> : <Arrow />;
  if (href) {
    return (
      <a href={href} className={cls} download={download} {...(external ? { target: "_blank", rel: "noreferrer" } : {})}>
        {children}
        {external && <span className="sr-only"> (opens in a new tab)</span>}
        {icon}
      </a>
    );
  }
  return (
    <button type="button" className={cls} onClick={onClick}>
      {children}
      {icon}
    </button>
  );
}

/** Display type that must fit one line: shrinks with the length of the text. */
export const fit = (text: string, max: number, widthCqw = 78, glyph = 0.47): CSSProperties =>
  ({ "--fit": `${Math.min(max, widthCqw / (Math.max(text.length, 1) * glyph)).toFixed(2)}cqw` }) as CSSProperties;

/** Chapter opener, printed on a full page of the volume's colour. */
export function Opener({ num, chapter, title, blurb }: { num: string; chapter: string; title: string; blurb: string }) {
  return (
    <div className="flex h-full flex-col justify-between">
      <div className="t-meta flex justify-between">
        <span>Chapter</span>
        <span>{chapter}</span>
      </div>
      <div>
        <div className="t-num" aria-hidden>
          {num}
        </div>
        <h2 className="t-h1 mt-[6cqw]">{title}</h2>
        <p className="t-body mt-[3.5cqw] max-w-[19em]">{blurb}</p>
      </div>
    </div>
  );
}

/** Last page of a volume: one large link to whatever comes next. */
export function NextPage({ meta, title, sub, onClick }: { meta: string; title: string; sub: string; onClick: () => void }) {
  return (
    <div className="flex h-full flex-col justify-between">
      <div className="t-meta">{meta}</div>
      <button type="button" onClick={onClick} className="next text-left" data-cursor="Next">
        <div className="t-meta">Next</div>
        <div className="t-h1 mt-[3cqw] flex items-center gap-[4cqw]">
          <em>{title}</em>
          <Arrow className="next-arrow h-[0.5em] w-[0.5em] shrink-0" />
        </div>
        <div className="t-body mt-[3.5cqw]">{sub}</div>
      </button>
    </div>
  );
}

/** A quiet typographic page, used when a two-page book needs one more page. */
export function QuotePage({ quote, by }: { quote: string; by: string }) {
  return (
    <div className="flex h-full flex-col justify-between">
      <div className="t-meta">Note</div>
      <div>
        <p className="t-statement">
          <em>{quote}</em>
        </p>
        <p className="t-meta mt-[5cqw]">— {by}</p>
      </div>
    </div>
  );
}

export type IconKind = "book" | "grid" | "timeline" | "mail";

/** Single-line cover icons, pressed into the cloth. */
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
    <svg viewBox="0 0 48 48" className={className} fill="none" strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <g stroke="rgba(0,0,0,0.24)" transform="translate(0 -0.3)">
        {shape}
      </g>
      <g stroke="rgba(255,255,255,0.28)" transform="translate(0 0.3)">
        {shape}
      </g>
      <g stroke="rgba(255,255,255,0.88)">{shape}</g>
    </svg>
  );
}

/** The cover: one debossed icon, the title, and the volume mark. Nothing else. */
export function CoverTitle({ volume, title, icon }: { volume: string; title: string; icon: IconKind }) {
  return (
    <div className="deboss flex h-full w-full flex-col items-center justify-between pt-[31cqh] pb-[6.5cqh] text-center font-sans">
      <div className="flex flex-col items-center gap-[7.5cqw]">
        {/* the data-cover-* marks tell the opening sketch where to draw (lib/sketch.ts) */}
        <div data-cover-icon>
          <CoverIcon kind={icon} className="w-[29cqw]" />
        </div>
        <div data-cover-title className="pl-[0.32em] text-[4.3cqw] leading-tight font-semibold tracking-[0.32em] uppercase">
          {title}
        </div>
      </div>
      <div data-cover-mark className="pl-[0.34em] text-[2.6cqw] font-medium tracking-[0.34em] uppercase opacity-80">
        {volume}
      </div>
    </div>
  );
}
