# Sistema visual (2026-11-24)

Revisión de diseño gráfico de toda la app. Mantiene los lineamientos de `2026-11-17-diseno-ui.md` (papel cálido, tinta, terracota; italiano en serif; una acción obvia por pantalla) y ordena cómo se muestra todo. Vive en `web/src/styles.css`, en este orden: tokens → base → componentes → navegación → ejercicio → pantallas.

## Qué estaba mal (as-is)
- **Sin escala tipográfica:** trece tamaños sueltos (11 a 26 px), interlineado 1,5 para todo, títulos poco jerárquicos y serif usado a veces para español.
- **Sin escala de espacio:** márgenes por defecto del navegador sumados al relleno de las tarjetas (huecos de 30 px arriba de cada tarjeta, textos pegados en otras partes).
- **Tarjetas dentro de tarjetas** y el mismo borde y radio para todo: nada destacaba.
- **Etiquetas en mayúsculas de colores saturados** que competían con el botón principal.
- **Progreso dibujado de cuatro formas** (barra nativa del navegador, barras propias de tres grosores).
- **Enlaces subrayados como navegación**, flechas distintas para «volver» (← y ‹) y emoji como iconos (🔥 🔊 🐢).
- **Dos botones fijos apilados** en Hoy, con un degradado que tapaba contenido.
- **Ajustes** como un muro de enlaces y párrafos.

## Decisiones (to-be)
- **Tipografía:** fuentes del sistema a propósito (la app es una PWA sin conexión y el destino es iPhone: San Francisco para la interfaz y New York para el italiano). Escala: 13 (apoyo) · 15 (secundario) · 17 (cuerpo) · 18 · 21 (sección) · 32 (pantalla); los títulos llevan interlineado 1,1–1,25 y tracking negativo; el cuerpo 1,45. La serif queda solo para el italiano.
- **Espacio:** escala de 4 (4, 8, 12, 16, 20, 24, 32). Cada bloque deja 12 px debajo; los títulos de sección abren con 24 px. Margen lateral de 20 px.
- **Superficies:** una tarjeta por grupo (radio 18, relleno 20) y dentro filas separadas por una línea fina; nunca tarjeta dentro de tarjeta. Solo el módulo en curso de la Ruta lleva sombra.
- **Tipo de práctica:** un punto de color y su nombre en minúsculas («● Estudiar»), en gris: informa sin gritar. Los cuatro colores de hebra no cambian.
- **Progreso:** una sola barra (8 px, pista crema) para todo; las cifras grandes solo donde son el dato de la pantalla (Progreso). Estados de fila con un círculo: lleno con ✓ (hecho), aro terracota (toca ahora), vacío (pendiente).
- **Acciones:** un botón principal por pantalla (terracota, 52 px). Lo secundario es silencioso; dentro de una tarjeta, un enlace secundario es una fila con flecha. La barra fija inferior es lisa, sin degradado. En Hoy las salidas secundarias van en el flujo, no fijas.
- **Navegación:** «volver» siempre «‹ Nombre», sin subrayado. Barra de pestañas translúcida con desenfoque; la pestaña activa cambia de color y de peso.
- **Iconos:** de trazo, propios (racha, voz, pestañas); sin emoji.
- **Desplegables:** fila que se toca con su flecha, que gira al abrir.
- **Ajustes:** selector de apariencia segmentado y los accesos como lista de filas con subtítulo.

## Lo que no cambia
Rutas, textos de honestidad, lógica y datos. Los nombres de clase que usan las pruebas se conservaron.
