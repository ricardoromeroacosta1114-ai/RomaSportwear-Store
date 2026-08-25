# ROMA Sportwear — Operación del sitio

Sitio: <https://romasportwear.netlify.app>
Repositorio: `ricardoromeroacosta1114-ai/RomaSportwear-Store` (rama `main`)
Publicación: automática en Netlify con cada cambio en `main`.

---

## 1. Variables de entorno (Netlify → Project configuration → Environment variables)

### Configuradas hoy

| Variable | Para qué sirve | Estado |
|---|---|---|
| `MP_ACCESS_TOKEN` | Cobros con tarjeta (Mercado Pago). **Secreta.** | ✅ Puesta — cuenta real `RICHY11` |
| `SUPABASE_URL` | El servidor lee la configuración de la tienda | ✅ Puesta |
| `SUPABASE_ANON_KEY` | Clave pública de Supabase (protegida por RLS) | ✅ Puesta |

### Pendientes de que el propietario entregue

| Variable | Para qué sirve | Dónde se obtiene |
|---|---|---|
| `GA4_MEASUREMENT_ID` | Google Analytics 4 (`G-XXXXXXX`) | analytics.google.com → Admin → Flujos de datos |
| `GTM_CONTAINER_ID` | Google Tag Manager (`GTM-XXXXXX`) | tagmanager.google.com |
| `META_PIXEL_ID` | Meta Pixel (Facebook/Instagram Ads) | business.facebook.com → Administrador de eventos |
| `GOOGLE_ADS_ID` | Google Ads (`AW-XXXXXXXXX`) | ads.google.com → Herramientas → Conversiones |
| `GOOGLE_ADS_CONVERSION_LABEL` | Etiqueta de la conversión de compra | Igual que arriba, al crear la conversión |
| `META_CAPI_TOKEN` | Conversions API de Meta (medición del lado del servidor) | Administrador de eventos → Configuración |

**Mientras estas variables no existan, el sitio no carga ningún script de rastreo y no envía datos a nadie.** No hay medición simulada.

---

## 2. Datos del negocio que faltan por definir

Están en `data/negocio.json`. Todo campo vacío aparece en el sitio marcado como **“Pendiente”** en amarillo — nunca inventado.

**20 campos sin definir hoy** (ver `data/pendientes.json`):

- **Contacto:** `correo`, `facebook`, `horarioAtencion`, `tiempoRespuesta`
- **Envíos:** `paqueteria`, `tiempoLocal`, `tiempoNacional`, `diasPreparacion`, `rastreo`
- **Cambios y devoluciones:** `aceptaCambios`, `diasParaCambio`, `aceptaDevolucionDinero`, `condiciones`, `quienPagaEnvioCambio`, `comoSolicitar`
- **Recolección:** `direccion` exacta
- **Legal:** `razonSocial`, `rfc`, `domicilioFiscal`, `responsableDatos`

> La política de cambios es la más urgente: hoy la página avisa abiertamente que **no está definida**. Meta y Google Ads exigen una política clara para aprobar campañas de venta.

### Fichas de producto — `data/fichas.json`

Vacías para los 5 productos. Faltan `descripcion`, `material`, `ajuste`, `cuidados`, `caracteristicas` y `guiaTallasCm`.
Mientras estén vacías, esas secciones **no aparecen** en las páginas de producto (no se inventa nada) y la guía de tallas avisa que las medidas reales aún no se publican.

---

## 3. Catálogo — dónde se editan precios y existencias

Fuente única: **`data/catalogo.json`** (59 SKUs, 27 variantes, 5 productos).
La leen las dos partes:

- el navegador, vía `catalogo.js` (generado en cada publicación);
- el servidor, en `netlify/functions/_tienda.js`, para **recalcular el cobro**.

Cambiar un precio ahí y publicar actualiza tienda, páginas indexables, sitemap y el cobro real, todo a la vez.

---

## 4. Compilación

`netlify.toml` ejecuta `node scripts/build.js`, que corre en orden:

1. `genera-catalogo.js` → `catalogo.js`
2. `genera-analitica.js` → `analitica-config.js` (desde variables de entorno)
3. `genera-paginas.js` → 27 páginas `/productos/<slug>/`, `sitemap.xml`, `robots.txt`
4. `genera-institucionales.js` → 8 páginas de confianza, `404.html`, `data/pendientes.json`

---

## 5. Conectar un dominio propio

1. Compra el dominio (Namecheap, GoDaddy, Google Domains…).
2. Netlify → tu proyecto → **Domain management** → **Add a domain** → escribe el dominio.
3. Netlify te da dos caminos:
   - **Nameservers de Netlify** (lo más simple): copia los 4 servidores que te muestra y pégalos en el panel de tu proveedor de dominio.
   - **Registro DNS manual:** un `CNAME` de `www` hacia `romasportwear.netlify.app` y un registro `A`/`ALIAS` para el dominio raíz.
4. Espera la propagación (de minutos a 24 h). Netlify emite el certificado HTTPS solo.
5. **Después de conectarlo**, avisa para actualizar la variable `SITIO_URL` — de eso dependen `canonical`, Open Graph, `sitemap.xml` y los enlaces de retorno de Mercado Pago.

---

## 6. Google Search Console y Merchant Center

**Search Console:** search.google.com/search-console → añadir propiedad → verificar con etiqueta HTML o DNS → enviar `https://romasportwear.netlify.app/sitemap.xml`.

**Merchant Center:** requiere antes, sin excepción:

- política de devoluciones publicada y real (hoy pendiente);
- datos de contacto verificables (hoy falta el correo);
- fotografías reales de cada producto (hoy no hay ninguna);
- precios y disponibilidad correctos (✅ ya lo están).

Los datos estructurados `Product` + `Offer` ya están en cada página, así que en cuanto existan fotos y políticas el feed puede generarse.

---

## 7. Acceso al administrador

Ya no aparece a las clientas. Para entrar, abre una vez:

```
https://romasportwear.netlify.app/?admin=1
```

Queda recordado en ese dispositivo. Para quitarlo: `?admin=0`.
