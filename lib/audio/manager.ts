import { Ambience, type AmbPeriod } from "./ambience";
import { AUDIO_CONFIG, GAP, LEVEL, OUTPUT_TRIM, STORAGE_KEY, VARIANTS, type SoundName } from "./config";
import { SR } from "./dsp";
import { render } from "./synth";
import { VOICE_VARIANTS, bucketOf, renderVoice, type VoiceKind } from "./voices";

type Saved = { enabled?: boolean; master: number; sfx: number; ambient: number };
export type Settings = { enabled: boolean; master: number; sfx: number; ambient: number };

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * The one place sound is decided. Components ask for something by name ("a page turn") and never say how loud:
 * level is master × effects (or ambience) × the sound's own place in the mix, then a limiter. Nothing is created
 * until the first press or key (browsers require it) and nothing at all is made for a visitor who has it off.
 */
export class AudioManager {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfxBus!: GainNode;
  private ambBus!: GainNode;
  private amb: Ambience | null = null;
  private cache = new Map<string, AudioBuffer>();
  private bag = new Map<string, number[]>();
  private last = new Map<string, number[]>();
  private subs = new Set<(s: Settings) => void>();
  private period: AmbPeriod = "DAY";
  private reduced = false;
  private s: Settings = { enabled: true, master: AUDIO_CONFIG.masterVolume, sfx: AUDIO_CONFIG.sfxVolume, ambient: AUDIO_CONFIG.ambientVolume };

  constructor() {
    if (typeof window === "undefined") return;
    const rm = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    this.reduced = !!rm?.matches;
    let saved: Partial<Saved> = {};
    try {
      saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") ?? {};
    } catch {
      /* private mode */
    }
    this.s = {
      // someone who asked for less motion starts without sound; a choice they have made is kept
      enabled: typeof saved.enabled === "boolean" ? saved.enabled : !this.reduced,
      master: clamp01(saved.master ?? AUDIO_CONFIG.masterVolume),
      sfx: clamp01(saved.sfx ?? AUDIO_CONFIG.sfxVolume),
      ambient: clamp01(saved.ambient ?? AUDIO_CONFIG.ambientVolume),
    };
    const first = () => {
      this.unlock();
      window.removeEventListener("pointerdown", first, true);
      window.removeEventListener("keydown", first, true);
    };
    window.addEventListener("pointerdown", first, true);
    window.addEventListener("keydown", first, true);
    document.addEventListener("visibilitychange", () => {
      const c = this.ctx;
      if (!c) return;
      if (document.hidden) void c.suspend();
      else if (this.s.enabled) void c.resume();
    });
  }

  // ───────── state ─────────

  get settings(): Settings {
    return this.s;
  }
  get enabled() {
    return this.s.enabled;
  }
  subscribe(fn: (s: Settings) => void) {
    this.subs.add(fn);
    return () => void this.subs.delete(fn);
  }
  private commit() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.s));
    } catch {
      /* private mode */
    }
    this.apply();
    this.subs.forEach((f) => f({ ...this.s }));
  }
  private apply() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const on = this.s.enabled;
    // a short glide, so switching never clicks
    this.master.gain.setTargetAtTime(on ? this.s.master * OUTPUT_TRIM : 0, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(this.s.sfx, t, 0.05);
    this.ambBus.gain.setTargetAtTime(this.s.ambient, t, 0.05);
    if (on) {
      void this.ctx.resume();
      this.amb?.start(this.period);
    } else this.amb?.stop();
  }
  setEnabled(on: boolean) {
    this.s = { ...this.s, enabled: on };
    if (on) this.unlock();
    this.commit();
  }
  setMasterVolume(v: number) {
    this.s = { ...this.s, master: clamp01(v) };
    this.commit();
  }
  setSfxVolume(v: number) {
    this.s = { ...this.s, sfx: clamp01(v) };
    this.commit();
  }
  setAmbientVolume(v: number) {
    this.s = { ...this.s, ambient: clamp01(v) };
    this.commit();
  }

  // ───────── the graph ─────────

  /** Create the context on a user gesture. Safe to call as often as you like. */
  unlock() {
    if (typeof window === "undefined") return;
    if (!this.ctx) {
      if (!this.s.enabled) return;
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      const c = new AC({ sampleRate: SR, latencyHint: "playback" });
      this.ctx = c;
      // the last stage: whatever happens upstream, the output is held below clipping
      const lim = c.createDynamicsCompressor();
      lim.threshold.value = -14;
      lim.knee.value = 8;
      lim.ratio.value = 12;
      lim.attack.value = 0.004;
      lim.release.value = 0.2;
      this.master = c.createGain();
      this.master.gain.value = 0;
      this.sfxBus = c.createGain();
      this.ambBus = c.createGain();
      this.sfxBus.connect(this.master);
      this.ambBus.connect(this.master);
      this.master.connect(lim).connect(c.destination);
      this.amb = new Ambience(c, this.ambBus);
      this.apply();
      this.prepare();
      return;
    }
    this.apply();
  }

  /** Render the effects ahead of use, a few at a time, when the page is idle. */
  prepare() {
    if (typeof window === "undefined" || !this.s.enabled) return;
    const jobs: (() => void)[] = [];
    (Object.keys(VARIANTS) as SoundName[]).forEach((n) => {
      for (let v = 0; v < VARIANTS[n]; v++) jobs.push(() => void this.buffer(`${n}:${v}`));
    });
    for (const k of ["grab", "push"]) for (let b = 0; b < 3; b++) for (let v = 0; v < VOICE_VARIANTS; v++) jobs.push(() => void this.buffer(`${k}:${b}:${v}`));
    const step = () => {
      const j = jobs.shift();
      if (!j) return;
      if (this.ctx) j();
      const ric = (window as unknown as { requestIdleCallback?: (f: () => void) => void }).requestIdleCallback;
      if (ric) ric(step);
      else window.setTimeout(step, 30);
    };
    step();
  }

  private buffer(key: string): AudioBuffer | null {
    const c = this.ctx;
    if (!c) return null;
    let b = this.cache.get(key);
    if (b) return b;
    const [name, a, b2, c3] = key.split(":");
    const data =
      name === "grab" || name === "push" ? renderVoice(name as VoiceKind, +a, +b2) : render(name as SoundName, +a);
    void c3;
    b = c.createBuffer(1, data.length, SR);
    b.copyToChannel(data as Float32Array<ArrayBuffer>, 0);
    this.cache.set(key, b);
    return b;
  }

  /** A variant that is never the one just played. */
  private nextVariant(name: string, count: number) {
    let bag = this.bag.get(name);
    if (!bag || !bag.length) {
      bag = Array.from({ length: count }, (_, i) => i).sort(() => Math.random() - 0.5);
      const prev = this.last.get(name)?.[0];
      if (bag.length > 1 && bag[bag.length - 1] === prev) bag.unshift(bag.pop()!);
      this.bag.set(name, bag);
    }
    const v = bag.pop()!;
    this.last.set(name, [v]);
    return v;
  }

  /** Hold repeated sounds apart, and soften a quick run of them. Returns the gain to use, or 0 to skip. */
  private gate(name: string, gap: { min: number; soon: number }) {
    const now = performance.now();
    const hist = (this.last.get(`t:${name}`) ?? []).filter((t) => now - t < 1200);
    const prev = hist[hist.length - 1];
    if (prev !== undefined && now - prev < gap.min) return 0;
    let g = 1;
    if (gap.soon && prev !== undefined && now - prev < gap.soon) g = 0.7;
    // more than three in about a second is a riffle, not a sound
    if (gap.soon && hist.length >= 3) return 0;
    hist.push(now);
    this.last.set(`t:${name}`, hist);
    return g;
  }

  private fire(key: string, level: number, o: { pan?: number; rate?: number } = {}) {
    const c = this.ctx;
    if (!c || !this.s.enabled || c.state === "closed") return;
    if (c.state === "suspended") void c.resume();
    const b = this.buffer(key);
    if (!b) return;
    const s = c.createBufferSource();
    s.buffer = b;
    s.playbackRate.value = (o.rate ?? 1) * (0.97 + Math.random() * 0.06);
    const g = c.createGain();
    g.gain.value = level * (0.92 + Math.random() * 0.12);
    const pan = c.createStereoPanner();
    pan.pan.value = o.pan ?? 0;
    s.connect(g).connect(pan).connect(this.sfxBus);
    s.onended = () => pan.disconnect();
    s.start();
  }

  // ───────── what the site asks for ─────────

  /** A named sound; the timeline's markers use this. */
  cue(name: SoundName) {
    if (!this.ctx || !this.s.enabled) return;
    const g = this.gate(name, GAP[name]);
    if (!g) return;
    this.fire(`${name}:${this.nextVariant(name, VARIANTS[name])}`, LEVEL[name] * g, { pan: name === "flip" ? (Math.random() - 0.5) * 0.25 : 0 });
  }
  playPageTurn() {
    this.cue("flip");
  }
  playBookOpen() {
    this.cue("open");
  }
  playBookClose() {
    this.cue("close");
  }
  /** `unlatch` is the clasp letting go; `detent` is the small catch felt while it is drawn. */
  playMetalClick(kind: "unlatch" | "detent" = "unlatch") {
    this.cue(kind === "unlatch" ? "clasp" : "detent");
  }
  playShelfPlacement() {
    this.cue("shelf");
  }
  playShelfPull() {
    this.cue("pull");
  }
  /** Paper moved on a desk: for the index card and the project card. */
  playPaper() {
    this.cue("paper");
  }
  /** A person's voice. `pitch` is theirs, in Hz; `x` in 0..1 is where they are across the screen. */
  playCharacterInteraction(kind: VoiceKind, pitch = 150, x = 0.5) {
    if (!this.ctx || !this.s.enabled) return;
    if (!this.gate("voice", GAP.voice)) return;
    const b = bucketOf(pitch);
    const v = this.nextVariant(`voice:${kind}:${b}`, VOICE_VARIANTS);
    this.fire(`${kind}:${b}:${v}`, LEVEL.voice, { pan: (x - 0.5) * 0.8 });
  }

  /** The hour changes the room; the world engine reports it. */
  setAmbience(p: AmbPeriod) {
    this.period = p;
    if (this.ctx && this.s.enabled) this.amb?.setPeriod(p);
  }
}
