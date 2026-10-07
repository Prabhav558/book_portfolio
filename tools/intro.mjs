/**
 * Frames through the opening drawing.  node tools/intro.mjs [device ...]
 * Output: tools/out/intro-<device>-<ms>.png
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
const TIMES = [250, 600, 950, 1300, 1650, 2000, 2400, 2800, 3300, 4200];
const browser = await puppeteer.launch({ executablePath: process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new", args: ["--enable-gpu", "--ignore-gpu-blocklist"] });
const errors = [];
for (const name of process.argv.slice(2).length ? process.argv.slice(2) : ["desktop", "phone"]) {
  const page = await browser.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewport({ ...DEVICES[name], deviceScaleFactor: 1 });
  await page.goto(process.env.SITE ?? "http://localhost:3123/", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.querySelectorAll(".sketch path").length > 0, { timeout: 120000 });
  const t0 = Date.now();
  for (const at of TIMES) {
    await sleep(Math.max(0, at - (Date.now() - t0)));
    await page.screenshot({ path: path.join(OUT, `intro-${name}-${String(at).padStart(4, "0")}.png`) });
  }
  await page.close();
}
console.log(errors.length ? [...new Set(errors)].join("\n") : "no page errors");
await browser.close();
