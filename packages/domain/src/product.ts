import { compare, money, rate } from "./money";
import { fail, ok, text, type FieldError, type ValidationResult } from "./result";

export type CreditCondition = {
  currency: string;
  amount_min: string;
  amount_max: string;
  term_min_days: number;
  term_max_days: number;
  annual_interest_rate_min: string;
  annual_interest_rate_max: string;
};

export type DtiCondition = {
  dti_rate: string;
  salary_min: string;
  salary_max: string;
};

export type LtvCondition = {
  collateral_type: string;
  ltv_rate: string;
  credit_currency: string;
  collateral_currency: string;
};

export type NormalizedProduct = {
  product_code: number | null;
  product_name: string;
  credit_type: "LOAN" | "LINE";
  control_enabled: boolean;
  max_term: number;
  note: string;
  credit_conditions: CreditCondition[];
  dti_conditions: DtiCondition[];
  ltv_conditions: LtvCondition[];
};

function asArray(value: unknown): unknown[] {
  if (value === null || value === undefined || value === "") return [];
  return Array.isArray(value) ? value : [value];
}

function integer(value: unknown, field: string, errors: FieldError[]): number {
  const raw = text(value);
  if (!raw) return 0;
  if (!/^\d+$/.test(raw)) {
    errors.push({ field, message: "Tam ədəd olmalıdır" });
    return 0;
  }
  return Number(raw);
}

function safeMoney(value: unknown, field: string, errors: FieldError[]): string {
  try {
    return money(value, field);
  } catch (error) {
    errors.push({ field, message: error instanceof Error ? error.message : "Məbləğ yanlışdır" });
    return "0.00";
  }
}

function safeRate(value: unknown, field: string, errors: FieldError[], max = 1000): string {
  try {
    const parsed = rate(value, field);
    if (compare(parsed, String(max)) > 0) {
      errors.push({ field, message: `0–${max} aralığında olmalıdır` });
    }
    return parsed;
  } catch (error) {
    errors.push({ field, message: error instanceof Error ? error.message : "Faiz yanlışdır" });
    return "0.0000";
  }
}

export function validateProduct(input: unknown): ValidationResult<NormalizedProduct> {
  const errors: FieldError[] = [];
  const source = (input ?? {}) as Record<string, unknown>;
  const name = text(source.product_name);
  if (!name) errors.push({ field: "product_name", message: "Məhsul adı məcburidir" });

  const creditType = text(source.credit_type || "LOAN");
  if (creditType !== "LOAN" && creditType !== "LINE") {
    errors.push({ field: "credit_type", message: "Kredit tipi LOAN və ya LINE olmalıdır" });
  }

  const control = source.control_enabled === true || source.control_enabled === "true";
  const maxTerm = integer(source.max_term, "max_term", errors);
  let productCode: number | null = null;
  if (text(source.product_code)) {
    if (!/^\d+$/.test(text(source.product_code))) {
      errors.push({ field: "product_code", message: "Məhsul kodu rəqəm olmalıdır" });
    } else productCode = Number(text(source.product_code));
  }

  const creditConditions: CreditCondition[] = asArray(source.credit_conditions).map((item, index) => {
    const row = (item ?? {}) as Record<string, unknown>;
    const field = `credit_conditions.${index}`;
    const condition: CreditCondition = {
      currency: text(row.currency) || "AZN",
      amount_min: safeMoney(row.amount_min, `${field}.amount_min`, errors),
      amount_max: safeMoney(row.amount_max, `${field}.amount_max`, errors),
      term_min_days: integer(row.term_min_days, `${field}.term_min_days`, errors),
      term_max_days: integer(row.term_max_days, `${field}.term_max_days`, errors),
      annual_interest_rate_min: safeRate(row.annual_interest_rate_min, `${field}.annual_interest_rate_min`, errors),
      annual_interest_rate_max: safeRate(row.annual_interest_rate_max, `${field}.annual_interest_rate_max`, errors),
    };
    if (compare(condition.amount_min, condition.amount_max) > 0) {
      errors.push({ field: `${field}.amount_min`, message: "Minimum məbləğ maksimumdan böyük ola bilməz" });
    }
    if (condition.term_min_days > condition.term_max_days) {
      errors.push({ field: `${field}.term_min_days`, message: "Minimum müddət maksimumdan böyük ola bilməz" });
    }
    if (compare(condition.annual_interest_rate_min, condition.annual_interest_rate_max) > 0) {
      errors.push({ field: `${field}.annual_interest_rate_min`, message: "Minimum faiz maksimumdan böyük ola bilməz" });
    }
    if (maxTerm > 0 && condition.term_max_days > maxTerm) {
      errors.push({ field: `${field}.term_max_days`, message: "Müddət məhsulun maksimum müddətini keçə bilməz" });
    }
    return condition;
  });

  const dtiConditions: DtiCondition[] = asArray(source.dti_conditions).map((item, index) => {
    const row = (item ?? {}) as Record<string, unknown>;
    const field = `dti_conditions.${index}`;
    const condition: DtiCondition = {
      dti_rate: safeRate(row.dti_rate, `${field}.dti_rate`, errors, 100),
      salary_min: safeMoney(row.salary_min, `${field}.salary_min`, errors),
      salary_max: safeMoney(row.salary_max, `${field}.salary_max`, errors),
    };
    if (compare(condition.salary_min, condition.salary_max) > 0) {
      errors.push({ field: `${field}.salary_min`, message: "Minimum maaş maksimumdan böyük ola bilməz" });
    }
    return condition;
  });

  const seenLtv = new Set<string>();
  const ltvConditions: LtvCondition[] = asArray(source.ltv_conditions).map((item, index) => {
    const row = (item ?? {}) as Record<string, unknown>;
    const field = `ltv_conditions.${index}`;
    const condition: LtvCondition = {
      collateral_type: text(row.collateral_type),
      ltv_rate: safeRate(row.ltv_rate, `${field}.ltv_rate`, errors, 100),
      credit_currency: text(row.credit_currency),
      collateral_currency: text(row.collateral_currency),
    };
    if (!condition.collateral_type) errors.push({ field: `${field}.collateral_type`, message: "Girov növü məcburidir" });
    if (!condition.credit_currency) errors.push({ field: `${field}.credit_currency`, message: "Kredit valyutası məcburidir" });
    if (!condition.collateral_currency) {
      errors.push({ field: `${field}.collateral_currency`, message: "Təminat valyutası məcburidir" });
    }
    const key = `${condition.collateral_type}|${condition.credit_currency}|${condition.collateral_currency}`;
    if (condition.collateral_type && seenLtv.has(key)) {
      errors.push({ field, message: "Eyni girov və valyuta cütü təkrarlanır" });
    }
    seenLtv.add(key);
    return condition;
  });

  if (control && creditConditions.length === 0) {
    errors.push({ field: "credit_conditions", message: "Kontrol aktivdirsə məhsul şərti məcburidir" });
  }

  if (errors.length) return fail(errors);

  return ok({
    product_code: productCode,
    product_name: name,
    credit_type: creditType as "LOAN" | "LINE",
    control_enabled: control,
    max_term: maxTerm,
    note: text(source.note),
    credit_conditions: creditConditions,
    dti_conditions: dtiConditions,
    ltv_conditions: ltvConditions,
  });
}
