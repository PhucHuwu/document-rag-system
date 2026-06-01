import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

type ChatRequest = {
  question: string;
  assistantId?: string;
};

@Injectable()
export class ChatService {
  constructor(private readonly config: ConfigService) {}

  async sendMessage(input: ChatRequest) {
    const aiBackendUrl = this.config.get<string>("AI_BACKEND_URL", "http://localhost:8000");

    // Placeholder scope. Production code must compute this from auth, RBAC,
    // assistant_knowledge_sources and folder_access_controls.
    const effectiveScope = ["demo-folder"];

    if (effectiveScope.length === 0) {
      return {
        answer: "Bạn không có quyền truy cập tri thức phù hợp.",
        sources: []
      };
    }

    const response = await fetch(`${aiBackendUrl}/rag/query`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        workspace_id: "demo-workspace",
        user_id: "demo-user",
        assistant_id: input.assistantId ?? "demo-assistant",
        question: input.question,
        allowed_folder_ids: effectiveScope,
        allowed_document_ids: [],
        top_k: 40,
        rerank_top_n: 8
      })
    });

    if (!response.ok) {
      return {
        answer: "AI Backend hiện không thể xử lý yêu cầu.",
        sources: []
      };
    }

    return response.json();
  }
}
