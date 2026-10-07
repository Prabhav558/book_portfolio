/**
 * Generates the leather-grain and paper-fibre textures once, on the client,
 * and exposes them as CSS custom properties. Tiny tiling PNGs; no network.
 */

function grainCanvas(size: number, draw: (ctx: CanvasRenderingContext2D, size: number) => void) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  draw(ctx, size);
  return c;
}

function toUrl(c: HTMLCanvasElement): Promise<string> {
  return new Promise((resolve) =>
    c.toBlob((b) => resolve(b ? URL.createObjectURL(b) : c.toDataURL()), "image/png"),
  );
}

/** Matte cloth: soft low-frequency mottling + fine pores, as light/dark alpha specks. */
function leather(ctx: CanvasRenderingContext2D, s: number) {
  // low-frequency mottling: draw a small noise field and upscale with smoothing
  const low = grainCanvas(24, (lc, ls) => {
    const img = lc.createImageData(ls, ls);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random();
      const dark = v < 0.5;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = dark ? 0 : 255;
      img.data[i + 3] = Math.abs(v - 0.5) * 12;
    }
    lc.putImageData(img, 0, 0);
  });
  ctx.imageSmoothingEnabled = true;
  // draw tiled 2×2 so edges wrap seamlessly enough at this alpha
  ctx.drawImage(low, 0, 0, s, s);

  const img = ctx.getImageData(0, 0, s, s);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = Math.random();
    if (r < 0.18) {
      // pores
      d[i] = d[i + 1] = d[i + 2] = 0;
      d[i + 3] = Math.max(d[i + 3], 6 + Math.random() * 9);
    } else if (r > 0.94) {
      d[i] = d[i + 1] = d[i + 2] = 255;
      d[i + 3] = Math.max(d[i + 3], 4 + Math.random() * 6);
    }
  }
  ctx.putImageData(img, 0, 0);
}

/** Paper: very fine, low-contrast fibre noise. */
function paper(ctx: CanvasRenderingContext2D, s: number) {
  const img = ctx.createImageData(s, s);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = Math.random();
    const dark = v < 0.55;
    d[i] = dark ? 90 : 255;
    d[i + 1] = dark ? 70 : 252;
    d[i + 2] = dark ? 45 : 240;
    d[i + 3] = dark ? v * 22 : (v - 0.55) * 20;
  }
  ctx.putImageData(img, 0, 0);
  // a few faint fibres
  ctx.globalAlpha = 0.05;
  ctx.strokeStyle = "#6b5236";
  ctx.lineWidth = 0.6;
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * s;
    const y = Math.random() * s;
    const a = Math.random() * Math.PI;
    const l = 4 + Math.random() * 10;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + 2, y + Math.sin(a) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
    ctx.stroke();
  }
}

let done: Promise<void> | null = null;

export function installTextures() {
  if (done) return done;
  done = (async () => {
    const [g, p] = await Promise.all([toUrl(grainCanvas(220, leather)), toUrl(grainCanvas(260, paper))]);
    const root = document.documentElement.style;
    root.setProperty("--grain", `url(${g})`);
    root.setProperty("--paper-grain", `url(${p})`);
  })();
  return done;
}
