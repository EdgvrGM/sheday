import { ImageResponse } from "next/og";

import { APP_ICON_SVG, FAVICON_SVG, MASKABLE_ICON_SVG, svgDataUri } from "@/lib/brand-svgs";

// Genera /icon/32 (favicon), /icon/192 y /icon/512 (app) y /icon/maskable (Android).
// - Favicon: etiqueta con una sola S (la S+D no se distingue a 16-32 px).
// - App: etiqueta S+D blanca sobre rosa.
// - Maskable: misma etiqueta con margen seguro, porque Android recorta en círculo.
const ICONS = [
  { id: "32", size: 32, svg: FAVICON_SVG },
  { id: "192", size: 192, svg: APP_ICON_SVG },
  { id: "512", size: 512, svg: APP_ICON_SVG },
  { id: "maskable", size: 512, svg: MASKABLE_ICON_SVG },
];

export function generateImageMetadata() {
  return ICONS.map(({ id, size }) => ({ id, contentType: "image/png", size: { width: size, height: size } }));
}

export default async function Icon({ id }: { id: Promise<string | number> }) {
  const iconId = String(await id);
  const icon = ICONS.find((i) => i.id === iconId) ?? ICONS[0];
  return new ImageResponse(
    (
      // eslint-disable-next-line @next/next/no-img-element -- ImageResponse solo acepta <img>
      <img src={svgDataUri(icon.svg)} width={icon.size} height={icon.size} alt="" />
    ),
    { width: icon.size, height: icon.size }
  );
}
