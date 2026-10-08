import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { assertBalanced, Decimal, money, text } from "@ebokt/domain";
import { isIsoDate } from "@ebokt/domain";
import { AuditService } from "../common/audit";
import { decimal } from "../common/dates";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class LedgerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async accounts() {
    const rows = await this.prisma.account.findMany({ orderBy: { code: "asc" } });
    const balances = await Promise.all(rows.map((account) => this.balance(account.id)));
    return {
      data: rows.map((account, index) => ({
        id: account.id,
        code: account.code,
        name: account.name,
        account_type: account.accountType,
        currency: account.currency,
        branch_id: account.branchId,
        status: account.status,
        balance: balances[index],
      })),
    };
  }

  async transactions() {
    const rows = await this.prisma.ledgerTransaction.findMany({
      include: { postings: { include: { account: true } } },
      orderBy: { id: "desc" },
      take: 50,
    });
    return {
      data: rows.map((row) => ({
        id: row.id,
        reference: row.reference,
        business_date: row.businessDate.toISOString().slice(0, 10),
        module: row.module,
        status: row.status,
        postings: row.postings.map((posting) => ({
          account_code: posting.account.code,
          direction: posting.direction,
          amount: decimal(posting.amount, 2),
          currency: posting.currency,
        })),
      })),
    };
  }

  async post(body: unknown, userId: number) {
    const source = (body ?? {}) as Record<string, unknown>;
    const reference = text(source.reference);
    const idempotencyKey = text(source.idempotency_key);
    const businessDate = text(source.business_date);
    const module = text(source.module || "manual");
    const rawPostings = Array.isArray(source.postings) ? source.postings : [];
    if (!reference || !idempotencyKey || !isIsoDate(businessDate)) {
      throw new BadRequestException("Referans, idempotency açarı və iş tarixi məcburidir");
    }
    const postings = rawPostings.map((item) => {
      const row = item as Record<string, unknown>;
      return {
        account_code: text(row.account_code),
        direction: text(row.direction) as "DEBIT" | "CREDIT",
        amount: money(row.amount, "məbləğ"),
        currency: text(row.currency).toUpperCase(),
      };
    });
    const errors = assertBalanced(postings);
    if (errors.length) throw new BadRequestException({ message: errors[0].message, errors });

    const existing = await this.prisma.ledgerTransaction.findUnique({ where: { idempotencyKey } });
    if (existing) return this.one(existing.id);

    const accounts = await this.prisma.account.findMany({ where: { code: { in: postings.map((item) => item.account_code) } } });
    const byCode = new Map(accounts.map((account) => [account.code, account]));
    for (const posting of postings) {
      const account = byCode.get(posting.account_code);
      if (!account) throw new NotFoundException(`${posting.account_code} hesabı tapılmadı`);
      if (account.currency !== posting.currency) {
        throw new BadRequestException(`${account.code} hesabının valyutası ${account.currency}-dir`);
      }
    }

    const created = await this.prisma.ledgerTransaction.create({
      data: {
        reference,
        idempotencyKey,
        businessDate: new Date(`${businessDate}T00:00:00.000Z`),
        branchId: source.branch_id ? Number(source.branch_id) : null,
        module,
        createdBy: userId,
        postings: {
          create: postings.map((posting) => ({
            accountId: byCode.get(posting.account_code)!.id,
            direction: posting.direction,
            amount: posting.amount,
            currency: posting.currency,
          })),
        },
      },
    });
    await this.audit.write("ledger", created.id, "post", userId, { reference });
    return this.one(created.id);
  }

  private async one(id: number) {
    const row = await this.prisma.ledgerTransaction.findUniqueOrThrow({
      where: { id },
      include: { postings: { include: { account: true } } },
    });
    return {
      data: {
        id: row.id,
        reference: row.reference,
        status: row.status,
        postings: row.postings.map((posting) => ({
          account_code: posting.account.code,
          direction: posting.direction,
          amount: decimal(posting.amount, 2),
          currency: posting.currency,
        })),
      },
    };
  }

  private async balance(accountId: number) {
    const postings = await this.prisma.posting.findMany({ where: { accountId } });
    const account = await this.prisma.account.findUniqueOrThrow({ where: { id: accountId } });
    let debit = new Decimal(0);
    let credit = new Decimal(0);
    for (const posting of postings) {
      const amount = new Decimal(posting.amount.toString());
      if (posting.direction === "DEBIT") debit = debit.plus(amount);
      else credit = credit.plus(amount);
    }
    const normalDebit = account.accountType === "ASSET" || account.accountType === "EXPENSE" || account.accountType === "OFF_BALANCE";
    const value = normalDebit ? debit.minus(credit) : credit.minus(debit);
    return value.toFixed(2);
  }
}
