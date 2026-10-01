-- ============================================================================
-- 021: Favourites table
-- ============================================================================
-- Stores user → recipe favourites. The old table stored Prismic IDs as text;
-- this version uses UUID references to the recipes table.
--
-- If the old `favourites` table exists with text recipe_id values, drop it
-- first (the fix-migration script will have remapped IDs).
-- ============================================================================

-- Drop old table if it exists (had text recipe_id from Prismic era)
DROP TABLE IF EXISTS favourites;

CREATE TABLE favourites (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id  UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, recipe_id)
);

CREATE INDEX idx_favourites_user_id ON favourites(user_id);
CREATE INDEX idx_favourites_recipe_id ON favourites(recipe_id);

-- RLS: users can manage their own favourites
ALTER TABLE favourites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own favourites"
  ON favourites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add own favourites"
  ON favourites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own favourites"
  ON favourites FOR DELETE
  USING (auth.uid() = user_id);
