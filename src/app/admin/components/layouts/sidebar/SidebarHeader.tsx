import { cn } from '@/utils/cn';
import { APP_NAME } from '@/lib/config/app';
import { AppIcon } from '@/components/ui/AppIcon';

interface SidebarHeaderProps {
  isExpanded: boolean;
}

export default function SidebarHeader({ isExpanded }: SidebarHeaderProps) {
  return (
    <div className="h-16 flex items-center px-3 border-b border-sidebar-border flex-shrink-0">
      <div className={cn('flex items-center min-w-0', isExpanded ? 'gap-2.5' : 'gap-0')}>
        <AppIcon size={32} />
        {isExpanded && (
          <span className="font-semibold text-sidebar-foreground whitespace-nowrap truncate">{APP_NAME}</span>
        )}
      </div>
    </div>
  );
}
