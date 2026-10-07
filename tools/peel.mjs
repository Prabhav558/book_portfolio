/**
 * Pick pages up by hand and photograph them mid-turn.  node tools/peel.mjs [device ...]
 * Output: tools/out/peel-<device>-<n>-<name>.png
 */
import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEVICES } from "./check.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, "out");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new", args: ["--enable-gpu", "--ignore-gpu-blocklist"] });
const errors = [];
for (const name of process.argv.slice(2).length ? process.argv.slice(2) : ["desktop"]) {
  const vp = { ...DEVICES[name], deviceScaleFactor: 1, hasTouch: false, isMobile: false };
  const page = await browser.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewport(vp);
  await page.goto(process.env.SITE ?? "http://localhost:3123/", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.querySelectorAll(".sketch path").length > 0, { timeout: 120000 });
  await sleep(900);
  await page.click("[data-skip]");
  await sleep(3600);
  let n = 0;
  const shot = (label) => page.screenshot({ path: path.join(OUT, `peel-${name}-${String(n++).padStart(2, "0")}-${label}.png`) });
  const now = () => page.evaluate(() => document.querySelector(".now-text")?.textContent ?? "");
  // the right-hand page on screen
  const box = () =>
    page.evaluate(() => {
      const f = [...document.querySelectorAll(".face.is-live")].map((el) => el.getBoundingClientRect()).sort((a, b) => b.left - a.left)[0];
      return { l: f.left, t: f.top, r: f.right, b: f.bottom, w: f.width, h: f.height };
    });
  /** drag from a point to a list of points (fractions of the page: x from the spine, y from the top), photographing each */
  const drag = async (label, from, stops, release = true) => {
    const b = await box();
    const at = (p) => [b.l + p[0] * b.w, b.t + p[1] * b.h];
    await page.mouse.move(...at(from));
    await page.mouse.down();
    let last = from;
    for (const [k, to] of stops.entries()) {
      for (let i = 1; i <= 10; i++) {
        await page.mouse.move(...at([last[0] + ((to[0] - last[0]) * i) / 10, last[1] + ((to[1] - last[1]) * i) / 10]));
        await sleep(12);
      }
      await sleep(140);
      await shot(`${label}-${k}`);
      last = to;
    }
    if (release) {
      await page.mouse.up();
      await sleep(1100);
    }
  };
  console.log(name, "start:", await now());
  // bottom corner, peeled up and across, then let go on the far side
  await drag("corner-bottom", [0.97, 0.97], [[0.8, 0.82], [0.45, 0.7], [0.05, 0.8], [-0.5, 0.9]]);
  console.log("after bottom-corner turn:", await now());
  // top corner, pulled a little way and dropped: it falls back
  await drag("corner-top", [0.97, 0.03], [[0.7, 0.2], [0.5, 0.35]]);
  console.log("after dropped top corner:", await now());
  // the middle of the edge, straight across
  await drag("edge", [0.96, 0.5], [[0.5, 0.5], [-0.3, 0.5]]);
  console.log("after edge turn:", await now());
  // the previous page brought back: by the left-hand page's bottom corner, or (one page at a time) from the left edge
  const single = await page.evaluate(() => document.querySelector(".book-anchor")?.dataset.mode === "single");
  if (single) await drag("back", [0.1, 0.9], [[0.3, 0.85], [0.6, 0.8], [0.92, 0.85]]);
  else await drag("back", [-0.97, 0.97], [[-0.6, 0.8], [0.1, 0.7], [0.7, 0.85]]);
  console.log("after bringing one back:", await now());
  await shot("rest");
  await page.close();
}
console.log(errors.length ? [...new Set(errors)].join("\n") : "no page errors");
await browser.close();
