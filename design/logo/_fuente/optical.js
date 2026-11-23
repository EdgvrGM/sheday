// Espaciado óptico: iguala el área blanca entre contornos de letras vecinas.
// Para cada glifo se calcula, en muchas alturas, el borde izquierdo y derecho de la tinta;
// el hueco de un par es el promedio (con tope) de la distancia entre esos bordes.

/** Convierte el path de fontkit en polígonos (curvas aproximadas con segmentos). */
function polygons(path, steps = 12) {
  const polys = [];
  let cur = null, px = 0, py = 0;
  for (const c of path.commands) {
    const a = c.args;
    if (c.command === "moveTo") { cur = [[a[0], a[1]]]; polys.push(cur); px = a[0]; py = a[1]; }
    else if (c.command === "lineTo") { cur.push([a[0], a[1]]); px = a[0]; py = a[1]; }
    else if (c.command === "quadraticCurveTo") {
      for (let i = 1; i <= steps; i++) {
        const t = i / steps, u = 1 - t;
        cur.push([u * u * px + 2 * u * t * a[0] + t * t * a[2], u * u * py + 2 * u * t * a[1] + t * t * a[3]]);
      }
      px = a[2]; py = a[3];
    } else if (c.command === "bezierCurveTo") {
      for (let i = 1; i <= steps; i++) {
        const t = i / steps, u = 1 - t;
        cur.push([
          u ** 3 * px + 3 * u * u * t * a[0] + 3 * u * t * t * a[2] + t ** 3 * a[4],
          u ** 3 * py + 3 * u * u * t * a[1] + 3 * u * t * t * a[3] + t ** 3 * a[5],
        ]);
      }
      px = a[4]; py = a[5];
    }
  }
  return polys;
}

/** Bordes izquierdo/derecho de la tinta a la altura y (unidades de fuente), o null. */
function edgesAt(polys, y) {
  let min = Infinity, max = -Infinity;
  for (const poly of polys) {
    for (let i = 0; i < poly.length; i++) {
      const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % poly.length];
      if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) {
        const x = x1 + ((y - y1) / (y2 - y1)) * (x2 - x1);
        if (x < min) min = x;
        if (x > max) max = x;
      }
    }
  }
  return isFinite(min) ? { min, max } : null;
}

/**
 * Calcula el kerning extra (unidades de fuente) por par para que cada par tenga
 * el mismo hueco óptico. `target` = hueco deseado; `cap` = tope por altura (evita
 * que una A o una Y muy abiertas cuenten demasiado), en unidades de fuente.
 */
function opticalKerning(font, text, { tracking, target, cap, samples = 60 }) {
  const run = font.layout(text);
  const capHeight = font.capHeight || 1400;
  const glyphs = run.glyphs.map((g, i) => ({ g, adv: run.positions[i].xAdvance, polys: polygons(g.path) }));
  const result = [];
  for (let i = 0; i < glyphs.length - 1; i++) {
    const a = glyphs[i], b = glyphs[i + 1];
    let sum = 0, n = 0;
    for (let k = 0; k < samples; k++) {
      const y = (capHeight * (k + 0.5)) / samples;
      const ea = edgesAt(a.polys, y), eb = edgesAt(b.polys, y);
      if (!ea || !eb) continue;
      const gap = a.adv + tracking - ea.max + eb.min; // distancia entre la tinta de A y la de B
      sum += Math.min(gap, cap);
      n++;
    }
    const avg = n ? sum / n : target;
    result.push({ pair: text[i] + text[i + 1], avg, kern: target - avg });
  }
  return result;
}

module.exports = { opticalKerning };
