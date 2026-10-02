-- ============================================================
-- 022: Design v3 data points
-- Run AFTER 020_recipes_and_categories.sql and 021_favourites.sql
--
-- Adds the fields the homepage and recipe page redesign rely on:
--   categories  → photo, homepage visibility and order
--   recipes     → subtitle, recipe-of-the-week date, publish date,
--                 stored total time for time filters
-- Also adds a "Cypriot" cuisine category.
-- ============================================================

-- ─── Categories ──────────────────────────────────────────────

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS image_path   TEXT,
  ADD COLUMN IF NOT EXISTS image_alt    TEXT,
  ADD COLUMN IF NOT EXISTS show_on_home BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sort_order   INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_categories_home
  ON categories (sort_order, title) WHERE show_on_home;

-- ─── Recipes ─────────────────────────────────────────────────

ALTER TABLE recipes
  -- Second name shown in italics under the title, e.g. "Patates lemonates tou fournou"
  ADD COLUMN IF NOT EXISTS subtitle      TEXT NOT NULL DEFAULT '',
  -- Recipe of the week: the most recent featured_from <= today wins
  ADD COLUMN IF NOT EXISTS featured_from DATE,
  -- When the recipe first went live (drives "latest" ordering)
  ADD COLUMN IF NOT EXISTS published_at  TIMESTAMPTZ,
  -- prep + cook, NULL when neither is set (so untimed recipes never match "under 15 min")
  ADD COLUMN IF NOT EXISTS total_time    INTEGER GENERATED ALWAYS AS (
    CASE
      WHEN prep_time IS NULL AND cook_time IS NULL THEN NULL
      ELSE COALESCE(prep_time, 0) + COALESCE(cook_time, 0)
    END
  ) STORED;

-- Existing rows: start from created_at. Imported recipes all share the
-- import date, so run scripts/backfill-published-at.ts afterwards.
UPDATE recipes SET published_at = created_at WHERE published_at IS NULL;

ALTER TABLE recipes
  ALTER COLUMN published_at SET DEFAULT now(),
  ALTER COLUMN published_at SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_recipes_published_at ON recipes (published_at DESC);
CREATE INDEX IF NOT EXISTS idx_recipes_featured_from ON recipes (featured_from DESC) WHERE featured_from IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_recipes_total_time ON recipes (total_time);

-- ─── Cypriot cuisine ─────────────────────────────────────────

INSERT INTO categories (type, uid, title, show_on_home, sort_order)
VALUES ('cuisine', 'cypriot', 'Cypriot', true, 100)
ON CONFLICT (type, uid) DO NOTHING;
