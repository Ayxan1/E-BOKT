import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { validateCustomer } from "@ebokt/domain";
import { createReadStream, existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { AuditService } from "../common/audit";
import { decimal, fromDate, toDate } from "../common/dates";
import { listed, pageOf } from "../common/page";
import { PrismaService } from "../prisma/prisma.service";

const include = {
  document: true,
  workplaces: true,
  phones: true,
  parties: true,
  files: true,
} satisfies Prisma.CustomerInclude;

type CustomerRow = Prisma.CustomerGetPayload<{ include: typeof include }>;

function present(customer: CustomerRow, attributes: Record<string, string>) {
  return {
    id: customer.id,
    customer_no: customer.customerNo,
    customer_type: customer.customerType,
    first_name: customer.firstName,
    last_name: customer.lastName,
    father_name: customer.fatherName,
    full_name: customer.fullName,
    unique_no: customer.uniqueNo,
    executor_fin: customer.executorFin,
    activity_type: customer.activityType,
    activity_code: customer.activityCode,
    sector: customer.sector,
    residency_status: customer.residencyStatus,
    registration_address: customer.registrationAddress,
    actual_address: customer.actualAddress,
    note: customer.note,
    document: customer.document
      ? {
          series: customer.document.series,
          number: customer.document.number,
          issue_date: fromDate(customer.document.issueDate),
          issue_place: customer.document.issuePlace,
          expiry_date: fromDate(customer.document.expiryDate),
          citizenship: customer.document.citizenship,
          birth_date: fromDate(customer.document.birthDate),
          marital_status: customer.document.maritalStatus,
          gender: customer.document.gender,
        }
      : null,
    workplaces: customer.workplaces.map((item) => ({
      workplace_type: item.workplaceType,
      workplace_name: item.workplaceName,
      position: item.position,
      monthly_income: decimal(item.monthlyIncome, 2),
      work_experience: item.workExperience,
      note: item.note,
    })),
    phones: customer.phones.map((item) => ({
      phone_number: item.phoneNumber,
      phone_type: item.phoneType,
      is_primary: item.isPrimary,
      note: item.note,
    })),
    executors_founders: customer.parties.map((item) => ({
      type: item.type,
      full_name: item.fullName,
      share: decimal(item.share, 2),
      fin_voen: item.finVoen,
      note: item.note,
    })),
    files: customer.files.map((item) => ({
      id: item.id,
      file_name: item.fileName,
      file_type: item.fileType,
      file: item.fileKey,
      note: item.note,
    })),
    attributes,
  };
}

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(query: { search?: string; page?: string; pageSize?: string; customer_type?: string }) {
    const page = pageOf(query);
    const where: Prisma.CustomerWhereInput = {
      ...(query.customer_type ? { customerType: Number(query.customer_type) } : {}),
      ...(query.search
        ? {
            OR: [
              { fullName: { contains: query.search, mode: "insensitive" } },
              { customerNo: { contains: query.search, mode: "insensitive" } },
              { uniqueNo: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({ where, include, orderBy: { id: "desc" }, skip: page.skip, take: page.pageSize }),
      this.prisma.customer.count({ where }),
    ]);
    return listed(rows.map((row) => present(row, {})), total, page.page, page.pageSize);
  }

  async get(id: number) {
    const customer = await this.prisma.customer.findUnique({ where: { id }, include });
    if (!customer) throw new NotFoundException("Müştəri tapılmadı");
    return { data: present(customer, await this.attributes(id)) };
  }

  async create(body: unknown, userId: number) {
    const value = this.parse(body);
    await this.checkAttributes(value.attributes);
    try {
      const customer = await this.prisma.$transaction(async (tx) => {
        const customerNo = await this.nextCustomerNo(tx);
        const created = await tx.customer.create({
          data: this.data(value, customerNo),
          include,
        });
        await this.writeChildren(tx, created.id, value);
        await this.writeAttributes(tx, created.id, value.attributes);
        return tx.customer.findUniqueOrThrow({ where: { id: created.id }, include });
      });
      const attributes = await this.attributes(customer.id);
      await this.audit.write("customer", customer.id, "create", userId, present(customer, attributes));
      return { data: present(customer, attributes) };
    } catch (error) {
      this.rethrowUnique(error);
      throw error;
    }
  }

  async update(id: number, body: unknown, userId: number) {
    await this.get(id);
    const value = this.parse(body);
    await this.checkAttributes(value.attributes);
    try {
      const customer = await this.prisma.$transaction(async (tx) => {
        const current = await tx.customer.findUniqueOrThrow({ where: { id } });
        await tx.customerDocument.deleteMany({ where: { customerId: id } });
        await tx.workplace.deleteMany({ where: { customerId: id } });
        await tx.phone.deleteMany({ where: { customerId: id } });
        await tx.relatedParty.deleteMany({ where: { customerId: id } });
        await tx.customer.update({ where: { id }, data: this.data(value, current.customerNo) });
        await this.writeChildren(tx, id, value);
        await this.writeAttributes(tx, id, value.attributes);
        return tx.customer.findUniqueOrThrow({ where: { id }, include });
      });
      const attributes = await this.attributes(id);
      await this.audit.write("customer", id, "update", userId, present(customer, attributes));
      return { data: present(customer, attributes) };
    } catch (error) {
      this.rethrowUnique(error);
      throw error;
    }
  }

  async remove(id: number, userId: number) {
    await this.get(id);
    await this.prisma.fieldValue.deleteMany({ where: { entity: "customer", entityId: id } });
    await this.prisma.customer.delete({ where: { id } });
    await this.audit.write("customer", id, "delete", userId, {});
    return { data: { deleted: true } };
  }

  async addFile(id: number, file: Express.Multer.File, fileType: string, note: string, userId: number) {
    await this.get(id);
    if (!file) throw new BadRequestException("Fayl seçilməyib");
    if (!fileType.trim()) {
      throw new BadRequestException({ message: "Fayl tipi məcburidir", errors: [{ field: "file_type", message: "Fayl tipi məcburidir" }] });
    }
    const folder = path.join(process.cwd(), "uploads", "customers", String(id));
    await mkdir(folder, { recursive: true });
    const safeName = file.originalname.replace(/[^\w.\-]+/g, "_");
    const stored = `${Date.now()}-${safeName}`;
    await writeFile(path.join(folder, stored), file.buffer);
    const saved = await this.prisma.customerFile.create({
      data: {
        customerId: id,
        fileName: file.originalname,
        fileType: fileType.trim(),
        fileKey: `customers/${id}/${stored}`,
        note: note.trim(),
      },
    });
    await this.audit.write("customer_file", saved.id, "create", userId, { customer_id: id });
    return {
      data: { id: saved.id, file_name: saved.fileName, file_type: saved.fileType, file: saved.fileKey, note: saved.note },
    };
  }

  async openFile(customerId: number, fileId: number) {
    const row = await this.prisma.customerFile.findFirst({ where: { id: fileId, customerId } });
    if (!row) throw new NotFoundException("Fayl tapılmadı");
    const root = path.resolve(process.cwd(), "uploads");
    const full = path.resolve(root, row.fileKey);
    if (!full.startsWith(`${root}${path.sep}`) || !existsSync(full)) throw new NotFoundException("Fayl tapılmadı");
    return { stream: createReadStream(full), name: row.fileName };
  }

  private parse(body: unknown) {
    const result = validateCustomer(body);
    if (!result.ok) throw new BadRequestException({ message: result.errors[0].message, errors: result.errors });
    return result.value;
  }

  private data(value: ReturnType<CustomersService["parse"]>, customerNo: string): Prisma.CustomerUncheckedCreateInput {
    return {
      customerNo,
      customerType: value.customer_type,
      firstName: value.first_name,
      lastName: value.last_name,
      fatherName: value.father_name,
      fullName: value.full_name,
      uniqueNo: value.unique_no,
      executorFin: value.executor_fin,
      activityType: value.activity_type,
      activityCode: value.activity_code,
      sector: value.sector,
      residencyStatus: value.residency_status,
      registrationAddress: value.registration_address,
      actualAddress: value.actual_address,
      note: value.note,
    };
  }

  private async writeChildren(tx: Prisma.TransactionClient, customerId: number, value: ReturnType<CustomersService["parse"]>) {
    if (value.document) {
      await tx.customerDocument.create({
        data: {
          customerId,
          series: value.document.series,
          number: value.document.number,
          issueDate: toDate(value.document.issue_date),
          issuePlace: value.document.issue_place,
          expiryDate: toDate(value.document.expiry_date),
          citizenship: value.document.citizenship,
          birthDate: toDate(value.document.birth_date),
          maritalStatus: value.document.marital_status,
          gender: value.document.gender,
        },
      });
    }
    if (value.workplaces.length) {
      await tx.workplace.createMany({
        data: value.workplaces.map((item) => ({
          customerId,
          workplaceType: item.workplace_type,
          workplaceName: item.workplace_name,
          position: item.position,
          monthlyIncome: item.monthly_income,
          workExperience: item.work_experience,
          note: item.note,
        })),
      });
    }
    if (value.phones.length) {
      await tx.phone.createMany({
        data: value.phones.map((item) => ({
          customerId,
          phoneNumber: item.phone_number,
          phoneType: item.phone_type,
          isPrimary: item.is_primary,
          note: item.note,
        })),
      });
    }
    if (value.executors_founders.length) {
      await tx.relatedParty.createMany({
        data: value.executors_founders.map((item) => ({
          customerId,
          type: item.type,
          fullName: item.full_name,
          share: item.share,
          finVoen: item.fin_voen,
          note: item.note,
        })),
      });
    }
  }

  private async nextCustomerNo(tx: Prisma.TransactionClient) {
    const name = "customer_no";
    const existing = await tx.sequence.findUnique({ where: { name } });
    if (!existing) {
      const created = await tx.sequence.create({ data: { name, value: 100001 } });
      return String(created.value);
    }
    const updated = await tx.sequence.update({ where: { name }, data: { value: { increment: 1 } } });
    return String(updated.value);
  }

  private async attributes(entityId: number) {
    const rows = await this.prisma.fieldValue.findMany({ where: { entity: "customer", entityId } });
    return Object.fromEntries(rows.map((row) => [row.fieldCode, row.value]));
  }

  private async checkAttributes(attributes: Record<string, string>) {
    const defs = await this.prisma.fieldDefinition.findMany({ where: { entity: "customer", active: true } });
    const errors = defs
      .filter((def) => def.required && !attributes[def.code])
      .map((def) => ({ field: `attributes.${def.code}`, message: `${def.label} məcburidir` }));
    if (errors.length) throw new BadRequestException({ message: errors[0].message, errors });
  }

  private async writeAttributes(tx: Prisma.TransactionClient, entityId: number, attributes: Record<string, string>) {
    const defs = await tx.fieldDefinition.findMany({ where: { entity: "customer", active: true } });
    await tx.fieldValue.deleteMany({ where: { entity: "customer", entityId } });
    const data = defs
      .filter((def) => attributes[def.code])
      .map((def) => ({ entity: "customer", entityId, fieldCode: def.code, value: attributes[def.code] }));
    if (data.length) await tx.fieldValue.createMany({ data });
  }

  private rethrowUnique(error: unknown): void {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ConflictException("Bu FİN və ya VÖEN artıq qeydiyyatdadır");
    }
  }
}
