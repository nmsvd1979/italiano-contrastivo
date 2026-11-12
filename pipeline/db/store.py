"""Carga y exportación del SQLite de autoría. Todo documento se valida contra el JSON Schema antes de entrar y al salir."""
import json
import sqlite3
from pathlib import Path

from jsonschema import Draft202012Validator
from referencing import Registry, Resource
from referencing.jsonschema import DRAFT202012

ROOT = Path(__file__).resolve().parents[2]
SCHEMA_DIR = ROOT / "schemas"
SCHEMA_ID = {"error_codes": "error-code", "lexemes": "lexeme", "sentences": "sentence", "capsules": "capsule"}


def _registry() -> Registry:
    reg = Registry()
    for f in SCHEMA_DIR.glob("*.schema.json"):
        d = json.loads(f.read_text())
        reg = reg.with_resource(d["$id"], Resource.from_contents(d, default_specification=DRAFT202012))
    return reg


_REG = _registry()


def validator(table: str) -> Draft202012Validator:
    sid = f"https://italiano-contrastivo/schemas/{SCHEMA_ID[table]}.schema.json"
    return Draft202012Validator({"$ref": sid}, registry=_REG)


def connect(path: str = ":memory:") -> sqlite3.Connection:
    con = sqlite3.connect(path)
    con.execute("PRAGMA foreign_keys = ON")
    con.executescript((Path(__file__).parent / "schema.sql").read_text())
    return con


def upsert(con: sqlite3.Connection, table: str, doc: dict) -> None:
    validator(table).validate(doc)
    body = json.dumps(doc, ensure_ascii=False)
    status = doc.get("review_status", "needs_review")
    if table == "error_codes":
        con.execute("INSERT OR REPLACE INTO error_codes VALUES (?,?,?,?,?)", (doc["code"], doc["category"], doc["cefr_min"], status, body))
    elif table == "lexemes":
        con.execute("INSERT OR REPLACE INTO lexemes VALUES (?,?,?,?,?,?)", (doc["id"], doc["lemma_it"], doc["lexical_type"], doc["cefr"], status, body))
    elif table == "sentences":
        con.execute("INSERT OR REPLACE INTO sentences VALUES (?,?,?,?,?,?,?,?)",
                    (doc["id"], doc["source"], doc.get("source_id"), doc.get("author"), doc.get("license"), doc["cefr_estimate"], status, body))
        con.execute("DELETE FROM sentence_error_codes WHERE sentence_id=?", (doc["id"],))
        con.execute("DELETE FROM sentence_lexemes WHERE sentence_id=?", (doc["id"],))
        for c in doc.get("error_codes", []):
            con.execute("INSERT INTO sentence_error_codes VALUES (?,?)", (doc["id"], c))
        for lx in doc.get("lexeme_ids", []):
            con.execute("INSERT INTO sentence_lexemes VALUES (?,?)", (doc["id"], lx))
    elif table == "capsules":
        con.execute("INSERT OR REPLACE INTO capsules VALUES (?,?,?,?)", (doc["id"], doc["cefr"], status, body))
    else:
        raise ValueError(table)


def export(con: sqlite3.Connection, table: str, statuses: tuple[str, ...] = ("validated",)) -> list[dict]:
    """Solo exporta lo revisado (por defecto `validated`) y vuelve a validar cada documento."""
    marks = ",".join("?" * len(statuses))
    rows = con.execute(f"SELECT body FROM {table} WHERE review_status IN ({marks}) ORDER BY 1", statuses).fetchall()
    docs = [json.loads(r[0]) for r in rows]
    v = validator(table)
    for d in docs:
        v.validate(d)
    return docs
