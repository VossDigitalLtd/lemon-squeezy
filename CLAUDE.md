# Next.js Admin Boilerplate

A clean, production-ready boilerplate for building admin applications with Next.js 16, Supabase Auth, and TailwindCSS 4.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **React**: React 19
- **Styling**: TailwindCSS 4
- **Authentication**: Supabase Auth (`@supabase/ssr`)
- **Database**: Supabase
- **Payments**: Stripe (dependency installed)
- **Icons**: Lucide React

## Quick Start

### 1. Clone & Install

```bash
npm install
```

### 2. Configure Environment

Copy `.env.local.example` to `.env.local` and fill in:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your publishable key (sb_publishable_...)>
SUPABASE_SERVICE_ROLE_KEY=<your secret key (sb_secret_...)>

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Run Database Migrations

In Supabase Dashboard > SQL Editor, run the migrations in order:
- `supabase/migrations/001_create_profiles_table.sql`
- `supabase/migrations/002_create_storage_bucket.sql`

### 4. Configure Auth URLs

In Supabase Dashboard > Authentication > URL Configuration:
- Site URL: `http://localhost:3000`
- Redirect URLs:
  - `http://localhost:3000/auth/callback`
  - `http://localhost:3000/auth/reset-password`

### 5. Run

```bash
npm run dev
```

- Landing page: `http://localhost:3000`
- Login: `http://localhost:3000/login`
- Signup: `http://localhost:3000/signup`
- Admin dashboard: `http://localhost:3000/admin` (requires login)

## Project Structure

```
src/
├── app/
│   ├── (auth)/                   # Auth pages (login, signup, forgot-password)
│   ├── admin/                    # Protected admin area
│   │   ├── layout.js             # Admin layout with sidebar
│   │   ├── page.js               # Dashboard
│   │   ├── components/layouts/   # Admin UI components
│   │   └── context/              # Admin state management
│   ├── api/
│   │   └── profile/              # Profile API routes
│   ├── auth/                     # Auth callbacks & pages
│   ├── layout.tsx                # Root layout with AuthProvider
│   └── page.tsx                  # Public landing page
├── components/
│   ├── ui/                       # Reusable UI components (35+)
│   └── forms/                    # Form field components (15+)
├── hooks/                        # Custom React hooks
├── lib/
│   └── supabase/
│       ├── client.js             # Browser Supabase client
│       ├── server.js             # Server Supabase client
│       ├── middleware.js         # Session refresh
│       ├── auth/                 # Auth context & hooks
│       ├── core/                 # BaseQueryService, CacheManager
│       ├── storage/              # StorageService for file uploads
│       ├── services/             # ProfileService, etc.
│       └── utils/validation.js   # Validation utilities
├── utils/
│   └── cn.js                     # Class name utility
└── middleware.ts                 # Session refresh & route protection

supabase/
└── migrations/                   # SQL migration files
    ├── 001_create_profiles_table.sql
    └── 002_create_storage_bucket.sql
```

## Database Patterns

### BaseQueryService

Base class for building consistent database services with pagination, caching, and RLS support:

```jsx
// lib/supabase/services/ItemService.js
import { BaseQueryService } from '@/lib/supabase/core';

class ItemServiceClass extends BaseQueryService {
  constructor() {
    super('items', {
      searchFields: ['title', 'description'],
      defaultOrderBy: 'created_at',
      useSoftDelete: true, // Uses deleted_at column
      enableCache: true,
      cacheTTL: 300000 // 5 minutes
    });
  }

  // Add custom methods
  async getActiveItems(supabase) {
    return this.findMany(supabase, {
      filters: { status: 'active' }
    });
  }
}

export const ItemService = new ItemServiceClass();
```

Using the service:

```jsx
// In API route or Server Component
import { createClient } from '@/lib/supabase/server';
import { ItemService } from '@/lib/supabase/services';

const supabase = await createClient();

// Find all with pagination
const result = await ItemService.findMany(supabase, {
  page: 1,
  limit: 25,
  search: 'query',
  orderBy: 'created_at',
  orderDirection: 'desc'
});

// Find by ID
const item = await ItemService.findById(supabase, 'uuid');

// Create
const newItem = await ItemService.create(supabase, { title: 'New Item' });

// Update
await ItemService.update(supabase, 'uuid', { title: 'Updated' });

// Delete
await ItemService.delete(supabase, 'uuid');
```

### ProfileService

Built-in service for user profile management with avatar support:

```jsx
import { createClient } from '@/lib/supabase/server';
import { ProfileService } from '@/lib/supabase/services';

const supabase = await createClient();

// Get current user's profile
const profile = await ProfileService.getProfile(supabase);

// Update profile
await ProfileService.updateProfile(supabase, {
  full_name: 'John Doe'
});

// Update avatar
await ProfileService.updateAvatar(supabase, file);

// Remove avatar
await ProfileService.removeAvatar(supabase);

// Check role
const isAdmin = await ProfileService.isAdmin(supabase);
```

### StorageService

File upload utilities with user-scoped folders:

```jsx
import { createClient } from '@/lib/supabase/client';
import { StorageService } from '@/lib/supabase/storage';

const supabase = createClient();

// Upload avatar (2MB limit, images only)
const result = await StorageService.uploadAvatar(supabase, file);
// { url: 'https://...', path: 'avatars/user-id/filename.jpg' }

// Upload general image (5MB limit)
const result = await StorageService.uploadImage(supabase, file, 'images');

// Delete file
await StorageService.deleteFile(supabase, 'path/to/file.jpg');

// List user's files
const files = await StorageService.listUserFiles(supabase, 'avatars');

// Validate before upload
const validation = StorageService.validateFile(file, {
  allowedTypes: ['image/jpeg', 'image/png'],
  maxSize: 2 * 1024 * 1024 // 2MB
});
```

### CacheManager

LRU cache with TTL and pattern invalidation:

```jsx
import { CacheManager } from '@/lib/supabase/core';

const cache = CacheManager.getInstance();

// Set with 5 minute TTL
cache.set('key', data, 300000);

// Get (returns null if expired)
const data = cache.get('key');

// Delete specific key
cache.delete('key');

// Invalidate by pattern
cache.invalidatePattern('users:*');

// Get cache stats
const stats = cache.getStats();
// { hits, misses, hitRate, currentSize, maxSize }
```

## Profile API

Built-in API routes for profile management:

```bash
# Get profile
GET /api/profile

# Update profile
PATCH /api/profile
{ "full_name": "John Doe" }

# Upload avatar
POST /api/profile/avatar
FormData: { file: File }

# Remove avatar
DELETE /api/profile/avatar
```

## Authentication

### Using auth in components

```jsx
import { useAuth } from '@/lib/supabase/auth';

function MyComponent() {
  const { user, login, logout, isLoading, isAuthenticated } = useAuth();

  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <button onClick={login}>Login</button>;

  return <button onClick={logout}>Logout ({user.email})</button>;
}
```

### Server-Side Auth (API Routes)

```jsx
// app/api/example/route.js
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // RLS policies filter data automatically
  const { data } = await supabase
    .from('items')
    .select('*');

  return Response.json({ data });
}
```

## RLS (Row Level Security)

The profiles table uses RLS with these policies:

```sql
-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );
```

For new tables, add similar policies:

```sql
-- Example: Users can only see their own data
CREATE POLICY "Users can view own data" ON items
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own data" ON items
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own data" ON items
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own data" ON items
FOR DELETE USING (auth.uid() = user_id);
```

## Available Hooks

| Hook | Purpose |
|------|---------|
| `useAuth()` | Auth state, login/logout functions |
| `useUserId()` | Get current user ID |
| `useUserEmail()` | Get current user email |
| `useDebounce(value, delay)` | Debounce values |
| `useToast()` | Toast notifications |
| `useLocalStorage(key, initial)` | Persistent local storage |
| `useFormValidation(schema)` | Form validation |

## Supabase Clients

```jsx
// Browser client (Client Components)
import { createClient } from '@/lib/supabase/client';
const supabase = createClient();

// Server client (Server Components, Route Handlers)
import { createClient } from '@/lib/supabase/server';
const supabase = await createClient();

// Admin client (bypasses RLS - use carefully)
import { createAdminClient } from '@/lib/supabase/server';
const supabaseAdmin = await createAdminClient();
```

## Commands

```bash
npm run dev          # Development server
npm run build        # Production build
npm run lint         # Run ESLint

# Clean reinstall
rm -rf node_modules .next && npm install
```

## Adding New Features

### 1. Create Migration

Add a new SQL file in `supabase/migrations/`:

```sql
-- supabase/migrations/003_create_items_table.sql
CREATE TABLE public.items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own items"
  ON public.items FOR ALL
  USING (auth.uid() = user_id);
```

### 2. Create Service

```jsx
// lib/supabase/services/ItemService.js
import { BaseQueryService } from '../core';

class ItemServiceClass extends BaseQueryService {
  constructor() {
    super('items', { searchFields: ['title'] });
  }
}

export const ItemService = new ItemServiceClass();
```

### 3. Create API Routes

```jsx
// app/api/items/route.js
import { createClient } from '@/lib/supabase/server';
import { ItemService } from '@/lib/supabase/services';

export async function GET(request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  const result = await ItemService.findMany(supabase, {
    page: searchParams.get('page') || 1,
    limit: searchParams.get('limit') || 25,
    search: searchParams.get('search')
  });

  return Response.json(result);
}
```

---

**Stack**: Next.js 16 • React 19 • Supabase Auth • TailwindCSS 4 • Stripe
