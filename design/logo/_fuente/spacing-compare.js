// Hoja de comparación de niveles de espaciado para SHEDAY (Maison).
// Uso: node spacing-compare.js <carpeta-logo>
const fs = require("fs");
const path = require("path");
const fk = require("fontkit");
const { opticalKerning } = require("./optical");

const D = process.argv[2];
const font = fk.openSync(path.join(__dirname, "bodoni-roman-500.ttf"));
const UPM = font.unitsPerEm;
const SIZE = 110, TRACK = 26;
const fmt = (d) => d.replace(/-?\d+\.\d+/g, (m) => String(Math.round(Number(m) * 100) / 100));

function kerns(strength, aShift = 0) {
  const s = SIZE / UPM, tr = TRACK / s;
  const base = opticalKerning(font, "SHEDAY", { tracking: tr, target: 0, cap: 1e9 });
  const target = (base[0].avg + base[1].avg) / 2;
  const capped = opticalKerning(font, "SHEDAY", { tracking: tr, target, cap: target * 1.35 });
  return capped.map((p, i) => p.kern * s * strength + [0, 0, 0, -aShift, aShift][i]);
}

function word(kern) {
  const run = font.layout("SHEDAY");
  const s = SIZE / UPM;
  let x = 0, minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  const parts = run.glyphs.map((g, i) => {
    const p = g.path.scale(s, -s).translate(x, 0);
    const b = p.bbox;
    minX = Math.min(minX, b.minX); maxX = Math.max(maxX, b.maxX); minY = Math.min(minY, b.minY); maxY = Math.max(maxY, b.maxY);
    x += run.positions[i].xAdvance * s + TRACK + (kern[i] || 0);
    return p.toSVG();
  });
  const pad = 10, w = Math.ceil(maxX - minX + pad * 2), h = Math.ceil(maxY - minY + pad * 2);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><path fill="#2B1226" transform="translate(${(pad - minX).toFixed(2)} ${(pad - minY).toFixed(2)})" d="${fmt(parts.join(""))}"/></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

const levels = [
  { name: "Sin ajuste (original)", strength: 0 },
  { name: "A · Ajuste actual", strength: 1 },
  { name: "B · Más corrección", strength: 1.6 },
  { name: "B ajustada · A 3 px a la izquierda (aplicada)", strength: 1.6, aShift: 3 },
  { name: "C · Mucha corrección", strength: 2.2 },
  { name: "D · Máxima", strength: 2.8 },
];

const rows = levels.map((l) => {
  const k = kerns(l.strength, l.aShift);
  const pairs = ["SH", "HE", "ED", "DA", "AY"].map((p, i) => `${p} ${k[i] >= 0 ? "+" : ""}${k[i].toFixed(1)}`).join("   ");
  const uri = word(k);
  return `<section><h2>${l.name}</h2><img src="${uri}" style="width:100%;max-width:640px"><div class="small"><img src="${uri}" height="22"><img src="${uri}" height="14"></div><p>${pairs} px</p></section>`;
}).join("\n");

const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Sheday · Espaciado</title>
<style>body{margin:0;font-family:system-ui,sans-serif;color:#2b1226}main{max-width:760px;margin:0 auto;padding:24px 16px 64px}h1{font-size:22px;margin:0 0 6px}h2{font-size:16px;margin:0 0 10px}p{color:#6b5763;font-size:13px;margin:8px 0 0;font-family:ui-monospace,monospace}section{border:1px solid #ebdde4;border-radius:12px;padding:18px;margin-top:16px}.small{display:flex;gap:24px;align-items:center;margin-top:12px}.intro{font-family:inherit;font-size:15px;line-height:1.5}</style></head>
<body><main><h1>SHEDAY: niveles de espaciado</h1><p class="intro">Cada nivel acerca más los pares con diagonales (D-A y A-Y). Mira el nombre completo de lejos y elige en cuál todas las letras se sienten igual de separadas. Abajo de cada uno: tamaño de encabezado y tamaño pequeño, y el ajuste por par.</p>
${rows}
</main></body></html>`;
fs.writeFileSync(path.join(D, "espaciado.html"), html);
console.log("espaciado.html listo");
levels.forEach((l) => console.log(l.name.padEnd(24), kerns(l.strength, l.aShift).map((v) => v.toFixed(1)).join("  ")));
