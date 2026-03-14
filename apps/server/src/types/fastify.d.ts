import type { AuthUser, RoleKey } from "@streampix/shared";
import type { PrismaClient } from "@prisma/client";
import type { Server as SocketIOServer } from "socket.io";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
    io: SocketIOServer;
    authenticate: (request: FastifyRequest) => Promise<void>;
    requireRoles: (request: FastifyRequest, ...roles: RoleKey[]) => Promise<void>;
  }

  interface FastifyRequest {
    authUser?: AuthUser;
  }
}
