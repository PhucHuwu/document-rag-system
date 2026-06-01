import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Prisma } from "@prisma/client";
import type { AuthUser } from "../auth/auth.types";
import { DevDataService } from "../dev-data/dev-data.service";
import { PrismaService } from "../prisma/prisma.service";

type ChatRequest = {
  question: string;
  assistantId?: string;
  sessionId?: string;
};

@Injectable()
export class ChatService {
  constructor(
    private readonly config: ConfigService,
    private readonly devData: DevDataService,
    private readonly prisma: PrismaService
  ) {}

  async sendMessage(authUser: AuthUser, input: ChatRequest) {
    if (!authUser.workspaceId) {
      throw new ForbiddenException("Platform users cannot chat without workspace context in dev backend.");
    }

    if (!input.question?.trim()) {
      throw new BadRequestException("Question is required");
    }

    const aiBackendUrl = this.config.get<string>("AI_BACKEND_URL", "http://localhost:8000");
    const assistantId = input.assistantId ?? "asst_hr";
    const user = await this.devData.getUser(authUser.id);
    const assistant = await this.devData.getAssistant(assistantId);

    this.devData.assertSameWorkspace(user, assistant);

    const [userFolderScope, assistantFolderScope, effectiveScope] = await Promise.all([
      this.devData.getUserFolderScope(user.id),
      this.devData.getAssistantFolderScope(assistant.id),
      this.devData.getEffectiveFolderScope(user.id, assistant.id)
    ]);

    if (effectiveScope.length === 0) {
      throw new ForbiddenException("Bạn không có quyền truy cập tri thức phù hợp cho assistant này.");
    }

    const session = await this.getOrCreateSession(user.id, authUser.workspaceId, assistant.id, input.sessionId);

    await this.prisma.chatMessage.create({
      data: {
        workspaceId: authUser.workspaceId,
        sessionId: session.id,
        userId: user.id,
        role: "user",
        content: input.question
      }
    });

    const startedAt = Date.now();

    const response = await fetch(`${aiBackendUrl}/rag/query`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        workspace_id: user.workspaceId,
        user_id: user.id,
        assistant_id: assistant.id,
        question: input.question,
        allowed_folder_ids: effectiveScope,
        allowed_document_ids: [],
        top_k: assistant.topK,
        rerank_top_n: assistant.rerankTopN
      })
    });

    if (!response.ok) {
      return {
        answer: "AI Backend hiện không thể xử lý yêu cầu.",
        sources: []
      };
    }

    const aiResult = await response.json();
    const latencyMs = Date.now() - startedAt;
    const sources = (aiResult.sources ?? []) as Prisma.InputJsonValue;

    await this.prisma.chatMessage.create({
      data: {
        workspaceId: authUser.workspaceId,
        sessionId: session.id,
        role: "assistant",
        content: aiResult.answer ?? "",
        sources
      }
    });

    await this.prisma.retrievalTrace.create({
      data: {
        workspaceId: authUser.workspaceId,
        sessionId: session.id,
        userId: user.id,
        assistantId: assistant.id,
        question: input.question,
        userFolderScope,
        assistantFolderScope,
        effectiveFolderScope: effectiveScope,
        qdrantFilter: aiResult.debug?.qdrant_filter ?? undefined,
        retrievedChunkIds: aiResult.debug?.retrieved_chunk_ids ?? [],
        llmProvider: aiResult.debug?.llm_provider ?? "openrouter",
        llmModel: aiResult.debug?.llm_model ?? "unknown",
        latencyMs
      }
    });

    return {
      sessionId: session.id,
      workspaceId: user.workspaceId,
      userId: user.id,
      assistantId: assistant.id,
      effectiveFolderScope: effectiveScope,
      ...aiResult
    };
  }

  private async getOrCreateSession(userId: string, workspaceId: string, assistantId: string, sessionId?: string) {
    if (sessionId) {
      const existing = await this.prisma.chatSession.findFirst({
        where: { id: sessionId, userId, workspaceId, assistantId }
      });

      if (existing) return existing;
    }

    return this.prisma.chatSession.create({
      data: {
        workspaceId,
        userId,
        assistantId,
        title: "New chat"
      }
    });
  }
}
