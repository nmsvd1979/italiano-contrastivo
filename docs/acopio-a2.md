# Acopio de A2 — informe (2026-11-26)

Resultado de la Fase 2 del plan A2 (`docs/specs/2026-11-26-plan-a2.md`): antes de construir, comprobar que hay material para las 36 cápsulas.
Reproducible con `python scripts/acopio_a2.py` (escribe `data/work/acopio/<cápsula>.json` e `informe.json`; no se versiona).

## 1. Candidatas por cápsula

Criterio: ≥ 45 candidatas únicas utilizables (80 si la cápsula necesita variantes escritas a mano, porque cada una exige escribirla y auditarla), tras el filtro de nivel A2, quitar casi-duplicados (similitud ≥ 0,75) y limitar Tom/Mary al 20 %.
Cuando una cápsula tiene generador suficiente, solo se ofrecen las frases que el generador reconoce (las que solo coinciden con un patrón tenían más ruido).

| Cápsula | Código | Método | Únicas | Con generador | Español directo | Necesarias | Estado |
|---|---|---|---:|---:|---:|---:|---|
| a2c01 · Participios que el español no anticipa | ERR_PP_PARTICIPI_IRREG | generador (tabla cerrada) | 1116 | 1116 | 90 | 45 | OK |
| a2c02 · ¿Avere o essere? | ERR_PP_AUSILIARE | generador (listas disjuntas de u08) | 2520 | 2520 | 174 | 45 | OK |
| a2c03 · Reflexivos en pasado | ERR_REFLEXIVE_AUX | generador (concordancia con sujeto cer | 1325 | 1325 | 101 | 45 | OK |
| a2c04 · Concordancia con essere, y piacere en pasa | ERR_PARTICIPLE_AGREEMENT | generador ampliado (sujeto cerrado) +  | 619 | 619 | 8 | 45 | OK |
| a2c05 · Già, non… ancora, appena, non… più, mai | ERR_AVVERBI_PASSATO | variante a mano (auditada dos veces) | 2745 | 0 | 213 | 80 | OK |
| a2c06 · Imperfetto: formas y personas | ERR_IMPERFETTO_FORMA | generador (tabla cerrada) | 857 | 857 | 52 | 45 | OK |
| a2c07 · C'era, c'erano, c'è stato | ERR_CE_IMPERFETTO | variante a mano + generador de concord | 89 | 89 | 6 | 45 | OK |
| a2c08 · Hace…, desde…, en…: fa, da, per, fra, scor | ERR_TEMPO_FA_DA | mixto: generador («N anni fa») + varia | 123 | 123 | 12 | 45 | OK |
| a2c09 · Vocabulario: carácter y relaciones | ERR_VOC_CARATTERE | vocabulario (palabras de una sola pala | 113 | 113 | 22 | 45 | OK |
| a2c10 · Trama y fondo: passato prossimo o imperfet | ERR_PP_VS_IMPERFETTO | ejercicio de relato (cloze_text) + fra | 512 | 0 | 47 | 80 | OK |
| a2c11 · Prima di + infinitivo, dopo + sustantivo | ERR_PRIMA_DI | variante a mano (dopo aver: solo recon | 154 | 0 | 15 | 80 | OK |
| a2c12 · Lo/la/li/le o gli/le: el verbo decide | ERR_CLITIC_DIRECT_INDIRECT | generador restringido + variante a man | 514 | 514 | 39 | 45 | OK |
| a2c13 · Sin «a» personal | ERR_PERSONAL_A | generador ampliado al pasado + frases | 163 | 163 | 15 | 45 | OK |
| a2c14 · El pronombre pegado: farlo, vederla | ERR_CLITICO_POSIZIONE | generador | 1487 | 1487 | 85 | 45 | OK |
| a2c15 · L'ho vista, li ho comprati | ERR_PARTICIPLE_AGREEMENT_CLITIC | generador (solo li, le seguras) | 323 | 323 | 4 | 45 | OK |
| a2c16 · Ne de cantidad | ERR_CLITIC_NE | variante a mano + frases propias (el c | 18 | 0 | 1 | 80 | OK con 27 frases propias |
| a2c17 · Più… di / che | ERR_COMPARATIVE_DI | generador ampliado + frases | 170 | 170 | 16 | 45 | OK |
| a2c18 · Meglio o migliore; -issimo | ERR_COMPARATIVO_IRREG | generador (listas cerradas) | 164 | 164 | 35 | 45 | OK |
| a2c19 · Qualche + singular, dei, qualcosa di | ERR_INDEFINITI | generador | 233 | 233 | 17 | 45 | OK |
| a2c23 · Quello che y el relativo «che» | ERR_RELATIVO_CHE | generador parcial + frases | 767 | 767 | 86 | 45 | OK |
| a2c20 · Falsos amigos I: casa, comida y compras | ERR_VOC_FALSI_CASA | vocabulario (una palabra por frase) | 92 | 92 | 10 | 45 | OK |
| a2c21 · Situar: di fronte a, accanto a, in fondo a | ERR_SPAZIO_PREP | variante a mano | 62 | 62 | 7 | 45 | OK |
| a2c22 · Fechas, años y horarios | ERR_DATE_ORARI | frases propias (el corpus tiene 0–22 f | 277 | 15 | 27 | 80 | OK |
| a2c24 · «Si» impersonal y carteles | ERR_SI_IMPERSONALE | generador con guardas | 48 | 48 | 7 | 45 | OK |
| a2c25 · Vocabulario: oficinas y banco (solo lo que | ERR_VOC_UFFICI | vocabulario (sin formas de A1) | 116 | 116 | 14 | 45 | OK |
| a2c26 · Futuro y condicional: la raíz | ERR_FUTURO_RADICE | generador (tablas cerradas) | 3943 | 3943 | 265 | 45 | OK |
| a2c27 · Verbos con preposición: smettere di, cerca | ERR_PREP_FIXED_GOV | generador restringido | 644 | 644 | 46 | 45 | OK |
| a2c28 · Vocabulario: cultura, medios y tecnología | ERR_VOC_CULTURA | vocabulario (sin formas de A1) | 102 | 102 | 35 | 45 | OK |
| a2c29 · Imperativo tu/voi con pronombres: dammi, f | ERR_IMPERATIVO_PRONOMI | generador (tabla, inicio de frase) | 231 | 231 | 19 | 45 | OK |
| a2c30 · Fórmulas con Lei: scusi, senta, si accomod | ERR_IMPERATIVO_LEI | generador con vocativo formal + varian | 201 | 13 | 7 | 80 | OK |
| a2c31 · Acentos y dobles de A2 | ERR_ACCENT_TRANSFER | generador ortográfico | 7647 | 7647 | 617 | 45 | OK |
| a2c32 · Ci de lugar, ci vuole, ci metto | ERR_CLITIC_CI | variante a mano | 91 | 0 | 10 | 80 | OK |
| a2c33 · Falsos amigos II: ciudad, viaje y acciones | ERR_VOC_FALSI_CITTA | vocabulario (una palabra por frase) | 92 | 92 | 22 | 45 | OK |
| a2c34 · Vocabulario: viaje y alojamiento | ERR_VOC_VIAGGIO | vocabulario (sin formas de A1) | 104 | 104 | 22 | 45 | OK |
| a2c35 · Opinar sin congiuntivo: secondo me, penso  | ERR_OPINIONE | generador | 45 | 45 | 8 | 45 | OK |
| a2c36 · Perché, quando, per + infinitivo | ERR_SUBORDINATE | generador parcial | 2326 | 2326 | 104 | 45 | OK |

**36 de 36 cápsulas pasan.** La única que depende de frases propias es a2c16 (ne de cantidad): el corpus da pocas válidas y el resto lo escribe la IA como `authored`.

## 2. Precisión medida (revisores independientes, sin ver el código)

- 1.ª medición (4 agentes, 1.077 frases, 30 por cápsula): precisión muy desigual (de 4/30 a 30/30). Causas: patrones sueltos que casan otro sentido (`stato`, `mostra` verbo, `ogni giorno` en presente), passato remoto, política/religión/violencia, pronombres combinados, congiuntivo.
- Correcciones: filtros de A2 más duros (`pipeline/audit_rules.py`), vocabulario con palabras «solo sustituto» (`|s` en `vocab_a2.yaml`), regex de evidencia más estrictas, generadores acotados (Lei solo con vocativo formal; `si deve` fuera; `a` personal solo en 1.ª/2.ª persona).
- 2.ª medición con **muestra nueva** (semilla distinta, 1.068 frases): **88,8 % aptas**. Tras una segunda ronda de arreglos (remoto 1.ª persona y reflexivo, tema, léxico B1, vocabulario) las reglas dejan fuera 59 de 120 malas conservando 909 de 948 buenas: **93,9 %**, pero esa cifra se midió con las mismas frases que guiaron el arreglo, así que no es independiente. Lo honesto: 88,8 % independiente, 93,9 % optimista; la medición que cuenta será la del módulo real.
- Versiones erróneas: en las cápsulas de gramática el revisor las halló incorrectas en casi todos los casos. Dos matices aceptados y documentados: «c'era + plural» se oye en la lengua hablada pero el estándar pide «c'erano»; y las sustitutas de vocabulario son frases válidas con otro significado (sirven para comprobar que se entendió la palabra, no son «error gramatical»).

## 3. Piloto a2m01 (auditoría entera de a2c01–a2c05, 40 candidatas cada una)

| Cápsula | keep | reject | doubt |
|---|---:|---:|---:|
| a2c01 participios | 32 | 5 | 3 |
| a2c02 avere/essere | 36 | 4 | 0 |
| a2c03 reflexivos | 33 | 6 | 1 |
| a2c04 concordancia | 28 | 11 | 1 |
| a2c05 già/ancora/appena/più/mai | 13 | 24 | 3 |
| **Total** | **142 / 200 = 71 %** | 50 | 8 |

Umbral del plan: si la aprobación real es < 60 %, se recalcula todo. **71 % ≥ 60 %: el plan se mantiene.** Pero:
- a2c04 queda en 28 (necesita ≥ 30): hay que auditar más candidatas (hay 619).
- a2c05 aprueba solo 33 %: sus frases afirmativas con «già/ancora» no admiten un error definitivo (cambiar de palabra también es válido). Solo sirven «non… più» (error *già non…) y «sei già stato» (error *hai già stato). Hay que elegir candidatas por ese subpatrón y pedir ≥ 90 para llegar a 30.
- Cada variante a mano de a2c05 necesita la segunda pasada (`audit2`) antes de entrar; el «già non…» marcado como error debe confirmarse en esa pasada.
- Tanda y veredictos: `scripts/acopio_pack.py`, `content/audits/2026-11-26-piloto-a2m01.json` (aún no aplicados a la base; se aplicarán con `scripts/capsule_apply.py`, que ahora acepta `correcto`/`errado`/`kind`/`audit2` y escribe `pipeline/exercises/manual_calques.json`).

## 4. Voz humana (Tatoeba NM1, CC BY 4.0)

264 candidatas A2 con audio humano sin usar; auditadas: 157 keep, 107 reject. Keep por módulo: a2m01 46, a2m02 22, a2m03 1, a2m04 25, a2m05 9, a2m06 5, a2m07 16, a2m08 13, a2m09 7, a2m10 7, nivel 6. Faltan frases con voz humana en a2m03, a2m05, a2m06, a2m09 y a2m10 (< 8): el dictado de esos módulos mezclará voz humana con Piper o se ampliará el criterio. La entonación de nativos en diálogos sigue como hueco declarado. Auditoría: `content/audits/2026-11-26-voz-humana-a2.json`; se aplica con `scripts/voz_humana_apply.py --audit … --cefr A2`.

## 5. Lo que queda de la Fase 2

- Copia local de los libros abiertos (`data/raw/libros/`): en curso; solo Piacere! al momento de escribir.
- Frases propias de a2c16 (27 por escribir) con `scripts/frases_propias.py`; la interfaz ya declara las oraciones `authored` en «Acerca de».
- Respaldos hechos: `content/audits/2026-11-26-respaldo-verdicts-a1.json`.
