"""Textos propios del proyecto (escritos por la IA por encargo del usuario, 2026-11-24) para las funciones A1 sin fuente abierta:
bar con caja, tienda de ropa, tiempo, aclaraciones, SMS, menú, horario, formulario, cartel, anuncio y dos textos de examen.

REGLA: se marcan `authored: true`, nacen sin revisión de un nativo, el italiano es simple y se apoya en frases ya verificadas de libros
abiertos (OpenLearn, Giornate italiane, Piacere!). La interfaz lo declara. Uso: python scripts/autorales.py (reescribe content/readings/*.json)."""
import json
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "content" / "readings"
SRC = {"book": "Texto escrito por la IA (Claude) para esta app", "authors": "Claude (IA), a pedido del usuario", "url": "https://github.com/nmsvd1979/italiano-contrastivo",
       "license": "Texto propio del proyecto, sin revisión de un hablante nativo"}
TR = "IA (Claude), sin revisar por un hablante nativo"


def dialog(id, title, lines, questions, adaptation, **extra):
    r = {"id": id, "title": title, "level": "A1", "kind": "dialogo", "authored": True, "source": SRC, "adaptation": adaptation,
         "sentences": [{"id": f"{id}_{i:02d}", "it": it, "es": es, "speaker": sp} for i, (sp, it, es) in enumerate(lines)],
         "questions": [{"prompt_es": p, "options": o, "answer": a, "evidence": e} for p, o, a, e in questions], "translation": TR, **extra}
    return r


def doc(id, title, head, rows, questions, adaptation, **extra):
    return {"id": id, "title": title, "level": "A1", "kind": "documento", "authored": True, "source": SRC, "adaptation": adaptation, "table": {"head": head, "rows": rows}, "sentences": [],
            "questions": [{"prompt_es": p, "options": o, "answer": a} for p, o, a in questions], "translation": TR, **extra}


ITEMS = [
    dialog("rd_bar", "Al bar: ordinare e pagare", [
        ("Cassiera", "Buongiorno! Desidera?", "¡Buenos días! ¿Qué desea?"),
        ("Cliente", "Buongiorno. Vorrei un cappuccino e una brioche, per favore.", "Buenos días. Quisiera un capuchino y una brioche, por favor."),
        ("Cassiera", "Sono tre euro e cinquanta.", "Son tres euros con cincuenta."),
        ("Cliente", "Ecco a Lei.", "Aquí tiene."),
        ("Cassiera", "Grazie. Ecco lo scontrino.", "Gracias. Aquí tiene el comprobante."),
        ("Cliente", "Grazie mille.", "Muchas gracias."),
        ("Barista", "Mi dica!", "¡Dígame!"),
        ("Cliente", "Un cappuccino e una brioche, per favore. Ecco lo scontrino.", "Un capuchino y una brioche, por favor. Aquí está el comprobante."),
        ("Barista", "Subito! Ecco il cappuccino.", "¡Enseguida! Aquí está el capuchino."),
        ("Cliente", "Grazie. Scusi, dov'è il bagno?", "Gracias. Disculpe, ¿dónde está el baño?"),
        ("Barista", "È in fondo a destra.", "Está al fondo a la derecha."),
        ("Cliente", "Grazie. Arrivederci!", "Gracias. ¡Hasta luego!"),
        ("Barista", "Arrivederci, buona giornata!", "Hasta luego, ¡que tenga un buen día!"),
    ], [("¿Qué pide el cliente?", ["Un café solo", "Un capuchino y una brioche", "Un té y un cuerno"], 1, 1),
        ("¿Cuánto paga?", ["Tres euros con cincuenta", "Cuatro euros", "Dos euros"], 0, 2),
        ("¿Qué hace el cliente primero?", ["Pide en la barra", "Paga en la caja y recibe el comprobante", "Busca una mesa"], 1, 4),
        ("¿Qué le entrega al barista?", ["El dinero", "El comprobante", "El menú"], 1, 7),
        ("¿Dónde está el baño?", ["Al fondo a la derecha", "Afuera", "A la izquierda de la caja"], 0, 10)],
        "Diálogo escrito por la IA con las frases del curso de OpenLearn «Ordering and paying» (Desidera?, Mi dica, Vorrei, Ecco lo scontrino) y el sistema italiano de pagar en la cassa y pedir en la barra con el scontrino."),
    dialog("rd_negozio", "In un negozio di abbigliamento", [
        ("Commessa", "Buongiorno, come posso aiutarla?", "Buenos días, ¿cómo puedo ayudarla?"),
        ("Cliente", "Buongiorno. Cerco una camicia bianca.", "Buenos días. Busco una camisa blanca."),
        ("Commessa", "Che taglia porta?", "¿Qué talla usa?"),
        ("Cliente", "Porto la media.", "Uso la mediana."),
        ("Commessa", "Ecco una camicia bianca. Le piace?", "Aquí tiene una camisa blanca. ¿Le gusta?"),
        ("Cliente", "Sì, mi piace molto. Posso provare la camicia?", "Sí, me gusta mucho. ¿Puedo probarme la camisa?"),
        ("Commessa", "Certo! Il camerino è là, a sinistra.", "¡Claro! El probador está allá, a la izquierda."),
        ("Cliente", "Va bene, è perfetta. Quanto costa?", "Está bien, es perfecta. ¿Cuánto cuesta?"),
        ("Commessa", "Costa trentacinque euro.", "Cuesta treinta y cinco euros."),
        ("Cliente", "È un po' cara. C'è uno sconto?", "Es un poco cara. ¿Hay descuento?"),
        ("Commessa", "Sì, oggi c'è il dieci per cento di sconto.", "Sí, hoy hay un diez por ciento de descuento."),
        ("Cliente", "Bene, la prendo. Posso pagare con la carta?", "Bien, me la llevo. ¿Puedo pagar con tarjeta?"),
        ("Commessa", "Certo. Alla cassa, prego.", "Claro. En la caja, por favor."),
    ], [("¿Qué busca el cliente?", ["Una chaqueta negra", "Una camisa blanca", "Un pantalón azul"], 1, 1),
        ("¿Qué talla usa?", ["La pequeña", "La mediana", "La grande"], 1, 3),
        ("¿Cuánto cuesta la camisa?", ["Treinta y cinco euros", "Quince euros", "Cincuenta euros"], 0, 8),
        ("¿Qué descuento hay hoy?", ["Cinco por ciento", "Veinte por ciento", "Diez por ciento"], 2, 10),
        ("¿Cómo quiere pagar?", ["En efectivo", "Con tarjeta", "No quiere pagar"], 1, 11)],
        "Diálogo escrito por la IA con las expresiones de «Espressioni per comprare in un negozio di abbigliamento» (Giornate italiane, CC BY-NC-SA): Come posso aiutarla?, Quanto costa?, la taglia, lo sconto, pagare con la carta."),
    dialog("rd_meteo", "Che tempo fa?", [
        ("Marta", "Ciao Luca, sei a Milano?", "Hola Luca, ¿estás en Milán?"),
        ("Luca", "Sì, sono a Milano. E tu dove sei?", "Sí, estoy en Milán. ¿Y tú dónde estás?"),
        ("Marta", "Sono a Roma. Qui c'è il sole e fa caldo.", "Estoy en Roma. Aquí hay sol y hace calor."),
        ("Luca", "Che bello! Qui piove da ieri.", "¡Qué bien! Aquí llueve desde ayer."),
        ("Marta", "Fa freddo?", "¿Hace frío?"),
        ("Luca", "Sì, fa freddo. Ci sono solo dieci gradi.", "Sí, hace frío. Hay solo diez grados."),
        ("Marta", "Che brutto tempo! E domani?", "¡Qué mal tiempo! ¿Y mañana?"),
        ("Luca", "Domani c'è il sole, ma c'è un po' di vento.", "Mañana hay sol, pero hay un poco de viento."),
        ("Marta", "Allora vieni a Roma sabato?", "Entonces, ¿vienes a Roma el sábado?"),
        ("Luca", "Volentieri! Arrivo in treno alle undici.", "¡Con gusto! Llego en tren a las once."),
        ("Marta", "Perfetto. A sabato!", "Perfecto. ¡Hasta el sábado!"),
        ("Luca", "A sabato, ciao!", "¡Hasta el sábado, chao!"),
    ], [("¿Dónde está Marta?", ["En Milán", "En Roma", "En Florencia"], 1, 2),
        ("¿Qué tiempo hace en Milán hoy?", ["Hace sol", "Llueve y hace frío", "Hay niebla"], 1, 3),
        ("¿Cuántos grados hay en Milán?", ["Diez", "Veinte", "Cinco"], 0, 5),
        ("¿Qué tiempo habrá mañana en Milán?", ["Lluvia", "Sol y un poco de viento", "Nieve"], 1, 7),
        ("¿Cómo llega Luca a Roma?", ["En avión", "En tren", "En auto"], 1, 9)],
        "Diálogo escrito por la IA con el vocabulario del tiempo de «V 3.3 I mesi e le stagioni» (Giornate italiane, CC BY-NC-SA): Che tempo fa?, fa caldo, fa freddo, piove, c'è il sole, c'è il vento, Quanti gradi ci sono?"),
    dialog("rd_chiarire", "In classe: non capisco", [
        ("Insegnante", "Aprite il libro a pagina dieci.", "Abran el libro en la página diez."),
        ("Studente", "Scusi, non capisco. Può ripetere, per favore?", "Disculpe, no entiendo. ¿Puede repetir, por favor?"),
        ("Insegnante", "Certo. Aprite il libro a pagina dieci.", "Claro. Abran el libro en la página diez."),
        ("Studente", "Più lentamente, per favore.", "Más despacio, por favor."),
        ("Insegnante", "Va bene, più lentamente: aprite il libro a pagina dieci.", "Está bien, más despacio: abran el libro en la página diez."),
        ("Studente", "Ho capito, grazie! Scusi, cosa vuol dire «pagina»?", "¡Entendí, gracias! Disculpe, ¿qué quiere decir «pagina»?"),
        ("Insegnante", "Pagina è una parte del libro.", "«Pagina» es una parte del libro."),
        ("Studente", "Come si scrive «pagina»?", "¿Cómo se escribe «pagina»?"),
        ("Insegnante", "Si scrive: pi, a, gi, i, enne, a.", "Se escribe: pi, a, gi, i, enne, a."),
        ("Studente", "Grazie mille!", "¡Muchas gracias!"),
        ("Insegnante", "Prego!", "¡De nada!"),
    ], [("¿Qué pide la profesora al comienzo?", ["Cerrar el libro", "Abrir el libro en la página diez", "Leer en voz alta"], 1, 0),
        ("¿Qué le pide el estudiante cuando no entiende?", ["Que repita", "Que se vaya", "Que escriba en la pizarra"], 0, 1),
        ("¿Qué más pide el estudiante?", ["Más rápido", "Más despacio", "Más fuerte"], 1, 3),
        ("¿Qué quiere saber sobre «pagina»?", ["Qué significa", "Dónde está", "Cuánto cuesta"], 0, 5),
        ("¿Cómo se escribe «pagina»?", ["pi, a, gi, i, enne, a", "pi, a, ci, i, emme, a", "bi, a, gi, i, enne, a"], 0, 8)],
        "Diálogo escrito por la IA con las frases de clase de Giornate italiane («Come si scrive?», «Cosa vuol dire?», «Non capisco, puoi ripetere?») y de Wikivoyage («Parli più lentamente»), en trato formal («Può ripetere?») y con los nombres de las letras de Piacere!."),
    dialog("rd_sms", "Messaggi: che fai stasera?", [
        ("Sara", "Ciao Marco, che fai stasera?", "Hola Marco, ¿qué haces esta noche?"),
        ("Marco", "Niente di speciale. E tu?", "Nada especial. ¿Y tú?"),
        ("Sara", "Vado al cinema alle otto. Vieni?", "Voy al cine a las ocho. ¿Vienes?"),
        ("Marco", "Volentieri! Dove ci vediamo?", "¡Con gusto! ¿Dónde nos vemos?"),
        ("Sara", "Davanti al cinema alle sette e mezza.", "Frente al cine a las siete y media."),
        ("Marco", "D'accordo. Porto anche Luca?", "De acuerdo. ¿Llevo también a Luca?"),
        ("Sara", "Certo, più siamo meglio è!", "Claro, ¡cuantos más seamos, mejor!"),
        ("Marco", "A dopo!", "¡Hasta luego!"),
    ], [("¿A dónde va Sara esta noche?", ["Al cine", "A una fiesta", "Al restaurante"], 0, 2),
        ("¿A qué hora empieza?", ["A las siete y media", "A las ocho", "A las nueve"], 1, 2),
        ("¿Dónde se encuentran?", ["En la casa de Marco", "Frente al cine", "En el bar"], 1, 4),
        ("¿A qué hora se encuentran?", ["A las ocho", "A las siete y media", "A las siete"], 1, 4),
        ("¿Qué propone Marco?", ["Llevar a Luca", "Ir solo", "Cambiar de película"], 0, 5)],
        "Mensajes de chat escritos por la IA, en frases cortas como los del examen PLIDA A1 (emparejar SMS con su respuesta); incluyen «Volentieri» y «D'accordo» (Tatoeba y Giornate italiane)."),
    dialog("rd_stazione", "In stazione: un biglietto per Firenze", [
        ("Viaggiatore", "Buongiorno, un biglietto per Firenze, per favore.", "Buenos días, un boleto para Florencia, por favor."),
        ("Impiegato", "Andata e ritorno?", "¿Ida y vuelta?"),
        ("Viaggiatore", "Solo andata. A che ora parte il prossimo treno?", "Solo ida. ¿A qué hora sale el próximo tren?"),
        ("Impiegato", "Il treno parte alle dieci e venti dal binario tre.", "El tren sale a las diez y veinte del andén tres."),
        ("Viaggiatore", "Quanto costa il biglietto?", "¿Cuánto cuesta el boleto?"),
        ("Impiegato", "Costa venti euro.", "Cuesta veinte euros."),
        ("Viaggiatore", "Ecco, venti euro. Quando arriva a Firenze?", "Aquí tiene, veinte euros. ¿Cuándo llega a Florencia?"),
        ("Impiegato", "Arriva alle undici e cinquanta.", "Llega a las once y cincuenta."),
        ("Viaggiatore", "Grazie mille. Arrivederci!", "Muchas gracias. ¡Hasta luego!"),
    ], [("¿A dónde viaja?", ["A Roma", "A Florencia", "A Milán"], 1, 0),
        ("¿Qué tipo de boleto quiere?", ["Ida y vuelta", "Solo ida", "Para dos personas"], 1, 2),
        ("¿A qué hora sale el tren?", ["A las diez y veinte", "A las once y cincuenta", "A las nueve"], 0, 3),
        ("¿Cuánto cuesta el boleto?", ["Diez euros", "Veinte euros", "Treinta euros"], 1, 5),
        ("¿A qué hora llega a Florencia?", ["A las diez y veinte", "A las doce", "A las once y cincuenta"], 2, 7)],
        "Diálogo de examen escrito por la IA para comprobar comprensión auditiva (se escucha sin ver el texto); usa horarios y precios como los del programa A1 de CILS y PLIDA.",
        exam=True, listen=True),
    dialog("rd_sms_esame", "Messaggi: dove ci vediamo?", [
        ("Giulia", "Ciao Paolo, sei in ritardo?", "Hola Paolo, ¿vas atrasado?"),
        ("Paolo", "Scusa, sono ancora a casa. Arrivo tra dieci minuti.", "Perdón, todavía estoy en casa. Llego en diez minutos."),
        ("Giulia", "Va bene. Io sono già al bar vicino alla stazione.", "Está bien. Yo ya estoy en el bar cerca de la estación."),
        ("Paolo", "Prendo l'autobus. Prendi tu il caffè per me?", "Tomo el autobús. ¿Pides tú el café por mí?"),
        ("Giulia", "Certo. Lo vuoi con lo zucchero?", "Claro. ¿Lo quieres con azúcar?"),
        ("Paolo", "No, senza zucchero. Grazie!", "No, sin azúcar. ¡Gracias!"),
        ("Giulia", "Di niente. Ti aspetto!", "De nada. ¡Te espero!"),
    ], [("¿Por qué Paolo se disculpa?", ["Está atrasado", "No puede ir", "Perdió el tren"], 0, 1),
        ("¿Dónde está Giulia?", ["En su casa", "En un bar cerca de la estación", "En el autobús"], 1, 2),
        ("¿Cómo llega Paolo?", ["En autobús", "En taxi", "A pie"], 0, 3),
        ("¿Cómo quiere el café Paolo?", ["Con azúcar", "Con leche", "Sin azúcar"], 2, 5)],
        "Mensajes de chat escritos por la IA; lectura NO vista del examen de hito (ninguna unidad la usa).", exam=True),
    doc("doc_menu", "Il menù della trattoria", ["", "Prezzo"], [
        ["ANTIPASTI", ""], ["Bruschetta", "5 €"], ["Prosciutto e melone", "8 €"],
        ["PRIMI", ""], ["Spaghetti al pomodoro", "9 €"], ["Lasagne", "10 €"], ["Risotto ai funghi", "11 €"],
        ["SECONDI", ""], ["Pollo arrosto", "12 €"], ["Pesce del giorno", "15 €"],
        ["CONTORNI", ""], ["Insalata mista", "4 €"], ["Patate fritte", "4 €"],
        ["DOLCI", ""], ["Tiramisù", "5 €"], ["Gelato", "4 €"],
        ["BEVANDE", ""], ["Acqua", "2 €"], ["Vino della casa", "3 €"], ["Caffè", "1 €"],
        ["Coperto", "2 €"]],
        [("¿Cuánto cuesta la lasaña?", ["8 euros", "10 euros", "12 euros"], 1),
         ("¿Cuál es el primer plato más barato?", ["Spaghetti al pomodoro", "Lasagne", "Risotto ai funghi"], 0),
         ("¿Cuánto cuesta el cubierto (coperto)?", ["1 euro", "2 euros", "4 euros"], 1),
         ("¿Qué postres hay?", ["Tiramisù y gelato", "Bruschetta y gelato", "Tiramisù y caffè"], 0),
         ("Pedro pide pollo asado y agua. ¿Cuánto es, sin el cubierto?", ["12 euros", "14 euros", "17 euros"], 1)],
        "Menú escrito por la IA como los de un restaurante italiano (platos tradicionales y precios inventados); documento tipo PLIDA A1 «leer un menú»."),
    doc("doc_orari", "Orari del negozio", ["Giorno", "Orario"], [
        ["lunedì", "chiuso"], ["martedì", "9:00–13:00 e 15:00–19:00"], ["mercoledì", "9:00–13:00 e 15:00–19:00"], ["giovedì", "9:00–13:00 e 15:00–19:00"],
        ["venerdì", "9:00–13:00 e 15:00–19:00"], ["sabato", "9:00–13:00"], ["domenica", "chiuso"]],
        [("¿Qué día está cerrado el negocio, además del domingo?", ["El lunes", "El sábado", "El viernes"], 0),
         ("¿A qué hora abre el martes?", ["A las 9:00", "A las 15:00", "A las 13:00"], 0),
         ("¿Hasta qué hora está abierto el sábado?", ["Hasta las 19:00", "Hasta las 13:00", "Hasta las 15:00"], 1),
         ("¿Se puede comprar el jueves a las 14:00?", ["Sí", "No: está cerrado a esa hora", "Solo con reserva"], 1)],
        "Horario de un negocio escrito por la IA (tabla de días y horas); documento tipo PLIDA A1 «leer un horario»."),
    doc("doc_modulo", "Modulo d'iscrizione", ["Campo", "Dato"], [
        ["Nome", "Anna"], ["Cognome", "Rossi"], ["Data di nascita", "12/05/1998"], ["Luogo di nascita", "Torino"], ["Nazionalità", "italiana"],
        ["Indirizzo", "Via Roma 15, Milano"], ["Telefono", "333 123 4567"], ["E-mail", "anna.rossi@example.com"]],
        [("¿Cómo se llama la persona?", ["Anna Rossi", "Rossi Anna Torino", "Anna Milano"], 0),
         ("¿Dónde nació?", ["En Milán", "En Turín", "En Roma"], 1),
         ("¿Cuál es su nacionalidad?", ["Italiana", "Francesa", "Española"], 0),
         ("¿En qué ciudad vive?", ["Turín", "Roma", "Milán"], 2)],
        "Formulario con datos personales escrito por la IA; documento tipo PLIDA/CILS A1 «formulario con datos personales»."),
    doc("doc_cartelli", "Cartelli", ["Cartello"], [
        ["Vietato fumare"], ["Spingere"], ["Tirare"], ["Aperto"], ["Chiuso"], ["Uscita di emergenza"], ["Ingresso libero"], ["Si prega di pagare alla cassa"]],
        [("¿Qué hay que hacer con «Spingere»?", ["Empujar la puerta", "Tirar de la puerta", "Pagar"], 0),
         ("¿Qué significa «Vietato fumare»?", ["Prohibido fumar", "Se vende tabaco", "Salida"], 0),
         ("¿Qué significa «Chiuso»?", ["Abierto", "Cerrado", "Gratis"], 1),
         ("¿Dónde hay que pagar según el último cartel?", ["En la puerta", "En la caja", "En la salida"], 1)],
        "Lista de carteles públicos escrita por la IA; incluye el cartel «Si prega di pagare alla cassa» del curso OpenLearn. Documento tipo PLIDA A1 «leer carteles»."),
    doc("doc_annuncio", "Affittasi stanza", ["Dato", "Informazione"], [
        ["Annuncio", "Affittasi stanza singola"], ["Zona", "centro, vicino alla metropolitana"], ["Prezzo", "350 euro al mese"], ["Disponibile da", "1 marzo"], ["Telefono", "333 765 4321"]],
        [("¿Qué se arrienda?", ["Un departamento entero", "Una habitación individual", "Una casa"], 1),
         ("¿Cuánto cuesta al mes?", ["350 euros", "530 euros", "250 euros"], 0),
         ("¿Dónde está?", ["En el centro, cerca del metro", "Cerca del mar", "En las afueras"], 0),
         ("¿Desde cuándo está disponible?", ["Desde el 1 de marzo", "Desde el 1 de mayo", "Ya"], 0)],
        "Anuncio de alquiler escrito por la IA; documento tipo PLIDA A1 «leer un anuncio»."),
]

if __name__ == "__main__":
    for r in ITEMS:
        (OUT / f"{r['id']}.json").write_text(json.dumps(r, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
    print(len(ITEMS), "textos")
