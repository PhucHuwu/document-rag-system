import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

/**
 * Guards internal-only endpoints (ingestion callbacks from the AI worker).
 * The caller must present the shared INTERNAL_API_KEY via the x-internal-key header.
 */
@Injectable()
export class InternalAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string | string[] | undefined> }>();
    const provided = request.headers["x-internal-key"];
    const expected = this.config.get<string>("INTERNAL_API_KEY", "change-me-internal-key");

    if (typeof provided !== "string" || provided !== expected) {
      throw new ForbiddenException("Invalid internal API key");
    }

    return true;
  }
}
