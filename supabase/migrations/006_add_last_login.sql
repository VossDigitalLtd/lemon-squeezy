-- Migration: Add last_login_at to profiles
-- Synced automatically from auth.users.last_sign_in_at via trigger.
-- Covers all login methods: password, magic link, OAuth.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- Backfill from auth.users for existing accounts
UPDATE public.profiles p
SET last_login_at = u.last_sign_in_at
FROM auth.users u
WHERE p.id = u.id
  AND u.last_sign_in_at IS NOT NULL;

-- Function: sync last_sign_in_at -> profiles.last_login_at on login
CREATE OR REPLACE FUNCTION public.sync_last_login()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at THEN
    UPDATE public.profiles
    SET last_login_at = NEW.last_sign_in_at
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger: fires on every auth.users UPDATE, syncs if last_sign_in_at changed
DROP TRIGGER IF EXISTS on_auth_user_login ON auth.users;
CREATE TRIGGER on_auth_user_login
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_last_login();
