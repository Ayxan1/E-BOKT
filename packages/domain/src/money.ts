import Decimal from "decimal.js";

Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

export { Decimal };

export class MoneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MoneyError";
  }
}

export function parseDecimal(value: unknown, field: string): Decimal {
  if (value instanceof Decimal) return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new MoneyError(`${field} rəqəm olmalıdır`);
    return new Decimal(value);
  }
  if (typeof value === "string") {
    const trimmed = value.trim().replace(",", ".");
    if (!trimmed) return new Decimal(0);
    try {
      return new Decimal(trimmed);
    } catch {
      throw new MoneyError(`${field} rəqəm olmalıdır`);
    }
  }
  if (value === null || value === undefined || value === "") return new Decimal(0);
  throw new MoneyError(`${field} rəqəm olmalıdır`);
}

export function money(value: unknown, field = "məbləğ"): string {
  const parsed = parseDecimal(value, field);
  if (parsed.isNegative()) throw new MoneyError(`${field} mənfi ola bilməz`);
  return parsed.toDecimalPlaces(2).toFixed(2);
}

export function rate(value: unknown, field = "faiz"): string {
  const parsed = parseDecimal(value, field);
  if (parsed.isNegative()) throw new MoneyError(`${field} mənfi ola bilməz`);
  return parsed.toDecimalPlaces(4).toFixed(4);
}

export function compare(left: string, right: string): number {
  return new Decimal(left).comparedTo(new Decimal(right));
}
