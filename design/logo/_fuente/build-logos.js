// Genera los logos de Sheday como SVG con las letras convertidas a trazos
// (no dependen de que la fuente esté instalada). Uso: node build-logos.js <carpeta-salida>
const fk = require("fontkit");
const fs = require("fs");
const path = require("path");

const OUT = process.argv[2];
module.exports = {};
if (!OUT) throw new Error("Falta carpeta de salida");

// Instancias estáticas creadas con fontTools (fontkit no varía bien un WOFF2)
const open = (f) => fk.openSync(path.join(__dirname, f));
const FONTS = {
  italic: { 600: open("bodoni-italic-600.ttf"), 800: open("bodoni-italic-800.ttf"), 850: open("bodoni-italic-850.ttf") },
  roman: { 500: open("bodoni-roman-500.ttf"), 600: open("bodoni-roman-600.ttf"), 800: open("bodoni-roman-800.ttf") },
  // Fraunces: opsz 144, SOFT 100, WONK 1 (serifa gruesa y suave, estilo 70s)
  fraunces: { 850: open("fraunces-black-soft.ttf") },
  // Archivo al ancho máximo (wdth 125)
  wide: { 500: open("archivo-expanded-500.ttf"), 800: open("archivo-expanded-800.ttf") },
};
const ITALIC = "italic";
const ROMAN = "roman";
const UPM = FONTS.italic[600].unitsPerEm;

const C = { brand: "#C4006A", bright: "#E4007C", ink: "#2B1226", white: "#FFFFFF" };

const { opticalKerning } = require("./optical");

/**
 * Espaciado óptico: cada par queda con el mismo "aire" visual que el promedio
 * de los dos primeros pares. Devuelve el kerning extra en px para cada hueco.
 */
function opticalKern(style, wght, text, size, tracking, { capFactor = 1.35, strength = 1 } = {}) {
  const font = FONTS[style][wght];
  const s = size / font.unitsPerEm;
  const tr = tracking / s;
  const base = opticalKerning(font, text, { tracking: tr, target: 0, cap: 1e9 });
  const target = (base[0].avg + base[1].avg) / 2;
  const capped = opticalKerning(font, text, { tracking: tr, target, cap: target * capFactor });
  // strength > 1: corrige de más los pares con diagonales (el ojo los ve más abiertos que su área)
  return capped.map((p) => p.kern * s * strength);
}

const fmt = (d) => d.replace(/-?\d+\.\d+/g, (m) => String(Math.round(Number(m) * 100) / 100));

/** Convierte texto a un path. Origen: x=0 en el inicio, y=0 en la línea base. */
/**
 * fontkit pierde el cmap al variar un WOFF2: se hace el layout (letras + kerning)
 * con la fuente base y se toma el contorno/avance de cada glifo en la variación.
 */
function varied(style, text, wght) {
  const font = FONTS[style][wght];
  if (!font) throw new Error(`No hay instancia ${style} ${wght}`);
  const run = font.layout(text); // incluye kerning
  return run.glyphs.map((g, i) => ({
    path: g.path,
    xAdvance: run.positions[i].xAdvance,
    xOffset: run.positions[i].xOffset,
    yOffset: run.positions[i].yOffset,
  }));
}

function shape(style, text, { wght = 600, size = 100, tracking = 0, kern = [] } = {}) {
  const glyphs = varied(style, text, wght);
  const s = size / UPM;
  let x = 0;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const parts = [];
  glyphs.forEach((g, i) => {
    const pos = g;
    const p = g.path.scale(s, -s).translate(x + pos.xOffset * s, -pos.yOffset * s);
    const b = p.bbox;
    if (isFinite(b.minX)) {
      minX = Math.min(minX, b.minX); minY = Math.min(minY, b.minY);
      maxX = Math.max(maxX, b.maxX); maxY = Math.max(maxY, b.maxY);
    }
    parts.push(p.toSVG());
    x += pos.xAdvance * s + tracking + (kern[i] || 0);
  });
  return { d: fmt(parts.join("")), advance: x - tracking, bbox: { minX, minY, maxX, maxY } };
}

/** Coloca un shape para que su caja visible quede centrada en (cx, cy). */
function centered(sh, cx, cy) {
  const w = sh.bbox.maxX - sh.bbox.minX, h = sh.bbox.maxY - sh.bbox.minY;
  const tx = cx - w / 2 - sh.bbox.minX, ty = cy - h / 2 - sh.bbox.minY;
  return `translate(${fmt(tx.toFixed(2))} ${fmt(ty.toFixed(2))})`;
}

function svg({ w, h, title, desc, body, bg }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-labelledby="t d">
  <title id="t">${title}</title>
  <desc id="d">${desc}</desc>
${bg ? `  <rect width="${w}" height="${h}" fill="${bg}"/>\n` : ""}${body}
</svg>
`;
}

const files = {};
const save = (name, content) => { files[name] = content; };

// ---------- Wordmark (base de los conceptos 1 y 2) ----------
const WORD = shape(ITALIC, "Sheday", { wght: 600, size: 120, tracking: 1 });
const wW = WORD.bbox.maxX - WORD.bbox.minX, wH = WORD.bbox.maxY - WORD.bbox.minY;
const PAD = 12;

function wordmark(color, bg) {
  const w = Math.ceil(wW + PAD * 2), h = Math.ceil(wH + PAD * 2);
  return svg({
    w, h, bg,
    title: "Sheday",
    desc: "Logotipo de Sheday: el nombre en letra Bodoni cursiva.",
    body: `  <path fill="${color}" transform="${centered(WORD, w / 2, h / 2)}" d="${WORD.d}"/>`,
  });
}

// ---------- Concepto 1: Firma ----------
// Monograma: S cursiva gruesa (se lee a 32px) sobre rosa mexicano
const S_HEAVY = shape(ITALIC, "S", { wght: 850, size: 100 });
function monogram({ size = 512, radius = 0.22, fg = C.white, bg = C.bright, scale = 0.62 }) {
  const sh = shape(ITALIC, "S", { wght: 850, size: size * scale * 1.42 });
  const r = Math.round(size * radius);
  return svg({
    w: size, h: size,
    title: "Sheday",
    desc: "Monograma de Sheday: una S cursiva blanca sobre rosa mexicano.",
    body: `  <rect width="${size}" height="${size}" rx="${r}" fill="${bg}"/>
  <path fill="${fg}" transform="${centered(sh, size / 2, size / 2)}" d="${sh.d}"/>`,
  });
}

save("1-firma/sheday-wordmark.svg", wordmark(C.brand));
save("1-firma/sheday-wordmark-ciruela.svg", wordmark(C.ink));
save("1-firma/sheday-wordmark-sobre-rosa.svg", wordmark(C.white, C.bright));
save("1-firma/sheday-monograma.svg", monogram({}));
save("1-firma/sheday-monograma-app.svg", monogram({ radius: 0, scale: 0.5 })); // PWA "maskable": sin esquinas, con margen seguro
void S_HEAVY;

// ---------- Concepto 2: Etiqueta ----------
// Etiqueta colgante: rectángulo con esquinas superiores cortadas y perforación
function tagPath(x, y, w, h) {
  const cut = w * 0.32, r = w * 0.08;
  return fmt(
    `M${x + cut} ${y} H${x + w - cut} L${x + w} ${y + cut} V${y + h - r} Q${x + w} ${y + h} ${x + w - r} ${y + h} H${x + r} Q${x} ${y + h} ${x} ${y + h - r} V${y + cut} Z`
  );
}
function tagIcon(size, { bg = C.brand, fg = C.white, withFrame = false } = {}) {
  const tw = size * 0.56, th = size * 0.8;
  const tx = (size - tw) / 2, ty = (size - th) / 2;
  const hole = tw * 0.09;
  const sh = shape(ITALIC, "S", { wght: 850, size: th * 0.54 });
  const frame = withFrame ? `  <rect width="${size}" height="${size}" fill="${C.white}"/>\n` : "";
  return `${frame}  <path fill="${bg}" fill-rule="evenodd" d="${tagPath(tx, ty, tw, th)} M${fmt((size / 2 + hole).toFixed(2))} ${fmt((ty + tw * 0.26).toFixed(2))} a${fmt(hole.toFixed(2))} ${fmt(hole.toFixed(2))} 0 1 0 ${fmt((-2 * hole).toFixed(2))} 0 a${fmt(hole.toFixed(2))} ${fmt(hole.toFixed(2))} 0 1 0 ${fmt((2 * hole).toFixed(2))} 0 Z"/>
  <path fill="${fg}" transform="${centered(sh, size / 2, ty + th * 0.64)}" d="${sh.d}"/>`;
}
{
  const size = 512;
  save("2-etiqueta/sheday-etiqueta-icono.svg", svg({
    w: size, h: size, title: "Sheday",
    desc: "Ícono de Sheday: una etiqueta de ropa rosa con perforación y una S cursiva blanca.",
    body: tagIcon(size),
  }));
  // Horizontal: etiqueta + wordmark en ciruela
  const ih = Math.ceil(wH * 1.5), gap = 18;
  const w = Math.ceil(ih + gap + wW + PAD * 2), h = Math.ceil(ih + PAD * 2);
  save("2-etiqueta/sheday-etiqueta-horizontal.svg", svg({
    w, h, title: "Sheday",
    desc: "Logotipo de Sheday: etiqueta de ropa rosa con S y el nombre en Bodoni cursiva.",
    body: `  <g transform="translate(${PAD} ${PAD}) scale(${fmt((ih / size).toFixed(4))})">\n${tagIcon(size)}\n  </g>
  <path fill="${C.ink}" transform="${centered(WORD, PAD + ih + gap + wW / 2, h / 2 + wH * 0.04)}" d="${WORD.d}"/>`,
  }));
}

// ---------- Concepto 3: Sello ----------
function seal({ fg = C.brand, bg = C.white, text = "SHEDAY · ROPA PARA MUJER · " }) {
  const size = 512, cx = size / 2, cy = size / 2;
  const R = size * 0.36; // radio de la línea base del texto
  const fsz = size * 0.092;
  const s = fsz / UPM;
  const glyphs = varied(ROMAN, text, 600).map((g) => ({ path: g.path, adv: g.xAdvance * s }));
  const total = glyphs.reduce((n, x) => n + x.adv, 0);
  const extra = (2 * Math.PI * R - total) / glyphs.length; // reparte el sobrante en todo el círculo
  // Empieza antes de las 12 para que la primera palabra quede centrada arriba
  const firstWord = text.split(" ")[0].length;
  const firstLen = glyphs.slice(0, firstWord).reduce((n, x) => n + x.adv + extra, 0) - extra;
  let arc = -firstLen / 2;
  const ring = glyphs.map(({ path: gp, adv }) => {
    const mid = arc + adv / 2;
    arc += adv + extra;
    const ang = (mid / (2 * Math.PI * R)) * 360;
    const p = gp.scale(s, -s).translate(-adv / 2, 0).toSVG();
    if (!p) return "";
    return `    <path transform="rotate(${fmt(ang.toFixed(2))} ${cx} ${cy}) translate(${cx} ${fmt((cy - R).toFixed(2))})" d="${fmt(p)}"/>`;
  }).join("\n");
  const sh = shape(ITALIC, "S", { wght: 800, size: size * 0.4 });
  return svg({
    w: size, h: size, title: "Sheday",
    desc: "Sello de Sheday: círculo con el texto Sheday, ropa para mujer, y una S cursiva al centro.",
    body: `  <circle cx="${cx}" cy="${cy}" r="${size * 0.48}" fill="${bg}"/>
  <circle cx="${cx}" cy="${cy}" r="${size * 0.46}" fill="none" stroke="${fg}" stroke-width="${size * 0.012}"/>
  <circle cx="${cx}" cy="${cy}" r="${size * 0.27}" fill="none" stroke="${fg}" stroke-width="${size * 0.006}"/>
  <g fill="${fg}">
${ring}
  </g>
  <path fill="${fg}" transform="${centered(sh, cx, cy)}" d="${sh.d}"/>`,
  });
}
save("3-sello/sheday-sello.svg", seal({}));
save("3-sello/sheday-sello-sobre-rosa.svg", seal({ fg: C.white, bg: C.bright }));

// ---------- Utilidades para los conceptos 4–7 ----------
/** SVG ajustado al texto, con margen. */
function textLogo(sh, { color, bg, pad = 14, desc }) {
  const w = Math.ceil(sh.bbox.maxX - sh.bbox.minX + pad * 2);
  const h = Math.ceil(sh.bbox.maxY - sh.bbox.minY + pad * 2);
  return svg({ w, h, bg, title: "Sheday", desc, body: `  <path fill="${color}" transform="${centered(sh, w / 2, h / 2)}" d="${sh.d}"/>` });
}
/** Ícono cuadrado con una letra centrada. */
function letterIcon(sh, { fg, bg, size = 512, radius = 0.22, dy = 0, desc }) {
  return svg({
    w: size, h: size, title: "Sheday", desc,
    body: `  <rect width="${size}" height="${size}" rx="${Math.round(size * radius)}" fill="${bg}"/>
  <path fill="${fg}" transform="${centered(sh, size / 2, size / 2 + dy)}" d="${sh.d}"/>`,
  });
}

// Espaciado final de SHEDAY (aprobado): nivel B (óptico x1.6) y la A 3 px a la izquierda.
// Huecos en orden: S-H, H-E, E-D, D-A, A-Y. Mover la A = restar en D-A y sumar lo mismo en A-Y.
const A_SHIFT = 3;
const SHEDAY_KERN = opticalKern(ROMAN, 500, "SHEDAY", 110, 26, { strength: 1.6 }).map(
  (k, i) => k + [0, 0, 0, -A_SHIFT, A_SHIFT][i]
);

// ---------- Concepto 4: Maison (serifa recta en mayúsculas) ----------
// Tendencia 2026: casas de moda regresando a la serifa (Lacoste, JW Anderson, Dior)
{
  const kern = SHEDAY_KERN;
  const word = shape(ROMAN, "SHEDAY", { wght: 500, size: 110, tracking: 26, kern });
  const desc = "Logotipo de Sheday en mayúsculas con letra Bodoni recta y espaciada.";
  save("4-maison/sheday-maison.svg", textLogo(word, { color: C.ink, desc }));
  save("4-maison/sheday-maison-rosa.svg", textLogo(word, { color: C.brand, desc }));
  save("4-maison/sheday-maison-sobre-ciruela.svg", textLogo(word, { color: C.white, bg: C.ink, desc }));
  const s = shape(ROMAN, "S", { wght: 800, size: 512 * 0.72 });
  save("4-maison/sheday-maison-icono.svg", letterIcon(s, { fg: C.white, bg: C.ink, desc: "Monograma de Sheday: una S Bodoni recta blanca sobre ciruela." }));
}

// ---------- Concepto 5: Retro 70s (serifa gruesa y suave) ----------
// Tendencia 2026: tipografía gruesa retro de los 70, cálida y cercana
{
  const word = shape("fraunces", "Sheday", { wght: 850, size: 120, tracking: -2 });
  const desc = "Logotipo de Sheday con letra serifa gruesa y suave, de estilo retro.";
  save("5-retro/sheday-retro.svg", textLogo(word, { color: C.brand, desc }));
  save("5-retro/sheday-retro-ciruela.svg", textLogo(word, { color: C.ink, desc }));
  save("5-retro/sheday-retro-sobre-rosa.svg", textLogo(word, { color: C.white, bg: C.bright, desc }));
  const s = shape("fraunces", "S", { wght: 850, size: 512 * 0.78 });
  save("5-retro/sheday-retro-icono.svg", letterIcon(s, { fg: C.brand, bg: "#FFE3F1", desc: "Monograma de Sheday: S gruesa rosa sobre rosa claro." }));
}

// ---------- Concepto 6: Ancha (sans extra-ancha) ----------
// Contra-tendencia 2026: sans extra-anchas (p. ej. Misty Mynx)
{
  const word = shape("wide", "SHEDAY", { wght: 800, size: 100, tracking: 2 });
  const desc = "Logotipo de Sheday en mayúsculas con letra sans extra-ancha.";
  save("6-ancha/sheday-ancha.svg", textLogo(word, { color: C.ink, desc }));
  save("6-ancha/sheday-ancha-rosa.svg", textLogo(word, { color: C.brand, desc }));
  save("6-ancha/sheday-ancha-sobre-rosa.svg", textLogo(word, { color: C.white, bg: C.bright, desc }));
  // Avatar apilado SHE / DAY para redes
  const size = 512;
  const she = shape("wide", "SHE", { wght: 800, size: 205, tracking: 3 });
  const day = shape("wide", "DAY", { wght: 800, size: 205, tracking: 3 });
  const lh = (she.bbox.maxY - she.bbox.minY) * 1.18;
  save("6-ancha/sheday-ancha-avatar.svg", svg({
    w: size, h: size, title: "Sheday",
    desc: "Avatar de Sheday: SHE y DAY apilados en letra extra-ancha blanca sobre rosa.",
    body: `  <rect width="${size}" height="${size}" fill="${C.bright}"/>
  <path fill="${C.white}" transform="${centered(she, size / 2, size / 2 - lh / 2)}" d="${she.d}"/>
  <path fill="${C.white}" transform="${centered(day, size / 2, size / 2 + lh / 2)}" d="${day.d}"/>`,
  }));
  const s = shape("wide", "S", { wght: 800, size: 512 * 1.02 });
  save("6-ancha/sheday-ancha-icono.svg", letterIcon(s, { fg: C.white, bg: C.bright, desc: "Monograma de Sheday: S extra-ancha blanca sobre rosa." }));
}

// ---------- Concepto 7: Monograma S + D entrelazado ----------
// Tendencia 2026: monograma compañero para etiquetas, bordados y sellos
function sdMono({ fg, bg, size = 512, radius = 0.22, cutout = bg }) {
  const d = shape(ROMAN, "D", { wght: 500, size: size * 0.7 });
  const s = shape(ITALIC, "S", { wght: 850, size: size * 0.6 });
  const cx = size / 2, cy = size / 2;
  const sw = size * 0.024; // contorno que "corta" la D para que se lean entrelazadas
  return svg({
    w: size, h: size, title: "Sheday",
    desc: "Monograma de Sheday: una D recta y una S cursiva entrelazadas.",
    body: `  <rect width="${size}" height="${size}" rx="${Math.round(size * radius)}" fill="${bg}"/>
  <path fill="${fg}" transform="${centered(d, cx + size * 0.09, cy)}" d="${d.d}"/>
  <path fill="${fg}" stroke="${cutout}" stroke-width="${fmt(sw.toFixed(2))}" stroke-linejoin="round" paint-order="stroke" transform="${centered(s, cx - size * 0.1, cy + size * 0.015)}" d="${s.d}"/>`,
  });
}
save("7-monograma-sd/sheday-sd.svg", sdMono({ fg: C.brand, bg: C.white }));
save("7-monograma-sd/sheday-sd-sobre-rosa.svg", sdMono({ fg: C.white, bg: C.bright }));
save("7-monograma-sd/sheday-sd-ciruela.svg", sdMono({ fg: C.white, bg: C.ink }));

// ---------- Concepto 8: Etiqueta S+D + SHEDAY Maison ----------
// Combinación pedida: la etiqueta colgante con el monograma S+D adentro
// y el wordmark SHEDAY de Maison (con espaciado óptico).

/** Monograma S+D dibujado dentro de una caja de ancho `u`, centrado en (cx, cy). */
function sdBody(cx, cy, u, fg, cutout) {
  const d = shape(ROMAN, "D", { wght: 500, size: u * 0.7 });
  const s = shape(ITALIC, "S", { wght: 850, size: u * 0.6 });
  const sw = u * 0.024;
  return `  <path fill="${fg}" transform="${centered(d, cx + u * 0.09, cy)}" d="${d.d}"/>
  <path fill="${fg}" stroke="${cutout}" stroke-width="${fmt(sw.toFixed(2))}" stroke-linejoin="round" paint-order="stroke" transform="${centered(s, cx - u * 0.1, cy + u * 0.015)}" d="${s.d}"/>`;
}

/** Etiqueta (con perforación) que contiene el monograma S+D. Caja de `size` x `size`. */
function tagSD(size, { tag = C.brand, mono = C.white } = {}) {
  const tw = size * 0.6, th = size * 0.84;
  const tx = (size - tw) / 2, ty = (size - th) / 2;
  const hole = tw * 0.085;
  const hy = ty + tw * 0.24;
  const holePath = `M${fmt((size / 2 + hole).toFixed(2))} ${fmt(hy.toFixed(2))} a${fmt(hole.toFixed(2))} ${fmt(hole.toFixed(2))} 0 1 0 ${fmt((-2 * hole).toFixed(2))} 0 a${fmt(hole.toFixed(2))} ${fmt(hole.toFixed(2))} 0 1 0 ${fmt((2 * hole).toFixed(2))} 0 Z`;
  return `  <path fill="${tag}" fill-rule="evenodd" d="${tagPath(tx, ty, tw, th)} ${holePath}"/>
${sdBody(size / 2 - tw * 0.015, ty + th * 0.655, tw * 1.24, mono, tag)}`;
}

{
  const kern = SHEDAY_KERN;
  const word = shape(ROMAN, "SHEDAY", { wght: 500, size: 110, tracking: 26, kern });
  const ww = word.bbox.maxX - word.bbox.minX, wh = word.bbox.maxY - word.bbox.minY;
  const pad = 14;
  const desc = "Logotipo de Sheday: etiqueta de ropa rosa con las iniciales S y D entrelazadas, y el nombre SHEDAY en Bodoni recta.";

  // Horizontal: etiqueta a la izquierda (alto = 2.1 veces la altura de las mayúsculas)
  const horizontal = (wordColor, tagColor, monoColor, bg) => {
    const box = Math.round(wh * 1.85 / 0.84); // caja cuadrada de la etiqueta
    const gap = wh * 0.55;
    const w = Math.ceil(pad * 2 + box * 0.6 + gap + ww);
    const h = Math.ceil(pad * 2 + box * 0.84);
    const tagX = pad - box * 0.2, tagY = pad - box * 0.08;
    return svg({
      w, h, bg, title: "Sheday", desc,
      body: `  <g transform="translate(${fmt(tagX.toFixed(2))} ${fmt(tagY.toFixed(2))}) scale(${fmt((box / 512).toFixed(4))})">
${tagSD(512, { tag: tagColor, mono: monoColor })}
  </g>
  <path fill="${wordColor}" transform="${centered(word, pad + box * 0.6 + gap + ww / 2, h / 2 + wh * 0.06)}" d="${word.d}"/>`,
    });
  };
  save("8-etiqueta-sd/sheday-horizontal.svg", horizontal(C.ink, C.brand, C.white));
  save("8-etiqueta-sd/sheday-horizontal-rosa.svg", horizontal(C.brand, C.brand, C.white));
  save("8-etiqueta-sd/sheday-horizontal-sobre-rosa.svg", horizontal(C.white, C.white, C.bright, C.bright));

  // Vertical: etiqueta arriba, nombre abajo
  const vertical = (wordColor, tagColor, monoColor, bg) => {
    const box = Math.round(ww * 0.62);
    const gap = wh * 0.7;
    const w = Math.ceil(pad * 2 + ww);
    const h = Math.ceil(pad * 2 + box * 0.84 + gap + wh);
    const tagX = w / 2 - box / 2, tagY = pad - box * 0.08;
    return svg({
      w, h, bg, title: "Sheday", desc,
      body: `  <g transform="translate(${fmt(tagX.toFixed(2))} ${fmt(tagY.toFixed(2))}) scale(${fmt((box / 512).toFixed(4))})">
${tagSD(512, { tag: tagColor, mono: monoColor })}
  </g>
  <path fill="${wordColor}" transform="${centered(word, w / 2, pad + box * 0.84 + gap + wh / 2)}" d="${word.d}"/>`,
    });
  };
  save("8-etiqueta-sd/sheday-vertical.svg", vertical(C.ink, C.brand, C.white));
  save("8-etiqueta-sd/sheday-vertical-sobre-rosa.svg", vertical(C.white, C.white, C.bright, C.bright));

  // Ícono: la etiqueta sola
  save("8-etiqueta-sd/sheday-icono.svg", svg({
    w: 512, h: 512, title: "Sheday",
    desc: "Ícono de Sheday: etiqueta de ropa rosa con las iniciales S y D entrelazadas.",
    body: tagSD(512),
  }));
  // Ícono de app: fondo rosa, etiqueta blanca
  save("8-etiqueta-sd/sheday-icono-app.svg", svg({
    w: 512, h: 512, title: "Sheday",
    desc: "Ícono de app de Sheday: etiqueta blanca con las iniciales S y D en rosa, sobre fondo rosa.",
    body: `  <rect width="512" height="512" rx="${Math.round(512 * 0.22)}" fill="${C.bright}"/>
${tagSD(512, { tag: C.white, mono: C.bright })}`,
  }));
  // Wordmark Maison corregido (también actualiza el concepto 4)
  save("8-etiqueta-sd/sheday-nombre.svg", textLogo(word, { color: C.ink, desc: "Nombre SHEDAY en Bodoni recta con espaciado óptico." }));
  // Solo para la hoja de revisión: el espaciado anterior, sin ajuste óptico
  const before = shape(ROMAN, "SHEDAY", { wght: 500, size: 110, tracking: 26 });
  save("8-etiqueta-sd/_antes-sin-ajuste.svg", textLogo(before, { color: C.ink, desc: "Espaciado anterior, sin ajuste óptico." }));
}

// ---------- Íconos finales para la web (concepto 8 aprobado) ----------
{
  const size = 512;
  // Favicon: etiqueta que llena el cuadro, con una sola S grande (se lee a 16 px)
  const tw = size * 0.7, th = size * 0.96;
  const tx = (size - tw) / 2, ty = (size - th) / 2;
  const hole = tw * 0.075, hy = ty + tw * 0.25;
  const s = shape(ITALIC, "S", { wght: 850, size: th * 0.66 });
  const holePath = `M${fmt((size / 2 + hole).toFixed(2))} ${fmt(hy.toFixed(2))} a${fmt(hole.toFixed(2))} ${fmt(hole.toFixed(2))} 0 1 0 ${fmt((-2 * hole).toFixed(2))} 0 a${fmt(hole.toFixed(2))} ${fmt(hole.toFixed(2))} 0 1 0 ${fmt((2 * hole).toFixed(2))} 0 Z`;
  save("8-etiqueta-sd/sheday-favicon.svg", svg({
    w: size, h: size, title: "Sheday",
    desc: "Favicon de Sheday: etiqueta de ropa rosa con una S cursiva blanca.",
    body: `  <path fill="${C.brand}" fill-rule="evenodd" d="${tagPath(tx, ty, tw, th)} ${holePath}"/>
  <path fill="${C.white}" transform="${centered(s, size / 2, ty + th * 0.63)}" d="${s.d}"/>`,
  }));

  // Ícono cuadrado sin esquinas (iPhone las redondea solo): etiqueta S+D blanca sobre rosa
  const square = (scale) => svg({
    w: size, h: size, title: "Sheday",
    desc: "Ícono de Sheday: etiqueta blanca con las iniciales S y D en rosa, sobre fondo rosa.",
    body: `  <rect width="${size}" height="${size}" fill="${C.bright}"/>
  <g transform="translate(${size / 2} ${size / 2}) scale(${scale}) translate(${-size / 2} ${-size / 2})">
${tagSD(size, { tag: C.white, mono: C.bright })}
  </g>`,
  });
  save("8-etiqueta-sd/sheday-icono-apple.svg", square(0.88));
  // Android "maskable": todo dentro del círculo seguro (80% del ícono)
  save("8-etiqueta-sd/sheday-icono-maskable.svg", square(0.74));
}

// ---------- Escribir ----------
for (const [name, content] of Object.entries(files)) {
  const file = path.join(OUT, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  console.log(`${name}  (${(content.length / 1024).toFixed(1)} KB)`);
}
