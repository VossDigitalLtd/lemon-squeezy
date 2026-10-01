import { Menu } from 'lucide-react';
import { APP_NAME } from '@/lib/config/app';
import { AppIcon } from '@/components/ui/AppIcon';

interface AdminHeaderProps {
  onMenuClick: () => void;
}

export default function AdminHeader({ onMenuClick }: AdminHeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-card shadow-card flex items-center justify-between px-4 md:hidden z-30 border-b border-border">
      <div className="flex items-center gap-2">
        <AppIcon size={32} />
        <span className="font-semibold text-foreground">{APP_NAME}</span>
      </div>
      <button
        onClick={onMenuClick}
        className="p-2 text-muted-foreground hover:text-foreground focus:outline-none"
        aria-label="Open navigation menu"
      >
        <Menu size={24} />
      </button>
    </header>
  );
}
