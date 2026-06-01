import { Body, Controller, Post } from "@nestjs/common";
import { ChatService } from "./chat.service";

type ChatRequest = {
  question: string;
  assistantId?: string;
  userId?: string;
  sessionId?: string;
};

@Controller("chat")
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post("messages")
  sendMessage(@Body() body: ChatRequest) {
    return this.chatService.sendMessage(body);
  }
}
