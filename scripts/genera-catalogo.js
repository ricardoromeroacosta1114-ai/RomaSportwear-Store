/* Genera catalogo.js (global del navegador) desde data/catalogo.json.
   Una sola fuente de verdad: el navegador y las funciones del servidor
   leen exactamente los mismos precios y existencias. */
const fs = require("fs");
const path = require("path");
const raiz = path.join(__dirname, "..");
const cat = JSON.parse(fs.readFileSync(path.join(raiz, "data/catalogo.json"), "utf8"));

const salida =
`/* GENERADO AUTOMATICAMENTE desde data/catalogo.json — no editar a mano.
   Para cambiar precios o existencias edita data/catalogo.json y vuelve a publicar. */
const INV = ${JSON.stringify(cat.inventario)};
const NUEVO = ${JSON.stringify(cat.nuevo)};
const OFERTA = ${JSON.stringify(cat.oferta)};
`;
fs.writeFileSync(path.join(raiz, "catalogo.js"), salida);
console.log("catalogo.js generado:", cat.inventario.length, "SKUs");
