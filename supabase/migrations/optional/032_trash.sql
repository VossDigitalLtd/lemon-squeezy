-- ============================================================
-- 032: Trash for recipes and categories
--
-- Deleting a recipe or category sets deleted_at instead of removing the
-- row, so its favourites, views, schedule weeks, categories and pairings
-- stay put and Admin › Trash can restore it. The app removes rows that
-- have been in the trash for 30 days.
--
-- The public read policies hide trashed rows, so every page that reads
-- recipes or categories leaves them out. Staff screens that need them use
-- the service role, which isn't affected by policies.
--
-- Run this before deploying the trash code. Safe to run more than once,
-- and harmless to the current site (nothing is in the trash yet).
-- ============================================================

ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_recipes_deleted_at ON public.recipes (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_categories_deleted_at ON public.categories (deleted_at) WHERE deleted_at IS NOT NULL;

DROP POLICY IF EXISTS "Public read recipes" ON public.recipes;
CREATE POLICY "Public read recipes"
  ON public.recipes FOR SELECT USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "Public read categories" ON public.categories;
CREATE POLICY "Public read categories"
  ON public.categories FOR SELECT USING (deleted_at IS NULL);

NOTIFY pgrst, 'reload schema';

-- Check: every read (SELECT or ALL) policy on these tables should mention
-- deleted_at. Any other one would let trashed rows show on the site.
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public' AND tablename IN ('recipes', 'categories')
ORDER BY tablename, policyname;
