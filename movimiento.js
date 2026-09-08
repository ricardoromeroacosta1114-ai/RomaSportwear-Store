/* ============================================================
   MOVIMIENTO Y PROFUNDIDAD — ROMA Sportwear
   Todo es CSS/JS nativo: cero librerias, cero peticiones extra.
   Respeta "reducir movimiento" del sistema: si la clienta lo tiene
   activado, nada de esto se enciende.
   ============================================================ */
(function () {
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) { document.documentElement.classList.add("sin-motion"); return; }
  document.documentElement.classList.add("con-motion");

  /* ---------- 1) Aparicion progresiva al desplazar ----------
     Las secciones y tarjetas entran suavemente cuando se asoman. */
  var observador = null;
  if ("IntersectionObserver" in window) {
    observador = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("visible"); observador.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.06 });
  }

  function registraAparicion(raiz) {
    if (!observador) return;
    var sel = ".p-card, .look-card, .sec, .panel, .combina, .envio-barra, .hero";
    (raiz || document).querySelectorAll(sel).forEach(function (el, i) {
      if (el.dataset.aparece) return;
      el.dataset.aparece = "1";
      el.classList.add("aparece");
      /* escalonado corto para que se sienta orquestado, no lento */
      el.style.transitionDelay = Math.min(i % 8, 7) * 45 + "ms";
      observador.observe(el);
    });
  }

  /* ---------- 2) Profundidad 3D en las tarjetas ----------
     La tarjeta se inclina siguiendo el puntero. En tactil no se
     activa (ahi el gesto natural es desplazar, no apuntar). */
  var puedeApuntar = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  function inclina(e) {
    var c = e.currentTarget, r = c.getBoundingClientRect();
    var x = (e.clientX - r.left) / r.width - 0.5;
    var y = (e.clientY - r.top) / r.height - 0.5;
    c.style.transform = "perspective(700px) rotateY(" + (x * 9).toFixed(2) + "deg) rotateX(" +
      (-y * 9).toFixed(2) + "deg) translateZ(10px)";
    var fig = c.querySelector(".p-fig, .look-flat");
    if (fig) fig.style.transform = "translateX(" + (x * -8).toFixed(1) + "px) translateY(" + (y * -8).toFixed(1) + "px) scale(1.06)";
  }
  function reposa(e) {
    var c = e.currentTarget;
    c.style.transform = "";
    var fig = c.querySelector(".p-fig, .look-flat");
    if (fig) fig.style.transform = "";
  }
  function registraInclinacion(raiz) {
    if (!puedeApuntar) return;
    (raiz || document).querySelectorAll(".p-card, .look-card").forEach(function (c) {
      if (c.dataset.tilt) return;
      c.dataset.tilt = "1";
      c.classList.add("tilt3d");
      c.addEventListener("pointermove", inclina);
      c.addEventListener("pointerleave", reposa);
      c.addEventListener("blur", reposa, true);
    });
  }

  /* ---------- 3) Parallax suave del encabezado ---------- */
  var hero = null, ticking = false;
  function alDesplazar() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      hero = document.querySelector(".hero");
      if (hero) {
        var y = Math.min(window.scrollY, 260);
        hero.style.setProperty("--par", (y * 0.22).toFixed(1) + "px");
        hero.style.setProperty("--fade", String(Math.max(0, 1 - y / 320)));
      }
      ticking = false;
    });
  }
  window.addEventListener("scroll", alDesplazar, { passive: true });

  /* ---------- 4) Transicion entre vistas ----------
     Al cambiar de pantalla el contenido entra desde abajo. */
  function animaVista() {
    var v = document.getElementById("views");
    if (!v) return;
    v.classList.remove("entra");
    void v.offsetWidth;            /* reinicia la animacion */
    v.classList.add("entra");
    registraAparicion(v);
    registraInclinacion(v);
  }

  /* La tienda repinta con render(); nos colgamos de ahi sin tocar su codigo. */
  function enganchaRender() {
    if (typeof window.render !== "function" || window.render.__conMovimiento) return false;
    var original = window.render;
    var envuelto = function () {
      var r = original.apply(this, arguments);
      requestAnimationFrame(animaVista);
      return r;
    };
    envuelto.__conMovimiento = true;
    window.render = envuelto;
    return true;
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (!enganchaRender()) {
      /* store-app.js define render() al cargarse; reintenta un momento */
      var t = setInterval(function () { if (enganchaRender()) clearInterval(t); }, 120);
      setTimeout(function () { clearInterval(t); }, 4000);
    }
    setTimeout(function () { registraAparicion(); registraInclinacion(); animaVista(); }, 60);
  });

  /* ---------- 5) Cinta superior en bucle continuo ----------
     Se duplica el contenido para que el desplazamiento no corte. */
  document.addEventListener("DOMContentLoaded", function () {
    var pista = document.querySelector(".cinta-pista");
    if (pista && !pista.dataset.dup) {
      pista.dataset.dup = "1";
      pista.innerHTML += pista.innerHTML;
    }
  });

})();
