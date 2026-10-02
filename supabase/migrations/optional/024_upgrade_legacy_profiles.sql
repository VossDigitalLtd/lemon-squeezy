-- ============================================================
-- 024: Upgrade the legacy profiles table to the app's schema
--
-- The live profiles table came from the previous site and only has
-- (id, username, is_admin, created_at). The app expects the columns from
-- 001_create_profiles_table.sql + 006_add_last_login.sql: email, full_name,
-- avatar, role, etc. Without `role`, the admin area can't tell admins from
-- members ("Signed in as User", no Users page) and doesn't keep members out.
--
-- This upgrades the table in place and keeps existing data:
--   • is_admin = true  → role 'admin'; everyone else → role 'user'
--   • username         → full_name (when no name is set)
--   • email and last sign-in copied from auth.users
--   • new sign-ups get role 'user' (never admin)
--   • roles can only be changed by the server (service role) or here in
--     the SQL editor — not by a signed-in user editing their own profile
--
-- Safe to run more than once.
--
-- BEFORE RUNNING: check for an old sign-up trigger from the previous site,
-- which could clash with the one below. Run this and note the results:
--
--   SELECT tgname, tgfoid::regproc AS function
--   FROM pg_trigger
--   WHERE tgrelid = 'auth.users'::regclass AND NOT tgisinternal;
--
-- If you see a trigger other than on_auth_user_created / on_auth_user_login
-- that inserts into profiles, drop it (DROP TRIGGER <name> ON auth.users;).
-- ============================================================

-- ─── Columns ─────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email         TEXT,
  ADD COLUMN IF NOT EXISTS full_name     TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url    TEXT,
  ADD COLUMN IF NOT EXISTS avatar_path   TEXT,
  ADD COLUMN IF NOT EXISTS role          TEXT NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS metadata      JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check CHECK (role IN ('user', 'editor', 'admin', 'super_admin'));

CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles(email);
CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles(role);

-- ─── Backfill from the old columns and auth.users ────────────

DO $$
BEGIN
  -- Map the old admin flag onto roles (only where a role hasn't been set yet)
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'is_admin') THEN
    UPDATE public.profiles SET role = 'admin' WHERE is_admin IS TRUE AND role = 'user';
    -- The old flag is no longer read by the app; new rows default to false
    ALTER TABLE public.profiles ALTER COLUMN is_admin SET DEFAULT false;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'username') THEN
    UPDATE public.profiles SET full_name = username
    WHERE full_name IS NULL AND username IS NOT NULL AND username <> '';
  END IF;
END $$;

UPDATE public.profiles p
SET email         = COALESCE(p.email, u.email),
    full_name     = COALESCE(p.full_name, u.raw_user_meta_data->>'full_name'),
    last_login_at = COALESCE(p.last_login_at, u.last_sign_in_at)
FROM auth.users u
WHERE p.id = u.id;

-- Accounts that never got a profile row
INSERT INTO public.profiles (id, email, full_name, last_login_at)
SELECT u.id, u.email, u.raw_user_meta_data->>'full_name', u.last_sign_in_at
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id);

-- ─── New sign-ups get a profile with role 'user' ─────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', 'user')
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Keep last_login_at in step with sign-ins (from 006)
CREATE OR REPLACE FUNCTION public.sync_last_login()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at THEN
    UPDATE public.profiles SET last_login_at = NEW.last_sign_in_at WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_login ON auth.users;
CREATE TRIGGER on_auth_user_login
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_last_login();

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ─── Only the server can set roles ───────────────────────────
-- Signed-in users can update their own profile (name, photo), but any
-- attempt to set or change a role from the browser is refused. The admin
-- Users page changes roles through the server's service-role client.

CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  trusted BOOLEAN := COALESCE(auth.role(), '') = 'service_role'
                     OR current_user IN ('postgres', 'supabase_admin');
BEGIN
  IF trusted THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.role := 'user';
  ELSIF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Only an admin can change roles' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_protect_role ON public.profiles;
CREATE TRIGGER profiles_protect_role
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role();

-- ─── Row level security ──────────────────────────────────────

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Profiles are created by the sign-up trigger; no self-insert needed
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- ─── Optional: make yourself super admin ─────────────────────
-- Admins can make other people admin; only a super admin can change or
-- remove another admin. Uncomment and set your email to promote yourself:
--
-- UPDATE public.profiles SET role = 'super_admin' WHERE email = 'you@example.com';

NOTIFY pgrst, 'reload schema';
