/* Crea una preferencia de pago (Checkout Pro) en Mercado Pago.
   El Access Token vive solo en la variable de entorno MP_ACCESS_TOKEN de Netlify. */
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Método no permitido" }) };
  }

  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch (e) { return { statusCode: 400, body: JSON.stringify({ error: "JSON inválido" }) }; }

  const { folio, total } = body;
  if (!folio || !(Number(total) > 0)) {
    return { statusCode: 400, body: JSON.stringify({ error: "Falta folio o total" }) };
  }

  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) {
    return { statusCode: 500, body: JSON.stringify({ error: "Mercado Pago no está configurado (falta MP_ACCESS_TOKEN en Netlify)" }) };
  }

  const siteUrl = process.env.URL || ("https://" + event.headers.host);
  const preference = {
    items: [{
      title: "Pedido ROMA Sportwear #" + folio,
      quantity: 1,
      unit_price: Number(total),
      currency_id: "MXN"
    }],
    external_reference: folio,
    back_urls: {
      success: siteUrl + "/?mp=approved&folio=" + encodeURIComponent(folio),
      failure: siteUrl + "/?mp=failure&folio=" + encodeURIComponent(folio),
      pending: siteUrl + "/?mp=pending&folio=" + encodeURIComponent(folio)
    },
    auto_return: "approved"
  };

  try {
    const r = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify(preference)
    });
    const data = await r.json();
    if (!r.ok) {
      return { statusCode: 502, body: JSON.stringify({ error: data.message || "Mercado Pago rechazó la solicitud" }) };
    }
    return { statusCode: 200, body: JSON.stringify({ init_point: data.init_point }) };
  } catch (e) {
    return { statusCode: 502, body: JSON.stringify({ error: "No se pudo contactar a Mercado Pago" }) };
  }
};
