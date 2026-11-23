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
          background: "linear-gradient(135deg, #fce4ec 0%, #ffffff 60%)",
          fontFamily: "sans-serif",
        }}>
        <div style={{ fontSize: 160, fontWeight: 800, color: "#c2185b", letterSpacing: -4 }}>Sheday</div>
        <div style={{ fontSize: 44, color: "#1f1a1c", marginTop: 8 }}>Ropa para mujer</div>
        <div style={{ fontSize: 32, color: "#6e6468", marginTop: 24 }}>
          Entrega inmediata · Sobre pedido · Pago en efectivo
        </div>
      </div>
    ),
    size
  );
}
