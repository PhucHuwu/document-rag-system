import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { Assistant, User } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class DevDataService {
  constructor(private readonly prisma: PrismaService) {}

  listWorkspaces() {
    return this.prisma.workspace.findMany({ orderBy: { createdAt: "asc" } });
  }

  listUsers(workspaceId?: string) {
    return this.prisma.user.findMany({
      where: workspaceId ? { workspaceId } : undefined,
      select: { id: true, workspaceId: true, email: true, name: true, role: true, status: true, createdAt: true },
      orderBy: { createdAt: "asc" }
    });
  }

  listFolders(workspaceId?: string) {
    return this.prisma.folder.findMany({
      where: workspaceId ? { workspaceId } : undefined,
      orderBy: { createdAt: "asc" }
    });
  }

  listAssistants(workspaceId?: string) {
    return this.prisma.assistant.findMany({
      where: workspaceId ? { workspaceId } : undefined,
      include: { knowledgeSources: true, assignments: true },
      orderBy: { createdAt: "asc" }
    });
  }

  async getUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");
    return user;
  }

  async getAssistant(assistantId: string) {
    const assistant = await this.prisma.assistant.findUnique({ where: { id: assistantId } });
    if (!assistant) throw new NotFoundException("Assistant not found");
    return assistant;
  }

  async getFolderDescendantIds(workspaceId: string, rootFolderIds: string[]) {
    const result = new Set<string>();
    const queue = [...rootFolderIds];

    while (queue.length > 0) {
      const currentId = queue.shift();
      if (!currentId || result.has(currentId)) continue;

      const folder = await this.prisma.folder.findFirst({ where: { id: currentId, workspaceId } });
      if (!folder) continue;

      result.add(folder.id);

      const children = await this.prisma.folder.findMany({
        where: { workspaceId, parentId: folder.id },
        select: { id: true }
      });
      queue.push(...children.map((child) => child.id));
    }

    return [...result];
  }

  async getUserFolderScope(userId: string) {
    const user = await this.getUser(userId);
    if (!user.workspaceId) return [];

    const directAccess = await this.prisma.folderAccessControl.findMany({
      where: { workspaceId: user.workspaceId, userId: user.id, accessType: "read" },
      select: { folderId: true }
    });

    return this.getFolderDescendantIds(
      user.workspaceId,
      directAccess.map((item) => item.folderId)
    );
  }

  async getAssistantFolderScope(assistantId: string) {
    const assistant = await this.getAssistant(assistantId);
    const knowledgeSources = await this.prisma.assistantKnowledgeSource.findMany({
      where: { workspaceId: assistant.workspaceId, assistantId: assistant.id },
      select: { folderId: true }
    });

    return this.getFolderDescendantIds(
      assistant.workspaceId,
      knowledgeSources.map((item) => item.folderId)
    );
  }

  async getEffectiveFolderScope(userId: string, assistantId: string) {
    const user = await this.getUser(userId);
    const assistant = await this.getAssistant(assistantId);

    if (!user.workspaceId || user.status !== "active" || assistant.status !== "active") return [];
    if (assistant.workspaceId !== user.workspaceId) return [];

    const assignment = await this.prisma.assistantAssignment.findUnique({
      where: { assistantId_userId: { assistantId: assistant.id, userId: user.id } }
    });
    if (!assignment) return [];

    const userScope = new Set(await this.getUserFolderScope(user.id));
    const assistantScope = await this.getAssistantFolderScope(assistant.id);

    return assistantScope.filter((folderId) => userScope.has(folderId));
  }

  assertSameWorkspace(user: User, assistant: Assistant) {
    if (!user.workspaceId || user.workspaceId !== assistant.workspaceId) {
      throw new ForbiddenException("Assistant does not belong to user workspace");
    }
  }
}
