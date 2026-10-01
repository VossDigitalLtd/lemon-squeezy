-- Migration: Fix infinite recursion in profiles RLS policy
--
-- The "Admins can view all profiles" policy causes infinite recursion
-- because it queries the profiles table from within a profiles policy.
--
-- Fix: drop the policy entirely. Admin access to all profiles should
-- be handled server-side via the service role client, not through RLS.
--
-- Also drops the get_user_role helper function if it was previously created.

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP FUNCTION IF EXISTS public.get_user_role(UUID);
