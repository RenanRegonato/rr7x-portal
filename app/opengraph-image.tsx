import { ImageResponse } from "next/og";
import { ogTemplate, OG_SIZE } from "@/lib/og-template";

export const runtime = "edge";
export const alt = "Mandor · Inteligência institucional para M&A, crédito e captação";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    ogTemplate({
      tag: "M&A · Crédito · Captação",
      titleMain: "O padrão de análise",
      titleAccent: "para o mercado privado.",
      sub: "Uma rede cognitiva que lê cada deal e devolve análise institucional, rastreável e auditável.",
      stamp: "Ancorado em documento e fonte · rastreável na due diligence",
    }),
    { ...size },
  );
}
