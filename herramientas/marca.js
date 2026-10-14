/* Prepara los logotipos de OMA para la web a partir del kit del propietario.

     node marca.js <carpeta-del-kit>

   NO redibuja nada: solo quita el fondo, recorta y cambia de tamaño.
     02_Logo_Negro_Transparencia_Visual.png  -> versión para fondos claros
     04_Logo_Dorado_Fondo_Negro.png          -> versión para fondos oscuros
   La referencia aprobada (01) es una foto de baja resolución y no da para
   pantalla; el vector definitivo sigue pendiente de aprobación. */
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const KIT = path.resolve(process.argv[2] || path.join(__dirname, "fuentes", "kit"));
const SAL = path.join(__dirname, "..", "marca");
const ICO = path.join(__dirname, "..", "icons");
fs.mkdirSync(SAL, { recursive: true });

const MARFIL = { r: 0xF7, g: 0xF3, b: 0xED };
const NEGRO = { r: 0x19, g: 0x19, b: 0x19 };

/* Si el archivo ya trae transparencia real (el 02 la trae) se respeta tal cual. */
async function leer(archivo) {
  const meta = await sharp(archivo).metadata();
  let transparente = false;
  if (meta.hasAlpha) { const st = await sharp(archivo).stats(); transparente = st.channels[3].min < 250; }
  const img = transparente ? sharp(archivo) : sharp(archivo).removeAlpha().ensureAlpha();
  return { d: await img.raw().toBuffer(), w: meta.width, h: meta.height, transparente };
}

/* Quita un fondo liso (blanco o negro) y deja el filo sin halo. */
function sinFondo(img, fondo) {
  if (img.transparente) return img;
  const { d, w, h } = img, o = Buffer.alloc(d.length);
  for (let p = 0; p < d.length; p += 4) {
    const r = d[p], g = d[p + 1], b = d[p + 2];
    let a, R = r, G = g, B = b;
    if (fondo === "blanco") {
      const m = Math.min(r, g, b);
      a = m >= 246 ? 0 : m <= 205 ? 1 : (246 - m) / 41;
      if (a > 0 && a < 1) { R = (r - 255 * (1 - a)) / a; G = (g - 255 * (1 - a)) / a; B = (b - 255 * (1 - a)) / a; }
    } else {
      const m = Math.max(r, g, b);
      a = m <= 14 ? 0 : m >= 80 ? 1 : (m - 14) / 66;
      if (a > 0 && a < 1) { R = r / a; G = g / a; B = b / a; }
    }
    o[p] = Math.max(0, Math.min(255, R)); o[p + 1] = Math.max(0, Math.min(255, G));
    o[p + 2] = Math.max(0, Math.min(255, B)); o[p + 3] = Math.round(a * 255);
  }
  return { d: o, w, h };
}

/* Franjas horizontales con tinta: [OMA, SPORTWEAR, filete]. */
function franjas(img) {
  const { d, w, h } = img, filas = [];
  for (let y = 0; y < h; y++) { let n = 0; for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 40) n++; filas.push(n > w * 0.004); }
  const fr = []; let ini = -1;
  for (let y = 0; y <= h; y++) {
    if (y < h && filas[y]) { if (ini < 0) ini = y; }
    else if (ini >= 0) { if (y - ini > 3) fr.push([ini, y - 1]); ini = -1; }
  }
  return fr;
}
function cajaX(img, y0, y1) {
  const { d, w } = img; let x0 = w, x1 = -1;
  for (let y = y0; y <= y1; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; }
  return [x0, x1];
}
const crudo = img => sharp(img.d, { raw: { width: img.w, height: img.h, channels: 4 } });

async function exporta(img, nombre) {
  const fr = franjas(img);
  if (fr.length < 2) throw new Error(nombre + ": no encontré las franjas del logo (" + fr.length + ")");
  const m = Math.round(img.h * 0.012);
  /* lockup completo: de la primera franja a la última */
  const [X0, X1] = cajaX(img, fr[0][0], fr[fr.length - 1][1]);
  const comp = { left: Math.max(0, X0 - m), top: Math.max(0, fr[0][0] - m) };
  comp.width = Math.min(img.w, X1 + m) - comp.left; comp.height = Math.min(img.h, fr[fr.length - 1][1] + m) - comp.top;
  await crudo(img).extract(comp).resize({ width: 1100 }).webp({ quality: 92, alphaQuality: 100, effort: 6 }).toFile(path.join(SAL, "oma-logo-" + nombre + ".webp"));
  await crudo(img).extract(comp).resize({ width: 1100 }).png({ compressionLevel: 9 }).toFile(path.join(SAL, "oma-logo-" + nombre + ".png"));
  /* compacto: solo la palabra OMA (primera franja), tal cual del maestro */
  const [x0, x1] = cajaX(img, fr[0][0], fr[0][1]);
  const sol = { left: Math.max(0, x0 - m), top: Math.max(0, fr[0][0] - m) };
  sol.width = Math.min(img.w, x1 + m) - sol.left; sol.height = Math.min(img.h, fr[0][1] + m) - sol.top;
  await crudo(img).extract(sol).resize({ height: 220 }).webp({ quality: 92, alphaQuality: 100, effort: 6 }).toFile(path.join(SAL, "oma-" + nombre + ".webp"));
  const med = await sharp(path.join(SAL, "oma-" + nombre + ".webp")).metadata();
  const full = await sharp(path.join(SAL, "oma-logo-" + nombre + ".webp")).metadata();
  console.log(nombre.padEnd(7), "franjas:", fr.length, "| lockup", full.width + "x" + full.height, "| compacto", med.width + "x" + med.height);
  return { comp, sol };
}

(async () => {
  const claro = sinFondo(await leer(path.join(KIT, "02_Logo_Negro_Transparencia_Visual.png")), "blanco");
  const oscuro = sinFondo(await leer(path.join(KIT, "04_Logo_Dorado_Fondo_Negro.png")), "negro");
  const rc = await exporta(claro, "claro");
  await exporta(oscuro, "oscuro");

  /* Iconos de la app: la palabra OMA sobre marfil, con aire para el recorte del sistema. */
  const palabra = await crudo(claro).extract(rc.sol).png().toBuffer();
  for (const [archivo, lado] of [["icon-512.png", 512], ["icon-192.png", 192], ["apple-touch-icon.png", 180]]) {
    const dentro = await sharp(palabra).resize({ width: Math.round(lado * 0.64) }).toBuffer();
    await sharp({ create: { width: lado, height: lado, channels: 3, background: MARFIL } })
      .composite([{ input: dentro, gravity: "centre" }]).png({ compressionLevel: 9 }).toFile(path.join(ICO, archivo));
  }
  const fav = await sharp(palabra).resize({ width: 54 }).toBuffer();
  await sharp({ create: { width: 64, height: 64, channels: 3, background: MARFIL } })
    .composite([{ input: fav, gravity: "centre" }]).png().toFile(path.join(ICO, "favicon.png"));

  /* Imagen para compartir (WhatsApp, Facebook, Instagram): 1200x630. */
  const lockup = await crudo(claro).extract(rc.comp).resize({ width: 640 }).png().toBuffer();
  await sharp({ create: { width: 1200, height: 630, channels: 3, background: MARFIL } })
    .composite([{ input: lockup, gravity: "centre" }]).jpeg({ quality: 90, mozjpeg: true }).toFile(path.join(SAL, "oma-compartir.jpg"));

  /* Vista de control sobre los dos fondos. */
  const a = await sharp(path.join(SAL, "oma-logo-claro.png")).resize({ width: 520 }).toBuffer();
  const b = await sharp(path.join(SAL, "oma-logo-oscuro.png")).resize({ width: 520 }).toBuffer();
  const c = await sharp(path.join(SAL, "oma-claro.webp")).resize({ height: 60 }).png().toBuffer();
  const e = await sharp(path.join(SAL, "oma-oscuro.webp")).resize({ height: 60 }).png().toBuffer();
  await sharp({ create: { width: 1240, height: 420, channels: 3, background: MARFIL } }).composite([
    { input: { create: { width: 620, height: 420, channels: 3, background: NEGRO } }, left: 620, top: 0 },
    { input: a, left: 50, top: 30 }, { input: b, left: 670, top: 30 },
    { input: c, left: 50, top: 330 }, { input: e, left: 670, top: 330 }
  ]).jpeg({ quality: 92 }).toFile(path.join(__dirname, "fuentes", "_marca.jpg"));
  for (const f of fs.readdirSync(SAL)) console.log("  marca/" + f.padEnd(26), (fs.statSync(path.join(SAL, f)).size / 1024).toFixed(0) + " KB");
})().catch(e => { console.error("FALLA:", e.message); process.exit(1); });
