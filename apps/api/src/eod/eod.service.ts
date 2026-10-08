import { BadRequestException, Injectable } from "@nestjs/common";
import { addDays } from "@ebokt/domain";
import { AuditService } from "../common/audit";
import { fromDate, toDate } from "../common/dates";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class EodService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async current() {
    const row = await this.ensure();
    return { data: { business_date: fromDate(row.businessDate) } };
  }

  async journal() {
    const [calendar, rows] = await Promise.all([
      this.ensure(),
      this.prisma.eodJournal.findMany({ orderBy: { id: "desc" }, take: 40 }),
    ]);
    const users = await this.prisma.user.findMany({
      where: { id: { in: rows.map((row) => row.closedBy) } },
    });
    const names = new Map(users.map((user) => [user.id, user.fullName]));
    return {
      data: {
        business_date: fromDate(calendar.businessDate),
        closed: rows.map((row) => ({
          id: row.id,
          business_date: fromDate(row.businessDate),
          status: row.status,
          closed_by: names.get(row.closedBy) ?? "",
          closed_at: row.closedAt.toISOString(),
        })),
      },
    };
  }

  async close(userId: number) {
    const row = await this.ensure();
    const current = fromDate(row.businessDate);
    if (!current) throw new BadRequestException("Sistem tarixi oxunmadı");
    const already = await this.prisma.eodJournal.findFirst({
      where: { businessDate: row.businessDate, status: "CLOSED" },
    });
    if (already) throw new BadRequestException("Bu sistem tarixi artıq bağlanıb");
    await this.prisma.eodJournal.create({
      data: { businessDate: row.businessDate, status: "CLOSED", closedBy: userId },
    });
    const next = addDays(current, 1);
    await this.prisma.businessCalendar.update({
      where: { id: 1 },
      data: { businessDate: toDate(next)! },
    });
    await this.audit.write("eod", 1, "close", userId, { business_date: current, next });
    return this.journal();
  }

  async businessDate() {
    const row = await this.ensure();
    return fromDate(row.businessDate) ?? new Date().toISOString().slice(0, 10);
  }

  private async ensure() {
    const existing = await this.prisma.businessCalendar.findUnique({ where: { id: 1 } });
    if (existing) return existing;
    const today = new Date().toISOString().slice(0, 10);
    return this.prisma.businessCalendar.create({
      data: { id: 1, businessDate: toDate(today)! },
    });
  }
}
