import { Body, Controller, Param, Post, UseGuards } from "@nestjs/common";
import { InternalAuthGuard } from "./internal-auth.guard";
import { InternalService, type IngestionChunkInput } from "./internal.service";

/**
 * Internal-only ingestion callbacks invoked by the AI worker (not the browser).
 * Protected by the shared INTERNAL_API_KEY via InternalAuthGuard.
 */
@UseGuards(InternalAuthGuard)
@Controller("internal/ingestion")
export class InternalController {
  constructor(private readonly internal: InternalService) {}

  @Post(":jobId/status")
  setStatus(@Param("jobId") jobId: string, @Body() body: { status: string }) {
    return this.internal.updateStatus(jobId, body.status);
  }

  @Post(":jobId/complete")
  complete(@Param("jobId") jobId: string, @Body() body: { chunks?: IngestionChunkInput[] }) {
    return this.internal.complete(jobId, body.chunks ?? []);
  }

  @Post(":jobId/fail")
  fail(@Param("jobId") jobId: string, @Body() body: { error: string }) {
    return this.internal.fail(jobId, body.error);
  }
}
