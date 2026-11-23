import { ImageResponse } from "next/og";

// Vista previa al compartir la página principal por WhatsApp/Facebook
export const alt = "Sheday — Ropa para mujer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

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
        <div style={{ fontSize: 170, fontWeight: 700, color: "#ffffff", letterSpacing: -4 }}>Sheday</div>
        <div style={{ fontSize: 46, color: "#ffffff", marginTop: 8 }}>Ropa para mujer</div>
        <div style={{ fontSize: 32, color: "#ffffff", marginTop: 24 }}>
          Entrega inmediata o sobre pedido, pagas al recibir
        </div>
      </div>
    ),
    size
  );
}
