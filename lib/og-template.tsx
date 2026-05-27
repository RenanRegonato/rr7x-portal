import type { ReactElement } from "react";

// Template institucional de imagem OpenGraph (1200x630), marca Mandor.
// Usado pelos opengraph-image.tsx da home e das páginas de marketing.
// Sem fontes customizadas (sans-serif do sistema, como o OG raiz), para
// renderizar de forma confiável no runtime edge do next/og.

export const OG_SIZE = { width: 1200, height: 630 };

export function ogTemplate({
  tag,
  titleMain,
  titleAccent,
  sub,
  stamp,
}: {
  tag: string;
  titleMain: string;
  titleAccent: string;
  sub: string;
  stamp: string;
}): ReactElement {
  return (
    <div
      style={{
        width: 1200,
        height: 630,
        background: "linear-gradient(160deg, #080E1D 0%, #0D1829 100%)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "76px 90px",
        fontFamily: "sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* filete de topo (acento institucional) */}
      <div style={{ position: "absolute", top: 0, left: 0, width: 1200, height: 6, background: "#1655E8", display: "flex" }} />
      {/* glow */}
      <div
        style={{
          position: "absolute",
          top: -220,
          right: -120,
          width: 740,
          height: 740,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(22,85,232,0.20) 0%, transparent 70%)",
          display: "flex",
        }}
      />

      {/* wordmark + tag */}
      <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 44 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: "#1655E8", display: "flex" }} />
        <span style={{ fontSize: 30, color: "#FFFFFF", fontWeight: 600, letterSpacing: 0.5 }}>Mandor</span>
        <span style={{ fontSize: 13, color: "#5B74A6", textTransform: "uppercase", letterSpacing: 3, marginLeft: 14 }}>{tag}</span>
      </div>

      {/* headline */}
      <div style={{ display: "flex", flexDirection: "column", fontSize: 58, fontWeight: 700, color: "#EEF3FF", lineHeight: 1.08, letterSpacing: -1.5, maxWidth: 920, marginBottom: 26 }}>
        <span>{titleMain}</span>
        <span style={{ color: "#93B4F8", fontStyle: "italic" }}>{titleAccent}</span>
      </div>

      {/* sub */}
      <div style={{ fontSize: 23, color: "#7A92BE", maxWidth: 780, lineHeight: 1.5, marginBottom: 44, display: "flex" }}>{sub}</div>

      {/* selo */}
      <div style={{ display: "flex", alignItems: "center", gap: 11, fontSize: 15, color: "#C8D4EC", border: "1px solid #1E2E4A", borderRadius: 999, padding: "10px 18px", alignSelf: "flex-start" }}>
        <div style={{ width: 9, height: 9, borderRadius: 999, background: "#5BA3E8", display: "flex" }} />
        {stamp}
      </div>
    </div>
  );
}
