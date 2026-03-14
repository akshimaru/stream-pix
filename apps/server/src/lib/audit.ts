import type { Prisma, PrismaClient } from "@prisma/client";

interface AuditInput {
  prisma: PrismaClient | Prisma.TransactionClient;
  actorUserId?: string;
  streamerId?: string;
  entityType: string;
  entityId: string;
  action: string;
  metadata?: unknown;
  ipAddress?: string;
  userAgent?: string;
}

export async function writeAuditLog(input: AuditInput) {
  await input.prisma.auditLog.create({
    data: {
      actorUserId: input.actorUserId,
      streamerId: input.streamerId,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      metadata: input.metadata as object | undefined,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    },
  });
}
