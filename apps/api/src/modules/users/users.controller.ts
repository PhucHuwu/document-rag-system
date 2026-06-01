import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import type { RoleCode, UserStatus } from "@prisma/client";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthUser } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RequirePermissions } from "../rbac/permissions.decorator";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { UsersService } from "./users.service";

type CreateUserRequest = { email: string; name: string; password: string; role?: RoleCode; workspaceId?: string };
type UpdateUserRequest = { name?: string; status?: UserStatus; role?: RoleCode; password?: string };

@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions("workspace:user:manage")
@Controller("users")
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.users.list(user);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() body: CreateUserRequest) {
    return this.users.create(user, body);
  }

  @Patch(":userId")
  update(@CurrentUser() user: AuthUser, @Param("userId") userId: string, @Body() body: UpdateUserRequest) {
    return this.users.update(user, userId, body);
  }
}
