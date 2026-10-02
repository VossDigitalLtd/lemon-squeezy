import { cn } from '@/utils/cn';

interface LaceBandProps {
  /** Mirror the pattern vertically (use for the bottom edge of a section) */
  flip?: boolean;
  className?: string;
}

/**
 * A thin repeating band based on Lefkara lace, the traditional Cypriot
 * embroidery: a zigzag "river" line with small diamonds. Colour comes from
 * the --lace token via text-lace.
 */
export function LaceBand({ flip, className }: LaceBandProps) {
  // Unique enough per band; identical patterns sharing an id render the same
  const id = `lace-${flip ? 'b' : 't'}`;
  return (
    <svg
      className={cn('block h-5 w-full text-lace', flip && '-scale-y-100', className)}
      aria-hidden="true"
    >
      <defs>
        <pattern id={id} width="40" height="20" patternUnits="userSpaceOnUse">
          <g fill="none" stroke="currentColor" strokeWidth="1.3">
            <path d="M0 10 L10 3 L20 10 L30 3 L40 10" />
            <path d="M0 17 L10 10 L20 17 L30 10 L40 17" opacity="0.55" />
          </g>
          <g fill="currentColor">
            <path d="M10 13.4l1.8 1.8-1.8 1.8-1.8-1.8Z" />
            <path d="M30 13.4l1.8 1.8-1.8 1.8-1.8-1.8Z" />
            <circle cx="20" cy="3.2" r="1.2" />
            <circle cx="0" cy="3.2" r="1.2" />
            <circle cx="40" cy="3.2" r="1.2" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}
