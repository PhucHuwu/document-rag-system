export type Workspace = {
  id: string;
  name: string;
  status: "active" | "inactive";
};

export type User = {
  id: string;
  workspaceId: string;
  email: string;
  name: string;
  role: "workspace_owner" | "employee";
};

export type Folder = {
  id: string;
  workspaceId: string;
  parentId: string | null;
  name: string;
};

export type Assistant = {
  id: string;
  workspaceId: string;
  name: string;
  status: "active" | "inactive";
  allowedFolderIds: string[];
  assignedUserIds: string[];
  topK: number;
  rerankTopN: number;
};

export type FolderAccessControl = {
  workspaceId: string;
  userId: string;
  folderId: string;
  accessType: "read";
};

export type ChatMessage = {
  id: string;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

export type ChatSession = {
  id: string;
  workspaceId: string;
  userId: string;
  assistantId: string;
  createdAt: string;
  messages: ChatMessage[];
};
