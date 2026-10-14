/* Convierte una imagen de una prenda AZUL COBALTO en su «mapa de sombras»:
   silueta en el alfa y relieve en grises (ver tinte.js).

   El azul solo sirve para separar la prenda de lo que no lo es (maniquí
   blanco, fondo gris o blanco) sin tener que recortar a mano. */
const sharp = require("sharp");
const { TOPE } = require("../tinte.js");

const suave = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

async function leeRGBA(archivo) {
  const img = sharp(archivo).ensureAlpha();
  const { width, height } = await img.metadata();
  return { d: await img.raw().toBuffer(), w: width, h: height };
}

/* Devuelve { alfa: Float32Array 0..1, sombra: Float32Array (1 = luz plena) } */
function mapaDeSombras(src, opciones = {}) {
  const { w, h, d } = src, n = w * h;
  const huecoMax = opciones.huecoMax ?? 6000;
  const alfa = new Float32Array(n), lum = new Float32Array(n), rel = new Float32Array(n);

  for (let i = 0, p = 0; i < n; i++, p += 4) {
    const r = d[p], g = d[p + 1], b = d[p + 2];
    /* «Qué tan azul» relativo a su propio brillo: una sombra profunda de
       la prenda sigue siendo azul; el reflejo azulado que la prenda echa
       sobre el maniquí o el fondo apenas lo es. */
    rel[i] = b > 22 ? (b - Math.max(r, g)) / b : 0;
    alfa[i] = rel[i] > 0.30 ? 1 : 0;                 // prenda sólida
    lum[i] = 0.30 * r + 0.40 * g + 0.30 * b;
  }

  /* --- Huecos pequeños encerrados por la prenda (jaladera del cierre,
         brillos y costuras desaturadas): son parte de la prenda. --- */
  const fuera = new Uint8Array(n);                 // 1 = alcanzable desde el borde sin cruzar prenda
  const pila = new Int32Array(n);
  let tope = 0;
  const empuja = i => { if (!fuera[i] && alfa[i] < 0.5) { fuera[i] = 1; pila[tope++] = i; } };
  for (let x = 0; x < w; x++) { empuja(x); empuja((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { empuja(y * w); empuja(y * w + w - 1); }
  while (tope) {
    const i = pila[--tope], x = i % w;
    if (x > 0) empuja(i - 1);
    if (x < w - 1) empuja(i + 1);
    if (i >= w) empuja(i - w);
    if (i < n - w) empuja(i + w);
  }
  const visto = new Uint8Array(n);
  let rellenos = 0;
  for (let s = 0; s < n; s++) {
    if (alfa[s] >= 0.5 || fuera[s] || visto[s]) continue;
    const comp = [];
    tope = 0; pila[tope++] = s; visto[s] = 1;
    while (tope) {
      const i = pila[--tope], x = i % w; comp.push(i);
      const v = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i >= w ? i - w : -1, i < n - w ? i + w : -1];
      for (const j of v) if (j >= 0 && !visto[j] && alfa[j] < 0.5 && !fuera[j]) { visto[j] = 1; pila[tope++] = j; }
    }
    if (comp.length <= huecoMax) { for (const i of comp) alfa[i] = 1; rellenos++; }
  }

  /* --- Islas: manchitas azuladas sueltas (reflejos) que no son la prenda.
         Se conserva solo lo que mide al menos 2 % de la pieza más grande. --- */
  const etiqueta = new Int32Array(n); const areas = [0];
  for (let s0 = 0; s0 < n; s0++) {
    if (alfa[s0] !== 1 || etiqueta[s0]) continue;
    const id = areas.length; let area = 0;
    tope = 0; pila[tope++] = s0; etiqueta[s0] = id;
    while (tope) {
      const i = pila[--tope], x = i % w; area++;
      const v = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i >= w ? i - w : -1, i < n - w ? i + w : -1];
      for (const j of v) if (j >= 0 && alfa[j] === 1 && !etiqueta[j]) { etiqueta[j] = id; pila[tope++] = j; }
    }
    areas.push(area);
  }
  const mayor = Math.max(...areas);
  let islas = 0;
  for (let i = 0; i < n; i++) if (etiqueta[i] && areas[etiqueta[i]] < mayor * 0.02) { alfa[i] = 0; }
  for (let k = 1; k < areas.length; k++) if (areas[k] < mayor * 0.02) islas++;

  /* --- Filo suave: solo a 2 px de la prenda sólida. Más lejos, lo azulado
         es reflejo y no cuenta (si contara, saldría un velo del color de la
         prenda entre el brazo y el torso). --- */
  const cerca = new Uint8Array(n);
  for (let y = 2; y < h - 2; y++) for (let x = 2; x < w - 2; x++) {
    const i = y * w + x;
    if (alfa[i] !== 1) continue;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) cerca[i + dy * w + dx] = 1;
  }
  for (let i = 0; i < n; i++) {
    if (alfa[i] === 1) continue;
    alfa[i] = cerca[i] ? Math.min(1, Math.max(0, (rel[i] - 0.05) / 0.30)) : 0;
  }

  /* --- Luz de referencia: el percentil 88 del interior es «luz plena». --- */
  const hist = new Uint32Array(256); let dentro = 0;
  for (let i = 0; i < n; i++) if (alfa[i] > 0.97) { hist[Math.min(255, Math.round(lum[i]))]++; dentro++; }
  let acum = 0, ref = 200;
  for (let v = 0; v < 256; v++) { acum += hist[v]; if (acum >= dentro * 0.88) { ref = v; break; } }

  const sombra = new Float32Array(n);
  const firme = new Uint8Array(n);
  for (let i = 0; i < n; i++) { sombra[i] = Math.min(TOPE, lum[i] / ref); firme[i] = alfa[i] > 0.97 ? 1 : 0; }

  /* --- En el borde el píxel es mezcla de prenda y fondo: su brillo no es
         de la prenda. Se le hereda el del interior vecino (4 pasadas), para
         que al teñir de oscuro no quede un filo claro. --- */
  for (let pasada = 0; pasada < 5; pasada++) {
    const nuevos = [];
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (firme[i] || alfa[i] <= 0) continue;
      let s = 0, c = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const j = i + dy * w + dx;
        if (firme[j]) { s += sombra[j]; c++; }
      }
      if (c) nuevos.push(i, s / c);
    }
    for (let k = 0; k < nuevos.length; k += 2) { sombra[nuevos[k]] = nuevos[k + 1]; firme[nuevos[k]] = 1; }
  }

  return { alfa, sombra, ref, rellenos, islas, w, h };
}

/* Empaqueta el mapa como RGBA: gris = sombra/TOPE, alfa = silueta. */
function aRGBA(mapa) {
  const n = mapa.w * mapa.h, o = Buffer.alloc(n * 4);
  for (let i = 0, p = 0; i < n; i++, p += 4) {
    const a = Math.round(mapa.alfa[i] * 255);
    const v = a ? Math.round(Math.min(1, mapa.sombra[i] / TOPE) * 255) : 0;
    o[p] = o[p + 1] = o[p + 2] = v; o[p + 3] = a;
  }
  return o;
}

function caja(rgba, w, h, umbral = 10) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (rgba[(y * w + x) * 4 + 3] > umbral) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return { x0, y0, x1, y1 };
}

module.exports = { leeRGBA, mapaDeSombras, aRGBA, caja };
