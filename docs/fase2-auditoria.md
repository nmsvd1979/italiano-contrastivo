# Fase 2 — Auditoría de las 200 oraciones revisadas

**Contexto.** La compuerta de 200 la hizo una persona que no domina el italiano (lo declaró); su informe mostró 100% en todo, lo que no era creíble (se encontraron etiquetas equivocadas aceptadas). Dos agentes de IA auditaron las 200 oraciones **sin ver las decisiones humanas**. **No son hablantes nativos**: no inventan italiano y marcan "dudoso" cuando no están seguros, pero su veredicto no equivale al de un nativo.

**Regla de seguridad al aplicar** (`scripts/audit_apply.py`): el auditor solo puede volver las cosas más conservadoras (rechazar, dejar en duda, quitar un código, corregir un nivel); nunca convierte un rechazo en aprobación. Todo quedó con `reviewer = "llm-audit"`; el historial humano se conserva en `reviews`. Respaldo previo: `data/work/authoring.pre-audit.db` (no versionado).

## Veredictos de los auditores
- Lote 1: keep 24 · fix 58 · reject 15 · doubt 3. Lote 2: keep 16 · fix 57 · reject 24 · doubt 3.
- Aplicado: 116 aprobadas con ajustes (códigos quitados y/o nivel corregido), 36 confirmadas sin cambios, 31 rechazadas, 6 en duda, 2 en duda por par pivote sin confirmar, 9 rechazos humanos que se dejaron.
- Estado final de las 200: **152 validadas, 40 rechazadas, 8 en duda**. Última decisión: 155 del auditor, 45 humanas.

## Qué reveló
- **Pivote: 37% de rechazo** (la revisión humana decía 9%). Los rechazos son por traducción que pierde género o número (*una*→*uno*, *pronta*→*listo*) o cambia la persona (Lei/usted ↔ tú). Es justo lo que enseña este proyecto.
- **Nivel:** las reglas inflan por largo (la mayoría de los B2 estimados eran B1) y a veces quedan cortas (*Pare che… sia* salió A1). La calibración posterior (largo solo ≤ B1, imperativo con punto) ya corrige parte; el cuadro de acuerdo mezcla estimaciones anteriores.
- **Reglas de baja precisión según el auditor:** `relativa_libera_indicativo` 0/6 · `eterotonica` 1/8 · `temporale_futuro_indicativo` 1/5 · `congiuntivo_superlativo` 2/7 · `pronomi_combinati` 6/20 · `comparativo_con_di` 4/12 · `possessivo_grafia` 10/22 · `genere_divergente` 6/13 · `riflessivo_con_essere` 9/18 · `accento_finale` 25/44.
- **Patrones concretos (lote 1):** `ERR_CLITIC_CI` y `ERR_REFLEXIVE_AUX` saltan con el existencial *ci sono stati*; `ERR_POSSESSIVE_SPELLING` con cualquier posesivo (no solo *mio*); `ERR_CLITIC_NE` con el *ne* argumental; `ERR_CLITIC_COMBINED` con *ce ne* / *ce la*; `ERR_CONGIUNTIVO_OVERUSE_*` con *quando* y *chi* interrogativos; `ERR_CONGIUNTIVO_SUPERLATIVE` con comparativos; `ERR_ACCENT_TRANSFER` con monosílabos (*più, è, sì*); `ERR_GEMINATE_NASAL_CONFUSION` con cualquier *gn*; `ERR_MANCARE` cuando significa *faltar*.
- **`ERR_HETEROTONIC` con *oceano***: los auditores lo marcan falso porque *oceano* y *océano* llevan el acento en la misma sílaba; la definición del código (y la fuente) estaría equivocada. Anotado como duda; no se corrige a ojo.

## Límites
- La validación **no es de un hablante nativo**: es una persona que no sabe italiano más un auditor IA. Declarado así en los datos (`reviewer`) y en el manifiesto del export.
- Un solo auditor por oración, sin acuerdo entre auditores. No se mide el error del propio auditor.
- La precisión por regla sale de 200 oraciones con muestras pequeñas por regla (5–120).

## Tanda 1 de traducción desde el italiano (plan híbrido)
**Decisión:** solo con traducciones directas no alcanza (12 códigos con <20 oraciones directas, 123 B2 directos). Para lo que falta se toma la oración **italiana** de Tatoeba y se **traduce al español desde el italiano** (conserva género, número, persona y formalidad); el español del pivote no se usa nunca. El sistema ya no sirve ni exporta pares `pivot` (`translation_kind: "llm"` para las traducidas).
- Tanda 1: 175 oraciones de 14 códigos escasos (`scripts/translate_pack.py` → agente traductor/auditor → `scripts/translate_apply.py`). Resultado: 152 aprobadas (`reviewer = llm-audit`), 14 rechazadas por no cubrir ningún código escaso, 4 rechazadas (interrogativas que no son subordinadas, etc.), 5 en duda.
- Criterio: una oración solo entra si el auditor confirma el italiano y al menos un código escaso aplica. Lo dudoso no entra.
- Costo medido: ~126 mil tokens por 175 oraciones (~720 por oración) en formato compacto.

## Lo que NO está resuelto
- **Cantidad validada:** hoy hay ~240 oraciones validadas utilizables (directas + llm) frente a ~17 mil directas pendientes. Validar ~40 por código para los 47 códigos (~1.900 oraciones) costaría del orden de 1,4 millones de tokens.
- **Nada es verificación nativa.** Las traducciones y los veredictos son de IA; el italiano de Tatoeba no está garantizado (algunas oraciones lo escriben aprendices).
- **Reglas de baja precisión** sin corregir todavía (ver lista arriba) y pares pivote ya validados (62) que quedan fuera del export.
