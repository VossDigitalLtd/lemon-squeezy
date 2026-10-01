/**
 * OAuth provider configuration.
 * Enable providers by setting the corresponding env var to 'true' in .env.local.
 *
 * Each enabled provider requires setup in Supabase Dashboard:
 *   Authentication → Providers → [Provider] → enable and add credentials.
 *
 * For Vercel deployments, also add redirect URLs in Supabase:
 *   Authentication → URL Configuration → Redirect URLs:
 *     https://your-app.vercel.app/auth/callback
 *     https://*.vercel.app/auth/callback  ← covers preview deployments
 */

export const oauth = {
  google: process.env.NEXT_PUBLIC_OAUTH_GOOGLE    === 'true',
  github: process.env.NEXT_PUBLIC_OAUTH_GITHUB    === 'true',
  azure:  process.env.NEXT_PUBLIC_OAUTH_MICROSOFT === 'true', // Supabase uses 'azure' for Microsoft
};

export const hasOAuth = Object.values(oauth).some(Boolean);

export type OAuthProvider = 'google' | 'github' | 'azure';
