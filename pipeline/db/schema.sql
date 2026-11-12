-- SQLite de autoría (pipeline). Espejo de schemas/*.schema.json: columnas escalares para filtrar,
-- `body` con el documento completo (lo que valida el JSON Schema). El estado del usuario NO vive aquí (IndexedDB).
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS error_codes (
  code TEXT PRIMARY KEY CHECK (code GLOB 'ERR_*'),
  category TEXT NOT NULL,
  cefr_min TEXT NOT NULL CHECK (cefr_min IN ('A1','A2','B1','B2')),
  review_status TEXT NOT NULL DEFAULT 'needs_review' CHECK (review_status IN ('draft','needs_review','validated','rejected')),
  body TEXT NOT NULL CHECK (json_valid(body))
);

CREATE TABLE IF NOT EXISTS lexemes (
  id TEXT PRIMARY KEY,
  lemma_it TEXT NOT NULL,
  lexical_type TEXT NOT NULL CHECK (lexical_type IN ('cognate','neutral','false_friend')),
  cefr TEXT NOT NULL CHECK (cefr IN ('A1','A2','B1','B2')),
  review_status TEXT NOT NULL CHECK (review_status IN ('draft','needs_review','validated','rejected')),
  body TEXT NOT NULL CHECK (json_valid(body))
);

CREATE TABLE IF NOT EXISTS sentences (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL CHECK (source IN ('tatoeba','opus','authored')),
  source_id TEXT,
  author TEXT,
  license TEXT,
  cefr_estimate TEXT NOT NULL CHECK (cefr_estimate IN ('A1','A2','B1','B2')),
  review_status TEXT NOT NULL CHECK (review_status IN ('draft','needs_review','validated','rejected')),
  body TEXT NOT NULL CHECK (json_valid(body)),
  -- Tatoeba/OPUS exigen atribución (CC BY): sin id, autor y licencia no entra.
  CHECK (source = 'authored' OR (source_id IS NOT NULL AND license IS NOT NULL)),
  UNIQUE (source, source_id)
);

-- Relación oración ↔ código de error y oración ↔ lexema (para consultas del pipeline).
CREATE TABLE IF NOT EXISTS sentence_error_codes (
  sentence_id TEXT NOT NULL REFERENCES sentences(id) ON DELETE CASCADE,
  code TEXT NOT NULL REFERENCES error_codes(code),
  PRIMARY KEY (sentence_id, code)
);
CREATE TABLE IF NOT EXISTS sentence_lexemes (
  sentence_id TEXT NOT NULL REFERENCES sentences(id) ON DELETE CASCADE,
  lexeme_id TEXT NOT NULL REFERENCES lexemes(id),
  PRIMARY KEY (sentence_id, lexeme_id)
);

CREATE TABLE IF NOT EXISTS capsules (
  id TEXT PRIMARY KEY,
  cefr TEXT NOT NULL CHECK (cefr IN ('A1','A2','B1','B2')),
  review_status TEXT NOT NULL CHECK (review_status IN ('draft','needs_review','validated','rejected')),
  body TEXT NOT NULL CHECK (json_valid(body))
);

-- Historial de revisión humana: quién validó qué y cuándo.
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity TEXT NOT NULL CHECK (entity IN ('error_codes','lexemes','sentences','capsules')),
  entity_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('needs_review','validated','rejected')),
  reviewer TEXT NOT NULL,
  reviewed_at TEXT NOT NULL,
  note TEXT
);

-- Fase 2: señales de la revisión humana (alimentan el informe de precisión y acuerdo de nivel).
CREATE TABLE IF NOT EXISTS tag_reviews (
  sentence_id TEXT NOT NULL,
  code TEXT NOT NULL,
  rule_id TEXT NOT NULL,
  accepted INTEGER NOT NULL CHECK (accepted IN (0,1)),
  reviewed_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS level_reviews (
  sentence_id TEXT NOT NULL,
  estimated TEXT NOT NULL CHECK (estimated IN ('A1','A2','B1','B2')),
  corrected TEXT NOT NULL CHECK (corrected IN ('A1','A2','B1','B2')),
  reviewed_at TEXT NOT NULL
);
