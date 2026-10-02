-- ============================================================
-- 030: Method links (ingredients mentioned in the method)
--
-- The recipe page works out which ingredients each step mentions from the
-- ingredient list. recipes.method_links holds the few corrections an editor
-- adds where that isn't enough:
--
--   { "phrases": [
--       { "phrase": "the spices",        "ingredient_ids": ["<paprika>", "<cumin>"] },
--       { "phrase": "pepper",            "ingredient_ids": ["<black pepper>"] },
--       { "phrase": "the onion mixture", "ingredient_ids": [] }      -- not an ingredient
--     ],
--     "not_in_method": ["<salt and pepper>"] }                      -- fine not to mention
--
-- Corrections are matched by their words, so editing or reordering steps
-- doesn't break them. Safe to run more than once.
-- ============================================================

ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS method_links JSONB NOT NULL DEFAULT '{"phrases": [], "not_in_method": []}';

NOTIFY pgrst, 'reload schema';
