'use client';

import { useState, useEffect, useCallback } from 'react';
import { defaults } from '@/lib/config/app';

export type Theme = 'light' | 'dark' | 'system';
export type FontSize = 'small' | 'default' | 'large';

interface AppearanceSettings {
  theme: Theme;
  fontSize: FontSize;
  setTheme: (t: Theme) => void;
  setFontSize: (s: FontSize) => void;
}

function applyTheme(theme: Theme) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const shouldBeDark = theme === 'dark' || (theme === 'system' && prefersDark);
  document.documentElement.classList.toggle('dark', shouldBeDark);
}

function applyFontSize(size: FontSize) {
  if (size === 'default') {
    document.documentElement.removeAttribute('data-font-size');
  } else {
    document.documentElement.setAttribute('data-font-size', size);
  }
}

export function useAppearanceSettings(): AppearanceSettings {
  const [theme, setThemeState] = useState<Theme>(defaults.theme);
  const [fontSize, setFontSizeState] = useState<FontSize>('default');

  // Read from localStorage on mount (SSR-safe)
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('theme') as Theme | null;
      const savedFontSize = localStorage.getItem('font-size') as FontSize | null;
      if (savedTheme) setThemeState(savedTheme);
      if (savedFontSize) setFontSizeState(savedFontSize);
    } catch {
      // localStorage unavailable
    }
  }, []);

  // Listen for system preference changes when in 'system' mode
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    try { localStorage.setItem('theme', t); } catch { /* ignore */ }
    applyTheme(t);
  }, []);

  const setFontSize = useCallback((s: FontSize) => {
    setFontSizeState(s);
    try {
      if (s === 'default') localStorage.removeItem('font-size');
      else localStorage.setItem('font-size', s);
    } catch { /* ignore */ }
    applyFontSize(s);
  }, []);

  return { theme, fontSize, setTheme, setFontSize };
}
