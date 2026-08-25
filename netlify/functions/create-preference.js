/* Crea una preferencia de pago (Checkout Pro) en Mercado Pago.
   El Access Token vive solo en la variable de entorno MP_ACCESS_TOKEN.
   El total NO se acepta del navegador: se recalcula aqui a partir del
   catalogo y de la configuracion de la tienda. */
const { leeConfig, validaItems, calcula } = require("./_tienda");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Método no permitido" });
  }

  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch (e) { return json(400, { error: "JSON inválido" }); }

  const { folio, items, entrega, codigo, nivelPct } = body;
  if (!folio || typeof folio !== "string" || folio.length > 40) {
    return json(400, { error: "Folio no válido" });
  }

  const v = validaItems(items);
  if (!v.ok) return json(409, { error: v.error });

  const cfg = await leeConfig();
  const t = calcula(v.items, entrega, cfg, { codigo, nivelPct });
  if (!(t.total > 0)) return json(409, { error: "El total del pedido no es válido" });

  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) {
    return json(503, { error: "El pago con tarjeta no está disponible por ahora. Elige otro método." });
  }

  const siteUrl = process.env.URL || ("https://" + event.headers.host);
  const volver = est => siteUrl + "/?mp=" + est + "&folio=" + encodeURIComponent(folio);

  /* Se mandan los renglones reales para que la clienta vea su desglose en
     Mercado Pago; el descuento y el envio van como renglones aparte. */
  const mpItems = v.items.map(i => ({
    title: i.nombre + " " + i.color + " · Talla " + i.talla,
    quantity: i.cant,
    unit_price: i.precio,
    currency_id: "MXN"
  }));
  if (t.desc > 0) mpItems.push({ title: "Descuento " + (t.etiqueta || ""), quantity: 1, unit_price: -t.desc, currency_id: "MXN" });
  if (t.envio > 0) mpItems.push({ title: "Envío", quantity: 1, unit_price: t.envio, currency_id: "MXN" });

  const preference = {
    items: mpItems,
    external_reference: folio,
    statement_descriptor: "ROMA SPORTWEAR",
    back_urls: { success: volver("approved"), failure: volver("failure"), pending: volver("pending") },
    auto_return: "approved"
  };

  try {
    const r = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify(preference)
    });
    const data = await r.json();
    if (!r.ok || !data.init_point) {
      console.error("MP rechazo la preferencia:", r.status, data && data.message);
      return json(502, { error: "Mercado Pago no pudo iniciar el pago. Intenta de nuevo." });
    }
    return json(200, { init_point: data.init_point, total: t.total });
  } catch (e) {
    console.error("Error contactando MP:", e.message);
    return json(502, { error: "No se pudo contactar a Mercado Pago" });
  }
};

function json(statusCode, obj) {
  return { statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(obj) };
}
