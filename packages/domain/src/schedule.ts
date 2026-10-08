import { Decimal, parseDecimal } from "./money";

export type ScheduleInstallment = {
  month_no: number;
  due_date: string;
  principal: string;
  interest: string;
  total: string;
  balance: string;
};

export type ScheduleResult = {
  monthly_payment: string;
  maturity_date: string;
  installments: ScheduleInstallment[];
};

export function addMonths(isoDate: string, months: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const cursor = new Date(Date.UTC(year, month - 1 + months, 1));
  const last = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0)).getUTCDate();
  const date = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), Math.min(day, last)));
  return date.toISOString().slice(0, 10);
}

export function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

export function annuitySchedule(input: {
  amount: string;
  annual_rate: string;
  term_months: number;
  grace_months?: number;
  disbursement_date: string;
  first_payment_date?: string | null;
  term_days?: number;
}): ScheduleResult {
  const principal = parseDecimal(input.amount, "məbləğ");
  const annual = parseDecimal(input.annual_rate, "illik faiz");
  const months = input.term_months;
  const grace = input.grace_months ?? 0;
  if (!principal.gt(0)) throw new Error("Məbləğ sıfırdan böyük olmalıdır");
  if (!Number.isInteger(months) || months < 1) throw new Error("Müddət (ay) ən azı 1 olmalıdır");
  if (!Number.isInteger(grace) || grace < 0 || grace >= months) {
    throw new Error("Güzəşt müddəti kredit müddətindən kiçik olmalıdır");
  }

  const monthlyRate = annual.div(100).div(12);
  const payingMonths = months - grace;
  const payment = monthlyRate.isZero()
    ? principal.div(payingMonths).toDecimalPlaces(2)
    : principal
        .mul(monthlyRate)
        .mul(monthlyRate.plus(1).pow(payingMonths))
        .div(monthlyRate.plus(1).pow(payingMonths).minus(1))
        .toDecimalPlaces(2);

  const first = input.first_payment_date || addMonths(input.disbursement_date, 1);
  let balance = principal;
  const installments: ScheduleInstallment[] = [];

  for (let index = 0; index < months; index += 1) {
    const interest = balance.mul(monthlyRate).toDecimalPlaces(2);
    const inGrace = index < grace;
    const last = index === months - 1;
    let principalPart: Decimal;
    let total: Decimal;
    if (inGrace) {
      principalPart = new Decimal(0);
      total = interest;
    } else if (last) {
      principalPart = balance;
      total = principalPart.plus(interest);
    } else {
      principalPart = Decimal.min(Decimal.max(payment.minus(interest), 0), balance);
      total = principalPart.plus(interest);
    }
    balance = balance.minus(principalPart);
    installments.push({
      month_no: index + 1,
      due_date: addMonths(first, index),
      principal: principalPart.toFixed(2),
      interest: interest.toFixed(2),
      total: total.toFixed(2),
      balance: balance.toFixed(2),
    });
  }

  const lastDue = installments[installments.length - 1]?.due_date ?? addMonths(input.disbursement_date, months);
  return {
    monthly_payment: payment.toFixed(2),
    maturity_date: addDays(lastDue, input.term_days ?? 0),
    installments,
  };
}
