import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, Req } from "@nestjs/common";
import { RequirePermissions, type AuthUser } from "../common/auth";
import { CollateralsService } from "./collaterals.service";

@Controller("collaterals")
export class CollateralsController {
  constructor(private readonly collaterals: CollateralsService) {}

  @Get()
  @RequirePermissions("collateral.read")
  list(@Query() query: { search?: string; page?: string; pageSize?: string; type?: string }) {
    return this.collaterals.list(query);
  }

  @Get(":id")
  @RequirePermissions("collateral.read")
  get(@Param("id", ParseIntPipe) id: number) {
    return this.collaterals.get(id);
  }

  @Post()
  @RequirePermissions("collateral.create")
  create(@Body() body: unknown, @Req() request: { user: AuthUser }) {
    return this.collaterals.create(body, request.user.id);
  }

  @Put(":id")
  @RequirePermissions("collateral.update")
  update(@Param("id", ParseIntPipe) id: number, @Body() body: unknown, @Req() request: { user: AuthUser }) {
    return this.collaterals.update(id, body, request.user.id);
  }

  @Delete(":id")
  @RequirePermissions("collateral.delete")
  remove(@Param("id", ParseIntPipe) id: number, @Req() request: { user: AuthUser }) {
    return this.collaterals.remove(id, request.user.id);
  }

  @Post(":id/items")
  @RequirePermissions("collateral.update")
  addItem(@Param("id", ParseIntPipe) id: number, @Body() body: unknown, @Req() request: { user: AuthUser }) {
    return this.collaterals.addItem(id, body, request.user.id);
  }

  @Delete(":id/items/:itemId")
  @RequirePermissions("collateral.update")
  removeItem(
    @Param("id", ParseIntPipe) id: number,
    @Param("itemId", ParseIntPipe) itemId: number,
    @Req() request: { user: AuthUser },
  ) {
    return this.collaterals.removeItem(id, itemId, request.user.id);
  }
}
