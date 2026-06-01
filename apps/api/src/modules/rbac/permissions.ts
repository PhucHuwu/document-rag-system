import type { RoleCode } from "@prisma/client";

export type PermissionCode =
  | "platform:workspace:manage"
  | "workspace:user:manage"
  | "workspace:role:assign"
  | "workspace:document:manage"
  | "workspace:folder:manage"
  | "workspace:folder:assign"
  | "workspace:assistant:manage"
  | "workspace:assistant:assign"
  | "workspace:ai:configure"
  | "chat:send_message";

const rolePermissions: Record<RoleCode, PermissionCode[]> = {
  super_admin: [
    "platform:workspace:manage",
    "workspace:user:manage",
    "workspace:role:assign",
    "workspace:document:manage",
    "workspace:folder:manage",
    "workspace:folder:assign",
    "workspace:assistant:manage",
    "workspace:assistant:assign",
    "workspace:ai:configure",
    "chat:send_message"
  ],
  system_admin: [],
  workspace_owner: [
    "workspace:user:manage",
    "workspace:role:assign",
    "workspace:document:manage",
    "workspace:folder:manage",
    "workspace:folder:assign",
    "workspace:assistant:manage",
    "workspace:assistant:assign",
    "workspace:ai:configure",
    "chat:send_message"
  ],
  employee: ["chat:send_message"]
};

export function roleHasPermission(role: RoleCode, permission: PermissionCode) {
  return rolePermissions[role].includes(permission);
}
