/* Prueba de humo: carga el codigo real de la tienda en un navegador simulado
   y comprueba que el catalogo, el carrito y los totales siguen funcionando. */
const fs = require("fs"), vm = require("vm");
const dir = "";
const store = {};
const localStorage = {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k, v) => (store[k] = String(v)),
  removeItem: k => delete store[k]
};
const noop = () => {};
const el = {
  classList: { add: noop, remove: noop, toggle: noop }, addEventListener: noop,
  style: {}, dataset: {}, innerHTML: "", textContent: "", value: "",
  scrollLeft: 0, clientWidth: 0, scrollTo: noop, content: "", focus: noop
};
const document = {
  addEventListener: noop, documentElement: { dataset: {} }, getElementById: () => el,
  querySelector: () => el, querySelectorAll: () => [], createElement: () => el, body: el
};
const location = { search: "", pathname: "/", href: "https://romasportwear.netlify.app/" };
const window = {
  addEventListener: noop, location, history: { replaceState: noop },
  matchMedia: () => ({ matches: false, addEventListener: noop }), localStorage
};
const ctx = vm.createContext({
  localStorage, document, window, location, history: { replaceState: noop },
  navigator: { clipboard: { writeText: async () => {} } }, console,
  fetch: () => Promise.resolve({ ok: true, json: async () => ({}) }),
  setTimeout, clearTimeout, URLSearchParams, encodeURIComponent, Intl
});
ctx.globalThis = ctx; ctx.window = ctx.window || ctx;

let fallos = 0;
const chk = (n, cond, d) => { console.log((cond ? "OK   " : "FALLA ") + n + (d ? "  -> " + d : "")); if (!cond) fallos++; };

try {
  for (const f of ["config.js", "catalogo.js", "store-app.js"]) {
    vm.runInContext(fs.readFileSync(dir + f, "utf8"), ctx);
  }
  console.log("codigo real cargado OK (config + catalogo + store-app)\n");
} catch (e) {
  console.log("NO CARGA:", e.message); process.exit(1);
}

const R = ctx.window.__roma;

/* catalogo */
const MODELOS = vm.runInContext("MODELOS", ctx);
chk("catalogo cargado desde catalogo.js", MODELOS.length === 27, MODELOS.length + " variantes");
chk("precios reales intactos", vm.runInContext("modelo('leggings-recto-negro').precio", ctx) === 300);
chk("ofertas reales intactas", vm.runInContext("modelo('playera-dry-fit-negro').antes", ctx) === 180);

/* resenas: cero inventadas */
const rs = vm.runInContext("resenasDe('leggings-recto-negro')", ctx);
chk("sin reseñas inventadas", rs.items.length === 0 && rs.rating === null, "items=" + rs.items.length + " rating=" + rs.rating);

/* admin oculto por defecto */
chk("admin oculto para clientas", vm.runInContext("ADMIN_VISIBLE", ctx) === false);

/* carrito y totales */
vm.runInContext("entrega='local'; carrito=[{sku:'ROM-PLAYERA-NEG-S',cant:1}];", ctx);
let T = vm.runInContext("totales()", ctx);
chk("total playera 150 + envio local 100", T.total === 250, "total=" + T.total);
vm.runInContext("carrito=[{sku:'ROM-RECTO-NEG-M',cant:2}];", ctx);
T = vm.runInContext("totales()", ctx);
chk("600 activa envio gratis", T.total === 600 && T.envio === 0, "total=" + T.total);

/* no queda copy prohibido ni CLABE en el checkout */
const src = fs.readFileSync(dir + "store-app.js", "utf8");
chk("copy 'prendas sueltas' eliminado", !src.includes("prendas sueltas"));
chk("CLABE fuera del checkout", !/pagoSel===.transferencia.&&C\.clabe/.test(src));
chk("CLABE disponible tras crear el pedido", src.includes("function datosTransferencia"));

console.log("");
console.log(fallos === 0 ? "=== PRUEBA DE HUMO: TODO OK ===" : "=== " + fallos + " FALLAS ===");
process.exit(fallos ? 1 : 0);
