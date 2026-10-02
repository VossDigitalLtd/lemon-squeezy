/** Turn Supabase auth error messages into plain, actionable sentences. */
export function friendlyAuthError(message: string | undefined | null): string {
  const m = (message ?? '').toLowerCase();
  if (m.includes('invalid login credentials')) return "That email and password don't match. Check them and try again.";
  if (m.includes('email not confirmed')) return 'Please confirm your email first. Look for the link we sent you (check spam too).';
  if (m.includes('already registered') || m.includes('already been registered'))
    return 'There’s already an account with that email. Sign in instead, or reset your password.';
  if (m.includes('rate limit') || m.includes('too many'))
    return 'Too many attempts. Please wait a minute and try again.';
  if (m.includes('network') || m.includes('fetch')) return "We couldn't reach the server. Check your connection and try again.";
  return message || 'Something went wrong. Please try again.';
}
