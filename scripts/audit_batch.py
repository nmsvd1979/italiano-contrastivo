"""Registra en verdicts.json el resultado de una tanda auditada a mano: lo elegido (`direct_keep`: ids de oraciones con traducción directa;
`ES`: {id: traducción neutra} para las de pivote) se aprueba y TODO el resto de la tanda se rechaza con `note`.
Uso desde Python: from audit_batch import apply (con scripts/ en sys.path). Después: scripts/capsule_apply.py y la regeneración del paquete."""
import json
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def apply(items_file, codes, direct_keep, ES, note="no cumple los criterios de auditoría (traducción, tiempo, tema o repetición)"):
    A = [i for i in json.loads((ROOT / f"data/work/capsules/{items_file}.json").read_text(encoding="utf8")) if i["codigo"] in codes]
    vf = ROOT / "data/work/capsules/verdicts.json"
    v = json.loads(vf.read_text(encoding="utf8"))
    done = {x["id"] for x in v}
    dk, new = set(direct_keep.split()), []
    for i in A:
        if i["id"] in done:
            continue
        n = i["id"][2:]
        if i["directa"] and n in dk:
            new.append({"id": i["id"], "codigo": i["codigo"], "veredicto": "keep"})
        elif not i["directa"] and n in ES:
            new.append({"id": i["id"], "codigo": i["codigo"], "veredicto": "keep", "espanol": ES[n]})
        else:
            new.append({"id": i["id"], "codigo": i["codigo"], "veredicto": "reject", "nota": note})
    vf.write_text(json.dumps(v + new, ensure_ascii=False, indent=1), encoding="utf8")
    print(sorted(Counter((x["codigo"][4:12], x["veredicto"]) for x in new).items()))
