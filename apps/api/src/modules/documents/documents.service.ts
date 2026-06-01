import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { createHash } from "node:crypto";
import type { AuthUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";

type UploadedFile = Express.Multer.File;

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService
  ) {}

  list(user: AuthUser, folderId?: string) {
    const workspaceId = this.requireWorkspace(user);
    return this.prisma.document.findMany({
      where: { workspaceId, folderId, isActive: true },
      include: { ingestionJobs: { orderBy: { createdAt: "desc" }, take: 1 } },
      orderBy: { createdAt: "desc" }
    });
  }

  async get(user: AuthUser, documentId: string) {
    const workspaceId = this.requireWorkspace(user);
    const document = await this.prisma.document.findFirst({
      where: { id: documentId, workspaceId },
      include: { ingestionJobs: { orderBy: { createdAt: "desc" } }, chunks: { take: 20 } }
    });

    if (!document) throw new NotFoundException("Document not found");
    return document;
  }

  async upload(user: AuthUser, input: { folderId: string; title?: string }, file?: UploadedFile) {
    const workspaceId = this.requireWorkspace(user);
    if (!file) throw new BadRequestException("File is required");

    const folder = await this.prisma.folder.findFirst({ where: { id: input.folderId, workspaceId } });
    if (!folder) throw new BadRequestException("Folder is not valid for current workspace");

    const checksum = createHash("sha256").update(file.buffer).digest("hex");
    const existingVersion = await this.prisma.document.findFirst({
      where: { workspaceId, folderId: folder.id, fileName: file.originalname },
      orderBy: { version: "desc" }
    });

    const version = existingVersion ? existingVersion.version + 1 : 1;
    const documentId = `doc_${crypto.randomUUID()}`;
    const storageKey = `${workspaceId}/${folder.id}/${documentId}/v${version}/${file.originalname}`;

    await this.storage.uploadObject({ key: storageKey, body: file.buffer, contentType: file.mimetype });

    return this.prisma.$transaction(async (tx) => {
      if (existingVersion) {
        await tx.document.updateMany({
          where: { workspaceId, folderId: folder.id, fileName: file.originalname },
          data: { isActive: false }
        });
      }

      const document = await tx.document.create({
        data: {
          id: documentId,
          workspaceId,
          folderId: folder.id,
          title: input.title || file.originalname,
          fileName: file.originalname,
          fileType: file.mimetype || "application/octet-stream",
          fileSize: file.size,
          storageKey,
          checksum,
          version,
          ingestionStatus: "pending",
          isActive: true
        }
      });

      const ingestionJob = await tx.ingestionJob.create({
        data: {
          workspaceId,
          documentId: document.id,
          status: "pending"
        }
      });

      await tx.auditLog.create({
        data: {
          workspaceId,
          actorUserId: user.id,
          action: "document.upload",
          targetType: "document",
          targetId: document.id,
          metadata: { folderId: folder.id, fileName: file.originalname, fileSize: file.size, ingestionJobId: ingestionJob.id }
        }
      });

      return { document, ingestionJob };
    });
  }

  async getIngestionJob(user: AuthUser, jobId: string) {
    const workspaceId = this.requireWorkspace(user);
    const job = await this.prisma.ingestionJob.findFirst({
      where: { id: jobId, workspaceId },
      include: { document: true }
    });

    if (!job) throw new NotFoundException("Ingestion job not found");
    return job;
  }

  private requireWorkspace(user: AuthUser) {
    if (!user.workspaceId) throw new ForbiddenException("Workspace context is required");
    return user.workspaceId;
  }
}
