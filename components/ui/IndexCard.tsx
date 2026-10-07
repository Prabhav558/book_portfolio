"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { profile } from "@/content/portfolio";
import { audio } from "@/lib/audio";
import { gsap } from "@/lib/gsap";
import { overlay } from "@/lib/overlay";

export type IndexVolume = {
  book: number;
  roman: string;
  label: string;
  blurb: string;
  accent: string;
  pages: number;
  entries: { id: string; name: string; page: number }[];
};
export type Where = { book: number; id: string | null } | null;

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * The index: a library card that is pulled out from behind its tab. It lists every volume and
 * the pages in it, marks where you are, and takes you anywhere in one move.
 */
export function IndexCard({
  volumes,
  where,
  onGo,
}: {
  volumes: IndexVolume[];
  /** Which page is open right now. */
  where: () => Where;
  onGo: (book: number, id: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [here, setHere] = useState<Where>(null);
  const tab = useRef<HTMLButtonElement>(null);
  const veil = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const leaving = useRef(false);

  /** On a phone the card comes up from the bottom edge; elsewhere it is drawn down from its tab. */
  const fromBelow = () => card.current?.closest<HTMLElement>("[data-kind]")?.dataset.kind === "phone";

  const show = () => {
    setHere(where());
    overlay.open = true;
    leaving.current = false;
    setOpen(true);
  };
  const close = useCallback((then?: () => void) => {
    if (leaving.current || !card.current) return;
    leaving.current = true;
    const below = fromBelow();
    gsap.to(veil.current, { opacity: 0, duration: 0.3, ease: "power1.in" });
    gsap.to(card.current, {
      yPercent: below ? 112 : -112,
      rotation: below ? 0 : -4,
      duration: 0.36,
      ease: "power2.in",
      onComplete: () => {
        overlay.open = false;
        setOpen(false);
        tab.current?.focus({ preventScroll: true });
        then?.();
      },
    });
  }, []);

  useEffect(() => {
    if (!open || !card.current) return;
    const below = fromBelow();
    audio.playPaper();
    gsap.fromTo(veil.current, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: "power1.out" });
    gsap.fromTo(
      card.current,
      { yPercent: below ? 112 : -112, rotation: below ? 0 : -5 },
      { yPercent: 0, rotation: below ? 0 : -0.8, duration: 0.7, ease: "power3.out" },
    );
    // the card is pulled out first; its lines then settle onto it one after another
    gsap.fromTo(
      card.current.querySelectorAll(".index-head, .index-vols > li, .index-foot"),
      { opacity: 0, y: below ? 14 : 10 },
      { opacity: 1, y: 0, duration: 0.5, ease: "power2.out", stagger: 0.07, delay: 0.28, clearProps: "opacity,transform" },
    );
    // start on the page that is open, so Enter takes you nowhere new and the arrows start from here
    const current = card.current.querySelector<HTMLElement>('[aria-current="page"], [aria-current="true"]');
    (current ?? card.current.querySelector<HTMLElement>("button"))?.focus({ preventScroll: true });
    const esc = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open, close]);

  // if the scene is rebuilt while the card is open, do not leave input locked
  useEffect(
    () => () => {
      overlay.open = false;
    },
    [],
  );

  /** Tab stays on the card while it is out. */
  const trap = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!card.current) return;
    const items = Array.from(card.current.querySelectorAll<HTMLElement>("button, a[href]"));
    if (!items.length) return;
    // the arrows walk down and up the card, as a finger would run down a printed index
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const at = items.indexOf(document.activeElement as HTMLElement);
      const next = (at + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
      items[next].focus();
      return;
    }
    if (e.key !== "Tab") return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const go = (book: number, id: string | null) => close(() => onGo(book, id));

  return (
    <>
      <button
        ref={tab}
        type="button"
        className="index-tab"
        aria-haspopup="dialog"
        aria-expanded={open}
        data-cursor="index"
        onClick={() => (open ? close() : show())}
      >
        Index
      </button>
      {open && (
        <div ref={veil} className="index-veil" onClick={() => close()}>
          <div
            ref={card}
            className="index-card"
            role="dialog"
            aria-modal="true"
            aria-label="Index"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={trap}
          >
            <header className="index-head">
              <span>Index</span>
              <span className="index-owner">{profile.name}</span>
              <button type="button" className="index-close" aria-label="Close the index" data-cursor="close" onClick={() => close()}>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
                  <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" strokeLinecap="round" />
                </svg>
              </button>
            </header>
            <ol className="index-vols">
              {volumes.map((v) => (
                <li key={v.book} style={{ "--c": v.accent } as CSSProperties}>
                  <button
                    type="button"
                    className="index-vol"
                    aria-current={here?.book === v.book && !v.entries.some((e) => e.id === here.id) ? "true" : undefined}
                    data-here={here?.book === v.book ? "" : undefined}
                    data-cursor="open"
                    onClick={() => go(v.book, null)}
                  >
                    <span className="index-roman">{pad(v.book + 1)}</span>
                    <span className="index-title">{v.label}</span>
                    <span className="index-pp">{v.pages} pp.</span>
                    <span className="index-blurb">{v.blurb}</span>
                  </button>
                  <ul className="index-entries">
                    {v.entries.map((e) => (
                      <li key={e.id}>
                        <button
                          type="button"
                          className="index-entry"
                          aria-current={here?.book === v.book && here.id === e.id ? "page" : undefined}
                          data-cursor="go"
                          onClick={() => go(v.book, e.id)}
                        >
                          <span>{e.name}</span>
                          <i aria-hidden />
                          <span>{pad(e.page)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
            <footer className="index-foot">
              <Link href="/quick" className="link">
                Read it as a plain page
              </Link>
              <span>Esc closes</span>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}
