# OMA Sportwear — Guía rápida del administrador

## Entrar

Abre una vez `https://<sitio>/?admin=1`. Después: Cuenta → **Administrador** → correo y contraseña (el usuario creado en Supabase → Authentication → Users). Las clientas nunca ven esa opción.

## Qué se cambia desde ahí

- **Configuración de la tienda**: WhatsApp, lugar y horario de recolección, costo de entrega local y de envío nacional, monto para envío gratis, porcentaje de descuento del outfit, datos de transferencia, pago con tarjeta encendido o apagado, programa de puntos.
- **Códigos de descuento**: crear, encender y apagar. El servidor vuelve a validar cada código al cobrar.
- **Inventario en vivo**: la casilla que hace que la tienda lea las existencias del punto de venta. Antes de marcarla hay que seguir `CONEXION-INVENTARIO.md`.

## Qué ya no se cambia desde ahí

**Prendas, colores, tallas, precios y existencias.** Vienen del inventario del punto de venta, para que el bazar y la web no digan cosas distintas. Cómo actualizarlos: `DEPLOY.md`, sección 4.

## El descuento del outfit

Con una jacket o una playera, más un legging, el outfit lleva el porcentaje configurado. Desde el armador se aplica solo; en la bolsa también se puede escribir el código `OUTFIT` (el anterior, `LOOK15`, sigue funcionando).

## Probar un pedido

Tienda → elige prenda y talla → Bolsa → forma de entrega → Pago → llena los datos.

- **WhatsApp, transferencia o efectivo**: se abre WhatsApp con el pedido escrito. Los datos para transferir aparecen solo después de crear el pedido.
- **Tarjeta**: abre Mercado Pago. Si el pago se rechaza, la bolsa queda intacta para reintentar.

## Pago con tarjeta (Mercado Pago)

El token vive únicamente en Netlify, en la variable `MP_ACCESS_TOKEN`; nunca en el código del sitio. Al banco se le pide que el cargo aparezca como «OMA SPORTWEAR» en el estado de cuenta de la clienta.

La tienda confirma un pago de dos maneras: al volver la clienta de Mercado Pago, y con el aviso que Mercado Pago manda directo al servidor (`netlify/functions/mp-aviso.js`), que no depende de que ella regrese. Ese aviso es el que registra la venta en el inventario cuando la conexión en vivo está encendida.
