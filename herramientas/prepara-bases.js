/* Convierte las imágenes fuente (prendas en azul cobalto) en los mapas de
   sombras que usa la tienda. Se corre solo cuando cambia una imagen fuente.

     node prepara-bases.js

   Entradas (no van al repositorio, pesan 4-5 MB cada una):
     fuentes/planas/<prenda>.png            prenda sola, fondo blanco
     fuentes/maniqui/base-a.png             maniquí blanco
     fuentes/maniqui/base-recorte.png       el mismo, con el fondo quitado
     fuentes/maniqui/m-<prenda>.png         maniquí con la prenda puesta

   Salidas (sí van al repositorio):
     ../prendas/base/<prenda>.webp          mapa de sombras de la prenda sola
     ../maniqui/maniqui.webp                maniquí recortado
     ../maniqui/capa-<prenda>.webp          mapa de sombras de la prenda puesta
     ../maniqui/maniqui.json                medidas y dónde termina la jacket */
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");
const { leeRGBA, mapaDeSombras, aRGBA, caja } = require("./extrae");

const F = path.join(__dirname, "fuentes");
const RAIZ = path.join(__dirname, "..");
const LADO_PLANA = 1200;
const ALTO_MANIQUI = 1920;                           // Full HD en vertical

/* nombre del archivo fuente -> id de la prenda (slug del producto) */
const PLANAS = ["jacket", "playera", "legging-campana"];
const PUESTAS = { jacket: "m-jacket.png", playera: "m-playera.png", "legging-campana": "m-campana.png" };

async function planas() {
  fs.mkdirSync(path.join(RAIZ, "prendas", "base"), { recursive: true });
  for (const id of PLANAS) {
    const src = await leeRGBA(path.join(F, "planas", id + ".png"));
    const mapa = mapaDeSombras(src);
    const rgba = aRGBA(mapa);
    const b = caja(rgba, src.w, src.h);
    const m = Math.round(Math.max(src.w, src.h) * 0.02);
    const reg = { left: Math.max(0, b.x0 - m), top: Math.max(0, b.y0 - m) };
    reg.width = Math.min(src.w, b.x1 + m) - reg.left; reg.height = Math.min(src.h, b.y1 + m) - reg.top;
    const lado = Math.max(reg.width, reg.height);
    const claro = { r: 0, g: 0, b: 0, alpha: 0 };
    const cuadro = await sharp(rgba, { raw: { width: src.w, height: src.h, channels: 4 } })
      .extract(reg).resize({ width: lado, height: lado, fit: "contain", background: claro }).png().toBuffer();
    const destino = path.join(RAIZ, "prendas", "base", id + ".webp");
    await sharp(cuadro).resize(LADO_PLANA, LADO_PLANA, { kernel: "lanczos3" })
      .webp({ quality: 90, alphaQuality: 96, effort: 6 }).toFile(destino);
    console.log("plana   " + id.padEnd(16), reg.width + "x" + reg.height, "->", (fs.statSync(destino).size / 1024).toFixed(0) + " KB",
      "| huecos", mapa.rellenos, "| islas", mapa.islas);
  }
}

async function maniqui() {
  const SAL = path.join(RAIZ, "maniqui");
  fs.mkdirSync(SAL, { recursive: true });
  const foto = await leeRGBA(path.join(F, "maniqui", "base-a.png"));
  const rec = await leeRGBA(path.join(F, "maniqui", "base-recorte.png"));
  if (rec.w !== foto.w || rec.h !== foto.h) throw new Error("el recorte no mide lo mismo que la foto");
  const { w, h } = foto, n = w * h;

  /* color de la foto + silueta del recorte, sin el gris del fondo en el filo */
  const man = Buffer.alloc(n * 4);
  for (let y = 0; y < h; y++) {
    const f = (y * w + 24) * 4, fr = foto.d[f], fg = foto.d[f + 1], fb = foto.d[f + 2];
    for (let x = 0; x < w; x++) {
      const p = (y * w + x) * 4, a = rec.d[p + 3] / 255;
      let r = foto.d[p], g = foto.d[p + 1], b = foto.d[p + 2];
      if (a > 0.03 && a < 0.985) { r = (r - fr * (1 - a)) / a; g = (g - fg * (1 - a)) / a; b = (b - fb * (1 - a)) / a; }
      man[p] = Math.max(0, Math.min(255, r)); man[p + 1] = Math.max(0, Math.min(255, g));
      man[p + 2] = Math.max(0, Math.min(255, b)); man[p + 3] = rec.d[p + 3];
    }
  }

  const capas = {};
  for (const [id, archivo] of Object.entries(PUESTAS)) {
    const mapa = mapaDeSombras(await leeRGBA(path.join(F, "maniqui", archivo)));
    capas[id] = aRGBA(mapa);
  }

  /* encuadre común: todo lo que no sea transparente, más un margen */
  let b = caja(man, w, h);
  for (const c of Object.values(capas)) {
    const k = caja(c, w, h);
    b = { x0: Math.min(b.x0, k.x0), y0: Math.min(b.y0, k.y0), x1: Math.max(b.x1, k.x1), y1: Math.max(b.y1, k.y1) };
  }
  const mx = Math.round(w * 0.05), my = Math.round(h * 0.022);
  const reg = { left: Math.max(0, b.x0 - mx), top: Math.max(0, b.y0 - my) };
  reg.width = Math.min(w, b.x1 + mx) - reg.left; reg.height = Math.min(h, b.y1 + my) - reg.top;
  const ANCHO = Math.round(reg.width * ALTO_MANIQUI / reg.height / 2) * 2;
  const escala = buf => sharp(buf, { raw: { width: w, height: h, channels: 4 } })
    .extract(reg).resize(ANCHO, ALTO_MANIQUI, { kernel: "lanczos3" });

  await escala(man).webp({ quality: 90, alphaQuality: 95, effort: 6 }).toFile(path.join(SAL, "maniqui.webp"));
  let bajo = 0;
  for (const [id, c] of Object.entries(capas)) {
    await escala(c).webp({ quality: 88, alphaQuality: 95, effort: 6 }).toFile(path.join(SAL, "capa-" + id + ".webp"));
    if (id === "jacket") {
      /* dónde termina la jacket sobre el torso: debajo de ahí asoma la playera */
      const j = await escala(c).raw().toBuffer();
      for (let x = Math.round(ANCHO * 0.42); x < Math.round(ANCHO * 0.58); x++)
        for (let y = ALTO_MANIQUI - 1; y > 0; y--) if (j[(y * ANCHO + x) * 4 + 3] > 128) { if (y > bajo) bajo = y; break; }
    }
  }
  fs.writeFileSync(path.join(SAL, "maniqui.json"), JSON.stringify({
    ancho: ANCHO, alto: ALTO_MANIQUI, capas: Object.keys(capas), bajoJacket: +(bajo / ALTO_MANIQUI).toFixed(4)
  }, null, 1) + "\n");
  for (const f of fs.readdirSync(SAL)) console.log("maniquí " + f.padEnd(28), (fs.statSync(path.join(SAL, f)).size / 1024).toFixed(0) + " KB");
  console.log("        ", ANCHO + "x" + ALTO_MANIQUI, "| la jacket termina al", (bajo / ALTO_MANIQUI * 100).toFixed(1) + "% del alto");
}

(async () => { await planas(); await maniqui(); })().catch(e => { console.error("FALLA:", e.message); process.exit(1); });
