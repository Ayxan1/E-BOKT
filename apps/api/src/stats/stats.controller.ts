import { Controller, Get } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Controller("stats")
export class StatsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async get() {
    const [branches, users, customers, products, loans, collaterals] = await Promise.all([
      this.prisma.branch.count(),
      this.prisma.user.count(),
      this.prisma.customer.count(),
      this.prisma.creditProduct.count(),
      this.prisma.loan.count(),
      this.prisma.collateral.count(),
    ]);
    return { data: { branches, users, customers, products, loans, collaterals } };
  }
}
