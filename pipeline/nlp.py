"""Carga única (cacheada) del modelo spaCy italiano."""
from functools import lru_cache

import spacy

MODEL_NAME = "it_core_news_md"


class ModelMissingError(RuntimeError):
    pass


@lru_cache(maxsize=None)
def get_nlp(model: str = MODEL_NAME) -> spacy.Language:
    try:
        return spacy.load(model)
    except OSError as e:
        raise ModelMissingError(
            f"Falta el modelo spaCy '{model}'. Instálalo con: .venv/bin/python -m spacy download {model}"
        ) from e
