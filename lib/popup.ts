import type { Project } from "@/content/portfolio";

/**
 * A page asks for a project's card; the card itself lives outside the book (components/ui/ProjectPopup),
 * so it is not part of a page that turns, and no copy of a page ever carries a second one.
 */
type Listener = (p: Project) => void;
const listeners = new Set<Listener>();

export const projectPopup = {
  open(p: Project) {
    listeners.forEach((f) => f(p));
  },
  subscribe(f: Listener) {
    listeners.add(f);
    return () => void listeners.delete(f);
  },
};
