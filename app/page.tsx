import Experience from "@/components/Experience";
import { asset } from "@/lib/asset";

export default function Home() {
  return (
    <>
      <Experience />
      <noscript>
        <a href={asset("/quick")} style={{ position: "fixed", inset: 0, display: "grid", placeItems: "center", background: "#120d09", color: "#efe6d6" }}>
          View the portfolio
        </a>
      </noscript>
    </>
  );
}
