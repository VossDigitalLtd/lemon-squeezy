/**
 * Roles that can use the admin area and change recipes, categories and
 * images. Everyone else (role 'user', shown as "Member") uses the public
 * site. Sign-ups are always 'user'; admins promote people on /admin/users.
 *
 * Safe to import anywhere (browser, middleware, server).
 */
export const STAFF_ROLES = ['editor', 'admin', 'super_admin'] as const;

export function isStaffRole(role: string | null | undefined): boolean {
  return (STAFF_ROLES as readonly string[]).includes(role ?? '');
}
