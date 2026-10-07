"use client";

import type { ReactNode } from "react";
import { profile, socials } from "@/content/portfolio";

const Icon = ({ children }: { children: ReactNode }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {children}
  </svg>
);

const GLYPH: Record<string, ReactNode> = {
  GitHub: (
    <Icon>
      <path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.500 2.800 5.400 3.100 5.400 3.100a4.200 4.200 0 0 0-.1 3.200A4.600 4.600 0 0 0 4 9.500c0 4.600 2.700 5.700 5.500 6-.6.600-.6 1.200-.5 2V21" />
    </Icon>
  ),
  LinkedIn: (
    <Icon>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2zM4 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
    </Icon>
  ),
  Résumé: (
    <Icon>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h4" />
    </Icon>
  ),
  Email: (
    <Icon>
      <path d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM3 7l9 6 9-6" />
    </Icon>
  ),
};

/**
 * A tab on the right edge of the screen: a small rectangle fixed to the border, its two outer corners curved,
 * holding the places to find Prabhav. Each opens its label to the left on hover.
 */
export function SideDock() {
  const items: { label: string; href: string; download?: boolean; external?: boolean }[] = [
    ...socials.filter((s) => s.label === "GitHub" || s.label === "LinkedIn").map((s) => ({ label: s.label, href: s.url, external: true })),
    { label: "Résumé", href: profile.resumeUrl, download: true },
    { label: "Email", href: `mailto:${profile.email}` },
  ];
  return (
    <nav className="dock" aria-label="Find me elsewhere">
      {items.map((i) => (
        <a
          key={i.label}
          className="dock-item"
          href={i.href}
          download={i.download}
          {...(i.external ? { target: "_blank", rel: "noreferrer" } : {})}
          data-cursor={i.download ? "save" : i.external ? "visit" : "write"}
        >
          {GLYPH[i.label]}
          <span className="dock-label">{i.label}</span>
          <span className="sr-only">{i.external ? " (opens in a new tab)" : ""}</span>
        </a>
      ))}
    </nav>
  );
}
