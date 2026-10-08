const PERMISSION_CODE = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;

export function isPermissionCode(code: string): boolean {
  return PERMISSION_CODE.test(code);
}

export function crudCodes(resource: string): string[] {
  const name = resource.trim().toLowerCase();
  if (!/^[a-z][a-z0-9_]*$/.test(name)) {
    throw new Error("Resurs adı kiçik latın hərfləri ilə yazılmalıdır");
  }
  return ["create", "read", "update", "delete"].map((action) => `${name}.${action}`);
}

export const SEEDED_PERMISSIONS = [
  "branch.read",
  "branch.create",
  "branch.update",
  "branch.delete",
  "user.read",
  "user.create",
  "user.update",
  "user.delete",
  "customer.read",
  "customer.create",
  "customer.update",
  "customer.delete",
  "product.read",
  "product.create",
  "product.update",
  "product.delete",
  "role.read",
  "role.create",
  "role.update",
  "role.delete",
  "dictionary.read",
  "dictionary.manage",
  "field.read",
  "field.manage",
  "ledger.read",
  "ledger.post",
  "loan.read",
  "loan.create",
  "loan.update",
  "loan.delete",
  "loan.post",
  "collateral.read",
  "collateral.create",
  "collateral.update",
  "collateral.delete",
  "eod.read",
  "eod.run",
] as const;
