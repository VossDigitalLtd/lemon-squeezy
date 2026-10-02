-- ============================================================
-- 025: Recipe views, for the admin reports
--
-- One row each time a recipe page is opened (repeat views by the same
-- browser within 30 minutes are skipped, as are staff and bots).
-- user_id is set when the viewer is signed in, so reports can split
-- members from guests. Reports only ever show totals.
--
-- No policies: only the server (service role) can read or write this table.
-- Safe to run more than once.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.recipe_views (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  recipe_id  UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  -- Kept as a guest view if the account is later deleted
  user_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  viewed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recipe_views_viewed_at ON public.recipe_views (viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_recipe_views_recipe ON public.recipe_views (recipe_id, viewed_at DESC);

ALTER TABLE public.recipe_views ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
