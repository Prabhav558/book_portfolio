/**
 * Drives the site in real Chrome at several device sizes.
 *
 *   node tools/check.mjs shots            screenshots of key states per device → tools/out/
 *   node tools/check.mjs perf [throttle]  frame times for intro, turns, drags and a book handoff
 *
 * Needs the site running on http://localhost:3123 (npm run build && npx next start -p 3123).
 */
import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, "out");
const URL = process.env.SITE ?? "http://localhost:3123/";
const CHROME = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const DEVICES = {
  desktop: { width: 1440, height: 900 },
  laptop: { width: 1280, height: 720 },
  wide: { width: 2560, height: 1080 },
  "tablet-portrait": { width: 820, height: 1180, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  "tablet-landscape": { width: 1180, height: 820, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  phone: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 3 },
  "phone-small": { width: 360, height: 640, isMobile: true, hasTouch: true, deviceScaleFactor: 3 },
  "phone-landscape": { width: 844, height: 390, isMobile: true, hasTouch: true, deviceScaleFactor: 3 },
};

async function open(browser, vp, errors) {
  const page = await browser.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.setViewport(vp);
  await page.goto(URL, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".book-anchor", { timeout: 120000 });
  return page;
}
const introDone = (page) =>
  page.waitForFunction(() => parseFloat(getComputedStyle(document.querySelector("[data-intro-hint]")).opacity) > 0.95, { timeout: 120000 });

const step = async (page, vp, dir = 1) => {
  await page.keyboard.press(dir > 0 ? "ArrowRight" : "ArrowLeft");
};

/** Drag a page across the open book with the mouse or a finger. */
async function drag(page, vp, { from, to, steps = 18, hold = 0 }) {
  const y = vp.height * 0.6;
  if (vp.hasTouch) {
    await page.touchscreen.touchStart(from, y);
    for (let i = 1; i <= steps; i++) {
      await page.touchscreen.touchMove(from + ((to - from) * i) / steps, y);
      await sleep(12);
    }
    if (hold) await sleep(hold);
    await page.touchscreen.touchEnd();
  } else {
    await page.mouse.move(from, y);
    await page.mouse.down();
    for (let i = 1; i <= steps; i++) {
      await page.mouse.move(from + ((to - from) * i) / steps, y);
      await sleep(12);
    }
    if (hold) await sleep(hold);
    await page.mouse.up();
  }
}

async function shots(only) {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--enable-gpu", "--ignore-gpu-blocklist"] });
  const errors = [];
  for (const [name, vp] of Object.entries(DEVICES)) {
    if (only.length && !only.includes(name)) continue;
    const page = await open(browser, vp, errors);
    const shot = (n) => page.screenshot({ path: path.join(OUT, `${name}-${n}.png`) });
    await introDone(page);
    await shot("1-closed");
    await page.click(".clasp");
    await sleep(3000);
    await shot("2-open");
    await step(page, vp);
    await sleep(600);
    await shot("3-turning");
    await sleep(1600);
    await shot("4-next");
    // hold a dragged page mid-turn
    const cx = vp.width / 2;
    const edge = Math.min(vp.width - 30, cx + vp.width * 0.3);
    const y = vp.height * 0.6;
    if (vp.hasTouch) {
      await page.touchscreen.touchStart(edge, y);
      for (let i = 1; i <= 14; i++) {
        await page.touchscreen.touchMove(edge - (vp.width * 0.3 * i) / 14, y);
        await sleep(12);
      }
      await sleep(150);
      await shot("5-dragging");
      await page.touchscreen.touchEnd();
    } else {
      await page.mouse.move(edge, y);
      await page.mouse.down();
      for (let i = 1; i <= 14; i++) {
        await page.mouse.move(edge - (vp.width * 0.3 * i) / 14, y);
        await sleep(12);
      }
      await sleep(150);
      await shot("5-dragging");
      await page.mouse.up();
    }
    await sleep(1800);
    // jump to the next volume through the shelf
    await page.evaluate(() => document.querySelector('[data-slot="1"]')?.click());
    await sleep(4200);
    await shot("6-book2");
    await page.evaluate(() => document.querySelector('[data-slot="3"]')?.click());
    await sleep(4600);
    await shot("7-book4");
    const pages = await page.evaluate(() =>
      [...document.querySelectorAll(".book-anchor")].map((a) => `${a.dataset.mode}:${a.querySelectorAll(".face[data-step] .pg-foot").length}`).join("  "),
    );
    console.log(name.padEnd(18), pages);
    await page.close();
  }
  console.log(errors.length ? `ERRORS\n${[...new Set(errors)].join("\n")}` : "no page errors");
  await browser.close();
}

async function perf(throttle) {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--enable-gpu", "--ignore-gpu-blocklist"] });
  const errors = [];
  for (const name of ["desktop", "phone"]) {
    const vp = DEVICES[name];
    const page = await open(browser, vp, errors);
    const cdp = await page.target().createCDPSession();
    if (throttle > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: throttle });
    await page.evaluate(() => {
      window.__g = [];
      let last = performance.now();
      const loop = (t) => {
        window.__g.push([t, t - last]);
        last = t;
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    });
    const now = () => page.evaluate(() => performance.now());
    const report = async (label, from) => {
      const g = await page.evaluate((f) => window.__g.filter((x) => x[0] >= f).map((x) => x[1]), from);
      const s = [...g].sort((a, b) => a - b);
      const q = (p) => s[Math.floor(p * (s.length - 1))].toFixed(1);
      console.log(
        `${name.padEnd(8)} ${label.padEnd(20)} frames=${String(g.length).padStart(4)} p50=${q(0.5)} p95=${q(0.95)} max=${s[s.length - 1].toFixed(0)}ms  >33ms=${g.filter((x) => x > 33.4).length}  >50ms=${g.filter((x) => x > 50).length}`,
      );
    };
    const timed = async (label, fn, wait) => {
      const f = await now();
      await fn();
      await sleep(wait);
      await report(label, f);
    };
    // measure from the first pencil stroke: before that the page is still loading under a blank screen
    await page.waitForFunction(() => document.querySelectorAll(".sketch path").length > 0, { timeout: 60000 });
    let t = await now();
    await introDone(page);
    await report("intro (drawing on)", t);
    await sleep(400);
    await timed("clasp + open", () => page.click(".clasp"), 2700);
    await timed("first turn", () => step(page, vp), 1900);
    await timed("turn", () => step(page, vp), 1900);
    const cx = vp.width / 2;
    await timed("drag back", () => drag(page, vp, { from: cx - vp.width * 0.25, to: cx + vp.width * 0.2 }), 1700);
    await timed("drag forward", () => drag(page, vp, { from: cx + vp.width * 0.3, to: cx - vp.width * 0.2 }), 1700);
    await timed("book handoff", () => page.evaluate(() => document.querySelector('[data-slot="1"]')?.click()), 4600);
    await timed("first turn, book 2", () => step(page, vp), 1900);
    await timed("idle", async () => {}, 1200);
    await page.close();
  }
  console.log(errors.length ? `ERRORS\n${[...new Set(errors)].join("\n")}` : "no page errors");
  await browser.close();
}

const [, , cmd, ...rest] = process.argv[1]?.endsWith("check.mjs") ? process.argv : [];
if (cmd === "perf") await perf(Number(rest[0] ?? 1));
else if (cmd) await shots(rest);
