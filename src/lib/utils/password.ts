export const PASSWORD_RULES = [
  { id: 'length',    label: 'At least 8 characters',  test: (p: string) => p.length >= 8 },
  { id: 'upper',     label: 'One uppercase letter',    test: (p: string) => /[A-Z]/.test(p) },
  { id: 'lower',     label: 'One lowercase letter',    test: (p: string) => /[a-z]/.test(p) },
  { id: 'number',    label: 'One number',              test: (p: string) => /\d/.test(p) },
] as const;

/** Returns an error string if the password fails any rule, otherwise null. */
export function validatePassword(password: string): string | null {
  for (const rule of PASSWORD_RULES) {
    if (!rule.test(password)) {
      return `Password must include: ${rule.label.toLowerCase()}`;
    }
  }
  return null;
}
