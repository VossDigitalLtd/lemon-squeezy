// utils/colorUtils.ts
// Color utility functions for branded styling

/**
 * Parse hex color to RGB values
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Calculate relative luminance of a color
 */
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Get appropriate text color (black or white) based on background color
 * for optimal contrast
 */
export function getTextColor(backgroundColor: string): string {
  const rgb = hexToRgb(backgroundColor);
  if (!rgb) return '#000000';

  const luminance = getLuminance(rgb.r, rgb.g, rgb.b);
  return luminance > 0.179 ? '#000000' : '#FFFFFF';
}

/**
 * Get appropriate contrast color based on background
 */
export function getContrastColor(backgroundColor: string): string {
  return getTextColor(backgroundColor);
}

/**
 * Get border color based on background (slightly darker/lighter)
 */
export function getBorderColor(backgroundColor: string): string {
  const rgb = hexToRgb(backgroundColor);
  if (!rgb) return '#E5E7EB'; // gray-200 default

  const luminance = getLuminance(rgb.r, rgb.g, rgb.b);

  if (luminance > 0.5) {
    // Light background - darker border
    return `rgb(${Math.max(0, rgb.r - 30)}, ${Math.max(0, rgb.g - 30)}, ${Math.max(0, rgb.b - 30)})`;
  } else {
    // Dark background - lighter border
    return `rgb(${Math.min(255, rgb.r + 30)}, ${Math.min(255, rgb.g + 30)}, ${Math.min(255, rgb.b + 30)})`;
  }
}

/**
 * Get card/container background color based on main background
 */
export function getCardColor(containerColor: string): string {
  const rgb = hexToRgb(containerColor);
  if (!rgb) return '#FFFFFF';

  const luminance = getLuminance(rgb.r, rgb.g, rgb.b);

  if (luminance > 0.9) {
    // Very light background - slightly darker card
    return `rgb(${Math.max(0, rgb.r - 5)}, ${Math.max(0, rgb.g - 5)}, ${Math.max(0, rgb.b - 5)})`;
  }

  return containerColor;
}

/**
 * Lighten a color by a percentage
 */
export function lightenColor(color: string, percent: number): string {
  const rgb = hexToRgb(color);
  if (!rgb) return color;

  const factor = percent / 100;
  const r = Math.round(rgb.r + (255 - rgb.r) * factor);
  const g = Math.round(rgb.g + (255 - rgb.g) * factor);
  const b = Math.round(rgb.b + (255 - rgb.b) * factor);

  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Darken a color by a percentage
 */
export function darkenColor(color: string, percent: number): string {
  const rgb = hexToRgb(color);
  if (!rgb) return color;

  const factor = 1 - percent / 100;
  const r = Math.round(rgb.r * factor);
  const g = Math.round(rgb.g * factor);
  const b = Math.round(rgb.b * factor);

  return `rgb(${r}, ${g}, ${b})`;
}
