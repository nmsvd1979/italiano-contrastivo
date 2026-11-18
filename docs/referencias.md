# Referencias para contrastar el contenido (2026-11-18)

Objetivo: no depender solo de Tatoeba + auditoría de IA. Estas fuentes se usan como **mapa y verificación**, no se copian (son documentos con derechos); lo que entra a la app sigue siendo oraciones de Tatoeba con atribución, listas propias y generadores deterministas.

## Fuentes revisadas
| Fuente | Qué aporta | Estado / licencia |
|---|---|---|
| **Sillabo di riferimento A1** (Enti certificatori dell'italiano L2: Siena, Perugia, Roma Tre, Dante Alighieri), PDF de la Regione Calabria | Lista oficial de acciones comunicativas, formas gramaticales y **campos léxicos** de A1 (Tab. 9 y 13) | **Leído completo en lo útil.** Documento público de los certificadores; se resume, no se reproduce. Está pensado para inmigrantes: algunos campos (oficinas públicas) son poco relevantes para un hispanohablante chileno. |
| **Profilo della lingua italiana** (Spinelli y Parizzi, 2010; CVCL, Univ. per Stranieri di Perugia) | Descriptores y **lista de frecuencia por niveles A1–B2** | No leído: la página de la universidad dio un error de certificado SSL desde este equipo (no se desactivó la verificación). Pendiente de bajar por otra vía. |
| **KELLY** (Språkbanken / Oslo) | Lista de frecuencia del italiano con **niveles CEFR** | Existe; **la licencia no está confirmada** para el archivo italiano (fuentes dicen CC BY-NC-SA 2.0; uso personal no comercial sería compatible). Revisar la licencia en la página de descarga antes de usarla. |
| **NVdB** (Nuovo vocabolario di base, De Mauro 2016, ~7.000 palabras) | Vocabulario fundamental, de alto uso y de alta disponibilidad | Publicado en línea; **licencia no confirmada**. Un extracto en GitHub (pettarin/nvdb) existe; revisar su licencia. |
| **LIP** (Lessico dell'Italiano Parlato) | Frecuencias del italiano hablado (el sillabo lo recomienda para armar el léxico A1) | Pendiente de ubicar. |
| Tatoeba | Oraciones y traducciones | En uso (CC BY 2.0 FR, atribuciones al día). |
| Wiktionary / Wikibooks (italiano) | Verificar tablas de conjugación y glosas | Pendiente; CC BY-SA. |

## Mapa del sillabo A1 frente a la app
Leyenda: ✓ cubierto · ◐ parcial · ✗ falta (queda en la ruta como «próximamente» con la fuente).

| Sillabo A1 | Estado en la app |
|---|---|
| Presentarse, saludar, despedirse, agradecer, pedir aclaraciones («come?», «non ho capito») | ✗ |
| Gustos: mi piace / mi piacciono | ✗ |
| Describir personas, objetos y lugares; presentar a alguien | ◐ (vocabulario + essere/avere) |
| Situar en el tiempo: ieri, oggi, domani | ◐ (días y meses; faltan los adverbios) |
| Pedir permiso, dar instrucciones (apri, chiudi, vai) | ◐ modales ✓ · imperativo ✗ |
| Pronombres sujeto ✓ · pronombres tónicos (me, te, lui…) ✗ · demostrativos (questo, quello) ✗ | ◐ |
| Cuantificadores: poco, molto, tutto, niente | ✗ |
| Verbos: presente ✓, servili ✓, passato prossimo básico, «vorrei» | ◐ (passato prossimo en A2; vorrei ✗) |
| Adverbios: sì/no, perché ✓, prima/dopo, qui/là · preposiciones simples ◐ · conjunción «e» | ◐ |
| Frases: negación explícita ✗ · preguntas sí/no ✗ · preguntas con chi/dove/quando/perché ✓ · «piove» ✗ | ◐ |
| Léxico: familia ✓ · casa ✓ · mobiliario ✓ · objetos ✓ · animales ✓ · comida ✓ · trabajo ✓ · escuela ✓ · cuerpo ✓ · tiendas ◐ | ✓/◐ |
| Léxico: **ropa** ✗ · **clima y naturaleza** ✗ · **higiene** ✗ · **nacionalidades** ✗ · oficinas públicas (poco relevante) ✗ | ✗ |
| Fonología: fonemas c/g, sc, gli ✓ · entonación de pregunta vs afirmación ✗ | ◐ |

Idea clave del propio sillabo: en A1 pesa más **saber hacer cosas con la lengua** (acciones comunicativas) que la corrección gramatical. La app es fuerte en corrección de errores de hispanohablantes; le falta una capa de **situaciones comunicativas**.

## Cómo se usará (en este orden)
1. El sillabo A1 es el **índice de lo que falta** (unidades «próximamente» con su fuente).
2. Las listas de frecuencia con niveles (Profilo, KELLY, NVdB) validan que cada palabra de `vocab_a1.yaml` es realmente A1 y completan las que falten, una vez confirmada su licencia.
3. Wiktionary/Wikibooks validan las tablas de conjugación escritas a mano en `pipeline/exercises/present.py`.
4. El sillabo A2 y B1 de los mismos certificadores guían las fases siguientes.
