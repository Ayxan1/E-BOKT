import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { AccessModule } from "./access/access.module";
import { AuthGuard } from "./common/auth";
import { AuditModule } from "./audit.module";
import { AuthModule } from "./auth/auth.module";
import { BranchesModule } from "./branches/branches.module";
import { CollateralsModule } from "./collaterals/collaterals.module";
import { CustomersModule } from "./customers/customers.module";
import { EodModule } from "./eod/eod.module";
import { LedgerModule } from "./ledger/ledger.module";
import { LoansModule } from "./loans/loans.module";
import { MetaModule } from "./meta/meta.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ProductsModule } from "./products/products.module";
import { StatsController } from "./stats/stats.controller";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuditModule,
    AuthModule,
    BranchesModule,
    UsersModule,
    CustomersModule,
    ProductsModule,
    LoansModule,
    CollateralsModule,
    EodModule,
    AccessModule,
    MetaModule,
    LedgerModule,
  ],
  controllers: [StatsController],
  providers: [{ provide: APP_GUARD, useClass: AuthGuard }],
})
export class AppModule {}
