import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Query } from "@nestjs/common";
import { RequirePermissions } from "../common/auth";
import { MetaService } from "./meta.service";

@Controller()
export class MetaController {
  constructor(private readonly meta: MetaService) {}

  @Get("dictionaries")
  @RequirePermissions("dictionary.read")
  dictionaries(@Query("group") group?: string) {
    return this.meta.dictionaries(group);
  }

  @Post("dictionaries")
  @RequirePermissions("dictionary.manage")
  createDictionary(@Body() body: unknown) {
    return this.meta.createDictionary(body);
  }

  @Delete("dictionaries/:id")
  @RequirePermissions("dictionary.manage")
  removeDictionary(@Param("id", ParseIntPipe) id: number) {
    return this.meta.removeDictionary(id);
  }

  @Get("fields")
  @RequirePermissions("field.read")
  fields(@Query("entity") entity?: string) {
    return this.meta.fields(entity);
  }

  @Post("fields")
  @RequirePermissions("field.manage")
  createField(@Body() body: unknown) {
    return this.meta.createField(body);
  }

  @Delete("fields/:id")
  @RequirePermissions("field.manage")
  removeField(@Param("id", ParseIntPipe) id: number) {
    return this.meta.removeField(id);
  }
}
