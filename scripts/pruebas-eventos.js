/* Prueba de humo ampliada: arranque + eventos de conversion reales. */
const fs = require("fs"), vm = require("vm");
const dir = "";
const store = {};
const localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => (store[k] = String(v)), removeItem: k => delete store[k] };
const noop = () => {};
const el = { classList: { add: noop, remove: noop, toggle: noop }, addEventListener: noop, style: {}, dataset: {}, innerHTML: "", textContent: "", value: "", scrollLeft: 0, clientWidth: 0, scrollTo: noop, content: "", focus: noop };
const document = { addEventListener: noop, documentElement: { dataset: {} }, getElementById: () => el, querySelector: () => el, querySelectorAll: () => [], createElement: () => el, body: el, head: el };
const location = { search: "", pathname: "/", href: "https://romasportwear.netlify.app/" };

const capturados = [];
const ctx = vm.createContext({
  localStorage, document, location, history: { replaceState: noop },
  navigator: { clipboard: { writeText: async () => {} } }, console,
  fetch: () => Promise.resolve({ ok: true, json: async () => ({}) }),
  setTimeout, clearTimeout, URLSearchParams, encodeURIComponent, Intl
});
ctx.window = { addEventListener: noop, location, history: { replaceState: noop }, localStorage, matchMedia: () => ({ matches: false, addEventListener: noop }), scrollTo: noop, ROMA_EVENTO: (n, d) => capturados.push({ n, d }) };
ctx.globalThis = ctx;

let fallos = 0;
const chk = (n, c, d) => { console.log((c ? "OK   " : "FALLA ") + n + (d ? "  -> " + d : "")); if (!c) fallos++; };

for (const f of ["config.js", "catalogo.js", "store-app.js"]) vm.runInContext(fs.readFileSync(dir + f, "utf8"), ctx);
console.log("codigo real cargado OK\n");

/* --- disparar el recorrido de compra --- */
vm.runInContext("entrega='local'; carrito=[];", ctx);
vm.runInContext("go('producto','leggings-recto-negro')", ctx);
vm.runInContext("addSku('ROM-RECTO-NEG-M',1,true)", ctx);
vm.runInContext("viewCarrito()", ctx);

const ev = n => capturados.filter(e => e.n === n);
chk("select_item se dispara", ev("select_item").length > 0);
chk("view_item se dispara", ev("view_item").length > 0);
chk("add_to_cart se dispara", ev("add_to_cart").length > 0);
chk("view_cart se dispara", ev("view_cart").length > 0);

const a = ev("add_to_cart")[0].d;
const it = a.items[0];
chk("evento lleva SKU real", it.sku === "ROM-RECTO-NEG-M", it.sku);
chk("evento lleva nombre, color y talla", !!it.nombre && !!it.color && !!it.talla, it.nombre + " / " + it.color + " / " + it.talla);
chk("evento lleva precio real", it.precio === 300, "precio=" + it.precio);
chk("evento lleva valor total", a.valor === 300, "valor=" + a.valor);

/* --- purchase solo al cerrar el pedido, y una sola vez --- */
capturados.length = 0;
vm.runInContext("ordenes.length=0; ordenes.unshift({folio:'F-9',total:400,puntos:40,pago:'transferencia',items:[{n:'Leggings Recto',c:'Negro',t:'M',q:1,sku:'ROM-RECTO-NEG-M'}]});", ctx);
vm.runInContext("cierraPedido('F-9')", ctx);
chk("purchase se dispara al cerrar el pedido", ev("purchase").length === 1);
const pc = ev("purchase")[0].d;
chk("purchase lleva folio y valor", pc.extra.transaction_id === "F-9" && pc.valor === 400, pc.extra.transaction_id + " / " + pc.valor);
vm.runInContext("cierraPedido('F-9')", ctx);
chk("purchase NO se duplica", ev("purchase").length === 1, ev("purchase").length + " veces");

/* --- sin identificadores no se rastrea nada --- */
const an = fs.readFileSync(dir + "analitica.js", "utf8");
chk("analitica sin IDs no carga scripts", an.includes("if (CFG.ga4Id)") && an.includes("if (CFG.metaPixelId)"));
chk("no se envian datos sensibles", !/tarjeta|card_number|password|cvv/i.test(an));

console.log("");
console.log(fallos === 0 ? "=== EVENTOS: TODO OK ===" : "=== " + fallos + " FALLAS ===");
process.exit(fallos ? 1 : 0);
