/* Aviso de pago de Mercado Pago (webhook).

   Mercado Pago llama aquí, de servidor a servidor, cada vez que un pago
   cambia de estado. Si el pago quedó APROBADO, la venta se registra en el
   inventario del punto de venta: así la pieza deja de ofrecerse en el bazar
   y en la web al mismo tiempo, aunque la clienta haya cerrado la ventana.

   No se confía en lo que diga el aviso: solo trae un número de pago, y el
   estado, el monto y las piezas se le preguntan a Mercado Pago con el token
   de la tienda. Un aviso falso no puede inventar un pago aprobado.

   Hace falta, además del token:
     ROMA_WEB_LLAVE   la llave que abre `roma_registrar_venta_web` en la base
   Sin esa llave (o con el inventario en vivo apagado) el aviso se recibe y
   se contesta bien, pero no registra nada: la tienda sigue funcionando como
   antes. Ver CONEXION-INVENTARIO.md */
const { leeConfig, supa } = require("./_tienda");

exports.handler = async (event) => {
  const q = event.queryStringParameters || {};
  let cuerpo = {};
  try { cuerpo = JSON.parse(event.body || "{}"); } catch (e) {}

  const tipo = cuerpo.type || cuerpo.topic || q.type || q.topic || "";
  const pagoId = String((cuerpo.data && cuerpo.data.id) || q["data.id"] || q.id || "").trim();
  /* Otros avisos (órdenes, pruebas del panel) se agradecen y ya. */
  if (!/payment/.test(tipo) || !/^\d{4,20}$/.test(pagoId)) return ok({ recibido: true, registrado: false });

  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) return ok({ recibido: true, registrado: false, motivo: "sin token" });

  let pago;
  try {
    const r = await fetch("https://api.mercadopago.com/v1/payments/" + pagoId, { headers: { Authorization: "Bearer " + token } });
    if (r.status === 404) return ok({ recibido: true, registrado: false, motivo: "pago inexistente" });
    if (!r.ok) return fallo("Mercado Pago respondió " + r.status);     // que lo reintente
    pago = await r.json();
  } catch (e) { return fallo("sin respuesta de Mercado Pago"); }

  if (pago.status !== "approved") return ok({ recibido: true, registrado: false, estado: pago.status });

  const meta = pago.metadata || {};
  const piezas = String(meta.piezas || "").split("|").map(p => {
    const [clave, cant] = p.split("*");
    return { clave: String(clave || "").trim().toUpperCase(), cantidad: Math.floor(Number(cant)) };
  }).filter(p => p.clave && p.cantidad > 0);
  if (!piezas.length) return ok({ recibido: true, registrado: false, motivo: "pago sin piezas de la tienda" });

  const llave = process.env.ROMA_WEB_LLAVE, s = supa();
  const cfg = await leeConfig();
  if (!llave || !s || cfg.inventarioEnVivo !== true) {
    return ok({ recibido: true, registrado: false, motivo: "inventario en vivo apagado" });
  }

  try {
    const r = await fetch(s.url + "/rest/v1/rpc/roma_registrar_venta_web", {
      method: "POST", headers: s.cab,
      body: JSON.stringify({
        p_llave: llave,
        p_datos: {
          referencia: "mercadopago:" + pagoId,
          pedido: String(meta.pedido || pago.external_reference || ""),
          fecha_hora: pago.date_approved || new Date().toISOString(),
          descuento: Number(meta.descuento) || 0,
          envio: Number(meta.envio) || 0,
          total_cobrado: Number(pago.transaction_amount) || null,
          items: piezas
        }
      })
    });
    const res = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error("El inventario no registró el pago", pagoId, r.status, res && res.message);
      return fallo("el inventario no registró la venta");                // Mercado Pago reintenta
    }
    return ok({ recibido: true, registrado: true, folio: res.folio, repetida: !!res.repetida, por_revisar: !!res.por_revisar });
  } catch (e) {
    console.error("Sin respuesta del inventario para el pago", pagoId, e.message);
    return fallo("sin respuesta del inventario");
  }
};

const cab = { "Content-Type": "application/json", "Cache-Control": "no-store" };
function ok(o) { return { statusCode: 200, headers: cab, body: JSON.stringify(o) }; }
function fallo(m) { return { statusCode: 503, headers: cab, body: JSON.stringify({ recibido: true, registrado: false, error: m }) }; }
