import type { RoleCode } from "@prisma/client";

export type AuthUser = {
  id: string;
  workspaceId: string | null;
  email: string;
  role: RoleCode;
};

export type JwtPayload = {
  sub: string;
  workspaceId: string | null;
  email: string;
  role: RoleCode;
};
