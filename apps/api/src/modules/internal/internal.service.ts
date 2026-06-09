import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { IngestionStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export type IngestionChunkInput = {
  qdrant_point_id: string;
  content: string;
  section_title?: string | null;
  heading_path?: string[];
  page_start?: number | null;
  page_end?: number | null;
};

@Injectable()
export class InternalService {
  constructor(private readonly prisma: PrismaService) {}

  async updateStatus(jobId: string, status: string) {
    const ingestionStatus = this.parseStatus(status);
    const job = await this.requireJob(jobId);

    await this.prisma.$transaction([
      this.prisma.ingestionJob.update({ where: { id: jobId }, data: { status: ingestionStatus } }),
      this.prisma.document.update({ where: { id: job.documentId }, data: { ingestionStatus } })
    ]);

    return { ok: true };
  }

  async complete(jobId: string, chunks: IngestionChunkInput[]) {
    const job = await this.requireJob(jobId);
    const document = job.document;

    return this.prisma.$transaction(async (tx) => {
      // Retire chunks of superseded versions (same file in the same folder).
      const supersededDocs = await tx.document.findMany({
        where: {
          workspaceId: document.workspaceId,
          folderId: document.folderId,
          fileName: document.fileName,
          id: { not: document.id }
        },
        select: { id: true }
      });
      const supersededIds = supersededDocs.map((doc) => doc.id);
      if (supersededIds.length > 0) {
        await tx.documentChunk.updateMany({
          where: { documentId: { in: supersededIds } },
          data: { isActive: false }
        });
      }

      if (chunks.length > 0) {
        await tx.documentChunk.createMany({
          data: chunks.map((chunk) => ({
            workspaceId: document.workspaceId,
            folderId: document.folderId,
            documentId: document.id,
            documentVersion: document.version,
            content: chunk.content,
            qdrantPointId: chunk.qdrant_point_id,
            pageStart: chunk.page_start ?? null,
            pageEnd: chunk.page_end ?? null,
            sectionTitle: chunk.section_title ?? null,
            headingPath: (chunk.heading_path ?? []) as Prisma.InputJsonValue,
            isActive: true
          }))
        });
      }

      await tx.document.update({ where: { id: document.id }, data: { ingestionStatus: "completed" } });
      await tx.ingestionJob.update({ where: { id: jobId }, data: { status: "completed", error: null } });

      return { ok: true, chunks: chunks.length };
    });
  }

  async fail(jobId: string, error: string) {
    const job = await this.requireJob(jobId);

    await this.prisma.$transaction([
      this.prisma.ingestionJob.update({
        where: { id: jobId },
        data: { status: "failed", error: error?.slice(0, 1000) ?? "Unknown error", attempts: { increment: 1 } }
      }),
      this.prisma.document.update({ where: { id: job.documentId }, data: { ingestionStatus: "failed" } })
    ]);

    return { ok: true };
  }

  private async requireJob(jobId: string) {
    const job = await this.prisma.ingestionJob.findUnique({
      where: { id: jobId },
      include: { document: true }
    });
    if (!job) throw new NotFoundException("Ingestion job not found");
    return job;
  }

  private parseStatus(status: string): IngestionStatus {
    if (!Object.values(IngestionStatus).includes(status as IngestionStatus)) {
      throw new BadRequestException(`Invalid ingestion status: ${status}`);
    }
    return status as IngestionStatus;
  }
}
