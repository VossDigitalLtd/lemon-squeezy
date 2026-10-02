import { cn } from '@/utils/cn';
import { LogoRays, LOGO_SEGMENT_PATH } from './LogoRays';

interface LogoMarkProps {
  size?: number;
  className?: string;
}

/**
 * The Lemon Squeezy icon drawn inline: yellow segment + rays in currentColor,
 * so it follows light/dark mode without separate image files.
 */
export function LogoMark({ size = 44, className }: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 180 180"
      width={size}
      height={size}
      className={cn('flex-shrink-0 text-foreground', className)}
      aria-hidden="true"
    >
      <path fill="#FDF032" d={LOGO_SEGMENT_PATH} />
      <LogoRays />
    </svg>
  );
}
