-- ============================================================
-- 036: Category "name on recipe pages"
--
-- An optional second name for a category, shown on the recipe page's
-- category labels (and, for Cypriot, the homepage section heading).
-- Empty means the category's ordinary name is used. Menus, filters
-- and recipe cards always use the ordinary name.
--
-- Until now "From a Cypriot kitchen" was written into the site's code;
-- this moves it onto the Cypriot category so editors can change it.
--
-- Run this BEFORE deploying the code that reads page_label.
-- Safe to run more than once.
-- ============================================================

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS page_label TEXT;

UPDATE public.categories
  SET page_label = 'From a Cypriot kitchen'
  WHERE type = 'cuisine' AND uid = 'cypriot' AND page_label IS NULL;

NOTIFY pgrst, 'reload schema';
