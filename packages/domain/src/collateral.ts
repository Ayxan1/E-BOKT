import { Decimal, parseDecimal } from "./money";
import type { FieldError, ValidationResult } from "./result";
import { text } from "./result";

export const COLLATERAL_TYPES = ["PRECIOUS", "REAL_ESTATE", "VEHICLE", "OTHER", "GUARANTOR"] as const;

export type PreciousItem = {
  name: string;
  unit_code: string;
  fineness: string;
  quantity: number;
  unit_price: string;
  stone_weight: string;
  net_weight: string;
  gross_weight: string;
  liquidation_value: string;
};

function weight(value: unknown, field: string): Decimal {
  const parsed = parseDecimal(value, field);
  if (parsed.isNegative()) throw new Error(`${field} mənfi ola bilməz`);
  return parsed.toDecimalPlaces(3);
}

export function normalizePreciousItem(input: unknown): ValidationResult<PreciousItem> {
  const source = (input ?? {}) as Record<string, unknown>;
  const errors: FieldError[] = [];
  const name = text(source.name);
  if (!name) errors.push({ field: "name", message: "Adı (açıqlaması) məcburidir" });

  const quantity = Number(source.quantity ?? 0);
  if (!Number.isInteger(quantity) || quantity < 0) {
    errors.push({ field: "quantity", message: "Sayı tam ədəd olmalıdır" });
  }

  let unitPrice: Decimal;
  let stone: Decimal;
  let net: Decimal;
  let gross: Decimal;
  let liquidation: Decimal;
  try {
    unitPrice = parseDecimal(source.unit_price, "1 qramın likvid qiyməti");
    stone = weight(source.stone_weight, "daşın çəkisi");
    net = weight(source.net_weight, "xalis çəki");
    gross = weight(source.gross_weight, "ümumi çəki");
    liquidation = parseDecimal(source.liquidation_value, "likvid dəyəri");
    if (unitPrice.isNegative() || liquidation.isNegative()) throw new Error("məbləğ mənfi ola bilməz");
  } catch (error) {
    errors.push({ field: "unit_price", message: error instanceof Error ? error.message : "Çəki və ya qiymət səhvdir" });
    return { ok: false, errors };
  }

  if (net.isZero() && gross.gt(0)) net = Decimal.max(gross.minus(stone), 0).toDecimalPlaces(3);
  if (liquidation.isZero() && net.gt(0) && unitPrice.gt(0)) {
    liquidation = net.mul(unitPrice).toDecimalPlaces(2);
  }

  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      name,
      unit_code: text(source.unit_code || "GRAM").toUpperCase(),
      fineness: text(source.fineness),
      quantity,
      unit_price: unitPrice.toDecimalPlaces(2).toFixed(2),
      stone_weight: stone.toFixed(3),
      net_weight: net.toFixed(3),
      gross_weight: gross.toFixed(3),
      liquidation_value: liquidation.toDecimalPlaces(2).toFixed(2),
    },
  };
}
