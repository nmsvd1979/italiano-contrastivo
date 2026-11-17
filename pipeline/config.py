"""Rutas y constantes del pipeline de la Fase 2."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "data" / "raw"
WORK_DB = ROOT / "data" / "work" / "work.db"
AUTHORING_DB = ROOT / "data" / "work" / "authoring.db"
RULES_DIR = ROOT / "pipeline" / "rules"
LEXICONS_DIR = ROOT / "pipeline" / "lexicons"

LICENSE = "CC BY 2.0 FR"
