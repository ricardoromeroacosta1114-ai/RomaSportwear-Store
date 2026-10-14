/* Genera una página indexable por color en /productos/<slug>/, además de
   sitemap.xml, robots.txt y las redirecciones de las rutas antiguas.

   Regla: solo se publica lo que existe de verdad en los datos. Material,
   ajuste, cuidados y medidas salen de data/fichas.json; si están vacíos,
   esa sección no aparece. */
const fs = require("fs");
const path = require("path");
const { slug } = require("./claves.js");
const raiz = path.join(__dirname, "..");

const SITIO = (process.env.SITIO_URL || process.env.URL || "https://romasportwear.netlify.app").replace(/\/$/, "");
const cat = JSON.parse(fs.readFileSync(path.join(raiz, "data/catalogo.json"), "utf8"));
const fichas = JSON.parse(fs.readFileSync(path.join(raiz, "data/fichas.json"), "utf8"));

const esc = s => String(s == null ? "" : s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const peso = n => "$" + Number(n).toLocaleString("es-MX", { minimumFractionDigits: 2 });

/* ---- variantes (una por talla) -> modelos (producto + color) ---- */
const modelos = {};
for (const p of cat.inventario) {
  const id = slug(p.nombre + " " + p.color);
  if (!modelos[id]) modelos[id] = { id, nombre: p.nombre, cat: p.cat, color: p.color, hex: p.hex, precio: p.precio,
    antes: (cat.oferta || {})[p.nombre] || null, tallas: [] };
  modelos[id].tallas.push({ talla: p.talla, sku: p.sku, stock: p.stock });
}
const lista = Object.values(modelos);
const conImagen = id => fs.existsSync(path.join(raiz, "prendas", id + ".webp"));
const conCompartir = id => fs.existsSync(path.join(raiz, "prendas", "og", id + ".jpg"));

const PIE = [
  ["/", "Tienda"], ["/envios/", "Envíos"], ["/cambios/", "Cambios y devoluciones"], ["/guia-de-tallas/", "Guía de tallas"],
  ["/preguntas-frecuentes/", "Preguntas frecuentes"], ["/sobre-oma/", "Sobre OMA"], ["/contacto/", "Contacto"],
  ["/terminos/", "Términos"], ["/privacidad/", "Aviso de privacidad"]
];

/* Estilos de las páginas sueltas (producto e institucionales): misma paleta
   y tipografías que la tienda, sin depender de su JavaScript. */
function estilos() {
  return `:root{--fondo:#F7F3ED;--panel:#F0E9DE;--texto:#191919;--texto2:#655D54;--acento:#B79A70;--acento-texto:#6F5937;--linea:#DCD0BF;--sobre:#F7F3ED}
@media (prefers-color-scheme:dark){:root{--fondo:#191919;--panel:#242220;--texto:#F7F3ED;--texto2:#B8AEA2;--acento-texto:#C9AE86;--linea:#38342F;--sobre:#191919}
  .logo-claro{display:none}.logo-oscuro{display:block!important}}
*{box-sizing:border-box}
body{margin:0;background:var(--fondo);color:var(--texto);font-family:"Montserrat",system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.65;-webkit-font-smoothing:antialiased}
a{color:inherit}
img{max-width:100%;display:block}
.logo-oscuro{display:none}
.cab{display:flex;justify-content:center;padding:18px 20px;border-bottom:1px solid var(--linea)}
.cab img{height:26px;width:auto}
.envoltura{max-width:1080px;margin:0 auto;padding:26px 20px 60px}
.migas{font-size:13px;color:var(--texto2);margin-bottom:22px}
.migas a{text-underline-offset:4px;text-decoration-color:var(--linea)}
h1,h2{font-family:"Cormorant Garamond","Times New Roman",serif;font-weight:500;line-height:1.08;margin:0}
h1{font-size:clamp(34px,5vw,50px)}
h2{font-size:26px;margin-top:34px;margin-bottom:10px}
.tarjeta{display:grid;gap:26px}
@media(min-width:800px){.tarjeta{grid-template-columns:1.05fr .95fr;gap:52px;align-items:start}}
.figura{background:var(--panel);aspect-ratio:4/5;display:grid;place-items:center;overflow:hidden}
.figura img{width:100%;height:100%;object-fit:contain;padding:8%}
.precio{font-size:19px;margin:8px 0 14px;font-variant-numeric:tabular-nums}
.precio s{color:var(--texto2);font-size:15px;margin-left:10px}
.rot{font-size:13px;color:var(--texto2);margin:24px 0 10px}
.rot b{color:var(--texto);font-weight:600}
.tallas,.muestras{display:flex;gap:8px;flex-wrap:wrap;padding:0;margin:0;list-style:none}
.tallas li{min-width:54px;text-align:center;padding:10px 12px;border:1px solid var(--linea);border-radius:2px;font-size:13.5px;font-weight:500}
.tallas li.no{color:var(--texto2);opacity:.55;text-decoration:line-through}
.tallas li small{display:block;font-size:11px;font-weight:500;color:var(--acento-texto)}
.muestras a{display:block;width:30px;height:30px;border-radius:50%;box-shadow:inset 0 0 0 1px rgb(25 25 25 / .18);outline-offset:4px}
.muestras a[aria-current]{outline:1px solid var(--texto)}
.cta{display:flex;align-items:center;justify-content:center;min-height:50px;padding:0 24px;background:var(--texto);color:var(--sobre);border:1px solid var(--texto);border-radius:2px;font-size:13.5px;font-weight:600;letter-spacing:.04em;text-decoration:none;margin-top:26px}
.cta.sec{background:transparent;color:var(--texto);border-color:var(--linea);margin-top:10px}
a:focus-visible{outline:2px solid var(--acento-texto);outline-offset:3px}
table{border-collapse:collapse;width:100%;font-size:14px;margin-top:6px}
th,td{text-align:left;padding:10px 0;border-bottom:1px solid var(--linea);vertical-align:top}
th{color:var(--texto2);font-weight:500;width:40%;padding-right:16px}
.nota{font-size:13px;color:var(--texto2);margin-top:22px}
footer{margin-top:56px;border-top:1px solid var(--linea);padding-top:22px;font-size:13px;color:var(--texto2)}
footer nav{display:flex;flex-wrap:wrap;gap:8px 20px}
footer a{text-decoration:none}
footer a:hover{text-decoration:underline;text-underline-offset:4px}
footer p{margin:16px 0 0;font-size:12px}`;
}
function cabecera() {
  return `<header class="cab"><a href="/" aria-label="OMA Sportwear, ir a la tienda">
  <img class="logo-claro" src="/marca/oma-claro.webp" width="736" height="220" alt="OMA Sportwear">
  <img class="logo-oscuro" src="/marca/oma-oscuro.webp" width="727" height="220" alt="OMA Sportwear"></a></header>`;
}
function pie() {
  return `<footer><nav aria-label="Información">` + PIE.map(([h, t]) => `<a href="${h}">${esc(t)}</a>`).join("") +
    `</nav><p>OMA Sportwear, Mexicali, Baja California. Precios en pesos mexicanos. Las imágenes de prenda son ilustraciones 3D de referencia.</p></footer>`;
}
function cabezaComun() {
  return `<link rel="icon" type="image/png" href="/icons/favicon.png">
<link rel="preload" as="font" type="font/woff2" href="/fonts/cormorant-garamond-latin-wght.woff2" crossorigin>
<link href="/fonts/fonts.css" rel="stylesheet">`;
}

/* ---- página de producto ---- */
function pagina(m) {
  const f = fichas[m.nombre] || {};
  const hay = m.tallas.filter(t => t.stock > 0);
  const disponible = hay.length > 0;
  const url = SITIO + "/productos/" + m.id + "/";
  const titulo = m.nombre + " " + m.color.toLowerCase() + " | OMA Sportwear";
  const desc = (f.descripcion && f.descripcion.trim())
    ? f.descripcion.trim()
    : m.nombre + " color " + m.color.toLowerCase() + " de OMA Sportwear. " +
      (disponible ? "Tallas disponibles: " + hay.map(t => t.talla).join(", ") + "." : "Agotada por ahora.") +
      " " + peso(m.precio) + " MXN. Entrega local en Mexicali y envíos a todo México.";
  const meta = desc.length > 158 ? desc.slice(0, 155).trim() + "..." : desc;
  const imagen = conImagen(m.id) ? SITIO + "/prendas/" + m.id + ".webp" : SITIO + "/marca/oma-compartir.jpg";
  const compartir = conCompartir(m.id) ? SITIO + "/prendas/og/" + m.id + ".jpg" : SITIO + "/marca/oma-compartir.jpg";
  const hermanos = lista.filter(x => x.nombre === m.nombre);

  const ld = {
    "@context": "https://schema.org", "@type": "Product",
    name: m.nombre + " " + m.color, category: m.cat, color: m.color, sku: m.id.toUpperCase(),
    brand: { "@type": "Brand", name: "OMA Sportwear" },
    description: desc, image: [compartir], url,
    offers: {
      "@type": "Offer", url, priceCurrency: "MXN", price: String(m.precio),
      availability: disponible ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: "OMA Sportwear" }
    }
  };
  const migas = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Tienda", item: SITIO + "/" },
      { "@type": "ListItem", position: 2, name: m.nombre, item: SITIO + "/productos/" + hermanos[0].id + "/" },
      { "@type": "ListItem", position: 3, name: m.color, item: url }
    ]
  };
  const ficha = [];
  if (f.material && f.material.trim()) ficha.push(["Material", f.material]);
  if (f.ajuste && f.ajuste.trim()) ficha.push(["Ajuste", f.ajuste]);
  if (f.cuidados && f.cuidados.trim()) ficha.push(["Cuidados", f.cuidados]);
  const cars = Array.isArray(f.caracteristicas) ? f.caracteristicas.filter(x => x && x.trim()) : [];

  return `<!doctype html>
<html lang="es-MX">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(meta)}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="product">
<meta property="og:site_name" content="OMA Sportwear">
<meta property="og:locale" content="es_MX">
<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(meta)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${compartir}">
<meta property="product:price:amount" content="${m.precio}">
<meta property="product:price:currency" content="MXN">
<meta property="product:availability" content="${disponible ? "in stock" : "out of stock"}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(titulo)}">
<meta name="twitter:description" content="${esc(meta)}">
<meta name="twitter:image" content="${compartir}">
${cabezaComun()}
<script type="application/ld+json">${JSON.stringify(ld)}</script>
<script type="application/ld+json">${JSON.stringify(migas)}</script>
<style>${estilos()}</style>
</head>
<body>
${cabecera()}
<main class="envoltura">
  <nav class="migas" aria-label="Ruta"><a href="/?vista=tienda">Tienda</a> / ${esc(m.cat)}</nav>
  <div class="tarjeta">
    <div class="figura">
      <img src="${imagen.replace(SITIO, "")}" alt="${esc(m.nombre)} color ${esc(m.color.toLowerCase())}. Ilustración 3D de referencia de OMA Sportwear." width="1000" height="1000" fetchpriority="high">
    </div>
    <div>
      <h1>${esc(m.nombre)}</h1>
      <p class="precio">${peso(m.precio)} MXN${m.antes && m.antes > m.precio ? `<s>${peso(m.antes)}</s>` : ""}</p>

      <p class="rot">Color: <b>${esc(m.color)}</b></p>
      <ul class="muestras">
        ${hermanos.map(h => `<li><a href="/productos/${h.id}/" style="background:${h.hex}" title="${esc(h.color)}" aria-label="${esc(h.nombre)} color ${esc(h.color.toLowerCase())}"${h.id === m.id ? ' aria-current="page"' : ""}></a></li>`).join("\n        ")}
      </ul>

      <p class="rot">Tallas${disponible ? "" : " (agotada por ahora)"}</p>
      <ul class="tallas">
        ${m.tallas.map(t => `<li class="${t.stock > 0 ? "" : "no"}">${esc(t.talla)}${t.stock > 0 && t.stock <= 2 ? `<small>${t.stock === 1 ? "queda 1" : "quedan " + t.stock}</small>` : ""}</li>`).join("\n        ")}
      </ul>

      ${ficha.length ? `<h2>Detalles</h2><table><tbody>${ficha.map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td>${esc(v)}</td></tr>`).join("")}</tbody></table>` : ""}
      ${cars.length ? `<ul>${cars.map(c => `<li>${esc(c)}</li>`).join("")}</ul>` : ""}

      <a class="cta" href="/?producto=${esc(m.id)}">${disponible ? "Elegir talla y comprar" : "Ver en la tienda"}</a>
      <a class="cta sec" href="/?vista=armador">Armar un outfit en el maniquí</a>

      <p class="nota">Entrega local en Mexicali y envíos a todo México. Consulta <a href="/envios/">envíos</a>, <a href="/cambios/">cambios y devoluciones</a> y la <a href="/guia-de-tallas/">guía de tallas</a>. La imagen es una ilustración 3D de referencia con el tono medido de la tela.</p>
    </div>
  </div>
  ${pie()}
</main>
</body>
</html>`;
}

/* ---- escribir páginas de producto ---- */
const dirProd = path.join(raiz, "productos");
fs.rmSync(dirProd, { recursive: true, force: true });
for (const m of lista) {
  const d = path.join(dirProd, m.id);
  fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(path.join(d, "index.html"), pagina(m));
}

/* ---- sitemap ---- */
const hoy = new Date().toISOString().slice(0, 10);
const estaticas = ["", "envios/", "cambios/", "guia-de-tallas/", "terminos/", "privacidad/", "preguntas-frecuentes/", "sobre-oma/", "contacto/"];
const urls = [
  ...estaticas.map(u => ({ loc: SITIO + "/" + u, pri: u === "" ? "1.0" : "0.5" })),
  ...lista.map(m => ({ loc: SITIO + "/productos/" + m.id + "/", pri: "0.8" }))
];
fs.writeFileSync(path.join(raiz, "sitemap.xml"),
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  urls.map(u => "  <url><loc>" + u.loc + "</loc><lastmod>" + hoy + "</lastmod><priority>" + u.pri + "</priority></url>").join("\n") +
  "\n</urlset>\n");

fs.writeFileSync(path.join(raiz, "robots.txt"),
  "User-agent: *\nAllow: /\nDisallow: /.netlify/\n\nSitemap: " + SITIO + "/sitemap.xml\n");

/* ---- rutas antiguas de ROMA: no deben romperse ----
   Cada prenda vieja lleva a su equivalente de hoy; lo que ya no se vende,
   a la tienda. */
const viejas = JSON.parse(fs.readFileSync(path.join(raiz, "data/rutas-antiguas.json"), "utf8"));
const redir = ["# GENERADO por scripts/genera-paginas.js — rutas de la tienda anterior (ROMA)", "/sobre-roma/*  /sobre-oma/  301"];
let rotas = 0;
for (const [vieja, nueva] of Object.entries(viejas.productos)) {
  const destino = nueva && modelos[nueva] ? "/productos/" + nueva + "/" : "/?vista=tienda";
  if (nueva && !modelos[nueva]) rotas++;
  redir.push("/productos/" + vieja + "/*  " + destino + "  301");
}
fs.writeFileSync(path.join(raiz, "_redirects"), redir.join("\n") + "\n");

console.log("páginas de producto:", lista.length, "| sitemap:", urls.length, "URLs | redirecciones:", redir.length - 1 +
  (rotas ? " (" + rotas + " apuntaban a un color que ya no existe y van a la tienda)" : ""));
module.exports = { lista, SITIO, estilos, pie, cabecera, cabezaComun, esc, peso };
