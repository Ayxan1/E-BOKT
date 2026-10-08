import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(username: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { username: username.trim() } });
    if (!user) throw new UnauthorizedException("İstifadəçi adı və ya şifrə yanlışdır");
    if (user.status !== "ACTIVE") throw new UnauthorizedException("İstifadəçi aktiv deyil");
    if (user.failedAttempts >= user.maxFailedAttempts) {
      throw new UnauthorizedException("Giriş cəhdləri bitib. Şifrə sıfırlanmalıdır");
    }
    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedAttempts: { increment: 1 } },
      });
      throw new UnauthorizedException("İstifadəçi adı və ya şifrə yanlışdır");
    }
    await this.prisma.user.update({ where: { id: user.id }, data: { failedAttempts: 0 } });
    const accessToken = await this.jwt.signAsync({ sub: user.id, username: user.username });
    const profile = await this.me(user.id);
    return { data: { access_token: accessToken, user: profile.data } };
  }

  async me(id: number) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id },
      include: {
        branch: true,
        roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
      },
    });
    const permissions = [
      ...new Set(user.roles.flatMap((link) => link.role.permissions.map((item) => item.permission.code))),
    ];
    return {
      data: {
        id: user.id,
        username: user.username,
        user_full_name: user.fullName,
        admin: user.admin,
        branch_id: user.branchId,
        branch_name: user.branch.name,
        permissions,
        roles: user.roles.map((link) => ({ id: link.role.id, name: link.role.name })),
      },
    };
  }
}
