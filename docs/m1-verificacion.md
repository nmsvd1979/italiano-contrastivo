# M1 — qué se verificó y qué no

## Verificado (2026-11-17)
- **Pruebas automáticas:** Python (calcos, ítems, cápsulas y paquete) y web (carga validada, IndexedDB, FSRS calibrado, sesión, máquina de cápsula, pantallas) en verde; `npm run typecheck` limpio.
- **Build:** `npm --prefix web run build` genera la PWA; el paso `postbuild` comprueba que el service worker precachea `index.html`, los 6 archivos de `content/` y el manifiesto.
- **Navegador (vista previa en el panel integrado, en línea):** se completó una cápsula entera (calentamiento → explicación → 6 ejercicios → cierre) y, tras recargar la página, el progreso seguía en IndexedDB: tarjeta `error_code:ERR_POSSESSIVE_ARTICLE` con 1 repetición, 1 registro de repaso y «1 cápsula» en el día. Diseño revisado en ancho de teléfono (375 px). Sin errores de la app en consola.

## NO verificado (pasos tuyos o pendientes)
- **Modo sin conexión real:** el panel integrado no deja registrar service workers (error «unknown error occurred when fetching the script» al registrar `sw.js`, aunque el archivo se sirve bien con `Content-Type: text/javascript`). Solo se comprobó el precache de forma estática. Falta probarlo en un navegador con service workers (Chrome, o Playwright).
- **iPhone real:** instalar en la pantalla de inicio, abrir sin conexión, y que el progreso sobreviva a cerrar la app.
- **Voz it-IT del iPhone:** el botón «Escuchar» depende de que el teléfono tenga una voz italiana instalada (Ajustes → Accesibilidad → Contenido hablado → Voces). Sin ella se muestra «Tu iPhone no tiene voz italiana instalada».
- **Despliegue:** el repo no tiene remoto; nada está publicado. Para abrirlo en el iPhone hace falta servir `web/dist` por HTTPS (o publicarlo).
- **Contenido:** todo es de IA + una persona que no sabe italiano; ningún nativo lo validó. Hoy salen 6 cápsulas (AUX_ESSERE, PREP_PLACE, CE_AGREEMENT, POSSESSIVE_ARTICLE, PREP_ARTICLE_CONTRACTION, TENERE_AVERE) y 35 oraciones.
