import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { HealthModule } from "./health/health.module";
import { ChatModule } from "./chat/chat.module";
import { DevDataModule } from "./dev-data/dev-data.module";

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), DevDataModule, HealthModule, ChatModule]
})
export class AppModule {}
