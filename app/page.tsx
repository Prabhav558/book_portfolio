import Experience from "@/components/Experience";

export default function Home() {
  return (
    <>
      <Experience />
      <noscript>
        <a href="/quick" style={{ position: "fixed", inset: 0, display: "grid", placeItems: "center", background: "#120d09", color: "#efe6d6" }}>
          View the portfolio
        </a>
      </noscript>
    </>
  );
}
