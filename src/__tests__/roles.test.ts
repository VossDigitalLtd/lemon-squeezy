import { describe, it, expect } from 'vitest';
import { isStaffRole } from '@/lib/auth/roles';

describe('isStaffRole', () => {
  it('lets editors and admins into the admin area', () => {
    expect(isStaffRole('editor')).toBe(true);
    expect(isStaffRole('admin')).toBe(true);
    expect(isStaffRole('super_admin')).toBe(true);
  });

  it('treats members and missing roles as not staff', () => {
    expect(isStaffRole('user')).toBe(false);
    expect(isStaffRole(null)).toBe(false);
    expect(isStaffRole(undefined)).toBe(false);
    expect(isStaffRole('')).toBe(false);
  });
});
