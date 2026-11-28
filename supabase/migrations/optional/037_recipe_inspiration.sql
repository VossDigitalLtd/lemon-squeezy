-- ============================================================
-- 037: Recipe inspiration (the recipe's source), and site settings
--
-- recipes.inspiration  credits for the original recipes a recipe follows
--                      or adapts. Plain text; links are written
--                      [Source name](https://…) and bare https:// addresses
--                      are linked too. Empty hides the section.
--
-- site_settings        one row of site-wide settings, set in the admin
--                      (Settings → Site). Anyone can read it; changes go
--                      through the admin API with the service role.
--   show_recipe_inspiration  show the inspiration on recipe and print
--                            pages (it's always kept and editable)
--
-- Run this BEFORE deploying the code that reads them.
-- Safe to run more than once.
-- ============================================================

ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS inspiration TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS public.site_settings (
  id                       BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),  -- only ever one row
  show_recipe_inspiration  BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by               UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

INSERT INTO public.site_settings (id) VALUES (TRUE) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read site settings" ON public.site_settings;
CREATE POLICY "Public read site settings"
  ON public.site_settings FOR SELECT USING (TRUE);

NOTIFY pgrst, 'reload schema';
