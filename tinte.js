/* Teñido de prendas — una sola fórmula para todo el sitio.
   La usa la tienda en el navegador (maniquí y colores sin imagen) y la
   herramienta que genera las imágenes del catálogo, así que una prenda se
   ve igual en la ficha, en la tarjeta y puesta en el maniquí.

   Cada prenda se guarda como «mapa de sombras»: una imagen en grises donde
   255 = 1.25 de luz (zona más iluminada) y el alfa es la silueta. Teñir es
   multiplicar ese mapa por el color y devolverle un poco de brillo. */
(function (raiz) {
  "use strict";
  var TOPE = 1.25;                       // luz máxima que cabe en el mapa

  function hexARgb(hex) {
    var h = String(hex || "").replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    if (h.length !== 6 || isNaN(n)) return [0.5, 0.5, 0.5];
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }

  /* Prepara las constantes de un color. */
  function prepara(hex) {
    var c = hexARgb(hex);
    var Y = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    var piso = 0.05;                     // el negro puro no existe en tela
    return {
      r: c[0] + (1 - c[0]) * piso, g: c[1] + (1 - c[1]) * piso, b: c[2] + (1 - c[2]) * piso,
      /* Las telas claras muestran sombras más suaves; las oscuras, más brillo. */
      suave: 1 - 0.42 * Y,
      luz: 0.07 + 0.26 * (1 - Y)
    };
  }

  /* Tabla de 256 entradas por canal: valor del mapa -> color final (0..255). */
  function tabla(hex) {
    var k = prepara(hex);
    var R = new Uint8ClampedArray(256), G = new Uint8ClampedArray(256), B = new Uint8ClampedArray(256);
    for (var v = 0; v < 256; v++) {
      var s = v / 255 * TOPE;
      var m = s > 1 ? 1 : s;
      m = 1 - (1 - m) * k.suave;                      // sombra
      var h = (s - 0.74) / 0.51; h = h < 0 ? 0 : h > 1 ? 1 : h;
      h = h * h * (3 - 2 * h) * k.luz;                // brillo
      R[v] = (1 - (1 - k.r * m) * (1 - h)) * 255;
      G[v] = (1 - (1 - k.g * m) * (1 - h)) * 255;
      B[v] = (1 - (1 - k.b * m) * (1 - h)) * 255;
    }
    return { R: R, G: G, B: B };
  }

  /* Tiñe un búfer RGBA (mapa de sombras en R, silueta en A) en sitio o hacia `dest`. */
  function tine(origen, hex, dest) {
    var t = tabla(hex), o = dest || origen;
    for (var i = 0; i < origen.length; i += 4) {
      var v = origen[i];
      o[i] = t.R[v]; o[i + 1] = t.G[v]; o[i + 2] = t.B[v]; o[i + 3] = origen[i + 3];
    }
    return o;
  }

  var api = { TOPE: TOPE, hexARgb: hexARgb, tabla: tabla, tine: tine };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else raiz.OMA_TINTE = api;
})(typeof window !== "undefined" ? window : globalThis);
