import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, Req } from "@nestjs/common";
import { RequirePermissions, type AuthUser } from "../common/auth";
import { BranchesService } from "./branches.service";

@Controller("branches")
export class BranchesController {
  constructor(private readonly branches: BranchesService) {}

  @Get()
  @RequirePermissions("branch.read")
  list(@Query() query: { search?: string; page?: string; pageSize?: string }) {
    return this.branches.list(query);
  }

  @Get(":id")
  @RequirePermissions("branch.read")
  get(@Param("id", ParseIntPipe) id: number) {
    return this.branches.get(id);
  }

  @Post()
  @RequirePermissions("branch.create")
  create(@Body() body: unknown, @Req() request: { user: AuthUser }) {
    return this.branches.create(body, request.user.id);
  }

  @Put(":id")
  @RequirePermissions("branch.update")
  update(@Param("id", ParseIntPipe) id: number, @Body() body: unknown, @Req() request: { user: AuthUser }) {
    return this.branches.update(id, body, request.user.id);
  }

  @Delete(":id")
  @RequirePermissions("branch.delete")
  remove(@Param("id", ParseIntPipe) id: number, @Req() request: { user: AuthUser }) {
    return this.branches.remove(id, request.user.id);
  }
}
