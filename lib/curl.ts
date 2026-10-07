/**
 * Page-curl engine.
 *
 * A turning page is a chain of N hinged strips (see <BendLeaf/>). For a turn
 * progress p ∈ [0,1] we compute each strip's angle so the sheet lifts with its
 * free edge leading, passes vertical, and floats down with the edge trailing —
 * the way paper actually behaves. Lighting is evaluated per hinge with a
 * Lambert model and interpolated across each strip with two gradient overlays,
 * so shading is continuous instead of banded. Everything written per frame is
 * a transform or an opacity.
 */

export type Bend = {
  strips: HTMLElement[];
  /** front-face overlays: [darkens toward left, darkens toward right] per strip */
  fa: HTMLElement[];
  fb: HTMLElement[];
  ba: HTMLElement[];
  bb: HTMLElement[];
  fronts: HTMLElement[];
  backs: HTMLElement[];
  weights: number[];
  last: number;
};

export function collectBend(root: HTMLElement): Bend {
  const strips = Array.from(root.querySelectorAll<HTMLElement>(".strip"));
  const pick = (s: HTMLElement, sel: string) => s.querySelector<HTMLElement>(`:scope > ${sel}`);
  const n = strips.length;
  // curvature concentrates toward the free edge, like a sheet held at the spine
  const raw = Array.from({ length: n }, (_, k) => (k === 0 ? 0 : Math.pow(k, 1.35)));
  const sum = raw.reduce((a, b) => a + b, 0) || 1;
  return {
    strips,
    fronts: strips.map((s) => pick(s, ".sface--front")!),
    backs: strips.map((s) => pick(s, ".sface--back")!).filter(Boolean),
    fa: strips.map((s) => pick(s, ".sface--front")!.querySelector<HTMLElement>(".sshade--a")!),
    fb: strips.map((s) => pick(s, ".sface--front")!.querySelector<HTMLElement>(".sshade--b")!),
    ba: strips.map((s) => pick(s, ".sface--back")?.querySelector<HTMLElement>(".sshade--a") ?? null!),
    bb: strips.map((s) => pick(s, ".sface--back")?.querySelector<HTMLElement>(".sshade--b") ?? null!),
    weights: raw.map((r) => r / sum),
    last: -1,
  };
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// light arrives from the upper-left lamp, slightly in front of the page
const LX = -0.45;
const LZ = 1;
const LN = Math.hypot(LX, LZ);
const REST = LZ / LN; // lambert of a page lying flat

/** 0 = fully lit, 1 = darkest, for a surface whose normal is rotateY(a). */
function shadeFront(aRad: number) {
  const lambert = (LX * Math.sin(aRad) + LZ * Math.cos(aRad)) / LN;
  return Math.min(1, Math.max(0, (REST - lambert) / REST));
}
function shadeBack(aRad: number) {
  const lambert = (-LX * Math.sin(aRad) - LZ * Math.cos(aRad)) / LN;
  return Math.min(1, Math.max(0, (REST - lambert) / REST));
}

const D2R = Math.PI / 180;

/**
 * @param end  final spine angle: -180 for a two-page spread, about -165 for single pages
 * @param fade single-page mode fades the sheet out as it leaves
 */
export function applyCurl(b: Bend, p: number, end = -180, fade = false) {
  if (Math.abs(p - b.last) < 1e-5) return;
  b.last = p;
  const n = b.strips.length;

  // spine angle follows the tween's own ease (slow lift, quick middle, gentle landing)
  const spine = end * p;
  // edge leads while lifting (negative), trails while landing (positive)
  const bend = -58 * Math.sin(2 * Math.PI * p) * (1 - 0.28 * p) * (end === -180 ? 1 : 0.8);

  const world: number[] = new Array(n);
  let acc = 0;
  for (let k = 0; k < n; k++) {
    const rel = k === 0 ? spine : bend * b.weights[k];
    acc += rel;
    // never pass through the page stacks
    if (acc > 0) acc = 0;
    if (acc < -180) acc = -180;
    world[k] = acc;
    const prev = k === 0 ? 0 : world[k - 1];
    b.strips[k].style.transform = `rotateY(${(k === 0 ? acc : acc - prev).toFixed(3)}deg)`;
  }

  // shading at each hinge, interpolated across strips
  const hinge = (j: number) => (j <= 0 ? world[0] : j >= n ? world[n - 1] : (world[j - 1] + world[j]) / 2) * D2R;
  const STRENGTH = 0.82;
  for (let k = 0; k < n; k++) {
    const l = hinge(k);
    const r = hinge(k + 1);
    b.fa[k].style.opacity = (shadeFront(l) * STRENGTH).toFixed(3);
    b.fb[k].style.opacity = (shadeFront(r) * STRENGTH).toFixed(3);
    if (b.ba[k]) {
      // a back face is mirrored: its local left is the strip's world right
      b.ba[k].style.opacity = (shadeBack(r) * STRENGTH).toFixed(3);
      b.bb[k].style.opacity = (shadeBack(l) * STRENGTH).toFixed(3);
    }
  }

  if (fade) {
    const o = (1 - smooth(0.62, 0.97, p)).toFixed(3);
    for (const f of b.fronts) f.style.opacity = o;
  }
}

export type RigJob = { cancelled: boolean; step: () => boolean; flush: () => void };

/**
 * Copies a face's printed paper into every strip window (front = index k, back = mirrored index),
 * one strip at a time, so building the next turning sheet never blocks a frame.
 */
export function createFill(rig: HTMLElement, front: HTMLElement | null, back: HTMLElement | null): RigJob {
  const clean = (face: HTMLElement | null) => {
    const paper = face?.querySelector<HTMLElement>(".paper");
    if (!paper) {
      const blank = document.createElement("div");
      blank.className = "paper";
      blank.dataset.side = "L";
      return blank;
    }
    const c = paper.cloneNode(true) as HTMLElement;
    c.querySelectorAll(".cast, .shade, .leaf-gloss").forEach((n) => n.remove());
    return c;
  };
  const f = clean(front);
  const b = clean(back);
  const strips = Array.from(rig.querySelectorAll<HTMLElement>(".strip"));
  let i = 0;
  const job: RigJob = {
    cancelled: false,
    step() {
      if (job.cancelled || i >= strips.length) return true;
      const s = strips[i++];
      s.querySelector(":scope > .sface--front .spage")!.replaceChildren(f.cloneNode(true));
      s.querySelector(":scope > .sface--back .spage")!.replaceChildren(b.cloneNode(true));
      return i >= strips.length;
    },
    flush() {
      while (!job.step());
    },
  };
  return job;
}

/** Fill every strip right now (used only if a turn starts before the idle fill finished). */
export function fillRig(rig: HTMLElement, front: HTMLElement | null, back: HTMLElement | null) {
  createFill(rig, front, back).flush();
}

/** Shadow the lifting sheet casts on the page beneath it, and on the page it lands on. */
export function castUnder(p: number) {
  return 0.85 * smooth(0, 0.14, p) * (1 - smooth(0.32, 0.62, p));
}
export function castLanding(p: number) {
  return 0.8 * smooth(0.55, 0.86, p) * (1 - smooth(0.9, 1, p));
}
