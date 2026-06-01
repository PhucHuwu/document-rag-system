import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { AuthUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class FoldersService {
  constructor(private readonly prisma: PrismaService) {}

  list(user: AuthUser) {
    const workspaceId = this.requireWorkspace(user);
    return this.prisma.folder.findMany({ where: { workspaceId }, orderBy: { createdAt: "asc" } });
  }

  async create(user: AuthUser, input: { name: string; parentId?: string | null }) {
    const workspaceId = this.requireWorkspace(user);

    if (input.parentId) {
      await this.assertFolderInWorkspace(workspaceId, input.parentId);
    }

    return this.prisma.folder.create({
      data: { workspaceId, name: input.name, parentId: input.parentId ?? null }
    });
  }

  async update(user: AuthUser, folderId: string, input: { name?: string; parentId?: string | null }) {
    const workspaceId = this.requireWorkspace(user);
    await this.assertFolderInWorkspace(workspaceId, folderId);

    if (input.parentId) {
      if (input.parentId === folderId) throw new BadRequestException("Folder cannot be its own parent");
      await this.assertFolderInWorkspace(workspaceId, input.parentId);
    }

    return this.prisma.folder.update({
      where: { id: folderId },
      data: { name: input.name, parentId: input.parentId }
    });
  }

  async remove(user: AuthUser, folderId: string) {
    const workspaceId = this.requireWorkspace(user);
    await this.assertFolderInWorkspace(workspaceId, folderId);

    const childCount = await this.prisma.folder.count({ where: { parentId: folderId } });
    if (childCount > 0) throw new BadRequestException("Cannot delete folder with child folders");

    const documentCount = await this.prisma.document.count({ where: { folderId } });
    if (documentCount > 0) throw new BadRequestException("Cannot delete folder with documents");

    return this.prisma.folder.delete({ where: { id: folderId } });
  }

  async assignAccess(user: AuthUser, folderId: string, input: { userId: string }) {
    const workspaceId = this.requireWorkspace(user);
    await this.assertFolderInWorkspace(workspaceId, folderId);

    const targetUser = await this.prisma.user.findUnique({ where: { id: input.userId } });
    if (!targetUser || targetUser.workspaceId !== workspaceId) {
      throw new ForbiddenException("Cannot assign folder to user outside workspace");
    }

    return this.prisma.folderAccessControl.upsert({
      where: { userId_folderId_accessType: { userId: input.userId, folderId, accessType: "read" } },
      update: {},
      create: { workspaceId, userId: input.userId, folderId, accessType: "read" }
    });
  }

  async revokeAccess(user: AuthUser, folderId: string, targetUserId: string) {
    const workspaceId = this.requireWorkspace(user);
    await this.assertFolderInWorkspace(workspaceId, folderId);

    return this.prisma.folderAccessControl.delete({
      where: { userId_folderId_accessType: { userId: targetUserId, folderId, accessType: "read" } }
    });
  }

  private requireWorkspace(user: AuthUser) {
    if (!user.workspaceId) throw new ForbiddenException("Workspace context is required");
    return user.workspaceId;
  }

  private async assertFolderInWorkspace(workspaceId: string, folderId: string) {
    const folder = await this.prisma.folder.findFirst({ where: { id: folderId, workspaceId } });
    if (!folder) throw new NotFoundException("Folder not found");
    return folder;
  }
}
