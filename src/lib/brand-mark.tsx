// Ícono provisional de Sheday (una "S" sobre el color de marca),
// generado como PNG en la compilación. Reemplázalo cuando tengas logo.

export function BrandMark({ size, rounded = true }: { size: number; rounded?: boolean }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#c2185b",
        borderRadius: rounded ? size * 0.22 : 0,
        color: "#ffffff",
        fontSize: size * 0.62,
        fontWeight: 800,
        fontFamily: "sans-serif",
        letterSpacing: -size * 0.02,
      }}>
      S
    </div>
  );
}
