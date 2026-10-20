-- ============================================================
-- 031: Image focal point
--
-- Where the important part of a recipe's photo is, as percentages across
-- and down (50, 50 is the centre). Pages that crop the photo to a shape
-- (square on phones, 9:10 recipe hero, 4:3 cards…) keep this point in view.
-- NULL means the centre. Safe to run more than once.
-- ============================================================

ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS feature_image_focus_x SMALLINT CHECK (feature_image_focus_x BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS feature_image_focus_y SMALLINT CHECK (feature_image_focus_y BETWEEN 0 AND 100);

NOTIFY pgrst, 'reload schema';
