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

## Qué falta para activar Mercado Pago
1. Cuenta de Mercado Pago vendedor + credenciales (public key / access token).
2. Un backend mínimo (Netlify Functions) que cree las preferencias de pago — el **access token es secreto** y NUNCA debe ir en el código del sitio ni en config.js; vivirá en variables de entorno de Netlify (Site settings → Environment variables: `MP_ACCESS_TOKEN`).
3. Activar `mercadoPagoEnabled: true` en config y agregar el botón de pago al checkout.
Cuando decidas activarlo, ese backend es un proyecto pequeño aparte.
