/* Trae el inventario del sistema de punto de venta a la tienda.

   La mercancía real vive en ROMA Inventario (`roma-inventario/datos/`):
     mercancia-nueva.csv   producto, tipo, color, talla, costo, precio, stock
     apariencia.json       el tono medido de cada color

   De ahí sale data/catalogo.json, la única lista de productos de la tienda.
   El costo NO se copia: la tienda no lo necesita y es un archivo público.

     node scripts/importa-inventario.js [carpeta-de-datos]

   Cuando la tienda esté conectada en vivo a la base del punto de venta
   (ver CONEXION-INVENTARIO.md), este archivo queda como respaldo: precio y
   existencias se leen de la base en cada visita. */
const fs = require("fs");
const path = require("path");

const raiz = path.join(__dirname, "..");
const datos = path.resolve(process.argv[2] || path.join(raiz, "..", "roma-inventario", "datos"));
const { clave, slug } = require("./claves.js");

/* Cómo llama la tienda a cada tipo del punto de venta. */
const TIPOS = {
  chamarra:          { cat: "Jackets",  zona: "capa",   forma: "chamarra" },
  "blusa deportiva": { cat: "Playeras", zona: "arriba", forma: "playera" },
  legging:           { cat: "Leggings", zona: "abajo",  forma: "campana" }
};
const ORDEN_TALLAS = ["XS", "S", "M", "L", "XL", "XXL"];

function leeCsv(archivo) {
  const lineas = fs.readFileSync(archivo, "utf8").replace(/^﻿/, "").trim().split(/\r?\n/);
  const cab = lineas[0].split(",").map(s => s.trim());
  return lineas.slice(1).filter(l => l.trim()).map(l => {
    const c = l.split(","); const o = {};
    cab.forEach((k, i) => (o[k] = (c[i] || "").trim()));
    return o;
  });
}

const filas = leeCsv(path.join(datos, "mercancia-nueva.csv"));
const apariencia = JSON.parse(fs.readFileSync(path.join(datos, "apariencia.json"), "utf8"));

const inventario = [], avisos = [];
for (const f of filas) {
  const tipo = TIPOS[f.tipo.toLowerCase()];
  if (!tipo) { avisos.push(`tipo desconocido «${f.tipo}» en ${f.producto}`); continue; }
  const precio = Number(f.precio), stock = Number(f.stock);
  if (!(precio > 0)) { avisos.push(`${f.producto} ${f.color} ${f.talla} no tiene precio: no se publica`); continue; }
  const hex = (apariencia[f.producto] && apariencia[f.producto].colores[f.color]) || null;
  if (!hex) avisos.push(`sin tono medido para ${f.producto} · ${f.color}`);
  inventario.push({
    sku: clave(f.producto, f.color, f.talla),
    nombre: f.producto, cat: tipo.cat, zona: tipo.zona, forma: tipo.forma,
    color: f.color, hex: hex || "#8A8177", talla: f.talla.toUpperCase(),
    precio, stock: Number.isFinite(stock) ? Math.max(0, stock) : 0
  });
}
/* Las tallas en su orden natural, respetando el orden de colores de la hoja. */
const pos = new Map(); inventario.forEach(p => { const k = p.nombre + "|" + p.color; if (!pos.has(k)) pos.set(k, pos.size); });
inventario.sort((a, b) => pos.get(a.nombre + "|" + a.color) - pos.get(b.nombre + "|" + b.color)
  || ORDEN_TALLAS.indexOf(a.talla) - ORDEN_TALLAS.indexOf(b.talla));

const repetidos = inventario.map(p => p.sku).filter((s, i, a) => a.indexOf(s) !== i);
if (repetidos.length) throw new Error("claves repetidas: " + repetidos.join(", "));

const productos = [...new Set(inventario.map(p => p.nombre))];
const catalogo = {
  _fuente: "ROMA Inventario · datos/mercancia-nueva.csv. No editar a mano: corre scripts/importa-inventario.js",
  inventario,
  /* Toda la mercancía es de la colección que se lanza. */
  nuevo: productos,
  /* Sin precios «antes»: solo se tacha un precio cuando hay una oferta real. */
  oferta: {}
};
fs.writeFileSync(path.join(raiz, "data", "catalogo.json"), JSON.stringify(catalogo, null, 1) + "\n");

const piezas = inventario.reduce((s, p) => s + p.stock, 0);
console.log(`catalogo.json: ${productos.length} productos, ${pos.size} colores, ${inventario.length} variantes, ${piezas} piezas`);
for (const n of productos) {
  const v = inventario.filter(p => p.nombre === n);
  console.log(`  ${n.padEnd(16)} $${v[0].precio}  ${new Set(v.map(p => p.color)).size} colores  tallas ${[...new Set(v.map(p => p.talla))].join("/")}  ${v.reduce((s, p) => s + p.stock, 0)} piezas`);
}
avisos.forEach(a => console.log("  AVISO: " + a));
console.log("variantes por modelo:", [...pos.keys()].map(k => slug(k.replace("|", " "))).length);
