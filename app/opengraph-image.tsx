import { ImageResponse } from "next/og";
import { ogTemplate, OG_SIZE } from "@/lib/og-template";

export const runtime = "edge";
export const alt = "Mandor · No mercado privado, o tempo no deal errado não volta";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    ogTemplate({
      tag: "M&A · Crédito estruturado · Due diligence",
      titleMain: "No mercado privado, o tempo",
      titleAccent: "no deal errado não volta.",
      sub: "O Mandor entrega o parecer institucional de M&A e crédito, rastreável e auditável, em até 90 minutos.",
      stamp: "Saiba se o deal merece avançar, antes de queimar semanas",
    }),
    { ...size },
  );
}
