/* Genera lo que el navegador necesita del catálogo, desde data/catalogo.json:

     catalogo.js    INV, NUEVO y OFERTA (precio, color, talla y existencias)
     renders3d.js   qué imagen de catálogo tiene cada color

   Una sola fuente de verdad: el navegador y las funciones de pago leen
   exactamente los mismos precios y existencias. */
const fs = require("fs");
const path = require("path");
const { slug } = require("./claves.js");
const raiz = path.join(__dirname, "..");
const cat = JSON.parse(fs.readFileSync(path.join(raiz, "data/catalogo.json"), "utf8"));

fs.writeFileSync(path.join(raiz, "catalogo.js"),
`/* GENERADO AUTOMÁTICAMENTE desde data/catalogo.json — no editar a mano.
   El catálogo sale del inventario del punto de venta: scripts/importa-inventario.js */
const INV = ${JSON.stringify(cat.inventario)};
const NUEVO = ${JSON.stringify(cat.nuevo || [])};
const OFERTA = ${JSON.stringify(cat.oferta || {})};
`);

/* Imágenes: una por color (prendas/<id>.webp) y las prendas base con las que
   la tienda tiñe al vuelo un color que todavía no tenga la suya. */
const dir = path.join(raiz, "prendas");
const hay = fs.existsSync(dir) ? new Set(fs.readdirSync(dir)) : new Set();
const bases = fs.existsSync(path.join(dir, "base"))
  ? fs.readdirSync(path.join(dir, "base")).filter(f => f.endsWith(".webp")).map(f => f.replace(".webp", "")) : [];
const mapa = {}, sinImagen = [];
for (const p of cat.inventario) {
  const id = slug(p.nombre + " " + p.color);
  if (mapa[id] || sinImagen.includes(id)) continue;
  if (hay.has(id + ".webp")) mapa[id] = "/prendas/" + id + ".webp";
  else sinImagen.push(id);
}
fs.writeFileSync(path.join(raiz, "renders3d.js"),
`/* GENERADO AUTOMÁTICAMENTE — no editar a mano.
   Ilustraciones 3D de las prendas, con el tono medido de cada color.
   No son fotografías del producto y la tienda las describe así. */
window.RENDERS_3D=${JSON.stringify(mapa, null, 1)};
window.RENDER_BASES=${JSON.stringify(bases)};
`);

console.log("catalogo.js:", cat.inventario.length, "variantes |", Object.keys(mapa).length, "colores con imagen");
if (sinImagen.length) {
  const conBase = sinImagen.filter(id => bases.some(b => id.startsWith(b + "-")));
  console.log("  sin imagen propia:", sinImagen.join(", "));
  console.log("  " + conBase.length + " se teñirán al vuelo; corre `node herramientas/colorea.js` para generarlas.");
}
module.exports = { cat, mapa };
