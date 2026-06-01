import { Module } from "@nestjs/common";
import { RbacModule } from "../rbac/rbac.module";
import { AssistantsController } from "./assistants.controller";
import { AssistantsService } from "./assistants.service";

@Module({ imports: [RbacModule], controllers: [AssistantsController], providers: [AssistantsService] })
export class AssistantsModule {}
