-- ============================================================
-- 029: Ingredient library
--
-- ingredients          one row per real-world ingredient ("Chicken breast"),
--                      with a supermarket aisle and a "cupboard staple" flag
-- ingredient_aliases   other names it's known by ("chicken breasts",
--                      "chicken fillet"), used to match free text
-- recipe_ingredients   which recipes use which ingredients (kept in step when
--                      a recipe is saved) — powers "filter by ingredient"
--
-- Each item in recipes.ingredient_groups gains "ingredient_id" and an
-- optional "note" ("diced", "thinly sliced"); "name" stays for display.
-- Public read; writes go through the server (service role).
-- Safe to run more than once.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ingredients (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  slug        TEXT NOT NULL UNIQUE,
  category    TEXT NOT NULL DEFAULT 'other'
              CHECK (category IN ('meat-fish', 'fruit-veg', 'dairy-eggs', 'bakery', 'cupboard',
                                  'herbs-spices', 'frozen', 'drinks', 'other')),
  is_staple   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ingredients_name_lower_idx ON public.ingredients (lower(name));

DROP TRIGGER IF EXISTS ingredients_updated_at ON public.ingredients;
CREATE TRIGGER ingredients_updated_at
  BEFORE UPDATE ON public.ingredients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE IF NOT EXISTS public.ingredient_aliases (
  -- stored lower case
  alias          TEXT PRIMARY KEY CHECK (alias = lower(alias)),
  ingredient_id  UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ingredient_aliases_ingredient ON public.ingredient_aliases (ingredient_id);

CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
  recipe_id      UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  ingredient_id  UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  PRIMARY KEY (recipe_id, ingredient_id)
);

CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_ingredient ON public.recipe_ingredients (ingredient_id);

ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredient_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read ingredients" ON public.ingredients;
CREATE POLICY "Public read ingredients" ON public.ingredients FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read ingredient aliases" ON public.ingredient_aliases;
CREATE POLICY "Public read ingredient aliases" ON public.ingredient_aliases FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read recipe ingredients" ON public.recipe_ingredients;
CREATE POLICY "Public read recipe ingredients" ON public.recipe_ingredients FOR SELECT USING (true);

NOTIFY pgrst, 'reload schema';
