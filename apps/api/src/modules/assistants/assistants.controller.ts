import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import type { AssistantStatus } from "@prisma/client";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthUser } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RequirePermissions } from "../rbac/permissions.decorator";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { AssistantsService } from "./assistants.service";

type CreateAssistantRequest = { name: string; description?: string; topK?: number; rerankTopN?: number; temperature?: number };
type UpdateAssistantRequest = {
  name?: string;
  description?: string;
  status?: AssistantStatus;
  topK?: number;
  rerankTopN?: number;
  temperature?: number;
};
type KnowledgeSourceRequest = { folderId: string };
type AssignUserRequest = { userId: string };

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("assistants")
export class AssistantsController {
  constructor(private readonly assistants: AssistantsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.assistants.list(user);
  }

  @RequirePermissions("workspace:assistant:manage")
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() body: CreateAssistantRequest) {
    return this.assistants.create(user, body);
  }

  @RequirePermissions("workspace:assistant:manage")
  @Patch(":assistantId")
  update(@CurrentUser() user: AuthUser, @Param("assistantId") assistantId: string, @Body() body: UpdateAssistantRequest) {
    return this.assistants.update(user, assistantId, body);
  }

  @RequirePermissions("workspace:assistant:manage")
  @Delete(":assistantId")
  remove(@CurrentUser() user: AuthUser, @Param("assistantId") assistantId: string) {
    return this.assistants.remove(user, assistantId);
  }

  @RequirePermissions("workspace:ai:configure")
  @Post(":assistantId/knowledge-sources")
  addKnowledgeSource(
    @CurrentUser() user: AuthUser,
    @Param("assistantId") assistantId: string,
    @Body() body: KnowledgeSourceRequest
  ) {
    return this.assistants.addKnowledgeSource(user, assistantId, body);
  }

  @RequirePermissions("workspace:ai:configure")
  @Delete(":assistantId/knowledge-sources/:folderId")
  removeKnowledgeSource(
    @CurrentUser() user: AuthUser,
    @Param("assistantId") assistantId: string,
    @Param("folderId") folderId: string
  ) {
    return this.assistants.removeKnowledgeSource(user, assistantId, folderId);
  }

  @RequirePermissions("workspace:assistant:assign")
  @Post(":assistantId/assignments")
  assignUser(@CurrentUser() user: AuthUser, @Param("assistantId") assistantId: string, @Body() body: AssignUserRequest) {
    return this.assistants.assignUser(user, assistantId, body);
  }

  @RequirePermissions("workspace:assistant:assign")
  @Delete(":assistantId/assignments/:userId")
  revokeUser(@CurrentUser() user: AuthUser, @Param("assistantId") assistantId: string, @Param("userId") userId: string) {
    return this.assistants.revokeUser(user, assistantId, userId);
  }
}
