/* Toma capturas de la tienda (servida con herramientas/sirve.js) para revisarla.

     node herramientas/capturas.js <carpeta de salida> [movil|escritorio] [claro|oscuro] [vista ...]

   Usa el Chrome instalado. Anota los errores de consola de cada vista. */
const path = require("path"), fs = require("fs");
const puppeteer = require(path.join(__dirname, "..", "..", "roma-inventario", "node_modules", "puppeteer-core"));
const salida = process.argv[2] || path.join(__dirname, "capturas");
const equipo = process.argv[3] || "movil", tema = process.argv[4] || "claro";
const pedidas = process.argv.slice(5);
const BASE = "http://localhost:3600";
const CHROME = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"].find(p => fs.existsSync(p));

const PANTALLA = equipo === "escritorio"
  ? { width: 1440, height: 900, deviceScaleFactor: 1 }
  : { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

/* nombre → cómo llegar */
const VISTAS = {
  portada: async p => {},
  tienda: async p => p.evaluate(() => go("tienda")),
  ficha: async p => p.evaluate(() => go("producto", "jacket-rosa-barbie")),
  "ficha-maniqui": async p => p.evaluate(() => { go("producto", "legging-campana-cafe"); fichaVista = "maniqui"; render(); }),
  armador: async p => p.evaluate(() => { outfit = { capa: "jacket-rosa-barbie", arriba: "playera-blanco-marfil", abajo: "legging-campana-negro" }; outfitTallas = {}; go("armador"); }),
  "armador-sin-jacket": async p => p.evaluate(() => { outfit = { capa: null, arriba: "playera-amarillo", abajo: "legging-campana-azul-lago" }; outfitTallas = {}; go("armador"); }),
  /* Como lo usa una clienta: baja a los colores y toca varios. */
  "armador-tocando": async p => {
    await p.evaluate(() => { outfit = { capa: null, arriba: null, abajo: null }; outfitTallas = {}; go("armador"); });
    await new Promise(r => setTimeout(r, 900));
    await p.evaluate(() => { armaColor("abajo", "legging-campana-morado"); armaColor("arriba", "playera-verde-claro"); armaColor("capa", "jacket-azul-gris"); armaTalla("capa", "M"); });
    await p.evaluate(() => window.scrollTo(0, 150));
  },
  bolsa: async p => p.evaluate(() => { carrito = [{ sku: "JACKET-NEGRO-M", cant: 1 }, { sku: "LEGGING-CAMPANA-NEGRO-M", cant: 1 }]; codigoAplicado = "OUTFIT"; go("carrito"); }),
  pago: async p => p.evaluate(() => { carrito = [{ sku: "JACKET-NEGRO-M", cant: 1 }, { sku: "LEGGING-CAMPANA-NEGRO-M", cant: 1 }]; go("checkout"); }),
  cuenta: async p => p.evaluate(() => go("perfil")),
  menu: async p => p.evaluate(() => abreMenu())
};

(async () => {
  fs.mkdirSync(salida, { recursive: true });
  const nav = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--hide-scrollbars"] });
  const lista = pedidas.length ? pedidas : Object.keys(VISTAS);
  for (const nombre of lista) {
    const p = await nav.newPage();
    await p.setViewport(PANTALLA);
    const errores = [];
    p.on("console", m => { if (m.type() === "error") errores.push(m.text()); });
    p.on("pageerror", e => errores.push("EXCEPCIÓN " + e.message));
    p.on("requestfailed", r => { if (r.url().startsWith(BASE)) errores.push("NO CARGÓ " + r.url()); });
    p.on("response", r => { if (r.url().startsWith(BASE) && r.status() >= 400) errores.push(r.status() + " " + r.url()); });
    await p.evaluateOnNewDocument(t => { try { localStorage.setItem("romastore_tema", JSON.stringify(t)); } catch (e) {} }, tema);
    await p.goto(BASE + "/", { waitUntil: "networkidle2", timeout: 60000 });
    await new Promise(r => setTimeout(r, 2600));                       // splash + secuencia del maniquí
    try { await VISTAS[nombre](p); } catch (e) { errores.push("AL NAVEGAR " + e.message); }
    await new Promise(r => setTimeout(r, 1800));
    const entera = !process.env.VENTANA && nombre !== "menu" && !nombre.startsWith("armador");
    if (entera) {                                                      // que carguen las imágenes de abajo
      await p.evaluate(async () => {
        for (let y = 0; y < document.documentElement.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); }
        window.scrollTo(0, 0);
      });
      await new Promise(r => setTimeout(r, 700));
    }
    const archivo = path.join(salida, [nombre, equipo, tema].join("-") + ".png");
    await p.screenshot({ path: archivo, fullPage: entera });
    const alto = await p.evaluate(() => document.documentElement.scrollHeight);
    const ancho = await p.evaluate(() => document.documentElement.scrollWidth);
    console.log(nombre.padEnd(20), "alto " + alto, ancho > PANTALLA.width ? "DESBORDA A LO ANCHO (" + ancho + ")" : "", errores.length ? "\n   " + [...new Set(errores)].join("\n   ") : "");
    await p.close();
  }
  await nav.close();
})().catch(e => { console.error(e); process.exit(1); });
