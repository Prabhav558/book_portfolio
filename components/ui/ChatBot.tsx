"use client";

import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";
import { profile } from "@/content/portfolio";
import { GREETING, reply } from "@/lib/chat/brain";
import { gsap } from "@/lib/gsap";

/** The words that go round the button. */
const RING = "ASK ANYTHING ABOUT ME · ";

/** A speech bubble with a face and a small spark: what a chat assistant looks like. */
function BotGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 5.5h12a3 3 0 0 1 3 3v6.5a3 3 0 0 1-3 3h-5.2L8.6 21v-3H6a3 3 0 0 1-3-3V8.5a3 3 0 0 1 3-3z" />
      <circle cx="9.2" cy="11.4" r="1.05" fill="currentColor" stroke="none" />
      <circle cx="14.8" cy="11.4" r="1.05" fill="currentColor" stroke="none" />
      <path d="M9.4 14.4c1.5 1.2 3.7 1.2 5.2 0" />
      <path d="M19.6 0.9l.55 1.55 1.55.55-1.55.55-.55 1.55-.55-1.55-1.55-.55 1.55-.55z" fill="#d4a95f" stroke="none" />
    </svg>
  );
}

type Msg = { id: number; from: "me" | "you"; text: string; typing?: boolean };

/** The conversation survives the scene being rebuilt (rotating a phone, resizing across a layout). */
const talk: { msgs: Msg[]; chips: string[]; n: number; open: boolean } = { msgs: [], chips: [], n: 0, open: false };

/**
 * A small round button on the left edge that opens a chat about Prabhav. Hover or focus it and it opens
 * into a pill that says what it is. The answers come from the portfolio itself (lib/chat/brain.ts): there is
 * no server, and nothing typed here leaves the browser.
 */
export function ChatBot() {
  const [open, setOpen] = useState(talk.open);
  const [msgs, setMsgs] = useState<Msg[]>(talk.msgs);
  const [chips, setChips] = useState<string[]>(talk.chips);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const win = useRef<HTMLElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const fab = useRef<HTMLButtonElement>(null);
  const timers = useRef<number[]>([]);
  const ring = useId();

  const commit = useCallback((m: Msg[], c: string[]) => {
    talk.msgs = m;
    talk.chips = c;
    setMsgs(m);
    setChips(c);
  }, []);

  // the first time it is opened, he says hello
  useEffect(() => {
    if (open && talk.msgs.length === 0) commit([{ id: ++talk.n, from: "me", text: GREETING.text }], GREETING.chips);
  }, [open, commit]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const scroll = () => requestAnimationFrame(() => log.current?.scrollTo({ top: log.current.scrollHeight, behavior: "smooth" }));

  useEffect(() => {
    if (!open || !win.current) return;
    gsap.fromTo(win.current, { opacity: 0, y: 16, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: "power3.out" });
    field.current?.focus({ preventScroll: true });
    scroll();
  }, [open]);

  const close = useCallback(() => {
    if (!win.current) return setOpen(false);
    gsap.to(win.current, {
      opacity: 0,
      y: 12,
      scale: 0.96,
      duration: 0.22,
      ease: "power2.in",
      onComplete: () => {
        talk.open = false;
        setOpen(false);
        fab.current?.focus({ preventScroll: true });
      },
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && win.current?.contains(document.activeElement)) {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open, close]);

  const ask = useCallback(
    (q: string) => {
      const question = q.trim();
      if (!question || busy) return;
      setText("");
      setBusy(true);
      const you: Msg = { id: ++talk.n, from: "you", text: question };
      const typing: Msg = { id: ++talk.n, from: "me", text: "", typing: true };
      commit([...talk.msgs, you, typing], []);
      scroll();
      const r = reply(question);
      const words = r.text.split(" ");
      // a moment to "think", then the words come in quickly, the way a person types a short answer
      timers.current.push(
        window.setTimeout(
          () => {
            let i = 0;
            const tick = () => {
              i = Math.min(words.length, i + 2);
              const shown = words.slice(0, i).join(" ");
              const done = i >= words.length;
              commit(
                talk.msgs.map((m) => (m.id === typing.id ? { ...m, text: shown, typing: false } : m)),
                done ? r.chips : [],
              );
              scroll();
              if (done) setBusy(false);
              else timers.current.push(window.setTimeout(tick, 34));
            };
            tick();
          },
          450 + Math.min(500, question.length * 10),
        ),
      );
    },
    [busy, commit],
  );

  const submit = (e: FormEvent) => {
    e.preventDefault();
    ask(text);
  };

  return (
    <>
      {!open && (
        <div className="chat-fab-wrap">
          {/* the words, round the edge, turning slowly; the button sits inside the ring */}
          <svg className="chat-ring" viewBox="-50 -50 100 100" aria-hidden>
            <defs>
              <path id={ring} d="M 0,-37 a 37,37 0 1,1 -0.01,0" />
            </defs>
            <text>
              <textPath href={`#${ring}`} textLength="231" lengthAdjust="spacing">
                {RING}
              </textPath>
            </text>
          </svg>
          <button
            ref={fab}
            type="button"
            className="chat-fab"
            aria-label={`Hey, ${profile.firstName} here. Ask anything about me`}
            aria-haspopup="dialog"
            data-cursor="open"
            onClick={() => {
              talk.open = true;
              setOpen(true);
            }}
          >
            <span className="chat-fab-dot">
              <BotGlyph />
            </span>
            <span className="chat-fab-label" aria-hidden>
              Hey, {profile.firstName} here. Ask anything about me
            </span>
          </button>
        </div>
      )}
      {open && (
        <section ref={win} className="chat" role="dialog" aria-label={`Ask about ${profile.firstName}`} data-nodrag data-nowheel>
          <header className="chat-head">
            <span className="chat-avatar">
              <BotGlyph />
            </span>
            <span className="chat-who">
              <b>{profile.firstName}</b>
              <i>Ask me anything about me</i>
            </span>
            <button type="button" className="chat-x" aria-label="Close the chat" data-cursor="close" onClick={close}>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
                <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" strokeLinecap="round" />
              </svg>
            </button>
          </header>
          <div ref={log} className="chat-log" aria-live="polite" data-nowheel>
            {msgs.map((m) => (
              <p key={m.id} className={`chat-msg chat-msg--${m.from}`}>
                {m.typing ? (
                  <span className="chat-dots" aria-label="typing">
                    <i />
                    <i />
                    <i />
                  </span>
                ) : (
                  m.text
                )}
              </p>
            ))}
            {chips.length > 0 && (
              <div className="chat-chips">
                {chips.map((c) => (
                  <button key={c} type="button" onClick={() => ask(c)} disabled={busy}>
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>
          <form className="chat-form" onSubmit={submit}>
            <input ref={field} value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask about my work, projects, skills…" aria-label="Your question" maxLength={240} autoComplete="off" />
            <button type="submit" disabled={busy || !text.trim()} aria-label="Send" data-cursor="send">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M3 8h10M9 4l4 4-4 4" />
              </svg>
            </button>
          </form>
          <p className="chat-note">An assistant that answers from my portfolio, not a person. For anything else, write to {profile.email}.</p>
        </section>
      )}
    </>
  );
}
