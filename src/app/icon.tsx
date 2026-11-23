import { ImageResponse } from "next/og";

import { BrandMark } from "@/lib/brand-mark";

// Genera /icon/32, /icon/192 y /icon/512 (favicon y PWA)
const SIZES = [32, 192, 512];

export function generateImageMetadata() {
  return SIZES.map((s) => ({ id: String(s), contentType: "image/png", size: { width: s, height: s } }));
}

export default async function Icon({ id }: { id: Promise<string | number> }) {
  const size = Number(await id);
  // Los íconos de PWA van sin esquinas redondeadas: el sistema aplica su propia máscara
  return new ImageResponse(<BrandMark size={size} rounded={size === 32} />, { width: size, height: size });
}
