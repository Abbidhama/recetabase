-- Ejecuta este SQL en Supabase → SQL Editor → New Query

CREATE TABLE recipes (
  id          BIGSERIAL PRIMARY KEY,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  name        TEXT NOT NULL,
  origin      TEXT,
  cuisine     TEXT,
  type        TEXT,
  base        TEXT,
  main_ingredient TEXT,
  calories    INT DEFAULT 0,
  protein     INT DEFAULT 0,
  carbs       INT DEFAULT 0,
  fat         INT DEFAULT 0,
  source      TEXT DEFAULT 'Manual',
  ingredients JSONB DEFAULT '[]',
  steps       JSONB DEFAULT '[]',
  tags        JSONB DEFAULT '[]'
);

-- Permite lectura y escritura pública (puedes añadir auth después)
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON recipes
  FOR ALL USING (true) WITH CHECK (true);
