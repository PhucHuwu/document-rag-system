import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { AssistantStatus } from "@prisma/client";
import type { AuthUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AssistantsService {
  constructor(private readonly prisma: PrismaService) {}

  list(user: AuthUser) {
    const workspaceId = this.requireWorkspace(user);
    return this.prisma.assistant.findMany({
      where: { workspaceId },
      include: { knowledgeSources: true, assignments: true },
      orderBy: { createdAt: "asc" }
    });
  }

  create(
    user: AuthUser,
    input: { name: string; description?: string; topK?: number; rerankTopN?: number; temperature?: number }
  ) {
    const workspaceId = this.requireWorkspace(user);
    return this.prisma.assistant.create({
      data: {
        workspaceId,
        name: input.name,
        description: input.description,
        topK: input.topK ?? 40,
        rerankTopN: input.rerankTopN ?? 8,
        temperature: input.temperature ?? 0.2
      }
    });
  }

  async update(
    user: AuthUser,
    assistantId: string,
    input: { name?: string; description?: string; status?: AssistantStatus; topK?: number; rerankTopN?: number; temperature?: number }
  ) {
    const workspaceId = this.requireWorkspace(user);
    await this.assertAssistantInWorkspace(workspaceId, assistantId);

    return this.prisma.assistant.update({
      where: { id: assistantId },
      data: input
    });
  }

  async remove(user: AuthUser, assistantId: string) {
    const workspaceId = this.requireWorkspace(user);
    await this.assertAssistantInWorkspace(workspaceId, assistantId);
    return this.prisma.assistant.delete({ where: { id: assistantId } });
  }

  async addKnowledgeSource(user: AuthUser, assistantId: string, input: { folderId: string }) {
    const workspaceId = this.requireWorkspace(user);
    await this.assertAssistantInWorkspace(workspaceId, assistantId);
    await this.assertFolderInWorkspace(workspaceId, input.folderId);

    return this.prisma.assistantKnowledgeSource.upsert({
      where: { assistantId_folderId: { assistantId, folderId: input.folderId } },
      update: {},
      create: { workspaceId, assistantId, folderId: input.folderId }
    });
  }

  async removeKnowledgeSource(user: AuthUser, assistantId: string, folderId: string) {
    const workspaceId = this.requireWorkspace(user);
    await this.assertAssistantInWorkspace(workspaceId, assistantId);
    await this.assertFolderInWorkspace(workspaceId, folderId);

    return this.prisma.assistantKnowledgeSource.delete({
      where: { assistantId_folderId: { assistantId, folderId } }
    });
  }

  async assignUser(user: AuthUser, assistantId: string, input: { userId: string }) {
    const workspaceId = this.requireWorkspace(user);
    await this.assertAssistantInWorkspace(workspaceId, assistantId);

    const targetUser = await this.prisma.user.findUnique({ where: { id: input.userId } });
    if (!targetUser || targetUser.workspaceId !== workspaceId) {
      throw new ForbiddenException("Cannot assign assistant to user outside workspace");
    }

    return this.prisma.assistantAssignment.upsert({
      where: { assistantId_userId: { assistantId, userId: input.userId } },
      update: {},
      create: { workspaceId, assistantId, userId: input.userId }
    });
  }

  async revokeUser(user: AuthUser, assistantId: string, targetUserId: string) {
    const workspaceId = this.requireWorkspace(user);
    await this.assertAssistantInWorkspace(workspaceId, assistantId);

    return this.prisma.assistantAssignment.delete({
      where: { assistantId_userId: { assistantId, userId: targetUserId } }
    });
  }

  private requireWorkspace(user: AuthUser) {
    if (!user.workspaceId) throw new ForbiddenException("Workspace context is required");
    return user.workspaceId;
  }

  private async assertAssistantInWorkspace(workspaceId: string, assistantId: string) {
    const assistant = await this.prisma.assistant.findFirst({ where: { id: assistantId, workspaceId } });
    if (!assistant) throw new NotFoundException("Assistant not found");
    return assistant;
  }

  private async assertFolderInWorkspace(workspaceId: string, folderId: string) {
    const folder = await this.prisma.folder.findFirst({ where: { id: folderId, workspaceId } });
    if (!folder) throw new BadRequestException("Folder is not valid for current workspace");
    return folder;
  }
}
