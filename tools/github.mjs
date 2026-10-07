/**
 * Refreshes content/github.json: the public contribution calendar for the last 365 days.   node tools/github.mjs [user]
 *
 * With GH_TOKEN (or GITHUB_TOKEN) set it asks GitHub's GraphQL API, which is exact. Without one it reads the public
 * calendar fragment that github.com serves to anybody. If either way fails the file is left exactly as it was, so a
 * deploy never loses the last good copy. The deploy workflow runs this before every build (and nightly).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(here, "..", "content", "github.json");
const user = process.argv[2] || JSON.parse(fs.readFileSync(FILE, "utf8")).user;
const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;

async function viaGraphQL() {
  const to = new Date();
  const from = new Date(to.getTime() - 364 * 864e5);
  const query = `query($u:String!,$f:DateTime!,$t:DateTime!){user(login:$u){contributionsCollection(from:$f,to:$t){contributionCalendar{weeks{contributionDays{date contributionCount}}}}}}`;
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `bearer ${token}`, "Content-Type": "application/json", "User-Agent": "portfolio-sync" },
    body: JSON.stringify({ query, variables: { u: user, f: from.toISOString(), t: to.toISOString() } }),
  });
  const json = await res.json();
  const weeks = json?.data?.user?.contributionsCollection?.contributionCalendar?.weeks;
  if (!weeks) throw new Error("graphql: " + JSON.stringify(json).slice(0, 200));
  const days = {};
  let last = "";
  for (const w of weeks) for (const d of w.contributionDays) {
    last = d.date > last ? d.date : last;
    if (d.contributionCount > 0) days[d.date] = d.contributionCount;
  }
  return { to: last, days };
}

async function viaPage() {
  const res = await fetch(`https://github.com/users/${user}/contributions`, { headers: { "User-Agent": "portfolio-sync" } });
  if (!res.ok) throw new Error("page: " + res.status);
  const html = await res.text();
  // each day is a cell with a date and an id; its count is in the tooltip that points at that id
  const date = new Map();
  for (const m of html.matchAll(/<td\b[^>]*>/g)) {
    const d = /data-date="(\d{4}-\d{2}-\d{2})"/.exec(m[0]);
    const id = /\bid="([^"]+)"/.exec(m[0]);
    if (d && id) date.set(id[1], d[1]);
  }
  if (!date.size) throw new Error("page: no calendar cells found");
  const days = {};
  for (const m of html.matchAll(/<tool-tip\b[^>]*\bfor="([^"]+)"[^>]*>\s*(No|\d+) contributions?/g)) {
    const d = date.get(m[1]);
    const n = m[2] === "No" ? 0 : Number(m[2]);
    if (d && n > 0) days[d] = n;
  }
  return { to: [...date.values()].sort().pop(), days };
}

let got;
for (const [name, fn] of [["graphql", token ? viaGraphQL : null], ["page", viaPage]]) {
  if (!fn) continue;
  try {
    got = await fn();
    console.log(`github activity for ${user} via ${name}: ${Object.keys(got.days).length} days, ${Object.values(got.days).reduce((a, b) => a + b, 0)} contributions, to ${got.to}`);
    break;
  } catch (e) {
    console.warn(`github activity: ${name} failed (${e.message})`);
  }
}
if (!got) {
  console.warn("github activity: keeping the copy that is already there");
  process.exit(0);
}
fs.writeFileSync(FILE, JSON.stringify({ user, to: got.to, days: Object.fromEntries(Object.entries(got.days).sort()) }, null, 1) + "\n");
