import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { RoleCode, UserStatus } from "@prisma/client";
import { hash } from "bcryptjs";
import type { AuthUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  list(user: AuthUser) {
    if (user.role === "super_admin") {
      return this.prisma.user.findMany({
        select: this.publicSelect,
        orderBy: { createdAt: "asc" }
      });
    }

    if (!user.workspaceId) return [];
    return this.prisma.user.findMany({
      where: { workspaceId: user.workspaceId },
      select: this.publicSelect,
      orderBy: { createdAt: "asc" }
    });
  }

  async create(user: AuthUser, input: { email: string; name: string; password: string; role?: RoleCode; workspaceId?: string }) {
    const workspaceId = this.resolveWorkspaceId(user, input.workspaceId);
    const role = input.role ?? "employee";

    if (role === "super_admin" || role === "system_admin") {
      if (user.role !== "super_admin") throw new ForbiddenException("Only Super Admin can create platform admins");
    }

    if ((role === "workspace_owner" || role === "employee") && !workspaceId) {
      throw new BadRequestException("workspaceId is required for workspace users");
    }

    const created = await this.prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash: await hash(input.password, 12),
        role,
        workspaceId
      },
      select: this.publicSelect
    });

    return created;
  }

  async update(
    actor: AuthUser,
    userId: string,
    input: { name?: string; status?: UserStatus; role?: RoleCode; password?: string }
  ) {
    const target = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!target) throw new NotFoundException("User not found");
    this.assertCanManageUser(actor, target.workspaceId);

    if ((input.role === "super_admin" || input.role === "system_admin") && actor.role !== "super_admin") {
      throw new ForbiddenException("Only Super Admin can assign platform roles");
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        name: input.name,
        status: input.status,
        role: input.role,
        passwordHash: input.password ? await hash(input.password, 12) : undefined
      },
      select: this.publicSelect
    });
  }

  private resolveWorkspaceId(user: AuthUser, requestedWorkspaceId?: string) {
    if (user.role === "super_admin") return requestedWorkspaceId ?? null;
    if (!user.workspaceId) throw new ForbiddenException("Missing workspace context");
    if (requestedWorkspaceId && requestedWorkspaceId !== user.workspaceId) {
      throw new ForbiddenException("Cannot manage users outside current workspace");
    }
    return user.workspaceId;
  }

  private assertCanManageUser(user: AuthUser, targetWorkspaceId: string | null) {
    if (user.role === "super_admin") return;
    if (!user.workspaceId || user.workspaceId !== targetWorkspaceId) {
      throw new ForbiddenException("Cannot manage users outside current workspace");
    }
  }

  private readonly publicSelect = {
    id: true,
    workspaceId: true,
    email: true,
    name: true,
    role: true,
    status: true,
    createdAt: true,
    updatedAt: true
  };
}
