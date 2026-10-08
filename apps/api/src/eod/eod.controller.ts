import { Controller, Get, Post, Req } from "@nestjs/common";
import { RequirePermissions, type AuthUser } from "../common/auth";
import { EodService } from "./eod.service";

@Controller()
export class EodController {
  constructor(private readonly eod: EodService) {}

  @Get("business-date")
  current() {
    return this.eod.current();
  }

  @Get("eod")
  @RequirePermissions("eod.read")
  journal() {
    return this.eod.journal();
  }

  @Post("eod/close")
  @RequirePermissions("eod.run")
  close(@Req() request: { user: AuthUser }) {
    return this.eod.close(request.user.id);
  }
}
