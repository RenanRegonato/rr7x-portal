import { ImageResponse } from "next/og";
import { ogTemplate, OG_SIZE } from "@/lib/og-template";

export const runtime = "edge";
export const alt = "Adequação à Reforma Tributária para M&A, crédito e captação · Mandor";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    ogTemplate({
      tag: "Reforma Tributária",
      titleMain: "Adequação à Reforma Tributária",
      titleAccent: "para M&A e crédito.",
      sub: "EC 132/2023 e LC 214/2025. O risco fiscal que decide o deal, ancorado em lei.",
      stamp: "Ancorado na LC 214/2025 · rastreável na due diligence",
    }),
    { ...size },
  );
}
