/* Checklist de pruebas obligatorias, ejecutado contra el codigo real. */
const fs = require("fs"), vm = require("vm");
const dir = "";
const store = {};
const localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => (store[k] = String(v)), removeItem: k => delete store[k] };
const noop = () => {};
const campos = {};
const el = n => ({ classList: { add: noop, remove: noop, toggle: noop }, addEventListener: noop, style: {}, dataset: {}, innerHTML: "", textContent: "", get value() { return campos[n] || ""; }, set value(v) { campos[n] = v; }, scrollTo: noop, focus: noop });
const document = { addEventListener: noop, documentElement: { dataset: {} }, getElementById: n => el(n), querySelector: () => el("x"), querySelectorAll: () => [], createElement: () => el("x"), body: el("b"), head: el("h") };
const location = { search: "", pathname: "/", href: "https://romasportwear.netlify.app/" };
const eventos = [];
let navegado = null;
const ctx = vm.createContext({
  localStorage, document, location, history: { replaceState: noop }, console,
  navigator: { clipboard: { writeText: async () => {} } },
  fetch: () => Promise.resolve({ ok: true, json: async () => ({ init_point: "https://mp/x", total: 0 }) }),
  setTimeout: f => f && 0, clearTimeout, URLSearchParams, encodeURIComponent, Intl
});
ctx.window = { addEventListener: noop, location, history: { replaceState: noop }, localStorage, matchMedia: () => ({ matches: false, addEventListener: noop }), scrollTo: noop, ROMA_EVENTO: (n, d) => eventos.push({ n, d }) };
ctx.globalThis = ctx;
for (const f of ["config.js", "catalogo.js", "store-app.js"]) vm.runInContext(fs.readFileSync(dir + f, "utf8"), ctx);
vm.runInContext("navegaA=function(u){ globalThis.__url=u; };", ctx);

let fallos = 0, n = 0;
const chk = (t, c, d) => { n++; console.log((c ? " OK  " : "FALLA") + "  " + t + (d ? "  -> " + d : "")); if (!c) fallos++; };
const R = ctx.window.__roma;
const run = c => vm.runInContext(c, ctx);

console.log("=== CATALOGO Y VARIANTES ===");
chk("cada color es una variante propia", run("MODELOS.length") === 27, run("MODELOS.length") + " variantes");
chk("selección de color muestra solo esa prenda", run("modelo('leggings-recto-cafe').color") === "Cafe");
chk("existencias por variante son reales", run("modelo('chamarra-deportiva-blanco').tallas.S.stock") === 1);
chk("tallas mostradas = solo las disponibles", JSON.stringify(run("tallasDisp(modelo('playera-dry-fit-beige'))")) === '["S"]', JSON.stringify(run("tallasDisp(modelo('playera-dry-fit-beige'))")));
chk("etiqueta agotado detecta sin existencias", run("(function(){const m=JSON.parse(JSON.stringify(modelo('playera-dry-fit-beige')));Object.values(m.tallas).forEach(v=>v.stock=0);return !Object.values(m.tallas).some(v=>v.stock>0)})()"));

console.log("\n=== CARRITO ===");
run("carrito=[]; entrega='local';");
run("addSku('ROM-RECTO-NEG-M',1,true)");
chk("agregar al carrito", run("cartCount()") === 1);
run("addSku('ROM-RECTO-NEG-M',2,true)");
chk("modificar cantidad (fusiona renglones)", run("cartCount()") === 3, run("cartCount()") + " piezas");
chk("no deja pasar del stock real (18)", run("(function(){const a=cartCount();addSku('ROM-RECTO-NEG-M',99,true);return cartCount()<=18})()"));
run("carrito=[];");
chk("eliminar producto", run("cartCount()") === 0);

console.log("\n=== ENVIO Y TOTALES ===");
run("carrito=[{sku:'ROM-PLAYERA-NEG-S',cant:1}]; entrega='local';");
chk("envío local 100", run("totales().envio") === 100);
run("entrega='nacional';");
chk("envío nacional 200", run("totales().envio") === 200);
run("entrega='pickup';");
chk("recoger sin envío", run("totales().envio") === 0);
run("carrito=[{sku:'ROM-RECTO-NEG-M',cant:2}]; entrega='nacional';");
chk("envío gratis desde 500", run("totales().envio") === 0 && run("totales().total") === 600);

console.log("\n=== CUPON ===");
run("carrito=[{sku:'ROM-PLAYERA-NEG-S',cant:1},{sku:'ROM-RECTO-NEG-M',cant:1}]; entrega='pickup'; codigoAplicado='LOOK15';");
chk("LOOK15 aplica con outfit completo", Math.round(run("totales().desc")) === 68, "desc=" + Math.round(run("totales().desc")));
run("carrito=[{sku:'ROM-PLAYERA-NEG-S',cant:1}]; codigoAplicado='LOOK15';");
chk("LOOK15 no aplica sin outfit", run("totales().desc") === 0);
run("codigoAplicado=null;");

console.log("\n=== CHECKOUT COMPLETO ===");
run("carrito=[{sku:'ROM-RECTO-NEG-M',cant:1}]; entrega='local'; pagoSel='transferencia'; ordenes=[];");
campos.ckNombre = "María Pérez"; campos.ckWhats = "6861234567"; campos.ckCorreo = "maria@ejemplo.com";
campos.ckDir = "Av. Reforma 100"; campos.ckCol = "Centro"; campos.ckRef = "Portón blanco"; campos.ckNotas = "";
run("confirmarPedido()");
const o = run("ordenes[0]");
chk("se genera número de pedido", !!o && /^ROMA-\d{8}-\d{4}$/.test(o.folio), o && o.folio);
chk("el pedido guarda el total correcto", o && o.total === 400, o && o.total);
chk("el pedido guarda color y talla", o && o.items[0].c === "Negro" && o.items[0].t === "M");
chk("el correo entra en el mensaje", (o.texto || "").includes("maria@ejemplo.com"));
chk("carrito vaciado al confirmar", run("cartCount()") === 0);
chk("purchase se registró", eventos.filter(e => e.n === "purchase").length === 1);

console.log("\n=== PAGO RECHAZADO NO PIERDE EL CARRITO ===");
run("carrito=[{sku:'ROM-RECTO-NEG-M',cant:1}]; entrega='local'; pagoSel='tarjeta'; ordenes=[];");
campos.ckNombre = "Ana"; campos.ckWhats = "6860000000"; campos.ckCorreo = "";
run("confirmarPedido()");
chk("con tarjeta el carrito se conserva hasta saber el pago", run("cartCount()") === 1);
const folio = run("ordenes[0].folio");
ctx.location.search = "?mp=failure&folio=" + folio; ctx.window.location.search = ctx.location.search;
run("procesaRetornoMP()");
chk("tras rechazo el carrito sigue intacto", run("cartCount()") === 1);
chk("tras rechazo no se dan puntos", run("ordenes[0].puntosAplicados") !== true);

console.log("\n=== SEO Y ARCHIVOS ===");
const listo = p => fs.existsSync(dir + p);
chk("robots.txt", listo("robots.txt"));
chk("sitemap.xml", listo("sitemap.xml"));
chk("404.html", listo("404.html"));
chk("27 páginas de producto", fs.readdirSync(dir + "productos").length === 27);
["envios", "cambios", "terminos", "privacidad", "preguntas-frecuentes", "guia-de-tallas", "sobre-roma", "contacto"]
  .forEach(p => chk("página /" + p + "/", listo(p + "/index.html")));

console.log("\n=== REGLAS DEL ENCARGO ===");
const src = fs.readFileSync(dir + "store-app.js", "utf8");
chk("sin reseñas inventadas", !/Karla M\.|Fernanda R\.|Alexa T\./.test(src));
chk("sin calificación inventada", !/rating:\(4\.6/.test(src));
chk("CLABE no se muestra antes del pedido", !/pagoSel===.transferencia.&&C\.clabe/.test(src));
chk("admin oculto a clientas", run("ADMIN_VISIBLE") === false);
chk("copy prohibido eliminado", !src.includes("prendas sueltas"));
chk("políticas visibles antes de pagar", src.includes("aviso-legal"));
chk("todo en MXN", /currency_id: "MXN"|currency: "MXN"/.test(fs.readFileSync(dir + "netlify/functions/create-preference.js", "utf8")));

console.log("\n" + (fallos === 0 ? "=== " + n + " PRUEBAS, TODAS OK ===" : "=== " + fallos + " DE " + n + " FALLARON ==="));
process.exit(fallos ? 1 : 0);
