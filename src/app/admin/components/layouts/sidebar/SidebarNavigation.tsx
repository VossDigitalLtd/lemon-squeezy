import Link from 'next/link';
import { ReactElement } from 'react';
import { cn } from '@/utils/cn';
import { ROLE_LEVEL, MAIN_NAV_LINKS, BOTTOM_NAV_LINKS } from '@/lib/config';
import type { NavLink } from '@/lib/config';

function hasMinRole(userRole: string | null | undefined, minRole: string): boolean {
  return (ROLE_LEVEL[userRole ?? ''] ?? 0) >= (ROLE_LEVEL[minRole] ?? 99);
}

interface NavItemProps {
  href: string;
  icon: ReactElement;
  label: string;
  isActive: boolean;
  isExpanded: boolean;
}

function NavItem({ href, icon, label, isActive, isExpanded }: NavItemProps) {
  return (
    <li>
      <Link
        href={href}
        className={cn(
          'group flex items-center gap-3 px-3 my-0.5 mx-2 rounded-md text-sm font-medium transition-colors relative h-9',
          isActive
            ? 'bg-sidebar-primary text-sidebar-primary-foreground'
            : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent'
        )}
      >
        <span className="flex-shrink-0">{icon}</span>

        {isExpanded && (
          <span className="truncate">{label}</span>
        )}

        {/* Tooltip when collapsed */}
        {!isExpanded && (
          <span className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded-md border border-border shadow-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-[60] transition-opacity duration-150">
            {label}
          </span>
        )}
      </Link>
    </li>
  );
}

interface SidebarNavigationProps {
  isExpanded: boolean;
  currentPath: string;
  role?: string | null;
}

export default function SidebarNavigation({ isExpanded, currentPath, role }: SidebarNavigationProps) {
  const visibleMainLinks = MAIN_NAV_LINKS.filter(
    (link) => !link.minRole || hasMinRole(role, link.minRole)
  );
  const visibleBottomLinks = BOTTOM_NAV_LINKS.filter(
    (link) => !link.minRole || hasMinRole(role, link.minRole)
  );

  const renderLink = (link: NavLink) => {
    const isActive = link.exact
      ? currentPath === link.href
      : currentPath === link.href || currentPath.startsWith(link.href + '/');

    return (
      <NavItem
        key={link.href}
        href={link.href}
        icon={link.icon}
        label={link.label}
        isActive={isActive}
        isExpanded={isExpanded}
      />
    );
  };

  return (
    <ul
      className={cn(
        'flex-1 py-2 flex flex-col min-h-0',
        isExpanded ? 'overflow-x-hidden overflow-y-auto' : 'overflow-visible'
      )}
    >
      {visibleMainLinks.map(renderLink)}
      <li className="flex-1" />
      {visibleBottomLinks.map(renderLink)}
    </ul>
  );
}
