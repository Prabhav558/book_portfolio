/**
 * Keyboard and screen-reader checks.  node tools/a11y.mjs
 * Walks the site with the keyboard only and prints what a keyboard and a screen reader would meet.
 */
import puppeteer from "puppeteer-core";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new", args: ["--enable-gpu", "--ignore-gpu-blocklist"] });
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.setViewport({ width: 1440, height: 900 });
await page.goto(process.env.SITE ?? "http://localhost:3123/", { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => document.querySelectorAll(".sketch path").length > 0, { timeout: 120000 });
await sleep(6500);
const focus = () => page.evaluate(() => { const a = document.activeElement; return a ? `${a.tagName.toLowerCase()}${a.className ? "." + String(a.className).split(" ")[0] : ""} "${(a.getAttribute("aria-label") ?? a.textContent ?? "").trim().slice(0, 40)}"` : "none"; });
const said = () => page.evaluate(() => document.querySelector("[aria-live]")?.textContent ?? "");
const reachable = () => page.evaluate(() => [...document.querySelectorAll("a[href], button, input, textarea")].filter((el) => !el.closest("[inert]") && !el.closest("[aria-hidden='true']") && el.tabIndex >= 0 && !el.disabled && getComputedStyle(el).visibility !== "hidden").length);
console.log("closed book — reachable controls:", await reachable(), "| inert pages:", await page.evaluate(() => document.querySelectorAll(".face[inert]").length), "of", await page.evaluate(() => document.querySelectorAll(".face[data-step]").length));
await page.keyboard.press("Tab");
console.log("first Tab:", await focus());
await page.keyboard.press("Tab");
console.log("second Tab:", await focus());
await page.evaluate(() => document.activeElement?.blur());
await page.keyboard.press("Enter");
await sleep(3400);
console.log("Enter opened the book:", await page.evaluate(() => document.querySelectorAll(".face.is-live").length === 2), "| said:", await said());
console.log("open — reachable controls:", await reachable(), "| live pages not inert:", await page.evaluate(() => [...document.querySelectorAll(".face.is-live")].every((f) => !f.inert)));
await page.keyboard.press("ArrowRight");
await sleep(2200);
console.log("after →  said:", await said());
const order = [];
for (let i = 0; i < 9; i++) { await page.keyboard.press("Tab"); order.push(await focus()); }
console.log("tab order:\n  " + order.join("\n  "));
console.log("headings:", await page.evaluate(() => [...document.querySelectorAll(".face.is-live h1, .face.is-live h2, .face.is-live h3")].map((h) => h.tagName + ":" + h.textContent.trim().slice(0, 24)).join(" | ")));
console.log("h1 count in the document (outside copies):", await page.evaluate(() => [...document.querySelectorAll("h1")].filter((h) => !h.closest(".rig")).length));
console.log(errors.length ? [...new Set(errors)].join("\n") : "no page errors");
await browser.close();
