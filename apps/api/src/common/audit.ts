import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async write(entity: string, entityId: string | number, action: string, userId: number | null, payload: unknown) {
    await this.prisma.auditLog.create({
      data: {
        entity,
        entityId: String(entityId),
        action,
        userId,
        payload: payload as Prisma.InputJsonValue,
      },
    });
  }
}
