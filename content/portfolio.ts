/**
 * Every piece of text and every link on the site lives here.
 * Replace the placeholder values with your own — no component changes needed.
 */

export const profile = {
  name: "Alex Rivera",
  firstName: "Alex",
  lastName: "Rivera",
  monogram: "AR",
  role: "Software Engineer",
  tagline: "I build interfaces that feel inevitable — fast, considered, and quietly delightful.",
  location: "Bengaluru, India",
  email: "hello@alexrivera.dev",
  availability: "Open to full-time roles from January 2027",
  resumeUrl: "/resume.pdf",
  about: [
    "I'm a software engineer who sits at the seam between design and engineering. I care about the details most people never notice — the easing of a transition, the shape of an API, the hundred milliseconds that make something feel instant.",
    "Over the last four years I've shipped products used by hundreds of thousands of people, led frontend architecture for a fintech platform, and mentored engineers who now lead teams of their own.",
  ],
  facts: [
    { label: "Based in", value: "Bengaluru, India" },
    { label: "Focus", value: "Frontend systems & product engineering" },
    { label: "Currently", value: "Senior Engineer at Northwind" },
  ],
};

export const socials = [
  { label: "GitHub", handle: "@alexrivera", url: "https://github.com/" },
  { label: "LinkedIn", handle: "in/alexrivera", url: "https://linkedin.com/" },
  { label: "X / Twitter", handle: "@alexrivera", url: "https://x.com/" },
  { label: "Dribbble", handle: "alexrivera", url: "https://dribbble.com/" },
] as const;

export const skills = [
  { group: "Languages", items: ["TypeScript", "JavaScript", "Python", "Go", "SQL"] },
  { group: "Frontend", items: ["React", "Next.js", "GSAP", "Three.js", "Tailwind"] },
  { group: "Backend", items: ["Node.js", "PostgreSQL", "Redis", "GraphQL", "tRPC"] },
  { group: "Craft", items: ["Design systems", "Motion", "Accessibility", "Performance"] },
];

export const highlights = [
  { value: "4+", label: "years shipping production software" },
  { value: "30+", label: "projects designed & delivered" },
  { value: "250k", label: "monthly users on work I've built" },
];

export const principles = [
  { title: "Craft is a feature", body: "Users can't name the details, but they always feel them." },
  { title: "Fast by default", body: "Performance is a design decision, made on day one." },
  { title: "Clarity over cleverness", body: "Code is read far more often than it is written." },
];

export type Project = {
  title: string;
  year: string;
  summary: string;
  tags: string[];
  live?: string;
  code?: string;
  /** Hue (0–360) used to tint the generated cover plate. */
  hue: number;
};

export const featuredProjects: Project[] = [
  {
    title: "Ledgerline",
    year: "2026",
    summary:
      "A real-time personal finance dashboard that reconciles 12 bank feeds in under a second. Built a virtualised ledger rendering 100k rows at 60fps.",
    tags: ["Next.js", "tRPC", "PostgreSQL", "WebSockets"],
    live: "https://example.com",
    code: "https://github.com/",
    hue: 28,
  },
  {
    title: "Atlas Notes",
    year: "2025",
    summary:
      "An offline-first, collaborative notes app with CRDT sync and a custom rich-text engine. Featured on Product Hunt's top 5 of the day.",
    tags: ["React", "Yjs", "IndexedDB", "Rust/WASM"],
    live: "https://example.com",
    code: "https://github.com/",
    hue: 152,
  },
];

export const moreProjects: Project[] = [
  {
    title: "Kiln",
    year: "2025",
    summary: "Design-token compiler that outputs CSS, iOS and Android themes from one source.",
    tags: ["TypeScript", "CLI"],
    code: "https://github.com/",
    hue: 12,
  },
  {
    title: "Murmur",
    year: "2024",
    summary: "Voice-memo transcription with speaker diarisation and searchable timelines.",
    tags: ["Python", "Whisper", "FastAPI"],
    live: "https://example.com",
    hue: 210,
  },
  {
    title: "Paperplane",
    year: "2024",
    summary: "A tiny, typed email-templating library — 2kB, zero dependencies.",
    tags: ["TypeScript", "OSS"],
    code: "https://github.com/",
    hue: 48,
  },
  {
    title: "Orbit UI",
    year: "2023",
    summary: "Accessible headless component kit used across four internal products.",
    tags: ["React", "a11y", "Storybook"],
    code: "https://github.com/",
    hue: 265,
  },
  {
    title: "Tidepool",
    year: "2023",
    summary: "Ocean-data visualisation built with WebGL for a marine research lab.",
    tags: ["Three.js", "D3"],
    live: "https://example.com",
    hue: 190,
  },
  {
    title: "Brightside",
    year: "2022",
    summary: "Hackathon-winning mental-health journaling app with mood analytics.",
    tags: ["React Native", "Firebase"],
    hue: 330,
  },
];

export const techStack = [
  "TypeScript", "React", "Next.js", "Node.js", "GSAP", "Three.js",
  "PostgreSQL", "Redis", "GraphQL", "Docker", "AWS", "Figma",
];

export const extraHighlights = [
  { title: "Open source", body: "Maintainer of two libraries with 3.2k combined GitHub stars." },
  { title: "Writing", body: "Essays on motion design and frontend performance, read by 40k+." },
  { title: "Speaking", body: "Talks at React India and JSConf Asia on scroll-driven animation." },
];

export type Role = {
  company: string;
  title: string;
  period: string;
  location: string;
  points: string[];
};

export const experience: Role[] = [
  {
    company: "Northwind",
    title: "Senior Software Engineer",
    period: "2024 — Present",
    location: "Bengaluru",
    points: [
      "Lead frontend architecture for a fintech platform serving 250k MAU.",
      "Cut median page load from 3.1s to 0.9s through a rendering overhaul.",
      "Built and staffed the design-systems guild across 6 product teams.",
    ],
  },
  {
    company: "Lumen Labs",
    title: "Software Engineer",
    period: "2022 — 2024",
    location: "Remote",
    points: [
      "Shipped the realtime collaboration layer for a whiteboard product.",
      "Owned the WebGL rendering pipeline; 4× faster on low-end devices.",
      "Mentored 5 junior engineers through their first year.",
    ],
  },
  {
    company: "Studio Fable",
    title: "Frontend Developer",
    period: "2021 — 2022",
    location: "Mumbai",
    points: [
      "Built award-winning marketing sites for global brands.",
      "Introduced a GSAP motion toolkit reused across 20+ projects.",
    ],
  },
  {
    company: "Quantum Health",
    title: "Software Engineering Intern",
    period: "Summer 2020",
    location: "Pune",
    points: [
      "Prototyped a patient-intake flow that reduced drop-off by 18%.",
      "Wrote the team's first end-to-end test suite.",
    ],
  },
];

export const education = {
  school: "Indian Institute of Technology",
  degree: "B.Tech, Computer Science & Engineering",
  period: "2017 — 2021",
  notes: ["GPA 8.9 / 10", "Head of the university design & code society"],
};

/** What you're learning right now — shown under Education. */
export const learning = [
  { topic: "WebGPU", note: "compute shaders for data-heavy visualisation" },
  { topic: "Rust", note: "systems programming for the tools I build" },
  { topic: "Distributed systems", note: "working through DDIA, chapter by chapter" },
];

export const awards = [
  { title: "Awwwards Honorable Mention", year: "2023" },
  { title: "Smart India Hackathon — Winner", year: "2020" },
  { title: "AWS Certified Developer", year: "2022" },
];

/**
 * Contact form — create a free access key at https://web3forms.com and put it in
 * `.env.local` as NEXT_PUBLIC_FORM_KEY=xxxxxxxx-xxxx-...
 */
export const contactForm = {
  endpoint: "https://api.web3forms.com/submit",
  accessKey: process.env.NEXT_PUBLIC_FORM_KEY ?? "",
};
