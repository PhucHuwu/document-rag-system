import { Module } from "@nestjs/common";
import { RbacModule } from "../rbac/rbac.module";
import { WorkspacesController } from "./workspaces.controller";
import { WorkspacesService } from "./workspaces.service";

@Module({ imports: [RbacModule], controllers: [WorkspacesController], providers: [WorkspacesService] })
export class WorkspacesModule {}
