import { UserRole } from "@prisma/client";

// Permission keys
type Permission =
  | "product:read"
  | "product:create"
  | "product:update"
  | "product:delete"
  | "category:read"
  | "category:create"
  | "category:update"
  | "category:delete"
  | "inventory:read"
  | "inventory:adjust"
  | "sale:read"
  | "sale:create"
  | "sale:cancel"
  | "customer:read"
  | "customer:create"
  | "customer:update"
  | "customer:delete"
  | "supplier:read"
  | "supplier:create"
  | "supplier:update"
  | "supplier:delete"
  | "expense:read"
  | "expense:create"
  | "expense:update"
  | "expense:delete"
  | "report:view"
  | "report:export"
  | "member:read"
  | "member:manage"
  | "org:settings"
  | "org:delete"
  | "auditlog:view"
  | "notification:read";

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  OWNER: [
    "product:read",
    "product:create",
    "product:update",
    "product:delete",
    "category:read",
    "category:create",
    "category:update",
    "category:delete",
    "inventory:read",
    "inventory:adjust",
    "sale:read",
    "sale:create",
    "sale:cancel",
    "customer:read",
    "customer:create",
    "customer:update",
    "customer:delete",
    "supplier:read",
    "supplier:create",
    "supplier:update",
    "supplier:delete",
    "expense:read",
    "expense:create",
    "expense:update",
    "expense:delete",
    "report:view",
    "report:export",
    "member:read",
    "member:manage",
    "org:settings",
    "org:delete",
    "auditlog:view",
    "notification:read",
  ],
  ADMIN: [
    "product:read",
    "product:create",
    "product:update",
    "product:delete",
    "category:read",
    "category:create",
    "category:update",
    "category:delete",
    "inventory:read",
    "inventory:adjust",
    "sale:read",
    "sale:create",
    "sale:cancel",
    "customer:read",
    "customer:create",
    "customer:update",
    "customer:delete",
    "supplier:read",
    "supplier:create",
    "supplier:update",
    "supplier:delete",
    "expense:read",
    "expense:create",
    "expense:update",
    "expense:delete",
    "report:view",
    "report:export",
    "member:read",
    "member:manage",
    "org:settings",
    "auditlog:view",
    "notification:read",
  ],
  MANAGER: [
    "product:read",
    "product:create",
    "product:update",
    "category:read",
    "category:create",
    "category:update",
    "inventory:read",
    "inventory:adjust",
    "sale:read",
    "sale:create",
    "sale:cancel",
    "customer:read",
    "customer:create",
    "customer:update",
    "supplier:read",
    "supplier:create",
    "supplier:update",
    "expense:read",
    "expense:create",
    "expense:update",
    "report:view",
    "report:export",
    "member:read",
    "notification:read",
  ],
  STAFF: [
    "product:read",
    "category:read",
    "inventory:read",
    "inventory:adjust",
    "sale:read",
    "sale:create",
    "customer:read",
    "notification:read",
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function requirePermission(
  role: UserRole,
  permission: Permission
): void {
  if (!hasPermission(role, permission)) {
    throw new Error(`Forbidden: role ${role} tidak memiliki izin ${permission}`);
  }
}

export { ROLE_PERMISSIONS };
export type { Permission };
