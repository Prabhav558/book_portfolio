import { PEAK_CAP_DB, TARGET_RMS_DB, type SoundName } from "./config";
import { Biquad, SR, bump, brown, finish, mix, pink, rise, ring, rng, run, swell, white, type Rand } from "./dsp";

/**
 * The sounds of the library, made from noise and a few damped resonances. Each is something a real object
 * does: a leaf of paper sliding in air, a board of leather settling, a thin brass catch, oak on oak.
 * Nothing starts or ends abruptly and nothing is bright: the top of every sound is rolled off in `finish`.
 */

const len = (s: number) => new Float32Array(Math.round(s * SR));

/** Noise shaped through a band that moves, scaled by a moving level. */
function moving(n: number, src: Float32Array, f: (t: number) => number, q: number, amp: (t: number) => number) {
  const o = new Float32Array(n);
  const bp = new Biquad();
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    if ((i & 31) === 0) bp.bandpass(f(t), q);
    o[i] = bp.p(src[i]) * amp(t);
  }
  return o;
}

/** A page: air pushed ahead of the sheet, a soft slide, a few fibres catching. */
function flip(v: number, r: Rand) {
  const d = 0.5 + r() * 0.22;
  const n = Math.round((d + 0.15) * SR);
  const hush = moving(n, pink(n, r), (t) => 420 + 900 * rise(t, d * 0.8) * (0.8 + 0.4 * v / 6), 0.8, (t) => bump(t, d * 0.5, d * 0.62) ** 1.4);
  const air = moving(n, brown(n, r), (t) => 160 + 140 * rise(t, d), 0.7, (t) => bump(t, d * 0.42, d * 0.7));
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = hush[i] * 0.9 + air[i] * 0.9;
  // fibres: a handful of tiny soft grains while the sheet moves
  const grains = 3 + Math.floor(r() * 4);
  for (let g = 0; g < grains; g++) {
    const at = d * (0.18 + r() * 0.6);
    const gl = len(0.014 + r() * 0.02);
    const gn = pink(gl.length, r);
    run(gn, new Biquad().bandpass(700 + r() * 900, 1.1));
    for (let i = 0; i < gl.length; i++) gl[i] = gn[i] * bump(i, gl.length / 2, gl.length / 2);
    mix(out, gl, at, 0.35 + r() * 0.25);
  }
  return finish(out, { rmsDb: TARGET_RMS_DB, peakDb: PEAK_CAP_DB, fadeIn: 0.05, fadeOut: 0.15 });
}

/** A board settling: leather creaking, then a soft wooden weight. `closing` puts the weight at the end. */
function board(v: number, r: Rand, closing: boolean) {
  const d = closing ? 0.7 : 0.95;
  const out = len(d + 0.35);
  const n = out.length;
  const creak = moving(n, brown(n, r), (t) => 150 + 90 * Math.sin(t * (7 + v * 2) + v) + 80 * rise(t, d), 5, (t) => bump(t, d * 0.45, d * 0.5) * (0.5 + 0.5 * Math.sin(t * 23 + v)) ** 2);
  const leather = moving(n, pink(n, r), (t) => 380 + 260 * rise(t, d), 0.9, (t) => bump(t, d * 0.5, d * 0.6) * 0.55);
  for (let i = 0; i < n; i++) out[i] = creak[i] * 1.1 + leather[i];
  const at = closing ? d * 0.82 : d * 0.9;
  mix(out, ring(0.34, 78 + r() * 14, 0.11, 0.012, 0.35), at, closing ? 1.5 : 1.15);
  const knock = pink(Math.round(0.07 * SR), r);
  run(knock, new Biquad().lowpass(520, 0.7));
  for (let i = 0; i < knock.length; i++) knock[i] *= swell(i / SR, 0.008, 0.02);
  mix(out, knock, at, 1.2);
  return finish(out, { rmsDb: TARGET_RMS_DB, peakDb: PEAK_CAP_DB, fadeIn: 0.06, fadeOut: 0.2, top: 2400 });
}

/** Oak against oak: a short slide, then a soft, round placement. */
function shelf(v: number, r: Rand) {
  const out = len(0.55);
  const n = out.length;
  const slide = moving(n, brown(n, r), (t) => 240 + 160 * rise(t, 0.28), 1.2, (t) => bump(t, 0.14, 0.17) * 0.55);
  for (let i = 0; i < n; i++) out[i] = slide[i];
  const at = 0.27 + r() * 0.03;
  mix(out, ring(0.3, 118 + v * 9 + r() * 12, 0.075, 0.006, 0.3), at, 1.2);
  mix(out, ring(0.2, 231 + r() * 20, 0.04, 0.006), at, 0.4);
  const thud = pink(Math.round(0.05 * SR), r);
  run(thud, new Biquad().lowpass(700, 0.7));
  for (let i = 0; i < thud.length; i++) thud[i] *= swell(i / SR, 0.006, 0.014);
  mix(out, thud, at, 0.9);
  return finish(out, { rmsDb: TARGET_RMS_DB, peakDb: PEAK_CAP_DB, fadeIn: 0.05, fadeOut: 0.15, top: 2200 });
}

/** A book drawn off the shelf: wood against cloth, only the slide. */
function pull(v: number, r: Rand) {
  const out = len(0.62);
  const n = out.length;
  const a = moving(n, brown(n, r), (t) => 200 + 260 * rise(t, 0.4), 1, (t) => bump(t, 0.3, 0.32));
  const b = moving(n, pink(n, r), (t) => 520 + 300 * rise(t, 0.4) + v * 20, 0.8, (t) => bump(t, 0.28, 0.3) * 0.35);
  for (let i = 0; i < n; i++) out[i] = a[i] + b[i];
  return finish(out, { rmsDb: TARGET_RMS_DB, peakDb: PEAK_CAP_DB, fadeIn: 0.08, fadeOut: 0.18, top: 2200 });
}

/** A thin brass catch, muted by leather: two low, quickly damped modes and a small tock. Never a ping. */
function clasp(v: number, r: Rand) {
  const out = len(0.34);
  const f = 560 + r() * 60;
  // first, the catch gives; a beat later, it seats
  const hit = (at: number, g: number) => {
    mix(out, ring(0.14, f, 0.022, 0.0025), at, g);
    mix(out, ring(0.1, f * 1.62, 0.014, 0.0025), at, g * 0.45);
    mix(out, ring(0.12, 170 + r() * 15, 0.03, 0.004, 0.25), at, g * 0.9);
    const tick = pink(Math.round(0.018 * SR), r);
    run(tick, new Biquad().bandpass(900, 0.8));
    for (let i = 0; i < tick.length; i++) tick[i] *= swell(i / SR, 0.003, 0.006);
    mix(out, tick, at, g * 0.7);
  };
  hit(0.03, 1);
  hit(0.03 + 0.085 + v * 0.008, 0.7);
  return finish(out, { rmsDb: TARGET_RMS_DB, peakDb: PEAK_CAP_DB, fadeIn: 0.01, fadeOut: 0.1, top: 2300 });
}

/** A single quiet seat of the catch, for the detent while the clasp is being drawn. */
function detent(v: number, r: Rand) {
  const out = len(0.2);
  mix(out, ring(0.12, 520 + r() * 50, 0.02, 0.003), 0.02, 1);
  mix(out, ring(0.1, 150 + v * 6, 0.03, 0.004, 0.25), 0.02, 0.9);
  return finish(out, { rmsDb: TARGET_RMS_DB, peakDb: PEAK_CAP_DB, fadeIn: 0.008, fadeOut: 0.07, top: 2000 });
}

/** Paper moved on a desk: a short, dry rustle for cards and pop-ups. */
function paper(v: number, r: Rand) {
  const d = 0.26 + r() * 0.12;
  const n = Math.round((d + 0.1) * SR);
  const out = moving(n, pink(n, r), (t) => 600 + 500 * Math.sin(t * 19 + v), 0.9, (t) => bump(t, d * 0.5, d * 0.6) * (0.6 + 0.4 * Math.sin(t * 61 + v * 3) ** 2));
  return finish(out, { rmsDb: TARGET_RMS_DB, peakDb: PEAK_CAP_DB, fadeIn: 0.05, fadeOut: 0.1 });
}

const MAKE: Record<SoundName, (v: number, r: Rand) => Float32Array> = {
  flip,
  open: (v, r) => board(v, r, false),
  close: (v, r) => board(v, r, true),
  shelf,
  pull,
  clasp,
  detent,
  paper,
};

const SEED: Record<SoundName, number> = { flip: 11, open: 23, close: 37, shelf: 41, pull: 53, clasp: 67, detent: 71, paper: 83 };

/** Variant `v` of a sound, as mono samples at SR. Always the same samples for the same arguments. */
export function render(name: SoundName, v: number) {
  return MAKE[name](v, rng(SEED[name] * 1000 + v * 7919));
}

export { white };
