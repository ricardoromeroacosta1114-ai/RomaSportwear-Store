/* ============================================================
   OMA — el maniquí del armador de outfits
   ------------------------------------------------------------
   Un maniquí blanco recortado y, encima, una capa por prenda.
   Cada capa es un «mapa de sombras» en grises: el color no viene
   pintado, se calcula aquí con el tono exacto del inventario
   (tinte.js). Por eso CUALQUIER color que exista en el sistema se
   ve puesto, también los que se agreguen después: no hay imágenes
   por color que puedan faltar.

   Las capas comparten encuadre (644 x 1920), así que se apilan sin
   desfase: legging, luego playera, luego jacket.
   ============================================================ */
(function () {
  "use strict";
  var RUTA = "/maniqui/";
  var META = { ancho: 644, alto: 1920, capas: ["jacket", "playera", "legging-campana"], bajoJacket: 0.42 };
  var ORDEN = ["abajo", "arriba", "capa"];
  var MAX_TENIDAS = 36;                     // capas ya teñidas que se guardan

  var imagenes = {};                        // src -> Promise<HTMLImageElement>
  var mapas = {};                           // prenda -> Promise<Uint8ClampedArray>
  var tenidas = new Map();                  // "prenda|#hex" -> canvas
  var turnos = new WeakMap();               // canvas -> último pedido (descarta los viejos)

  function carga(src) {
    if (!imagenes[src]) {
      imagenes[src] = new Promise(function (bien, mal) {
        var img = new Image();
        img.decoding = "async";
        img.onload = function () { bien(img); };
        img.onerror = function () { delete imagenes[src]; mal(new Error("No cargó " + src)); };
        img.src = src;
      });
    }
    return imagenes[src];
  }
  function lienzo(w, h) { var c = document.createElement("canvas"); c.width = w; c.height = h; return c; }

  function mapa(prenda) {
    if (!mapas[prenda]) {
      mapas[prenda] = carga(RUTA + "capa-" + prenda + ".webp").then(function (img) {
        var c = lienzo(META.ancho, META.alto), x = c.getContext("2d", { willReadFrequently: true });
        x.drawImage(img, 0, 0, META.ancho, META.alto);
        return x.getImageData(0, 0, META.ancho, META.alto).data;
      });
      mapas[prenda].catch(function () { delete mapas[prenda]; });
    }
    return mapas[prenda];
  }

  /* La capa de una prenda ya teñida de un color. */
  function tenida(prenda, hex) {
    var k = prenda + "|" + String(hex).toUpperCase();
    if (tenidas.has(k)) { var v = tenidas.get(k); tenidas.delete(k); tenidas.set(k, v); return Promise.resolve(v); }
    return mapa(prenda).then(function (datos) {
      var c = lienzo(META.ancho, META.alto), x = c.getContext("2d");
      var salida = x.createImageData(META.ancho, META.alto);
      window.OMA_TINTE.tine(datos, hex, salida.data);
      x.putImageData(salida, 0, 0);
      tenidas.set(k, c);
      if (tenidas.size > MAX_TENIDAS) tenidas.delete(tenidas.keys().next().value);
      return c;
    });
  }

  function tiene(prenda) { return META.capas.indexOf(prenda) >= 0; }

  /* Dibuja sobre un contexto ya escalado a 644 x 1920. */
  function compone(x, maniqui, zonas, capas, prendas) {
    var W = META.ancho, H = META.alto;
    /* sombra de piso, para que el maniquí pise algo */
    x.save();
    x.translate(W / 2, H * 0.972); x.scale(1, 0.12);
    var g = x.createRadialGradient(0, 0, 0, 0, 0, W * 0.38);
    g.addColorStop(0, "rgba(25,25,25,.26)"); g.addColorStop(1, "rgba(25,25,25,0)");
    x.fillStyle = g; x.beginPath(); x.arc(0, 0, W * 0.38, 0, Math.PI * 2); x.fill();
    x.restore();

    x.drawImage(maniqui, 0, 0, W, H);
    zonas.forEach(function (z, i) {
      if (z === "arriba" && prendas.capa && tiene(prendas.capa.base)) {
        /* Bajo la jacket solo asoma el faldón de la playera. */
        var corte = Math.round((META.bajoJacket - 0.03) * H);
        x.save(); x.beginPath(); x.rect(0, corte, W, H - corte); x.clip();
        x.drawImage(capas[i], 0, 0); x.restore();
      } else {
        x.drawImage(capas[i], 0, 0);
      }
    });
  }

  function prepara(prendas) {
    var zonas = ORDEN.filter(function (z) { return prendas[z] && prendas[z].base && tiene(prendas[z].base); });
    var pedidos = [carga(RUTA + "maniqui.webp")].concat(zonas.map(function (z) { return tenida(prendas[z].base, prendas[z].hex); }));
    return Promise.all(pedidos).then(function (r) { return { zonas: zonas, maniqui: r[0], capas: r.slice(1) }; });
  }

  /* Viste el maniquí de un <canvas>.
       prendas  { abajo:{base,hex}, arriba:{base,hex}, capa:{base,hex} }  (cualquiera puede faltar)
       opciones { escala: 0.5 }   lienzo más chico para miniaturas
     Devuelve una promesa: true si pintó, false si llegó después un pedido más nuevo. */
  function viste(canvas, prendas, opciones) {
    prendas = prendas || {};
    var esc = (opciones && opciones.escala) || 1;
    var turno = (turnos.get(canvas) || 0) + 1; turnos.set(canvas, turno);
    return prepara(prendas).then(function (r) {
      if (turnos.get(canvas) !== turno) return false;
      var w = Math.round(META.ancho * esc), h = Math.round(META.alto * esc);
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      var x = canvas.getContext("2d");
      x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, w, h);
      x.setTransform(esc, 0, 0, esc, 0, 0);
      x.imageSmoothingQuality = "high";
      compone(x, r.maniqui, r.zonas, r.capas, prendas);
      return true;
    });
  }

  /* Lo viste prenda por prenda (legging, playera, jacket). Una sola vez, al llegar a la portada. */
  function visteEnSecuencia(canvas, prendas, opciones) {
    var o = opciones || {}, pausa = o.pausa;
    var quieto = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (quieto) return viste(canvas, prendas);
    var zonas = ORDEN.filter(function (z) { return prendas[z]; });
    var hasta = {}, p = prepara(prendas).then(function () { return viste(canvas, {}); })
      .then(function (r) { if (o.alEmpezar) o.alEmpezar(); return r; });
    zonas.forEach(function (z) {
      p = p.then(function () {
        return new Promise(function (sigue) { setTimeout(sigue, pausa || 260); });
      }).then(function () { hasta[z] = prendas[z]; return viste(canvas, Object.assign({}, hasta)); });
    });
    return p;
  }

  /* Un lienzo suelto con el outfit puesto, para la imagen de compartir. */
  function aLienzo(prendas) {
    var c = lienzo(META.ancho, META.alto);
    return viste(c, prendas).then(function () { return c; });
  }

  /* La prenda sola (sin maniquí) teñida al vuelo. La tienda la usa cuando el
     inventario trae un color que todavía no tiene su imagen de catálogo. */
  function pintaPlana(canvas, prenda, hex) {
    var L = canvas.width || 600;
    return carga("/prendas/base/" + prenda + ".webp").then(function (img) {
      var x = canvas.getContext("2d", { willReadFrequently: true });
      x.clearRect(0, 0, L, L); x.drawImage(img, 0, 0, L, L);
      var d = x.getImageData(0, 0, L, L);
      window.OMA_TINTE.tine(d.data, hex);
      x.putImageData(d, 0, 0);
    });
  }

  window.OMA_MANIQUI = { meta: META, tiene: tiene, viste: viste, visteEnSecuencia: visteEnSecuencia, aLienzo: aLienzo, tenida: tenida, pintaPlana: pintaPlana };
})();
