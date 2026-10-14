/* Pruebas de la tienda, ejecutadas contra el código real (config.js,
   catalogo.js y store-app.js) en un navegador simulado.

     node scripts/pruebas.js

   No abre red ni toca la base. */
const fs = require("fs"), path = require("path"), vm = require("vm");
const raiz = path.join(__dirname, "..");
const lee = f => fs.readFileSync(path.join(raiz, f), "utf8");
const existe = f => fs.existsSync(path.join(raiz, f));

const store = {};
const localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => (store[k] = String(v)), removeItem: k => delete store[k] };
const noop = () => {};
const campos = {};
const el = n => ({
  classList: { add: noop, remove: noop, toggle: noop, contains: () => false }, addEventListener: noop, style: {}, dataset: {},
  innerHTML: "", textContent: "", get value() { return campos[n] || ""; }, set value(v) { campos[n] = v; },
  scrollTo: noop, focus: noop, querySelector: () => null, querySelectorAll: () => [], setAttribute: noop, removeAttribute: noop,
  showModal: noop, close: noop
});
const document = { addEventListener: noop, documentElement: { dataset: {}, style: {} }, getElementById: n => el(n), querySelector: () => el("x"), querySelectorAll: () => [], createElement: () => el("x"), body: el("b"), head: el("h") };
const location = { search: "", pathname: "/", href: "https://oma.example/" };
const eventos = [], pedidosAlServidor = [];
const ctx = vm.createContext({
  localStorage, document, location, history: { replaceState: noop }, console,
  navigator: { clipboard: { writeText: async () => {} } },
  fetch: (u, o) => { pedidosAlServidor.push({ u, cuerpo: JSON.parse((o && o.body) || "{}") }); return Promise.resolve({ ok: true, json: async () => ({ init_point: "https://mp/x", total: 0 }) }); },
  setTimeout: f => f && 0, clearTimeout: noop, requestAnimationFrame: noop, URLSearchParams, encodeURIComponent, Intl
});
ctx.window = { addEventListener: noop, location, history: { replaceState: noop }, localStorage, matchMedia: () => ({ matches: false, addEventListener: noop }), scrollTo: noop, ROMA_EVENTO: (n, d) => eventos.push({ n, d }) };
ctx.globalThis = ctx;
for (const f of ["config.js", "catalogo.js", "renders3d.js", "store-app.js"]) vm.runInContext(lee(f), ctx, { filename: f });
vm.runInContext("navegaA=function(u){ globalThis.__url=u; };", ctx);

let fallos = 0, n = 0;
const chk = (t, c, d) => { n++; console.log((c ? " ok   " : "FALLA ") + t + (d !== undefined && d !== "" ? "  -> " + d : "")); if (!c) fallos++; };
const run = c => vm.runInContext(c, ctx);
const ev = nombre => eventos.filter(e => e.n === nombre);
const cat = JSON.parse(lee("data/catalogo.json"));
const pieza = sku => cat.inventario.find(p => p.sku === sku);

console.log("=== CATÁLOGO: EL INVENTARIO DEL PUNTO DE VENTA ===");
chk("126 variantes y 274 piezas, como en el punto de venta", cat.inventario.length === 126 && cat.inventario.reduce((s, p) => s + p.stock, 0) === 274,
  cat.inventario.length + " variantes, " + cat.inventario.reduce((s, p) => s + p.stock, 0) + " piezas");
chk("34 prendas (un modelo por color)", run("MODELOS.length") === 34, run("MODELOS.length"));
chk("tres familias, en el orden en que se visten", JSON.stringify(run("familias().map(f=>f.nombre)")) === '["Jacket","Playera","Legging Campana"]', JSON.stringify(run("familias().map(f=>f.nombre)")));
chk("jacket: 17 colores a $250", run("variantes('Jacket').length") === 17 && run("variantes('Jacket').every(m=>m.precio===250)"));
chk("playera: 10 colores a $150", run("variantes('Playera').length") === 10 && run("variantes('Playera').every(m=>m.precio===150)"));
chk("legging campana: 7 colores a $280", run("variantes('Legging Campana').length") === 7 && run("variantes('Legging Campana').every(m=>m.precio===280)"));
chk("existencias por talla, las reales", run("modelo('jacket-negro').tallas.M.stock") === pieza("JACKET-NEGRO-M").stock, run("modelo('jacket-negro').tallas.M.stock"));
chk("la playera solo ofrece S, M y L", JSON.stringify(run("tallasDe(modelo('playera-negro'))")) === '["S","M","L"]');
chk("la jacket ofrece de S a XL", JSON.stringify(run("tallasDe(modelo('jacket-negro'))")) === '["S","M","L","XL"]');
chk("ninguna prenda sale sin precio", run("MODELOS.every(m=>m.precio>0)"));
chk("ninguna oferta inventada", run("MODELOS.every(m=>!m.antes)"));
chk("el catálogo público no lleva costos ni proveedor", !/costo|proveedor/i.test(lee("catalogo.js")));
chk("cada prenda tiene su imagen", run("MODELOS.every(m=>!!render3D(m))"));
chk("las imágenes existen en disco", run("MODELOS.map(m=>m.id)").every(id => existe("prendas/" + id + ".webp")));
chk("las imágenes se describen como ilustración, no como foto", /Ilustración 3D de referencia/.test(run("altPrenda(modelo('jacket-negro'))")));

console.log("\n=== BOLSA ===");
run("carrito=[]; entrega='local'; codigoAplicado=null;");
run("addSku('JACKET-NEGRO-M',1,true)");
chk("agregar a la bolsa", run("cartCount()") === 1);
run("addSku('JACKET-NEGRO-M',2,true)");
chk("la misma prenda se suma en un renglón", run("cartCount()") === 3 && run("carrito.length") === 1);
run("addSku('JACKET-NEGRO-M',99,true)");
chk("no deja pasar de las piezas que hay", run("cartCount()") === pieza("JACKET-NEGRO-M").stock, run("cartCount()") + " de " + pieza("JACKET-NEGRO-M").stock);
chk("una clave que no existe no entra", run("addSku('ROM-RECTO-NEG-M',1,true)") === false);
run("carrito=[{sku:'ROM-RECTO-NEG-M',cant:1},{sku:'JACKET-NEGRO-M',cant:1}]; limpiaEstado();");
chk("la bolsa guardada con prendas de la tienda anterior se limpia sola", run("carrito.length") === 1 && run("carrito[0].sku") === "JACKET-NEGRO-M");
run("carrito=[];");

console.log("\n=== ENTREGA Y TOTALES ===");
run("carrito=[{sku:'PLAYERA-NEGRO-S',cant:1}]; entrega='local';");
chk("entrega local $100", run("totales().envio") === 100 && run("totales().total") === 250);
run("entrega='nacional';");
chk("envío nacional $200", run("totales().envio") === 200);
run("entrega='pickup';");
chk("recoger en persona, sin costo", run("totales().envio") === 0);
run("carrito=[{sku:'JACKET-NEGRO-M',cant:2}]; entrega='nacional';");
chk("envío gratis desde $500", run("totales().envio") === 0 && run("totales().total") === 500);

console.log("\n=== CÓDIGO DEL OUTFIT ===");
const pct = run("CFG().outfitDiscountPct");
run("carrito=[{sku:'JACKET-NEGRO-M',cant:1},{sku:'LEGGING-CAMPANA-NEGRO-M',cant:1}]; entrega='pickup'; codigoAplicado='OUTFIT';");
chk("OUTFIT aplica con jacket + legging", run("totales().desc") === 530 * pct / 100, "descuento " + run("totales().desc"));
run("carrito=[{sku:'PLAYERA-NEGRO-S',cant:1},{sku:'LEGGING-CAMPANA-NEGRO-M',cant:1}];");
chk("OUTFIT aplica con playera + legging", run("totales().desc") === 430 * pct / 100);
run("carrito=[{sku:'JACKET-NEGRO-M',cant:1},{sku:'PLAYERA-NEGRO-S',cant:1}]; codigoAplicado='OUTFIT';");
chk("OUTFIT no aplica sin legging", run("totales().desc") === 0);
chk("el código viejo LOOK15 sigue valiendo", run("codigoCanon('look15')") === "OUTFIT");
chk("un código que no existe se rechaza", run("validaCodigo('REGALO100').ok") === false);
run("codigoAplicado=null;");

console.log("\n=== ARMADOR DE OUTFITS ===");
chk("cada prenda del maniquí lleva su color exacto", JSON.stringify(run("prendasDe({capa:'jacket-rosa-barbie',abajo:'legging-campana-negro'})")) ===
  JSON.stringify({ abajo: { base: "legging-campana", hex: run("modelo('legging-campana-negro').hex") }, capa: { base: "jacket", hex: run("modelo('jacket-rosa-barbie').hex") } }));
chk("todas las prendas se pueden poner en el maniquí", run("MODELOS.every(m=>['jacket','playera','legging-campana'].indexOf(m.base)>=0)"));
chk("todos los colores traen su tono", run("MODELOS.every(m=>/^#[0-9A-Fa-f]{6}$/.test(m.hex))"));
chk("las tres capas del maniquí existen", ["maniqui", "capa-jacket", "capa-playera", "capa-legging-campana"].every(a => existe("maniqui/" + a + ".webp")));
chk("el maniquí se describe para lectores de pantalla", /Maniquí blanco con jacket negro/.test(run("altOutfit({capa:'jacket-negro'})")));

console.log("\n=== PEDIDO POR WHATSAPP ===");
run("carrito=[{sku:'LEGGING-CAMPANA-NEGRO-M',cant:1}]; entrega='local'; pagoSel='transferencia'; ordenes=[]; puntos=0;");
Object.assign(campos, { ckNombre: "María Pérez", ckWhats: "6861234567", ckCorreo: "maria@ejemplo.com", ckDir: "Av. Reforma 100", ckCol: "Centro", ckRef: "Portón blanco", ckNotas: "" });
run("confirmarPedido()");
const o = run("ordenes[0]");
chk("se genera número de pedido OMA", !!o && /^OMA-\d{8}-\d{4}$/.test(o.folio), o && o.folio);
chk("el pedido guarda el total correcto", o && o.total === 380, o && o.total);
chk("el pedido guarda color y talla", o && o.items[0].c === "Negro" && o.items[0].t === "M");
chk("el mensaje lleva el correo y el total", (o.texto || "").includes("maria@ejemplo.com") && (o.texto || "").includes("$380.00"));
chk("se abre WhatsApp con el pedido", /^https:\/\/wa\.me\/\d+\?text=/.test(run("globalThis.__url") || ""));
chk("la bolsa se vacía al confirmar", run("cartCount()") === 0);
chk("la compra se registra una sola vez", ev("purchase").length === 1);
run("cierraPedido(ordenes[0].folio)");
chk("y no se duplica", ev("purchase").length === 1);
chk("los datos bancarios salen solo con el pedido hecho", run("datosTransferencia('NO-EXISTE')") === "");

console.log("\n=== PAGO CON TARJETA ===");
run("carrito=[{sku:'JACKET-NEGRO-M',cant:1},{sku:'LEGGING-CAMPANA-NEGRO-M',cant:1}]; entrega='local'; pagoSel='tarjeta'; ordenes=[]; codigoAplicado='OUTFIT';");
Object.assign(campos, { ckNombre: "Ana", ckWhats: "6860000000", ckCorreo: "" });
pedidosAlServidor.length = 0;
run("confirmarPedido()");
const envio = pedidosAlServidor[0] || {};
chk("pide el cobro al servidor", /create-preference$/.test(envio.u || ""), envio.u);
chk("manda claves y cantidades, nunca precios ni totales", JSON.stringify(envio.cuerpo.items) === '[{"sku":"JACKET-NEGRO-M","cant":1},{"sku":"LEGGING-CAMPANA-NEGRO-M","cant":1}]'
  && !("total" in envio.cuerpo) && !/precio/.test(JSON.stringify(envio.cuerpo)));
chk("manda el código para que el servidor lo valide", envio.cuerpo.codigo === "OUTFIT" && envio.cuerpo.entrega === "local");
chk("la bolsa se conserva hasta saber si el pago pasó", run("cartCount()") === 2);
const folio = run("ordenes[0].folio");
location.search = "?mp=failure&folio=" + folio;
run("procesaRetornoMP()");
chk("pago rechazado: la bolsa sigue intacta", run("cartCount()") === 2 && run("ordenes[0].estado") === "Pago rechazado");
chk("pago rechazado: no se dan puntos", run("ordenes[0].puntosAplicados") !== true);
chk("pago rechazado: no se dice que se pagó", /El pago no pasó/.test(run("viewPagoMP()")) && !/Pago recibido/.test(run("viewPagoMP()")));
location.search = "?mp=approved&folio=" + folio;
run("procesaRetornoMP()");
chk("pago aprobado: se cierra el pedido y se vacía la bolsa", run("cartCount()") === 0 && run("ordenes[0].estado") === "Pagado con tarjeta");
location.search = "";

console.log("\n=== EVENTOS DE MEDICIÓN ===");
eventos.length = 0;
run("carrito=[]; go('producto','jacket-negro'); addSku('JACKET-NEGRO-M',1,true); viewCarrito();");
chk("ver prenda, agregar y ver bolsa se registran", ev("view_item").length > 0 && ev("add_to_cart").length > 0 && ev("view_cart").length > 0,
  ["view_item", "add_to_cart", "view_cart"].map(x => x + ":" + ev(x).length).join(" "));
const a = (ev("add_to_cart")[0] || { d: { items: [{}] } }).d;
chk("el evento lleva clave, color, talla y precio reales", a.items[0].sku === "JACKET-NEGRO-M" && a.items[0].color === "Negro" && a.items[0].talla === "M" && a.items[0].precio === 250 && a.valor === 250);
const an = lee("analitica.js");
chk("sin identificadores no se carga ningún rastreador", an.includes("if (CFG.ga4Id)") && an.includes("if (CFG.metaPixelId)"));
chk("no se envían datos de tarjeta", !/card_number|cvv|password/i.test(an));
run("carrito=[];");

console.log("\n=== PÁGINAS Y BUSCADORES ===");
chk("robots.txt, sitemap.xml y 404", existe("robots.txt") && existe("sitemap.xml") && existe("404.html"));
chk("34 páginas de producto", fs.readdirSync(path.join(raiz, "productos")).length === 34, fs.readdirSync(path.join(raiz, "productos")).length);
chk("cada prenda tiene su página", run("MODELOS.map(m=>m.id)").every(id => existe("productos/" + id + "/index.html")));
["envios", "cambios", "terminos", "privacidad", "preguntas-frecuentes", "guia-de-tallas", "sobre-oma", "contacto"]
  .forEach(p => chk("página /" + p + "/", existe(p + "/index.html")));
const red = lee("_redirects");
chk("las direcciones de la tienda anterior redirigen", /^\/productos\/leggings-recto-negro\/\*\s+\/\S*\s+301$/m.test(red) && /^\/sobre-roma\/\*\s+\/sobre-oma\/\s+301$/m.test(red));

console.log("\n=== REGLAS DEL ENCARGO ===");
run("carrito=[{sku:'JACKET-NEGRO-M',cant:1}]; pagoSel='transferencia';");
const src = lee("store-app.js"), html = lee("index.html");
chk("sin reseñas inventadas", run("resenasDe('jacket-negro').items.length") === 0 && run("resenasDe('jacket-negro').rating") === null);
chk("el acceso de administrador no se muestra a clientas", run("ADMIN_VISIBLE") === false && !/Administrador/.test(html));
chk("la CLABE no aparece antes de crear el pedido", !/pagoSel===.transferencia.&&C\.clabe/.test(src) && !/clabe/i.test(run("viewCheckout()")));
chk("políticas enlazadas antes de pagar", /\/terminos\//.test(run("viewCheckout()")) && /\/cambios\//.test(run("viewCheckout()")));
chk("todo se cobra en pesos mexicanos", /currency_id: "MXN"/.test(lee("netlify/functions/create-preference.js")));
chk("ninguna clave secreta en lo que baja al navegador", ["index.html", "store-app.js", "config.js", "admin.js", "supabase.js", "maniqui.js", "tinte.js", "analitica.js", "analitica-config.js", "catalogo.js"]
  .every(f => !/APP_USR-\d|TEST-\d{6,}|service_role|sb_secret_/.test(lee(f))));
chk("la marca visible es OMA", /OMA Sportwear/.test(html) && !/ROMA Sportwear|Roma Sportwear/.test(html) && !/ROMA Sportwear|Roma Sportwear/.test(src));
chk("se escribe SPORTWEAR, sin s", !/sportswear/i.test(html + src));

console.log("\n" + (fallos === 0 ? "=== " + n + " PRUEBAS, TODAS OK ===" : "=== " + fallos + " DE " + n + " FALLARON ==="));
process.exit(fallos ? 1 : 0);
