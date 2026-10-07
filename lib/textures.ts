/**
 * Material textures, generated once on the client and exposed as CSS custom properties:
 * cloth weave for the covers, a whisper of fibre for the paper, and oak grain
 * (vertical for spines, horizontal for the ledge). Small seamless PNG tiles; no network.
 */

function canvas(w: number, h: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!, w, h);
  return c;
}

function toUrl(c: HTMLCanvasElement): Promise<string> {
  return new Promise((resolve) => c.toBlob((b) => resolve(b ? URL.createObjectURL(b) : c.toDataURL()), "image/png"));
}

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

/** Book cloth: short irregular threads both ways. No regular grid — that shimmers when the book is small. */
function cloth(ctx: CanvasRenderingContext2D, w: number, h: number) {
  for (let i = 0; i < 5200; i++) {
    const dark = Math.random() < 0.55;
    ctx.fillStyle = `rgba(${dark ? "0,0,0" : "255,255,255"},${rnd(0.008, dark ? 0.03 : 0.024)})`;
    const len = rnd(2, 9);
    const x = Math.floor(rnd(0, w));
    const y = Math.floor(rnd(0, h));
    // drawn wrapped so the tile repeats without seams
    for (const ox of [-w, 0]) {
      for (const oy of [-h, 0]) {
        if (i % 2) ctx.fillRect(x + ox, y + oy, len, 1);
        else ctx.fillRect(x + ox, y + oy, 1, len);
      }
    }
  }
}

/** Paper: barely-there fibre so large flat areas do not look digital. */
function paper(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const img = ctx.createImageData(w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = Math.random();
    const dark = v < 0.5;
    d[i] = dark ? 70 : 255;
    d[i + 1] = dark ? 62 : 253;
    d[i + 2] = dark ? 48 : 246;
    d[i + 3] = dark ? v * 12 : (v - 0.5) * 12;
  }
  ctx.putImageData(img, 0, 0);
}

/** Oak: long, slightly wandering grain lines over a few broad figure bands. Tiles in both directions. */
function oak(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const strand = (x0: number, width: number, colour: string) => {
    const amp = rnd(0, 4.5);
    const k = Math.random() < 0.7 ? 1 : 2;
    const ph = rnd(0, Math.PI * 2);
    ctx.strokeStyle = colour;
    ctx.lineWidth = width;
    for (const off of [-w, 0, w]) {
      ctx.beginPath();
      for (let y = -8; y <= h + 8; y += 8) {
        const x = x0 + off + amp * Math.sin((2 * Math.PI * k * y) / h + ph);
        if (y === -8) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  };
  for (let i = 0; i < 7; i++) strand(rnd(0, w), rnd(12, 30), `rgba(120,84,46,${rnd(0.03, 0.07)})`);
  for (let i = 0; i < 5; i++) strand(rnd(0, w), rnd(10, 24), `rgba(255,246,226,${rnd(0.04, 0.09)})`);
  for (let i = 0; i < 110; i++) {
    const light = Math.random() < 0.28;
    strand(rnd(0, w), rnd(0.4, light ? 1.6 : 2), light ? `rgba(255,244,222,${rnd(0.06, 0.18)})` : `rgba(112,76,40,${rnd(0.05, 0.2)})`);
  }
}

let done: Promise<void> | null = null;

export function installTextures() {
  if (done) return done;
  done = (async () => {
    const grain = canvas(220, 440, oak);
    const across = canvas(440, 220, (ctx) => {
      ctx.translate(440, 0);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(grain, 0, 0);
    });
    const [c, p, wv, wh] = await Promise.all([toUrl(canvas(256, 256, cloth)), toUrl(canvas(240, 240, paper)), toUrl(grain), toUrl(across)]);
    const root = document.documentElement.style;
    root.setProperty("--grain", `url(${c})`);
    root.setProperty("--paper-grain", `url(${p})`);
    root.setProperty("--wood", `url(${wv})`);
    root.setProperty("--wood-h", `url(${wh})`);
  })();
  return done;
}
