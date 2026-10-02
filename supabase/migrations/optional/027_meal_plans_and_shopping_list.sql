-- ============================================================
-- 027: Saved meal plans and shopping lists
--
-- meal_plans      menus saved from What We Having? (many per person)
-- shopping_lists  one list per person: the recipes on it (with servings),
--                 which combined lines are ticked, and their own extra items
--
-- Both are private: people can only read and change their own rows.
-- Safe to run more than once.
-- ============================================================

-- ─── Saved meal plans ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.meal_plans (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  -- [{ "slot": "main", "recipe_id": "…" }, …] in menu order
  dishes      JSONB NOT NULL DEFAULT '[]',
  -- The What We Having? options used, so the menu can be reopened as it was
  options     JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meal_plans_user ON public.meal_plans (user_id, created_at DESC);

DROP TRIGGER IF EXISTS meal_plans_updated_at ON public.meal_plans;
CREATE TRIGGER meal_plans_updated_at
  BEFORE UPDATE ON public.meal_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Own meal plans" ON public.meal_plans;
CREATE POLICY "Own meal plans" ON public.meal_plans
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ─── Shopping lists ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.shopping_lists (
  user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  -- [{ "recipe_id": "…", "servings": 4 }, …]
  recipes     JSONB NOT NULL DEFAULT '[]',
  -- keys of combined ingredient lines that are ticked off
  checked     TEXT[] NOT NULL DEFAULT '{}',
  -- [{ "id": "…", "text": "Washing-up liquid", "checked": false }, …]
  extras      JSONB NOT NULL DEFAULT '[]',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS shopping_lists_updated_at ON public.shopping_lists;
CREATE TRIGGER shopping_lists_updated_at
  BEFORE UPDATE ON public.shopping_lists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.shopping_lists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Own shopping list" ON public.shopping_lists;
CREATE POLICY "Own shopping list" ON public.shopping_lists
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
