'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  UtensilsCrossed,
  Tags,
  Users,
  Settings,
  ArrowUpRight,
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
            className="text-muted-foreground group-hover:text-primary transition-colors"
          />
        </div>
        <ArrowUpRight
          size={18}
          className="text-muted-foreground group-hover:text-primary transition-colors mt-1"
        />
      </div>
      <h3 className="font-semibold text-foreground mt-4 text-sm">{title}</h3>
      <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
    </Link>
  );
}

interface StatCardProps {
  title: string;
  value: string | null;
  icon: LucideIcon;
  href?: string;
}

function StatCard({ title, value, icon: Icon, href }: StatCardProps) {
  const content = (
    <div className="bg-card rounded-xl border border-border p-6 shadow-card">
      <div className="h-10 w-10 bg-muted rounded-lg flex items-center justify-center mb-4">
        <Icon size={20} className="text-primary" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <p className="text-3xl font-bold text-foreground mt-1">
        {value === null ? (
          <span className="inline-block h-8 w-16 bg-muted animate-pulse rounded-md" />
        ) : (
          value
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

  const [recipeCount, setRecipeCount] = useState<number | null>(null);
  const [categoryCount, setCategoryCount] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/recipe?limit=1').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/category').then((r) => (r.ok ? r.json() : null)),
    ]).then(([recipeData, catData]) => {
      if (recipeData?.pagination?.totalCount !== undefined) {
        setRecipeCount(recipeData.pagination.totalCount);
      }
      if (catData?.data) {
        const total = (catData.data.courses?.length || 0) +
          (catData.data.cuisines?.length || 0) +
          (catData.data.dietaries?.length || 0);
        setCategoryCount(total);
      }
    }).catch(() => {});
  }, []);

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
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Welcome back, {firstName}</h1>
        <p className="text-muted-foreground mt-1">Manage your Lemon Squeezy recipe collection.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard
          title="Recipes"
          value={recipeCount !== null ? String(recipeCount) : null}
          icon={UtensilsCrossed}
          href="/admin/recipes"
        />
        <StatCard
          title="Categories"
          value={categoryCount !== null ? String(categoryCount) : null}
          icon={Tags}
          href="/admin/categories"
        />
        {isAdmin && (
          <StatCard title="Users" value={null} icon={Users} href="/admin/users" />
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
