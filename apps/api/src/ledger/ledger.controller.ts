import { Body, Controller, Get, Post, Req } from "@nestjs/common";
import { RequirePermissions, type AuthUser } from "../common/auth";
import { LedgerService } from "./ledger.service";

@Controller("ledger")
export class LedgerController {
  constructor(private readonly ledger: LedgerService) {}

  @Get("accounts")
  @RequirePermissions("ledger.read")
  accounts() {
    return this.ledger.accounts();
  }

  @Get("transactions")
  @RequirePermissions("ledger.read")
  transactions() {
    return this.ledger.transactions();
  }

  @Post("transactions")
  @RequirePermissions("ledger.post")
  post(@Body() body: unknown, @Req() request: { user: AuthUser }) {
    return this.ledger.post(body, request.user.id);
  }
}
