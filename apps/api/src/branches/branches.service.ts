import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { Branch } from "@prisma/client";
import { text } from "@ebokt/domain";
import { AuditService } from "../common/audit";
import { listed, pageOf } from "../common/page";
import { PrismaService } from "../prisma/prisma.service";

function present(branch: Branch) {
  return {
    branch_id: branch.id,
    branch_name: branch.name,
    address: branch.address,
    phone_number: branch.phoneNumber,
    director: branch.director,
    head_office: branch.headOffice,
  };
}

function read(body: unknown) {
  const source = (body ?? {}) as Record<string, unknown>;
  const name = text(source.branch_name);
  const address = text(source.address);
  const phone = text(source.phone_number);
  const errors: { field: string; message: string }[] = [];
  if (!name) errors.push({ field: "branch_name", message: "Filial adı məcburidir" });
  if (!address) errors.push({ field: "address", message: "Ünvan məcburidir" });
  if (!phone) errors.push({ field: "phone_number", message: "Telefon məcburidir" });
  if (errors.length) throw new BadRequestException({ message: errors[0].message, errors });
  return {
    name,
    address,
    phoneNumber: phone,
    director: text(source.director),
    headOffice: source.head_office === true || source.head_office === "true",
  };
}

@Injectable()
export class BranchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(query: { search?: string; page?: string; pageSize?: string }) {
    const page = pageOf(query);
    const where = query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: "insensitive" as const } },
            { address: { contains: query.search, mode: "insensitive" as const } },
            { director: { contains: query.search, mode: "insensitive" as const } },
          ],
        }
      : {};
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.branch.findMany({ where, orderBy: { id: "asc" }, skip: page.skip, take: page.pageSize }),
      this.prisma.branch.count({ where }),
    ]);
    return listed(rows.map(present), total, page.page, page.pageSize);
  }

  async get(id: number) {
    const branch = await this.prisma.branch.findUnique({ where: { id } });
    if (!branch) throw new NotFoundException("Filial tapılmadı");
    return { data: present(branch) };
  }

  async create(body: unknown, userId: number) {
    const data = read(body);
    const branch = await this.prisma.$transaction(async (tx) => {
      if (data.headOffice) await tx.branch.updateMany({ data: { headOffice: false } });
      return tx.branch.create({ data });
    });
    await this.audit.write("branch", branch.id, "create", userId, present(branch));
    return { data: present(branch) };
  }

  async update(id: number, body: unknown, userId: number) {
    await this.get(id);
    const data = read(body);
    const branch = await this.prisma.$transaction(async (tx) => {
      if (data.headOffice) await tx.branch.updateMany({ where: { id: { not: id } }, data: { headOffice: false } });
      return tx.branch.update({ where: { id }, data });
    });
    await this.audit.write("branch", id, "update", userId, present(branch));
    return { data: present(branch) };
  }

  async remove(id: number, userId: number) {
    const users = await this.prisma.user.count({ where: { branchId: id } });
    if (users) throw new ConflictException("Bu filiala bağlı istifadəçilər var");
    await this.get(id);
    await this.prisma.branch.delete({ where: { id } });
    await this.audit.write("branch", id, "delete", userId, {});
    return { data: { deleted: true } };
  }
}
