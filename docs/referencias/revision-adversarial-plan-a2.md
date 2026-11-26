# Revisión adversarial del plan de A2 (2026-11-26)

Dos revisores independientes (lingüístico y de factibilidad) y un arquitecto revisaron el borrador v1. El plan final (`docs/specs/2026-11-26-plan-a2.md`) incorpora esto. Aquí quedan los hallazgos que importan al construir, para no redescubrirlos.

## Italiano válido que NO puede ser la «forma errónea» en ningún generador
`vado a mangiare` (movimiento con meta) · `sono corso a casa` · `ha successo` (avere successo) · `lo posso fare` / `posso farlo` · `non lo fare` / `non farlo` · `veduto`, `perduto` · `quando arrivi ti chiamo` (presente de «tu», idéntico al congiuntivo) · `se pioverà` · `più buono`, `più grande` · `dopo mangiato` (coloquial) · `a me mi piace` (coloquial: «evitar al escribir») · `vado lì` · `la settimana passata` · `ho dovuto andare` / `sono dovuto andare` · `ho studiato per due anni` · `diceva` (3.ª sg.) · `bevo` · `volerò` · `vorrei` (volerei es válido).
`sto per + inf.` = «estar a punto de», no «voy a»; «voy a comer» → mangio/mangerò/penso di mangiare.

## Errores contrastivos reales (los que SÍ merecen peso)
Participios regulares donde el italiano es irregular (*prenduto, *chiudito, *leggiuto, *metuto → preso, chiuso, letto, messo) · essere con piacere/costare/stare/riuscire/rimanere/diventare · mi è piaciuta/mi sono piaciuti · c'era/c'erano (*c'era molte persone) · `*già non abito` → non abito più · `*finisco di arrivare` → sono appena arrivato · `*in due giorni` → fra due giorni · `*fa due anni` → due anni fa · `*nel terzo piano` → al terzo piano · `*il 3 di maggio`, `*in 2020` → nel 2020 · `*di fronte di`, `*al lato di` · `*qualche libri`, `*uni ragazzi` → dei ragazzi, `*qualcosa buono` → qualcosa di buono, `*nessuno libro` · `*lo che` → quello che/ciò che · `*lasciare di` → smettere di; `*pensare in` → pensare a · `*tardo due ore` → ci metto due ore; ci vuole · lo ringrazio / la aiuto / gli telefono (el verbo decide el pronombre) · l'ho vista, li ho comprati · `*più bene`, `*parla migliore` · `*bellisimo` · `*parlarò/*parlaría`, `*vendrò` → verrò, vorremmo/vorremo · `*io parlava` (1.ª y 3.ª coinciden en español), b/v · `*sto d'accordo`, `*secondo io` → secondo me · credo di + infinitivo (no *credo che ho ragione) · falsos amigos (burro, aceto, caldo, largo, vaso, tovaglia, calze, salire/uscire, guardare, fermare/firmare, camera, coincidenza, pronto/presto/subito, aspettare/sperare, mi dispiace).

## Reglas de nivel (qué se produce y qué solo se reconoce)
Según CILS: producir passato prossimo, imperfetto, lo/la/li/le (con concordancia en pasado) y «se» hipotético; solo reconocer indirectos, «si» impersonal, indefinidos, «prima di». Futuro, condicional, ci/ne, Lei y congiuntivo no figuran en A2 oficial: entran como [A] (reconocer), salvo vorrei/potrei/dovresti y «se/quando + presente».

## Mecanismos de código que el borrador v1 daba por hechos y no existen
1. Variante errónea escrita a mano (`find_calque` solo llama a generadores).
2. Cápsulas «solo reconocer» (la prueba, el Cierre y el hito piden escribir desde el español).
3. Tipo de ejercicio `cloze_text` (relato).
4. Vocabulario de varias palabras (`find_vocab` exige exactamente una palabra por frase).
5. Camino para frases propias (`export._has_attribution` exige autor e id de Tatoeba).
6. Partir `items_by_code.json` (4,43 MB; con A2 supera 6 MiB) y el precache (11 MB).
7. Marca por nivel para no abrir el hito A2 con el nivel a medias.
8. Códigos de vocabulario deben empezar por `ERR_VOC_` (`partOf()` y pruebas dependen del prefijo).

## Corpus: lo que el conteo bruto ocultaba
- ~90 % de las candidatas A2 vienen por pivote (hay que reescribir el español; rechazo medido 37 %).
- No llegan a 30 útiles tras filtrar: dopo aver (~13), invece adversativo (~2), infatti (3), «secondo me» solo (~20), fechas (0–1), ordinales distintos de «primo». Justos: ci locativo (~30), mentre+imperfetto, -issimo, stare per, comparativo de igualdad, peggiore.
- El estimador marca B1/B2 a *ne* y al imperativo con Lei, y los filtros rechazan siempre condicional e imperativo formal.
- Sesgos: un autor (88 %), Tom/Mary 10–17 %, muerte/suicidio, passato remoto 15–20 % en algunos patrones.
- Voz humana NM1 por módulo (antes de auditar): m01 ~123, m02 ~33, m03 0, m04 ~9, m05 ~1, m06 ~5, m07 ~17, m08 ~17, m09 ~4, m10 ~6 → el dictado humano se declara «del nivel».

## Causas de las iteraciones de A1 y cómo las cubre el plan
Huecos de programa al final → Fase 1 + `evidence` en cobertura · corpus agotado → Fase 2 con ≥45 candidatas únicas por cápsula · frases fuera de nivel → filtro A2 + huella `test_a1_congelado` · traducciones por pivote → piloto a2m01 y auditoría ES↔IT antes de publicar · compuertas que aprueban solas → errores sembrados, muestra a ciegas, mínimos por parte · código atado a A1 → Fase 0 con pruebas de dos niveles · forma del módulo cambiante → forma congelada (§4) · fuentes buscadas varias veces → este inventario · audio humano tardío → auditoría NM1 en la Fase 2 · iPhone tardío → prueba tras Fase 0 y por módulo · veredictos sin respaldo → `content/audits/`.
