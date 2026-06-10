import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

export type IngestionJobPayload = {
  jobId: string;
  documentId: string;
  workspaceId: string;
  folderId: string;
  storageKey: string;
  fileName: string;
  fileType: string;
  title?: string;
  version: number;
  supersedesDocumentIds: string[];
};

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly redis: Redis;
  private readonly stream: string;

  constructor(config: ConfigService) {
    this.redis = new Redis(config.get<string>("REDIS_URL", "redis://localhost:6379"));
    this.stream = config.get<string>("INGESTION_STREAM", "ingestion");
    this.redis.on("error", (error) => {
      // ioredis auto-reconnects; log so a down Redis does not crash the process.
      console.error("Redis connection error", error.message);
    });
  }

  /** Publish an ingestion job to the Redis Stream consumed by the AI worker. */
  enqueueIngestion(payload: IngestionJobPayload) {
    return this.redis.xadd(this.stream, "*", "payload", JSON.stringify(payload));
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }
}
