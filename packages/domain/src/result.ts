export type FieldError = { field: string; message: string };

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: FieldError[] };

export function fail(errors: FieldError[]): ValidationResult<never> {
  return { ok: false, errors };
}

export function ok<T>(value: T): ValidationResult<T> {
  return { ok: true, value };
}

export function text(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}
