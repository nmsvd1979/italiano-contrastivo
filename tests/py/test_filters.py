import json

from pipeline import filters, nlp, workdb


def reasons(it, es="Fui a Roma ayer.", has_verb=True):
    return filters.check_pair(it, es, has_verb).reasons


def test_normalize_nfc_and_apostrophe():
    assert filters.normalize("è qui") == filters.normalize("è qui") == "è qui"
    assert filters.normalize("  l’amore   è  ") == "l'amore è"


def test_rejects_too_short():
    assert "length" in reasons("Ciao!", "Hola.")


def test_rejects_too_long():
    assert "length" in reasons(" ".join(["parola"] * 26), " ".join(["palabra"] * 26))


def test_accepts_2_and_25_words():
    assert "length" not in reasons("Sono andato.", "Fui allí.")
    assert "length" not in reasons(" ".join(["parola"] * 25), " ".join(["palabra"] * 25))


def test_rejects_digits_and_urls():
    assert "digits_url" in reasons("Sono andato nel 1990.", "Fui en 1990.")
    assert "digits_url" in reasons("Vai su www.esempio.it ora.", "Ve a la web ahora.")
    assert "digits_url" in reasons("Scrivimi a mario@esempio.it ora.", "Escríbeme ahora mismo.")


def test_rejects_ratio_outside_0_4_2_5():
    assert "ratio" in reasons("Ciao a tutti voi miei amici carissimi", "Hola.")          # 7/1
    assert "ratio" in reasons("Ciao amici.", "Hola a todos vosotros mis queridos amigos")  # 2/7
    assert "ratio" not in reasons("Sono andato a Roma.", "Fui a Roma ayer.")


def test_rejects_no_verb_only_when_known():
    assert "no_verb" in reasons("Una bella casa.", has_verb=False)
    assert "no_verb" not in reasons("Una bella casa.", has_verb=None)


def test_rejects_unbalanced_quotes_and_brackets():
    assert "punct_unbalanced" in reasons('Lui ha detto "ciao a tutti.', "Dijo hola a todos.")
    assert "punct_unbalanced" in reasons("Sono andato (a casa.", "Fui a casa ya.")
    assert "punct_unbalanced" not in reasons('Lui ha detto "ciao" a tutti.', "Dijo hola a todos.")


def test_clean_pair_has_no_reasons():
    assert reasons("Sono andato a Roma.") == []


def seed(con, sentences, pairs):
    for i, lang, text in sentences:
        con.execute("INSERT INTO raw_sentences VALUES (?,?,?,?,NULL,NULL)", (i, lang, text, "autor"))
    for a, b, kind in pairs:
        con.execute("INSERT INTO pairs(ita_id, spa_id, kind) VALUES (?,?,?)", (a, b, kind))


def rows(con):
    return con.execute("SELECT ita_id, spa_id, kind, status, reasons, flags FROM candidates ORDER BY ita_id").fetchall()


def test_run_filters_picks_direct_over_pivot_deterministically():
    def build(order):
        con = workdb.connect(":memory:")
        sents = [(1, "ita", "Sono andato a Roma."), (5, "spa", "Fui a Roma ayer."), (10, "spa", "He ido a Roma ayer.")]
        pairs = [(1, 5, "pivot"), (1, 10, "direct")]
        seed(con, sents, [pairs[i] for i in order])
        filters.run_filters(con, nlp.get_nlp())
        return rows(con)

    a, b = build([0, 1]), build([1, 0])
    assert a == b
    assert a[0][1] == 10 and a[0][2] == "direct"
    assert "multi_translation" in json.loads(a[0][5])


def test_run_filters_flags_pivot():
    con = workdb.connect(":memory:")
    seed(con, [(1, "ita", "Sono andato a Roma."), (5, "spa", "Fui a Roma ayer.")], [(1, 5, "pivot")])
    filters.run_filters(con, nlp.get_nlp())
    assert "pivot" in json.loads(rows(con)[0][5])


def test_run_filters_marks_duplicates_even_with_different_unicode_form():
    con = workdb.connect(":memory:")
    seed(con, [(1, "ita", "Lui è qui adesso."), (2, "ita", "Lui è qui adesso."), (10, "spa", "Él está aquí ahora."), (11, "spa", "Él está aquí ahora.")],
         [(1, 10, "direct"), (2, 11, "direct")])
    filters.run_filters(con, nlp.get_nlp())
    r = rows(con)
    assert (r[0][3], r[1][3]) == ("ok", "rejected")
    assert "duplicate" in json.loads(r[1][4])


def test_run_filters_rejects_sentence_without_verb_using_spacy():
    con = workdb.connect(":memory:")
    seed(con, [(1, "ita", "Una bella casa blu."), (10, "spa", "Una bonita casa azul.")], [(1, 10, "direct")])
    counts = filters.run_filters(con, nlp.get_nlp())
    assert rows(con)[0][3] == "rejected" and "no_verb" in json.loads(rows(con)[0][4])
    assert counts["rejected_no_verb"] == 1


def test_run_filters_is_idempotent_and_reports_counts():
    con = workdb.connect(":memory:")
    seed(con, [(1, "ita", "Sono andato a Roma."), (10, "spa", "Fui a Roma ayer.")], [(1, 10, "direct")])
    first = filters.run_filters(con, nlp.get_nlp())
    assert filters.run_filters(con, nlp.get_nlp()) == first
    assert first["input"] == 1 and first["ok"] == 1 and first["rejected"] == 0
    assert con.execute("SELECT COUNT(*) FROM candidates").fetchone()[0] == 1
