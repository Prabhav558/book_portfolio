/**
 * Frames through a book change and the ending.  node tools/handoff.mjs [device ...]
 * Output: tools/out/handoff-<device>-<n>.png
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
  const page = await browser.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewport({ ...DEVICES[name], deviceScaleFactor: 1 });
  await page.goto(process.env.SITE ?? "http://localhost:3123/", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.querySelectorAll(".sketch path").length > 0, { timeout: 120000 });
  await sleep(900);
  await page.click("[data-skip]");
  await sleep(3800);
  let n = 0;
  const shot = () => page.screenshot({ path: path.join(OUT, `handoff-${name}-${String(n++).padStart(2, "0")}.png`) });
  await shot();
  await page.evaluate(() => document.querySelector('[data-slot="2"]')?.click());
  const t0 = Date.now();
  for (const at of [500, 1000, 1500, 2000, 2500, 3100, 4200]) {
    await sleep(Math.max(0, at - (Date.now() - t0)));
    await shot();
  }
  await page.keyboard.press("End");
  await sleep(1400);
  await shot();
  await sleep(4200);
  await shot();
  await page.close();
}
console.log(errors.length ? [...new Set(errors)].join("\n") : "no page errors");
await browser.close();
