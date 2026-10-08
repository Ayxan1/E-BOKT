import { Module } from "@nestjs/common";
import { EodModule } from "../eod/eod.module";
import { LedgerModule } from "../ledger/ledger.module";
import { LoansController } from "./loans.controller";
import { LoansService } from "./loans.service";

@Module({
  imports: [LedgerModule, EodModule],
  controllers: [LoansController],
  providers: [LoansService],
  exports: [LoansService],
})
export class LoansModule {}
