import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import type { WorkspaceStatus } from "@prisma/client";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import type { AuthUser } from "../auth/auth.types";
import { RequirePermissions } from "../rbac/permissions.decorator";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { WorkspacesService } from "./workspaces.service";

type CreateWorkspaceRequest = { name: string; slug: string };
type UpdateWorkspaceRequest = { name?: string; status?: WorkspaceStatus };

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("workspaces")
export class WorkspacesController {
  constructor(private readonly workspaces: WorkspacesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.workspaces.list(user);
  }

  @RequirePermissions("platform:workspace:manage")
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() body: CreateWorkspaceRequest) {
    return this.workspaces.create(user, body);
  }

  @RequirePermissions("platform:workspace:manage")
  @Patch(":workspaceId")
  update(@CurrentUser() user: AuthUser, @Param("workspaceId") workspaceId: string, @Body() body: UpdateWorkspaceRequest) {
    return this.workspaces.update(user, workspaceId, body);
  }
}
