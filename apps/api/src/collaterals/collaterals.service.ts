import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { COLLATERAL_TYPES, Decimal, isIsoDate, money, normalizePreciousItem, text } from "@ebokt/domain";
import { AuditService } from "../common/audit";
import { decimal, fromDate, toDate } from "../common/dates";
import { listed, pageOf } from "../common/page";
import { PrismaService } from "../prisma/prisma.service";

const include = {
  items: { orderBy: { id: "asc" as const } },
  loans: { include: { loan: { include: { customer: true } } } },
} satisfies Prisma.CollateralInclude;

type Row = Prisma.CollateralGetPayload<{ include: typeof include }>;

function present(row: Row) {
  return {
    id: row.id,
    unique_no: row.uniqueNo,
    type: row.type,
    owner_name: row.ownerName,
    appraiser: row.appraiser,
    appraisal_date: fromDate(row.appraisalDate),
    market_value: decimal(row.marketValue, 2),
    liquidation_value: decimal(row.liquidationValue, 2),
    currency: row.currency,
    note: row.note,
    items: row.items.map((item) => ({
      id: item.id,
      name: item.name,
      unit_code: item.unitCode,
      fineness: item.fineness,
      quantity: item.quantity,
      unit_price: decimal(item.unitPrice, 2),
      stone_weight: decimal(item.stoneWeight, 3),
      net_weight: decimal(item.netWeight, 3),
      gross_weight: decimal(item.grossWeight, 3),
      liquidation_value: decimal(item.liquidationValue, 2),
    })),
    loans: row.loans.map((link) => ({
      id: link.id,
      loan_id: link.loanId,
      loan_no: link.loan.loanNo,
      contract_no: link.loan.contractNo,
      customer_name: link.loan.customer.fullName,
      amount: decimal(link.amount, 2),
      currency: link.loan.currency,
      disbursement_date: fromDate(link.loan.disbursementDate),
    })),
  };
}

function readHeader(body: unknown) {
  const source = (body ?? {}) as Record<string, unknown>;
  const errors: { field: string; message: string }[] = [];
  const uniqueNo = text(source.unique_no);
  const ownerName = text(source.owner_name);
  const appraiser = text(source.appraiser);
  const appraisalDate = text(source.appraisal_date);
  const type = text(source.type).toUpperCase();
  const currency = text(source.currency || "AZN").toUpperCase();
  if (!uniqueNo) errors.push({ field: "unique_no", message: "Təminat unikal № məcburidir" });
  if (!ownerName) errors.push({ field: "owner_name", message: "Təminat sahibi məcburidir" });
  if (!appraiser) errors.push({ field: "appraiser", message: "Qiymətləndirən məcburidir" });
  if (!isIsoDate(appraisalDate)) errors.push({ field: "appraisal_date", message: "Qiymətləndirmə vaxtı məcburidir" });
  if (!COLLATERAL_TYPES.includes(type as (typeof COLLATERAL_TYPES)[number])) {
    errors.push({ field: "type", message: "Təminat növü səhvdir" });
  }
  if (!currency) errors.push({ field: "currency", message: "Valyuta məcburidir" });
  let market = "0.00";
  let liquidation = "0.00";
  try {
    market = money(source.market_value, "bazar qiyməti");
    liquidation = money(source.liquidation_value, "likvid dəyəri");
  } catch (error) {
    errors.push({ field: "market_value", message: error instanceof Error ? error.message : "Qiymət səhvdir" });
  }
  if (errors.length) throw new BadRequestException({ message: errors[0].message, errors });
  return {
    uniqueNo,
    type,
    ownerName,
    appraiser,
    appraisalDate: toDate(appraisalDate)!,
    marketValue: market,
    liquidationValue: liquidation,
    currency,
    note: text(source.note),
  };
}

@Injectable()
export class CollateralsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(query: { search?: string; page?: string; pageSize?: string; type?: string }) {
    const page = pageOf(query);
    const search = text(query.search);
    const type = text(query.type).toUpperCase();
    const where: Prisma.CollateralWhereInput = {
      ...(type ? { type } : {}),
      ...(search
        ? {
            OR: [
              { uniqueNo: { contains: search, mode: "insensitive" } },
              { ownerName: { contains: search, mode: "insensitive" } },
              { appraiser: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.collateral.findMany({ where, include, orderBy: { id: "desc" }, skip: page.skip, take: page.pageSize }),
      this.prisma.collateral.count({ where }),
    ]);
    return listed(rows.map(present), total, page.page, page.pageSize);
  }

  async get(id: number) {
    return { data: present(await this.one(id)) };
  }

  async create(body: unknown, userId: number) {
    const data = readHeader(body);
    try {
      const created = await this.prisma.collateral.create({ data, include });
      await this.audit.write("collateral", created.id, "create", userId, { unique_no: created.uniqueNo });
      return { data: present(created) };
    } catch (error) {
      this.rethrow(error);
    }
  }

  async update(id: number, body: unknown, userId: number) {
    await this.one(id);
    const data = readHeader(body);
    try {
      const updated = await this.prisma.collateral.update({ where: { id }, data, include });
      await this.audit.write("collateral", id, "update", userId, { unique_no: updated.uniqueNo });
      return { data: present(updated) };
    } catch (error) {
      this.rethrow(error);
    }
  }

  async remove(id: number, userId: number) {
    const existing = await this.one(id);
    const posted = existing.loans.some((link) => link.loan.status === "POSTED");
    if (posted) throw new BadRequestException("Təsdiqlənmiş kreditə bağlı təminat silinə bilməz");
    await this.prisma.collateral.delete({ where: { id } });
    await this.audit.write("collateral", id, "delete", userId, { unique_no: existing.uniqueNo });
    return { data: { id } };
  }

  async addItem(id: number, body: unknown, userId: number) {
    const collateral = await this.one(id);
    if (collateral.type !== "PRECIOUS") throw new BadRequestException("Əşya sətri yalnız qiymətli əşya təminatına əlavə olunur");
    const parsed = normalizePreciousItem(body);
    if (!parsed.ok) throw new BadRequestException({ message: parsed.errors[0].message, errors: parsed.errors });
    await this.prisma.collateralItem.create({
      data: {
        collateralId: id,
        name: parsed.value.name,
        unitCode: parsed.value.unit_code,
        fineness: parsed.value.fineness,
        quantity: parsed.value.quantity,
        unitPrice: parsed.value.unit_price,
        stoneWeight: parsed.value.stone_weight,
        netWeight: parsed.value.net_weight,
        grossWeight: parsed.value.gross_weight,
        liquidationValue: parsed.value.liquidation_value,
      },
    });
    await this.refresh(id);
    await this.audit.write("collateral", id, "item", userId, { name: parsed.value.name });
    return this.get(id);
  }

  async removeItem(id: number, itemId: number, userId: number) {
    const item = await this.prisma.collateralItem.findFirst({ where: { id: itemId, collateralId: id } });
    if (!item) throw new NotFoundException("Əşya tapılmadı");
    await this.prisma.collateralItem.delete({ where: { id: itemId } });
    await this.refresh(id);
    await this.audit.write("collateral", id, "item-delete", userId, { item_id: itemId });
    return this.get(id);
  }

  private async refresh(id: number) {
    const items = await this.prisma.collateralItem.findMany({ where: { collateralId: id } });
    if (!items.length) return;
    const sum = items.reduce((total, item) => total.plus(item.liquidationValue.toString()), new Decimal(0));
    await this.prisma.collateral.update({ where: { id }, data: { liquidationValue: sum.toFixed(2) } });
  }

  private async one(id: number) {
    const row = await this.prisma.collateral.findUnique({ where: { id }, include });
    if (!row) throw new NotFoundException("Təminat tapılmadı");
    return row;
  }

  private rethrow(error: unknown): never {
    const code = (error as { code?: string }).code;
    if (code === "P2002") throw new ConflictException("Bu təminat unikal nömrəsi artıq var");
    throw error;
  }
}
