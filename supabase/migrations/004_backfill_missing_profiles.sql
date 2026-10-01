-- Migration: Backfill profiles for existing auth users
--
-- Users who signed up before the profiles trigger was installed
-- will not have a row in the profiles table. This creates one for them.

INSERT INTO public.profiles (id, email, full_name, role)
SELECT
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', email),
  'user'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles);
