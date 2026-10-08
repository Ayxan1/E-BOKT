import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { validateProduct } from "@ebokt/domain";
import { AuditService } from "../common/audit";
import { decimal } from "../common/dates";
import { listed, pageOf } from "../common/page";
import { PrismaService } from "../prisma/prisma.service";

const include = { conditions: true, dtiRules: true, ltvRules: true } satisfies Prisma.CreditProductInclude;
type ProductRow = Prisma.CreditProductGetPayload<{ include: typeof include }>;

function present(product: ProductRow) {
  return {
    id: product.id,
    product_code: product.productCode,
    product_name: product.productName,
    credit_type: product.creditType,
    control_enabled: product.controlEnabled,
    max_term: product.maxTerm,
    note: product.note,
    credit_conditions: product.conditions.map((item) => ({
      currency: item.currency,
      amount_min: decimal(item.amountMin, 2),
      amount_max: decimal(item.amountMax, 2),
      term_min_days: item.termMinDays,
      term_max_days: item.termMaxDays,
      annual_interest_rate_min: decimal(item.annualInterestRateMin, 4),
      annual_interest_rate_max: decimal(item.annualInterestRateMax, 4),
    })),
    dti_conditions: product.dtiRules.map((item) => ({
      dti_rate: decimal(item.dtiRate, 4),
      salary_min: decimal(item.salaryMin, 2),
      salary_max: decimal(item.salaryMax, 2),
    })),
    ltv_conditions: product.ltvRules.map((item) => ({
      collateral_type: item.collateralType,
      ltv_rate: decimal(item.ltvRate, 4),
      credit_currency: item.creditCurrency,
      collateral_currency: item.collateralCurrency,
    })),
  };
}

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(query: { search?: string; page?: string; pageSize?: string }) {
    const page = pageOf(query);
    const where: Prisma.CreditProductWhereInput = query.search
      ? {
          OR: [
            { productName: { contains: query.search, mode: "insensitive" } },
            { productCode: Number(query.search) || undefined },
          ],
        }
      : {};
    if (query.search && !Number(query.search)) {
      where.OR = [{ productName: { contains: query.search, mode: "insensitive" } }];
    }
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.creditProduct.findMany({ where, include, orderBy: { productCode: "asc" }, skip: page.skip, take: page.pageSize }),
      this.prisma.creditProduct.count({ where }),
    ]);
    return listed(rows.map(present), total, page.page, page.pageSize);
  }

  async get(id: number) {
    const product = await this.prisma.creditProduct.findUnique({ where: { id }, include });
    if (!product) throw new NotFoundException("Məhsul tapılmadı");
    return { data: present(product) };
  }

  async create(body: unknown, userId: number) {
    const value = this.parse(body);
    try {
      const product = await this.prisma.$transaction(async (tx) => {
        const productCode = value.product_code ?? (await this.nextCode(tx));
        const created = await tx.creditProduct.create({
          data: {
            productCode,
            productName: value.product_name,
            creditType: value.credit_type,
            controlEnabled: value.control_enabled,
            maxTerm: value.max_term,
            note: value.note,
            conditions: { create: value.credit_conditions.map(this.conditionData) },
            dtiRules: { create: value.dti_conditions.map(this.dtiData) },
            ltvRules: { create: value.ltv_conditions.map(this.ltvData) },
          },
          include,
        });
        return created;
      });
      await this.audit.write("product", product.id, "create", userId, present(product));
      return { data: present(product) };
    } catch (error) {
      this.rethrowUnique(error);
      throw error;
    }
  }

  async update(id: number, body: unknown, userId: number) {
    const current = await this.prisma.creditProduct.findUnique({ where: { id } });
    if (!current) throw new NotFoundException("Məhsul tapılmadı");
    const value = this.parse(body);
    try {
      const product = await this.prisma.$transaction(async (tx) => {
        await tx.creditCondition.deleteMany({ where: { productId: id } });
        await tx.dtiCondition.deleteMany({ where: { productId: id } });
        await tx.ltvCondition.deleteMany({ where: { productId: id } });
        return tx.creditProduct.update({
          where: { id },
          data: {
            productCode: value.product_code ?? current.productCode,
            productName: value.product_name,
            creditType: value.credit_type,
            controlEnabled: value.control_enabled,
            maxTerm: value.max_term,
            note: value.note,
            conditions: { create: value.credit_conditions.map(this.conditionData) },
            dtiRules: { create: value.dti_conditions.map(this.dtiData) },
            ltvRules: { create: value.ltv_conditions.map(this.ltvData) },
          },
          include,
        });
      });
      await this.audit.write("product", id, "update", userId, present(product));
      return { data: present(product) };
    } catch (error) {
      this.rethrowUnique(error);
      throw error;
    }
  }

  async remove(id: number, userId: number) {
    await this.get(id);
    await this.prisma.creditProduct.delete({ where: { id } });
    await this.audit.write("product", id, "delete", userId, {});
    return { data: { deleted: true } };
  }

  private parse(body: unknown) {
    const result = validateProduct(body);
    if (!result.ok) throw new BadRequestException({ message: result.errors[0].message, errors: result.errors });
    return result.value;
  }

  private conditionData(item: ReturnType<ProductsService["parse"]>["credit_conditions"][number]) {
    return {
      currency: item.currency,
      amountMin: item.amount_min,
      amountMax: item.amount_max,
      termMinDays: item.term_min_days,
      termMaxDays: item.term_max_days,
      annualInterestRateMin: item.annual_interest_rate_min,
      annualInterestRateMax: item.annual_interest_rate_max,
    };
  }

  private dtiData(item: ReturnType<ProductsService["parse"]>["dti_conditions"][number]) {
    return { dtiRate: item.dti_rate, salaryMin: item.salary_min, salaryMax: item.salary_max };
  }

  private ltvData(item: ReturnType<ProductsService["parse"]>["ltv_conditions"][number]) {
    return {
      collateralType: item.collateral_type,
      ltvRate: item.ltv_rate,
      creditCurrency: item.credit_currency,
      collateralCurrency: item.collateral_currency,
    };
  }

  private async nextCode(tx: Prisma.TransactionClient) {
    const name = "product_code";
    const existing = await tx.sequence.findUnique({ where: { name } });
    if (!existing) {
      const created = await tx.sequence.create({ data: { name, value: 10001 } });
      return created.value;
    }
    const updated = await tx.sequence.update({ where: { name }, data: { value: { increment: 1 } } });
    return updated.value;
  }

  private rethrowUnique(error: unknown): void {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ConflictException("Bu məhsul kodu artıq mövcuddur");
    }
  }
}
