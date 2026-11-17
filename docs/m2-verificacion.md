# M2 — qué se verificó y qué no

## Verificado (2026-11-17)
- **Generación:** `python -m pipeline tts` produjo 67 clips (35 oraciones + 32 palabras de léxico) con Piper `it_IT-serena-high`, 628 KB en total (tope 3 MB), duraciones de 0,48 a 9,46 s (promedio 1,54 s). Una segunda ejecución regenera 0 clips; un texto editado cambia de id y el clip viejo se borra.
- **Nunca se pronuncia un distractor:** los textos a sintetizar salen solo de las oraciones y palabras del paquete (prueba contra todas las opciones incorrectas); el botón de voz solo aparece tras responder y lee la opción correcta.
- **Reproducción técnica en el navegador (vista previa, en línea):** el botón «Escuchar» pide `audio/tts/<id>.mp3` (200/206), el elemento de audio carga con duración real y sin error; en palabras con grabación nativa (p. ej. «allora») carga `audio/words/…`; las etiquetas dicen «voz sintética», «grabación de un hablante nativo» o «voz del sistema» según lo que suena.
- **Precache:** el build comprueba que el service worker lista los 83 archivos de la app, el contenido y el audio.
- **Pruebas automáticas:** Python (ids, plan, idempotencia, errores, palabras nativas) y web (orden nativa → clip → sistema, caída ante fallo, audio anterior detenido, etiquetas) en verde.

## NO verificado
- **Escuchados por el usuario (2026-11-17):** los 10 clips de abajo suenan bien (sin cortes, ruido ni voz ilegible). El usuario no sabe italiano: esto confirma calidad técnica y naturalidad, NO que la pronunciación sea correcta para un nativo (geminadas y sílaba tónica siguen sin verificar). Lista escuchada: Escucha estos 10 y anota si alguno tiene cortes, ruido, voz robótica o se entiende mal:
1. `web/public/audio/tts/42ab9caa8a85.mp3` — «L'uomo ha ragione.»
2. `web/public/audio/tts/8c4d9d9c09ab.mp3` — «So che hai ragione.»
3. `web/public/audio/tts/29501a62c4bf.mp3` — «So che avete ragione.»
4. `web/public/audio/tts/688fb7fba7f6.mp3` — «Mio zio vive a Londra.»
5. `web/public/audio/tts/d75da932f229.mp3` — «Forse pioverà nel pomeriggio.»
6. `web/public/audio/tts/abc0047a2e18.mp3` — «Nel mondo ci sono quattro oceani.»
7. `web/public/audio/tts/9d903fb0f665.mp3` — «È venuto nonostante gli avessi detto di non farlo.»
8. `web/public/audio/tts/d46c686f884b.mp3` — «Per me è finita con le feste, il mio corpo malato non ce la fa più.»
9. `web/public/audio/tts/e44a85357e57.mp3` — «Ha lavorato senza pausa per mantenere i suoi figli fino a che si sono sposati.»
10. `web/public/audio/tts/5a14bd529a52.mp3` — «Il gazebo, o pergolato, è uno spazio, di solito rotondo, che solitamente si trova nei giardini, circondato da piante o alberi e panchine.»
- **Consonantes dobles y acento de Serena:** la prueba a ciegas de la app anterior midió qué voz sonaba mejor, no si pronuncia bien las geminadas ni la sílaba tónica. Se compara con grabaciones nativas en M3.
- **iPhone real:** que el audio suene al tocar «Escuchar» (política de reproducción de iOS), el volumen y el funcionamiento sin conexión real (el panel integrado no registra service workers).
- **Etiquetas de la voz del sistema:** que el iPhone tenga una voz italiana instalada.
