-- ============================================================
-- 033: Recipe revisions (undo history)
--
-- Before a recipe is saved, from the admin or from ChatGPT, the app keeps
-- a copy of how it was, so any change can be rolled back from the recipe's
-- History in the admin. The copy is the editor's form data (the same shape
-- the save takes), so restoring is just saving it again. The app keeps the
-- latest 50 per recipe.
--
-- Only the service role reads or writes this table (no policies), so it
-- never shows on the public site. Safe to run more than once.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.recipe_revisions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id   UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  -- The recipe as it was before the change (RecipeFormData)
  snapshot    JSONB NOT NULL,
  -- Where the change came from: 'admin' or 'chatgpt'
  source      TEXT NOT NULL CHECK (source IN ('admin', 'chatgpt')),
  changed_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- What changed, in a few words ("Added 8 sage leaves")
  summary     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recipe_revisions_recipe ON public.recipe_revisions (recipe_id, created_at DESC);

ALTER TABLE public.recipe_revisions ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
