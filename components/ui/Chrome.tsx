"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import { profile } from "@/content/portfolio";
import { audio, type Settings } from "@/lib/audio";
import { asset } from "@/lib/asset";
import { IndexCard, type IndexVolume, type Where } from "./IndexCard";

function SoundToggle() {
  const [st, setSt] = useState<Settings>(audio.settings);
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setSt(audio.settings);
    return audio.subscribe(setSt);
  }, []);
  useEffect(() => {
    if (!open) return;
    const away = (e: Event) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", away);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("pointerdown", away);
      window.removeEventListener("keydown", esc);
    };
  }, [open]);
  const slider = (label: string, v: number, set: (n: number) => void) => (
    <label>
      {label}
      <input type="range" min={0} max={100} value={Math.round(v * 100)} onChange={(e) => set(+e.target.value / 100)} aria-label={label} />
    </label>
  );
  return (
    <div className="sound-wrap" ref={wrap} data-nodrag data-nowheel>
      <button
        type="button"
        className="tool tool-sound"
        data-cursor={st.enabled ? "sound-off" : "sound-on"}
        aria-label={st.enabled ? "Turn sound off" : "Turn sound on"}
        aria-pressed={st.enabled}
        onClick={() => {
          audio.unlock();
          audio.setEnabled(!st.enabled);
        }}
      >
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3 8v4h3l4 3.5v-11L6 8z" fill="currentColor" fillOpacity="0.15" />
          <path className="waves" d="M13 7.5a3.6 3.6 0 0 1 0 5M15.2 5.2a7 7 0 0 1 0 9.6" />
          <path className="slash" d="M13 7.5l5 5M18 7.5l-5 5" />
        </svg>
        <span className="tool-sound-label">{st.enabled ? "Sound on" : "Sound off"}</span>
      </button>
      <button type="button" className="tool tool-vol" aria-label="Volume" aria-expanded={open} data-cursor="open" onClick={() => setOpen(!open)}>
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden>
          <path d="M2 4.5h12M2 8h12M2 11.5h12" />
          <circle cx="10.5" cy="4.5" r="1.6" fill="var(--paper)" />
          <circle cx="5.5" cy="8" r="1.6" fill="var(--paper)" />
          <circle cx="9.5" cy="11.5" r="1.6" fill="var(--paper)" />
        </svg>
      </button>
      {open && (
        <div className="vol-pop" role="group" aria-label="Sound levels">
          <h2>Sound</h2>
          {slider("Master", st.master, (n) => audio.setMasterVolume(n))}
          {slider("Effects", st.sfx, (n) => audio.setSfxVolume(n))}
          {slider("Ambience", st.ambient, (n) => audio.setAmbientVolume(n))}
          <p>Page turns, leather, brass and wood; a faint room and the hour outside.{st.enabled ? "" : " Sound is off."}</p>
        </div>
      )}
    </div>
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
