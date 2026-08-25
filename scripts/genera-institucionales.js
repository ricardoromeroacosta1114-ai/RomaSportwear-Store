/* Genera las paginas de confianza (envios, cambios, terminos, privacidad,
   preguntas frecuentes, guia de tallas, sobre Roma, contacto) y el 404.

   REGLA: nada de politica comercial inventada. Todo sale de data/negocio.json.
   Lo que este vacio se publica como aviso visible de "pendiente de definir",
   nunca como un dato inventado. */
const fs = require("fs");
const path = require("path");
const raiz = path.join(__dirname, "..");
const { SITIO, estilos, pie, esc } = require("./genera-paginas.js");
const neg = JSON.parse(fs.readFileSync(path.join(raiz, "data/negocio.json"), "utf8"));
const fichas = JSON.parse(fs.readFileSync(path.join(raiz, "data/fichas.json"), "utf8"));

const vacio = v => v === null || v === undefined || (typeof v === "string" && !v.trim());
/* Marca visible cuando falta un dato real. No inventa nada. */
const PEND = txt => '<span class="pend">Pendiente: ' + esc(txt) + '</span>';
const dato = (v, queFalta) => vacio(v) ? PEND(queFalta) : esc(v);

function envoltura(o) {
  const ld = o.jsonld ? '<script type="application/ld+json">' + JSON.stringify(o.jsonld) + "</script>" : "";
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(o.titulo)} | ROMA Sportwear</title>
<meta name="description" content="${esc(o.desc)}">
<link rel="canonical" href="${SITIO}${o.ruta}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="ROMA Sportwear">
<meta property="og:locale" content="es_MX">
<meta property="og:title" content="${esc(o.titulo)} | ROMA Sportwear">
<meta property="og:description" content="${esc(o.desc)}">
<meta property="og:url" content="${SITIO}${o.ruta}">
<meta property="og:image" content="${SITIO}/icons/icon-512.png">
<meta name="twitter:card" content="summary">
<link rel="icon" href="${SITIO}/icons/icon-192.png">
<link href="${SITIO}/fonts/fonts.css" rel="stylesheet">
${ld}
<style>${estilos()}
.envoltura{max-width:760px}
h1{margin-bottom:4px}
p,li{font-size:15px}
.pend{display:inline-block;background:#FFF4D6;color:#7A5B00;border:1px solid #E8CE85;border-radius:8px;padding:2px 8px;font-size:13px;font-weight:600}
@media (prefers-color-scheme:dark){.pend{background:#3A2F12;color:#F0D68A;border-color:#5C4A1E}}
.aviso{background:var(--papel2);border-left:3px solid var(--oro);border-radius:12px;padding:14px 16px;margin:18px 0;font-size:14px}
dl{margin:0}dt{font-weight:700;margin-top:16px}dd{margin:4px 0 0}
</style>
</head>
<body>
<div class="envoltura">
  <nav class="migas" aria-label="Ruta"><a href="${SITIO}/">Inicio</a> &rsaquo; ${esc(o.titulo)}</nav>
  <h1>${esc(o.titulo)}</h1>
  ${o.cuerpo}
  ${pie()}
</div>
</body>
</html>`;
}

function escribe(ruta, html) {
  const d = path.join(raiz, ruta.replace(/^\/|\/$/g, ""));
  fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(path.join(d, "index.html"), html);
}

const wa = neg.whatsapp ? `<a href="https://wa.me/${esc(neg.whatsapp)}">WhatsApp</a>` : PEND("número de WhatsApp");
const correo = vacio(neg.correo) ? PEND("correo de contacto") : `<a href="mailto:${esc(neg.correo)}">${esc(neg.correo)}</a>`;

/* ---------------- ENVIOS ---------------- */
const e = neg.envios;
escribe("/envios/", envoltura({
  titulo: "Envíos", ruta: "/envios/",
  desc: "Costos y tiempos de entrega de ROMA Sportwear: entrega local en Mexicali y envío a todo México.",
  cuerpo: `
  <p>Hacemos entrega local en ${dato(e.entregaLocalCiudades, "ciudades de entrega local")} y enviamos a todo México.</p>
  <h2>Costos</h2>
  <table><tbody>
    <tr><th>Entrega local (${esc(e.entregaLocalCiudades || "Mexicali")})</th><td>$${e.costoLocal} MXN</td></tr>
    <tr><th>Envío nacional</th><td>$${e.costoNacional} MXN</td></tr>
    <tr><th>Envío gratis</th><td>En compras desde $${e.envioGratisDesde} MXN</td></tr>
  </tbody></table>
  <h2>Tiempos de entrega</h2>
  <table><tbody>
    <tr><th>Preparación del pedido</th><td>${dato(e.diasPreparacion, "días que tardas en preparar el pedido")}</td></tr>
    <tr><th>Entrega local</th><td>${dato(e.tiempoLocal, "tiempo de entrega local")}</td></tr>
    <tr><th>Envío nacional</th><td>${dato(e.tiempoNacional, "tiempo de envío nacional")}</td></tr>
    <tr><th>Paquetería</th><td>${dato(e.paqueteria, "qué paquetería usas")}</td></tr>
    <tr><th>Rastreo</th><td>${dato(e.rastreo, "cómo se entrega el número de rastreo")}</td></tr>
  </tbody></table>
  ${neg.recoleccion && neg.recoleccion.activa ? `
  <h2>Recoger en persona</h2>
  <p>También puedes recoger tu pedido en ${dato(neg.recoleccion.lugar, "lugar de recolección")}.</p>
  <p>Horario: ${dato(neg.recoleccion.horario, "horario de recolección")}.</p>
  <p>Dirección: ${dato(neg.recoleccion.direccion, "dirección exacta del punto de recolección")}</p>` : ""}
  <div class="aviso">Los costos y el monto de envío gratis mostrados aquí son los que la tienda aplica realmente al calcular tu pedido.</div>`
}));

/* ---------------- CAMBIOS ---------------- */
const c = neg.cambios;
const faltaPolitica = vacio(c.aceptaCambios) || vacio(c.diasParaCambio) || vacio(c.condiciones);
escribe("/cambios/", envoltura({
  titulo: "Cambios y devoluciones", ruta: "/cambios/",
  desc: "Política de cambios y devoluciones de ROMA Sportwear.",
  cuerpo: `
  ${faltaPolitica ? `<div class="aviso"><b>Esta política todavía no está definida.</b> ROMA aún no ha publicado sus condiciones de cambio y devolución. Escríbenos por ${wa} y te confirmamos tu caso en particular.</div>` : ""}
  <dl>
    <dt>¿Se aceptan cambios?</dt><dd>${vacio(c.aceptaCambios) ? PEND("definir si aceptas cambios") : (c.aceptaCambios ? "Sí." : "No.")}</dd>
    <dt>Plazo para solicitar un cambio</dt><dd>${vacio(c.diasParaCambio) ? PEND("definir cuántos días") : esc(c.diasParaCambio) + " días naturales desde que recibes tu pedido."}</dd>
    <dt>¿Se devuelve el dinero?</dt><dd>${vacio(c.aceptaDevolucionDinero) ? PEND("definir si devuelves dinero") : (c.aceptaDevolucionDinero ? "Sí." : "No, únicamente cambio por otra prenda o talla.")}</dd>
    <dt>Condiciones de la prenda</dt><dd>${dato(c.condiciones, "condiciones (etiquetas, sin uso, etc.)")}</dd>
    <dt>¿Quién paga el envío del cambio?</dt><dd>${dato(c.quienPagaEnvioCambio, "quién paga el envío del cambio")}</dd>
    <dt>Cómo solicitarlo</dt><dd>${dato(c.comoSolicitar, "el procedimiento para pedir un cambio")}</dd>
  </dl>
  <p>Para cualquier duda escríbenos por ${wa}.</p>`
}));

/* ---------------- GUIA DE TALLAS ---------------- */
const conMedidas = Object.entries(fichas).filter(([, f]) => f.guiaTallasCm && Object.keys(f.guiaTallasCm).length);
escribe("/guia-de-tallas/", envoltura({
  titulo: "Guía de tallas", ruta: "/guia-de-tallas/",
  desc: "Cómo elegir tu talla en ROMA Sportwear.",
  cuerpo: `
  <p>Todas nuestras prendas se manejan en tallas <b>S</b>, <b>M</b> y <b>L</b>.</p>
  ${conMedidas.length ? conMedidas.map(([n, f]) => `
    <h2>${esc(n)}</h2>
    <table><tbody>${Object.entries(f.guiaTallasCm).map(([t, med]) => `<tr><th>${esc(t)}</th><td>${esc(med)}</td></tr>`).join("")}</tbody></table>`).join("")
    : `<div class="aviso"><b>Las medidas en centímetros todavía no están publicadas.</b> No queremos darte medidas inventadas: en cuanto ROMA tome las medidas reales de cada prenda aparecerán aquí. Mientras tanto, escríbenos por ${wa} y te decimos qué talla te queda mejor.</div>`}
  <h2>¿Entre dos tallas?</h2>
  <p>Escríbenos por ${wa} con tu estatura y medidas y te orientamos sin compromiso.</p>`
}));

/* ---------------- PREGUNTAS FRECUENTES ---------------- */
const faqs = [
  ["¿Hacen envíos a todo México?", "Sí. Enviamos a todo el país y también hacemos entrega local en " + (e.entregaLocalCiudades || "Mexicali") + "."],
  ["¿Cuánto cuesta el envío?", "La entrega local cuesta $" + e.costoLocal + " MXN y el envío nacional $" + e.costoNacional + " MXN. El envío es gratis en compras desde $" + e.envioGratisDesde + " MXN."],
  ["¿Puedo comprar una sola prenda?", "Sí. Puedes comprar por prenda o combinar tu look completo y aprovechar el descuento de outfit."],
  ["¿Qué formas de pago aceptan?", "Pago con tarjeta a través de Mercado Pago, transferencia bancaria y efectivo al recoger."],
  ["¿Qué tallas manejan?", "S, M y L. La disponibilidad por talla y color se muestra en cada producto."]
];
escribe("/preguntas-frecuentes/", envoltura({
  titulo: "Preguntas frecuentes", ruta: "/preguntas-frecuentes/",
  desc: "Dudas comunes sobre compras, envíos, tallas y pagos en ROMA Sportwear.",
  jsonld: {
    "@context": "https://schema.org", "@type": "FAQPage",
    mainEntity: faqs.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } }))
  },
  cuerpo: `<dl>${faqs.map(([q, a]) => `<dt>${esc(q)}</dt><dd>${esc(a)}</dd>`).join("")}</dl>
  <p style="margin-top:22px">¿Tu duda no está aquí? Escríbenos por ${wa}.</p>`
}));

/* ---------------- SOBRE ROMA ---------------- */
escribe("/sobre-roma/", envoltura({
  titulo: "Sobre ROMA", ruta: "/sobre-roma/",
  desc: "ROMA Sportwear: ropa deportiva para mujer en Mexicali con envíos a todo México.",
  cuerpo: `
  <p>ROMA Sportwear es una tienda de ropa deportiva para mujer con base en ${esc(neg.ciudad)}. Vendemos por prenda y también armamos outfits completos.</p>
  <p>Puedes comprar en línea con entrega local en ${esc(e.entregaLocalCiudades || "Mexicali")} o envío a todo México.</p>
  <h2>Cómo contactarnos</h2>
  <table><tbody>
    <tr><th>WhatsApp</th><td>${wa}</td></tr>
    <tr><th>Correo</th><td>${correo}</td></tr>
    <tr><th>Instagram</th><td>${vacio(neg.instagram) ? PEND("Instagram") : `<a href="${esc(neg.instagram)}">Ver perfil</a>`}</td></tr>
    <tr><th>Horario de atención</th><td>${dato(neg.horarioAtencion, "horario de atención")}</td></tr>
  </tbody></table>`
}));

/* ---------------- CONTACTO ---------------- */
escribe("/contacto/", envoltura({
  titulo: "Contacto", ruta: "/contacto/",
  desc: "Contacta a ROMA Sportwear por WhatsApp, correo o redes sociales.",
  cuerpo: `
  <table><tbody>
    <tr><th>WhatsApp</th><td>${wa}</td></tr>
    <tr><th>Correo</th><td>${correo}</td></tr>
    <tr><th>Instagram</th><td>${vacio(neg.instagram) ? PEND("Instagram") : `<a href="${esc(neg.instagram)}">Ver perfil</a>`}</td></tr>
    <tr><th>Facebook</th><td>${vacio(neg.facebook) ? PEND("Facebook") : `<a href="${esc(neg.facebook)}">Ver página</a>`}</td></tr>
    <tr><th>Horario de atención</th><td>${dato(neg.horarioAtencion, "horario de atención")}</td></tr>
    <tr><th>Tiempo de respuesta</th><td>${dato(neg.tiempoRespuesta, "tiempo estimado de respuesta")}</td></tr>
    <tr><th>Ciudad</th><td>${esc(neg.ciudad)}</td></tr>
  </tbody></table>`
}));

/* ---------------- TERMINOS ---------------- */
escribe("/terminos/", envoltura({
  titulo: "Términos y condiciones", ruta: "/terminos/",
  desc: "Términos y condiciones de uso y compra en ROMA Sportwear.",
  cuerpo: `
  <div class="aviso">Estos términos describen cómo opera la tienda hoy. Los datos fiscales y la razón social están pendientes de que ROMA los proporcione; no se han inventado.</div>
  <h2>1. Quién vende</h2>
  <table><tbody>
    <tr><th>Nombre comercial</th><td>${esc(neg.nombre)}</td></tr>
    <tr><th>Razón social</th><td>${dato(neg.legal.razonSocial, "razón social")}</td></tr>
    <tr><th>RFC</th><td>${dato(neg.legal.rfc, "RFC")}</td></tr>
    <tr><th>Domicilio</th><td>${dato(neg.legal.domicilioFiscal, "domicilio fiscal")}</td></tr>
  </tbody></table>
  <h2>2. Precios y moneda</h2>
  <p>Todos los precios se muestran en pesos mexicanos (MXN) e incluyen los impuestos aplicables. El precio final de tu pedido se calcula en nuestro servidor al momento de pagar.</p>
  <h2>3. Disponibilidad</h2>
  <p>Las existencias mostradas corresponden al inventario real. Si una prenda se agota entre que la agregas al carrito y pagas, te lo avisamos y no se realiza el cobro.</p>
  <h2>4. Pagos</h2>
  <p>Los pagos con tarjeta se procesan a través de Mercado Pago. ROMA no almacena datos de tu tarjeta en ningún momento.</p>
  <h2>5. Envíos, cambios y devoluciones</h2>
  <p>Consulta <a href="${SITIO}/envios/">envíos</a> y <a href="${SITIO}/cambios/">cambios y devoluciones</a>.</p>
  <h2>6. Contacto</h2>
  <p>Para cualquier aclaración escríbenos por ${wa}.</p>`
}));

/* ---------------- PRIVACIDAD ---------------- */
escribe("/privacidad/", envoltura({
  titulo: "Aviso de privacidad", ruta: "/privacidad/",
  desc: "Aviso de privacidad de ROMA Sportwear: qué datos recabamos y para qué.",
  cuerpo: `
  <div class="aviso">El responsable legal de los datos está pendiente de que ROMA lo proporcione; no se ha inventado.</div>
  <h2>Responsable</h2>
  <p>${dato(neg.legal.responsableDatos, "nombre del responsable del tratamiento de datos")}, con domicilio en ${dato(neg.legal.domicilioFiscal, "domicilio")}.</p>
  <h2>Qué datos recabamos</h2>
  <p>Nombre completo, teléfono o WhatsApp, correo electrónico y dirección de entrega. Los usamos únicamente para procesar, enviar y dar seguimiento a tu pedido.</p>
  <h2>Datos de pago</h2>
  <p>ROMA <b>no</b> recibe ni almacena los datos de tu tarjeta. El cobro lo procesa Mercado Pago en su propia plataforma.</p>
  <h2>Dónde se guardan</h2>
  <p>Los datos de tu pedido se guardan en tu propio dispositivo y, cuando aplica, en la base de datos de la tienda (Supabase) para dar seguimiento al pedido.</p>
  <h2>Con quién se comparten</h2>
  <p>Únicamente con el proveedor de pagos (Mercado Pago) y con la paquetería que entrega tu pedido. No vendemos ni cedemos tus datos a terceros.</p>
  <h2>Tus derechos</h2>
  <p>Puedes solicitar acceso, rectificación, cancelación u oposición al tratamiento de tus datos escribiendo por ${wa} o a ${correo}.</p>`
}));

/* ---------------- 404 ---------------- */
fs.writeFileSync(path.join(raiz, "404.html"), envoltura({
  titulo: "Página no encontrada", ruta: "/404",
  desc: "La página que buscas no existe en ROMA Sportwear.",
  cuerpo: `
  <p>La dirección que abriste no existe o la prenda que buscabas ya no está publicada.</p>
  <a class="cta" href="${SITIO}/">Ir a la tienda</a>
  <a class="cta sec" href="${SITIO}/?vista=armador">Armar mi outfit</a>
  <h2 style="margin-top:30px">Quizá buscabas</h2>
  <ul>
    <li><a href="${SITIO}/envios/">Envíos</a></li>
    <li><a href="${SITIO}/cambios/">Cambios y devoluciones</a></li>
    <li><a href="${SITIO}/guia-de-tallas/">Guía de tallas</a></li>
    <li><a href="${SITIO}/preguntas-frecuentes/">Preguntas frecuentes</a></li>
    <li><a href="${SITIO}/contacto/">Contacto</a></li>
  </ul>`
}));

/* ---------------- reporte de pendientes ---------------- */
const pendientes = [];
const revisa = (obj, prefijo) => {
  for (const [k, v] of Object.entries(obj)) {
    if (k.startsWith("_")) continue;
    if (v && typeof v === "object" && !Array.isArray(v)) revisa(v, prefijo + k + ".");
    else if (vacio(v)) pendientes.push(prefijo + k);
  }
};
revisa(neg, "");
fs.writeFileSync(path.join(raiz, "data/pendientes.json"), JSON.stringify({ camposSinDefinir: pendientes }, null, 2));
console.log("paginas institucionales: 8 + 404 | datos del negocio sin definir:", pendientes.length);
