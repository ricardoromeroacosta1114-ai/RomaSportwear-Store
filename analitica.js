/* ============================================================
   ANALITICA — ROMA Sportwear
   Los identificadores NO viven aqui: se inyectan en la compilacion
   desde variables de entorno de Netlify (ver DEPLOY.md).
   Si no hay identificadores, esto no carga nada y no rastrea nada.
   ============================================================ */
(function () {
  var CFG = window.ROMA_ANALITICA || {};      // lo escribe scripts/genera-analitica.js
  var listo = { ga4: false, meta: false };

  /* ---------- Google Analytics 4 / Google Ads ---------- */
  if (CFG.ga4Id) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    gtag("js", new Date());
    gtag("config", CFG.ga4Id, { currency: "MXN", send_page_view: false });
    if (CFG.googleAdsId) gtag("config", CFG.googleAdsId);
    cargaScript("https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(CFG.ga4Id));
    listo.ga4 = true;
  }

  /* ---------- Google Tag Manager ---------- */
  if (CFG.gtmId) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
    cargaScript("https://www.googletagmanager.com/gtm.js?id=" + encodeURIComponent(CFG.gtmId));
  }

  /* ---------- Meta Pixel ---------- */
  if (CFG.metaPixelId) {
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = [];
      t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    fbq("init", CFG.metaPixelId);
    listo.meta = true;
  }

  function cargaScript(src) {
    var s = document.createElement("script"); s.async = true; s.src = src;
    document.head.appendChild(s);
  }

  /* ---------- Equivalencias GA4 -> Meta ---------- */
  var MAPA_META = {
    page_view: "PageView", view_item: "ViewContent", add_to_cart: "AddToCart",
    view_cart: "ViewCart", begin_checkout: "InitiateCheckout",
    add_payment_info: "AddPaymentInfo", purchase: "Purchase", search: "Search"
  };

  /* Convierte los renglones del carrito al formato estandar de ecommerce.
     Nunca se envian datos sensibles: solo producto, variante, precio y cantidad. */
  function items(lista) {
    return (lista || []).map(function (i) {
      return {
        item_id: i.sku, item_name: i.nombre, item_brand: "ROMA Sportwear",
        item_category: i.categoria, item_variant: [i.color, i.talla].filter(Boolean).join(" / "),
        price: Number(i.precio) || 0, quantity: Number(i.cant) || 1
      };
    });
  }

  /* API unica que usa la tienda: ROMA_EVENTO(nombre, datos) */
  window.ROMA_EVENTO = function (nombre, datos) {
    datos = datos || {};
    var payload = { currency: "MXN" };
    if (datos.items) payload.items = items(datos.items);
    if (datos.valor != null) payload.value = Math.round(Number(datos.valor) * 100) / 100;
    if (datos.extra) for (var k in datos.extra) payload[k] = datos.extra[k];

    if (listo.ga4 && window.gtag) gtag("event", nombre, payload);
    if (window.dataLayer && CFG.gtmId) window.dataLayer.push(Object.assign({ event: nombre }, payload));

    if (listo.meta && window.fbq) {
      var mn = MAPA_META[nombre];
      if (mn) {
        fbq("track", mn, {
          currency: "MXN",
          value: payload.value || 0,
          content_type: "product",
          contents: (payload.items || []).map(function (i) { return { id: i.item_id, quantity: i.quantity, item_price: i.price }; }),
          content_ids: (payload.items || []).map(function (i) { return i.item_id; })
        });
      }
    }
    if (CFG.depurar) console.log("[evento]", nombre, payload);
  };

  /* Conversion de Google Ads en la compra confirmada */
  window.ROMA_CONVERSION_COMPRA = function (folio, valor) {
    if (listo.ga4 && CFG.googleAdsLabel && window.gtag) {
      gtag("event", "conversion", {
        send_to: CFG.googleAdsId + "/" + CFG.googleAdsLabel,
        value: Number(valor) || 0, currency: "MXN", transaction_id: folio
      });
    }
  };

  window.ROMA_ANALITICA_ACTIVA = listo.ga4 || listo.meta || !!CFG.gtmId;
})();
