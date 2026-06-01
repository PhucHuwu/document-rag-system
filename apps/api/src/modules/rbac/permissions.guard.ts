import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { AuthUser } from "../auth/auth.types";
import { PERMISSIONS_KEY } from "./permissions.decorator";
import { PermissionCode, roleHasPermission } from "./permissions";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<PermissionCode[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (!required?.length) return true;

    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = request.user;

    if (!user) throw new ForbiddenException("Missing authenticated user");

    const allowed = required.every((permission) => roleHasPermission(user.role, permission));
    if (!allowed) throw new ForbiddenException("Missing required permission");

    return true;
  }
}
