import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import type { AuthUser } from "../auth/auth.types";
import { RequirePermissions } from "../rbac/permissions.decorator";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { ChatService } from "./chat.service";

type ChatRequest = {
  question: string;
  assistantId?: string;
  sessionId?: string;
};

@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions("chat:send_message")
@Controller("chat")
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post("messages")
  sendMessage(@CurrentUser() user: AuthUser, @Body() body: ChatRequest) {
    return this.chatService.sendMessage(user, body);
  }
}
