/**
 * Every piece of text and every link on the site lives here.
 * Replace the placeholder values with your own — no component changes needed.
 */

import { asset } from "@/lib/asset";

export const profile = {
  name: "Prabhav Singh",
  firstName: "Prabhav",
  lastName: "Singh",
  monogram: "PS",
  role: "AI Engineer",
  /** What the role line rolls over to when it is hovered. */
  altRole: "Software Engineer",
  tagline: "I build agentic AI systems that show their evidence, on backends that hold up in production.",
  location: "Chennai, India",
  email: "prabhavkeshwar@gmail.com",
  availability: "Graduating 2027, open to full-time AI engineering roles",
  resumeUrl: asset("/resume.pdf"),
  about: [
    "I'm an AI engineer who works on the unglamorous half of LLM products: orchestration, reliability, and the backend that keeps them honest. I build multi-agent systems where a model's output is checked against evidence before anyone trusts it.",
    "At TalenciaGlobal I architect a LangGraph company-intelligence engine with nine parallel research agents on AWS Bedrock. Before that, at Xenkrypt, I built core modules of a self-hosted SOC platform in FastAPI, PostgreSQL and Go.",
  ],
  facts: [
    { label: "Based in", value: "Lucknow · Chennai · Bangalore" },
    { label: "Focus", value: "Agentic AI & backend systems" },
    { label: "Currently", value: "Software Development Intern at TalenciaGlobal" },
  ],
};

export const socials = [
  { label: "GitHub", handle: "@Prabhav558", url: "https://github.com/Prabhav558" },
  { label: "LinkedIn", handle: "in/prabhav-singh", url: "https://www.linkedin.com/in/prabhav-singh-7a4285208" },
] as const;

export const skills = [
  { group: "Agentic AI", items: ["LangGraph", "LangChain", "MCP", "RAG", "LLM evaluation"] },
  { group: "Languages", items: ["Python", "Java", "C++", "C", "Rust"] },
  { group: "Backend", items: ["FastAPI", "REST", "WebSockets", "PostgreSQL", "Redis"] },
  { group: "Cloud & DevOps", items: ["AWS", "Docker", "Kubernetes", "Nginx", "CI/CD"] },
];

export const highlights = [
  { value: "3", label: "AWS certifications, incl. Solutions Architect" },
  { value: "10", label: "security modules in the SOC platform I helped build" },
  { value: "9.35", label: "CGPA in B.Tech Computer Science" },
];

export const principles = [
  { title: "Evidence over eloquence", body: "A model's answer counts only when it can be checked against what it was shown." },
  { title: "Deterministic first", body: "Use code for the reasoning you can specify, and the LLM only where you can't." },
  { title: "Plan for failure", body: "Hallucination, timeouts and bad data are normal inputs, so design for them." },
];

export type Project = {
  title: string;
  year: string;
  summary: string;
  tags: string[];
  live?: string;
  code?: string;
  /** A few more lines for the project's card (what it does, what was hard). Optional. */
  details?: string[];
  /**
   * Up to two pictures for a featured project, shown on the left-hand page, e.g.
   * ["/work/ledgerline-1.jpg", "/work/ledgerline-2.jpg"] (put the files in /public/work).
   * Landscape, about 16:10. Until they are set, tinted frames stand in for them.
   */
  images?: string[];
};

export const featuredProjects: Project[] = [
  {
    title: "Sentrix",
    year: "2026",
    summary:
      "A self-hosted, open-source SOC platform unifying ~10 security disciplines (SIEM, IAM, SOAR, GRC and more) behind one API. I built the IAM, Perimeter Security and compliance modules.",
    tags: ["FastAPI", "Go", "PostgreSQL", "Keycloak", "Next.js"],
  },
  {
    title: "SystemLens",
    year: "2026",
    summary:
      "A local AI ops agent that watches Docker Compose logs and returns evidence-grounded root-cause findings. A rule-based correlation engine does the reasoning, and the LLM only ranks and explains.",
    tags: ["Python", "asyncio", "Ollama", "Groq", "Docker"],
    code: "https://github.com/Prabhav558/SystemLens",
  },
];

export const moreProjects: Project[] = [
  {
    title: "SafePath",
    year: "2025",
    summary: "Flutter safety app that scores routes against local crime data, with one-tap and voice SOS.",
    details: [
      "Scores candidate routes against local crime-incident data, weighting by how close each comes to reported incidents, and recommends the lower-risk path.",
      "One-tap and voice-activated SOS alerts a pre-set list of emergency contacts.",
      "Unsafe places can be reported anonymously, with no account.",
    ],
    tags: ["Flutter", "Dart", "Python"],
  },
  {
    title: "FaceLock",
    year: "2025",
    summary: "Real-time face detection and a smart door lock built on OpenCV.",
    tags: ["Python", "OpenCV"],
    code: "https://github.com/Prabhav558/FaceLock",
  },
  {
    title: "Moodify",
    year: "2025",
    summary: "Music recommendation system that picks songs from how you feel.",
    tags: ["TypeScript"],
    code: "https://github.com/Prabhav558/Moodify",
  },
  {
    title: "Attendix",
    year: "2025",
    summary: "A Rust attendance system built for a hackathon.",
    tags: ["Rust"],
    code: "https://github.com/Prabhav558/Attendix-tgl",
  },
  {
    title: "RAG",
    year: "2025",
    summary: "Retrieval-augmented generation experiments in Python.",
    tags: ["Python", "RAG"],
    code: "https://github.com/Prabhav558/RAG",
  },
  {
    title: "Disease Classifier",
    year: "2024",
    summary: "Machine-learning classifier for disease prediction.",
    tags: ["Python", "ML"],
    code: "https://github.com/Prabhav558/disease-classifier",
  },
];

export const techStack = [
  "Python", "LangGraph", "FastAPI", "Go", "Rust", "PostgreSQL",
  "Redis", "AWS Bedrock", "Docker", "Kubernetes", "Next.js", "Keycloak",
];

export const extraHighlights = [
  { title: "Hackathons", body: "Honorable Mention at MozoHack and Special Mention at DAYZERO, both April 2025." },
  { title: "Certified", body: "AWS Solutions Architect Associate, AI Practitioner and Cloud Practitioner, all in 2026." },
  { title: "Languages", body: "English (professional working proficiency) and Hindi (native)." },
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
    company: "TalenciaGlobal",
    title: "Software Development Intern",
    period: "Jul 2026 — Present",
    location: "Chennai",
    points: [
      "Architected a LangGraph company-intelligence engine: one request fans out to 9 parallel agents on AWS Bedrock to fill a 164-field schema.",
      "Added a 3-model judge-consensus layer that re-checks low-confidence fields before they reach PostgreSQL, to curb hallucination.",
      "Built the FastAPI backend with async jobs and RBAC, and merged four role workspaces onto one shared deployment.",
    ],
  },
  {
    company: "Xenkrypt Technologies",
    title: "Backend Developer",
    period: "Dec 2025 — Mar 2026",
    location: "Chennai",
    points: [
      "Core contributor to Sentrix, a self-hosted SOC platform unifying 10 security disciplines.",
      "Owned the GRC module and a risk-engine microservice that derives ISO 27001 compliance from live telemetry.",
      "Built Perimeter Security with MITRE ATT&CK mapping and its Go endpoint agent, plus the initial Keycloak + Casbin IAM layer.",
    ],
  },
];

export const education = {
  school: "SRM Institute of Science and Technology",
  degree: "B.Tech, Computer Science & Engineering",
  period: "2023 — 2027",
  notes: ["CGPA 9.35 / 10", "Kattankulathur, Chennai"],
};

/** What you're learning right now — shown under Education. */
export const learning = [
  { topic: "Agent evaluation", note: "measuring multi-agent systems beyond vibes" },
  { topic: "Rust", note: "systems programming and gRPC services" },
  { topic: "Kubernetes", note: "running the agent stack in production" },
];

export const awards = [
  { title: "MozoHack (SRMKZILLA), Honorable Mention", year: "2025" },
  { title: "DAYZERO (CodeNex), Special Mention", year: "2025" },
  { title: "AWS Certified Solutions Architect, Associate", year: "2026" },
];

/**
 * Contact form — create a free access key at https://web3forms.com and put it in
 * `.env.local` as NEXT_PUBLIC_FORM_KEY=xxxxxxxx-xxxx-...
 */
export const contactForm = {
  endpoint: "https://api.web3forms.com/submit",
  accessKey: process.env.NEXT_PUBLIC_FORM_KEY ?? "",
};
