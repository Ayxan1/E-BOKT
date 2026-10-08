import { Decimal } from "./money";
import { fail, isIsoDate, ok, text, type FieldError, type ValidationResult } from "./result";

export type CustomerDocumentInput = {
  series: string;
  number: string;
  issue_date: string | null;
  issue_place: string;
  expiry_date: string | null;
  citizenship: string;
  birth_date: string | null;
  marital_status: string;
  gender: string;
};

export type WorkplaceInput = {
  workplace_type: "MAIN" | "ADDITIONAL";
  workplace_name: string;
  position: string;
  monthly_income: string;
  work_experience: string;
  note: string;
};

export type PhoneInput = {
  phone_number: string;
  phone_type: "MOBILE" | "HOME" | "WORK";
  is_primary: boolean;
  note: string;
};

export type PartyInput = {
  type: "EXECUTOR" | "FOUNDER" | "SIGNATORY";
  full_name: string;
  share: string | null;
  fin_voen: string;
  note: string;
};

export type NormalizedCustomer = {
  customer_type: 1 | 2 | 3 | 4;
  first_name: string;
  last_name: string;
  father_name: string;
  full_name: string;
  unique_no: string;
  executor_fin: string;
  activity_type: string;
  activity_code: string;
  sector: string;
  residency_status: "RESIDENT" | "NON_RESIDENT";
  registration_address: string;
  actual_address: string;
  note: string;
  document: CustomerDocumentInput | null;
  workplaces: WorkplaceInput[];
  phones: PhoneInput[];
  executors_founders: PartyInput[];
  attributes: Record<string, string>;
};

const PERSON = new Set([1, 3]);
const ACTIVITY = new Set([2, 3]);
const MARITAL = new Set(["", "SINGLE", "MARRIED", "DIVORCED"]);
const GENDER = new Set(["", "MALE", "FEMALE"]);

function push(errors: FieldError[], field: string, message: string) {
  errors.push({ field, message });
}

function optionalDate(value: unknown, field: string, errors: FieldError[]): string | null {
  const raw = text(value);
  if (!raw) return null;
  if (!isIsoDate(raw)) {
    push(errors, field, "Tarix YYYY-MM-DD formatında olmalıdır");
    return null;
  }
  return raw;
}

function fin(value: string): boolean {
  return /^[A-Z0-9]{7}$/.test(value);
}

function voen(value: string): boolean {
  return /^\d{10}$/.test(value);
}

export function validateCustomer(input: unknown): ValidationResult<NormalizedCustomer> {
  const errors: FieldError[] = [];
  const source = (input ?? {}) as Record<string, unknown>;
  const customerType = Number(source.customer_type);

  if (![1, 2, 3, 4].includes(customerType)) {
    push(errors, "customer_type", "Müştəri tipi 1, 2, 3 və ya 4 olmalıdır");
  }

  const residency = text(source.residency_status);
  if (residency !== "RESIDENT" && residency !== "NON_RESIDENT") {
    push(errors, "residency_status", "Rezidentlik RESIDENT və ya NON_RESIDENT olmalıdır");
  }

  const registration = text(source.registration_address);
  const actual = text(source.actual_address);
  if (!registration) push(errors, "registration_address", "Qeydiyyat ünvanı məcburidir");
  if (!actual) push(errors, "actual_address", "Faktiki ünvan məcburidir");

  let first = "";
  let last = "";
  let father = "";
  if (PERSON.has(customerType)) {
    first = text(source.first_name);
    last = text(source.last_name);
    father = text(source.father_name);
    if (!first) push(errors, "first_name", "Ad məcburidir");
    if (!last) push(errors, "last_name", "Soyad məcburidir");
    if (!father) push(errors, "father_name", "Ata adı məcburidir");
  }

  let full = text(source.full_name);
  if (!full && PERSON.has(customerType)) full = [last, first, father].filter(Boolean).join(" ");
  if (!full) push(errors, "full_name", "Tam ad məcburidir");

  const unique = text(source.unique_no).toUpperCase().replace(/\s+/g, "");
  if (!unique) {
    push(errors, "unique_no", customerType === 1 ? "FİN məcburidir" : "FİN və ya VÖEN məcburidir");
  } else if (customerType === 1 && !fin(unique)) {
    push(errors, "unique_no", "FİN 7 simvoldan ibarət olmalıdır");
  } else if ((customerType === 2 || customerType === 4) && !voen(unique)) {
    push(errors, "unique_no", "VÖEN 10 rəqəmdən ibarət olmalıdır");
  } else if (customerType === 3 && !fin(unique) && !voen(unique)) {
    push(errors, "unique_no", "Sahibkar üçün FİN (7) və ya VÖEN (10) daxil edin");
  }

  let activityType = "";
  let activityCode = "";
  let sector = "";
  if (ACTIVITY.has(customerType)) {
    activityType = text(source.activity_type);
    activityCode = text(source.activity_code);
    sector = text(source.sector);
    if (!activityCode) push(errors, "activity_code", "Fəaliyyət kodu məcburidir");
    if (!sector) push(errors, "sector", "Sektor məcburidir");
  }

  const executorFin = customerType === 2 ? text(source.executor_fin).toUpperCase() : "";
  if (executorFin && !fin(executorFin)) {
    push(errors, "executor_fin", "İcraçı FİN-i 7 simvoldan ibarət olmalıdır");
  }

  let document: CustomerDocumentInput | null = null;
  if (PERSON.has(customerType)) {
    const doc = (source.document ?? {}) as Record<string, unknown>;
    const series = text(doc.series);
    const number = text(doc.number);
    if (!series) push(errors, "document.series", "Sənəd seriyası məcburidir");
    if (!number) push(errors, "document.number", "Sənəd nömrəsi məcburidir");
    const marital = text(doc.marital_status);
    const gender = text(doc.gender);
    if (!MARITAL.has(marital)) push(errors, "document.marital_status", "Ailə vəziyyəti yanlışdır");
    if (!GENDER.has(gender)) push(errors, "document.gender", "Cins yanlışdır");
    document = {
      series,
      number,
      issue_date: optionalDate(doc.issue_date, "document.issue_date", errors),
      issue_place: text(doc.issue_place),
      expiry_date: optionalDate(doc.expiry_date, "document.expiry_date", errors),
      citizenship: text(doc.citizenship),
      birth_date: optionalDate(doc.birth_date, "document.birth_date", errors),
      marital_status: marital,
      gender,
    };
  }

  const workplaces: WorkplaceInput[] = [];
  if (PERSON.has(customerType) && Array.isArray(source.workplaces)) {
    let mainCount = 0;
    source.workplaces.forEach((item, index) => {
      const row = (item ?? {}) as Record<string, unknown>;
      const workplaceType = text(row.workplace_type);
      const workplaceName = text(row.workplace_name);
      const field = `workplaces.${index}`;
      if (workplaceType !== "MAIN" && workplaceType !== "ADDITIONAL") {
        push(errors, `${field}.workplace_type`, "İş yeri tipi MAIN və ya ADDITIONAL olmalıdır");
      }
      if (workplaceType === "MAIN") mainCount += 1;
      if (!workplaceName) push(errors, `${field}.workplace_name`, "İş yerinin adı məcburidir");
      let income = "0.00";
      try {
        const parsed = new Decimal(text(row.monthly_income) || "0");
        if (parsed.isNegative()) push(errors, `${field}.monthly_income`, "Aylıq gəlir mənfi ola bilməz");
        else income = parsed.toDecimalPlaces(2).toFixed(2);
      } catch {
        push(errors, `${field}.monthly_income`, "Aylıq gəlir rəqəm olmalıdır");
      }
      workplaces.push({
        workplace_type: workplaceType === "ADDITIONAL" ? "ADDITIONAL" : "MAIN",
        workplace_name: workplaceName,
        position: text(row.position),
        monthly_income: income,
        work_experience: text(row.work_experience),
        note: text(row.note),
      });
    });
    if (mainCount > 1) push(errors, "workplaces", "Yalnız bir əsas iş yeri ola bilər");
  }

  const phones: PhoneInput[] = [];
  if (Array.isArray(source.phones)) {
    let primary = 0;
    source.phones.forEach((item, index) => {
      const row = (item ?? {}) as Record<string, unknown>;
      const phone = text(row.phone_number);
      const phoneType = text(row.phone_type);
      const field = `phones.${index}`;
      if (!phone) push(errors, `${field}.phone_number`, "Telefon nömrəsi məcburidir");
      if (!["MOBILE", "HOME", "WORK"].includes(phoneType)) {
        push(errors, `${field}.phone_type`, "Telefon tipi MOBILE, HOME və ya WORK olmalıdır");
      }
      const isPrimary = row.is_primary === true || row.is_primary === "true";
      if (isPrimary) primary += 1;
      phones.push({
        phone_number: phone,
        phone_type: (["MOBILE", "HOME", "WORK"].includes(phoneType) ? phoneType : "MOBILE") as PhoneInput["phone_type"],
        is_primary: isPrimary,
        note: text(row.note),
      });
    });
    if (phones.length > 0 && primary === 0) push(errors, "phones", "Bir əsas telefon seçilməlidir");
    if (primary > 1) push(errors, "phones", "Yalnız bir əsas telefon ola bilər");
  }

  const parties: PartyInput[] = [];
  if (customerType === 2 && Array.isArray(source.executors_founders)) {
    const shares: Decimal[] = [];
    source.executors_founders.forEach((item, index) => {
      const row = (item ?? {}) as Record<string, unknown>;
      const type = text(row.type);
      const name = text(row.full_name);
      const finVoen = text(row.fin_voen).toUpperCase();
      const field = `executors_founders.${index}`;
      if (!["EXECUTOR", "FOUNDER", "SIGNATORY"].includes(type)) {
        push(errors, `${field}.type`, "Tip EXECUTOR, FOUNDER və ya SIGNATORY olmalıdır");
      }
      if (!name) push(errors, `${field}.full_name`, "Ad məcburidir");
      if (!finVoen) push(errors, `${field}.fin_voen`, "FİN və ya VÖEN məcburidir");
      else if (!fin(finVoen) && !voen(finVoen)) {
        push(errors, `${field}.fin_voen`, "FİN (7) və ya VÖEN (10) daxil edin");
      }
      let share: string | null = null;
      if (type === "FOUNDER") {
        try {
          const parsed = new Decimal(text(row.share) || "0");
          if (parsed.isNegative() || parsed.gt(100)) {
            push(errors, `${field}.share`, "Pay 0 ilə 100 arasında olmalıdır");
          } else {
            share = parsed.toDecimalPlaces(2).toFixed(2);
            shares.push(new Decimal(share));
          }
        } catch {
          push(errors, `${field}.share`, "Pay rəqəm olmalıdır");
        }
      }
      parties.push({
        type: (["EXECUTOR", "FOUNDER", "SIGNATORY"].includes(type) ? type : "EXECUTOR") as PartyInput["type"],
        full_name: name,
        share,
        fin_voen: finVoen,
        note: text(row.note),
      });
    });
    if (shares.length > 0) {
      const sum = shares.reduce((acc, item) => acc.plus(item), new Decimal(0));
      if (!sum.equals(new Decimal(100))) {
        push(errors, "executors_founders", "Təsisçi paylarının cəmi 100% olmalıdır");
      }
    }
  }

  const attributes: Record<string, string> = {};
  if (source.attributes && typeof source.attributes === "object" && !Array.isArray(source.attributes)) {
    for (const [key, value] of Object.entries(source.attributes as Record<string, unknown>)) {
      attributes[key] = text(value);
    }
  }

  if (errors.length) return fail(errors);

  return ok({
    customer_type: customerType as 1 | 2 | 3 | 4,
    first_name: first,
    last_name: last,
    father_name: father,
    full_name: full,
    unique_no: unique,
    executor_fin: executorFin,
    activity_type: activityType,
    activity_code: activityCode,
    sector,
    residency_status: residency as "RESIDENT" | "NON_RESIDENT",
    registration_address: registration,
    actual_address: actual,
    note: text(source.note),
    document,
    workplaces,
    phones,
    executors_founders: parties,
    attributes,
  });
}
