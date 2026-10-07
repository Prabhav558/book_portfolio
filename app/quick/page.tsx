import type { Metadata } from "next";
import { QuickView } from "@/components/quick/QuickView";
import { profile } from "@/content/portfolio";

export const metadata: Metadata = {
  title: `${profile.name} — Quick view`,
  description: profile.tagline,
};

export default function QuickPage() {
  return <QuickView />;
}
