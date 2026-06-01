import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthUser } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RequirePermissions } from "../rbac/permissions.decorator";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { FoldersService } from "./folders.service";

type CreateFolderRequest = { name: string; parentId?: string | null };
type UpdateFolderRequest = { name?: string; parentId?: string | null };
type AssignFolderRequest = { userId: string };

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("folders")
export class FoldersController {
  constructor(private readonly folders: FoldersService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.folders.list(user);
  }

  @RequirePermissions("workspace:folder:manage")
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() body: CreateFolderRequest) {
    return this.folders.create(user, body);
  }

  @RequirePermissions("workspace:folder:manage")
  @Patch(":folderId")
  update(@CurrentUser() user: AuthUser, @Param("folderId") folderId: string, @Body() body: UpdateFolderRequest) {
    return this.folders.update(user, folderId, body);
  }

  @RequirePermissions("workspace:folder:manage")
  @Delete(":folderId")
  remove(@CurrentUser() user: AuthUser, @Param("folderId") folderId: string) {
    return this.folders.remove(user, folderId);
  }

  @RequirePermissions("workspace:folder:assign")
  @Post(":folderId/access")
  assignAccess(@CurrentUser() user: AuthUser, @Param("folderId") folderId: string, @Body() body: AssignFolderRequest) {
    return this.folders.assignAccess(user, folderId, body);
  }

  @RequirePermissions("workspace:folder:assign")
  @Delete(":folderId/access/:userId")
  revokeAccess(@CurrentUser() user: AuthUser, @Param("folderId") folderId: string, @Param("userId") userId: string) {
    return this.folders.revokeAccess(user, folderId, userId);
  }
}
