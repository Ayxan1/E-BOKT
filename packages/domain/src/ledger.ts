import { Decimal, parseDecimal } from "./money";
import type { FieldError } from "./result";

export type PostingInput = {
  account_code: string;
  direction: "DEBIT" | "CREDIT";
  amount: string;
  currency: string;
};

export function assertBalanced(postings: PostingInput[]): FieldError[] {
  const errors: FieldError[] = [];
  if (postings.length < 2) {
    errors.push({ field: "postings", message: "Ən azı iki yazılış olmalıdır" });
    return errors;
  }

  const totals = new Map<string, { debit: Decimal; credit: Decimal }>();

  postings.forEach((posting, index) => {
    const field = `postings.${index}`;
    if (posting.direction !== "DEBIT" && posting.direction !== "CREDIT") {
      errors.push({ field: `${field}.direction`, message: "İstiqamət DEBIT və ya CREDIT olmalıdır" });
    }
    if (!posting.currency) {
      errors.push({ field: `${field}.currency`, message: "Valyuta məcburidir" });
    }
    let amount: Decimal;
    try {
      amount = parseDecimal(posting.amount, "məbləğ");
    } catch {
      errors.push({ field: `${field}.amount`, message: "Məbləğ rəqəm olmalıdır" });
      return;
    }
    if (amount.lte(0)) {
      errors.push({ field: `${field}.amount`, message: "Məbləğ sıfırdan böyük olmalıdır" });
      return;
    }
    const bucket = totals.get(posting.currency) ?? {
      debit: new Decimal(0),
      credit: new Decimal(0),
    };
    if (posting.direction === "DEBIT") bucket.debit = bucket.debit.plus(amount);
    if (posting.direction === "CREDIT") bucket.credit = bucket.credit.plus(amount);
    totals.set(posting.currency, bucket);
  });

  for (const [currency, bucket] of totals) {
    if (!bucket.debit.equals(bucket.credit)) {
      errors.push({
        field: "postings",
        message: `${currency} üzrə debet (${bucket.debit.toFixed(2)}) və kredit (${bucket.credit.toFixed(2)}) bərabər deyil`,
      });
    }
  }

  return errors;
}
