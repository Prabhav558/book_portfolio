/**
 * Tiny Web Audio sound engine.
 *
 * Every sound is synthesised on the fly (filtered noise + resonant pings), so the
 * site works with zero audio assets. To use real recordings instead, drop files
 * into /public/sounds and list them in SOUND_FILES — they'll be preferred.
 */

export type SoundName = "clasp" | "open" | "flip" | "close" | "shelf";

const SOUND_FILES: Partial<Record<SoundName, string>> = {
  // clasp: "/sounds/clasp.mp3",
  // open: "/sounds/open.mp3",
  // flip: "/sounds/flip.mp3",
  // close: "/sounds/close.mp3",
};

const VOLUME: Record<SoundName, number> = {
  clasp: 0.5,
  open: 0.32,
  flip: 0.26,
  close: 0.4,
  shelf: 0.22,
};

const MUTE_KEY = "book-portfolio:muted";

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private buffers: Partial<Record<SoundName, AudioBuffer>> = {};
  private lastPlayed: Partial<Record<SoundName, number>> = {};
  private listeners = new Set<(muted: boolean) => void>();
  muted = false;

  constructor() {
    if (typeof window === "undefined") return;
    try {
      this.muted = window.localStorage.getItem(MUTE_KEY) === "1";
    } catch {
      /* storage unavailable */
    }
  }

  /**
   * Builds the audio graph (suspended — browsers allow that without a gesture). Doing this
   * ahead of time keeps the clasp click itself from stalling on audio-device start-up.
   */
  prepare() {
    if (typeof window === "undefined" || this.ctx) return;
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 1;
    this.master.connect(this.ctx.destination);
    this.noise = this.makeNoise(2);
    void this.loadFiles();
  }

  /** Must be called from a user gesture (the clasp click). */
  unlock() {
    if (typeof window === "undefined") return;
    this.prepare();
    if (this.ctx && this.ctx.state === "suspended") void this.ctx.resume();
  }

  subscribe(fn: (muted: boolean) => void) {
    this.listeners.add(fn);
    return () => void this.listeners.delete(fn);
  }

  setMuted(m: boolean) {
    this.muted = m;
    try {
      window.localStorage.setItem(MUTE_KEY, m ? "1" : "0");
    } catch {
      /* ignore */
    }
    if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.05);
    }
    this.listeners.forEach((l) => l(m));
  }

  play(name: SoundName, opts: { rate?: number; gain?: number } = {}) {
    const ctx = this.ctx;
    if (!ctx || !this.master || this.muted || ctx.state !== "running") return;
    const now = performance.now();
    if (now - (this.lastPlayed[name] ?? 0) < 110) return;
    this.lastPlayed[name] = now;

    const vol = VOLUME[name] * (opts.gain ?? 1);
    const buf = this.buffers[name];
    if (buf) {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = (opts.rate ?? 1) * (0.96 + Math.random() * 0.08);
      const g = ctx.createGain();
      g.gain.value = vol;
      src.connect(g).connect(this.master);
      src.start();
      return;
    }
    this.synth[name](ctx, vol, opts.rate ?? 1);
  }

  // ─────────────── synthesis ───────────────

  private makeNoise(seconds: number) {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const b = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = b.getChannelData(0);
    // slightly pink-ish noise for a softer texture
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = 0.82 * last + 0.18 * white;
      d[i] = white * 0.55 + last * 1.4;
    }
    return b;
  }

  private noiseSource(offset = Math.random()) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    src.loopStart = 0;
    src.loopEnd = this.noise!.duration;
    src.start(ctx.currentTime, offset * (this.noise!.duration - 0.6));
    return src;
  }

  private env(g: GainNode, t: number, peak: number, attack: number, decay: number) {
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  private ping(ctx: AudioContext, freq: number, t: number, peak: number, decay: number) {
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(freq, t);
    const g = ctx.createGain();
    this.env(g, t, peak, 0.002, decay);
    o.connect(g).connect(this.master!);
    o.start(t);
    o.stop(t + decay + 0.05);
  }

  private burst(
    ctx: AudioContext,
    t: number,
    opts: { type: BiquadFilterType; f: number; f2?: number; q: number; peak: number; attack: number; decay: number },
  ) {
    const src = this.noiseSource();
    const filt = ctx.createBiquadFilter();
    filt.type = opts.type;
    filt.Q.value = opts.q;
    filt.frequency.setValueAtTime(opts.f, t);
    if (opts.f2) filt.frequency.exponentialRampToValueAtTime(opts.f2, t + opts.attack + opts.decay);
    const g = ctx.createGain();
    this.env(g, t, opts.peak, opts.attack, opts.decay);
    src.connect(filt).connect(g).connect(this.master!);
    src.stop(t + opts.attack + opts.decay + 0.1);
  }

  private synth: Record<SoundName, (ctx: AudioContext, vol: number, rate: number) => void> = {
    clasp: (ctx, vol) => {
      const t = ctx.currentTime + 0.005;
      // latch release: sharp transient + metallic ring, then a lighter second tick
      this.burst(ctx, t, { type: "highpass", f: 2600, q: 0.7, peak: vol * 0.9, attack: 0.001, decay: 0.035 });
      this.ping(ctx, 3150, t, vol * 0.28, 0.16);
      this.ping(ctx, 4720, t, vol * 0.16, 0.11);
      this.ping(ctx, 6230, t, vol * 0.08, 0.07);
      const t2 = t + 0.075;
      this.burst(ctx, t2, { type: "bandpass", f: 3400, q: 1.4, peak: vol * 0.5, attack: 0.001, decay: 0.03 });
      this.ping(ctx, 2480, t2, vol * 0.14, 0.12);
    },
    open: (ctx, vol, rate) => {
      const t = ctx.currentTime + 0.005;
      // soft leather + board creak swoosh
      this.burst(ctx, t, { type: "bandpass", f: 280 * rate, f2: 900 * rate, q: 0.9, peak: vol * 0.7, attack: 0.18, decay: 0.42 });
      this.burst(ctx, t + 0.05, { type: "lowpass", f: 600, f2: 220, q: 0.5, peak: vol * 0.35, attack: 0.08, decay: 0.5 });
    },
    flip: (ctx, vol, rate) => {
      const t = ctx.currentTime + 0.005;
      // paper: airy swish with a little flutter
      const r = rate * (0.92 + Math.random() * 0.16);
      this.burst(ctx, t, { type: "bandpass", f: 1800 * r, f2: 4200 * r, q: 0.8, peak: vol * 0.55, attack: 0.07, decay: 0.2 });
      this.burst(ctx, t + 0.09, { type: "highpass", f: 3000 * r, q: 0.6, peak: vol * 0.3, attack: 0.02, decay: 0.12 });
      this.burst(ctx, t + 0.2, { type: "bandpass", f: 900 * r, q: 1.1, peak: vol * 0.22, attack: 0.01, decay: 0.09 });
    },
    close: (ctx, vol) => {
      const t = ctx.currentTime + 0.005;
      // muted thud: falling sine + low noise
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.setValueAtTime(120, t);
      o.frequency.exponentialRampToValueAtTime(46, t + 0.18);
      const g = ctx.createGain();
      this.env(g, t, vol * 0.9, 0.004, 0.22);
      o.connect(g).connect(this.master!);
      o.start(t);
      o.stop(t + 0.3);
      this.burst(ctx, t, { type: "lowpass", f: 700, f2: 200, q: 0.4, peak: vol * 0.6, attack: 0.003, decay: 0.14 });
    },
    shelf: (ctx, vol) => {
      const t = ctx.currentTime + 0.005;
      // wooden knock
      this.ping(ctx, 210, t, vol * 0.5, 0.09);
      this.ping(ctx, 420, t, vol * 0.18, 0.05);
      this.burst(ctx, t, { type: "bandpass", f: 1100, q: 1.2, peak: vol * 0.4, attack: 0.002, decay: 0.05 });
    },
  };

  private async loadFiles() {
    const ctx = this.ctx!;
    await Promise.all(
      (Object.entries(SOUND_FILES) as [SoundName, string][]).map(async ([name, url]) => {
        try {
          const res = await fetch(url);
          if (!res.ok) return;
          this.buffers[name] = await ctx.decodeAudioData(await res.arrayBuffer());
        } catch {
          /* fall back to synth */
        }
      }),
    );
  }
}

export const sound = new SoundEngine();
