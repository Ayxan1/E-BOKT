import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, Req } from "@nestjs/common";
import { RequirePermissions, type AuthUser } from "../common/auth";
import { ProductsService } from "./products.service";

@Controller("products")
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  @RequirePermissions("product.read")
  list(@Query() query: { search?: string; page?: string; pageSize?: string }) {
    return this.products.list(query);
  }

  @Get(":id")
  @RequirePermissions("product.read")
  get(@Param("id", ParseIntPipe) id: number) {
    return this.products.get(id);
  }

  @Post()
  @RequirePermissions("product.create")
  create(@Body() body: unknown, @Req() request: { user: AuthUser }) {
    return this.products.create(body, request.user.id);
  }

  @Put(":id")
  @RequirePermissions("product.update")
  update(@Param("id", ParseIntPipe) id: number, @Body() body: unknown, @Req() request: { user: AuthUser }) {
    return this.products.update(id, body, request.user.id);
  }

  @Delete(":id")
  @RequirePermissions("product.delete")
  remove(@Param("id", ParseIntPipe) id: number, @Req() request: { user: AuthUser }) {
    return this.products.remove(id, request.user.id);
  }
}
