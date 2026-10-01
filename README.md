# Voss Digital Admin Boilerplate

A production-ready admin application boilerplate built with Next.js 16, Supabase Auth, shadcn/ui, and TailwindCSS 4.

## Features

- **Authentication** — email/password, magic links, MFA (TOTP), password reset, invite-only mode
- **User management** — invite, edit role, bulk delete/export/role-change, delete
- **Profile** — name, avatar upload, password change, session management, account deletion
- **Audit log** — tamper-evident event trail with paginated view (admin+)
- **Dashboard** — role-gated metrics (total users, pending invites, recent activity)
- **CSV export** — users table and audit log, full dataset via API
- **Appearance** — light/dark/system theme, font size, flash-free on reload
- **Rate limiting** — sliding window on all write API routes
- **Toast notifications** — global context-based system
- **Health check** — `GET /api/health` for uptime monitors and load balancers
- **Error monitoring** — Sentry integration with source maps
- **CI** — GitHub Actions lint + typecheck + test + build on every PR
- **Testing** — Vitest + Testing Library with example tests
- **UI library** — shadcn/ui (new-york style) + 8 custom components
- **Form components** — 12 typed form field components
- **Admin layout** — collapsible sidebar, profile dropdown, mobile Sheet drawer
- **Config system** — single-file brand, nav, feature flags, roles, and rate limits

### Bolt-ons (optional modules)

- **Billing** — Stripe Checkout, Customer Portal, webhook handler, Supabase migration
- **Email** — Resend adapter, typed `sendEmail()`, React Email templates
- **Onboarding** — first-login redirect, completion API, profile restart
- **Support** — Crisp chat widget with user identity pre-population

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16 | React framework (App Router) |
| React | 19 | UI library |
| TypeScript | 5 | Type safety (strict mode) |
| TailwindCSS | 4 | Styling |
| shadcn/ui | Latest | Component primitives |
| Supabase | Latest | Auth, Database, Storage |
| Lucide React | Latest | Icons |
| Stripe | Latest | Payments (bolt-on) |
| Resend | Latest | Transactional email (bolt-on) |
| Vitest | Latest | Unit testing |

---

## Quick Start

### 1. Clone & Install

```bash
git clone <repository-url>
cd <project-name>
npm install
```

### 2. Create a Supabase Project

Go to [supabase.com](https://supabase.com), create a new project, and copy the project URL and API keys from **Settings > API**.

### 3. Configure Environment

```bash
cp .env.local.example .env.local
```

Fill in your credentials and set `NEXT_PUBLIC_APP_NAME` to your project name:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your publishable key>
SUPABASE_SERVICE_ROLE_KEY=<your secret key>

NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=My App
```

See `.env.local.example` for the full list of optional vars (feature flags, bolt-ons, external links, UI defaults).

### 4. Run Database Schema

In **Supabase Dashboard > SQL Editor**, run the consolidated schema file:

```
supabase/schema.sql
```

This single file creates all tables, indexes, RLS policies, and triggers in one shot. The individual files in `supabase/migrations/` are retained as a change history and for applying incremental updates to existing databases.

### 5. Configure Auth URLs

In **Supabase Dashboard > Authentication > URL Configuration**:

- **Site URL**: `http://localhost:3000`
- **Redirect URLs** (add both):
  - `http://localhost:3000/auth/callback`
  - `http://localhost:3000/auth/reset-password`

### 6. Configure the App

Edit [`src/lib/config/app.ts`](src/lib/config/app.ts) to set feature flags, roles, external links, and UI defaults:

```ts
export const features = {
  auditLog:   process.env.NEXT_PUBLIC_FEATURE_AUDIT_LOG   !== 'false',
  developer:  process.env.NEXT_PUBLIC_FEATURE_DEVELOPER   !== 'false',
  signup:     process.env.NEXT_PUBLIC_FEATURE_SIGNUP      !== 'false',
  // Bolt-ons (disabled by default — see .env.local.example to enable)
  billing:    process.env.NEXT_PUBLIC_FEATURE_BILLING     === 'true',
  email:      process.env.NEXT_PUBLIC_FEATURE_EMAIL       === 'true',
  onboarding: process.env.NEXT_PUBLIC_FEATURE_ONBOARDING  === 'true',
  support:    process.env.NEXT_PUBLIC_FEATURE_SUPPORT     === 'true',
};
```

### 7. Configure Navigation

Edit [`src/lib/config/navigation.tsx`](src/lib/config/navigation.tsx) to add, remove, or reorder sidebar links:

```tsx
export const MAIN_NAV_LINKS: NavLink[] = [
  { href: '/admin', icon: <LayoutDashboard size={18} />, label: 'Dashboard', exact: true },
  { href: '/admin/users', icon: <Users size={18} />, label: 'Users', minRole: 'admin' },
  // Add more links here
];
```

### 8. Verify the Build

```bash
npm run build
```

A clean build confirms everything is wired up correctly before you deploy.

### 9. Start Development

```bash
npm run dev
```

### 10. Visit the App

| URL | Description |
|-----|-------------|
| `http://localhost:3000` | Landing page |
| `http://localhost:3000/login` | Login |
| `http://localhost:3000/signup` | Sign up |
| `http://localhost:3000/admin` | Admin dashboard (requires login) |

---

## Configuration

The entire boilerplate is configured from two files. This is the main thing to update when starting a new project.

### `src/lib/config/app.ts`

Controls brand identity, feature flags, roles, rate limits, and UI defaults:

```ts
// Brand — also set NEXT_PUBLIC_APP_NAME in .env.local
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? 'Admin';

// Feature flags
export const features = {
  auditLog:   process.env.NEXT_PUBLIC_FEATURE_AUDIT_LOG   !== 'false',
  developer:  process.env.NEXT_PUBLIC_FEATURE_DEVELOPER   !== 'false',
  signup:     process.env.NEXT_PUBLIC_FEATURE_SIGNUP      !== 'false',
  billing:    process.env.NEXT_PUBLIC_FEATURE_BILLING     === 'true',
  email:      process.env.NEXT_PUBLIC_FEATURE_EMAIL       === 'true',
  onboarding: process.env.NEXT_PUBLIC_FEATURE_ONBOARDING  === 'true',
  support:    process.env.NEXT_PUBLIC_FEATURE_SUPPORT     === 'true',
};

// Roles — extend or modify to match your application
export const VALID_ROLES = ['user', 'editor', 'admin', 'super_admin'] as const;
export const ROLE_LEVEL = { user: 0, editor: 1, admin: 2, super_admin: 3 };

// Rate limits — adjust per route as needed
export const rateLimits = {
  invite:     { limit: 20, windowMs: 10 * 60 * 1000 },
  userEdit:   { limit: 60, windowMs: 10 * 60 * 1000 },
  userDelete: { limit: 20, windowMs: 10 * 60 * 1000 },
};
```

### `src/lib/config/navigation.tsx`

Defines sidebar nav links. Feature flags gate items automatically:

```tsx
export const MAIN_NAV_LINKS: NavLink[] = [
  { href: '/admin', icon: <LayoutDashboard size={18} />, label: 'Dashboard', exact: true },
  { href: '/admin/users', icon: <Users size={18} />, label: 'Users', minRole: 'admin' },
  ...(features.auditLog ? [{ href: '/admin/audit', ... }] : []),
  ...(features.billing  ? [{ href: '/admin/billing', ... }] : []),
];
```

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/                   # Login, signup, forgot-password
│   ├── admin/                    # Protected admin area
│   │   ├── layout.tsx            # Auth guard, sidebar state
│   │   ├── page.tsx              # Dashboard with role-gated metrics
│   │   ├── audit/                # Audit log (admin+)
│   │   ├── billing/              # Billing page (BOLT-ON)
│   │   ├── developer/            # Developer tools (super_admin+)
│   │   ├── onboarding/           # First-login onboarding (BOLT-ON)
│   │   ├── profile/              # Profile, sessions, danger zone
│   │   ├── settings/             # Appearance settings
│   │   ├── support/              # Support hub (BOLT-ON)
│   │   ├── users/                # User management (admin+)
│   │   ├── components/layouts/   # AdminHeader, AdminSidebar
│   │   └── context/              # AdminProvider (role, profile)
│   ├── api/
│   │   ├── admin/
│   │   │   ├── audit/            # GET audit events + export
│   │   │   └── users/            # GET/POST users; PATCH/DELETE/export
│   │   ├── billing/              # Checkout + portal sessions (BOLT-ON)
│   │   ├── developer/            # Email tester (BOLT-ON)
│   │   ├── health/               # GET /api/health
│   │   ├── profile/              # PATCH profile; POST/DELETE avatar; onboarding
│   │   └── webhooks/stripe/      # Stripe webhook handler (BOLT-ON)
│   ├── auth/                     # Callback, signout, reset-password
│   └── page.tsx                  # Public landing page
├── components/
│   ├── ui/                       # shadcn/ui + custom components
│   └── forms/                    # 12 typed form field components
├── hooks/                        # useAuth, useToast, useAppearanceSettings, …
└── lib/
    ├── billing/                  # Stripe client + config (BOLT-ON)
    ├── config/
    │   ├── app.ts                # Brand, features, roles, rate limits ← edit this
    │   └── navigation.tsx        # Sidebar nav links ← edit this
    ├── email/                    # Resend adapter + templates (BOLT-ON)
    ├── support/                  # Chat widget scaffold (BOLT-ON)
    ├── supabase/
    │   ├── client.ts             # Browser Supabase client
    │   ├── server.ts             # Server Supabase client + admin client
    │   ├── auth/                 # AuthProvider, useAuth
    │   ├── core/                 # BaseQueryService, CacheManager
    │   ├── storage/              # StorageService
    │   └── services/             # ProfileService, AuditService
    └── toast/
        └── context.tsx           # ToastProvider, useToast

supabase/
├── schema.sql                    # Consolidated schema — run for fresh install
└── migrations/
    ├── 001–007_*.sql             # Core migrations
    └── optional/
        ├── 008_billing.sql       # Stripe columns on profiles (BOLT-ON)
        └── 009_onboarding.sql    # onboarding_completed column (BOLT-ON)
```

---

## Bolt-ons

Optional modules that can be included or removed cleanly. Each bolt-on is:

- **Bounded** — all code lives under a named directory (`src/lib/billing/`, etc.)
- **Flagged** — controlled by a `NEXT_PUBLIC_FEATURE_*` env var; set to `'false'` to disable without deleting code
- **Marked** — every file has `// BOLT-ON: name` at the top for easy identification
- **Independent** — bolt-ons don't depend on each other

| Bolt-on | Feature flag | Requires |
|---------|-------------|---------|
| Billing (Stripe) | `NEXT_PUBLIC_FEATURE_BILLING=true` | `supabase/migrations/optional/008_billing.sql` |
| Email (Resend) | `NEXT_PUBLIC_FEATURE_EMAIL=true` | Resend API key |
| Onboarding | `NEXT_PUBLIC_FEATURE_ONBOARDING=true` | `supabase/migrations/optional/009_onboarding.sql` |
| Support (Crisp) | `NEXT_PUBLIC_FEATURE_SUPPORT=true` | Crisp website ID |

To remove a bolt-on entirely: delete its directory, remove the `<BoltOnComponent />` references from layouts, remove the feature flag from `src/lib/config/app.ts`, and drop the optional migration. See [`docs/bolt-ons.md`](docs/bolt-ons.md) for per-bolt-on removal instructions.

---

## Key Patterns

### Authentication — Client Components

```tsx
import { useAuth } from '@/lib/supabase/auth';

function MyComponent() {
  const { user, isLoading, isAuthenticated, logout } = useAuth();

  if (isLoading) return <Spinner />;
  if (!isAuthenticated) return <LoginPrompt />;

  return <div>Welcome, {user.email}</div>;
}
```

### Authentication — Server Components & API Routes

```ts
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // RLS policies apply automatically
  const { data } = await supabase.from('profiles').select('*');
  return Response.json({ data });
}
```

### Database — BaseQueryService

```ts
import { ProfileService } from '@/lib/supabase/services';

const result = await ProfileService.getProfile(supabase);
await ProfileService.updateProfile(supabase, { full_name: 'Jane Doe' });
```

### Toast Notifications

```ts
import { useToast } from '@/hooks/useToast';

const { addToast } = useToast();
addToast('Saved successfully.', 'success');
addToast('Something went wrong.', 'error');
```

### Sending Email (Resend bolt-on)

```ts
import { sendEmail } from '@/lib/email/send';

await sendEmail({
  to: user.email,
  subject: 'Welcome',
  template: 'welcome',
  data: { name: user.user_metadata?.full_name },
});
```

---

## Customisation

### 1. Change the app name and branding

Set `NEXT_PUBLIC_APP_NAME` in `.env.local`. The sidebar header, page `<title>`, and meta description all read from this value automatically.

### 2. Add or remove nav items

Edit [`src/lib/config/navigation.tsx`](src/lib/config/navigation.tsx). Each entry is a plain object — add an icon from `lucide-react` and a `minRole` if the link should be role-gated.

### 3. Disable a feature

Set the corresponding env var in `.env.local`:

```bash
NEXT_PUBLIC_FEATURE_AUDIT_LOG=false
NEXT_PUBLIC_FEATURE_DEVELOPER=false
```

The nav link and protected route both disappear automatically.

### 4. Modify the role hierarchy

Edit `VALID_ROLES`, `ROLE_LEVEL`, and `ROLE_LABELS` in [`src/lib/config/app.ts`](src/lib/config/app.ts). These are the single source of truth for role checks across the app.

### 5. Add an admin page

```tsx
// src/app/admin/reports/page.tsx
export default function ReportsPage() {
  return <div>Reports content</div>;
}
```

Then add the link to `src/lib/config/navigation.tsx`.

### 6. Add an API route

Follow the pattern in [`src/app/api/admin/users/route.ts`](src/app/api/admin/users/route.ts):

```ts
import { createClient } from '@/lib/supabase/server';
import { ProfileService } from '@/lib/supabase/services';
import { ok, apiError } from '@/lib/api/response';

export async function GET() {
  const supabase = await createClient();
  const role = await ProfileService.getRole(supabase);
  if (role !== 'admin' && role !== 'super_admin') return apiError('Forbidden', 403);

  // ... your logic
  return ok({ data });
}
```

---

## Commands

```bash
npm run dev          # Development server (Turbopack)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
npm test             # Run Vitest unit tests
```

---

## Documentation

Detailed architecture documentation is in [`docs/`](docs/) and also accessible in-app at `/admin/developer/docs`.

- [Introduction](docs/README.md) — stack, conventions, adding new features
- [Authentication](docs/architecture/authentication.md) — auth flow, session handling, MFA, middleware
- [Brand](docs/architecture/brand.md) — CSS tokens, logos, feature flags, routing
- [Database Patterns](docs/architecture/database-patterns.md) — BaseQueryService, RLS, pagination
- [Storage](docs/architecture/storage.md) — file upload patterns, StorageService
- [API Routes](docs/architecture/api-routes.md) — response helpers, error handling, rate limiting
- [Caching](docs/architecture/caching.md) — CacheManager, TTL, pattern invalidation
- [Bolt-ons](docs/bolt-ons.md) — optional modules: billing, email, onboarding, support

---

## Extending the Boilerplate

See `projects/` for example implementations built on top of this boilerplate:

- [Training Platform](projects/training-app/README.md) — online course platform

---

## License

MIT — Voss Digital
