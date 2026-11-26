"""A1 está cerrado: las partes de sus 69 unidades (descubre, práctica, escucha, prueba) no deben cambiar al construir A2.
Si esta huella cambia, algo de los filtros o del reparto por nivel alteró A1 sin querer (auditoría 2026-11-25: las pruebas A1 llegaron a traer frases de B1)."""
import hashlib
import json
from pathlib import Path

from pipeline import config
from pipeline.exercises import capsules

HUELLA_A1 = "5bf4bf515e704bed7d3872af39b1bc819ea3e7de743d99bd22d68959294235f6"   # 2026-11-26: 69 unidades A1, paquete publicado


def _huella(course: dict) -> tuple[int, str]:
    rows = [(u["id"], u["codes"][0], u["parts"]) for u in course["units"] if u["level"].startswith("A1")]
    return len(rows), hashlib.sha256(json.dumps(rows, sort_keys=True, ensure_ascii=False).encode()).hexdigest()


def test_el_paquete_publicado_conserva_las_unidades_a1():
    course = json.loads((config.ROOT / "web/public/content/course.json").read_text(encoding="utf8"))
    assert _huella(course) == (69, HUELLA_A1)


def test_reconstruir_el_paquete_no_cambia_las_unidades_a1(tmp_path: Path):
    capsules.build_pack(config.ROOT / "content", tmp_path)
    course = json.loads((tmp_path / "course.json").read_text(encoding="utf8"))
    assert _huella(course) == (69, HUELLA_A1)
