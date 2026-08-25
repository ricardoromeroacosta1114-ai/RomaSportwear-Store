/* Genera una pagina indexable por variante en /productos/<slug>/,
   ademas de sitemap.xml y robots.txt.
   Regla: solo se publica informacion que exista de verdad en los datos.
   Material, ajuste, cuidados y guia de tallas salen de data/fichas.json;
   si estan vacios, esa seccion simplemente no aparece. */
const fs = require("fs");
const path = require("path");
const raiz = path.join(__dirname, "..");

const SITIO = (process.env.URL || process.env.SITIO_URL || "https://romasportwear.netlify.app").replace(/\/$/, "");
const cat = JSON.parse(fs.readFileSync(path.join(raiz, "data/catalogo.json"), "utf8"));
const fichas = JSON.parse(fs.readFileSync(path.join(raiz, "data/fichas.json"), "utf8"));

const esc = s => String(s == null ? "" : s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");
const slug = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const peso = n => "$" + Number(n).toLocaleString("es-MX", { minimumFractionDigits: 2 });

/* ---- agrupar el inventario en variantes (nombre + color) ---- */
const modelos = {};
for (const p of cat.inventario) {
  const id = slug(p.nombre + "-" + p.color);
  if (!modelos[id]) modelos[id] = {
    id, nombre: p.nombre, cat: p.cat, color: p.color, precio: p.precio,
    antes: cat.oferta[p.nombre] || null, nuevo: cat.nuevo.includes(p.nombre), tallas: []
  };
  modelos[id].tallas.push({ talla: p.talla, sku: p.sku, stock: p.stock });
}
const lista = Object.values(modelos);
const orden = { S: 1, M: 2, L: 3 };
lista.forEach(m => m.tallas.sort((a, b) => (orden[a.talla] || 9) - (orden[b.talla] || 9)));

const PIE = [
  ["/", "Tienda"], ["/envios/", "Envios"], ["/cambios/", "Cambios"],
  ["/guia-de-tallas/", "Guia de tallas"], ["/terminos/", "Terminos"], ["/privacidad/", "Privacidad"]
];

function estilos() {
  return `:root{--papel:#FAF8F3;--papel2:#F1EDE4;--tinta:#141210;--gris:#8A8177;--linea:#E4DED2;--oro:#B08D3E}
@media (prefers-color-scheme:dark){:root{--papel:#12100D;--papel2:#1B1815;--tinta:#F2EDE2;--gris:#8F877A;--linea:#2B2721;--oro:#C9A85C}}
*{box-sizing:border-box}
body{margin:0;background:var(--papel);color:var(--tinta);font-family:'Inter',system-ui,-apple-system,sans-serif;line-height:1.6}
.envoltura{max-width:960px;margin:0 auto;padding:22px 20px 60px}
a{color:inherit}
.migas{font-size:13px;color:var(--gris);margin-bottom:18px}
.migas a{text-decoration:none}
.migas a:hover,.migas a:focus{text-decoration:underline}
.tarjeta{display:grid;grid-template-columns:1fr;gap:26px}
@media(min-width:760px){.tarjeta{grid-template-columns:1fr 1fr;gap:40px;align-items:start}}
.figura{background:var(--papel2);border-radius:24px;aspect-ratio:4/4.6;display:flex;align-items:center;justify-content:center;overflow:hidden;padding:24px}
.figura img{max-width:72%;height:auto;object-fit:contain}
h1{font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:1.15;margin:0 0 6px}
h2{font-family:Georgia,'Times New Roman',serif;font-size:22px;margin:26px 0 8px}
.cat{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--gris);font-weight:700}
.precio{font-size:24px;font-weight:700;margin:10px 0}
.antes{color:var(--gris);font-size:16px;font-weight:400;margin-left:8px}
.etq{display:inline-block;font-size:11px;font-weight:700;letter-spacing:1px;padding:4px 10px;border-radius:100px;background:var(--oro);color:#fff;margin-left:8px;vertical-align:middle}
.rot{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--gris);font-weight:700;margin:20px 0 8px}
.tallas{display:flex;gap:8px;flex-wrap:wrap;padding:0;margin:0;list-style:none}
.tallas li{min-width:54px;text-align:center;padding:10px 12px;border-radius:12px;border:1.5px solid var(--linea);font-weight:600;font-size:14px}
.tallas li.no{opacity:.45;text-decoration:line-through}
.tallas li small{font-weight:600;color:var(--oro);font-size:10px;letter-spacing:.5px}
.cta{display:block;text-align:center;background:var(--tinta);color:var(--papel);border-radius:16px;padding:16px;font-weight:700;text-decoration:none;margin-top:22px}
.cta.sec{background:transparent;color:var(--tinta);border:1.5px solid var(--linea);margin-top:10px}
.cta:focus-visible,a:focus-visible{outline:3px solid var(--oro);outline-offset:2px}
table{border-collapse:collapse;width:100%;font-size:14px;margin-top:6px}
th,td{text-align:left;padding:9px 0;border-bottom:1px solid var(--linea);vertical-align:top}
th{color:var(--gris);font-weight:600;width:38%}
.nota{font-size:13px;color:var(--gris);margin-top:26px;border-top:1px solid var(--linea);padding-top:16px}
footer{margin-top:44px;border-top:1px solid var(--linea);padding-top:18px;font-size:13px;color:var(--gris)}
footer a{margin-right:16px;text-decoration:none;display:inline-block;padding:4px 0}`;
}

function pie() {
  return `<footer><nav>` + PIE.map(([h, t]) => `<a href="${SITIO}${h}">${esc(t)}</a>`).join("") + `</nav></footer>`;
}

/* ---- plantilla de pagina de producto ---- */
function pagina(m) {
  const f = fichas[m.nombre] || {};
  const hay = m.tallas.filter(t => t.stock > 0);
  const disponible = hay.length > 0;
  const tallasTxt = hay.map(t => t.talla).join(", ");
  const url = SITIO + "/productos/" + m.id + "/";
  const titulo = m.nombre + " " + m.color + " | ROMA Sportwear";
  const desc = (f.descripcion && f.descripcion.trim())
    ? f.descripcion.trim()
    : m.nombre + " color " + m.color + " de ROMA Sportwear. " +
      (disponible ? "Tallas disponibles: " + tallasTxt + "." : "Temporalmente agotada.") +
      " Precio " + peso(m.precio) + " MXN. Entrega local en Mexicali y envio a todo Mexico.";
  const meta = desc.length > 158 ? desc.slice(0, 155).trim() + "..." : desc;

  const ld = {
    "@context": "https://schema.org", "@type": "Product",
    name: m.nombre + " " + m.color, category: m.cat, color: m.color,
    brand: { "@type": "Brand", name: "ROMA Sportwear" },
    description: desc, image: [SITIO + "/icons/logo.png"], url,
    offers: {
      "@type": "Offer", url, priceCurrency: "MXN", price: String(m.precio),
      availability: disponible ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: "ROMA Sportwear" }
    }
  };
  const migas = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: SITIO + "/" },
      { "@type": "ListItem", position: 2, name: m.cat, item: SITIO + "/" },
      { "@type": "ListItem", position: 3, name: m.nombre + " " + m.color, item: url }
    ]
  };

  const ficha = [];
  if (f.material && f.material.trim()) ficha.push(["Material", f.material]);
  if (f.ajuste && f.ajuste.trim()) ficha.push(["Ajuste", f.ajuste]);
  if (f.cuidados && f.cuidados.trim()) ficha.push(["Cuidados", f.cuidados]);
  const cars = Array.isArray(f.caracteristicas) ? f.caracteristicas.filter(x => x && x.trim()) : [];

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(meta)}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="product">
<meta property="og:site_name" content="ROMA Sportwear">
<meta property="og:locale" content="es_MX">
<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(meta)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${SITIO}/icons/icon-512.png">
<meta property="product:price:amount" content="${m.precio}">
<meta property="product:price:currency" content="MXN">
<meta property="product:availability" content="${disponible ? "in stock" : "out of stock"}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(titulo)}">
<meta name="twitter:description" content="${esc(meta)}">
<meta name="twitter:image" content="${SITIO}/icons/icon-512.png">
<link rel="icon" href="${SITIO}/icons/icon-192.png">
<link href="${SITIO}/fonts/fonts.css" rel="stylesheet">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
<script type="application/ld+json">${JSON.stringify(migas)}</script>
<style>${estilos()}</style>
</head>
<body>
<div class="envoltura">
  <nav class="migas" aria-label="Ruta"><a href="${SITIO}/">Inicio</a> &rsaquo; ${esc(m.cat)} &rsaquo; ${esc(m.nombre)} ${esc(m.color)}</nav>
  <div class="tarjeta">
    <div class="figura">
      <img src="${SITIO}/icons/logo.png" alt="ROMA Sportwear. Aun no hay fotografia de ${esc(m.nombre)} en color ${esc(m.color)}." width="391" height="280">
    </div>
    <div>
      <div class="cat">${esc(m.cat)}</div>
      <h1>${esc(m.nombre)} &middot; ${esc(m.color)}</h1>
      <div class="precio">${peso(m.precio)} MXN${m.antes && m.antes > m.precio ? `<s class="antes">${peso(m.antes)}</s>` : ""}${m.nuevo ? `<span class="etq">NUEVO</span>` : ""}</div>
      <p>${esc(desc)}</p>

      <div class="rot">Tallas${disponible ? "" : " &mdash; agotado"}</div>
      <ul class="tallas">
        ${m.tallas.map(t => `<li class="${t.stock > 0 ? "" : "no"}">${esc(t.talla)}${t.stock > 0 && t.stock <= 2 ? `<br><small>ULTIMAS ${t.stock}</small>` : ""}</li>`).join("\n        ")}
      </ul>

      ${ficha.length ? `<div class="rot">Ficha</div><table><tbody>${ficha.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join("")}</tbody></table>` : ""}
      ${cars.length ? `<div class="rot">Caracteristicas</div><ul>${cars.map(c => `<li>${esc(c)}</li>`).join("")}</ul>` : ""}

      <a class="cta" href="${SITIO}/?producto=${esc(m.id)}">${disponible ? "Ver y agregar al carrito" : "Ver en la tienda"}</a>
      <a class="cta sec" href="${SITIO}/?vista=armador">Armar mi outfit completo</a>

      <p class="nota">Entrega local en Mexicali y envio a todo Mexico. Consulta <a href="${SITIO}/envios/">envios</a> y <a href="${SITIO}/cambios/">cambios y devoluciones</a>.</p>
    </div>
  </div>
  ${pie()}
</div>
</body>
</html>`;
}

/* ---- escribir paginas de producto ---- */
const dirProd = path.join(raiz, "productos");
fs.rmSync(dirProd, { recursive: true, force: true });
for (const m of lista) {
  const d = path.join(dirProd, m.id);
  fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(path.join(d, "index.html"), pagina(m));
}

/* ---- sitemap ---- */
const hoy = new Date().toISOString().slice(0, 10);
const estaticas = ["", "envios/", "cambios/", "guia-de-tallas/", "terminos/", "privacidad/", "preguntas-frecuentes/", "sobre-roma/", "contacto/"];
const urls = [
  ...estaticas.map(u => ({ loc: SITIO + "/" + u, pri: u === "" ? "1.0" : "0.5" })),
  ...lista.map(m => ({ loc: SITIO + "/productos/" + m.id + "/", pri: "0.8" }))
];
fs.writeFileSync(path.join(raiz, "sitemap.xml"),
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  urls.map(u => "  <url><loc>" + u.loc + "</loc><lastmod>" + hoy + "</lastmod><priority>" + u.pri + "</priority></url>").join("\n") +
  "\n</urlset>\n");

/* ---- robots ---- */
fs.writeFileSync(path.join(raiz, "robots.txt"),
  "User-agent: *\nAllow: /\nDisallow: /.netlify/\n\nSitemap: " + SITIO + "/sitemap.xml\n");

console.log("paginas de producto:", lista.length, "| sitemap:", urls.length, "URLs");
module.exports = { lista, SITIO, estilos, pie, esc, peso };
