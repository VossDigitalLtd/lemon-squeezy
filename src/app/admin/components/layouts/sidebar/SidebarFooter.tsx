'use client';

import Image from 'next/image';
import Link from 'next/link';
import { LogOut, PanelLeftClose, PanelLeftOpen, User, Settings } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { useAdminRole } from '@/app/admin/context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface SidebarFooterProps {
  isExpanded: boolean;
  showExpandToggle?: boolean;
  user: SupabaseUser;
  onLogout: () => void;
  onExpandChange: (expanded: boolean) => void;
}

export default function SidebarFooter({ isExpanded, showExpandToggle, user, onLogout, onExpandChange }: SidebarFooterProps) {
  const { profileName, profileAvatarUrl } = useAdminRole();

  const displayName = profileName || user.user_metadata?.full_name || user.email || 'Admin User';

  const initials = displayName
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="border-t border-sidebar-border p-2 flex-shrink-0">
      {/* Profile dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              'w-full flex items-center gap-3 px-2 h-9 mb-1 rounded-md transition-colors',
              'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent'
            )}
            aria-label="Profile menu"
          >
            <div className="h-7 w-7 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 bg-primary">
              {profileAvatarUrl ? (
                <Image src={profileAvatarUrl} alt="" width={28} height={28} className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs font-semibold text-white">{initials}</span>
              )}
            </div>
            {isExpanded && (
              <div className="min-w-0 flex-1 text-left">
                <p className="text-xs font-medium truncate leading-none mb-0.5">{displayName}</p>
                <p className="text-xs truncate leading-none opacity-60">{user.email}</p>
              </div>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="w-52">
          <DropdownMenuItem asChild>
            <Link href="/admin/profile">
              <User size={14} />
              View Profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/admin/settings">
              <Settings size={14} />
              Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={onLogout}
            className="text-destructive focus:text-destructive focus:bg-destructive/10"
          >
            <LogOut size={14} />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Expand/collapse toggle */}
      {showExpandToggle && (
        <button
          type="button"
          onClick={() => onExpandChange(!isExpanded)}
          className={cn(
            'w-full flex items-center gap-3 px-2 h-9 rounded-md text-sm transition-colors',
            'text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent'
          )}
          aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {isExpanded ? (
            <>
              <PanelLeftClose size={16} className="flex-shrink-0" />
              <span>Collapse</span>
            </>
          ) : (
            <PanelLeftOpen size={16} className="flex-shrink-0" />
          )}
        </button>
      )}
    </div>
  );
}
