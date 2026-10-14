# OMA Sportwear — Operación del sitio

Repositorio: `ricardoromeroacosta1114-ai/RomaSportwear-Store`
Sitio en Netlify: `romasportwear` (<https://romasportwear.netlify.app>)

| Rama | Qué es | Dónde se ve |
|---|---|---|
| `main` | Lo que está publicado (hoy, la tienda anterior de ROMA) | romasportwear.netlify.app |
| `oma-rediseno` | El rediseño OMA, pendiente de aprobación | vista previa de Netlify |

Netlify publica solo con cada cambio en `main`. **El rediseño OMA pasa a `main` únicamente cuando Ricardo apruebe el logo y el diseño.**

---

## 1. Verlo en esta computadora

```
node scripts/build.js          genera catálogo, páginas y mapa del sitio
node herramientas/sirve.js     abre http://localhost:3600
```

El pago con tarjeta no funciona en local (necesita las funciones de Netlify): se prueba en la vista previa.

## 2. Pruebas

```
node scripts/pruebas.js            la tienda (75 comprobaciones)
node scripts/pruebas-servidor.js   cobro y aviso de pago (42 comprobaciones)
node herramientas/capturas.js <carpeta> movil|escritorio claro|oscuro
```

## 3. Variables de entorno (Netlify → Project configuration → Environment variables)

| Variable | Para qué sirve | Estado |
|---|---|---|
| `MP_ACCESS_TOKEN` | Cobros con tarjeta (Mercado Pago). **Secreta.** | Puesta. Conviene renovarla: pasó por un chat |
| `SUPABASE_URL` | El servidor lee configuración, códigos e inventario | Puesta |
| `SUPABASE_ANON_KEY` | Clave pública de Supabase (protegida por RLS) | Puesta |
| `ROMA_WEB_LLAVE` | Registrar ventas en línea en el inventario. **Secreta.** | Falta: ver `CONEXION-INVENTARIO.md` |
| `SITIO_URL` | Dirección oficial, cuando haya dominio propio | Falta |
| `GA4_MEASUREMENT_ID`, `GTM_CONTAINER_ID`, `META_PIXEL_ID`, `GOOGLE_ADS_ID`, `GOOGLE_ADS_CONVERSION_LABEL` | Medición | Faltan |

Sin las variables de medición el sitio no carga ningún rastreador ni envía datos a nadie.

## 4. Catálogo: de dónde salen prendas, precios y existencias

Del inventario del punto de venta. No se edita a mano en la tienda.

```
node scripts/importa-inventario.js    lee ../roma-inventario/datos/mercancia-nueva.csv
                                      y escribe data/catalogo.json
node herramientas/colorea.js          genera la imagen de cada color que falte
node scripts/build.js
```

Hoy: 3 productos, 34 colores, 126 variantes, 274 piezas. Jacket $250, Playera $150, Legging Campana $280.

`data/catalogo.json` lo leen el navegador (vía `catalogo.js`) y el servidor (`netlify/functions/_tienda.js`), que **vuelve a calcular el cobro**: lo que mande el navegador nunca decide cuánto se cobra.

Para que las existencias se lean en vivo del punto de venta, ver `CONEXION-INVENTARIO.md`.

## 5. Imágenes de prenda y maniquí

Son ilustraciones 3D, y así se describen en el sitio; no son fotografías del producto.

- `prendas/base/*.webp` y `maniqui/capa-*.webp`: una sola imagen en gris por tipo de prenda. El color se aplica encima con el tono exacto del inventario (`tinte.js`), así que **cualquier color nuevo funciona sin generar otra imagen**.
- `prendas/<prenda>.webp`: esa misma base ya teñida, una por color, para la tienda y para compartir.
- `herramientas/fuentes/` guarda los originales (pesan 35 MB y no se suben al repositorio).

Una prenda nueva con otra silueta (short, top, legging recto) sí necesita su imagen base y su capa de maniquí: `herramientas/prepara-bases.js`.

## 6. Marca

Los logos salen del kit `OMA_Kit_Logos` con `herramientas/marca.js` (versión clara y versión dorada para fondo oscuro, iconos e imagen para compartir). Se escribe SPORTWEAR, sin s. Cuando exista el logo vectorial aprobado, se sustituyen los archivos de `marca/` e `icons/`.

## 7. Datos del negocio que faltan

Están en `data/negocio.json`. Todo campo vacío aparece en el sitio marcado como «Pendiente»; nada se inventa. Faltan 20 (lista en `data/pendientes.json`): correo, horario de atención, paquetería y tiempos de envío, política de cambios y devoluciones, dirección exacta de recolección y datos fiscales.

La política de cambios es la más urgente: Meta y Google Ads la exigen para aprobar campañas de venta. El Instagram sigue apuntando a `roma.sportwear_`.

Las fichas (`data/fichas.json`: material, cuidados, medidas en centímetros) siguen vacías, y por eso esas secciones no aparecen.

## 8. Direcciones de la tienda anterior

`data/rutas-antiguas.json` lleva cada página vieja de ROMA a su equivalente en OMA (28 redirecciones permanentes). Las prendas que ya no están en el inventario (legging recto, legging tubito) llevan a la tienda.

## 9. Dominio propio

1. Comprar el dominio.
2. Netlify → Domain management → Add a domain, y seguir sus instrucciones de DNS.
3. Poner la variable `SITIO_URL` con la dirección nueva y volver a publicar: de eso dependen las direcciones canónicas, el mapa del sitio y las imágenes para compartir.

## 10. Administrador

No aparece a las clientas. Para entrar, abrir una vez `https://<sitio>/?admin=1`; queda recordado en ese dispositivo (`?admin=0` lo quita). Ver `README-ADMIN.md`.
