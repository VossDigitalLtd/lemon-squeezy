import { cn } from '@/utils/cn';
import { timerWedgePath, formatMinutesLong } from '@/lib/time';
import { LogoRays } from './LogoRays';

interface LogoTimerProps {
  /** Minutes to show. 60 or more fills the circle. */
  minutes: number;
  /** Accessible label. Defaults to "45 minutes". Pass '' to hide from screen readers. */
  label?: string;
  className?: string;
}

/**
 * The brand's time icon: the logo's rays over a yellow wedge that fills
 * clockwise from 12 o'clock (15 min = a quarter, 60 min = full circle).
 * Size it with className, e.g. "size-14".
 */
export function LogoTimer({ minutes, label, className }: LogoTimerProps) {
  const wedge = timerWedgePath(minutes);
  const ariaLabel = label ?? formatMinutesLong(minutes);

  return (
    <svg
      viewBox="0 0 180 180"
      className={cn('flex-shrink-0 text-foreground', className)}
      role={ariaLabel ? 'img' : undefined}
      aria-label={ariaLabel || undefined}
      aria-hidden={ariaLabel ? undefined : true}
    >
      {wedge === null ? (
        <circle cx="90" cy="90" r="90" className="fill-primary" />
      ) : (
        wedge && <path d={wedge} className="fill-primary" />
      )}
      <LogoRays />
    </svg>
  );
}
