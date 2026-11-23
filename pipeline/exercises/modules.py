"""Módulos temáticos de la ruta: cada módulo agrupa unidades (cápsulas) alrededor de una situación comunicativa.

Un módulo = qué sabrás hacer (`can_do_es`) + texto real de entrada + cápsulas (unidades) + salida (juegos de roles, tareas orales, frases) + una sugerencia
de Biblioteca. La validación exige que todo lo que referencia exista y que ninguna unidad quede fuera o en dos módulos: así no se pierde contenido al reagrupar.
"""
MIN_CAN_DO = 3


def validate_modules(course: dict, readings: list[dict], speaking: dict, library: list[dict]) -> list[str]:
    errs: list[str] = []
    modules = course.get("modules") or []
    unit_ids = {u["id"] for u in course["units"]}
    core = {u["id"] for u in course["units"] if u["level"] in {m["level"] for m in modules}}
    reading_ids = {r["id"] for r in readings}
    roleplays = {r["id"] for r in speaking["roleplays"]}
    tasks = {t["id"] for t in speaking["tasks"]}
    groups = {g["id"] for g in speaking.get("phrases", {}).get("groups", [])}
    lib = {r["id"] for r in library}
    seen: dict[str, str] = {}
    ids = [m["id"] for m in modules]
    if len(set(ids)) != len(ids):
        errs.append("ids de módulo repetidos")
    for m in modules:
        i = m["id"]
        if len(m.get("can_do_es", [])) < MIN_CAN_DO:
            errs.append(f"{i}: necesita al menos {MIN_CAN_DO} frases «sé hacer»")
        if not m.get("library_task_es") or m.get("library") not in lib:
            errs.append(f"{i}: la sugerencia de Biblioteca no existe ({m.get('library')})")
        if not m.get("writing_es"):
            errs.append(f"{i}: falta la propuesta de mensaje escrito (writing_es)")
        for x in m.get("extra_readings", []):
            if x not in reading_ids:
                errs.append(f"{i}: la lectura extra {x} no existe")
        if m["entry_reading"] not in reading_ids:
            errs.append(f"{i}: el texto de entrada {m['entry_reading']} no existe")
        for k, pool in (("roleplays", roleplays), ("tasks", tasks), ("phrase_groups", groups)):
            for x in m.get(k, []):
                if x not in pool:
                    errs.append(f"{i}: {k} → {x} no existe")
        if not (m.get("roleplays") or m.get("tasks")) and not m.get("gap_es"):
            errs.append(f"{i}: no tiene juego de roles ni tarea oral y no declara el hueco (gap_es)")
        for u in m["units"]:
            if u not in unit_ids:
                errs.append(f"{i}: la unidad {u} no está activa en el curso")
            elif u in seen:
                errs.append(f"{u} está en dos módulos ({seen[u]} y {i})")
            seen[u] = i
    for u in sorted(core - set(seen)):
        errs.append(f"la unidad {u} no pertenece a ningún módulo")
    return errs
