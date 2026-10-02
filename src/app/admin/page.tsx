'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  UtensilsCrossed,
  Tags,
  Users,
  Settings,
  ArrowUpRight,
  ExternalLink,
  Globe,
  BarChart3,
  type LucideIcon,
} from 'lucide-react';
import { useAdminRole } from '@/app/admin/context';
import { Badge } from '@/components/ui/badge';
import { ROLE_LABELS } from '@/lib/config/app';

interface QuickActionProps {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
}

function QuickAction({ title, description, href, icon: Icon }: QuickActionProps) {
  return (
    <Link
      href={href}
      className="group bg-card rounded-xl border border-border p-5 shadow-card hover:border-primary/30 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between">
        <div className="h-10 w-10 bg-muted rounded-lg flex items-center justify-center group-hover:bg-brand-muted transition-colors">
          <Icon
            size={20}
            className="text-muted-foreground group-hover:text-foreground transition-colors"
          />
        </div>
        <ArrowUpRight
          size={18}
          className="text-muted-foreground group-hover:text-foreground transition-colors mt-1"
        />
      </div>
      <h3 className="font-semibold text-foreground mt-4 text-sm">{title}</h3>
      <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
    </Link>
  );
}

interface StatCardProps {
  title: string;
  /** undefined while loading; null if it couldn't be loaded */
  value: number | null | undefined;
  icon: LucideIcon;
  href?: string;
}

function StatCard({ title, value, icon: Icon, href }: StatCardProps) {
  const content = (
    <div className="bg-card rounded-xl border border-border p-6 shadow-card">
      <div className="h-10 w-10 bg-primary rounded-lg flex items-center justify-center mb-4">
        <Icon size={20} className="text-primary-foreground" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <p className="text-3xl font-bold text-foreground mt-1">
        {value === undefined ? (
          <span className="inline-block h-8 w-16 bg-muted animate-pulse rounded-md" aria-label="Loading" />
        ) : value === null ? (
          <span className="text-muted-foreground" title="Couldn't load this count">–</span>
        ) : (
          value.toLocaleString()
        )}
      </p>
    </div>
  );

  return href ? (
    <Link href={href} className="hover:opacity-90 transition-opacity">{content}</Link>
  ) : (
    content
  );
}

export default function AdminDashboard() {
  const { role, roleLoading, profileName } = useAdminRole();
  const isAdmin = role === 'admin' || role === 'super_admin';
  const firstName = profileName?.split(' ')[0] ?? 'there';

  // undefined = still loading, null = couldn't load (shown as "–")
  const [recipeCount, setRecipeCount] = useState<number | null | undefined>(undefined);
  const [categoryCount, setCategoryCount] = useState<number | null | undefined>(undefined);
  const [userCount, setUserCount] = useState<number | null | undefined>(undefined);

  useEffect(() => {
    const getJson = (url: string) =>
      fetch(url, { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);

    getJson('/api/recipe?limit=1').then((json) => setRecipeCount(json?.pagination?.totalCount ?? null));

    getJson('/api/category').then((json) => {
      if (!json?.data) return setCategoryCount(null);
      setCategoryCount(
        (json.data.courses?.length || 0) + (json.data.cuisines?.length || 0) + (json.data.dietaries?.length || 0)
      );
    });
  }, []);

  // Only admins can list users, so wait until the role is known
  useEffect(() => {
    if (!isAdmin) return;
    fetch('/api/admin/users?limit=1', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => setUserCount(json?.pagination?.total ?? null))
      .catch(() => setUserCount(null));
  }, [isAdmin]);

  if (roleLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="h-8 w-48 bg-muted animate-pulse rounded-md mb-2" />
        <div className="h-4 w-72 bg-muted animate-pulse rounded-md" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Welcome back, {firstName}</h1>
          <p className="text-muted-foreground mt-1">Manage your Lemon Squeezy recipe collection.</p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:brightness-95"
        >
          <Globe size={16} />
          View the site
          <ExternalLink size={14} className="opacity-60" />
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard
          title="Recipes"
          value={recipeCount}
          icon={UtensilsCrossed}
          href="/admin/recipes"
        />
        <StatCard
          title="Categories"
          value={categoryCount}
          icon={Tags}
          href="/admin/categories"
        />
        {isAdmin && (
          <StatCard title="Users" value={userCount} icon={Users} href="/admin/users" />
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <QuickAction
            title="Recipes"
            description="Create, edit, and manage your recipe collection."
            href="/admin/recipes"
            icon={UtensilsCrossed}
          />
          <QuickAction
            title="Categories"
            description="Manage courses, cuisines, and dietary categories."
            href="/admin/categories"
            icon={Tags}
          />
          {isAdmin && (
            <QuickAction
              title="Manage Users"
              description="Invite users, edit roles, or remove accounts."
              href="/admin/users"
              icon={Users}
            />
          )}
          <QuickAction
            title="Reports"
            description="Saves, members, and a to-do list of recipes missing photos or times."
            href="/admin/reports"
            icon={BarChart3}
          />
          <QuickAction
            title="View the site"
            description="See the homepage and recipes as visitors do."
            href="/"
            icon={Globe}
          />
          <QuickAction
            title="Appearance"
            description="Switch themes and adjust font size."
            href="/admin/settings"
            icon={Settings}
          />
        </div>
      </div>

      <div className="mt-8 flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Signed in as</span>
        <Badge variant="outline" className="text-xs">
          {ROLE_LABELS[role ?? 'user'] ?? role}
        </Badge>
      </div>
    </div>
  );
}
