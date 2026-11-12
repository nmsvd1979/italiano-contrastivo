"""Base SQLite de trabajo (work.db): estado intermedio de las etapas del pipeline."""
import sqlite3
from pathlib import Path

from pipeline.config import WORK_DB

SCHEMA = """
CREATE TABLE IF NOT EXISTS raw_sentences (
  id INTEGER PRIMARY KEY,
  lang TEXT NOT NULL,
  text TEXT NOT NULL,
  author TEXT,
  added TEXT,
  modified TEXT
);
CREATE TABLE IF NOT EXISTS pairs (
  ita_id INTEGER NOT NULL,
  spa_id INTEGER NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('direct','pivot')),
  via_eng_id INTEGER,
  PRIMARY KEY (ita_id, spa_id)
);
CREATE TABLE IF NOT EXISTS candidates (
  ita_id INTEGER PRIMARY KEY,
  spa_id INTEGER NOT NULL,
  kind TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ok','rejected')),
  reasons TEXT NOT NULL DEFAULT '[]',
  flags TEXT NOT NULL DEFAULT '[]'
);
CREATE TABLE IF NOT EXISTS annotations (
  ita_id INTEGER PRIMARY KEY,
  cefr TEXT NOT NULL,
  confidence REAL NOT NULL,
  features TEXT NOT NULL DEFAULT '[]'
);
CREATE TABLE IF NOT EXISTS tags (
  ita_id INTEGER NOT NULL,
  code TEXT NOT NULL,
  rule_id TEXT NOT NULL,
  evidence TEXT NOT NULL DEFAULT '{}',
  PRIMARY KEY (ita_id, code)
);
"""


def connect(path: Path | str = WORK_DB) -> sqlite3.Connection:
    if str(path) != ":memory:":
        Path(path).parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(str(path))
    con.executescript(SCHEMA)
    return con
