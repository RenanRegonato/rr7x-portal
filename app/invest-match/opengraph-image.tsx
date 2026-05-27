import { ImageResponse } from "next/og";
import { ogTemplate, OG_SIZE } from "@/lib/og-template";

export const runtime = "edge";
export const alt = "Invest Match · Originação de deals e matching de investidores · Mandor";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    ogTemplate({
      tag: "Invest Match",
      titleMain: "Da análise à tese,",
      titleAccent: "ao investidor certo.",
      sub: "Originação como processo. Motor de matching de cinco camadas para M&A e crédito.",
      stamp: "Deal flow qualificado · originação como processo",
    }),
    { ...size },
  );
}
