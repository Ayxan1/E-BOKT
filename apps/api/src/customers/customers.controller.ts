import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { RequirePermissions, type AuthUser } from "../common/auth";
import { CustomersService } from "./customers.service";

@Controller("customers")
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  @RequirePermissions("customer.read")
  list(@Query() query: { search?: string; page?: string; pageSize?: string; customer_type?: string }) {
    return this.customers.list(query);
  }

  @Get(":id")
  @RequirePermissions("customer.read")
  get(@Param("id", ParseIntPipe) id: number) {
    return this.customers.get(id);
  }

  @Post()
  @RequirePermissions("customer.create")
  create(@Body() body: unknown, @Req() request: { user: AuthUser }) {
    return this.customers.create(body, request.user.id);
  }

  @Put(":id")
  @RequirePermissions("customer.update")
  update(@Param("id", ParseIntPipe) id: number, @Body() body: unknown, @Req() request: { user: AuthUser }) {
    return this.customers.update(id, body, request.user.id);
  }

  @Delete(":id")
  @RequirePermissions("customer.delete")
  remove(@Param("id", ParseIntPipe) id: number, @Req() request: { user: AuthUser }) {
    return this.customers.remove(id, request.user.id);
  }

  @Get(":id/files/:fileId")
  @RequirePermissions("customer.read")
  async download(@Param("id", ParseIntPipe) id: number, @Param("fileId", ParseIntPipe) fileId: number) {
    const file = await this.customers.openFile(id, fileId);
    return new StreamableFile(file.stream, {
      type: "application/octet-stream",
      disposition: `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`,
    });
  }

  @Post(":id/files")
  @RequirePermissions("customer.update")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 8 * 1024 * 1024 } }))
  upload(
    @Param("id", ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { file_type?: string; note?: string },
    @Req() request: { user: AuthUser },
  ) {
    return this.customers.addFile(id, file, body.file_type ?? "", body.note ?? "", request.user.id);
  }
}
