"""Tipos y ayudantes compartidos por los generadores de calques (calques.py y calques_a2.py): así ninguno importa al otro."""
import re
from dataclasses import dataclass


@dataclass(frozen=True)
class Calque:
    code: str
    start: int
    end: int
    correct: str
    wrong: str
    kind: str  # distractor_kind del esquema de ítems
    listen: bool = False  # el ítem de elección se presenta como audio («escucha y elige»)
    manual: bool = False  # la variante errónea la escribió una persona/IA y la auditó otra vez (manual_calques.json): no es «error por construcción»


def _cap(wrong: str, correct: str) -> str:
    return wrong[0].upper() + wrong[1:] if correct[:1].isupper() else wrong


def _only(pattern: re.Pattern, it: str):
    found = list(pattern.finditer(it))
    return found[0] if len(found) == 1 else None
