/* Pruebas del lado del servidor: lo que decide cuánto se cobra y qué se
   registra en el inventario. Mercado Pago y la base se simulan; ninguna
   llamada sale a internet.

     node scripts/pruebas-servidor.js */
const path = require("path");
const fn = f => path.join(__dirname, "..", "netlify", "functions", f);
const cat = require("../data/catalogo.json");

let fallos = 0, n = 0;
const chk = (t, c, d) => { n++; console.log((c ? " ok   " : "FALLA ") + t + (d !== undefined && d !== "" ? "  -> " + d : "")); if (!c) fallos++; };

/* ---------- un mundo de mentiras: Supabase + Mercado Pago ---------- */
const mundo = { config: {}, promos: [], catalogoVivo: null, pagos: {}, preferencias: [], ventas: [], baseCaida: false };
const resp = (status, cuerpo) => ({ ok: status >= 200 && status < 300, status, json: async () => cuerpo });
global.fetch = async (url, o) => {
  o = o || {};
  const cuerpo = o.body ? JSON.parse(o.body) : null;
  if (url.includes("/rest/v1/config")) return resp(200, [{ datos: mundo.config }]);
  if (url.includes("/rest/v1/promos")) {
    const cod = decodeURIComponent((/codigo=eq\.([^&]+)/.exec(url) || [])[1] || "");
    return resp(200, mundo.promos.filter(p => p.codigo === cod && p.activo));
  }
  if (url.includes("/rpc/roma_catalogo_web")) return mundo.baseCaida || !mundo.catalogoVivo ? resp(500, {}) : resp(200, mundo.catalogoVivo);
  if (url.includes("/rpc/roma_registrar_venta_web")) {
    if (mundo.baseCaida) return resp(500, { message: "caída" });
    const ya = mundo.ventas.find(v => v.p_datos.referencia === cuerpo.p_datos.referencia);
    if (!ya) mundo.ventas.push(cuerpo);
    return resp(200, { folio: "V-1", repetida: !!ya, por_revisar: false });
  }
  if (url.includes("mercadopago.com/checkout/preferences")) { mundo.preferencias.push({ cuerpo, auth: o.headers.Authorization }); return resp(201, { init_point: "https://www.mercadopago.com.mx/checkout/v1/redirect?pref_id=1" }); }
  const pago = /mercadopago\.com\/v1\/payments\/(\d+)/.exec(url);
  if (pago) return mundo.pagos[pago[1]] ? resp(200, mundo.pagos[pago[1]]) : resp(404, {});
  throw new Error("llamada inesperada: " + url);
};

process.env.SUPABASE_URL = "https://base.example";
process.env.SUPABASE_ANON_KEY = "anon";
process.env.MP_ACCESS_TOKEN = "token-de-prueba";
delete process.env.ROMA_WEB_LLAVE;

const tienda = require(fn("_tienda.js"));
const crea = require(fn("create-preference.js")).handler;
const aviso = require(fn("mp-aviso.js")).handler;
const pide = async cuerpo => {
  const r = await crea({ httpMethod: "POST", headers: { host: "vista--oma.example" }, body: JSON.stringify(cuerpo) });
  return { status: r.statusCode, ...JSON.parse(r.body) };
};
const avisa = async id => {
  const r = await aviso({ httpMethod: "POST", headers: {}, queryStringParameters: {}, body: JSON.stringify({ type: "payment", data: { id } }) });
  return { status: r.statusCode, ...JSON.parse(r.body) };
};
const ultima = () => mundo.preferencias[mundo.preferencias.length - 1].cuerpo;
const cobrado = p => p.items.reduce((s, i) => s + i.unit_price * i.quantity, 0);

(async () => {
  console.log("=== EL SERVIDOR RECALCULA EL TOTAL ===");
  mundo.config = { outfitDiscountPct: 10 };
  let r = await pide({ folio: "OMA-20261013-1001", entrega: "pickup", items: [{ sku: "JACKET-NEGRO-M", cant: 1, precio: 1 }], total: 1 });
  chk("ignora el precio que mande el navegador", r.status === 200 && r.total === 250, r.total);
  chk("la preferencia cobra lo del catálogo", cobrado(ultima()) === 250);
  chk("en pesos mexicanos", ultima().items.every(i => i.currency_id === "MXN"));
  chk("el estado de cuenta dirá OMA SPORTWEAR", ultima().statement_descriptor === "OMA SPORTWEAR");
  chk("regresa al mismo sitio desde el que se compró", ultima().back_urls.success.startsWith("https://vista--oma.example/?mp=approved&folio=OMA-20261013-1001"));
  chk("pide el aviso de pago al servidor", ultima().notification_url === "https://vista--oma.example/.netlify/functions/mp-aviso");
  chk("guarda las piezas para registrar la venta", ultima().metadata.piezas === "JACKET-NEGRO-M*1");
  chk("el token viaja solo del servidor a Mercado Pago", mundo.preferencias[0].auth === "Bearer token-de-prueba" && !JSON.stringify(r).includes("token-de-prueba"));

  r = await pide({ folio: "OMA-20261013-1002", entrega: "local", items: [{ sku: "PLAYERA-NEGRO-S", cant: 1 }] });
  chk("entrega local: $150 + $100", r.total === 250 && cobrado(ultima()) === 250, r.total);
  r = await pide({ folio: "OMA-20261013-1003", entrega: "nacional", items: [{ sku: "JACKET-NEGRO-M", cant: 2 }] });
  chk("envío gratis desde $500", r.total === 500, r.total);

  console.log("\n=== CÓDIGOS ===");
  const outfit = [{ sku: "JACKET-NEGRO-M", cant: 1 }, { sku: "LEGGING-CAMPANA-NEGRO-M", cant: 1 }];
  r = await pide({ folio: "OMA-20261013-1004", entrega: "pickup", codigo: "OUTFIT", items: outfit });
  chk("OUTFIT: 10 % sobre jacket + legging", r.total === 477, r.total);
  r = await pide({ folio: "OMA-20261013-1005", entrega: "pickup", codigo: "look15", items: outfit });
  chk("el código viejo LOOK15 vale lo mismo", r.total === 477, r.total);
  r = await pide({ folio: "OMA-20261013-1006", entrega: "pickup", codigo: "OUTFIT", items: [{ sku: "JACKET-NEGRO-M", cant: 1 }, { sku: "PLAYERA-NEGRO-S", cant: 1 }] });
  chk("OUTFIT sin legging no descuenta", r.total === 400, r.total);
  r = await pide({ folio: "OMA-20261013-1007", entrega: "pickup", codigo: "REGALO100", items: outfit });
  chk("un código inventado no descuenta nada", r.total === 530, r.total);
  mundo.promos = [{ codigo: "BAZAR50", activo: true, tipo: "fijo", valor: 50, minimo: 300, vence: null }];
  r = await pide({ folio: "OMA-20261013-1008", entrega: "pickup", codigo: "BAZAR50", items: outfit });
  chk("un código del panel sí se respeta", r.total === 480, r.total);
  r = await pide({ folio: "OMA-20261013-1009", entrega: "pickup", codigo: "BAZAR50", items: [{ sku: "PLAYERA-NEGRO-S", cant: 1 }] });
  chk("pero no por debajo de su compra mínima", r.total === 150, r.total);
  mundo.promos = [{ codigo: "VIEJO", activo: true, tipo: "pct", valor: 50, minimo: null, vence: "2020-01-01" }];
  r = await pide({ folio: "OMA-20261013-1010", entrega: "pickup", codigo: "VIEJO", items: outfit });
  chk("un código vencido no descuenta", r.total === 530, r.total);
  r = await pide({ folio: "OMA-20261013-1011", entrega: "pickup", nivelPct: 90, items: outfit });
  chk("el descuento por nivel se recorta al máximo de la tienda", r.total === 477, r.total);
  mundo.promos = [];

  console.log("\n=== LO QUE NO SE DEJA PASAR ===");
  r = await pide({ folio: "OMA-20261013-1012", entrega: "pickup", items: [{ sku: "ROM-RECTO-NEG-M", cant: 1 }] });
  chk("una prenda que ya no existe", r.status === 409, r.error);
  const tope = cat.inventario.find(p => p.sku === "JACKET-ROSA-PASTEL-XL").stock;
  r = await pide({ folio: "OMA-20261013-1013", entrega: "pickup", items: [{ sku: "JACKET-ROSA-PASTEL-XL", cant: tope + 1 }] });
  chk("más piezas de las que hay", r.status === 409 && /Solo queda/.test(r.error), r.error);
  r = await pide({ folio: "OMA-20261013-1014", entrega: "pickup", items: [{ sku: "JACKET-NEGRO-M", cant: -3 }] });
  chk("cantidades negativas", r.status === 409, r.error);
  r = await pide({ folio: "OMA-20261013-1015", entrega: "pickup", items: [] });
  chk("una bolsa vacía", r.status === 409, r.error);
  r = await pide({ folio: "x", entrega: "pickup", items: outfit });
  chk("un número de pedido raro", r.status === 400, r.error);
  r = await pide({ folio: "OMA-20261013-1016", entrega: "a-la-luna", items: outfit });
  chk("una forma de entrega que no existe", r.status === 400, r.error);
  r = await crea({ httpMethod: "GET", headers: {} });
  chk("solo acepta POST", r.statusCode === 405);
  delete process.env.MP_ACCESS_TOKEN;
  r = await pide({ folio: "OMA-20261013-1017", entrega: "pickup", items: outfit });
  chk("sin token avisa y no inventa un pago", r.status === 503 && !r.init_point, r.error);
  process.env.MP_ACCESS_TOKEN = "token-de-prueba";

  console.log("\n=== INVENTARIO EN VIVO ===");
  mundo.config = { outfitDiscountPct: 10, inventarioEnVivo: true };
  mundo.catalogoVivo = [
    { clave: "JACKET-NEGRO-M", producto: "Jacket", tipo: "chamarra", color: "Negro", talla: "M", precio: 250, stock: 0 },
    { clave: "LEGGING-CAMPANA-NEGRO-M", producto: "Legging Campana", tipo: "legging", color: "Negro", talla: "M", precio: 280, stock: 3 }
  ];
  r = await pide({ folio: "OMA-20261013-1018", entrega: "pickup", items: [{ sku: "JACKET-NEGRO-M", cant: 1 }] });
  chk("lo que se agotó en el bazar ya no se puede pagar en la web", r.status === 409 && /Se agotó Jacket negro talla M/.test(r.error), r.error);
  r = await pide({ folio: "OMA-20261013-1019", entrega: "pickup", items: [{ sku: "LEGGING-CAMPANA-NEGRO-M", cant: 1 }] });
  chk("lo que sí hay se cobra, leyendo la base", r.status === 200 && r.total === 280 && r.inventario === "en vivo", r.inventario);
  mundo.baseCaida = true;
  r = await pide({ folio: "OMA-20261013-1020", entrega: "pickup", items: [{ sku: "JACKET-NEGRO-M", cant: 1 }] });
  chk("si la base no responde, la tienda sigue con su respaldo", r.status === 200 && r.inventario === "respaldo", r.inventario);
  mundo.baseCaida = false;

  console.log("\n=== AVISO DE PAGO → VENTA EN EL INVENTARIO ===");
  mundo.pagos["7001"] = { status: "approved", transaction_amount: 477, date_approved: "2026-10-13T18:00:00Z", external_reference: "OMA-20261013-1004",
    metadata: { pedido: "OMA-20261013-1004", piezas: "JACKET-NEGRO-M*1|LEGGING-CAMPANA-NEGRO-M*1", descuento: 53, envio: 0, total: 477 } };
  mundo.pagos["7002"] = { status: "rejected", metadata: { piezas: "JACKET-NEGRO-M*1" } };
  r = await avisa("7001");
  chk("sin la llave del inventario no registra nada, pero contesta bien", r.status === 200 && r.registrado === false && mundo.ventas.length === 0, r.motivo);
  process.env.ROMA_WEB_LLAVE = "llave-de-prueba";
  r = await avisa("7002");
  chk("un pago rechazado no vende nada", r.status === 200 && r.registrado === false && mundo.ventas.length === 0, r.estado);
  r = await avisa("9999");
  chk("un aviso de un pago que no existe no vende nada", r.status === 200 && r.registrado === false && mundo.ventas.length === 0, r.motivo);
  r = await avisa("7001");
  const v = (mundo.ventas[0] || {}).p_datos || {};
  chk("un pago aprobado se registra en el inventario", r.status === 200 && r.registrado === true && mundo.ventas.length === 1);
  chk("con sus piezas, su pedido y lo cobrado", JSON.stringify(v.items) === '[{"clave":"JACKET-NEGRO-M","cantidad":1},{"clave":"LEGGING-CAMPANA-NEGRO-M","cantidad":1}]'
    && v.pedido === "OMA-20261013-1004" && v.total_cobrado === 477 && v.descuento === 53 && v.referencia === "mercadopago:7001");
  r = await avisa("7001");
  chk("el mismo aviso dos veces no vende dos veces", r.repetida === true && mundo.ventas.length === 1);
  mundo.baseCaida = true;
  mundo.pagos["7003"] = { ...mundo.pagos["7001"] };
  r = await avisa("7003");
  chk("si el inventario no contesta, se pide a Mercado Pago que reintente", r.status === 503 && r.registrado === false);
  mundo.baseCaida = false;
  mundo.config = { inventarioEnVivo: false };
  r = await avisa("7003");
  chk("con el inventario en vivo apagado, el aviso no toca nada", r.status === 200 && r.registrado === false && mundo.ventas.length === 1, r.motivo);
  const otro = await aviso({ httpMethod: "POST", headers: {}, queryStringParameters: { topic: "merchant_order", id: "55" }, body: "" });
  chk("otros avisos de Mercado Pago se contestan sin hacer nada", otro.statusCode === 200 && JSON.parse(otro.body).registrado === false);

  console.log("\n=== MISMAS REGLAS QUE LA TIENDA ===");
  const z = sku => { const p = cat.inventario.find(x => x.sku === sku); return { ...p, cant: 1 }; };
  const t = tienda.calcula([z("PLAYERA-NEGRO-S"), z("LEGGING-CAMPANA-NEGRO-M")], "local", { ...mundo.config, outfitDiscountPct: 10, localDeliveryCost: 100, freeShippingFrom: 500 }, { codigo: "OUTFIT" });
  chk("playera + legging con OUTFIT y entrega local", t.sub === 430 && t.desc === 43 && t.envio === 100 && t.total === 487, JSON.stringify(t));

  console.log("\n" + (fallos === 0 ? "=== " + n + " PRUEBAS DE SERVIDOR, TODAS OK ===" : "=== " + fallos + " DE " + n + " FALLARON ==="));
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.error("La prueba se cayó:", e); process.exit(1); });
