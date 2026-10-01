import Image from 'next/image';
import { brand } from '@/lib/config/brand';
import { APP_NAME } from '@/lib/config/app';

interface AppLogoProps {
  /** Additional classes applied to the root element. */
  className?: string;
  /** Logo height in pixels (width scales automatically). Defaults to 28. */
  height?: number;
}

/**
 * Renders the brand logo image if NEXT_PUBLIC_LOGO_PATH is set,
 * otherwise falls back to the app name as text.
 *
 * If NEXT_PUBLIC_LOGO_DARK_PATH is also set, the dark variant is shown
 * automatically in dark mode (pure CSS, no JS).
 *
 * Set logo paths in .env.local:
 *   NEXT_PUBLIC_LOGO_PATH=/logo.svg
 *   NEXT_PUBLIC_LOGO_DARK_PATH=/logo-dark.svg  (optional)
 */
export function AppLogo({ className, height = 28 }: AppLogoProps) {
  if (brand.logo) {
    const sharedProps = {
      alt: APP_NAME,
      height,
      width: height * 4,
      style: { height, width: 'auto' },
      priority: true,
    };

    if (brand.logoDark) {
      return (
        <>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image
            src={brand.logo}
            className={`dark:hidden ${className ?? ''}`}
            {...sharedProps}
          />
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image
            src={brand.logoDark}
            className={`hidden dark:block ${className ?? ''}`}
            {...sharedProps}
          />
        </>
      );
    }

    return (
      // eslint-disable-next-line jsx-a11y/alt-text
      <Image
        src={brand.logo}
        className={className}
        {...sharedProps}
      />
    );
  }

  return (
    <span className={className}>
      {APP_NAME}
    </span>
  );
}
