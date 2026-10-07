/**
 * Every resting state of every book, one screenshot each.  node tools/gallery.mjs [device ...]
 * Output: tools/out/g-<device>-<nn>.png
 */
import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEVICES } from "./check.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, "out");
const URL = process.env.SITE ?? "http://localhost:3123/";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new", args: ["--enable-gpu", "--ignore-gpu-blocklist"] });
const errors = [];
for (const name of process.argv.slice(2).length ? process.argv.slice(2) : ["desktop", "phone"]) {
  const vp = DEVICES[name];
  const page = await browser.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewport(vp);
  await page.goto(URL, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".book-anchor", { timeout: 120000 });
  await page.waitForFunction(() => document.querySelectorAll(".sketch path").length > 0, { timeout: 120000 });
  await sleep(900);
  await page.click("[data-skip]");
  await sleep(2600);
  let n = 0;
  for (let i = 0; i < 60; i++) {
    const label = await page.evaluate(() => document.querySelector(".now-text")?.textContent ?? "");
    await page.screenshot({ path: path.join(OUT, `g-${name}-${String(n++).padStart(2, "0")}.png`) });
    await page.keyboard.press("ArrowRight");
    // a page turn settles in under two seconds; a book change (or the ending) takes longer
    await sleep(1800);
    const read = () => page.evaluate(() => document.querySelector(".now-text")?.textContent ?? "");
    if ((await read()) === label) await sleep(3600);
    else if ((await read()).split("·")[0] !== label.split("·")[0]) await sleep(2600);
    if ((await read()) === label) {
      await page.screenshot({ path: path.join(OUT, `g-${name}-${String(n++).padStart(2, "0")}.png`) });
      break;
    }
  }
  console.log(name, "states:", n);
  await page.close();
}
console.log(errors.length ? [...new Set(errors)].join("\n") : "no page errors");
await browser.close();
