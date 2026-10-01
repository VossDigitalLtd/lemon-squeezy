// ─── App Identity ─────────────────────────────────────────────────────────────

export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? 'Lemon Squeezy';
export const APP_DESCRIPTION =
  process.env.NEXT_PUBLIC_APP_DESCRIPTION ??
  'Simple, delicious recipes made easy';

// ─── External Links ──────────────────────────────────────────────────────────

export const links = {
  support: process.env.NEXT_PUBLIC_SUPPORT_EMAIL
    ? `mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL}`
    : undefined,
  help: process.env.NEXT_PUBLIC_HELP_URL ?? undefined,
  privacy: process.env.NEXT_PUBLIC_PRIVACY_URL ?? undefined,
  terms: process.env.NEXT_PUBLIC_TERMS_URL ?? undefined,
};

// ─── Feature Flags ───────────────────────────────────────────────────────────

export const features = {
  // Core — opt-out (default enabled)
  developer: process.env.NEXT_PUBLIC_FEATURE_DEVELOPER !== 'false',

  // Core — opt-in (default disabled)
  signup: process.env.NEXT_PUBLIC_FEATURE_SIGNUP === 'true',

  // Lemon Squeezy has a public frontend
  frontend: true,

  // Account section (profile, security, data export)
  account: true,
};

// ─── Routing ─────────────────────────────────────────────────────────────────

export const routing = {
  homeRedirect: process.env.NEXT_PUBLIC_HOME_REDIRECT ?? null,
};

// ─── UI Defaults ─────────────────────────────────────────────────────────────

export const defaults = {
  theme: (process.env.NEXT_PUBLIC_DEFAULT_THEME ?? 'light') as
    | 'light'
    | 'dark'
    | 'system',
  sidebarExpanded: process.env.NEXT_PUBLIC_DEFAULT_SIDEBAR_EXPANDED !== 'false',
};

// ─── Roles ───────────────────────────────────────────────────────────────────

export const VALID_ROLES = ['user', 'editor', 'admin', 'super_admin'] as const;
export type ValidRole = (typeof VALID_ROLES)[number];

export const ROLE_LEVEL: Record<string, number> = {
  user: 0,
  editor: 1,
  admin: 2,
  super_admin: 3,
};

export const ROLE_LABELS: Record<string, string> = {
  user: 'User',
  editor: 'Editor',
  admin: 'Admin',
  super_admin: 'Super Admin',
};

export const ADMIN_ASSIGNABLE_ROLES: ValidRole[] = ['user', 'editor', 'admin'];

// ─── Rate Limits ─────────────────────────────────────────────────────────────

export const rateLimits = {
  invite: { limit: 20, windowMs: 10 * 60 * 1000 },
  userEdit: { limit: 60, windowMs: 10 * 60 * 1000 },
  userDelete: { limit: 20, windowMs: 10 * 60 * 1000 },
};
