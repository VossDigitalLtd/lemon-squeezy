-- ============================================================
-- 035: Recipe status (draft / published / archived)
--
--   draft      being worked on; not on the site yet
--   published  on the site (every recipe until now)
--   archived   taken off the site, kept indefinitely; publish again any time
--
-- The public sees published recipes only. Editors and admins also see
-- drafts and archived recipes (the admin, previews by link, the ChatGPT /
-- Claude connector). Trashed recipes (deleted_at) stay hidden from both.
--
-- Run this BEFORE deploying the status code: the code reads and writes
-- the new column. Safe to run more than once.
-- ============================================================

ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published'
  CHECK (status IN ('draft', 'published', 'archived'));

CREATE INDEX IF NOT EXISTS idx_recipes_status ON public.recipes (status) WHERE status <> 'published';

-- Is the signed-in user an editor or admin? SECURITY DEFINER so policies on
-- other tables can ask without running into the profiles policies.
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('editor', 'admin', 'super_admin')
  );
$$;

REVOKE ALL ON FUNCTION public.is_staff() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_staff() TO anon, authenticated;

DROP POLICY IF EXISTS "Public read recipes" ON public.recipes;
CREATE POLICY "Public read recipes"
  ON public.recipes FOR SELECT USING (deleted_at IS NULL AND status = 'published');

DROP POLICY IF EXISTS "Staff read unpublished recipes" ON public.recipes;
CREATE POLICY "Staff read unpublished recipes"
  ON public.recipes FOR SELECT USING (deleted_at IS NULL AND public.is_staff());

NOTIFY pgrst, 'reload schema';
