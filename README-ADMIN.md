# ROMA Sportwear — Guía rápida del administrador

## Entrar al administrador
App → Perfil → **Administrador ROMA** → correo y contraseña (el usuario que creaste en Supabase → Authentication → Users).

## Conectar Supabase (una sola vez)
1. Cuenta gratis en supabase.com → New project.
2. SQL Editor → pega `setup-supabase.sql` → Run.
3. Authentication → Users → Add user (tu correo/contraseña de admin).
4. Settings → API → copia **Project URL** y **anon public key** → pégalos en `config.js` → vuelve a subir el sitio a Netlify.

## Agregar productos e imágenes
Administrador → **+ Agregar producto** → llena nombre, precio, color, tallas/existencias, relación con el armador → **Subir imágenes** (se guardan en Supabase Storage) → ★ marca la principal, ◀▶ ordena, ✕ elimina → **Guardar**. Los cambios aparecen a todas las clientas al recargar la tienda.

## Editar configuración
Administrador → sección **Configuración de la tienda**: WhatsApp, dirección de recolección, costos de entrega (local/nacional), envío gratis desde, % descuento por outfit, horarios, datos de transferencia, redes. **Guardar configuración**. (Los valores por defecto viven en `config.js`.)

## Probar un pedido
Tienda → agrega prendas (exige talla) → Carrito → método de entrega → Checkout → llena datos → **Enviar pedido por WhatsApp** → se abre WhatsApp con el mensaje al 526633183894 → presiona enviar.

## Variables de entorno necesarias
Hoy: ninguna en Netlify. Solo `SUPABASE_URL` y `SUPABASE_ANON_KEY` dentro de `config.js` (la anon key es pública por diseño; la seguridad la dan las políticas RLS del SQL).

## Activar Mercado Pago (pago con tarjeta)
El checkout y la función que crean la preferencia de pago (`netlify/functions/create-preference.js`) ya están implementados. Para activarlo:
1. Consigue tu **Access Token** en el panel de Mercado Pago Developers (mercadopago.com.mx → Developers → Tus integraciones). Empieza con las credenciales de **prueba** antes que las de producción.
2. En Netlify: Site settings → Environment variables → agrega `MP_ACCESS_TOKEN` (el token es secreto y NUNCA debe ir en el repo ni en `config.js`).
3. Activa el checkbox "Activar pago con tarjeta (Mercado Pago)" en Administrador → Configuración de la tienda (o pon `mercadoPagoEnabled: true` en `config.js`).
4. Prueba el flujo completo con una tarjeta de prueba antes de cambiar a credenciales de producción.

Nota: la confirmación de pago se basa en los parámetros de la URL de retorno de Mercado Pago (`?mp=approved|pending|failure`), revisados junto con el aviso manual por WhatsApp antes de preparar el pedido. Para mayor robustez a futuro se puede agregar un webhook que verifique el pago directamente contra la API de Mercado Pago.
