import { ImageResponse } from "next/og";

import { LOGO_ON_PINK_SVG, svgDataUri } from "@/lib/brand-svgs";

// Vista previa al compartir la página principal por WhatsApp/Facebook
export const alt = "Sheday — Ropa para mujer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Proporción del logo horizontal: 721 × 187
const LOGO_W = 760;
const LOGO_H = Math.round((LOGO_W * 187) / 721);

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#e4007c",
          fontFamily: "sans-serif",
        }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse solo acepta <img> */}
        <img src={svgDataUri(LOGO_ON_PINK_SVG)} width={LOGO_W} height={LOGO_H} alt="" />
        <div style={{ fontSize: 36, color: "#ffffff", marginTop: 40 }}>
          Ropa para mujer. Entrega inmediata o sobre pedido, pagas al recibir.
        </div>
      </div>
    ),
    size
  );
}
