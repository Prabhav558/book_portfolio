import { gsap } from "./gsap";
import { D, HANDOFF, type BookTL } from "./timeline";

export type State = { book: number; label: string };

type Hooks = {
  /** A transition has been chosen (before it plays). */
  onMove: (from: number, to: number, kind: "step" | "jump" | "drag") => void;
  /** Everything has come to rest on state `idx`. */
  onSettle: (idx: number) => void;
};

/**
 * Plays the per-book timelines. Navigation is by *states* (every resting spread,
 * plus the epilogue); each input plays an authored transition to the neighbouring
 * state at a constant, unhurried pace — no scrubbing, so nothing ever lurches.
 *
 * A step between two books plays the old book's close + return while the new book
 * leaves its slot, overlapping the two so the handoff reads as one motion.
 */
export function createDirector(initial: BookTL[], hooks: Hooks) {
  let books = initial;
  const states: State[] = [];
  const build = () => {
    states.length = 0;
    books.forEach((b, k) => {
      for (let s = 0; s < b.spreads; s++) states.push({ book: k, label: `s${s}` });
    });
    states.push({ book: books.length - 1, label: "end" });
  };
  build();

  let cur = 0;
  let crossing = false;
  let scrubbing = false;
  const active = new Map<number, gsap.core.Tween>();

  const timeOf = (s: State) => books[s.book].labels[s.label];

  const settle = () => {
    crossing = false;
    hooks.onSettle(cur);
  };

  function drive(book: number, to: number, rate: number, delay = 0, then?: () => void) {
    const b = books[book];
    active.get(book)?.kill();
    active.delete(book);
    const d = { t: b.tl.time() };
    const dist = Math.abs(to - d.t);
    if (dist < 1e-4 && delay <= 0) return;
    const tw = gsap.to(d, {
      t: to,
      duration: Math.max(1e-4, dist / rate),
      delay: Math.max(0, delay),
      ease: "none",
      onUpdate: () => void b.tl.time(d.t, false),
      onComplete: () => {
        b.tl.time(to, false);
        active.delete(book);
        then?.();
        if (active.size === 0) settle();
      },
    });
    active.set(book, tw);
  }

  function move(from: number, to: number, kind: "step" | "jump") {
    const a = states[from];
    const b = states[to];
    cur = to;
    hooks.onMove(from, to, kind);

    if (a.book === b.book) {
      crossing = false;
      drive(a.book, timeOf(b), kind === "jump" ? 2 : 1);
      if (active.size === 0) settle();
      return;
    }

    crossing = true;
    const A = books[a.book];
    const B = books[b.book];
    const rate = kind === "jump" ? 1.7 : 1;

    /**
     * Send the open book back to the shelf. Pages it still has to get through are
     * riffled shut in about half a second rather than turned one by one.
     * Returns how long until the next book should start leaving its slot.
     */
    const leave = () => {
      const now = A.tl.time();
      const left = A.labels.close - now;
      if (left > 0.01) {
        const riffle = Math.max(rate, left / 0.55);
        drive(a.book, A.labels.close, riffle, 0, () => drive(a.book, A.labels.shelved, rate));
        return left / riffle + (D.close + D.ret * HANDOFF) / rate;
      }
      drive(a.book, A.labels.shelved, rate);
      return (A.labels.ret + D.ret * HANDOFF - now) / rate;
    };

    if (b.book > a.book) {
      // leave the old book on the shelf, then draw the new one off its slot
      const delay = leave();
      B.tl.time(0, false);
      drive(b.book, timeOf(b), rate, Math.max(kind === "jump" ? 0.15 : 0, delay));
    } else if (kind === "step") {
      // exact mirror: put the new book back, then pull the previous one out
      drive(a.book, 0, rate);
      B.tl.time(B.labels.shelved, false);
      drive(b.book, timeOf(b), rate, Math.max(0, D.open + D.pull * (1 - HANDOFF) - 0.6));
    } else {
      const delay = leave();
      B.tl.time(0, false);
      drive(b.book, timeOf(b), rate, Math.max(0.15, delay));
    }
    if (active.size === 0) settle();
  }

  function go(dir: 1 | -1) {
    const next = cur + dir;
    if (scrubbing || next < 0 || next >= states.length) return false;
    if (crossing) {
      // a second flick during a long handoff only hurries it along: replaying it as another step
      // would skip the first page of the book that is arriving
      active.forEach((tw) => void tw.timeScale(1.8));
      return true;
    }
    move(cur, next, "step");
    return true;
  }

  return {
    states,
    get cur() {
      return cur;
    },
    get busy() {
      return active.size > 0 || scrubbing;
    },
    get crossing() {
      return crossing;
    },
    go,
    jump(idx: number) {
      if (crossing || scrubbing || idx === cur || idx < 0 || idx >= states.length) return;
      move(cur, idx, "jump");
    },
    /** First play: the clasp has been unlatched — open the first book. */
    start(rate = 1) {
      cur = 0;
      drive(0, books[0].labels.s0, rate);
    },
    /**
     * Take hold of the page that turns in this direction. While it is held nothing else moves;
     * the caller shows the turn itself (lib/fold.ts) and then says how it ended.
     * Only page turns inside the open book can be held; returns null otherwise.
     */
    hold(dir: 1 | -1) {
      const next = cur + dir;
      if (active.size || crossing || scrubbing || next < 0 || next >= states.length) return null;
      const a = states[cur];
      const b = states[next];
      if (a.book !== b.book || a.label === "end" || b.label === "end") return null;
      const origin = cur;
      let started = false;
      scrubbing = true;
      return {
        /** The page has actually started to move. */
        begin() {
          if (started) return;
          started = true;
          hooks.onMove(origin, next, "drag");
        },
        /** Let go: the page went over (the book is now on the next state) or fell back. */
        end(turned: boolean) {
          scrubbing = false;
          if (turned) {
            cur = next;
            books[a.book].tl.time(timeOf(b), false);
          }
          if (started) settle();
        },
      };
    },
    /** Put the scene directly into a resting state (used to restore position after a re-layout). */
    place(idx: number) {
      active.forEach((tw) => void tw.kill());
      active.clear();
      crossing = false;
      cur = Math.min(states.length - 1, Math.max(0, idx));
      const st = states[cur];
      books.forEach((bk, k) => bk.tl.time(k === st.book ? bk.labels[st.label] : 0, false));
    },
    stateOfBook(book: number) {
      return states.findIndex((s) => s.book === book && s.label === "s0");
    },
    rebind(next: BookTL[]) {
      active.forEach((tw) => void tw.kill());
      active.clear();
      crossing = false;
      books = next;
      build();
    },
    dispose() {
      active.forEach((tw) => void tw.kill());
      active.clear();
    },
  };
}

export type Director = ReturnType<typeof createDirector>;
