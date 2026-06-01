import { Module } from "@nestjs/common";
import { RbacModule } from "../rbac/rbac.module";
import { FoldersController } from "./folders.controller";
import { FoldersService } from "./folders.service";

@Module({ imports: [RbacModule], controllers: [FoldersController], providers: [FoldersService] })
export class FoldersModule {}
