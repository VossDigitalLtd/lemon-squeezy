'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useAppearanceSettings, type Theme } from '@/hooks/useAppearanceSettings';
import { cn } from '@/utils/cn';

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'Auto', icon: Monitor },
];

/**
 * Light / Dark / Auto switch. Lives in the footer and the mobile menu rather
 * than the header, since it's a setting rather than navigation.
 */
export function ThemeSwitcher({ tone = 'default', className }: { tone?: 'default' | 'footer'; className?: string }) {
  const { theme, setTheme } = useAppearanceSettings();

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className={cn(
        'inline-flex gap-0.5 rounded-full p-1',
        tone === 'footer' ? 'bg-footer-foreground/10' : 'bg-muted',
        className
      )}
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
              active
                ? 'bg-primary text-primary-foreground'
                : tone === 'footer'
                  ? 'text-footer-foreground/70 hover:text-footer-foreground'
                  : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon size={14} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
