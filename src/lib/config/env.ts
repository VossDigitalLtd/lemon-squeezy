/**
 * Server-side environment variable validation.
 * Called once at server startup via src/instrumentation.ts.
 * Fails fast with a clear error rather than a cryptic runtime failure.
 *
 * Do not import this file in client components.
 */

const REQUIRED: string[] = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_APP_URL',
];

/** Required vars for each bolt-on when its feature flag is 'true'. */
const BOLT_ON_REQUIRED: Record<string, string[]> = {
  NEXT_PUBLIC_FEATURE_BILLING: [
    'STRIPE_SECRET_KEY',
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    'STRIPE_WEBHOOK_SECRET',
  ],
  NEXT_PUBLIC_FEATURE_PAYMENTS: [
    'STRIPE_SECRET_KEY',
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    'STRIPE_WEBHOOK_SECRET',
  ],
  NEXT_PUBLIC_FEATURE_EMAIL: [
    'RESEND_API_KEY',
    'NEXT_PUBLIC_EMAIL_FROM',
  ],
  NEXT_PUBLIC_FEATURE_SUPPORT: [
    'NEXT_PUBLIC_SUPPORT_WIDGET_ID',
  ],
};

export function validateEnv(): void {
  const missing: string[] = [];

  for (const key of REQUIRED) {
    if (!process.env[key]) missing.push(key);
  }

  for (const [flagKey, deps] of Object.entries(BOLT_ON_REQUIRED)) {
    if (process.env[flagKey] === 'true') {
      for (const dep of deps) {
        if (!process.env[dep]) {
          missing.push(`${dep}  (required when ${flagKey}=true)`);
        }
      }
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `\n\nMissing required environment variables:\n` +
      missing.map((k) => `  ✗ ${k}`).join('\n') +
      `\n\nSee .env.local.example for setup instructions.\n`
    );
  }
}
