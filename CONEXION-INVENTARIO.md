# Un solo inventario para el bazar y la tienda en línea

La tienda (este proyecto) y el punto de venta (`roma-inventario`) venden la misma mercancía. Este documento explica cómo comparten las existencias y qué falta para que lo hagan en vivo.

## Cómo está hoy

**Mismo origen, sin conexión en vivo.** El catálogo de la tienda se genera del mismo archivo que carga el punto de venta:

```
roma-inventario/datos/mercancia-nueva.csv   (126 variantes, 274 piezas)
        │
        ├─► punto de venta: carga inicial
        └─► node scripts/importa-inventario.js ─► data/catalogo.json ─► la tienda
```

Los dos arrancan con las mismas prendas, colores, tallas, precios y piezas. Lo que **todavía no pasa** es que una venta en el bazar baje la existencia en la web (ni al revés): para eso el punto de venta tiene que estar en la nube, y hoy solo corre en esta computadora.

Mientras tanto, si se vende mucho de una prenda en el bazar, se corrige `data/catalogo.json` (campo `stock`) y se vuelve a publicar.

## Cómo queda al conectarlo

```
         bazar (punto de venta)              tienda en línea
                  │                                 │
                  ▼                                 ▼
        roma_registrar_venta            pago aprobado en Mercado Pago
                  │                                 │
                  │                     mp-aviso ─► roma_registrar_venta_web
                  ▼                                 ▼
          ┌──────────────────────────────────────────────┐
          │   libro de inventario (una sola base)        │
          └──────────────────────────────────────────────┘
                  ▲                                 ▲
        el punto de venta lee           la tienda lee roma_catalogo_web
```

- La tienda lee precio y existencias de la base en cada visita, y otra vez en el servidor al momento de cobrar.
- Lo que se agota en el bazar deja de poder pagarse en la web.
- Un pago aprobado con tarjeta se registra solo como venta del canal «tienda en línea» y descuenta las piezas.
- Si la base no responde, la tienda sigue funcionando con su catálogo de respaldo.

Todo esto ya está programado y probado en un Postgres local con la mercancía real:

| Prueba | Dónde | Resultado |
|---|---|---|
| Puente tienda ↔ inventario | `roma-inventario`: `node pruebas/tienda-web.mjs` | 32 de 32 |
| Sistema de inventario completo | `roma-inventario`: `node pruebas/base.mjs` | 113 de 113 |
| Cobro y aviso de pago | aquí: `node scripts/pruebas-servidor.js` | 42 de 42 |

## Pasos para encenderlo

Los pasos 1 a 4 escriben en la base de Supabase que comparten la tienda, la agencia y el punto de venta. **No se hacen sin el visto bueno de Ricardo.**

1. **Aplicar las cinco migraciones**, en orden, en el proyecto de Supabase `beajkdonrmzaugnhffjj`:
   `roma-inventario/supabase/migrations/0001_tablas.sql` … `0005_tienda_en_linea.sql`.
   Solo crean tablas y funciones con prefijo `roma_`; no tocan nada de lo que ya existe.
2. **Crear las dos cuentas** de los dueños (Supabase → Authentication → Users) y su fila en `roma_perfiles`. Hacen falta sus dos correos.
3. **Cargar la mercancía** desde el punto de venta (carga inicial con `datos/mercancia-nueva.csv`). Antes, contar la Jacket: la hoja dice 120 y las celdas suman 119.
4. **Crear la llave de la tienda.** Es una contraseña larga que solo conocen Netlify y la base:
   - generarla: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   - guardarla en Netlify como variable `ROMA_WEB_LLAVE` (marcada como secreta);
   - guardar en la base solo su huella:
     `update public.roma_tienda_web set llave_sha256 = encode(sha256(convert_to('<la llave>', 'UTF8')), 'hex') where id;`
5. **Encender el interruptor**: en la tienda, `?admin=1` → Administrador → «Leer precio y existencias en vivo del punto de venta» → Guardar.
6. **Probar** con una compra real pequeña: debe aparecer en el punto de venta como venta de «tienda en línea» y bajar la pieza.

En el panel de Mercado Pago no hay que configurar nada: cada cobro ya le dice a dónde mandar la confirmación.

Para apagarlo basta desmarcar la casilla del paso 5: la tienda vuelve a su catálogo de respaldo.

## Lo que el puente no hace

- **Pedidos por WhatsApp, transferencia o efectivo.** No hay un pago confirmado por un tercero, así que no se descuentan solos: se registran en el punto de venta cuando se cobra o se entrega, como cualquier venta del bazar.
- **Apartar piezas.** Entre que la clienta abre Mercado Pago y paga, otra persona puede comprar la última pieza en el bazar. Si pasa, la venta en línea se registra igual y queda marcada «por revisar» para resolverla con la clienta; nunca se pierde un pago.
- **Devoluciones.** Se registran en el punto de venta.

## Claves de cada pieza

Tienda y base nombran igual cada variante: producto, color y talla, sin acentos y en mayúsculas.

```
Jacket · Rosa barbie · XL   →   JACKET-ROSA-BARBIE-XL
```

La regla vive en dos lugares y la prueba `tienda-web.mjs` comprueba que den lo mismo para las 126 variantes: `scripts/claves.js` (tienda) y `roma_clave_web` (base).
