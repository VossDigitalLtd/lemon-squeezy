'use client';

import { useEffect, useState } from 'react';
import { LogoTimer } from '@/components/brand';
import { useToast } from '@/lib/toast/context';
import { cn } from '@/utils/cn';

interface StepTimerProps {
  minutes: number;
  /** The duration as written in the step, e.g. "45 minutes" */
  label: string;
}

/**
 * A duration in a method step that works as a kitchen timer. Tap to start;
 * the logo wedge empties as time runs down. Tap again to cancel.
 */
export function StepTimer({ minutes, label }: StepTimerProps) {
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [finished, setFinished] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    if (endsAt == null) return;
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= endsAt) {
        window.clearInterval(id);
        setEndsAt(null);
        setFinished(true);
        addToast(`${label} timer finished`, 'success');
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [endsAt, label, addToast]);

  const running = endsAt != null;
  const remainingMs = running ? Math.max(0, endsAt - now) : 0;
  const remainingSec = Math.ceil(remainingMs / 1000);

  function handleClick(e: React.MouseEvent) {
    // Don't toggle the step's "done" state
    e.stopPropagation();
    if (running) {
      setEndsAt(null);
      addToast('Timer cancelled', 'info');
      return;
    }
    if (finished) {
      setFinished(false);
      return;
    }
    const start = Date.now();
    setNow(start);
    setEndsAt(start + minutes * 60_000);
    addToast(`${label} timer started. Tap it again to cancel.`, 'info');
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'mx-0.5 inline-flex items-center gap-1.5 rounded-full border py-0.5 pl-1 pr-3 align-middle text-sm font-medium leading-relaxed tabular-nums transition-colors',
        running && 'border-foreground bg-foreground text-background',
        finished && 'border-primary bg-primary text-primary-foreground',
        !running && !finished && 'border-border bg-card hover:border-foreground'
      )}
      aria-label={running ? `Cancel ${label} timer` : finished ? `${label} timer finished` : `Start ${label} timer`}
    >
      <LogoTimer
        minutes={running ? remainingMs / 60_000 : finished ? 0 : minutes}
        label=""
        className={cn('size-6', running ? 'text-background' : finished ? 'text-primary-foreground' : '')}
      />
      <span>
        {running
          ? `${Math.floor(remainingSec / 60)}:${String(remainingSec % 60).padStart(2, '0')}`
          : finished
            ? "Time's up"
            : label}
      </span>
    </button>
  );
}
