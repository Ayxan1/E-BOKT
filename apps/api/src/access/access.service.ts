import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { crudCodes, isPermissionCode, text } from "@ebokt/domain";
import { AuditService } from "../common/audit";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listRoles() {
    const roles = await this.prisma.role.findMany({
      include: { permissions: { include: { permission: true } } },
      orderBy: { name: "asc" },
    });
    return {
      data: roles.map((role) => ({
        id: role.id,
        name: role.name,
        description: role.description,
        permissions: role.permissions.map((link) => link.permission.code).sort(),
      })),
    };
  }

  async createRole(body: unknown, userId: number) {
    const source = (body ?? {}) as Record<string, unknown>;
    const name = text(source.name);
    if (!name) throw new BadRequestException({ message: "Rol adı məcburidir", errors: [{ field: "name", message: "Rol adı məcburidir" }] });
    try {
      const role = await this.prisma.role.create({ data: { name, description: text(source.description) } });
      await this.audit.write("role", role.id, "create", userId, { name });
      return { data: { id: role.id, name: role.name, description: role.description, permissions: [] } };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("Bu rol artıq mövcuddur");
      }
      throw error;
    }
  }

  async updateRole(id: number, body: unknown, userId: number) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException("Rol tapılmadı");
    const source = (body ?? {}) as Record<string, unknown>;
    const codes = Array.isArray(source.permissions) ? source.permissions.map((item) => text(item)) : [];
    const invalid = codes.filter((code) => !isPermissionCode(code));
    if (invalid.length) {
      throw new BadRequestException({
        message: "İcazə kodu modul.əməliyyat formatında olmalıdır",
        errors: invalid.map((code) => ({ field: "permissions", message: code })),
      });
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      for (const code of codes) {
        await tx.permission.upsert({ where: { code }, update: {}, create: { code } });
      }
      const permissions = await tx.permission.findMany({ where: { code: { in: codes } } });
      await tx.rolePermission.deleteMany({ where: { roleId: id } });
      if (permissions.length) {
        await tx.rolePermission.createMany({
          data: permissions.map((permission) => ({ roleId: id, permissionId: permission.id })),
        });
      }
      return tx.role.update({
        where: { id },
        data: {
          name: text(source.name) || role.name,
          description: text(source.description),
        },
      });
    });
    await this.audit.write("role", id, "update", userId, { permissions: codes });
    return { data: { id: updated.id, name: updated.name, description: updated.description, permissions: codes.sort() } };
  }

  async removeRole(id: number, userId: number) {
    const used = await this.prisma.userRole.count({ where: { roleId: id } });
    if (used) throw new ConflictException("Bu rol istifadəçilərə bağlıdır");
    await this.prisma.role.delete({ where: { id } });
    await this.audit.write("role", id, "delete", userId, {});
    return { data: { deleted: true } };
  }

  listPermissions() {
    return this.prisma.permission.findMany({ orderBy: { code: "asc" } }).then((rows) => ({
      data: rows.map((row) => ({ id: row.id, code: row.code, description: row.description })),
    }));
  }

  crud(resource: string) {
    try {
      return { data: crudCodes(resource) };
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : "Resurs adı yanlışdır");
    }
  }
}
