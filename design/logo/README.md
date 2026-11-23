# Logo de Sheday

Abre `preview.html` en el navegador para ver todos los conceptos en tamaño real, como ícono de app, como favicon de 32 y 16 px y dentro del encabezado del sitio.

Todos los SVG tienen las **letras convertidas a trazos**: se ven igual en cualquier equipo, imprenta o programa, aunque no tengan la fuente instalada.

## Conceptos
| Carpeta | Concepto | Para qué |
|---|---|---|
| `1-firma/` | "Sheday" en Bodoni Moda cursiva y una "S" sobre rosa mexicano | Encabezado del sitio, favicon, ícono de app, redes |
| `2-etiqueta/` | La "S" dentro de una etiqueta colgante de ropa, con el nombre | Encabezado o perfil de redes, si quieres un símbolo además del nombre |
| `3-sello/` | Emblema circular "SHEDAY · ROPA PARA MUJER" | Estampas para bolsas, empaques y etiquetas impresas |
| `4-maison/` | "SHEDAY" en Bodoni recta, mayúsculas espaciadas; ícono "S" sobre ciruela | Tendencia 2025–2026: casas de moda que regresan a la serifa |
| `5-retro/` | "Sheday" en Fraunces negra suave (estilo 70s); ícono rosa sobre rosa claro | Tendencia: tipografía gruesa retro, cálida y cercana |
| `6-ancha/` | "SHEDAY" en Archivo extra-ancha; avatar "SHE / DAY" apilado | Contra-tendencia: sans extra-anchas, moderna y urbana |
| `7-monograma-sd/` | D recta y S cursiva entrelazadas | Monograma compañero para etiquetas, bordados e ícono de app |
| `8-etiqueta-sd/` | **Combinación elegida:** etiqueta colgante con el monograma S+D y el nombre SHEDAY de Maison con espaciado óptico | Logo principal (horizontal y vertical), ícono y app |

**Espaciado óptico:** en SHEDAY, la A y la Y tienen lados diagonales que dejan más aire visible que las letras rectas. `_fuente/optical.js` mide el área blanca entre los contornos de cada par y ajusta el kerning para igualarla. Como el ojo ve las diagonales aún más abiertas que su área, se aplica 1.6 veces ese ajuste (nivel B), y además la A va 3 px a la izquierda. Resultado a 110 px: D-A −21.8 px y A-Y −20.5 px. Se usa en los conceptos 4 y 8 (constante `SHEDAY_KERN`). `espaciado.html` compara todos los niveles; se genera con `_fuente/spacing-compare.js`.

### Referencias de tendencias consultadas (nov 2026)
- [Creative Bloq: tendencias de logo 2026](https://www.creativebloq.com/design/logos-icons/these-logo-design-trends-will-define-2026)
- [Shopify: tendencias de logo](https://www.shopify.com/blog/logo-trends)
- [Vistaprint: 10 tendencias de logo para 2026](https://www.vistaprint.com/hub/logo-design-trends)
- [Kittl: tendencias de logo 2026](https://www.kittl.com/blogs/logo-design-trends-2026-dsi/)
- [FashionNetwork: nueva identidad de Lacoste](https://us.fashionnetwork.com/news/Lacoste-unveils-new-visual-identity,1825573.html)
- [Fast Company: Lord & Taylor regresa a su logo cursivo](https://www.fastcompany.com/91254026/lord-and-taylor-cursive-logo-gen-z)
- [FashionUnited: Dior cambia su tipografía](https://fashionunited.com/news/business/diors-artistic-director-jonathan-anderson-changes-the-brands-font/2025092968453)

Fuentes usadas (todas con licencia SIL Open Font License): Bodoni Moda, Fraunces y Archivo.

## Colores
- Rosa mexicano `#C4006A` (logo sobre blanco) y `#E4007C` (fondos)
- Ciruela `#2B1226` (versión oscura)
- Blanco `#FFFFFF` (sobre rosa o ciruela)

## Uso correcto
- Deja alrededor del logo un espacio libre de al menos la altura de la "S".
- Tamaño mínimo del wordmark: 90 px de ancho en pantalla y 2.5 cm impreso. Por debajo de eso, usa el monograma.
- No estires, no rotes y no agregues sombras ni degradados.
- Sobre fotos o fondos con mucho detalle, usa la versión sobre rosa.

## Pasar a PNG
- **Inkscape (gratis):** `inkscape sheday-monograma.svg --export-type=png --export-width=1024`
- **En línea:** sube el SVG a un convertidor como cloudconvert.com y elige un ancho de 1024 px o más.

## Regenerar
`_fuente/build-logos.js` genera todos los SVG y `_fuente/build-preview.js` arma la hoja de revisión. Usan instancias estáticas de Bodoni Moda, Fraunces y Archivo creadas con fontTools:

```bash
cd _fuente
npm install fontkit@2
node build-logos.js .. && node build-preview.js ..
```

Bodoni Moda: © The Bodoni Moda Project Authors, SIL Open Font License 1.1.
