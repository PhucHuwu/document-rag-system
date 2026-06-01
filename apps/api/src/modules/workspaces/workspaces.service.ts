import { ForbiddenException, Injectable } from "@nestjs/common";
import type { WorkspaceStatus } from "@prisma/client";
import type { AuthUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  list(user: AuthUser) {
    if (user.role === "super_admin") {
      return this.prisma.workspace.findMany({ orderBy: { createdAt: "asc" } });
    }

    if (!user.workspaceId) return [];
    return this.prisma.workspace.findMany({ where: { id: user.workspaceId } });
  }

  create(user: AuthUser, input: { name: string; slug: string }) {
    this.assertPlatformAdmin(user);
    return this.prisma.workspace.create({ data: { name: input.name, slug: input.slug } });
  }

  update(user: AuthUser, workspaceId: string, input: { name?: string; status?: WorkspaceStatus }) {
    this.assertPlatformAdmin(user);
    return this.prisma.workspace.update({ where: { id: workspaceId }, data: input });
  }

  private assertPlatformAdmin(user: AuthUser) {
    if (user.role !== "super_admin") throw new ForbiddenException("Only Super Admin can manage workspaces");
  }
}
