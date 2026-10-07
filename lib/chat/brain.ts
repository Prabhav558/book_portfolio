import {
  awards,
  education,
  experience,
  extraHighlights,
  featuredProjects,
  highlights,
  learning,
  moreProjects,
  principles,
  profile,
  skills,
  socials,
  techStack,
  type Project,
} from "@/content/portfolio";

/**
 * Answers questions about Prabhav from the portfolio itself. It is not a language model and it says so:
 * every answer is written from `content/portfolio.ts`, so changing a line there changes what is said here.
 * Matching is by keywords with weights; nothing leaves the browser.
 */

export type Reply = { text: string; chips: string[] };

type Topic = {
  id: string;
  /** Words and phrases that point at this topic, each with a weight. */
  keys: [string, number][];
  answer: () => Reply;
};

const list = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9+#.\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const ALL: Project[] = [...featuredProjects, ...moreProjects];
const first = profile.firstName;

const project = (p: Project): Reply => {
  const links = [p.live && `Live: ${p.live}`, p.code && `Code: ${p.code}`].filter(Boolean) as string[];
  const more = p.details?.length ? ` ${p.details.join(" ")}` : "";
  return {
    text: `${p.title} (${p.year}): ${p.summary}${more} It is built with ${list(p.tags)}. ${links.length ? links.join(". ") + "." : "It is not public yet."}`,
    chips: ["What else have you built?", "Which tech do you use?"],
  };
};

const TOPICS: Topic[] = [
  {
    id: "hello",
    keys: [["hello", 3], ["hi", 3], ["hey", 3], ["hiya", 3], ["good morning", 3], ["good evening", 3], ["sup", 2]],
    answer: () => ({
      text: `Hey! I'm ${first}'s assistant. I can tell you about his work, projects, skills, background, or how to reach him. What would you like to know?`,
      chips: ["What do you do?", "Show me your projects", "Where have you worked?"],
    }),
  },
  {
    id: "who",
    keys: [["who are you", 4], ["who is prabhav", 4], ["about you", 3], ["about prabhav", 3], ["introduce", 3], ["what do you do", 4], ["tell me about yourself", 4], ["yourself", 2], ["background", 2], ["about", 1]],
    answer: () => ({
      text: `I'm ${profile.name}, an ${profile.role} based in ${profile.location}. ${profile.tagline} Right now: ${profile.facts.find((f) => f.label === "Currently")?.value ?? "building things"}.`,
      chips: ["Where have you worked?", "Show me your projects", "Are you available?"],
    }),
  },
  {
    id: "bot",
    keys: [["are you real", 5], ["real person", 5], ["are you a person", 5], ["are you a bot", 5], ["are you a robot", 5], ["are you ai", 5], ["are you human", 5], ["a human", 3], ["chatbot", 4], ["bot", 3], ["chatgpt", 3], ["language model", 3], ["llm", 3], ["how do you work", 3], ["who built you", 3], ["who am i talking to", 5], ["talking to", 3], ["robot", 2]],
    answer: () => ({
      text: `Not ${first} himself: I'm a small assistant on his site. I answer from what's in his portfolio (work, projects, skills, education) and I'd rather say "I don't know" than guess. For anything else, write to him at ${profile.email}.`,
      chips: ["How can I contact you?", "What do you do?"],
    }),
  },
  {
    id: "experience",
    keys: [["experience", 3], ["work", 2], ["worked", 3], ["job", 3], ["jobs", 3], ["career", 3], ["intern", 3], ["internship", 3], ["role", 2], ["roles", 2], ["employer", 3], ["company", 3], ["companies", 3], ["currently", 2], ["now", 1], ["resume", 1], ["cv", 1]],
    answer: () => ({
      text: `Work so far: ${experience.map((r) => `${r.title} at ${r.company} (${r.period})`).join("; ")}. ${experience[0] ? `Most recently at ${experience[0].company}: ${experience[0].points[0]}` : ""}`.trim(),
      chips: experience.map((r) => `Tell me about ${r.company}`).slice(0, 2),
    }),
  },
  ...experience.map<Topic>((r) => ({
    id: `role-${r.company}`,
    keys: [[norm(r.company), 6], ...norm(r.company).split(" ").map((w): [string, number] => [w, 3])],
    answer: () => ({
      text: `${r.title} at ${r.company}, ${r.location} (${r.period}). ${r.points.join(" ")}`,
      chips: ["Which tech do you use?", "Show me your projects"],
    }),
  })),
  {
    id: "projects",
    keys: [["project", 4], ["projects", 4], ["built", 3], ["build", 2], ["portfolio", 1], ["made", 2], ["github", 2], ["code", 1], ["open source", 3], ["side project", 3], ["what else", 2], ["showcase", 2], ["demo", 2]],
    answer: () => ({
      text: `Two main ones: ${featuredProjects.map((p) => `${p.title} (${p.summary.split(".")[0]})`).join("; ")}. And smaller ones: ${list(moreProjects.map((p) => p.title))}. Ask me about any of them by name.`,
      chips: featuredProjects.map((p) => `Tell me about ${p.title}`),
    }),
  },
  ...ALL.map<Topic>((p) => ({
    id: `project-${p.title}`,
    keys: [[norm(p.title), 7], ...norm(p.title).split(" ").filter((w) => w.length > 2).map((w): [string, number] => [w, 4])],
    answer: () => project(p),
  })),
  {
    id: "skills",
    keys: [["skill", 4], ["skills", 4], ["tech", 3], ["stack", 3], ["technology", 3], ["technologies", 3], ["language", 2], ["languages", 3], ["tools", 3], ["frameworks", 3], ["know", 1], ["good at", 3], ["expert", 2], ["proficient", 3], ["programming", 3], ["use", 1]],
    answer: () => ({
      text: `${skills.map((g) => `${g.group}: ${g.items.join(", ")}`).join(". ")}. Day to day: ${list(techStack.slice(0, 8))}.`,
      chips: ["Show me your projects", "What are you learning?"],
    }),
  },
  {
    id: "education",
    keys: [["education", 4], ["study", 3], ["studied", 3], ["degree", 4], ["college", 4], ["university", 4], ["school", 3], ["cgpa", 4], ["gpa", 4], ["grades", 2], ["graduate", 3], ["graduating", 3], ["graduation", 3], ["btech", 3], ["b.tech", 3], ["srm", 4]],
    answer: () => ({
      text: `${education.degree} at ${education.school} (${education.period}). ${education.notes.join(". ")}. ${profile.availability}.`,
      chips: ["Any certifications?", "Are you available?"],
    }),
  },
  {
    id: "certs",
    keys: [["certification", 4], ["certifications", 4], ["certified", 4], ["certificate", 3], ["aws", 4], ["award", 3], ["awards", 3], ["hackathon", 3], ["achievements", 3], ["won", 2], ["recognition", 2], ["mozohack", 4], ["dayzero", 4]],
    answer: () => ({
      text: `${awards.map((a) => `${a.title} (${a.year})`).join("; ")}. ${extraHighlights.map((h) => `${h.title}: ${h.body}`).join(" ")}`,
      chips: ["What do you do?", "Where did you study?"],
    }),
  },
  {
    id: "contact",
    keys: [["contact", 5], ["email", 5], ["mail", 4], ["reach", 4], ["get in touch", 5], ["talk", 2], ["message", 3], ["linkedin", 4], ["social", 3], ["socials", 3], ["phone", 3], ["number", 2], ["whatsapp", 5], ["whats app", 5], ["wa", 1], ["write to", 3], ["connect", 3], ["hire", 2]],
    answer: () => ({
      text: `Best way: ${profile.email}, or message me on WhatsApp (${profile.whatsapp}). You can also find me on ${list(socials.map((s) => `${s.label} (${s.url})`))}. There's also a letter form in the last volume of this book, and my résumé is a download away.`,
      chips: ["Are you available?", "Can I see your résumé?"],
    }),
  },
  {
    id: "resume",
    keys: [["resume", 5], ["cv", 5], ["résumé", 5], ["download", 3], ["pdf", 3]],
    answer: () => ({
      text: `My résumé is a PDF: use the "Résumé, PDF" link on the contact page, or the résumé button on the right-hand dock.`,
      chips: ["How can I contact you?", "Where have you worked?"],
    }),
  },
  {
    id: "available",
    keys: [["available", 5], ["availability", 5], ["hire", 4], ["hiring", 4], ["open to", 4], ["job offer", 3], ["opportunity", 4], ["opportunities", 4], ["freelance", 3], ["full time", 4], ["full-time", 4], ["join", 2], ["recruit", 3], ["when can you start", 4], ["notice", 2]],
    answer: () => ({
      text: `${profile.availability}. If you have a role in mind, write to ${profile.email} and I'll reply.`,
      chips: ["What do you do?", "Show me your projects"],
    }),
  },
  {
    id: "location",
    keys: [["where are you", 5], ["location", 5], ["based", 4], ["live", 3], ["city", 3], ["country", 3], ["from", 2], ["remote", 3], ["relocate", 3], ["timezone", 3], ["chennai", 4], ["bangalore", 4], ["lucknow", 4]],
    answer: () => ({
      text: `${profile.facts.find((f) => f.label === "Based in")?.value ?? profile.location}; I'm in ${profile.location} right now.`,
      chips: ["Are you available?", "How can I contact you?"],
    }),
  },
  {
    id: "learning",
    keys: [["learning", 5], ["learn", 3], ["studying", 3], ["next", 1], ["curious", 2], ["interested in", 3], ["interests", 3]],
    answer: () => ({
      text: `Learning right now: ${learning.map((l) => `${l.topic} (${l.note})`).join("; ")}.`,
      chips: ["Which tech do you use?", "What do you do?"],
    }),
  },
  {
    id: "values",
    keys: [["principles", 5], ["philosophy", 4], ["values", 4], ["approach", 4], ["how do you work", 4], ["believe", 3], ["style", 2], ["strengths", 4], ["strength", 4], ["why hire", 5], ["why you", 4], ["different", 2]],
    answer: () => ({
      text: `${principles.map((p) => `${p.title}: ${p.body}`).join(" ")} ${highlights.length ? `By the numbers: ${highlights.map((h) => `${h.value} ${h.label}`).join("; ")}.` : ""}`.trim(),
      chips: ["Where have you worked?", "Show me your projects"],
    }),
  },
  {
    id: "thanks",
    keys: [["thanks", 4], ["thank you", 4], ["cheers", 3], ["great", 1], ["awesome", 2], ["nice", 1], ["cool", 1], ["ok", 1], ["okay", 1]],
    answer: () => ({ text: "Glad it helped! Anything else you'd like to know?", chips: ["How can I contact you?", "Show me your projects"] }),
  },
  {
    id: "bye",
    keys: [["bye", 4], ["goodbye", 4], ["see you", 3], ["later", 2]],
    answer: () => ({ text: `Thanks for stopping by. Enjoy the book, and write to ${profile.email} any time.`, chips: [] }),
  },
];

/** Every way of asking a thing that has no entry of its own. */
const FALLBACK = (): Reply => ({
  text: `I only know what's in my portfolio, so I can't answer that one. I can tell you about my work, projects, skills, education, or how to reach me. Or write to ${profile.email}.`,
  chips: ["What do you do?", "Show me your projects", "How can I contact you?"],
});

/** How many of a topic's keys are in the question, weighted. Whole words and phrases only. */
function score(q: string, t: Topic) {
  const padded = ` ${q} `;
  let s = 0;
  for (const [k, w] of t.keys) {
    if (!k) continue;
    if (padded.includes(` ${k} `) || (k.length > 4 && padded.includes(` ${k}`))) s += w;
  }
  return s;
}

export function reply(question: string): Reply {
  const q = norm(question);
  if (!q) return FALLBACK();
  let best: Topic | null = null;
  let top = 0;
  for (const t of TOPICS) {
    const s = score(q, t);
    // a named project or company beats a general topic that happens to share a word
    const bias = t.id.startsWith("project-") || t.id.startsWith("role-") ? 1.5 : 1;
    if (s * bias > top) {
      top = s * bias;
      best = t;
    }
  }
  // one weak word is not an answer
  if (!best || top < 2) return FALLBACK();
  return best.answer();
}

export const GREETING: Reply = {
  text: `Hey, ${first} here! Ask me anything about me: my work, projects, skills, or how to get in touch.`,
  chips: ["What do you do?", "Show me your projects", "Where have you worked?", "Are you available?"],
};
