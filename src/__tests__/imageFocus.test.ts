import { describe, it, expect } from 'vitest';
import { cleanFocus, imageFocus } from '@/lib/recipes';

describe('cleanFocus', () => {
  it('keeps whole percentages from 0 to 100', () => {
    expect(cleanFocus(30)).toBe(30);
    expect(cleanFocus(33.6)).toBe(34);
    expect(cleanFocus('72')).toBe(72);
    expect(cleanFocus(-5)).toBe(0);
    expect(cleanFocus(140)).toBe(100);
  });

  it('treats anything else as the centre (null)', () => {
    expect(cleanFocus(null)).toBeNull();
    expect(cleanFocus(undefined)).toBeNull();
    expect(cleanFocus('')).toBeNull();
    expect(cleanFocus('left')).toBeNull();
  });
});

describe('imageFocus', () => {
  it('positions the crop on the focal point', () => {
    expect(imageFocus({ feature_image_focus_x: 30, feature_image_focus_y: 80 })).toEqual({ objectPosition: '30% 80%' });
    expect(imageFocus({ feature_image_focus_x: 20, feature_image_focus_y: null })).toEqual({ objectPosition: '20% 50%' });
  });

  it('adds nothing for the centre', () => {
    expect(imageFocus({})).toEqual({});
    expect(imageFocus({ feature_image_focus_x: 50, feature_image_focus_y: 50 })).toEqual({});
  });
});
