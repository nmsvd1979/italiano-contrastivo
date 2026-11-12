# Dudas sobre el contenido en italiano

Cosas de las fuentes de NotebookLM que no se deben copiar sin verificar. Cada una se resuelve antes de pasar a `validated`.

1. **atmosfera / atmósfera (fuente 79103ab3, tabla de heterotónicas)**: las columnas L1/L2 traen la IPA invertida y el texto dice "de llana en español a esdrújula en italiano", al revés. Lo correcto: español atmósfera (esdrújula), italiano atmosfera (llana). No usarla hasta confirmarla con un diccionario.
2. **adesso / adrede (misma fuente, "falsos amigos prosódicos")**: no son un par de falso amigo (adesso = ahora, adrede = a propósito). Descartado.
3. **"Penso a questo" como calco**: es italiano gramatical. El error real es no pronominalizar con *ci* donde se espera. Reescribir el ejemplo de `ERR_CLITIC_CI`.
4. **"Vado a la mia casa" (fuente 5f4ef3d8, ejemplo del SLM)**: "a la mia casa" no es italiano; el contraste útil es "a casa mia" frente a "a mi casa". Candidato a código propio, aún sin crear.
5. **siete/sette**: en español "siete" también es el numeral 7, no solo el verbo ser. Preferir nono/nonno, pala/palla, copia/coppia.
6. **Niveles CEFR de ERR_PERSONAL_A, ERR_PREP_PENSARE, ERR_FALSE_FRIEND, ERR_GEMINATE, ERR_HETEROTONIC**: la fuente no los indica; los valores actuales son estimaciones.
7. **telefono**: la fuente lo lista como heterotónica pero el acento recae en la misma sílaba (solo cambia el timbre de la vocal). No cuenta como `ERR_HETEROTONIC`.
