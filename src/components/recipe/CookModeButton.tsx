'use client';

import { useEffect, useRef, useState } from 'react';
import { Smartphone } from 'lucide-react';
import { useToast } from '@/lib/toast/context';
import { cn } from '@/utils/cn';

/**
 * Keeps the screen awake while cooking (Screen Wake Lock API).
 * Hidden in browsers that don't support it.
 */
export function CookModeButton({ className }: { className?: string }) {
  const [supported, setSupported] = useState(false);
  const [on, setOn] = useState(false);
  const lockRef = useRef<WakeLockSentinel | null>(null);
  const { addToast } = useToast();

  useEffect(() => {
    setSupported('wakeLock' in navigator);
    return () => {
      lockRef.current?.release().catch(() => {});
    };
  }, []);

  // The browser drops the lock when the tab is hidden; take it back on return
  useEffect(() => {
    if (!on) return;
    const onVisible = async () => {
      if (document.visibilityState === 'visible' && !lockRef.current) {
        try {
          lockRef.current = await navigator.wakeLock.request('screen');
          lockRef.current.addEventListener('release', () => (lockRef.current = null));
        } catch {
          setOn(false);
        }
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [on]);

  if (!supported) return null;

  async function toggle() {
    if (on) {
      await lockRef.current?.release().catch(() => {});
      lockRef.current = null;
      setOn(false);
      addToast('Cook mode off', 'info');
      return;
    }
    try {
      lockRef.current = await navigator.wakeLock.request('screen');
      lockRef.current.addEventListener('release', () => (lockRef.current = null));
      setOn(true);
      addToast('Cook mode on. Your screen will stay awake.', 'success');
    } catch {
      addToast("This browser can't keep the screen awake.", 'error');
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      className={cn(
        'inline-flex h-11 items-center gap-2 rounded-full border px-5 text-[0.9375rem] font-medium transition-colors',
        on ? 'border-foreground bg-foreground text-background' : 'border-border bg-card hover:border-foreground',
        className
      )}
    >
      <Smartphone size={17} />
      Cook mode
    </button>
  );
}
