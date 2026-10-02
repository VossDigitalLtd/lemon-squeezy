-- ============================================================
-- 028: Rest periods (resting, setting, chilling, proving…)
--
-- recipes.rest_periods  list of rests, in order:
--                       [{ "type": "prove", "minutes": 60 },
--                        { "type": "cool",  "minutes": 30 },
--                        { "type": "other", "label": "Freezing", "minutes": 240 }]
-- recipes.rest_time     total minutes of those rests, kept in step by a trigger
-- recipes.total_time    now prep + cook + rest, so a cheesecake that sets for
--                       4 hours is never listed as a 30-minute recipe
--
-- Safe to run more than once.
-- ============================================================

ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS rest_periods JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS rest_time    INTEGER;

-- Keep rest_time equal to the sum of the rest periods
CREATE OR REPLACE FUNCTION public.sum_rest_time()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  total INTEGER;
BEGIN
  SELECT SUM((r->>'minutes')::INTEGER) INTO total
  FROM jsonb_array_elements(COALESCE(NEW.rest_periods, '[]'::jsonb)) AS r
  WHERE (r->>'minutes') ~ '^[0-9]+$';
  NEW.rest_time := NULLIF(total, 0);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS recipes_sum_rest_time ON public.recipes;
CREATE TRIGGER recipes_sum_rest_time
  BEFORE INSERT OR UPDATE OF rest_periods ON public.recipes
  FOR EACH ROW EXECUTE FUNCTION public.sum_rest_time();

-- Rebuild total_time to include rest. Generated columns can't be changed in
-- place on every Postgres version, so drop and re-add; every row is recalculated.
ALTER TABLE public.recipes DROP COLUMN IF EXISTS total_time;
ALTER TABLE public.recipes
  ADD COLUMN total_time INTEGER GENERATED ALWAYS AS (
    CASE
      WHEN prep_time IS NULL AND cook_time IS NULL AND rest_time IS NULL THEN NULL
      ELSE COALESCE(prep_time, 0) + COALESCE(cook_time, 0) + COALESCE(rest_time, 0)
    END
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_recipes_total_time ON public.recipes (total_time);

NOTIFY pgrst, 'reload schema';
