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
10. **Quando + futuro (#58)**: el calco real del español es el contrario del que muestra la fuente (en español "cuando llegue" lleva subjuntivo; en italiano "quando arriverò"). Candidato a código propio, sin crear: la fuente no da el ejemplo correcto del error.
11. **Italianamente**: "attualmente" no es falso amigo (= actualmente), "assistere" es ambiguo, y su ejemplo "He comido pizza ayer" mezcla variedades del español. Descartados.
12. **Voseo**: las fuentes de Un Italiano Vero usan voseo ("Querés", "imaginás"); no copiar su redacción (la interfaz usa tuteo).
13. **Formas erróneas construidas por nosotros** (la fiore, i gattos…) están marcadas en `notes`: las fuentes dan solo la forma correcta.
14. **Fonética**: ERR_SC_PALATAL, ERR_GLI_PALATAL, ERR_C_G_PALATAL y ERR_Z_AFFRICATE salen de descripciones en prosa; falta confirmar la IPA y el patrón de error real (yeísmo chileno) con audio antes de validarlos.
