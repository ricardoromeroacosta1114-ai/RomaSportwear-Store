/* ============================================================
   ROMA Sportwear — CONFIGURACIÓN CENTRAL
   Edita aquí los datos del negocio. El administrador de la app
   puede sobreescribir estos valores (se guardan en Supabase).
   ============================================================ */
const ROMA_CONFIG = {
  storeName: "ROMA Sportwear",
  whatsappNumber: "526633183894",     // pedidos y botón flotante
  currency: "MXN",
  pickupAddress: "Bazar Vintage Clothing de viernes a domingo 5:30pm a 11:00pm",
  localDeliveryCost: 100,             // entrega local en Mexicali
  nationalShippingCost: 200,          // envío nacional
  freeShippingFrom: 500,              // envío gratis desde este subtotal (0 = nunca)
  outfitDiscountPct: 15,              // % descuento por look completo
  bankName: "Mercado Pago",           // datos de transferencia (se muestran al elegir ese pago)
  accountHolder: "Ricardo Romero Acosta",
  clabe: "5428780992092791",
  schedule: "Lun–Sáb 10:00–20:00",
  instagram: "",
  facebook: "",
  mercadoPagoEnabled: false           // NO activar aún — ver README-ADMIN
};

/* ---- Conexión a Supabase (administrador de productos) ----
   1) Crea un proyecto gratis en https://supabase.com
   2) Ejecuta el archivo setup-supabase.sql en SQL Editor
   3) Pega aquí Project URL y anon public key (Settings → API)
   Con estos campos vacíos, la tienda funciona con el catálogo
   integrado y el administrador muestra la guía de conexión.   */
const SUPABASE_URL = "https://beajkdonrmzaugnhffjj.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_OYl9kxe10tGOUkv9PBAyNw_IEkB3YiP";

/* Mercado Pago (futuro): NO pongas llaves aquí. Cuando se active,
   las llaves vivirán en variables de entorno de Netlify Functions
   (servidor), nunca en el código del sitio. Ver README-ADMIN.md   */
