/* Genera la imagen de catálogo de cada color que haya en el inventario.

     node colorea.js            crea las que falten
     node colorea.js --todo     las rehace todas

   Parte de los mapas de sombras de prendas/base/ y del tono de cada color en
   data/catalogo.json, con la misma fórmula que usa la tienda (tinte.js).
   Por eso todas las prendas de un modelo tienen exactamente la misma forma y
   solo cambia el color: son ilustraciones 3D, no fotografías. */
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");
const { tine } = require("../tinte.js");
const { slug } = require("../scripts/claves.js");

const RAIZ = path.join(__dirname, "..");
const LADO = 1000;
const todo = process.argv.includes("--todo");
const cat = JSON.parse(fs.readFileSync(path.join(RAIZ, "data", "catalogo.json"), "utf8"));

(async () => {
  const modelos = new Map();
  for (const p of cat.inventario) {
    const id = slug(p.nombre + " " + p.color);
    if (!modelos.has(id)) modelos.set(id, { id, base: slug(p.nombre), hex: p.hex, nombre: p.nombre, color: p.color });
  }

  const bases = {};
  let hechas = 0, peso = 0, pesoOg = 0;
  const faltanBase = new Set();
  for (const m of modelos.values()) {
    const destino = path.join(RAIZ, "prendas", m.id + ".webp");
    if (!bases[m.base]) {
      const archivo = path.join(RAIZ, "prendas", "base", m.base + ".webp");
      if (!fs.existsSync(archivo)) { faltanBase.add(m.nombre); continue; }
      bases[m.base] = await sharp(archivo).resize(LADO, LADO).ensureAlpha().raw().toBuffer();
    }
    if (todo || !fs.existsSync(destino)) {
      const rgba = tine(bases[m.base], m.hex, Buffer.alloc(bases[m.base].length));
      await sharp(rgba, { raw: { width: LADO, height: LADO, channels: 4 } })
        .webp({ quality: 84, alphaQuality: 92, effort: 6 }).toFile(destino);
      hechas++;
    }
    peso += fs.statSync(destino).size;
    /* Versión para compartir (WhatsApp, Facebook, Google): JPG sobre el beige
       de la marca, porque esas vistas previas no aceptan transparencia. */
    const og = path.join(RAIZ, "prendas", "og", m.id + ".jpg");
    if (todo || !fs.existsSync(og)) {
      fs.mkdirSync(path.dirname(og), { recursive: true });
      const prenda = await sharp(destino).resize(720, 720).png().toBuffer();
      await sharp({ create: { width: 900, height: 900, channels: 3, background: "#F0E9DE" } })
        .composite([{ input: prenda, gravity: "centre" }]).jpeg({ quality: 80, mozjpeg: true }).toFile(og);
    }
    pesoOg += fs.statSync(og).size;
  }

  /* Imágenes de colores que ya no están en el inventario. */
  const vivos = new Set([...modelos.keys()].map(id => id + ".webp"));
  const sobran = fs.readdirSync(path.join(RAIZ, "prendas")).filter(f => f.endsWith(".webp") && !vivos.has(f));
  for (const f of sobran) fs.unlinkSync(path.join(RAIZ, "prendas", f));
  const dirOg = path.join(RAIZ, "prendas", "og");
  if (fs.existsSync(dirOg)) for (const f of fs.readdirSync(dirOg)) if (!modelos.has(f.replace(".jpg", ""))) fs.unlinkSync(path.join(dirOg, f));

  console.log(`${modelos.size} colores en el inventario | ${hechas} imágenes generadas | ${sobran.length} retiradas | ${(peso / 1024 / 1024).toFixed(2)} MB en total | para compartir: ${(pesoOg / 1024 / 1024).toFixed(2)} MB`);
  if (faltanBase.size) console.log("SIN IMAGEN BASE (se verán con su dibujo de respaldo): " + [...faltanBase].join(", "));
})().catch(e => { console.error("FALLA:", e.message); process.exit(1); });
