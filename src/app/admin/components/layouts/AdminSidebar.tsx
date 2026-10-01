'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/utils/cn';
import type { User } from '@supabase/supabase-js';
import { useAdminRole } from '@/app/admin/context';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { SidebarHeader, SidebarNavigation, SidebarFooter } from './sidebar';

interface AdminSidebarProps {
  isExpanded: boolean;
  showMobileNav: boolean;
  onExpandChange: (expanded: boolean) => void;
  onMobileNavChange: (show: boolean) => void;
  user: User;
  onLogout: () => void;
}

export default function AdminSidebar({
  isExpanded,
  showMobileNav,
  onExpandChange,
  onMobileNavChange,
  user,
  onLogout,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const { role } = useAdminRole();

  // Close mobile nav on route change
  useEffect(() => {
    onMobileNavChange(false);
  }, [pathname, onMobileNavChange]);

  const navContent = (expanded: boolean, showExpandToggle: boolean) => (
    <>
      <SidebarHeader isExpanded={expanded} />
      <SidebarNavigation isExpanded={expanded} currentPath={pathname} role={role} />
      <SidebarFooter
        isExpanded={expanded}
        showExpandToggle={showExpandToggle}
        user={user}
        onLogout={onLogout}
        onExpandChange={onExpandChange}
      />
    </>
  );

  return (
    <>
      {/* Desktop sidebar — sticky flex item with animated width */}
      <nav
        className={cn(
          'hidden md:flex flex-col bg-sidebar h-screen sticky top-0 flex-shrink-0 overflow-x-visible border-r border-sidebar-border transition-[width] duration-300 ease-in-out',
          isExpanded ? 'w-[220px]' : 'w-[60px]'
        )}
      >
        {navContent(isExpanded, true) /* showExpandToggle=true for desktop */}
      </nav>

      {/* Mobile — Sheet drawer */}
      <Sheet open={showMobileNav} onOpenChange={(open) => !open && onMobileNavChange(false)}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="p-0 gap-0 w-[220px] bg-sidebar border-r border-sidebar-border"
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          {navContent(true, false) /* showExpandToggle=false for mobile */}
        </SheetContent>
      </Sheet>
    </>
  );
}
