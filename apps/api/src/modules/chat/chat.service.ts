import { ForbiddenException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DevDataService } from "../dev-data/dev-data.service";

type ChatRequest = {
  question: string;
  assistantId?: string;
  userId?: string;
  sessionId?: string;
};

@Injectable()
export class ChatService {
  constructor(
    private readonly config: ConfigService,
    private readonly devData: DevDataService
  ) {}

  async sendMessage(input: ChatRequest) {
    const aiBackendUrl = this.config.get<string>("AI_BACKEND_URL", "http://localhost:8000");
    const userId = input.userId ?? "user_hr";
    const assistantId = input.assistantId ?? "asst_hr";
    const user = this.devData.getUser(userId);
    const assistant = this.devData.getAssistant(assistantId);
    const effectiveScope = this.devData.getEffectiveFolderScope(user.id, assistant.id);

    if (effectiveScope.length === 0) {
      throw new ForbiddenException("Bạn không có quyền truy cập tri thức phù hợp cho assistant này.");
    }

    const session = this.devData.getOrCreateSession(user.id, assistant.id, input.sessionId);
    this.devData.addMessage(session.id, "user", input.question);

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
    this.devData.addMessage(session.id, "assistant", aiResult.answer ?? "");

    return {
      sessionId: session.id,
      workspaceId: user.workspaceId,
      userId: user.id,
      assistantId: assistant.id,
      effectiveFolderScope: effectiveScope,
      ...aiResult
    };
  }
}
