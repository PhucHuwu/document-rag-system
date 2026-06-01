import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { HealthModule } from "./health/health.module";
import { ChatModule } from "./chat/chat.module";

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), HealthModule, ChatModule]
})
export class AppModule {}
