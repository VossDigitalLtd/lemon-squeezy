-- ============================================================
-- 034: Recipe revisions from Claude
--
-- The recipes connector (/api/mcp) can be used from Claude as well as
-- ChatGPT; History names whichever made each change. Run before Claude
-- edits recipes, or its changes save without a History entry.
-- Safe to run more than once.
-- ============================================================

ALTER TABLE public.recipe_revisions DROP CONSTRAINT IF EXISTS recipe_revisions_source_check;
ALTER TABLE public.recipe_revisions
  ADD CONSTRAINT recipe_revisions_source_check CHECK (source IN ('admin', 'chatgpt', 'claude'));

NOTIFY pgrst, 'reload schema';
