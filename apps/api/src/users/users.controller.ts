import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, Req } from "@nestjs/common";
import { RequirePermissions, type AuthUser } from "../common/auth";
import { UsersService } from "./users.service";

@Controller("users")
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @RequirePermissions("user.read")
  list(@Query() query: { search?: string; page?: string; pageSize?: string }) {
    return this.users.list(query);
  }

  @Get(":id")
  @RequirePermissions("user.read")
  get(@Param("id", ParseIntPipe) id: number) {
    return this.users.get(id);
  }

  @Post()
  @RequirePermissions("user.create")
  create(@Body() body: unknown, @Req() request: { user: AuthUser }) {
    return this.users.create(body, request.user);
  }

  @Put(":id")
  @RequirePermissions("user.update")
  update(@Param("id", ParseIntPipe) id: number, @Body() body: unknown, @Req() request: { user: AuthUser }) {
    return this.users.update(id, body, request.user);
  }

  @Delete(":id")
  @RequirePermissions("user.delete")
  remove(@Param("id", ParseIntPipe) id: number, @Req() request: { user: AuthUser }) {
    return this.users.remove(id, request.user);
  }
}
