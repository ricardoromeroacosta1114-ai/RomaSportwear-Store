/* Cómo se nombra una variante en todo el sistema.

   La tienda, las funciones de pago y la base del punto de venta tienen que
   hablar de la misma pieza con la misma clave. La regla es una sola y está
   aquí; la base tiene su gemela en SQL (`roma_clave_web`, migración 0005). */

/* «Azul oscuro» -> «azul-oscuro»; «Café» -> «cafe». */
function slug(texto) {
  return String(texto == null ? "" : texto)
    .toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/* Jacket + Rosa barbie + XL -> «JACKET-ROSA-BARBIE-XL». */
function clave(producto, color, talla) {
  return [producto, color, talla].map(slug).filter(Boolean).join("-").toUpperCase();
}

module.exports = { slug, clave };
