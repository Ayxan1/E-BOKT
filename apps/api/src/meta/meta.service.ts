import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { text } from "@ebokt/domain";
import { PrismaService } from "../prisma/prisma.service";

const ENTITIES = new Set(["customer", "product", "branch", "user"]);
const TYPES = new Set(["text", "number", "money", "date", "boolean"]);

@Injectable()
export class MetaService {
  constructor(private readonly prisma: PrismaService) {}

  async dictionaries(group?: string) {
    const rows = await this.prisma.dictionaryItem.findMany({
      where: { active: true, ...(group ? { group } : {}) },
      orderBy: [{ group: "asc" }, { sortOrder: "asc" }],
    });
    return { data: rows.map((row) => ({ id: row.id, group: row.group, code: row.code, label: row.label })) };
  }

  async createDictionary(body: unknown) {
    const source = (body ?? {}) as Record<string, unknown>;
    const group = text(source.group).toUpperCase();
    const code = text(source.code).toUpperCase();
    const label = text(source.label);
    if (!group || !code || !label) throw new BadRequestException("Qrup, kod və ad məcburidir");
    const row = await this.prisma.dictionaryItem.upsert({
      where: { group_code: { group, code } },
      update: { label, active: true },
      create: { group, code, label },
    });
    return { data: { id: row.id, group: row.group, code: row.code, label: row.label } };
  }

  async removeDictionary(id: number) {
    const row = await this.prisma.dictionaryItem.findUnique({ where: { id } });
    if (!row) throw new NotFoundException("Lüğət tapılmadı");
    await this.prisma.dictionaryItem.update({ where: { id }, data: { active: false } });
    return { data: { deleted: true } };
  }

  async fields(entity?: string) {
    const rows = await this.prisma.fieldDefinition.findMany({
      where: { ...(entity ? { entity } : {}) },
      orderBy: [{ entity: "asc" }, { sortOrder: "asc" }],
    });
    return { data: rows.map(this.presentField) };
  }

  async createField(body: unknown) {
    const source = (body ?? {}) as Record<string, unknown>;
    const entity = text(source.entity);
    const code = text(source.code);
    const label = text(source.label);
    const dataType = text(source.data_type || "text");
    if (!ENTITIES.has(entity)) throw new BadRequestException("Varlıq customer, product, branch və ya user olmalıdır");
    if (!/^[a-z][a-z0-9_]*$/.test(code)) throw new BadRequestException("Sahə kodu kiçik latın hərfləri ilə yazılmalıdır");
    if (!label) throw new BadRequestException("Sahə adı məcburidir");
    if (!TYPES.has(dataType)) throw new BadRequestException("Sahə tipi text, number, money, date və ya boolean olmalıdır");
    const row = await this.prisma.fieldDefinition.upsert({
      where: { entity_code: { entity, code } },
      update: { label, dataType, required: source.required === true, active: source.active !== false },
      create: {
        entity,
        code,
        label,
        dataType,
        required: source.required === true,
        active: source.active !== false,
      },
    });
    return { data: this.presentField(row) };
  }

  async removeField(id: number) {
    const row = await this.prisma.fieldDefinition.findUnique({ where: { id } });
    if (!row) throw new NotFoundException("Sahə tapılmadı");
    await this.prisma.fieldDefinition.delete({ where: { id } });
    return { data: { deleted: true } };
  }

  private presentField(row: { id: number; entity: string; code: string; label: string; dataType: string; required: boolean; active: boolean }) {
    return {
      id: row.id,
      entity: row.entity,
      code: row.code,
      label: row.label,
      data_type: row.dataType,
      required: row.required,
      active: row.active,
    };
  }
}
