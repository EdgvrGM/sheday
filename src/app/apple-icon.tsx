import { ImageResponse } from "next/og";

import { APPLE_ICON_SVG, svgDataUri } from "@/lib/brand-svgs";

// Ícono al "Agregar a pantalla de inicio" en iPhone (iOS redondea las esquinas solo)
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      // eslint-disable-next-line @next/next/no-img-element -- ImageResponse solo acepta <img>
      <img src={svgDataUri(APPLE_ICON_SVG)} width={180} height={180} alt="" />
    ),
    size
  );
}
