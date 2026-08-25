/* Inyecta los identificadores de analitica desde variables de entorno de Netlify.
   Ninguna clave queda escrita en el repositorio.
   Si una variable no existe, esa herramienta simplemente no se carga. */
const fs = require("fs");
const path = require("path");
const raiz = path.join(__dirname, "..");

const cfg = {
  ga4Id: process.env.GA4_MEASUREMENT_ID || "",
  gtmId: process.env.GTM_CONTAINER_ID || "",
  metaPixelId: process.env.META_PIXEL_ID || "",
  googleAdsId: process.env.GOOGLE_ADS_ID || "",
  googleAdsLabel: process.env.GOOGLE_ADS_CONVERSION_LABEL || "",
  depurar: process.env.ANALITICA_DEPURAR === "1"
};

fs.writeFileSync(path.join(raiz, "analitica-config.js"),
  "/* GENERADO EN LA COMPILACION desde variables de entorno — no editar. */\n" +
  "window.ROMA_ANALITICA=" + JSON.stringify(cfg) + ";\n");

const activas = Object.entries(cfg).filter(([k, v]) => v && k !== "depurar").map(([k]) => k);
console.log("analitica:", activas.length ? activas.join(", ") : "sin identificadores (no se rastrea nada)");
