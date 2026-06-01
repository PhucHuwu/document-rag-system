import { Module } from "@nestjs/common";
import { DevDataModule } from "../dev-data/dev-data.module";
import { ChatController } from "./chat.controller";
import { ChatService } from "./chat.service";

@Module({ imports: [DevDataModule], controllers: [ChatController], providers: [ChatService] })
export class ChatModule {}
