export type Errors<T> = Partial<Record<keyof T, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function requiredField(value: string | undefined, label: string): string | undefined {
  if (!value || value.trim().length === 0) return `${label} is required.`;
  return undefined;
}

export function emailField(value: string | undefined, required = true): string | undefined {
  if (!value || value.trim().length === 0) {
    return required ? 'Email address is required.' : undefined;
  }
  if (!EMAIL_PATTERN.test(value.trim())) return 'Enter a valid email address.';
  return undefined;
}

export function passwordField(value: string | undefined, required = true): string | undefined {
  if (!value || value.length === 0) {
    return required ? 'Password is required.' : undefined;
  }
  if (value.length < 6) return 'Password must be at least 6 characters.';
  return undefined;
}

export function yearField(value: string | undefined, label: string): string | undefined {
  const missing = requiredField(value, label);
  if (missing) return missing;
  if (!/^\d{4}$/.test((value as string).trim())) return `${label} must be a 4-digit year.`;
  return undefined;
}

export function hasErrors<T>(errors: Errors<T>): boolean {
  return Object.values(errors).some(Boolean);
}