"""Identificador de los clips de voz: sha1 del texto normalizado (misma convención que la app anterior)."""
import hashlib
import re

VOICE = "it_IT-serena-high"
LICENSE = "CC BY 4.0"
VOICE2 = "it_IT-paola-medium"   # segunda voz, solo para dialogos: da un interlocutor distinto
LICENSE2 = "CC0 1.0"


def normalize(text: str) -> str:
    """Sin asteriscos de énfasis, espacios y saltos de línea colapsados, sin espacios en los bordes."""
    return re.sub(r"\s+", " ", text.replace("*", "")).strip()


def sha1(text: str) -> str:
    return hashlib.sha1(normalize(text).encode("utf-8")).hexdigest()


def clip_id(text: str) -> str:
    return sha1(text)[:12]


def clip_id2(text: str) -> str:
    """Id del clip de la segunda voz: el mismo texto con otra voz no debe pisar el clip de la primera."""
    return hashlib.sha1(f"{VOICE2}|{normalize(text)}".encode("utf-8")).hexdigest()[:12]
