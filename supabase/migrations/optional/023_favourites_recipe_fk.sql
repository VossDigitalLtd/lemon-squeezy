-- ============================================================
-- 023: Link favourites to recipes
--
-- The live favourites table was created without the foreign key that
-- 021_favourites.sql defines, so favourites can't be joined to recipes
-- and aren't removed when a recipe is deleted. This adds it.
-- Safe to run more than once.
-- ============================================================

-- Remove favourites that point at recipes which no longer exist
-- (otherwise adding the key fails)
DELETE FROM favourites f
WHERE NOT EXISTS (SELECT 1 FROM recipes r WHERE r.id = f.recipe_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.favourites'::regclass
      AND contype = 'f'
      AND confrelid = 'public.recipes'::regclass
  ) THEN
    ALTER TABLE favourites
      ADD CONSTRAINT favourites_recipe_id_fkey
      FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Let PostgREST see the new relationship straight away
NOTIFY pgrst, 'reload schema';
