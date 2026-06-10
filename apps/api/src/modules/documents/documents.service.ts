import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { createHash } from "node:crypto";
import type { AuthUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";
import { QueueService } from "../queue/queue.service";
import { StorageService } from "../storage/storage.service";

type UploadedFile = Express.Multer.File;

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly queue: QueueService
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

    const result = await this.prisma.$transaction(async (tx) => {
      const supersededDocs = await tx.document.findMany({
        where: { workspaceId, folderId: folder.id, fileName: file.originalname, isActive: true },
        select: { id: true }
      });

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

      return { document, ingestionJob, supersedesDocumentIds: supersededDocs.map((doc) => doc.id) };
    });

    await this.queue
      .enqueueIngestion({
        jobId: result.ingestionJob.id,
        documentId: result.document.id,
        workspaceId,
        folderId: folder.id,
        storageKey,
        fileName: file.originalname,
        fileType: result.document.fileType,
        title: result.document.title,
        version: result.document.version,
        supersedesDocumentIds: result.supersedesDocumentIds
      })
      .catch((error) => {
        console.error(`Failed to enqueue ingestion job ${result.ingestionJob.id}`, error);
      });

    return { document: result.document, ingestionJob: result.ingestionJob };
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
