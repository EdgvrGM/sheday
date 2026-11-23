// Genera design/logo/preview.html (autocontenido) con todos los conceptos.
// Uso: node build-preview.js <carpeta-logo>
const fs = require("fs");
const path = require("path");
const D = process.argv[2];

const uri = (f) => `data:image/svg+xml;base64,${fs.readFileSync(path.join(D, f)).toString("base64")}`;
const img = (f, attrs) => `<img src="${uri(f)}" ${attrs} alt="Sheday">`;

const tile = (inner, label, cls = "") => `<div class="tile ${cls}">${inner}<small>${label}</small></div>`;
const header = (f, h) =>
  `<div class="header"><div class="bar">${img(f, `height="${h}"`)}<span class="cart">Carrito</span></div><div class="band"></div></div>`;
const favicons = (f) => tile(`<div class="row">${img(f, 'width="32"')}${img(f, 'width="16"')}</div>`, "32 y 16 px");
const tab = (f) => tile(`<div class="tab">${img(f, 'width="16"')} Sheday — Ropa para mujer</div>`, "Pestaña del navegador");

const concepts = [
  {
    n: 8, name: "Etiqueta S+D con SHEDAY (nuevo)", tag: "Combinación elegida",
    why: "La etiqueta colgante con el monograma S+D adentro y el nombre SHEDAY de Maison. El espaciado de SHEDAY ahora es óptico: D-A y A-Y se acercaron para que todo el nombre tenga el mismo aire que SHE.",
    rows: [
      [tile(img("8-etiqueta-sd/_antes-sin-ajuste.svg", 'height="40"'), "Antes: D A Y se ven sueltas"), tile(img("8-etiqueta-sd/sheday-nombre.svg", 'height="40"'), "Ahora: espaciado óptico")],
      [tile(img("8-etiqueta-sd/sheday-horizontal.svg", 'height="90"'), "Horizontal"), tile(img("8-etiqueta-sd/sheday-horizontal-rosa.svg", 'height="90"'), "Horizontal en rosa")],
      [tile(img("8-etiqueta-sd/sheday-horizontal-sobre-rosa.svg", 'height="90"'), "Sobre rosa", "pink")],
      [tile(img("8-etiqueta-sd/sheday-vertical.svg", 'width="200"'), "Vertical"), tile(img("8-etiqueta-sd/sheday-vertical-sobre-rosa.svg", 'width="200"'), "Vertical sobre rosa", "pink")],
      [tile(img("8-etiqueta-sd/sheday-icono.svg", 'width="120"'), "Ícono"), tile(img("8-etiqueta-sd/sheday-icono-app.svg", 'width="120"'), "Ícono de app"), favicons("8-etiqueta-sd/sheday-icono-app.svg"), tab("8-etiqueta-sd/sheday-icono-app.svg")],
      [header("8-etiqueta-sd/sheday-horizontal.svg", 40)],
    ],
  },
  {
    n: 1, name: "Firma", tag: "Serifa didona en cursiva",
    why: "El nombre en Bodoni cursiva y una S sobre rosa mexicano. Es la continuación directa de la web actual.",
    rows: [
      [tile(img("1-firma/sheday-wordmark.svg", 'height="70"'), "Rosa"), tile(img("1-firma/sheday-wordmark-ciruela.svg", 'height="70"'), "Ciruela"), tile(img("1-firma/sheday-wordmark-sobre-rosa.svg", 'height="70"'), "Sobre rosa", "pink")],
      [tile(img("1-firma/sheday-monograma.svg", 'width="120"'), "Ícono"), favicons("1-firma/sheday-monograma.svg"), tab("1-firma/sheday-monograma.svg")],
      [header("1-firma/sheday-wordmark.svg", 34)],
    ],
  },
  {
    n: 2, name: "Etiqueta", tag: "Símbolo + nombre",
    why: "La S dentro de una etiqueta colgante de ropa, con su perforación, junto al nombre.",
    rows: [
      [tile(img("2-etiqueta/sheday-etiqueta-horizontal.svg", 'height="80"'), "Horizontal"), tile(img("2-etiqueta/sheday-etiqueta-icono.svg", 'width="120"'), "Ícono"), favicons("2-etiqueta/sheday-etiqueta-icono.svg")],
      [header("2-etiqueta/sheday-etiqueta-horizontal.svg", 38)],
    ],
  },
  {
    n: 3, name: "Sello", tag: "Emblema para empaques",
    why: "Emblema circular para estampas en bolsas de papel, empaques y etiquetas. Combina con cualquier otro concepto.",
    rows: [[tile(img("3-sello/sheday-sello.svg", 'width="180"'), "Sello"), tile(img("3-sello/sheday-sello-sobre-rosa.svg", 'width="180"'), "Sobre rosa", "pink"), tile(img("3-sello/sheday-sello.svg", 'width="64"'), "64 px")]],
  },
  {
    n: 4, name: "Maison", tag: "Tendencia: regreso a la serifa",
    why: "SHEDAY en Bodoni recta, mayúsculas y espaciada, como las casas de moda que regresan a la serifa en 2025–2026 (Lacoste, JW Anderson, Dior). Se siente de boutique fina; el ícono va en ciruela.",
    rows: [
      [tile(img("4-maison/sheday-maison.svg", 'height="56"'), "Ciruela"), tile(img("4-maison/sheday-maison-rosa.svg", 'height="56"'), "Rosa"), tile(img("4-maison/sheday-maison-sobre-ciruela.svg", 'height="56"'), "Sobre ciruela", "ink")],
      [tile(img("4-maison/sheday-maison-icono.svg", 'width="120"'), "Ícono"), favicons("4-maison/sheday-maison-icono.svg"), tab("4-maison/sheday-maison-icono.svg")],
      [header("4-maison/sheday-maison.svg", 22)],
    ],
  },
  {
    n: 5, name: "Retro 70s", tag: "Tendencia: tipografía gruesa retro",
    why: "Sheday en Fraunces negra con terminaciones suaves: cálida, cercana y con personalidad, como los wordmarks retro de los 70 que están de vuelta. Ideal si quieres que se sienta amigable y de pueblo, no de lujo.",
    rows: [
      [tile(img("5-retro/sheday-retro.svg", 'height="70"'), "Rosa"), tile(img("5-retro/sheday-retro-ciruela.svg", 'height="70"'), "Ciruela"), tile(img("5-retro/sheday-retro-sobre-rosa.svg", 'height="70"'), "Sobre rosa", "pink")],
      [tile(img("5-retro/sheday-retro-icono.svg", 'width="120"'), "Ícono"), favicons("5-retro/sheday-retro-icono.svg"), tab("5-retro/sheday-retro-icono.svg")],
      [header("5-retro/sheday-retro.svg", 34)],
    ],
  },
  {
    n: 6, name: "Ancha", tag: "Contra-tendencia: sans extra-ancha",
    why: "SHEDAY en sans extra-ancha y gruesa: moderna, urbana y muy legible. Es el contrapunto a la serifa. El avatar SHE / DAY apilado funciona como foto de perfil.",
    rows: [
      [tile(img("6-ancha/sheday-ancha.svg", 'height="44"'), "Ciruela"), tile(img("6-ancha/sheday-ancha-rosa.svg", 'height="44"'), "Rosa"), tile(img("6-ancha/sheday-ancha-sobre-rosa.svg", 'height="44"'), "Sobre rosa", "pink")],
      [tile(img("6-ancha/sheday-ancha-avatar.svg", 'width="120" style="border-radius:50%"'), "Avatar de redes"), tile(img("6-ancha/sheday-ancha-icono.svg", 'width="120"'), "Ícono"), favicons("6-ancha/sheday-ancha-icono.svg")],
      [header("6-ancha/sheday-ancha.svg", 20)],
    ],
  },
  {
    n: 7, name: "Monograma S+D", tag: "Tendencia: monograma compañero",
    why: "She + day como iniciales entrelazadas: una D recta y una S cursiva. Pensado para etiquetas cosidas, bordados, sellos de lacre o el ícono de la app, acompañando a cualquiera de los wordmarks.",
    rows: [[tile(img("7-monograma-sd/sheday-sd.svg", 'width="120"'), "Rosa"), tile(img("7-monograma-sd/sheday-sd-sobre-rosa.svg", 'width="120"'), "Sobre rosa"), tile(img("7-monograma-sd/sheday-sd-ciruela.svg", 'width="120"'), "Ciruela"), favicons("7-monograma-sd/sheday-sd-sobre-rosa.svg")]],
  },
];

const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sheday · Logos</title>
<style>
  body { margin: 0; font-family: system-ui, sans-serif; color: #2b1226; background: #fff; }
  main { max-width: 1100px; margin: 0 auto; padding: 24px 16px 64px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  h2 { font-size: 18px; margin: 44px 0 2px; }
  .trend { display: inline-block; font-size: 12px; font-weight: 600; color: #9e0056; background: #ffe3f1; border-radius: 999px; padding: 2px 10px; margin-bottom: 6px; }
  p { margin: 0 0 14px; color: #6b5763; max-width: 70ch; line-height: 1.5; }
  .row { display: flex; flex-wrap: wrap; gap: 14px; align-items: center; margin-bottom: 14px; }
  .tile { border: 1px solid #ebdde4; border-radius: 12px; padding: 18px; display: flex; flex-direction: column; gap: 8px; align-items: center; max-width: 100%; }
  .tile img { max-width: 100%; height: auto; }
  .tile small { color: #6b5763; font-size: 12px; }
  .pink { background: #e4007c; border-color: #e4007c; } .pink small { color: #fff; }
  .ink { background: #2b1226; border-color: #2b1226; } .ink small { color: #fff; }
  .header { width: 375px; max-width: 100%; border: 1px solid #ebdde4; border-radius: 12px; overflow: hidden; }
  .header .bar { height: 56px; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; border-bottom: 1px solid #ebdde4; }
  .header .bar img { width: auto; }
  .cart { font-size: 13px; color: #6b5763; }
  .header .band { background: #e4007c; height: 56px; }
  .tab { display: flex; align-items: center; gap: 8px; background: #f1edf0; border-radius: 10px 10px 0 0; padding: 8px 12px; width: 220px; font-size: 13px; }
  .tab img { width: 16px; }
</style>
</head>
<body>
<main>
  <h1>Sheday: propuestas de logo</h1>
  <p>Ocho conceptos con las letras convertidas a trazos. El 8 es la combinación que pediste. Cada uno se muestra en sus versiones de color, como ícono, como favicon de 32 y 16 px y dentro del encabezado del sitio en celular.</p>
${concepts.map((c) => `  <h2>${c.n}. ${c.name}</h2>
  <span class="trend">${c.tag}</span>
  <p>${c.why}</p>
${c.rows.map((r) => `  <div class="row">${r.join("")}</div>`).join("\n")}`).join("\n")}
</main>
</body>
</html>
`;
fs.writeFileSync(path.join(D, "preview.html"), html);
console.log(`preview.html (${(html.length / 1024).toFixed(0)} KB)`);
