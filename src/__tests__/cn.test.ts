import { describe, it, expect } from 'vitest';
import { cn } from '@/utils/cn';

describe('cn()', () => {
  it('joins class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('ignores falsy values', () => {
    expect(cn('foo', false && 'bar', undefined, null, 'baz')).toBe('foo baz');
  });

  it('deduplicates conflicting Tailwind utilities', () => {
    // tailwind-merge resolves conflicts: last one wins
    expect(cn('p-2', 'p-4')).toBe('p-4');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('handles conditional objects', () => {
    expect(cn({ active: true, disabled: false })).toBe('active');
  });
});
