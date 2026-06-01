import { Controller, Get, Query } from "@nestjs/common";
import { DevDataService } from "./dev-data.service";

@Controller("dev")
export class DevDataController {
  constructor(private readonly devData: DevDataService) {}

  @Get("workspaces")
  listWorkspaces() {
    return this.devData.listWorkspaces();
  }

  @Get("users")
  listUsers(@Query("workspaceId") workspaceId?: string) {
    return this.devData.listUsers(workspaceId);
  }

  @Get("folders")
  listFolders(@Query("workspaceId") workspaceId?: string) {
    return this.devData.listFolders(workspaceId);
  }

  @Get("assistants")
  listAssistants(@Query("workspaceId") workspaceId?: string) {
    return this.devData.listAssistants(workspaceId);
  }

  @Get("scope")
  async getScope(@Query("userId") userId: string, @Query("assistantId") assistantId = "asst_hr") {
    const resolvedUserId = userId ?? (await this.devData.listUsers()).find((user) => user.email === "hr@tina.local")?.id;

    if (!resolvedUserId) return { error: "No demo user found. Run prisma seed first." };

    return {
      userId: resolvedUserId,
      assistantId,
      userFolderScope: await this.devData.getUserFolderScope(resolvedUserId),
      assistantFolderScope: await this.devData.getAssistantFolderScope(assistantId),
      effectiveFolderScope: await this.devData.getEffectiveFolderScope(resolvedUserId, assistantId)
    };
  }
}
