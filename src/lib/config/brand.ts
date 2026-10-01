/**
 * Brand configuration — logo and identity.
 *
 * Set NEXT_PUBLIC_LOGO_PATH in .env.local to use a custom logo.
 * Drop the image file in /public (e.g. /public/logo.svg).
 *
 * Colours, border-radius, and shadow depth are configured in
 * src/app/globals.css in the "Brand" section at the top of :root.
 */
export const brand = {
  /** Path to full-width logo in /public — e.g. '/logo.svg'. Falls back to app name text when null. */
  logo: process.env.NEXT_PUBLIC_LOGO_PATH ?? null,
  /** Path to full-width logo for dark mode in /public — e.g. '/logo-dark.svg'. Falls back to logo when null. */
  logoDark: process.env.NEXT_PUBLIC_LOGO_DARK_PATH ?? null,
  /** Path to square icon mark in /public — e.g. '/logo-icon.svg'. Falls back to first letter of APP_NAME when null. */
  icon: process.env.NEXT_PUBLIC_LOGO_ICON_PATH ?? null,
  /** Path to square icon mark for dark mode in /public — e.g. '/logo-icon-dark.svg'. Falls back to icon when null. */
  iconDark: process.env.NEXT_PUBLIC_LOGO_ICON_DARK_PATH ?? null,
};
