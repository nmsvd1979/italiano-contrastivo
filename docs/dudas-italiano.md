# Dudas sobre el contenido en italiano

Cosas de las fuentes de NotebookLM que no se deben copiar sin verificar. Cada una se resuelve antes de pasar a `validated`.

1. **atmosfera / atmósfera (fuente 79103ab3, tabla de heterotónicas)**: las columnas L1/L2 traen la IPA invertida y el texto dice "de llana en español a esdrújula en italiano", al revés. Lo correcto: español atmósfera (esdrújula), italiano atmosfera (llana). No usarla hasta confirmarla con un diccionario.
2. **adesso / adrede (misma fuente, "falsos amigos prosódicos")**: no son un par de falso amigo (adesso = ahora, adrede = a propósito). Descartado.
3. **"Penso a questo" como calco**: es italiano gramatical. El error real es no pronominalizar con *ci* donde se espera. Reescribir el ejemplo de `ERR_CLITIC_CI`.
4. **"Vado a la mia casa" (fuente 5f4ef3d8, ejemplo del SLM)**: "a la mia casa" no es italiano; el contraste útil es "a casa mia" frente a "a mi casa". Candidato a código propio, aún sin crear.
5. **siete/sette**: en español "siete" también es el numeral 7, no solo el verbo ser. Preferir nono/nonno, pala/palla, copia/coppia.
6. **Niveles CEFR de ERR_PERSONAL_A, ERR_PREP_PENSARE, ERR_FALSE_FRIEND, ERR_GEMINATE, ERR_HETEROTONIC**: la fuente no los indica; los valores actuales son estimaciones.
7. **telefono**: la fuente lo lista como heterotónica pero el acento recae en la misma sílaba (solo cambia el timbre de la vocal). No cuenta como `ERR_HETEROTONIC`.

## Ampliación de la taxonomía (fuentes a3d81c5f, 2c06bfeb, 667a65f8, 7bb78aa1)

8. **"100 errores comunes" mezcla errores de angloparlantes**: avere fame/caldo/freddo/sonno/paura/bisogno, "Sono trent'anni", "essere d'accordo" y sapere/conoscere usan en español la misma estructura que en italiano; no son calcos del español y no se incluyeron. Tampoco portare/prendere, sentire/ascoltare, cercare/trovare, imparare/insegnare, restare/lasciare.
9. **Indicativo tras opinión/deseo (#51, #52, #57…)**: la propia fuente aclara que el indicativo aparece en el habla coloquial; el congiuntivo es la norma del italiano estándar cuidado. Los ítems deben decir "estándar formal", no "incorrecto".
10. **Quando + futuro (#58)**: el calco real del español es el contrario del que muestra la fuente (en español "cuando llegue" lleva subjuntivo; en italiano "quando arriverò"). **Resuelto**: lo cubre `ERR_CONGIUNTIVO_OVERUSE_TEMPORAL`, con el contraste de Aula Fácil.
11. **Italianamente**: "attualmente" no es falso amigo (= actualmente), "assistere" es ambiguo, y su ejemplo "He comido pizza ayer" mezcla variedades del español. Descartados.
12. **Voseo**: las fuentes de Un Italiano Vero usan voseo ("Querés", "imaginás"); no copiar su redacción (la interfaz usa tuteo).
13. **Formas erróneas construidas por nosotros** (la fiore, i gattos…) están marcadas en `notes`: las fuentes dan solo la forma correcta.
14. **Fonética**: ERR_SC_PALATAL, ERR_GLI_PALATAL, ERR_C_G_PALATAL y ERR_Z_AFFRICATE salen de descripciones en prosa; falta confirmar la IPA y el patrón de error real (yeísmo chileno) con audio antes de validarlos.

## Ampliación con fuentes académicas (6b81be03, df243994, 09f91a6f, 25e38e9a, 88ea1c0a, daedf2c6)

15. **Aula Fácil, ejercicios**: la clave del ejercicio 6 repite la del 7 y hay erratas ("Ti ciamo", "lésame", "peor"). Solo se usó su tabla de contrastes, no los ejercicios.
16. **Congiuntivo en interrogativas indirectas (a.4)**: la fuente dice "Mi domando se… sia"; en el uso real el indicativo también es normal. No se creó código. Lo mismo para `ERR_CONGIUNTIVO_SUPERLATIVE` y `ERR_CONGIUNTIVO_IMPERSONAL`: son norma formal, no errores absolutos.
17. **Formas erróneas construidas**: ERR_CONGIUNTIVO_OVERUSE_*, ERR_CLITIC_DOUBLING (ejemplo principal), ERR_INDIRECT_PRONOUN_GENDER, ERR_PARTICIPLE_AGREEMENT_CLITIC, ERR_POSSESSIVE_SPELLING y ERR_PREP_ARTICLE_CONTRACTION usan ejemplos nuestros; los reales de aprendices (Lancione) van en `notes`.
18. **Lancione 2025**: marca con * las formas erróneas y mezcla errores de italófonos; solo se tomaron los de hispanohablantes. No se leyó el cuerpo completo del artículo, solo los pasajes sobre artículos, preposiciones, pronombres, auxiliares, ortografía y comparativos.
19. **Arias Bedoya 2021**: es una descripción teórica; los ejemplos numerados no vienen en el texto. De ahí solo se tomó lo que cita de Falcinelli sobre *magari*.
20. **Pandolfi 2026 y Barbasán 2021**: solo se leyó el resumen. Pandolfi estudió hablantes de Buenos Aires; el patrón en hablantes chilenos no está confirmado. Barbasán propone clasificar los errores léxicos como interlingüísticos/intralingüísticos y de forma/de significado; es un posible campo futuro, no se agregó.
21. **Oviedo**: es un libro de ~720 mil caracteres; se leyeron solo los pasajes que comparan con el español (búsqueda por palabras clave), no el libro completo.
22. **Fuentes sin leer**: Partículas/Particelle (0a34e3e6), componente fónico para italófonos (e81bdbbc), "Por qué mi español suena a italiano" (5e7eade4; es italófono→español), f3cfa69f (aparente duplicado de daedf2c6) y el resto.

23. **`oceano` como heterotónica (fuente 79103ab3 y catálogo)**: dos auditores IA independientes y el revisor final indican que *oceano* [oˈtʃɛano] y *océano* [oˈθe.a.no] llevan el acento en la misma sílaba (*ce*), así que no sería heterotónica. Sin confirmar con un diccionario; mientras tanto la regla `eterotonica` tiene 1 de 8 aceptadas.
24. **Auditoría IA, no nativa**: ver `docs/fase2-auditoria.md`.
