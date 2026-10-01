'use client';

import { Monitor, Moon, Sun, Type } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/utils/cn';
import { useAppearanceSettings, type Theme, type FontSize } from '@/hooks/useAppearanceSettings';

// ── Option button ─────────────────────────────────────────────────────────────

interface OptionButtonProps {
  isSelected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function OptionButton({ isSelected, onClick, children }: OptionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all',
        isSelected
          ? 'border-primary bg-brand-muted text-primary dark:bg-primary/10 dark:text-primary'
          : 'border-border bg-card text-muted-foreground hover:border-border hover:bg-accent'
      )}
    >
      {children}
    </button>
  );
}

// ── Appearance tab ────────────────────────────────────────────────────────────

function AppearanceSettings() {
  const { theme, fontSize, setTheme, setFontSize } = useAppearanceSettings();

  const themeOptions: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: 'Light', icon: <Sun size={16} /> },
    { value: 'dark', label: 'Dark', icon: <Moon size={16} /> },
    { value: 'system', label: 'System', icon: <Monitor size={16} /> },
  ];

  const fontSizeOptions: { value: FontSize; label: string; description: string }[] = [
    { value: 'small', label: 'Small', description: '14px' },
    { value: 'default', label: 'Default', description: '16px' },
    { value: 'large', label: 'Large', description: '18px' },
  ];

  return (
    <div className="space-y-8">
      {/* Theme */}
      <div>
        <h3 className="text-sm font-medium text-foreground mb-1">Theme</h3>
        <p className="text-xs text-muted-foreground mb-3">Choose how the interface looks to you.</p>
        <div className="flex gap-2 flex-wrap">
          {themeOptions.map(({ value, label, icon }) => (
            <OptionButton key={value} isSelected={theme === value} onClick={() => setTheme(value)}>
              {icon}
              {label}
            </OptionButton>
          ))}
        </div>
      </div>

      {/* Font size */}
      <div>
        <h3 className="text-sm font-medium text-foreground mb-1">
          <span className="flex items-center gap-2">
            <Type size={16} className="text-muted-foreground" />
            Font size
          </span>
        </h3>
        <p className="text-xs text-muted-foreground mb-3">Adjust the base text size across the interface.</p>
        <div className="flex gap-2 flex-wrap">
          {fontSizeOptions.map(({ value, label, description }) => (
            <OptionButton key={value} isSelected={fontSize === value} onClick={() => setFontSize(value)}>
              <span>{label}</span>
              <span className="text-xs opacity-60">{description}</span>
            </OptionButton>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your preferences.</p>
      </div>

      <Tabs defaultValue="appearance">
        <TabsList className="mb-6">
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
        </TabsList>

        <TabsContent value="appearance">
          <div className="bg-card rounded-xl border border-border shadow-card p-6">
            <h2 className="text-sm font-medium text-foreground mb-6">Appearance</h2>
            <AppearanceSettings />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
