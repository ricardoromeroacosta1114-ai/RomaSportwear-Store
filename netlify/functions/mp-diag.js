/* Diagnostico TEMPORAL: dice a que cuenta de Mercado Pago pertenece el token
   y si es de prueba o real. Nunca devuelve el token. Borrar cuando ya no haga falta. */
exports.handler = async () => {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) return { statusCode: 500, body: JSON.stringify({ error: "Falta MP_ACCESS_TOKEN" }) };

  const prefijo = token.startsWith("TEST-") ? "TEST-" : token.startsWith("APP_USR-") ? "APP_USR-" : "otro";

  try {
    const r = await fetch("https://api.mercadopago.com/users/me", {
      headers: { "Authorization": "Bearer " + token }
    });
    const d = await r.json();
    if (!r.ok) {
      return { statusCode: 200, body: JSON.stringify({ prefijo_token: prefijo, error_mp: d.message || d.error }) };
    }
    return { statusCode: 200, body: JSON.stringify({
      prefijo_token: prefijo,
      user_id: d.id,
      nickname: d.nickname,
      site_id: d.site_id,
      tipo_cuenta: /^TEST/i.test(d.nickname || "") ? "USUARIO DE PRUEBA" : "cuenta real",
      tags: d.tags
    }) };
  } catch (e) {
    return { statusCode: 502, body: JSON.stringify({ error: "No se pudo contactar a Mercado Pago" }) };
  }
};
