import { PEAK_CAP_DB, TARGET_RMS_DB } from "./config";
import { Biquad, SR, finish, rise, rng, type Rand } from "./dsp";

/**
 * The little people's voices: a glottal buzz run through vowel formants, which is how a voice is made.
 * "Wohoo!" when somebody is picked up, "woaahh" when they are knocked aside. They are tiny and far away:
 * low in level, with nothing above 3 kHz.
 */

export type VoiceKind = "grab" | "push";
export const PITCHES = [105, 150, 215] as const; // low, middle, high speaking pitch in Hz
export const VOICE_VARIANTS = 2;

type Vowel = readonly [number, number, number];
const U: Vowel = [310, 870, 2240];
const O: Vowel = [450, 820, 2700];
const A: Vowel = [720, 1100, 2440];

type Key = { t: number; f0: number; v: Vowel; amp: number; breath: number };

function keys(kind: VoiceKind, wob: number): Key[] {
  if (kind === "grab") {
    // wo - (h) - hoo, rising: the surprise of being lifted
    return [
      { t: 0, f0: 0.9, v: U, amp: 0, breath: 0.05 },
      { t: 0.07, f0: 0.95, v: U, amp: 0.6, breath: 0.05 },
      { t: 0.2, f0: 1.22, v: O, amp: 1, breath: 0.03 },
      { t: 0.3, f0: 1.18, v: O, amp: 0.7, breath: 0.03 },
      { t: 0.36, f0: 1.15, v: O, amp: 0.18, breath: 0.35 },
      { t: 0.44, f0: 1.3, v: O, amp: 0.85, breath: 0.12 },
      { t: 0.62, f0: 1.4 + wob * 0.05, v: U, amp: 0.9, breath: 0.05 },
      { t: 0.82, f0: 1.28, v: U, amp: 0, breath: 0.1 },
    ];
  }
  // wo-aah, falling: being shoved
  return [
    { t: 0, f0: 1.15, v: U, amp: 0, breath: 0.05 },
    { t: 0.06, f0: 1.2, v: U, amp: 0.6, breath: 0.05 },
    { t: 0.18, f0: 1.25, v: O, amp: 1, breath: 0.03 },
    { t: 0.4, f0: 1.05, v: A, amp: 0.95, breath: 0.05 },
    { t: 0.7, f0: 0.85 - wob * 0.03, v: A, amp: 0.55, breath: 0.15 },
    { t: 0.95, f0: 0.72, v: A, amp: 0, breath: 0.3 },
  ];
}

function at(ks: Key[], t: number) {
  let i = 0;
  while (i < ks.length - 2 && t > ks[i + 1].t) i++;
  const a = ks[i];
  const b = ks[i + 1];
  const k = rise(t - a.t, b.t - a.t);
  const l = (x: number, y: number) => x + (y - x) * k;
  return { f0: l(a.f0, b.f0), amp: l(a.amp, b.amp), breath: l(a.breath, b.breath), v: [l(a.v[0], b.v[0]), l(a.v[1], b.v[1]), l(a.v[2], b.v[2])] as const };
}

export function renderVoice(kind: VoiceKind, bucket: number, variant: number): Float32Array {
  const r: Rand = rng(9001 + bucket * 131 + variant * 17 + (kind === "grab" ? 0 : 5));
  const base = PITCHES[bucket] * (1 + (variant ? 0.06 : -0.04));
  const ks = keys(kind, variant ? 1 : -1);
  const dur = ks[ks.length - 1].t + 0.12;
  const n = Math.round(dur * SR);
  const out = new Float32Array(n);
  const fm = [new Biquad(), new Biquad(), new Biquad()];
  const bw = [90, 110, 160];
  const gain = [1, 0.55, 0.22];
  let ph = 0;
  const vib = 5.2 + r() * 1.2;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const s = at(ks, Math.min(t, ks[ks.length - 1].t));
    const f0 = base * s.f0 * (1 + 0.012 * Math.sin(2 * Math.PI * vib * t) * rise(t, 0.3));
    ph += (2 * Math.PI * f0) / SR;
    // glottal buzz: harmonics falling away at 12 dB/octave-ish, none above 3.5 kHz
    let src = 0;
    const top = Math.min(40, Math.floor(3500 / f0));
    for (let h = 1; h <= top; h++) src += Math.sin(h * ph) / (h * 1.35);
    const x = src * (1 - s.breath) + (r() * 2 - 1) * s.breath * 1.6;
    if ((i & 31) === 0) for (let k = 0; k < 3; k++) fm[k].bandpass(s.v[k], s.v[k] / bw[k]);
    let y = 0;
    for (let k = 0; k < 3; k++) y += fm[k].p(x) * gain[k];
    out[i] = y * s.amp * rise(t, 0.03);
  }
  return finish(out, { rmsDb: TARGET_RMS_DB, peakDb: PEAK_CAP_DB, fadeIn: 0.03, fadeOut: 0.12, top: 2800 });
}

/** Which of the three voices is nearest this pitch (Hz). */
export function bucketOf(pitch: number) {
  let best = 0;
  for (let i = 1; i < PITCHES.length; i++) if (Math.abs(PITCHES[i] - pitch) < Math.abs(PITCHES[best] - pitch)) best = i;
  return best;
}
