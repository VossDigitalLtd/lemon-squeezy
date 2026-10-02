-- ============================================================
-- 026: Recipe of the week schedule
--
-- Replaces the per-recipe "featured_from" date with one schedule: a row per
-- week (weeks start on Monday), one recipe each, so two recipes can never
-- claim the same week. Anyone can read it (the homepage does); only the
-- server writes it (admin "Recipe of the week" page).
--
-- Existing featured_from dates are copied in, to the week they fall in.
-- recipes.featured_from is left in place but no longer used.
-- Safe to run more than once.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.featured_schedule (
  week_start  DATE PRIMARY KEY CHECK (EXTRACT(ISODOW FROM week_start) = 1),
  recipe_id   UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_featured_schedule_recipe ON public.featured_schedule (recipe_id);

DROP TRIGGER IF EXISTS featured_schedule_updated_at ON public.featured_schedule;
CREATE TRIGGER featured_schedule_updated_at
  BEFORE UPDATE ON public.featured_schedule
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.featured_schedule ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read featured schedule" ON public.featured_schedule;
CREATE POLICY "Public read featured schedule"
  ON public.featured_schedule FOR SELECT USING (true);

-- Carry over any dates set the old way (latest wins if two share a week)
INSERT INTO public.featured_schedule (week_start, recipe_id)
SELECT DISTINCT ON (date_trunc('week', featured_from)::date)
       date_trunc('week', featured_from)::date, id
FROM public.recipes
WHERE featured_from IS NOT NULL
ORDER BY date_trunc('week', featured_from)::date, featured_from DESC
ON CONFLICT (week_start) DO NOTHING;

NOTIFY pgrst, 'reload schema';
