"use client";

import { forwardRef, useEffect, useState } from "react";
import { profile } from "@/content/portfolio";
import { sound } from "@/lib/audio";
import { asset } from "@/lib/asset";
import { IndexCard, type IndexVolume, type Where } from "./IndexCard";

function SoundToggle() {
  const [muted, setMuted] = useState(false);
  useEffect(() => {
    setMuted(sound.muted);
    return sound.subscribe(setMuted);
  }, []);
  return (
    <button
      type="button"
      className="tool tool-sound"
      data-cursor={muted ? "sound-on" : "sound-off"}
      aria-label={muted ? "Turn sound on" : "Turn sound off"}
      aria-pressed={muted}
      onClick={() => {
        sound.unlock();
        sound.setMuted(!muted);
      }}
    >
      <span aria-hidden>
        <i />
        <i />
        <i />
      </span>
      <span className="tool-sound-label">Sound</span>
    </button>
  );
}

/** Wordmark on the left; on the right, the tab of the index card and the sound button. */
export const TopBar = forwardRef<
  HTMLDivElement,
  { volumes: IndexVolume[]; where: () => Where; onGo: (book: number, id: string | null) => void; onHome: () => void }
>(function TopBar({ volumes, where, onGo, onHome }, ref) {
  return (
    <div ref={ref} className="chrome">
      <div className="brand">
        {/* the monogram, on its dark plate; pressed, it takes you back to the first page */}
        <button type="button" className="brand-logo" aria-label={`${profile.name}: back to the beginning`} data-cursor="go" onClick={onHome}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={asset("/logo-plate.png")} alt="" width={80} height={80} draggable={false} />
        </button>
        <span className="brand-long">{profile.name}</span>
      </div>
      <div className="tools">
        <IndexCard volumes={volumes} where={where} onGo={onGo} />
        <SoundToggle />
      </div>
    </div>
  );
});

const Chevron = ({ flip }: { flip?: boolean }) => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden style={flip ? { transform: "scaleX(-1)" } : undefined}>
    <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** Where you are, and two buttons to move. */
export const Pager = forwardRef<HTMLDivElement, { onPrev: () => void; onNext: () => void }>(function Pager({ onPrev, onNext }, ref) {
  return (
    <div ref={ref} className="chrome pager" role="group" aria-label="Pages">
      <div className="now" aria-hidden>
        <span className="now-dot" />
        <span className="now-text">
          <b data-now-vol>Vol. I</b>
          <span className="now-title">
            {" — "}
            <span data-now-title>About</span>
          </span>
          <span className="now-page" data-now-page />
        </span>
        {/* how far through this volume: a hairline that is inked in as the pages go by */}
        <span className="now-line">
          <i />
        </span>
      </div>
      <div className="pager-nav">
        <button type="button" className="pager-btn" data-prev data-cursor="prev" aria-label="Previous page" onClick={onPrev}>
          <Chevron flip />
        </button>
        <button type="button" className="pager-btn" data-next data-cursor="next" aria-label="Next page" onClick={onNext}>
          <Chevron />
        </button>
      </div>
    </div>
  );
});

export const ScrollHint = forwardRef<HTMLDivElement, { touch: boolean }>(function ScrollHint({ touch }, ref) {
  return (
    <div ref={ref} className="chrome hint" aria-hidden>
      {touch ? "Swipe to turn" : "Scroll, or drag a corner to turn the page"}
    </div>
  );
});

export const IntroControls = forwardRef<HTMLDivElement, { onSkip: () => void; touch: boolean }>(function IntroControls(
  { onSkip, touch },
  ref,
) {
  return (
    <div ref={ref} className="chrome intro-bar">
      <span data-intro-hint className="intro-hint">
        {touch ? "Slide the clasp to unlatch it" : "Pull the clasp to unlatch it"}
      </span>
      <button type="button" onClick={onSkip} data-skip data-cursor="skip" className="skip">
        Skip intro
      </button>
    </div>
  );
});
