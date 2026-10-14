/* Lógica de precios del lado del servidor.
   El navegador NUNCA decide cuánto se cobra: aquí se vuelve a calcular todo
   con el catálogo, la configuración y los códigos guardados.

   De dónde sale el catálogo:
     · con `inventarioEnVivo` encendido, de la base del punto de venta
       (función pública `roma_catalogo_web`), en el momento de pagar;
     · si no, o si la base no responde, de data/catalogo.json, que se genera
       del mismo archivo de mercancía que carga el punto de venta. */
const respaldo = require("../../data/catalogo.json");

/* Cómo llama la tienda a cada tipo del punto de venta. */
const ZONA_DE_TIPO = { chamarra: "capa", "blusa deportiva": "arriba", legging: "abajo" };

/* Valores por defecto: los mismos de config.js. La configuración real vive
   en Supabase y se consulta abajo. */
const CONFIG_DEFAULT = {
  localDeliveryCost: 100,
  nationalShippingCost: 200,
  freeShippingFrom: 500,
  outfitDiscountPct: 15,
  oroDiscountPct: 5,
  eliteDiscountPct: 10,
  inventarioEnVivo: false
};

function supa() {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_ANON_KEY;
  return url && key ? { url, cab: { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json" } } : null;
}

async function leeConfig() {
  const s = supa();
  if (!s) return { ...CONFIG_DEFAULT };
  try {
    const r = await fetch(s.url + "/rest/v1/config?id=eq.1&select=datos", { headers: s.cab });
    if (!r.ok) return { ...CONFIG_DEFAULT };
    const j = await r.json();
    return { ...CONFIG_DEFAULT, ...((j && j[0] && j[0].datos) || {}) };
  } catch (e) {
    return { ...CONFIG_DEFAULT };
  }
}

function indice(filas) { const o = {}; for (const p of filas) o[p.sku] = p; return o; }

/* Devuelve { fuente: "en vivo" | "respaldo", porSku }. */
async function leeCatalogo(cfg) {
  const s = supa();
  if (cfg && cfg.inventarioEnVivo === true && s) {
    try {
      const r = await fetch(s.url + "/rest/v1/rpc/roma_catalogo_web", { method: "POST", headers: s.cab, body: "{}" });
      if (r.ok) {
        const filas = await r.json();
        if (Array.isArray(filas) && filas.length) {
          return {
            fuente: "en vivo",
            porSku: indice(filas.map(f => ({
              sku: f.clave, nombre: f.producto, color: f.color, talla: f.talla,
              zona: ZONA_DE_TIPO[String(f.tipo || "").toLowerCase()] || "",
              precio: Number(f.precio), stock: Math.max(0, Number(f.stock) || 0)
            })))
          };
        }
      }
    } catch (e) { /* cae al respaldo */ }
  }
  return { fuente: "respaldo", porSku: indice(respaldo.inventario) };
}

/* Revisa que cada renglón exista y tenga existencia suficiente. */
function validaItems(items, porSku) {
  porSku = porSku || indice(respaldo.inventario);
  if (!Array.isArray(items) || items.length === 0) return { ok: false, error: "Tu bolsa llegó vacía" };
  if (items.length > 60) return { ok: false, error: "Demasiados artículos en un solo pedido" };
  const junto = {};
  for (const it of items) {
    const sku = it && typeof it.sku === "string" ? it.sku : "";
    const cant = Math.floor(Number(it && it.cant));
    if (!porSku[sku]) return { ok: false, error: "Una prenda de tu bolsa ya no está en la tienda. Actualiza la página." };
    if (!(cant > 0) || cant > 99) return { ok: false, error: "Cantidad no válida" };
    junto[sku] = (junto[sku] || 0) + cant;
  }
  const limpio = [];
  for (const [sku, cant] of Object.entries(junto)) {
    const p = porSku[sku];
    if (!(p.precio > 0)) return { ok: false, error: "Una prenda de tu bolsa no tiene precio publicado" };
    if (cant > p.stock) {
      const cual = p.nombre + " " + String(p.color).toLowerCase() + " talla " + p.talla;
      return { ok: false, error: p.stock <= 0 ? "Se agotó " + cual : (p.stock === 1 ? "Solo queda 1 pieza de " : "Solo quedan " + p.stock + " piezas de ") + cual };
    }
    limpio.push({ sku: p.sku, nombre: p.nombre, color: p.color, talla: p.talla, zona: p.zona || "", precio: p.precio, cant });
  }
  return { ok: true, items: limpio };
}

/* Un código del panel (tabla `promos`), solo si está activo. */
async function leePromo(codigo) {
  const s = supa();
  codigo = String(codigo || "").trim().toUpperCase();
  if (!s || !codigo || !/^[A-Z0-9_-]{2,30}$/.test(codigo)) return null;
  try {
    const r = await fetch(s.url + "/rest/v1/promos?codigo=eq." + encodeURIComponent(codigo) + "&activo=is.true&select=codigo,tipo,valor,minimo,vence", { headers: s.cab });
    if (!r.ok) return null;
    const j = await r.json();
    return (j && j[0]) || null;
  } catch (e) { return null; }
}

const redondea = n => Math.round(n * 100) / 100;

/* Recalcula el total con las mismas reglas que la tienda (store-app.js, totales()).
     opciones.codigo     "OUTFIT" (o el antiguo "LOOK15") o un código del panel
     opciones.promo      la fila de `promos` de ese código, si existe
     opciones.nivelPct   llega del navegador (los puntos viven ahí), por eso se
                         recorta al máximo que la tienda ofrece: nunca más. */
function calcula(items, entrega, cfg, opciones) {
  const o = opciones || {};
  const codigo = String(o.codigo || "").trim().toUpperCase();
  const sub = items.reduce((s, i) => s + i.precio * i.cant, 0);
  const hoy = new Date().toISOString().slice(0, 10);

  let desc = 0, etiqueta = "", envioGratis = false;
  const zonas = new Set(items.map(i => i.zona));
  const outfitCompleto = (zonas.has("arriba") || zonas.has("capa")) && zonas.has("abajo");
  if ((codigo === "OUTFIT" || codigo === "LOOK15") && outfitCompleto) {
    desc = sub * (Number(cfg.outfitDiscountPct) || 0) / 100; etiqueta = "outfit completo";
  } else if (o.promo && String(o.promo.codigo).toUpperCase() === codigo) {
    const p = o.promo, vigente = !p.vence || p.vence >= hoy, alcanza = !p.minimo || sub >= Number(p.minimo);
    if (vigente && alcanza) {
      if (p.tipo === "pct") { desc = sub * (Number(p.valor) || 0) / 100; etiqueta = codigo; }
      else if (p.tipo === "fijo") { desc = Math.min(Number(p.valor) || 0, sub); etiqueta = codigo; }
      else if (p.tipo === "envio") { envioGratis = true; etiqueta = codigo; }
    }
  }
  const topeNivel = Math.max(Number(cfg.oroDiscountPct) || 0, Number(cfg.eliteDiscountPct) || 0);
  const nivelPct = cfg.puntosEnabled === false ? 0 : Math.min(Math.max(Number(o.nivelPct) || 0, 0), topeNivel);
  const descNivel = sub * nivelPct / 100;
  if (descNivel > desc) { desc = descNivel; etiqueta = "nivel"; }
  desc = Math.min(Math.max(desc, 0), sub);

  const costoBase = entrega === "pickup" ? 0
    : entrega === "nacional" ? Number(cfg.nationalShippingCost) || 0
    : Number(cfg.localDeliveryCost) || 0;
  const gratis = envioGratis || (Number(cfg.freeShippingFrom) > 0 && (sub - desc) >= Number(cfg.freeShippingFrom));
  const envio = (sub > 0 && !gratis) ? costoBase : 0;

  return { sub: redondea(sub), desc: redondea(desc), envio: redondea(envio), total: redondea(Math.max(sub - desc, 0) + envio), etiqueta };
}

module.exports = { leeConfig, leeCatalogo, leePromo, validaItems, calcula, supa };
