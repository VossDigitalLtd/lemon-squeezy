import Image from 'next/image';
import { brand } from '@/lib/config/brand';
import { APP_NAME } from '@/lib/config/app';
import { cn } from '@/utils/cn';

interface AppIconProps {
  /** Icon size in pixels (width and height). Defaults to 32. */
  size?: number;
  /** Additional classes applied to the root element. */
  className?: string;
}

/**
 * Square icon mark for the app. Used in sidebars, headers, and anywhere
 * a compact brand symbol is needed.
 *
 * - If NEXT_PUBLIC_LOGO_ICON_PATH is set, renders that image.
 * - If NEXT_PUBLIC_LOGO_ICON_DARK_PATH is also set, the dark variant is shown
 *   automatically in dark mode (pure CSS, no JS).
 * - Otherwise renders the first letter of APP_NAME in a branded square.
 *
 * Set icon paths in .env.local:
 *   NEXT_PUBLIC_LOGO_ICON_PATH=/logo-icon.svg
 *   NEXT_PUBLIC_LOGO_ICON_DARK_PATH=/logo-icon-dark.svg  (optional)
 */
export function AppIcon({ size = 32, className }: AppIconProps) {
  if (brand.icon) {
    const sharedProps = {
      alt: APP_NAME,
      width: size,
      height: size,
      style: { width: size, height: size },
      priority: true as const,
    };

    if (brand.iconDark) {
      return (
        <>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image
            src={brand.icon}
            className={cn('object-contain flex-shrink-0 dark:hidden', className)}
            {...sharedProps}
          />
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image
            src={brand.iconDark}
            className={cn('object-contain flex-shrink-0 hidden dark:block', className)}
            {...sharedProps}
          />
        </>
      );
    }

    return (
      // eslint-disable-next-line jsx-a11y/alt-text
      <Image
        src={brand.icon}
        className={cn('object-contain flex-shrink-0', className)}
        {...sharedProps}
      />
    );
  }

  const letter = APP_NAME.charAt(0).toUpperCase();
  return (
    <div
      className={cn(
        'bg-primary text-primary-foreground rounded-lg flex items-center justify-center flex-shrink-0 font-bold select-none',
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.5) }}
      aria-hidden="true"
    >
      {letter}
    </div>
  );
}
