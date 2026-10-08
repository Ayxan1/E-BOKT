import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import {
  Decimal,
  MoneyError,
  addDays,
  addMonths,
  annuitySchedule,
  isIsoDate,
  money,
  parseDecimal,
  rate,
  text,
} from "@ebokt/domain";
import { AuditService } from "../common/audit";
import { decimal, fromDate, toDate } from "../common/dates";
import { listed, pageOf } from "../common/page";
import { EodService } from "../eod/eod.service";
import { LedgerService } from "../ledger/ledger.service";
import { PrismaService } from "../prisma/prisma.service";

const loanInclude = {
  customer: true,
  branch: true,
  product: true,
  representative: true,
  installments: { orderBy: { monthNo: "asc" as const } },
  collaterals: { include: { collateral: true } },
} satisfies Prisma.LoanInclude;

type LoanRow = Prisma.LoanGetPayload<{ include: typeof loanInclude }>;

type Draft = {
  customerId: number;
  branchId: number;
  amount: string;
  currency: string;
  representativeId: number | null;
  annualRate: string;
  penaltyRate: string;
  graceMonths: number;
  productId: number;
  commission: string;
  disbursementDate: string;
  termMonths: number;
  termDays: number;
  scheduleType: string;
  standardCode: string;
  firstPaymentDate: string | null;
  purpose: string;
};

function present(row: LoanRow) {
  return {
    id: row.id,
    operation_code: row.operationCode,
    contract_no: row.contractNo,
    loan_no: row.loanNo,
    customer_id: row.customerId,
    customer_no: row.customer.customerNo,
    customer_name: row.customer.fullName,
    branch_id: row.branchId,
    branch_name: row.branch.name,
    amount: decimal(row.amount, 2),
    currency: row.currency,
    representative_id: row.representativeId,
    representative_name: row.representative?.fullName ?? "",
    annual_interest_rate: decimal(row.annualRate, 2),
    penalty_rate: decimal(row.penaltyRate, 2),
    grace_months: row.graceMonths,
    product_id: row.productId,
    product_name: row.product.productName,
    commission: decimal(row.commission, 2),
    disbursement_date: fromDate(row.disbursementDate),
    term_months: row.termMonths,
    term_days: row.termDays,
    schedule_type: row.scheduleType,
    standard_code: row.standardCode,
    monthly_payment: decimal(row.monthlyPayment, 2),
    maturity_date: fromDate(row.maturityDate),
    first_payment_date: fromDate(row.firstPaymentDate),
    purpose: row.purpose,
    status: row.status,
    installments: row.installments.map((item) => ({
      month_no: item.monthNo,
      due_date: fromDate(item.dueDate),
      principal: decimal(item.principal, 2),
      interest: decimal(item.interest, 2),
      total: decimal(item.total, 2),
      balance: decimal(item.balance, 2),
    })),
    collaterals: row.collaterals.map((link) => ({
      id: link.id,
      collateral_id: link.collateralId,
      unique_no: link.collateral.uniqueNo,
      type: link.collateral.type,
      owner_name: link.collateral.ownerName,
      amount: decimal(link.amount, 2),
      currency: link.collateral.currency,
      liquidation_value: decimal(link.collateral.liquidationValue, 2),
    })),
  };
}

function readLoan(body: unknown): Draft {
  const source = (body ?? {}) as Record<string, unknown>;
  const errors: { field: string; message: string }[] = [];
  const customerId = Number(source.customer_id);
  const branchId = Number(source.branch_id);
  const productId = Number(source.product_id);
  if (!Number.isInteger(customerId) || customerId <= 0) errors.push({ field: "customer_id", message: "Müştəri seçilməlidir" });
  if (!Number.isInteger(branchId) || branchId <= 0) errors.push({ field: "branch_id", message: "Filial seçilməlidir" });
  if (!Number.isInteger(productId) || productId <= 0) errors.push({ field: "product_id", message: "Məhsul seçilməlidir" });

  let amount = "0.00";
  let annualRate = "0.0000";
  let penaltyRate = "0.0000";
  let commission = "0.00";
  try {
    amount = money(source.amount, "məbləğ");
    annualRate = rate(source.annual_interest_rate, "illik faiz");
    penaltyRate = rate(source.penalty_rate, "cərimə faiz");
    commission = money(source.commission, "komissiya");
  } catch (error) {
    errors.push({ field: "amount", message: error instanceof Error ? error.message : "Məbləğ səhvdir" });
  }
  if (parseDecimal(amount, "məbləğ").lte(0)) errors.push({ field: "amount", message: "Məbləğ sıfırdan böyük olmalıdır" });

  const currency = text(source.currency).toUpperCase();
  if (!currency) errors.push({ field: "currency", message: "Valyuta məcburidir" });
  const disbursementDate = text(source.disbursement_date);
  if (!isIsoDate(disbursementDate)) errors.push({ field: "disbursement_date", message: "Verilmə tarixi məcburidir" });
  const firstRaw = text(source.first_payment_date);
  if (firstRaw && !isIsoDate(firstRaw)) errors.push({ field: "first_payment_date", message: "İlk ödəmə tarixi səhvdir" });

  const termMonths = Number(source.term_months);
  const termDays = Number(source.term_days ?? 0);
  const graceMonths = Number(source.grace_months ?? 0);
  if (!Number.isInteger(termMonths) || termMonths < 1) errors.push({ field: "term_months", message: "Müddət (ay) ən azı 1 olmalıdır" });
  if (!Number.isInteger(termDays) || termDays < 0) errors.push({ field: "term_days", message: "Müddət (gün) mənfi ola bilməz" });
  if (!Number.isInteger(graceMonths) || graceMonths < 0 || (Number.isInteger(termMonths) && graceMonths >= termMonths)) {
    errors.push({ field: "grace_months", message: "Güzəşt müddəti kredit müddətindən kiçik olmalıdır" });
  }

  const scheduleType = text(source.schedule_type || "ANNUITY").toUpperCase();
  if (scheduleType !== "ANNUITY") errors.push({ field: "schedule_type", message: "Qrafik tipi Annuitet olmalıdır" });

  const representative = text(source.representative_id);
  const representativeId = representative ? Number(representative) : null;
  if (representative && (!Number.isInteger(representativeId) || (representativeId ?? 0) <= 0)) {
    errors.push({ field: "representative_id", message: "Təmsilçi seçilməlidir" });
  }

  if (errors.length) throw new BadRequestException({ message: errors[0].message, errors });
  return {
    customerId,
    branchId,
    amount,
    currency,
    representativeId,
    annualRate,
    penaltyRate,
    graceMonths,
    productId,
    commission,
    disbursementDate,
    termMonths,
    termDays,
    scheduleType,
    standardCode: text(source.standard_code || "STANDARD").toUpperCase() || "STANDARD",
    firstPaymentDate: firstRaw || null,
    purpose: text(source.purpose),
  };
}

@Injectable()
export class LoansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly ledger: LedgerService,
    private readonly eod: EodService,
  ) {}

  async preview() {
    const row = await this.prisma.sequence.findUnique({ where: { name: "loan_operation" } });
    const next = (row?.value ?? 0) + 1;
    return { data: { operation_code: next, contract_no: `CONTRACT_${next}`, loan_no: `LOAN_${next}` } };
  }

  async list(query: { search?: string; page?: string; pageSize?: string }) {
    const page = pageOf(query);
    const search = text(query.search);
    const where: Prisma.LoanWhereInput = search
      ? {
          OR: [
            { loanNo: { contains: search, mode: "insensitive" } },
            { contractNo: { contains: search, mode: "insensitive" } },
            { purpose: { contains: search, mode: "insensitive" } },
            { customer: { fullName: { contains: search, mode: "insensitive" } } },
            { customer: { customerNo: { contains: search, mode: "insensitive" } } },
          ],
        }
      : {};
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.loan.findMany({ where, include: loanInclude, orderBy: { id: "desc" }, skip: page.skip, take: page.pageSize }),
      this.prisma.loan.count({ where }),
    ]);
    return listed(rows.map(present), total, page.page, page.pageSize);
  }

  async get(id: number) {
    return { data: present(await this.one(id)) };
  }

  async create(body: unknown, userId: number) {
    const draft = readLoan(body);
    await this.assertProduct(draft);
    const maturity = addDays(addMonths(draft.disbursementDate, draft.termMonths), draft.termDays);
    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const operationCode = await this.nextNumber(tx);
        return tx.loan.create({
          data: this.data(draft, operationCode, maturity, userId),
          include: loanInclude,
        });
      });
      await this.audit.write("loan", created.id, "create", userId, { loan_no: created.loanNo });
      return { data: present(created) };
    } catch (error) {
      this.rethrow(error);
    }
  }

  async update(id: number, body: unknown, userId: number) {
    const existing = await this.one(id);
    if (existing.status !== "WAITING") throw new BadRequestException("Təsdiqlənmiş kredit dəyişdirilə bilməz");
    const draft = readLoan(body);
    await this.assertProduct(draft);
    const maturity = addDays(addMonths(draft.disbursementDate, draft.termMonths), draft.termDays);
    const changed =
      existing.amount.toFixed(2) !== draft.amount ||
      existing.annualRate.toFixed(4) !== draft.annualRate ||
      existing.termMonths !== draft.termMonths ||
      existing.termDays !== draft.termDays ||
      existing.graceMonths !== draft.graceMonths ||
      fromDate(existing.disbursementDate) !== draft.disbursementDate ||
      fromDate(existing.firstPaymentDate) !== draft.firstPaymentDate;
    const updated = await this.prisma.loan.update({
      where: { id },
      data: {
        ...this.data(draft, existing.operationCode, maturity, existing.createdBy),
        monthlyPayment: changed ? "0.00" : undefined,
        installments: changed ? { deleteMany: {} } : undefined,
      },
      include: loanInclude,
    });
    await this.audit.write("loan", id, "update", userId, { loan_no: updated.loanNo });
    return { data: present(updated) };
  }

  async remove(id: number, userId: number) {
    const existing = await this.one(id);
    if (existing.status !== "WAITING") throw new BadRequestException("Təsdiqlənmiş kredit silinə bilməz");
    await this.prisma.loan.delete({ where: { id } });
    await this.audit.write("loan", id, "delete", userId, { loan_no: existing.loanNo });
    return { data: { id } };
  }

  async generateSchedule(id: number, userId: number) {
    const existing = await this.one(id);
    if (existing.status !== "WAITING") throw new BadRequestException("Təsdiqlənmiş kreditin cədvəli dəyişdirilə bilməz");
    let schedule;
    try {
      schedule = annuitySchedule({
        amount: existing.amount.toFixed(2),
        annual_rate: existing.annualRate.toFixed(4),
        term_months: existing.termMonths,
        grace_months: existing.graceMonths,
        disbursement_date: fromDate(existing.disbursementDate) ?? "",
        first_payment_date: fromDate(existing.firstPaymentDate),
        term_days: existing.termDays,
      });
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : "Cədvəl qurulmadı");
    }
    await this.prisma.loan.update({
      where: { id },
      data: {
        monthlyPayment: schedule.monthly_payment,
        maturityDate: toDate(schedule.maturity_date)!,
        installments: {
          deleteMany: {},
          create: schedule.installments.map((row) => ({
            monthNo: row.month_no,
            dueDate: toDate(row.due_date)!,
            principal: row.principal,
            interest: row.interest,
            total: row.total,
            balance: row.balance,
          })),
        },
      },
    });
    await this.audit.write("loan", id, "schedule", userId, { monthly_payment: schedule.monthly_payment });
    return this.get(id);
  }

  async disburse(id: number, userId: number) {
    const existing = await this.one(id);
    if (existing.status !== "WAITING") throw new BadRequestException("Kredit artıq təsdiqlənib");
    if (!existing.installments.length) throw new BadRequestException("Əvvəl ödəmə cədvəli yaradılmalıdır");
    await this.assertCover(existing);
    const businessDate = await this.eod.businessDate();
    const postings = [
      { account_code: "1100", direction: "DEBIT", amount: existing.amount.toFixed(2), currency: existing.currency },
      { account_code: "1000", direction: "CREDIT", amount: existing.amount.toFixed(2), currency: existing.currency },
    ];
    if (parseDecimal(existing.commission.toString(), "komissiya").gt(0)) {
      postings.push(
        { account_code: "1000", direction: "DEBIT", amount: existing.commission.toFixed(2), currency: existing.currency },
        { account_code: "4000", direction: "CREDIT", amount: existing.commission.toFixed(2), currency: existing.currency },
      );
    }
    await this.ledger.post(
      {
        reference: existing.loanNo,
        idempotency_key: `loan:${existing.id}:disburse`,
        business_date: businessDate,
        branch_id: existing.branchId,
        module: "loan",
        postings,
      },
      userId,
    );
    const pledged = existing.collaterals
      .filter((link) => link.collateral.currency === "AZN")
      .reduce((sum, link) => sum.plus(link.amount.toString()), new Decimal(0));
    if (pledged.gt(0)) {
      const amount = pledged.toFixed(2);
      await this.ledger.post(
        {
          reference: `${existing.loanNo}-GIROV`,
          idempotency_key: `loan:${existing.id}:collateral`,
          business_date: businessDate,
          branch_id: existing.branchId,
          module: "collateral",
          postings: [
            { account_code: "9000", direction: "DEBIT", amount, currency: "AZN" },
            { account_code: "9100", direction: "CREDIT", amount, currency: "AZN" },
          ],
        },
        userId,
      );
    }
    await this.prisma.loan.update({ where: { id }, data: { status: "POSTED" } });
    await this.audit.write("loan", id, "post", userId, { loan_no: existing.loanNo });
    return this.get(id);
  }

  async link(loanId: number, body: unknown, userId: number) {
    const source = (body ?? {}) as Record<string, unknown>;
    const loan = await this.prisma.loan.findUnique({
      where: { id: loanId },
      include: { product: { include: { ltvRules: true } } },
    });
    if (!loan) throw new NotFoundException("Kredit tapılmadı");
    const collateralId = Number(source.collateral_id);
    const collateral = await this.prisma.collateral.findUnique({ where: { id: collateralId } });
    if (!collateral) throw new NotFoundException("Təminat tapılmadı");
    let amount: string;
    try {
      amount = money(source.amount, "təminat məbləği");
    } catch (error) {
      throw new BadRequestException(error instanceof MoneyError ? error.message : "Təminat məbləği səhvdir");
    }
    if (parseDecimal(amount, "məbləğ").lte(0)) throw new BadRequestException("Əlaqələndirilən təminat məbləği sıfırdan böyük olmalıdır");
    const liquidation = parseDecimal(collateral.liquidationValue.toString(), "likvid dəyəri");
    if (parseDecimal(amount, "məbləğ").gt(liquidation)) {
      throw new BadRequestException("Əlaqələndirilən məbləğ likvid dəyərdən böyük ola bilməz");
    }
    if (loan.product.controlEnabled && loan.product.ltvRules.length) {
      const rule = loan.product.ltvRules.find(
        (item) =>
          item.collateralType === collateral.type &&
          item.creditCurrency === loan.currency &&
          item.collateralCurrency === collateral.currency,
      );
      if (!rule) throw new BadRequestException("Bu təminat növü və valyutası üçün LTV şərti yoxdur");
    }
    const link = await this.prisma.loanCollateral.upsert({
      where: { loanId_collateralId: { loanId, collateralId } },
      update: { amount },
      create: { loanId, collateralId, amount },
    });
    await this.audit.write("loan", loanId, "link", userId, { collateral_id: collateralId, amount });
    return { data: { id: link.id } };
  }

  async unlink(loanId: number, linkId: number, userId: number) {
    const link = await this.prisma.loanCollateral.findFirst({ where: { id: linkId, loanId } });
    if (!link) throw new NotFoundException("Əlaqə tapılmadı");
    await this.prisma.loanCollateral.delete({ where: { id: link.id } });
    await this.audit.write("loan", loanId, "unlink", userId, { collateral_id: link.collateralId });
    return { data: { id: link.id } };
  }

  private async assertCover(loan: LoanRow) {
    if (!loan.product.controlEnabled) return;
    const rules = await this.prisma.ltvCondition.findMany({ where: { productId: loan.productId } });
    if (!rules.length) return;
    let cover = new Decimal(0);
    for (const link of loan.collaterals) {
      const rule = rules.find(
        (item) =>
          item.collateralType === link.collateral.type &&
          item.creditCurrency === loan.currency &&
          item.collateralCurrency === link.collateral.currency,
      );
      if (!rule) continue;
      const pledged = Decimal.min(parseDecimal(link.amount.toString(), "məbləğ"), parseDecimal(link.collateral.liquidationValue.toString(), "likvid dəyəri"));
      cover = cover.plus(pledged.mul(rule.ltvRate.toString()).div(100));
    }
    if (parseDecimal(loan.amount.toString(), "məbləğ").gt(cover.toDecimalPlaces(2))) {
      throw new BadRequestException("Bağlanmış təminat LTV limitinə görə kredit məbləğini örtmür");
    }
  }

  private async assertProduct(draft: Draft) {
    const product = await this.prisma.creditProduct.findUnique({
      where: { id: draft.productId },
      include: { conditions: true, dtiRules: true },
    });
    if (!product) throw new BadRequestException("Məhsul tapılmadı");
    const customer = await this.prisma.customer.findUnique({
      where: { id: draft.customerId },
      include: { workplaces: true },
    });
    if (!customer) throw new BadRequestException("Müştəri tapılmadı");
    const branch = await this.prisma.branch.findUnique({ where: { id: draft.branchId } });
    if (!branch) throw new BadRequestException("Filial tapılmadı");
    if (draft.representativeId) {
      const user = await this.prisma.user.findUnique({ where: { id: draft.representativeId } });
      if (!user) throw new BadRequestException("Təmsilçi tapılmadı");
    }
    if (!product.controlEnabled) return;

    const errors: { field: string; message: string }[] = [];
    const condition = product.conditions.find((item) => item.currency === draft.currency);
    const days = draft.termMonths * 30 + draft.termDays;
    if (!condition) {
      errors.push({ field: "currency", message: "Bu valyuta üçün kredit şərti yoxdur" });
    } else {
      const amount = parseDecimal(draft.amount, "məbləğ");
      if (amount.lt(condition.amountMin.toString()) || amount.gt(condition.amountMax.toString())) {
        errors.push({ field: "amount", message: "Məbləğ məhsulun həddinə sığmır" });
      }
      if (days < condition.termMinDays || days > condition.termMaxDays || (product.maxTerm > 0 && days > product.maxTerm)) {
        errors.push({ field: "term_months", message: "Müddət məhsulun həddinə sığmır" });
      }
      const annual = parseDecimal(draft.annualRate, "illik faiz");
      if (annual.lt(condition.annualInterestRateMin.toString()) || annual.gt(condition.annualInterestRateMax.toString())) {
        errors.push({ field: "annual_interest_rate", message: "İllik faiz məhsulun həddinə sığmır" });
      }
    }

    const income = customer.workplaces.reduce(
      (sum, workplace) => sum.plus(workplace.monthlyIncome.toString()),
      new Decimal(0),
    );
    if (product.dtiRules.length && income.gt(0)) {
      const payment = parseDecimal(
        annuitySchedule({
          amount: draft.amount,
          annual_rate: draft.annualRate,
          term_months: draft.termMonths,
          grace_months: draft.graceMonths,
          disbursement_date: draft.disbursementDate,
          first_payment_date: draft.firstPaymentDate,
        }).monthly_payment,
        "aylıq ödəniş",
      );
      const ratio = payment.div(income).mul(100);
      const rule = product.dtiRules.find(
        (item) => income.gte(item.salaryMin.toString()) && income.lte(item.salaryMax.toString()),
      );
      if (!rule) errors.push({ field: "customer_id", message: "Müştərinin gəliri DTI intervalına düşmür" });
      else if (ratio.gt(rule.dtiRate.toString())) {
        errors.push({ field: "amount", message: "Aylıq ödəniş DTI limitini keçir" });
      }
    }
    if (errors.length) throw new BadRequestException({ message: errors[0].message, errors });
  }

  private data(draft: Draft, operationCode: number, maturity: string, createdBy: number): Prisma.LoanUncheckedCreateInput {
    return {
      operationCode,
      contractNo: `CONTRACT_${operationCode}`,
      loanNo: `LOAN_${operationCode}`,
      customerId: draft.customerId,
      branchId: draft.branchId,
      amount: draft.amount,
      currency: draft.currency,
      representativeId: draft.representativeId,
      annualRate: draft.annualRate,
      penaltyRate: draft.penaltyRate,
      graceMonths: draft.graceMonths,
      productId: draft.productId,
      commission: draft.commission,
      disbursementDate: toDate(draft.disbursementDate)!,
      termMonths: draft.termMonths,
      termDays: draft.termDays,
      scheduleType: draft.scheduleType,
      standardCode: draft.standardCode,
      maturityDate: toDate(maturity)!,
      firstPaymentDate: toDate(draft.firstPaymentDate),
      purpose: draft.purpose,
      createdBy,
    };
  }

  private async nextNumber(tx: Prisma.TransactionClient) {
    const name = "loan_operation";
    const existing = await tx.sequence.findUnique({ where: { name } });
    if (!existing) {
      const created = await tx.sequence.create({ data: { name, value: 1 } });
      return created.value;
    }
    const updated = await tx.sequence.update({ where: { name }, data: { value: { increment: 1 } } });
    return updated.value;
  }

  private async one(id: number) {
    const row = await this.prisma.loan.findUnique({ where: { id }, include: loanInclude });
    if (!row) throw new NotFoundException("Kredit tapılmadı");
    return row;
  }

  private rethrow(error: unknown): never {
    if (error instanceof BadRequestException || error instanceof NotFoundException) throw error;
    const code = (error as { code?: string }).code;
    if (code === "P2002") throw new ConflictException("Bu müqavilə və ya kredit nömrəsi artıq var");
    throw error;
  }
}
