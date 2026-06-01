import { Injectable, NotFoundException } from "@nestjs/common";
import type { Assistant, ChatSession, Folder, FolderAccessControl, User, Workspace } from "./dev-data.types";

@Injectable()
export class DevDataService {
  private readonly workspaces: Workspace[] = [
    { id: "ws_demo", name: "Tina Demo Company", status: "active" }
  ];

  private readonly users: User[] = [
    {
      id: "user_owner",
      workspaceId: "ws_demo",
      email: "owner@tina.local",
      name: "Workspace Owner",
      role: "workspace_owner"
    },
    {
      id: "user_hr",
      workspaceId: "ws_demo",
      email: "hr@tina.local",
      name: "HR Employee",
      role: "employee"
    },
    {
      id: "user_it",
      workspaceId: "ws_demo",
      email: "it@tina.local",
      name: "IT Employee",
      role: "employee"
    }
  ];

  private readonly folders: Folder[] = [
    { id: "folder_root", workspaceId: "ws_demo", parentId: null, name: "Tri thức công ty" },
    { id: "folder_hr", workspaceId: "ws_demo", parentId: "folder_root", name: "HR" },
    { id: "folder_hr_policy", workspaceId: "ws_demo", parentId: "folder_hr", name: "Chính sách nhân sự" },
    { id: "folder_recruitment", workspaceId: "ws_demo", parentId: "folder_hr", name: "Tuyển dụng" },
    { id: "folder_it", workspaceId: "ws_demo", parentId: "folder_root", name: "IT" },
    { id: "folder_it_ops", workspaceId: "ws_demo", parentId: "folder_it", name: "Quy trình vận hành" }
  ];

  private readonly folderAccessControls: FolderAccessControl[] = [
    { workspaceId: "ws_demo", userId: "user_owner", folderId: "folder_root", accessType: "read" },
    { workspaceId: "ws_demo", userId: "user_hr", folderId: "folder_hr", accessType: "read" },
    { workspaceId: "ws_demo", userId: "user_it", folderId: "folder_it", accessType: "read" }
  ];

  private readonly assistants: Assistant[] = [
    {
      id: "asst_company",
      workspaceId: "ws_demo",
      name: "Trợ lý Công ty",
      status: "active",
      allowedFolderIds: ["folder_root"],
      assignedUserIds: ["user_owner"],
      topK: 40,
      rerankTopN: 8
    },
    {
      id: "asst_hr",
      workspaceId: "ws_demo",
      name: "Trợ lý HR",
      status: "active",
      allowedFolderIds: ["folder_hr"],
      assignedUserIds: ["user_owner", "user_hr"],
      topK: 40,
      rerankTopN: 8
    },
    {
      id: "asst_it",
      workspaceId: "ws_demo",
      name: "Trợ lý IT",
      status: "active",
      allowedFolderIds: ["folder_it"],
      assignedUserIds: ["user_owner", "user_it"],
      topK: 40,
      rerankTopN: 8
    }
  ];

  private readonly sessions: ChatSession[] = [];

  listWorkspaces() {
    return this.workspaces;
  }

  listUsers(workspaceId = "ws_demo") {
    return this.users.filter((user) => user.workspaceId === workspaceId);
  }

  listFolders(workspaceId = "ws_demo") {
    return this.folders.filter((folder) => folder.workspaceId === workspaceId);
  }

  listAssistants(workspaceId = "ws_demo") {
    return this.assistants.filter((assistant) => assistant.workspaceId === workspaceId);
  }

  getWorkspace(workspaceId: string) {
    const workspace = this.workspaces.find((item) => item.id === workspaceId);
    if (!workspace) throw new NotFoundException("Workspace not found");
    return workspace;
  }

  getUser(userId: string) {
    const user = this.users.find((item) => item.id === userId);
    if (!user) throw new NotFoundException("User not found");
    return user;
  }

  getAssistant(assistantId: string) {
    const assistant = this.assistants.find((item) => item.id === assistantId);
    if (!assistant) throw new NotFoundException("Assistant not found");
    return assistant;
  }

  getFolderDescendantIds(workspaceId: string, rootFolderIds: string[]) {
    const result = new Set<string>();
    const queue = [...rootFolderIds];

    while (queue.length > 0) {
      const currentId = queue.shift();
      if (!currentId || result.has(currentId)) continue;

      const folder = this.folders.find((item) => item.workspaceId === workspaceId && item.id === currentId);
      if (!folder) continue;

      result.add(folder.id);
      const children = this.folders.filter((item) => item.workspaceId === workspaceId && item.parentId === folder.id);
      queue.push(...children.map((child) => child.id));
    }

    return [...result];
  }

  getUserFolderScope(userId: string) {
    const user = this.getUser(userId);
    const directFolderIds = this.folderAccessControls
      .filter((item) => item.workspaceId === user.workspaceId && item.userId === user.id)
      .map((item) => item.folderId);

    return this.getFolderDescendantIds(user.workspaceId, directFolderIds);
  }

  getAssistantFolderScope(assistantId: string) {
    const assistant = this.getAssistant(assistantId);
    return this.getFolderDescendantIds(assistant.workspaceId, assistant.allowedFolderIds);
  }

  getEffectiveFolderScope(userId: string, assistantId: string) {
    const user = this.getUser(userId);
    const assistant = this.getAssistant(assistantId);
    const workspace = this.getWorkspace(user.workspaceId);

    if (workspace.status !== "active" || assistant.status !== "active") return [];
    if (assistant.workspaceId !== user.workspaceId) return [];
    if (!assistant.assignedUserIds.includes(user.id)) return [];

    const userScope = new Set(this.getUserFolderScope(user.id));
    const assistantScope = this.getAssistantFolderScope(assistant.id);

    return assistantScope.filter((folderId) => userScope.has(folderId));
  }

  createSession(userId: string, assistantId: string) {
    const user = this.getUser(userId);
    const assistant = this.getAssistant(assistantId);
    const session: ChatSession = {
      id: `session_${crypto.randomUUID()}`,
      workspaceId: user.workspaceId,
      userId: user.id,
      assistantId: assistant.id,
      createdAt: new Date().toISOString(),
      messages: []
    };

    this.sessions.push(session);
    return session;
  }

  getOrCreateSession(userId: string, assistantId: string, sessionId?: string) {
    if (sessionId) {
      const existing = this.sessions.find((session) => session.id === sessionId);
      if (existing) return existing;
    }

    return this.createSession(userId, assistantId);
  }

  addMessage(sessionId: string, role: "user" | "assistant", content: string) {
    const session = this.sessions.find((item) => item.id === sessionId);
    if (!session) throw new NotFoundException("Session not found");

    const message = {
      id: `msg_${crypto.randomUUID()}`,
      sessionId,
      role,
      content,
      createdAt: new Date().toISOString()
    };

    session.messages.push(message);
    return message;
  }
}
