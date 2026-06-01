import { Body, Controller, Get, Param, Post, Query, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthUser } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RequirePermissions } from "../rbac/permissions.decorator";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { DocumentsService } from "./documents.service";

type UploadDocumentRequest = { folderId: string; title?: string };

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("documents")
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query("folderId") folderId?: string) {
    return this.documents.list(user, folderId);
  }

  @Get(":documentId")
  get(@CurrentUser() user: AuthUser, @Param("documentId") documentId: string) {
    return this.documents.get(user, documentId);
  }

  @RequirePermissions("workspace:document:manage")
  @Post("upload")
  @UseInterceptors(FileInterceptor("file"))
  upload(
    @CurrentUser() user: AuthUser,
    @Body() body: UploadDocumentRequest,
    @UploadedFile() file?: Express.Multer.File
  ) {
    return this.documents.upload(user, body, file);
  }

  @Get("ingestion-jobs/:jobId")
  getIngestionJob(@CurrentUser() user: AuthUser, @Param("jobId") jobId: string) {
    return this.documents.getIngestionJob(user, jobId);
  }
}
