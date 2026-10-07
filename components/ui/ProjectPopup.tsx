"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { Project } from "@/content/portfolio";
import { TextLink } from "@/components/pages/primitives";
import { gsap } from "@/lib/gsap";
import { overlay } from "@/lib/overlay";
import { projectPopup } from "@/lib/popup";

/** "ledgerline.app", "github.com/alex/ledgerline": an address as you would say it. */
const address = (url: string) => {
  try {
    const u = new URL(url);
    return (u.host.replace(/^www\./, "") + u.pathname).replace(/\/$/, "");
  } catch {
    return url;
  }
};

/**
 * A project's card, laid on the table over the book: what it is, what it is made of, where to find it.
 * While it is up the book underneath does not move (lib/overlay). Escape, the cross or a press outside closes it.
 */
export function ProjectPopup() {
  const [p, setP] = useState<Project | null>(null);
  const veil = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const from = useRef<HTMLElement | null>(null);
  const leaving = useRef(false);

  useEffect(
    () =>
      projectPopup.subscribe((next) => {
        if (overlay.open) return;
        from.current = document.activeElement as HTMLElement | null;
        leaving.current = false;
        overlay.open = true;
        setP(next);
      }),
    [],
  );

  const close = useCallback(() => {
    if (leaving.current || !card.current) return;
    leaving.current = true;
    gsap.to(veil.current, { opacity: 0, duration: 0.25, ease: "power1.in" });
    gsap.to(card.current, {
      y: 16,
      scale: 0.97,
      opacity: 0,
      duration: 0.26,
      ease: "power2.in",
      onComplete: () => {
        overlay.open = false;
        setP(null);
        from.current?.focus({ preventScroll: true });
      },
    });
  }, []);

  useEffect(() => {
    if (!p || !card.current) return;
    gsap.fromTo(veil.current, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power1.out" });
    gsap.fromTo(card.current, { y: 22, scale: 0.97, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.5, ease: "power3.out" });
    card.current.querySelector<HTMLElement>(".pop-close")?.focus({ preventScroll: true });
    const esc = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [p, close]);

  // if the scene is rebuilt while the card is up, do not leave input locked
  useEffect(
    () => () => {
      overlay.open = false;
    },
    [],
  );

  /** Tab stays on the card while it is up. */
  const trap = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab" || !card.current) return;
    const items = Array.from(card.current.querySelectorAll<HTMLElement>("button, a[href]"));
    if (!items.length) return;
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

  if (!p) return null;
  return (
    <div ref={veil} className="pop-veil" onClick={close}>
      <div ref={card} className="pop-card" role="dialog" aria-modal="true" aria-labelledby="pop-title" onClick={(e) => e.stopPropagation()} onKeyDown={trap}>
        <header className="pop-head">
          <span>Project · {p.year}</span>
          <button type="button" className="pop-close" aria-label="Close" data-cursor="close" onClick={close}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
              <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" strokeLinecap="round" />
            </svg>
          </button>
        </header>
        <h2 id="pop-title" className="pop-title">
          {p.title}
        </h2>
        <p className="pop-summary">{p.summary}</p>
        {p.details && p.details.length > 0 && (
          <ul className="pop-points">
            {p.details.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        )}
        <div className="pop-tags" aria-label="Made with">
          {p.tags.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
        {(p.live || p.code) && (
          <div className="pop-links">
            {p.live && (
              <TextLink href={p.live} external>
                {address(p.live)}
              </TextLink>
            )}
            {p.code && (
              <TextLink href={p.code} external>
                {address(p.code)}
              </TextLink>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
