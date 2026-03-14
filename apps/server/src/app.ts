import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { Server } from "socket.io";
import { socketEvents } from "@streampix/shared";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { prisma } from "./lib/prisma.js";
import { AppError, isAppError } from "./lib/errors.js";
import { authPlugin } from "./plugins/auth.js";
import { authRoutes } from "./modules/auth/routes.js";
import { planRoutes } from "./modules/plans/routes.js";
import { publicPageRoutes } from "./modules/public-pages/routes.js";
import { pixPaymentRoutes } from "./modules/pix-payments/routes.js";
import { overlayRoutes } from "./modules/overlays/routes.js";
import { payoutRoutes } from "./modules/payouts/routes.js";
import { streamerRoutes } from "./modules/streamer/routes.js";
import { superadminRoutes } from "./modules/superadmin/routes.js";
import { webhookRoutes } from "./modules/webhooks/routes.js";
import { chargeRoom, dashboardRoom, overlayRoom } from "./lib/socket.js";
import { verifySocketToken } from "./modules/auth/service.js";

export async function buildApp() {
  const app = Fastify({
    loggerInstance: logger,
  });

  app.decorate("prisma", prisma);
  app.decorate("io", undefined as unknown as Server);

  await app.register(cors, {
    origin: (origin, callback) => {
      if (!origin || origin === env.WEB_ORIGIN) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin não permitida."), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Idempotency-Key"],
    maxAge: 86400,
  });

  await app.register(rateLimit, {
    max: 120,
    timeWindow: "1 minute",
  });

  await app.register(authPlugin);

  app.get("/v1/health", async () => ({
    ok: true,
    timestamp: new Date().toISOString(),
  }));

  await app.register(authRoutes);
  await app.register(planRoutes);
  await app.register(publicPageRoutes);
  await app.register(pixPaymentRoutes);
  await app.register(overlayRoutes);
  await app.register(payoutRoutes);
  await app.register(streamerRoutes);
  await app.register(superadminRoutes);
  await app.register(webhookRoutes);

  const io = new Server(app.server, {
    cors: {
      origin: env.WEB_ORIGIN,
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    socket.on(socketEvents.chargeSubscribe, async (payload: { chargeId?: string }) => {
      if (payload.chargeId) {
        await socket.join(chargeRoom(payload.chargeId));
      }
    });

    socket.on(socketEvents.overlaySubscribe, async (payload: { token?: string }) => {
      if (!payload.token) {
        return;
      }

      const streamer = await prisma.streamerProfile.findUnique({
        where: {
          overlayToken: payload.token,
        },
      });

      if (!streamer) {
        return;
      }

      await socket.join(overlayRoom(streamer.id));
    });

    socket.on(socketEvents.dashboardSubscribe, async (payload: { token?: string }) => {
      if (!payload.token) {
        return;
      }

      const token = payload.token;

      try {
        const decoded = verifySocketToken(token);

        if (decoded.type !== "socket") {
          return;
        }

        if (decoded.streamerId) {
          await socket.join(dashboardRoom(decoded.streamerId));
        } else {
          await socket.join(`user:${decoded.sub}`);
        }
      } catch (error) {
        app.log.warn({ error }, "Falha ao validar socket token");
      }
    });
  });

  app.io = io;

  app.setErrorHandler((error, request, reply) => {
    if (isAppError(error)) {
      reply.status(error.statusCode).send({
        success: false,
        error: error.message,
        code: error.code,
        details: error.details,
      });
      return;
    }

    if (error instanceof Error && error.name === "ZodError") {
      reply.status(400).send({
        success: false,
        error: "Dados inválidos.",
        code: "VALIDATION_ERROR",
      });
      return;
    }

    app.log.error(
      {
        error: error instanceof Error ? { name: error.name, message: error.message } : String(error),
        path: request.url,
      },
      "Unhandled request error",
    );

    reply.status(500).send({
      success: false,
      error: "Erro interno do servidor.",
      code: "INTERNAL_SERVER_ERROR",
    });
  });

  app.addHook("onClose", async () => {
    await io.close();
    await prisma.$disconnect();
  });

  return app;
}
