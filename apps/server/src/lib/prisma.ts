import { PrismaClient } from "@prisma/client";

const prismaGlobal = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

export const prisma =
  prismaGlobal.prisma ??
  new PrismaClient({
    log: ["warn", "error"],
  });

if (!prismaGlobal.prisma) {
  prismaGlobal.prisma = prisma;
}
