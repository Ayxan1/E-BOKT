import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";

export const IS_PUBLIC = "isPublic";
export const PERMISSIONS = "permissions";
export const Public = () => SetMetadata(IS_PUBLIC, true);
export const RequirePermissions = (...codes: string[]) => SetMetadata(PERMISSIONS, codes);

export type AuthUser = {
  id: number;
  username: string;
  fullName: string;
  admin: boolean;
  branchId: number;
  permissions: string[];
};

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<{ headers: { authorization?: string }; user?: AuthUser }>();
    const header = request.headers.authorization;
    if (!header?.startsWith("Bearer ")) throw new UnauthorizedException("Sessiya tapılmadı");

    let userId: number;
    try {
      const payload = await this.jwt.verifyAsync<{ sub: number }>(header.slice(7));
      userId = payload.sub;
    } catch {
      throw new UnauthorizedException("Sessiya etibarsızdır");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } },
    });
    if (!user || user.status !== "ACTIVE") throw new UnauthorizedException("İstifadəçi aktiv deyil");

    const permissions = [
      ...new Set(user.roles.flatMap((link) => link.role.permissions.map((item) => item.permission.code))),
    ];
    request.user = {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      admin: user.admin,
      branchId: user.branchId,
      permissions,
    };

    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (required?.length && !user.admin && !required.every((code) => permissions.includes(code))) {
      throw new ForbiddenException("Bu əməliyyat üçün icazə yoxdur");
    }
    return true;
  }
}
