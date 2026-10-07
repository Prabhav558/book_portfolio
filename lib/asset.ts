/**
 * The address of a file in /public (and of a page), as the browser has to ask for it. On GitHub Pages the site
 * lives under /<repo-name>/ (next.config.ts, NEXT_BASE_PATH), and a plain "/resume.pdf" would ask the wrong place.
 * `next/image` and `next/link` add the prefix themselves; a plain <img>, <a> or download link does not.
 */
export const asset = (path: string) => `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${path}`;
