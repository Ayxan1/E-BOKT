import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { SEEDED_PERMISSIONS } from "@ebokt/domain";

const prisma = new PrismaClient();

async function main() {
  const branch = await prisma.branch.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: "Baş ofis",
      address: "Bakı, Nəsimi rayonu",
      phoneNumber: "+994124000000",
      director: "Admin",
      headOffice: true,
    },
  });

  for (const code of SEEDED_PERMISSIONS) {
    await prisma.permission.upsert({ where: { code }, update: {}, create: { code } });
  }
  const permissions = await prisma.permission.findMany();

  const adminRole = await prisma.role.upsert({
    where: { name: "Administrator" },
    update: {},
    create: { name: "Administrator", description: "Tam idarəetmə" },
  });
  const operatorRole = await prisma.role.upsert({
    where: { name: "Operator" },
    update: {},
    create: { name: "Operator", description: "Gündəlik qeydiyyat" },
  });

  await prisma.rolePermission.deleteMany({ where: { roleId: adminRole.id } });
  await prisma.rolePermission.createMany({
    data: permissions.map((permission) => ({ roleId: adminRole.id, permissionId: permission.id })),
  });
  const operatorCodes = new Set([
    "branch.read",
    "user.read",
    "customer.read",
    "customer.create",
    "customer.update",
    "product.read",
    "dictionary.read",
    "field.read",
    "ledger.read",
    "loan.read",
    "loan.create",
    "loan.update",
    "collateral.read",
    "collateral.create",
    "collateral.update",
    "eod.read",
  ]);
  const operatorLinks = await prisma.rolePermission.findMany({
    where: { roleId: operatorRole.id },
    include: { permission: true },
  });
  const operatorHas = new Set(operatorLinks.map((link) => link.permission.code));
  await prisma.rolePermission.createMany({
    data: permissions
      .filter((permission) => operatorCodes.has(permission.code) && !operatorHas.has(permission.code))
      .map((permission) => ({ roleId: operatorRole.id, permissionId: permission.id })),
  });

  const passwordHash = await bcrypt.hash("Admin123!", 10);
  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: { passwordHash, status: "ACTIVE", failedAttempts: 0 },
    create: {
      username: "admin",
      fullName: "Sistem inzibatçısı",
      phoneNumber: "+994501000000",
      status: "ACTIVE",
      admin: true,
      branchId: branch.id,
      passwordHash,
      note: "İlkin inzibatçı",
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: adminRole.id } },
    update: {},
    create: { userId: admin.id, roleId: adminRole.id },
  });

  const operatorHash = await bcrypt.hash("Operator123!", 10);
  const operator = await prisma.user.upsert({
    where: { username: "operator" },
    update: {},
    create: {
      username: "operator",
      fullName: "Operator",
      phoneNumber: "",
      status: "ACTIVE",
      admin: false,
      branchId: branch.id,
      passwordHash: operatorHash,
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: operator.id, roleId: operatorRole.id } },
    update: {},
    create: { userId: operator.id, roleId: operatorRole.id },
  });

  const dictionaries: { group: string; code: string; label: string }[] = [
    { group: "CURRENCY", code: "AZN", label: "AZN" },
    { group: "CURRENCY", code: "USD", label: "USD" },
    { group: "CURRENCY", code: "EUR", label: "EUR" },
    { group: "COLLATERAL_TYPE", code: "PRECIOUS", label: "Qiymətli əşya" },
    { group: "COLLATERAL_TYPE", code: "REAL_ESTATE", label: "Daşınmaz əmlak" },
    { group: "COLLATERAL_TYPE", code: "VEHICLE", label: "Nəqliyyat" },
    { group: "COLLATERAL_TYPE", code: "OTHER", label: "Digər" },
    { group: "COLLATERAL_TYPE", code: "GUARANTOR", label: "Zamin" },
    { group: "UNIT", code: "GRAM", label: "Qram" },
    { group: "FINENESS", code: "585", label: "585" },
    { group: "FINENESS", code: "750", label: "750" },
    { group: "FINENESS", code: "875", label: "875" },
    { group: "FINENESS", code: "916", label: "916" },
    { group: "FINENESS", code: "999", label: "999" },
    { group: "STANDARD", code: "STANDARD", label: "Standart" },
    { group: "ACTIVITY_CODE", code: "47.11", label: "Pərakəndə ticarət" },
    { group: "ACTIVITY_CODE", code: "41.20", label: "Yaşayış binalarının tikintisi" },
    { group: "ACTIVITY_CODE", code: "64.92", label: "Digər kredit fəaliyyəti" },
    { group: "SECTOR", code: "TRADE", label: "Ticarət" },
    { group: "SECTOR", code: "CONSTRUCTION", label: "Tikinti" },
    { group: "SECTOR", code: "FINANCE", label: "Maliyyə" },
    { group: "SECTOR", code: "SERVICE", label: "Xidmət" },
    { group: "CITIZENSHIP", code: "AZ", label: "Azərbaycan" },
    { group: "CITIZENSHIP", code: "OTHER", label: "Digər" },
  ];
  for (const [index, item] of dictionaries.entries()) {
    await prisma.dictionaryItem.upsert({
      where: { group_code: { group: item.group, code: item.code } },
      update: { label: item.label },
      create: { ...item, sortOrder: index },
    });
  }

  const accounts = [
    ["1000", "Kassa", "ASSET"],
    ["1100", "Kredit portfeli", "ASSET"],
    ["1200", "Faiz tələbi", "ASSET"],
    ["1300", "Cərimə tələbi", "ASSET"],
    ["4000", "Komissiya gəliri", "INCOME"],
    ["9000", "Balansdankənar girov", "OFF_BALANCE"],
    ["9100", "Girov kontr-hesabı", "OFF_BALANCE"],
  ] as const;
  for (const [code, name, accountType] of accounts) {
    await prisma.account.upsert({
      where: { code },
      update: { name, accountType },
      create: { code, name, accountType, currency: "AZN" },
    });
  }

  const today = new Date();
  await prisma.businessCalendar.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, businessDate: new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
