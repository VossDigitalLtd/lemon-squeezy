import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { User, ShieldCheck, Download } from 'lucide-react';
import type { Profile } from '@/types';

export default async function AccountOverviewPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single();

  const p = profile as Profile | null;
  const displayName = p?.full_name || user?.email?.split('@')[0] || 'there';

  const quickLinks = [
    {
      href: '/account/profile',
      icon: User,
      label: 'Profile',
      description: 'Update your name and photo',
    },
    {
      href: '/account/security',
      icon: ShieldCheck,
      label: 'Security',
      description: 'Password, two-factor authentication, and active sessions',
    },
    {
      href: '/account/data',
      icon: Download,
      label: 'Data & Privacy',
      description: 'Download your data or delete your account',
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Welcome back, {displayName}</h1>
        <p className="text-muted-foreground mt-1">{user?.email}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {quickLinks.map(({ href, icon: Icon, label, description }) => (
          <Link
            key={href}
            href={href}
            className="group bg-card border border-border rounded-xl p-5 shadow-card hover:border-primary/40 transition-colors"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <Icon size={16} className="text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
              <span className="font-medium text-foreground text-sm">{label}</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
