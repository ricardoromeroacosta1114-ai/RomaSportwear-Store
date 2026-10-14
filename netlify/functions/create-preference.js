/* Crea una preferencia de pago (Checkout Pro) en Mercado Pago.
   El Access Token vive solo en la variable de entorno MP_ACCESS_TOKEN.
   El total NO se acepta del navegador: se vuelve a calcular aquí con el
   catálogo, la configuración y los códigos de la tienda. */
const { leeConfig, leeCatalogo, leePromo, validaItems, calcula } = require("./_tienda");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Método no permitido" });

  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch (e) { return json(400, { error: "La solicitud no se pudo leer" }); }

  const { folio, items, entrega, codigo, nivelPct } = body;
  if (!folio || typeof folio !== "string" || !/^[A-Za-z0-9-]{4,40}$/.test(folio)) {
    return json(400, { error: "El número de pedido no es válido" });
  }
  if (["pickup", "local", "nacional"].indexOf(entrega) < 0) {
    return json(400, { error: "Elige una forma de entrega" });
  }

  const cfg = await leeConfig();
  const cat = await leeCatalogo(cfg);
  const v = validaItems(items, cat.porSku);
  if (!v.ok) return json(409, { error: v.error });

  const cod = String(codigo || "").trim().toUpperCase();
  const promo = cod && cod !== "OUTFIT" && cod !== "LOOK15" ? await leePromo(cod) : null;
  const t = calcula(v.items, entrega, cfg, { codigo: cod, promo, nivelPct });
  if (!(t.total > 0)) return json(409, { error: "El total del pedido no es válido" });

  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) return json(503, { error: "El pago con tarjeta no está disponible por ahora. Elige otra forma de pago." });

  /* Se vuelve al mismo sitio desde el que se compró (producción o vista previa). */
  const sitio = "https://" + (event.headers["x-forwarded-host"] || event.headers.host);
  const volver = est => sitio + "/?mp=" + est + "&folio=" + encodeURIComponent(folio);

  /* Los renglones reales, para que la clienta vea su desglose en Mercado Pago.
     Con descuento va un solo renglón con el importe ya rebajado: Mercado Pago
     no admite renglones con precio negativo y así el total cuadra al centavo. */
  const nombreDe = i => i.nombre + " " + String(i.color).toLowerCase() + ", talla " + i.talla;
  const mpItems = t.desc > 0
    ? [{ id: folio, title: ("OMA: " + v.items.map(i => (i.cant > 1 ? i.cant + " × " : "") + nombreDe(i)).join(" + ")).slice(0, 250),
         description: "Incluye descuento " + (t.etiqueta || "") + " de $" + t.desc.toFixed(2),
         quantity: 1, unit_price: Math.round((t.sub - t.desc) * 100) / 100, currency_id: "MXN", category_id: "fashion" }]
    : v.items.map(i => ({ id: i.sku, title: nombreDe(i), quantity: i.cant, unit_price: i.precio, currency_id: "MXN", category_id: "fashion" }));
  if (t.envio > 0) mpItems.push({ title: "Entrega", quantity: 1, unit_price: t.envio, currency_id: "MXN" });

  const preference = {
    items: mpItems,
    external_reference: folio,
    statement_descriptor: "OMA SPORTWEAR",
    back_urls: { success: volver("approved"), failure: volver("failure"), pending: volver("pending") },
    auto_return: "approved",
    /* Aviso de servidor a servidor: es lo que registra la venta en el
       inventario aunque la clienta cierre la ventana después de pagar. */
    notification_url: sitio + "/.netlify/functions/mp-aviso",
    /* Lo necesario para registrar la venta al confirmarse el pago. */
    metadata: {
      pedido: folio,
      piezas: v.items.map(i => i.sku + "*" + i.cant).join("|"),
      descuento: t.desc, envio: t.envio, total: t.total
    }
  };

  try {
    const r = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify(preference)
    });
    const data = await r.json();
    if (!r.ok || !data.init_point) {
      console.error("Mercado Pago rechazó la preferencia:", r.status, data && data.message);
      return json(502, { error: "Mercado Pago no pudo iniciar el pago. Intenta de nuevo." });
    }
    return json(200, { init_point: data.init_point, total: t.total, inventario: cat.fuente });
  } catch (e) {
    console.error("Error contactando a Mercado Pago:", e.message);
    return json(502, { error: "No se pudo contactar a Mercado Pago" });
  }
};

function json(statusCode, obj) {
  return { statusCode, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify(obj) };
}
