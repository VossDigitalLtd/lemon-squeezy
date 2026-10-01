-- ============================================================
-- Lemon Squeezy: Recipes & Categories
-- Run AFTER the core boilerplate schema (profiles, etc.)
-- ============================================================

-- ─── Categories ──────────────────────────────────────────────

CREATE TABLE categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type       TEXT NOT NULL CHECK (type IN ('course', 'cuisine', 'dietary')),
  uid        TEXT NOT NULL,
  title      TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (type, uid)
);

CREATE INDEX idx_categories_type ON categories (type);

-- ─── Recipes ─────────────────────────────────────────────────

CREATE TABLE recipes (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uid                  TEXT NOT NULL UNIQUE,
  title                TEXT NOT NULL,
  short_description    TEXT NOT NULL DEFAULT '',
  full_description     TEXT NOT NULL DEFAULT '',
  feature_image_path   TEXT,
  feature_image_alt    TEXT,
  prep_time            INTEGER,
  cook_time            INTEGER,
  servings             INTEGER,
  calories_per_serving INTEGER,
  ingredient_groups    JSONB NOT NULL DEFAULT '[]'::jsonb,
  method_groups        JSONB NOT NULL DEFAULT '[]'::jsonb,
  serving_suggestions  TEXT NOT NULL DEFAULT '',
  tips                 TEXT NOT NULL DEFAULT '',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_recipes_uid ON recipes (uid);
CREATE INDEX idx_recipes_updated_at ON recipes (updated_at DESC);

-- ─── Recipe ↔ Category junction ──────────────────────────────

CREATE TABLE recipe_categories (
  recipe_id    UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  category_id  UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (recipe_id, category_id)
);

CREATE INDEX idx_recipe_categories_recipe ON recipe_categories (recipe_id);
CREATE INDEX idx_recipe_categories_category ON recipe_categories (category_id);

-- ─── Accompanying recipes (self-referencing) ─────────────────

CREATE TABLE recipe_accompanying (
  recipe_id        UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  accompanying_id  UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  PRIMARY KEY (recipe_id, accompanying_id),
  CHECK (recipe_id <> accompanying_id)
);

CREATE INDEX idx_recipe_accompanying_recipe ON recipe_accompanying (recipe_id);

-- ─── Updated-at triggers ─────────────────────────────────────

CREATE TRIGGER categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER recipes_updated_at
  BEFORE UPDATE ON recipes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Row Level Security ──────────────────────────────────────

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_accompanying ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read categories"
  ON categories FOR SELECT USING (true);

CREATE POLICY "Public read recipes"
  ON recipes FOR SELECT USING (true);

CREATE POLICY "Public read recipe_categories"
  ON recipe_categories FOR SELECT USING (true);

CREATE POLICY "Public read recipe_accompanying"
  ON recipe_accompanying FOR SELECT USING (true);

-- Write access via service role (admin client bypasses RLS)
-- No INSERT/UPDATE/DELETE policies needed for anon/authenticated
-- All writes go through API routes using createAdminClient()
