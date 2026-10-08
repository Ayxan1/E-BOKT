import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { text } from "@ebokt/domain";
import type { AuthUser } from "../common/auth";
import { AuditService } from "../common/audit";
import { listed, pageOf } from "../common/page";
import { PrismaService } from "../prisma/prisma.service";

const include = { branch: true, roles: true } satisfies Prisma.UserInclude;

type UserRow = Prisma.UserGetPayload<{ include: typeof include }>;

function present(user: UserRow) {
  return {
    id: user.id,
    username: user.username,
    user_full_name: user.fullName,
    phone_number: user.phoneNumber,
    status: user.status,
    admin: user.admin,
    branch_id: user.branchId,
    branch_name: user.branch.name,
    note: user.note,
    max_failed_attempts: user.maxFailedAttempts,
    failed_attempts: user.failedAttempts,
    role_ids: user.roles.map((role) => role.roleId),
  };
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(query: { search?: string; page?: string; pageSize?: string }) {
    const page = pageOf(query);
    const where = query.search
      ? {
          OR: [
            { username: { contains: query.search, mode: "insensitive" as const } },
            { fullName: { contains: query.search, mode: "insensitive" as const } },
            { phoneNumber: { contains: query.search, mode: "insensitive" as const } },
          ],
        }
      : {};
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({ where, include, orderBy: { id: "asc" }, skip: page.skip, take: page.pageSize }),
      this.prisma.user.count({ where }),
    ]);
    return listed(rows.map(present), total, page.page, page.pageSize);
  }

  async get(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id }, include });
    if (!user) throw new NotFoundException("İstifadəçi tapılmadı");
    return { data: present(user) };
  }

  async create(body: unknown, actor: AuthUser) {
    const data = this.read(body, true);
    this.guardPrivilege(actor, data.admin, data.roleIds);
    const branch = await this.prisma.branch.findUnique({ where: { id: data.branchId } });
    if (!branch) throw new BadRequestException({ message: "Filial tapılmadı", errors: [{ field: "branch_id", message: "Filial tapılmadı" }] });
    try {
      const user = await this.prisma.user.create({
        data: {
          username: data.username,
          fullName: data.fullName,
          phoneNumber: data.phoneNumber,
          status: data.status,
          admin: data.admin,
          branchId: data.branchId,
          note: data.note,
          passwordHash: await bcrypt.hash(data.password, 10),
          maxFailedAttempts: data.maxFailedAttempts,
          roles: { create: data.roleIds.map((roleId) => ({ roleId })) },
        },
        include,
      });
      await this.audit.write("user", user.id, "create", actor.id, present(user));
      return { data: present(user) };
    } catch (error) {
      this.rethrowUnique(error);
      throw error;
    }
  }

  async update(id: number, body: unknown, actor: AuthUser) {
    const existing = await this.prisma.user.findUnique({ where: { id }, include });
    if (!existing) throw new NotFoundException("İstifadəçi tapılmadı");
    const data = this.read(body, false);
    if (!actor.admin && (existing.admin || data.admin || data.roleIds.length)) {
      throw new ForbiddenException("Admin hüququnu yalnız admin dəyişə bilər");
    }
    this.guardPrivilege(actor, data.admin, data.roleIds);
    const branch = await this.prisma.branch.findUnique({ where: { id: data.branchId } });
    if (!branch) throw new BadRequestException({ message: "Filial tapılmadı", errors: [{ field: "branch_id", message: "Filial tapılmadı" }] });
    const passwordHash = data.password ? await bcrypt.hash(data.password, 10) : undefined;
    try {
      const user = await this.prisma.$transaction(async (tx) => {
        if (actor.admin) await tx.userRole.deleteMany({ where: { userId: id } });
        return tx.user.update({
          where: { id },
          data: {
            username: data.username,
            fullName: data.fullName,
            phoneNumber: data.phoneNumber,
            status: data.status,
            admin: actor.admin ? data.admin : existing.admin,
            branchId: data.branchId,
            note: data.note,
            maxFailedAttempts: data.maxFailedAttempts,
            failedAttempts: data.resetPassword || data.password ? 0 : undefined,
            passwordHash,
            roles: actor.admin ? { create: data.roleIds.map((roleId) => ({ roleId })) } : undefined,
          },
          include,
        });
      });
      await this.audit.write("user", id, "update", actor.id, present(user));
      return { data: present(user) };
    } catch (error) {
      this.rethrowUnique(error);
      throw error;
    }
  }

  async remove(id: number, actor: AuthUser) {
    if (id === actor.id) throw new ConflictException("Öz hesabınızı silə bilməzsiniz");
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("İstifadəçi tapılmadı");
    if (existing.admin && !actor.admin) throw new ForbiddenException("Admin istifadəçini yalnız admin silə bilər");
    await this.prisma.user.delete({ where: { id } });
    await this.audit.write("user", id, "delete", actor.id, {});
    return { data: { deleted: true } };
  }

  private guardPrivilege(actor: AuthUser, admin: boolean, roleIds: number[]) {
    if (!actor.admin && (admin || roleIds.length)) {
      throw new ForbiddenException("Rol və admin hüququnu yalnız admin verə bilər");
    }
  }

  private read(body: unknown, creating: boolean) {
    const source = (body ?? {}) as Record<string, unknown>;
    const errors: { field: string; message: string }[] = [];
    const username = text(source.username);
    const fullName = text(source.user_full_name);
    const status = text(source.status || "ACTIVE");
    const branchId = Number(source.branch_id);
    const password = text(source.password);
    const maxFailed = Number(source.max_failed_attempts ?? 5);
    if (!/^[a-zA-Z0-9._-]{3,32}$/.test(username)) {
      errors.push({ field: "username", message: "İstifadəçi adı 3–32 simvol olmalıdır" });
    }
    if (!fullName) errors.push({ field: "user_full_name", message: "Tam ad məcburidir" });
    if (status !== "ACTIVE" && status !== "INACTIVE") {
      errors.push({ field: "status", message: "Status ACTIVE və ya INACTIVE olmalıdır" });
    }
    if (!Number.isInteger(branchId) || branchId <= 0) {
      errors.push({ field: "branch_id", message: "Filial məcburidir" });
    }
    if (creating && password.length < 8) errors.push({ field: "password", message: "Şifrə ən azı 8 simvol olmalıdır" });
    if (!creating && source.reset_password === true && password.length < 8) {
      errors.push({ field: "password", message: "Şifrəni sıfırlamaq üçün ən azı 8 simvol yazın" });
    } else if (!creating && password && password.length < 8) {
      errors.push({ field: "password", message: "Şifrə ən azı 8 simvol olmalıdır" });
    }
    if (!Number.isInteger(maxFailed) || maxFailed < 1 || maxFailed > 20) {
      errors.push({ field: "max_failed_attempts", message: "Maksimum səhv sayı 1–20 olmalıdır" });
    }
    const roleIds = Array.isArray(source.role_ids) ? source.role_ids.map(Number).filter((id) => Number.isInteger(id)) : [];
    if (errors.length) throw new BadRequestException({ message: errors[0].message, errors });
    return {
      username,
      fullName,
      phoneNumber: text(source.phone_number),
      status,
      admin: source.admin === true || source.admin === "true",
      branchId,
      note: text(source.note),
      password,
      maxFailedAttempts: maxFailed,
      roleIds,
      resetPassword: source.reset_password === true,
    };
  }

  private rethrowUnique(error: unknown): void {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ConflictException("Bu istifadəçi adı artıq mövcuddur");
    }
  }
}
