/* Logica de precios del lado del servidor.
   El navegador NUNCA decide cuanto se cobra: aqui se recalcula todo
   a partir de data/catalogo.json y de la configuracion guardada. */
const catalogo = require("../../data/catalogo.json");

const PRECIOS = {};
for (const p of catalogo.inventario) PRECIOS[p.sku] = p;

/* Valores por defecto: los mismos de config.js. La configuracion real
   vive en Supabase y se consulta abajo cuando esta disponible. */
const CONFIG_DEFAULT = {
  localDeliveryCost: 100,
  nationalShippingCost: 200,
  freeShippingFrom: 500,
  outfitDiscountPct: 15,
  oroDiscountPct: 5,
  eliteDiscountPct: 10
};

async function leeConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return { ...CONFIG_DEFAULT };
  try {
    const r = await fetch(url + "/rest/v1/config?id=eq.1&select=datos", {
      headers: { apikey: key, Authorization: "Bearer " + key }
    });
    if (!r.ok) return { ...CONFIG_DEFAULT };
    const j = await r.json();
    const datos = (j && j[0] && j[0].datos) || {};
    return { ...CONFIG_DEFAULT, ...datos };
  } catch (e) {
    return { ...CONFIG_DEFAULT };
  }
}

/* Revisa que cada renglon exista y tenga existencia suficiente. */
function validaItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, error: "El carrito viene vacío" };
  }
  const limpio = [];
  for (const it of items) {
    const p = PRECIOS[it && it.sku];
    if (!p) return { ok: false, error: "Un producto del carrito ya no existe" };
    const cant = Math.floor(Number(it.cant));
    if (!(cant > 0) || cant > 99) return { ok: false, error: "Cantidad no válida" };
    if (cant > p.stock) {
      const pz = p.stock === 1 ? "1 pieza" : p.stock + " piezas";
      return { ok: false, error: p.stock === 0 ? ("Se agotó " + p.nombre + " " + p.color + " talla " + p.talla) : ((p.stock===1?"Solo queda ":"Solo quedan ") + pz + " de " + p.nombre + " " + p.color + " talla " + p.talla) };
    }
    limpio.push({ sku: p.sku, nombre: p.nombre, color: p.color, talla: p.talla, precio: p.precio, cant });
  }
  return { ok: true, items: limpio };
}

/* Recalcula el total. nivelPct llega del navegador (los puntos viven ahi),
   por eso se recorta al maximo que la tienda ofrece — nunca mas. */
function calcula(items, entrega, cfg, opciones) {
  const o = opciones || {};
  const sub = items.reduce((s, i) => s + i.precio * i.cant, 0);

  let desc = 0, etiqueta = "";
  const tieneArriba = items.some(i => /playera/i.test(i.nombre));
  const tieneAbajo = items.some(i => /leggings/i.test(i.nombre));
  if (o.codigo === "LOOK15" && tieneArriba && tieneAbajo) {
    desc = sub * (Number(cfg.outfitDiscountPct) || 0) / 100;
    etiqueta = "LOOK15";
  }
  const topeNivel = Math.max(Number(cfg.oroDiscountPct) || 0, Number(cfg.eliteDiscountPct) || 0);
  const nivelPct = Math.min(Math.max(Number(o.nivelPct) || 0, 0), topeNivel);
  const descNivel = sub * nivelPct / 100;
  if (descNivel > desc) { desc = descNivel; etiqueta = "Nivel"; }

  const costoBase = entrega === "pickup" ? 0
    : entrega === "nacional" ? Number(cfg.nationalShippingCost) || 0
    : Number(cfg.localDeliveryCost) || 0;
  const gratis = Number(cfg.freeShippingFrom) > 0 && (sub - desc) >= Number(cfg.freeShippingFrom);
  const envio = (sub > 0 && !gratis) ? costoBase : 0;

  const total = Math.round((Math.max(sub - desc, 0) + envio) * 100) / 100;
  return { sub, desc: Math.round(desc * 100) / 100, envio, total, etiqueta };
}

module.exports = { leeConfig, validaItems, calcula };
