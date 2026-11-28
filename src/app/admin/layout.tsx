'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/supabase/auth';
import { AdminProvider } from '@/app/admin/context';
import { AdminHeader, AdminSidebar } from '@/app/admin/components/layouts';
import { defaults } from '@/lib/config/app';
// BOLT-ON: support — import SupportWidget after installing the support bolt-on:
// import { SupportWidget } from '@/lib/support/SupportWidget';

function SplashScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const [isClient, setIsClient] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(defaults.sidebarExpanded);
  const [showMobileNav, setShowMobileNav] = useState(false);

  useEffect(() => setIsClient(true), []);

  useEffect(() => {
    if (isClient) {
      const savedState = localStorage.getItem('admin-sidebar-expanded');
      if (savedState !== null) setSidebarExpanded(JSON.parse(savedState));
    }
  }, [isClient]);

  const handleSidebarExpandChange = (expanded: boolean) => {
    setSidebarExpanded(expanded);
    if (isClient) localStorage.setItem('admin-sidebar-expanded', JSON.stringify(expanded));
  };

  useEffect(() => {
    if (isClient && !isLoading && !user) router.push('/login');
  }, [isLoading, user, isClient, router]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) setShowMobileNav(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isClient || isLoading) return <SplashScreen message="Authenticating..." />;
  if (!user) return <SplashScreen message="Redirecting to login..." />;

  return (
    <AdminProvider>
      {/* overflow-hidden: only the content area scrolls, never the window */}
      <div className="admin-layout flex w-screen h-screen overflow-hidden bg-background">
        <AdminHeader onMenuClick={() => setShowMobileNav(true)} />
        <AdminSidebar
          isExpanded={sidebarExpanded}
          showMobileNav={showMobileNav}
          onExpandChange={handleSidebarExpandChange}
          onMobileNavChange={setShowMobileNav}
          user={user}
          onLogout={logout}
        />
        <main className="flex-1 flex flex-col h-full md:h-screen pt-14 md:pt-0 min-w-0">
          {/* relative: absolutely positioned bits (e.g. the hidden native select behind each dropdown)
              stay inside this scrolling area instead of stretching the whole page */}
          <section className="relative flex-1 overflow-auto min-h-0 min-w-0">{children}</section>
        </main>
      </div>

      {/* BOLT-ON: support — add {features.support && <SupportWidget />} here */}
    </AdminProvider>
  );
}
