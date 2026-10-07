/**
 * Ambient lighting pass rendered behind the DOM books:
 *  - a soft window shaft from the upper left with slow-moving rays
 *  - a pool of daylight where the book rests (tinted by the open volume), gentle vignette, dithering
 *  - drifting dust motes that are most visible where they cross the shaft
 *
 * One WebGL context, two draw calls, rendered from GSAP's ticker so it shares
 * the same frame as every other animation.
 */
import * as THREE from "three";

const BEAM_GLSL = /* glsl */ `
  float beamMask(vec2 uv, float asp, vec2 focus) {
    vec2 p = vec2(uv.x * asp, uv.y);
    vec2 f = vec2(focus.x * asp, focus.y);
    vec2 src = vec2(asp * 0.16, 1.32);
    vec2 dir = normalize(f - src);
    vec2 v = p - src;
    float dist = length(v);
    float c = dot(v / max(dist, 1e-4), dir);
    float len = length(f - src);
    float cone = smoothstep(0.958, 0.992, c);
    float along = dist / len;
    return cone * smoothstep(0.0, 0.35, along) * smoothstep(1.75, 0.55, along);
  }
`;

const NOISE_GLSL = /* glsl */ `
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
    return v;
  }
`;

const bgVert = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const bgFrag = /* glsl */ `
  precision highp float;
  uniform vec2 uRes;
  uniform float uTime;
  uniform float uIntensity;
  uniform vec2 uFocus;
  uniform vec3 uTint;
  varying vec2 vUv;
  ${NOISE_GLSL}
  ${BEAM_GLSL}
  void main() {
    vec2 uv = vUv;
    float asp = uRes.x / uRes.y;
    vec2 p = vec2(uv.x * asp, uv.y);
    vec2 f = vec2(uFocus.x * asp, uFocus.y);

    // a bright, slightly warm room
    vec3 col = vec3(0.906, 0.898, 0.878);

    // daylight pooled around the book, tinted by whichever volume is on the table
    float d = length((p - f) * vec2(0.75, 1.0));
    float pool = pow(smoothstep(0.95, 0.0, d), 1.5);
    col += vec3(0.055, 0.056, 0.058) * pool;
    col = mix(col, col * uTint, 0.42 * pool);

    // a soft shaft from a window, upper left
    vec2 src = vec2(asp * 0.16, 1.32);
    vec2 v = p - src;
    float ang = atan(v.y, v.x);
    float shafts = fbm(vec2(ang * 22.0, length(v) * 1.2 - uTime * 0.035));
    float beam = beamMask(uv, asp, uFocus) * (0.45 + 0.75 * shafts);
    col += vec3(0.05, 0.048, 0.04) * beam;

    // air
    col += (fbm(p * 2.0 + vec2(uTime * 0.01, -uTime * 0.013)) - 0.45) * 0.022;

    // edges of the room fall away gently
    float vig = smoothstep(1.35, 0.35, length((uv - vec2(0.5, 0.48)) * vec2(asp * 0.85, 1.05)));
    col *= mix(0.86, 1.0, vig);

    // fade up from the white page it starts on
    col = mix(vec3(1.0), col, uIntensity);
    // triangular dither against banding in the soft gradients
    float n = hash(uv * uRes + fract(uTime * 7.0)) + hash(uv * uRes * 1.37 - fract(uTime * 3.0)) - 1.0;
    col += n / 255.0 * 1.5;
    gl_FragColor = vec4(col, 1.0);
  }
`;

const dustVert = /* glsl */ `
  attribute vec4 aSeed; // x, y, depth, phase
  uniform float uTime;
  uniform float uScroll;
  uniform float uPR;
  uniform vec2 uRes;
  uniform vec2 uFocus;
  varying float vAlpha;
  ${BEAM_GLSL}
  void main() {
    float depth = aSeed.z;
    float ph = aSeed.w * 6.2831;
    vec2 uv;
    uv.x = fract(aSeed.x + sin(uTime * 0.09 * (0.6 + depth) + ph) * 0.035 + uScroll * 0.015 * depth);
    uv.y = fract(aSeed.y + uTime * (0.004 + 0.009 * depth) + cos(uTime * 0.11 + ph) * 0.02 - uScroll * 0.05 * depth);
    float asp = uRes.x / uRes.y;
    float lit = beamMask(uv, asp, uFocus);
    float pool = smoothstep(0.55, 0.0, length((uv - uFocus) * vec2(asp, 1.0)));
    float twinkle = 0.65 + 0.35 * sin(uTime * (0.8 + aSeed.w * 1.6) + ph);
    vAlpha = (lit * 0.95 + pool * 0.22 + 0.035) * twinkle * (0.35 + 0.65 * depth);
    gl_PointSize = (1.2 + depth * depth * 5.5) * uPR;
    gl_Position = vec4(uv * 2.0 - 1.0, 0.0, 1.0);
  }
`;

const dustFrag = /* glsl */ `
  precision highp float;
  uniform float uIntensity;
  uniform vec3 uTint;
  varying float vAlpha;
  void main() {
    float r = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, r);
    a *= a;
    // fine warm specks floating in the light (ordinary alpha blending — additive would vanish on a bright room)
    gl_FragColor = vec4(mix(vec3(0.5, 0.45, 0.38), uTint * 0.5, 0.3), clamp(a * vAlpha * 1.5, 0.0, 0.55) * uIntensity);
  }
`;

export type Ambient = {
  render: (time: number) => void;
  setIntensity: (v: number) => void;
  setScroll: (v: number) => void;
  setFocus: (x: number, y: number) => void;
  setTint: (r: number, g: number, b: number) => void;
  resize: () => void;
  dispose: () => void;
};

export function createAmbient(canvas: HTMLCanvasElement, opts: { particles: number }): Ambient | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "high-performance" });
  } catch {
    return null;
  }
  const pr = Math.min(window.devicePixelRatio || 1, 1.5);
  // the backdrop is soft by nature — render it below native resolution for free
  renderer.setPixelRatio(pr * 0.7);

  const scene = new THREE.Scene();
  const camera = new THREE.Camera();

  const shared = {
    uTime: { value: 0 },
    uIntensity: { value: 0 },
    uRes: { value: new THREE.Vector2(1, 1) },
    uFocus: { value: new THREE.Vector2(0.5, 0.42) },
    uTint: { value: new THREE.Vector3(1, 1, 1) },
  };

  const bg = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({ vertexShader: bgVert, fragmentShader: bgFrag, uniforms: shared, depthTest: false, depthWrite: false }),
  );
  bg.frustumCulled = false;
  scene.add(bg);

  const n = opts.particles;
  const geo = new THREE.BufferGeometry();
  const seeds = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    seeds[i * 4] = Math.random();
    seeds[i * 4 + 1] = Math.random();
    seeds[i * 4 + 2] = Math.pow(Math.random(), 1.6);
    seeds[i * 4 + 3] = Math.random();
  }
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 4));
  const dustUniforms = { ...shared, uScroll: { value: 0 }, uPR: { value: pr } };
  const dust = new THREE.Points(
    geo,
    new THREE.ShaderMaterial({
      vertexShader: dustVert,
      fragmentShader: dustFrag,
      uniforms: dustUniforms,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.NormalBlending,
    }),
  );
  dust.frustumCulled = false;
  scene.add(dust);

  const resize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    shared.uRes.value.set(w, h);
  };
  resize();

  return {
    render(time) {
      if (shared.uIntensity.value <= 0.001) return;
      shared.uTime.value = time;
      renderer.render(scene, camera);
    },
    setIntensity(v) {
      shared.uIntensity.value = v;
    },
    setScroll(v) {
      dustUniforms.uScroll.value = v;
    },
    setFocus(x, y) {
      shared.uFocus.value.set(x, y);
    },
    setTint(r, g, b) {
      shared.uTint.value.set(r, g, b);
    },
    resize,
    dispose() {
      geo.dispose();
      (bg.material as THREE.Material).dispose();
      bg.geometry.dispose();
      (dust.material as THREE.Material).dispose();
      renderer.dispose();
    },
  };
}
