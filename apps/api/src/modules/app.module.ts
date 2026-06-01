import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { HealthModule } from "./health/health.module";
import { ChatModule } from "./chat/chat.module";
import { DevDataModule } from "./dev-data/dev-data.module";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { WorkspacesModule } from "./workspaces/workspaces.module";
import { UsersModule } from "./users/users.module";
import { FoldersModule } from "./folders/folders.module";
import { AssistantsModule } from "./assistants/assistants.module";
import { DocumentsModule } from "./documents/documents.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    DevDataModule,
    HealthModule,
    WorkspacesModule,
    UsersModule,
    FoldersModule,
    DocumentsModule,
    AssistantsModule,
    ChatModule
  ]
})
export class AppModule {}
