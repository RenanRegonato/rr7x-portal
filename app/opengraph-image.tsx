import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Mandor — Deal Intelligence para M&A e Crédito Estruturado";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: "linear-gradient(160deg, #080E1D 0%, #0D1829 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "80px 90px",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: "absolute",
            top: -200,
            right: -100,
            width: 700,
            height: 700,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(22,85,232,0.18) 0%, transparent 70%)",
          }}
        />

        {/* Logo row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 52,
          }}
        >
          {/* O symbol: open circle with blue dot */}
          <div style={{ position: "relative", width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              border: "5px solid #FFFFFF",
              borderRightColor: "transparent",
              transform: "rotate(-30deg)",
            }} />
            <div style={{
              position: "absolute",
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#5BA3E8",
            }} />
          </div>
          <span style={{ fontSize: 30, color: "#FFFFFF", fontWeight: 500, letterSpacing: -1 }}>
            tto
          </span>
          <span style={{ fontSize: 12, color: "#4A6090", textTransform: "uppercase", letterSpacing: 2.5, marginLeft: 6 }}>
            by RR7x
          </span>
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: 58,
            fontWeight: 700,
            color: "#EEF3FF",
            lineHeight: 1.08,
            letterSpacing: -1.5,
            maxWidth: 820,
            marginBottom: 24,
          }}
        >
          Diagnóstico de M&A em até{" "}
          <span style={{ color: "#93B4F8", fontStyle: "italic" }}>90 minutos.</span>
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 22,
            color: "#7A92BE",
            maxWidth: 640,
            lineHeight: 1.5,
            marginBottom: 52,
          }}
        >
          10 especialistas em IA em paralelo. Análise institucional completa para escritórios de M&A.
        </div>

        {/* Metrics row */}
        <div style={{ display: "flex", gap: 40 }}>
          {[
            { value: "até 90 min", label: "por análise" },
            { value: "40+", label: "deals/mês" },
            { value: "4×", label: "mais rápido" },
            { value: "R$ 6M–12M", label: "receita incremental/ano" },
          ].map((m) => (
            <div key={m.label} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 28, fontWeight: 700, color: "#EEF3FF", letterSpacing: -0.5 }}>
                {m.value}
              </span>
              <span style={{ fontSize: 13, color: "#4A6090" }}>{m.label}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
