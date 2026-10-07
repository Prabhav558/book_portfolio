/**
 * The small pieces every sound is made of. Plain arithmetic on Float32Arrays, no Web Audio: a sound is
 * rendered once into a buffer and then only ever played back, and the same code can be run and measured
 * outside a browser.
 */

export const SR = 44100;

/** Seeded random numbers, so a given variant is always the same variant. */
export function rng(seed: number) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export type Rand = () => number;

export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export const db = (x: number) => 10 ** (x / 20);

/** One biquad (RBJ cookbook). Coefficients may be changed between samples. */
export class Biquad {
  private b0 = 1;
  private b1 = 0;
  private b2 = 0;
  private a1 = 0;
  private a2 = 0;
  private z1 = 0;
  private z2 = 0;

  private set(b0: number, b1: number, b2: number, a0: number, a1: number, a2: number) {
    this.b0 = b0 / a0;
    this.b1 = b1 / a0;
    this.b2 = b2 / a0;
    this.a1 = a1 / a0;
    this.a2 = a2 / a0;
  }
  private w(f: number) {
    const w0 = (2 * Math.PI * clamp(f, 10, SR * 0.45)) / SR;
    return [Math.cos(w0), Math.sin(w0)] as const;
  }
  lowpass(f: number, q = 0.7071) {
    const [c, s] = this.w(f);
    const al = s / (2 * q);
    this.set((1 - c) / 2, 1 - c, (1 - c) / 2, 1 + al, -2 * c, 1 - al);
    return this;
  }
  highpass(f: number, q = 0.7071) {
    const [c, s] = this.w(f);
    const al = s / (2 * q);
    this.set((1 + c) / 2, -(1 + c), (1 + c) / 2, 1 + al, -2 * c, 1 - al);
    return this;
  }
  /** Constant 0 dB peak gain band-pass. */
  bandpass(f: number, q = 1) {
    const [c, s] = this.w(f);
    const al = s / (2 * q);
    this.set(al, 0, -al, 1 + al, -2 * c, 1 - al);
    return this;
  }
  highshelf(f: number, gainDb: number, slope = 1) {
    const [c, s] = this.w(f);
    const A = 10 ** (gainDb / 40);
    const al = (s / 2) * Math.sqrt((A + 1 / A) * (1 / slope - 1) + 2);
    const sq = 2 * Math.sqrt(A) * al;
    this.set(
      A * (A + 1 + (A - 1) * c + sq),
      -2 * A * (A - 1 + (A + 1) * c),
      A * (A + 1 + (A - 1) * c - sq),
      A + 1 - (A - 1) * c + sq,
      2 * (A - 1 - (A + 1) * c),
      A + 1 - (A - 1) * c - sq,
    );
    return this;
  }
  peak(f: number, gainDb: number, q = 1) {
    const [c, s] = this.w(f);
    const A = 10 ** (gainDb / 40);
    const al = s / (2 * q);
    this.set(1 + al * A, -2 * c, 1 - al * A, 1 + al / A, -2 * c, 1 - al / A);
    return this;
  }
  p(x: number) {
    const y = this.b0 * x + this.z1;
    this.z1 = this.b1 * x - this.a1 * y + this.z2;
    this.z2 = this.b2 * x - this.a2 * y;
    return y;
  }
}

/** Run a whole buffer through filters in series (in place). */
export function run(buf: Float32Array, ...fs: Biquad[]) {
  for (let i = 0; i < buf.length; i++) {
    let x = buf[i];
    for (let k = 0; k < fs.length; k++) x = fs[k].p(x);
    buf[i] = x;
  }
  return buf;
}

export function white(n: number, r: Rand) {
  const o = new Float32Array(n);
  for (let i = 0; i < n; i++) o[i] = r() * 2 - 1;
  return o;
}
/** Roughly -3 dB per octave: the sound of paper and air. */
export function pink(n: number, r: Rand) {
  const o = new Float32Array(n);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < n; i++) {
    const w = r() * 2 - 1;
    b0 = 0.99886 * b0 + w * 0.0555179;
    b1 = 0.99332 * b1 + w * 0.0750759;
    b2 = 0.969 * b2 + w * 0.153852;
    b3 = 0.8665 * b3 + w * 0.3104856;
    b4 = 0.55 * b4 + w * 0.5329522;
    b5 = -0.7616 * b5 - w * 0.016898;
    o[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
    b6 = w * 0.115926;
  }
  return o;
}
/** -6 dB per octave: leather, wood, a room. */
export function brown(n: number, r: Rand) {
  const o = new Float32Array(n);
  let last = 0;
  for (let i = 0; i < n; i++) {
    last = (last + 0.02 * (r() * 2 - 1)) / 1.02;
    o[i] = last * 3.5;
  }
  return o;
}

// ───────── shapes over time (all smooth: no corners, so no clicks) ─────────

/** 0→1 over `len` seconds on a raised cosine. */
export const rise = (t: number, len: number) => (t <= 0 ? 0 : t >= len ? 1 : 0.5 - 0.5 * Math.cos((Math.PI * t) / len));
/** A swell: up over `a` seconds, then an exponential-ish fall with time constant `d`. */
export const swell = (t: number, a: number, d: number) => rise(t, a) * Math.exp(-Math.max(0, t - a) / d);
/** Smooth bump centred at c, half-width w. */
export const bump = (t: number, c: number, w: number) => {
  const x = (t - c) / w;
  return Math.abs(x) >= 1 ? 0 : 0.5 + 0.5 * Math.cos(Math.PI * x);
};

/** Add `src` into `dst` at time `at` seconds, scaled. */
export function mix(dst: Float32Array, src: Float32Array, at: number, gain = 1) {
  const o = Math.round(at * SR);
  for (let i = 0; i < src.length; i++) {
    const j = o + i;
    if (j >= 0 && j < dst.length) dst[j] += src[i] * gain;
  }
}

/** A damped resonance: a body that was tapped. `attack` is a few ms so there is no hard edge. */
export function ring(len: number, freq: number, decay: number, attack = 0.003, glide = 0) {
  const n = Math.round(len * SR);
  const o = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const f = freq * (1 + glide * Math.exp(-t / 0.04));
    ph += (2 * Math.PI * f) / SR;
    o[i] = Math.sin(ph) * swell(t, attack, decay);
  }
  return o;
}

// ───────── finishing ─────────

/** Cheap perceptual weight: ignore what sits below 120 Hz, where level misleads on small speakers. */
function weightedRms(buf: Float32Array) {
  const hp = new Biquad().highpass(120);
  let s = 0;
  for (let i = 0; i < buf.length; i++) {
    const y = hp.p(buf[i]);
    s += y * y;
  }
  return Math.sqrt(s / buf.length);
}

export type Finish = { rmsDb: number; peakDb: number; fadeIn?: number; fadeOut?: number; top?: number };

/**
 * The same last steps for every sound: nothing under 45 Hz or over `top`, the 2–6 kHz band pulled down,
 * a fade at each end, then loudness set so every sound sits at one level, with a ceiling on the peak.
 */
export function finish(buf: Float32Array, o: Finish) {
  run(buf, new Biquad().highpass(45), new Biquad().lowpass(o.top ?? 3000, 0.6), new Biquad().highshelf(1800, -9, 0.8));
  const fi = Math.round((o.fadeIn ?? 0.004) * SR);
  const fo = Math.round((o.fadeOut ?? 0.06) * SR);
  for (let i = 0; i < fi && i < buf.length; i++) buf[i] *= 0.5 - 0.5 * Math.cos((Math.PI * i) / fi);
  for (let i = 0; i < fo && i < buf.length; i++) buf[buf.length - 1 - i] *= 0.5 - 0.5 * Math.cos((Math.PI * i) / fo);
  const rms = weightedRms(buf) || 1e-6;
  let g = db(o.rmsDb) / rms;
  let peak = 0;
  for (let i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs(buf[i]));
  g = Math.min(g, db(o.peakDb) / (peak || 1e-6));
  for (let i = 0; i < buf.length; i++) buf[i] *= g;
  return buf;
}

/** Measurements, for the tests and for anybody retuning a sound. */
export function measure(buf: Float32Array) {
  let peak = 0;
  let s = 0;
  for (let i = 0; i < buf.length; i++) {
    peak = Math.max(peak, Math.abs(buf[i]));
    s += buf[i] * buf[i];
  }
  const band = (lo: number, hi: number) => {
    // Goertzel-ish sweep over a coarse grid: enough to say where the energy sits
    let e = 0;
    const step = 40;
    const N = Math.min(buf.length, 8192);
    for (let f = lo; f < hi; f += step) {
      let re = 0, im = 0;
      for (let i = 0; i < N; i += 2) {
        const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N);
        const a = (2 * Math.PI * f * i) / SR;
        re += buf[i] * w * Math.cos(a);
        im += buf[i] * w * Math.sin(a);
      }
      e += re * re + im * im;
    }
    return e;
  };
  const total = band(40, 12000) || 1;
  return {
    seconds: buf.length / SR,
    peakDb: 20 * Math.log10(peak || 1e-9),
    rmsDb: 10 * Math.log10(s / buf.length || 1e-12),
    midHighShare: band(2000, 6000) / total,
  };
}
