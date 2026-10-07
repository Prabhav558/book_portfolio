/**
 * Where does main-thread time go?  node tools/trace.mjs [intro|handoff|open] [device] [cpu throttle]
 * Prints the heaviest event types and every task over 30ms inside the window.
 */
import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEVICES } from "./check.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const [, , what = "intro", device = "desktop", throttle = "1"] = process.argv;
const vp = DEVICES[device];
const file = path.join(here, "out", "trace.json");
fs.mkdirSync(path.join(here, "out"), { recursive: true });

const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new", args: ["--enable-gpu", "--ignore-gpu-blocklist"] });
const page = await browser.newPage();
await page.setViewport(vp);
if (Number(throttle) > 1) await (await page.target().createCDPSession()).send("Emulation.setCPUThrottlingRate", { rate: Number(throttle) });
await page.goto(process.env.SITE ?? "http://localhost:3123/", { waitUntil: "domcontentloaded" });
await page.waitForSelector(".book-anchor");
// CSS="…" tries a style change without touching the source, to see what a rule costs
if (process.env.CSS) await page.addStyleTag({ content: process.env.CSS });
const cats = ["devtools.timeline", "disabled-by-default-devtools.timeline", "disabled-by-default-devtools.timeline.stack"];
// INVAL=1 also records which nodes each style recalculation was scheduled for (see the trace file)
if (process.env.INVAL) cats.push("disabled-by-default-devtools.timeline.invalidationTracking");
const hintUp = () => page.waitForFunction(() => parseFloat(getComputedStyle(document.querySelector("[data-intro-hint]")).opacity) > 0.95, { timeout: 120000 });
if (what === "intro") {
  await page.waitForFunction(() => document.querySelectorAll(".sketch path").length > 0, { timeout: 60000 });
  await page.tracing.start({ path: file, categories: cats });
  await hintUp();
} else if (what === "open") {
  await hintUp();
  await sleep(600);
  await page.tracing.start({ path: file, categories: cats });
  await page.click(".clasp");
  await sleep(4200);
} else {
  await hintUp();
  await page.click(".clasp");
  await sleep(3200);
  await page.keyboard.press("ArrowRight");
  await sleep(2200);
  await page.tracing.start({ path: file, categories: cats });
  await page.evaluate(() => document.querySelector('[data-slot="1"]')?.click());
  await sleep(4600);
}
await page.tracing.stop();
await browser.close();

const ev = JSON.parse(fs.readFileSync(file, "utf8")).traceEvents;
const names = {};
ev.filter((e) => e.ph === "M" && e.name === "thread_name").forEach((e) => (names[`${e.pid}:${e.tid}`] = e.args.name));
const main = ev.filter((e) => e.ph === "X" && names[`${e.pid}:${e.tid}`] === "CrRendererMain");
const agg = {};
for (const e of main) if (e.name !== "RunTask") agg[e.name] = (agg[e.name] || 0) + e.dur / 1000;
console.log("— main thread totals (ms)");
Object.entries(agg).sort((a, b) => b[1] - a[1]).slice(0, 12).forEach(([k, v]) => console.log(`  ${k.padEnd(28)} ${v.toFixed(0)}`));
let t0 = Infinity;
for (const e of ev) if (e.ts && e.ts < t0) t0 = e.ts;
console.log("— tasks over 30ms");
for (const t of main.filter((e) => e.name === "RunTask" && e.dur > 30000).sort((a, b) => a.ts - b.ts)) {
  const inside = main.filter((e) => e !== t && e.ts >= t.ts && e.ts + e.dur <= t.ts + t.dur && e.dur > 4000);
  const by = {};
  inside.forEach((e) => (by[e.name] = Math.max(by[e.name] || 0, e.dur / 1000)));
  console.log(`  ${((t.ts - t0) / 1e6).toFixed(2)}s ${(t.dur / 1000).toFixed(0)}ms  ${Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `${k}:${v.toFixed(0)}`).join("  ")}`);
}
const gpu = ev.filter((e) => e.ph === "X" && e.name === "GPUTask" && e.dur > 30000);
console.log(`— GPU tasks over 30ms: ${gpu.length}${gpu.length ? "  (max " + Math.max(...gpu.map((e) => e.dur / 1000)).toFixed(0) + "ms)" : ""}`);
