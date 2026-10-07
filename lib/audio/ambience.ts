import { Biquad, SR, brown, finish, mix, pink, rng, rise, run, swell, type Rand } from "./dsp";
import { render } from "./synth";

/**
 * The room, barely there. A low tone and a breath of wind that never stop (they are noise, and quiet enough to
 * stay below attention), and now and then something happens a long way off: a bird, a cricket, a sheet of paper.
 * What is on depends on the hour. There is no music, and most of the time most of it is silent.
 */

export type AmbPeriod = "DAWN" | "MORNING" | "DAY" | "EVENING" | "NIGHT";

type Mix = { room: number; wind: number; birds: number; crickets: number; rustle: number };
/** `birds`, `crickets` and `rustle` are events per minute; `room` and `wind` are levels. */
const MIX: Record<AmbPeriod, Mix> = {
  DAWN: { room: 0.5, wind: 0.22, birds: 9, crickets: 0, rustle: 1.5 },
  MORNING: { room: 0.6, wind: 0.12, birds: 7, crickets: 0, rustle: 3 },
  DAY: { room: 0.6, wind: 0.08, birds: 4, crickets: 0, rustle: 3.5 },
  EVENING: { room: 0.42, wind: 0.3, birds: 0.8, crickets: 5, rustle: 1.2 },
  NIGHT: { room: 0.26, wind: 0.2, birds: 0, crickets: 0, rustle: 0.4 },
};

const LOOP = 8; // seconds

/** A loop with no seam: the end is faded into the beginning. */
function loopOf(src: Float32Array, rms: number) {
  const fade = Math.round(0.75 * SR);
  const n = src.length - fade;
  const o = new Float32Array(n);
  for (let i = 0; i < n; i++) o[i] = src[i];
  for (let i = 0; i < fade; i++) {
    const k = i / fade;
    o[i] = src[i] * Math.sin((k * Math.PI) / 2) + src[n + i] * Math.cos((k * Math.PI) / 2);
  }
  let s = 0;
  for (let i = 0; i < n; i++) s += o[i] * o[i];
  const g = rms / Math.sqrt(s / n || 1e-9);
  for (let i = 0; i < n; i++) o[i] *= g;
  return o;
}

function bird(v: number, r: Rand) {
  const out = new Float32Array(Math.round(1.1 * SR));
  const notes = 2 + Math.floor(r() * 3);
  let at = 0.05;
  const base = 1700 + r() * 500;
  for (let k = 0; k < notes; k++) {
    const d = 0.09 + r() * 0.08;
    const n = Math.round(d * SR);
    const note = new Float32Array(n);
    const f1 = base * (1 + r() * 0.5);
    const f2 = f1 * (0.8 + r() * 0.55);
    let ph = 0;
    for (let i = 0; i < n; i++) {
      const t = i / n;
      ph += (2 * Math.PI * (f1 + (f2 - f1) * t * t)) / SR;
      note[i] = Math.sin(ph) * Math.sin(Math.PI * t) ** 2;
    }
    mix(out, note, at, 1);
    at += d + 0.07 + r() * 0.1;
  }
  return finish(out, { rmsDb: -12, peakDb: -6, fadeIn: 0.02, fadeOut: 0.15, top: 2600 });
}

function cricket(v: number, r: Rand) {
  const out = new Float32Array(Math.round(1.6 * SR));
  const f = 3000 + r() * 250;
  for (let b = 0; b < 3; b++) {
    for (let p = 0; p < 4; p++) {
      const at = 0.1 + b * 0.5 + p * 0.062;
      const n = Math.round(0.04 * SR);
      const pulse = new Float32Array(n);
      for (let i = 0; i < n; i++) pulse[i] = Math.sin((2 * Math.PI * f * i) / SR) * swell(i / SR, 0.012, 0.012);
      mix(out, pulse, at, 1);
    }
  }
  return finish(out, { rmsDb: -13, peakDb: -7, fadeIn: 0.03, fadeOut: 0.2, top: 3400 });
}

export class Ambience {
  private src: AudioBufferSourceNode[] = [];
  private lfo: OscillatorNode[] = [];
  private roomG: GainNode;
  private windG: GainNode;
  private windF: BiquadFilterNode;
  private events: Record<"bird" | "cricket" | "rustle", AudioBuffer[]> = { bird: [], cricket: [], rustle: [] };
  private timers: Partial<Record<"birds" | "crickets" | "rustle", number>> = {};
  private mixNow: Mix = MIX.DAY;
  private on = false;
  private built = false;
  private rand = rng(4242);

  constructor(
    private ctx: AudioContext,
    private out: AudioNode,
    private rec: Map<string, AudioBuffer[]> = new Map(),
  ) {
    this.roomG = ctx.createGain();
    this.windG = ctx.createGain();
    this.windF = ctx.createBiquadFilter();
    this.roomG.gain.value = 0;
    this.windG.gain.value = 0;
  }

  private buf(a: Float32Array) {
    const b = this.ctx.createBuffer(1, a.length, SR);
    b.copyToChannel(a as Float32Array<ArrayBuffer>, 0);
    return b;
  }

  private build() {
    if (this.built) return;
    this.built = true;
    const c = this.ctx;
    const r = rng(77);
    const roomBuf = this.rec.get("room")?.[0] ?? this.buf(loopOf(run(brown(LOOP * SR + 0.75 * SR, r), new Biquad().lowpass(210, 0.7)), 0.22));
    const windBuf = this.rec.get("wind")?.[0] ?? this.buf(loopOf(pink(LOOP * SR + 0.75 * SR, r), 0.2));
    const room = c.createBufferSource();
    room.buffer = roomBuf;
    room.loop = true;
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 240;
    room.connect(lp).connect(this.roomG).connect(this.out);
    const wind = c.createBufferSource();
    wind.buffer = windBuf;
    wind.loop = true;
    wind.playbackRate.value = 0.8;
    this.windF.type = "bandpass";
    this.windF.frequency.value = 320;
    this.windF.Q.value = 0.6;
    wind.connect(this.windF).connect(this.windG).connect(this.out);
    // the wind breathes: its pitch and its level drift, slowly and out of step
    const drift = (target: AudioParam, rate: number, depth: number) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.frequency.value = rate;
      g.gain.value = depth;
      o.connect(g).connect(target);
      o.start();
      this.lfo.push(o);
    };
    drift(this.windF.frequency, 0.063, 110);
    drift(this.windG.gain, 0.097, 0.03);
    room.start();
    wind.start();
    this.src.push(room, wind);
    this.events.bird = this.rec.get("bird") ?? [0, 1, 2].map((v) => this.buf(bird(v, rng(100 + v))));
    this.events.cricket = this.rec.get("cricket") ?? [0, 1, 2].map((v) => this.buf(cricket(v, rng(200 + v))));
    for (let v = 0; v < 3; v++) this.events.rustle.push(this.rec.get("paper")?.[v % this.rec.get("paper")!.length] ?? this.buf(render("paper", v)));
  }

  /** Move toward the mix for this hour, over a few seconds. */
  setPeriod(p: AmbPeriod) {
    this.mixNow = MIX[p];
    if (!this.on) return;
    const t = this.ctx.currentTime;
    this.roomG.gain.setTargetAtTime(this.mixNow.room, t, 3);
    this.windG.gain.setTargetAtTime(this.mixNow.wind * 0.5, t, 3);
    this.schedule();
  }

  start(p: AmbPeriod) {
    this.build();
    if (this.on) return;
    this.on = true;
    this.mixNow = MIX[p];
    const t = this.ctx.currentTime;
    this.roomG.gain.cancelScheduledValues(t);
    this.windG.gain.cancelScheduledValues(t);
    this.roomG.gain.setTargetAtTime(this.mixNow.room, t, 2.5);
    this.windG.gain.setTargetAtTime(this.mixNow.wind * 0.5, t, 2.5);
    this.schedule();
  }

  stop() {
    this.on = false;
    const t = this.ctx.currentTime;
    this.roomG.gain.setTargetAtTime(0, t, 0.4);
    this.windG.gain.setTargetAtTime(0, t, 0.4);
    for (const k of Object.keys(this.timers) as (keyof typeof this.timers)[]) {
      window.clearTimeout(this.timers[k]);
      delete this.timers[k];
    }
  }

  /** One timer per kind of event; each waits a random time, so nothing ever repeats on a beat. */
  private schedule() {
    const kinds: [keyof Mix & ("birds" | "crickets" | "rustle"), "bird" | "cricket" | "rustle", number][] = [
      ["birds", "bird", 0.5],
      ["crickets", "cricket", 0.45],
      ["rustle", "rustle", 0.7],
    ];
    for (const [k, ev, lvl] of kinds) {
      window.clearTimeout(this.timers[k]);
      delete this.timers[k];
      const perMin = this.mixNow[k];
      if (perMin <= 0) continue;
      const wait = () => (60000 / perMin) * (0.4 + this.rand() * 1.2);
      const fire = () => {
        if (!this.on) return;
        if (!document.hidden) this.once(ev, lvl);
        this.timers[k] = window.setTimeout(fire, wait());
      };
      this.timers[k] = window.setTimeout(fire, wait());
    }
  }

  private once(ev: "bird" | "cricket" | "rustle", level: number) {
    const bufs = this.events[ev];
    const c = this.ctx;
    const s = c.createBufferSource();
    s.buffer = bufs[Math.floor(this.rand() * bufs.length)];
    s.playbackRate.value = 0.94 + this.rand() * 0.12;
    const g = c.createGain();
    g.gain.value = level * (0.5 + this.rand() * 0.5);
    const pan = c.createStereoPanner();
    pan.pan.value = this.rand() * 1.4 - 0.7;
    s.connect(g).connect(pan).connect(this.out);
    s.onended = () => pan.disconnect();
    s.start();
  }
}

export { rise };
