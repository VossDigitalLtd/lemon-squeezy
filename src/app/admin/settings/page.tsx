'use client';

import { useEffect, useState } from 'react';
import { Monitor, Moon, Sun, Type } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/lib/toast/context';
import type { SiteSettings } from '@/lib/supabase/services/SettingsService';
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
          ? 'border-primary bg-brand-muted text-foreground dark:bg-primary/10 dark:text-primary'
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

// ── Site tab ──────────────────────────────────────────────────────────────────

function SiteSettingsPanel() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    fetch('/api/admin/settings', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((json) => setSettings(json.data))
      .catch(() => addToast('Could not load the site settings', 'error'));
  }, [addToast]);

  async function save(changes: Partial<SiteSettings>, message: string) {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setSettings(json.data);
      addToast(message, 'success');
    } catch {
      addToast('Could not save the setting', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (!settings) return <div className="h-12 bg-muted animate-pulse rounded-md" />;

  return (
    <div className="space-y-6">
      <label className="flex items-start justify-between gap-6">
        <span>
          <span className="block text-sm font-medium text-foreground">Show recipe inspiration</span>
          <span className="mt-1 block text-xs text-muted-foreground">
            Shows each recipe&rsquo;s sources, from the Recipe inspiration field, as a &ldquo;Recipe inspiration&rdquo; section after
            the tips on recipe and print pages. Switched off, the section is hidden on every recipe, but the sources are kept and
            can still be edited.
          </span>
        </span>
        <Switch
          checked={settings.show_recipe_inspiration}
          disabled={saving}
          onCheckedChange={(checked) =>
            save({ show_recipe_inspiration: checked }, checked ? 'Recipe inspiration shown on the site' : 'Recipe inspiration hidden on the site')
          }
          aria-label="Show recipe inspiration on the site"
        />
      </label>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Settings for the whole site, and your own preferences.</p>
      </div>

      <Tabs defaultValue="site">
        <TabsList className="mb-6">
          <TabsTrigger value="site">Site</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
        </TabsList>

        <TabsContent value="site">
          <div className="bg-card rounded-xl border border-border shadow-card p-6">
            <h2 className="text-sm font-medium text-foreground mb-1">Site</h2>
            <p className="text-xs text-muted-foreground mb-6">These apply to everyone visiting Lemon Squeezy.</p>
            <SiteSettingsPanel />
          </div>
        </TabsContent>

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
