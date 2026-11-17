"""Identificador de los clips de voz: sha1 del texto normalizado (misma convención que la app anterior)."""
import hashlib
import re

VOICE = "it_IT-serena-high"
LICENSE = "CC BY 4.0"


def normalize(text: str) -> str:
    """Sin asteriscos de énfasis, espacios y saltos de línea colapsados, sin espacios en los bordes."""
    return re.sub(r"\s+", " ", text.replace("*", "")).strip()


def sha1(text: str) -> str:
    return hashlib.sha1(normalize(text).encode("utf-8")).hexdigest()


def clip_id(text: str) -> str:
    return sha1(text)[:12]
