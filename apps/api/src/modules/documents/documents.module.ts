import { Module } from "@nestjs/common";
import { QueueModule } from "../queue/queue.module";
import { RbacModule } from "../rbac/rbac.module";
import { StorageModule } from "../storage/storage.module";
import { DocumentsController } from "./documents.controller";
import { DocumentsService } from "./documents.service";

@Module({
  imports: [RbacModule, StorageModule, QueueModule],
  controllers: [DocumentsController],
  providers: [DocumentsService]
})
export class DocumentsModule {}
