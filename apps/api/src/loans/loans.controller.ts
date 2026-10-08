import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, Req } from "@nestjs/common";
import { RequirePermissions, type AuthUser } from "../common/auth";
import { LoansService } from "./loans.service";

@Controller("loans")
export class LoansController {
  constructor(private readonly loans: LoansService) {}

  @Get("preview")
  @RequirePermissions("loan.create")
  preview() {
    return this.loans.preview();
  }

  @Get()
  @RequirePermissions("loan.read")
  list(@Query() query: { search?: string; page?: string; pageSize?: string }) {
    return this.loans.list(query);
  }

  @Get(":id")
  @RequirePermissions("loan.read")
  get(@Param("id", ParseIntPipe) id: number) {
    return this.loans.get(id);
  }

  @Post()
  @RequirePermissions("loan.create")
  create(@Body() body: unknown, @Req() request: { user: AuthUser }) {
    return this.loans.create(body, request.user.id);
  }

  @Put(":id")
  @RequirePermissions("loan.update")
  update(@Param("id", ParseIntPipe) id: number, @Body() body: unknown, @Req() request: { user: AuthUser }) {
    return this.loans.update(id, body, request.user.id);
  }

  @Delete(":id")
  @RequirePermissions("loan.delete")
  remove(@Param("id", ParseIntPipe) id: number, @Req() request: { user: AuthUser }) {
    return this.loans.remove(id, request.user.id);
  }

  @Post(":id/schedule")
  @RequirePermissions("loan.update")
  schedule(@Param("id", ParseIntPipe) id: number, @Req() request: { user: AuthUser }) {
    return this.loans.generateSchedule(id, request.user.id);
  }

  @Post(":id/disburse")
  @RequirePermissions("loan.post")
  disburse(@Param("id", ParseIntPipe) id: number, @Req() request: { user: AuthUser }) {
    return this.loans.disburse(id, request.user.id);
  }

  @Post(":id/collaterals")
  @RequirePermissions("loan.update")
  link(@Param("id", ParseIntPipe) id: number, @Body() body: unknown, @Req() request: { user: AuthUser }) {
    return this.loans.link(id, body, request.user.id);
  }

  @Delete(":id/collaterals/:linkId")
  @RequirePermissions("loan.update")
  unlink(
    @Param("id", ParseIntPipe) id: number,
    @Param("linkId", ParseIntPipe) linkId: number,
    @Req() request: { user: AuthUser },
  ) {
    return this.loans.unlink(id, linkId, request.user.id);
  }
}
