export function toDate(value: string | null): Date | null {
  return value ? new Date(`${value}T00:00:00.000Z`) : null;
}

export function fromDate(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value.toISOString().slice(0, 10);
}

export function decimal(value: { toFixed(digits: number): string } | null | undefined, digits: number) {
  if (value === null || value === undefined) return null;
  return value.toFixed(digits);
}
