-- Migration: Add 'editor' to the profiles role CHECK constraint
--
-- The original constraint only allowed: user, admin, super_admin.
-- The 'editor' role was added to the application config (VALID_ROLES) but
-- the database constraint was never updated to match. This fixes it.

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('user', 'editor', 'admin', 'super_admin'));
