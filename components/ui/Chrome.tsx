"use client";

import Link from "next/link";
import { forwardRef, useEffect, useState, type CSSProperties } from "react";
import { profile } from "@/content/portfolio";
import { sound } from "@/lib/audio";
import type { BookDef } from "@/components/book/types";

export function MuteToggle() {
  const [muted, setMuted] = useState(false);
  useEffect(() => {
    setMuted(sound.muted);
    return sound.subscribe(setMuted);
  }, []);
  const bars = [0.45, 0.9, 0.6, 1, 0.5];
  return (
    <button
      type="button"
      className="icon-btn"
      aria-label={muted ? "Unmute sound" : "Mute sound"}
      aria-pressed={muted}
      onClick={() => {
        sound.unlock();
        sound.setMuted(!muted);
      }}
    >
      <span className="flex h-[14px] items-center gap-[2.5px]">
        {bars.map((h, i) => (
          <span key={i} className="eq-bar" style={{ "--h": h } as CSSProperties} />
        ))}
      </span>
    </button>
  );
}

export const TopBar = forwardRef<HTMLDivElement>(function TopBar(_, ref) {
  return (
    <div ref={ref} className="chrome topbar fixed inset-x-0 top-0 flex items-start justify-between p-4 sm:p-6">
      <div className="topbar-id flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-full border border-black/15 font-serif text-[13px] tracking-[0.06em] text-[var(--ivory)] italic">
          {profile.monogram}
        </span>
        <span className="hidden flex-col leading-tight lg:flex">
          <span className="font-serif text-[15px] text-[var(--ivory)]">{profile.name}</span>
          <span className="text-[10px] tracking-[0.2em] text-[var(--ivory-dim)] uppercase">{profile.role}</span>
        </span>
      </div>
      <div className="pointer-events-auto flex items-center gap-2 sm:gap-3">
        <Link href="/quick" className="pill-link hidden sm:inline-block">
          Quick view
        </Link>
        <MuteToggle />
      </div>
    </div>
  );
});

export const NowReading = forwardRef<HTMLDivElement>(function NowReading(_, ref) {
  return (
    <div ref={ref} className="chrome now" aria-live="polite">
      <span className="now-dot" />
      <span className="now-text">
        <b data-now-vol>Volume I</b>
        <span className="mx-2 opacity-50">·</span>
        <span data-now-title>About</span>
        <span className="now-page" data-now-page />
      </span>
    </div>
  );
});

export const Rail = forwardRef<HTMLDivElement, { books: BookDef[]; onPick: (i: number) => void }>(function Rail(
  { books, onPick },
  ref,
) {
  return (
    <nav ref={ref} className="chrome rail" aria-label="Volumes">
      {books.map((b, i) => (
        <button
          key={b.id}
          type="button"
          className="rail-item"
          data-rail={i}
          style={{ "--c": b.silk } as CSSProperties}
          onClick={(e) => {
            if (e.detail > 0) e.currentTarget.blur();
            onPick(i);
          }}
        >
          <span className="rail-label">{b.label}</span>
          <span className="rail-track">
            <span className="rail-fill" data-rail-fill />
          </span>
        </button>
      ))}
    </nav>
  );
});

export const ScrollHint = forwardRef<HTMLDivElement>(function ScrollHint(_, ref) {
  return (
    <div
      ref={ref}
      className="chrome hint pointer-events-none fixed bottom-[96px] left-1/2 flex -translate-x-1/2 flex-col items-center gap-3 md:bottom-auto md:left-8 md:top-1/2 md:-translate-x-0 md:-translate-y-1/2 md:flex-col-reverse md:gap-5"
      aria-hidden
    >
      <span className="relative block h-[30px] w-[19px] rounded-full border border-[rgba(37,39,42,0.4)]">
        <span className="wheel-dot absolute top-[6px] left-1/2 block h-[6px] w-[2px] rounded-full bg-[var(--ivory)]" />
      </span>
      <span className="text-[10px] tracking-[0.3em] whitespace-nowrap text-[var(--ivory-dim)] uppercase md:rotate-180 md:[writing-mode:vertical-rl]">
        <span className="hidden md:inline">Scroll or drag to turn pages</span>
        <span className="md:hidden">Swipe to turn pages</span>
      </span>
    </div>
  );
});

export const IntroControls = forwardRef<HTMLDivElement, { onSkip: () => void }>(function IntroControls({ onSkip }, ref) {
  return (
    <div ref={ref} className="chrome pointer-events-none fixed inset-x-0 bottom-0 flex items-end justify-end p-4 sm:p-6">
      <span
        data-intro-hint
        className="absolute bottom-[76px] left-1/2 -translate-x-1/2 text-[10px] tracking-[0.3em] whitespace-nowrap text-[var(--ivory-dim)] uppercase sm:bottom-7 sm:left-7 sm:translate-x-0 sm:text-[11px]"
      >
        Click the clasp to begin
      </span>
      <button type="button" onClick={onSkip} data-skip className="pill-link pointer-events-auto">
        Skip intro →
      </button>
    </div>
  );
});
