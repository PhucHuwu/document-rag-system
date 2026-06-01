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
  getScope(@Query("userId") userId = "user_hr", @Query("assistantId") assistantId = "asst_hr") {
    return {
      userId,
      assistantId,
      userFolderScope: this.devData.getUserFolderScope(userId),
      assistantFolderScope: this.devData.getAssistantFolderScope(assistantId),
      effectiveFolderScope: this.devData.getEffectiveFolderScope(userId, assistantId)
    };
  }
}
