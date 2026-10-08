import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, Req } from "@nestjs/common";
import { RequirePermissions, type AuthUser } from "../common/auth";
import { AccessService } from "./access.service";

@Controller()
export class AccessController {
  constructor(private readonly access: AccessService) {}

  @Get("roles")
  @RequirePermissions("role.read")
  roles() {
    return this.access.listRoles();
  }

  @Post("roles")
  @RequirePermissions("role.create")
  createRole(@Body() body: unknown, @Req() request: { user: AuthUser }) {
    return this.access.createRole(body, request.user.id);
  }

  @Put("roles/:id")
  @RequirePermissions("role.update")
  updateRole(@Param("id", ParseIntPipe) id: number, @Body() body: unknown, @Req() request: { user: AuthUser }) {
    return this.access.updateRole(id, body, request.user.id);
  }

  @Delete("roles/:id")
  @RequirePermissions("role.delete")
  removeRole(@Param("id", ParseIntPipe) id: number, @Req() request: { user: AuthUser }) {
    return this.access.removeRole(id, request.user.id);
  }

  @Get("permissions")
  @RequirePermissions("role.read")
  permissions() {
    return this.access.listPermissions();
  }

  @Get("permissions/crud")
  @RequirePermissions("role.update")
  crud(@Query("resource") resource = "") {
    return this.access.crud(resource);
  }
}
