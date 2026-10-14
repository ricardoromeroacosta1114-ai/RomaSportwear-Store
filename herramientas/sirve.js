/* Sirve la tienda en esta computadora para revisarla antes de publicar.

     node herramientas/sirve.js          → http://localhost:3600

   Solo archivos: las funciones de pago (/.netlify/functions) no corren aquí,
   así que el pago con tarjeta se prueba en la vista previa de Netlify. */
const http = require("http"), fs = require("fs"), path = require("path");
const raiz = path.join(__dirname, "..");
const puerto = Number(process.argv[2]) || 3600;
const TIPOS = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg",
  ".svg": "image/svg+xml", ".woff2": "font/woff2", ".xml": "application/xml", ".txt": "text/plain; charset=utf-8"
};

http.createServer((req, res) => {
  let ruta = decodeURIComponent(req.url.split("?")[0]);
  if (ruta.startsWith("/.netlify/")) { res.writeHead(503, { "Content-Type": "application/json" }); return res.end('{"error":"Las funciones de pago no corren en local"}'); }
  let archivo = path.normalize(path.join(raiz, ruta));
  if (!archivo.startsWith(raiz)) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(archivo) && fs.statSync(archivo).isDirectory()) archivo = path.join(archivo, "index.html");
  if (!fs.existsSync(archivo)) { res.writeHead(404, { "Content-Type": TIPOS[".html"] }); return res.end(fs.readFileSync(path.join(raiz, "404.html"))); }
  res.writeHead(200, { "Content-Type": TIPOS[path.extname(archivo).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-store" });
  fs.createReadStream(archivo).pipe(res);
}).listen(puerto, () => console.log("OMA en http://localhost:" + puerto));
