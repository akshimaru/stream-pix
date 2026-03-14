import type { FastifyPluginAsync } from "fastify";
import { ok } from "../../lib/http.js";
import {
  approveAlert,
  completeOnboarding,
  exportStreamerPaymentsCsv,
  getStreamerAnalytics,
  getStreamerNotifications,
  getStreamerOverview,
  getStreamerWorkspaceBootstrap,
  listStreamerAlerts,
  listStreamerPayments,
  rejectAlert,
  updateOverlaySettings,
  updatePublicPageSettings,
  updateStreamerSettings,
} from "./service.js";
import { createTestAlert } from "../pix-payments/service.js";

export const streamerRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("onRequest", async (request) => {
    await fastify.requireRoles(request, "STREAMER", "SUPERADMIN");
  });

  fastify.get("/v1/streamer/workspace", async (request) => {
    return ok(await getStreamerWorkspaceBootstrap(fastify, request));
  });

  fastify.get("/v1/streamer/dashboard/overview", async (request) => {
    return ok(await getStreamerOverview(fastify, request));
  });

  fastify.get("/v1/streamer/dashboard/analytics", async (request) => {
    return ok(await getStreamerAnalytics(fastify, request));
  });

  fastify.get("/v1/streamer/payments", async (request) => {
    return ok(await listStreamerPayments(fastify, request));
  });

  fastify.get("/v1/streamer/alerts", async (request) => {
    return ok(await listStreamerAlerts(fastify, request));
  });

  fastify.get("/v1/streamer/notifications", async (request) => {
    return ok(await getStreamerNotifications(fastify, request));
  });

  fastify.patch("/v1/streamer/overlay-settings", async (request) => {
    return ok(await updateOverlaySettings(fastify, request, request.body));
  });

  fastify.patch("/v1/streamer/settings", async (request) => {
    return ok(await updateStreamerSettings(fastify, request, request.body));
  });

  fastify.patch("/v1/streamer/public-page-settings", async (request) => {
    return ok(await updatePublicPageSettings(fastify, request, request.body));
  });

  fastify.post("/v1/streamer/alerts/test", async (request) => {
    return ok(await createTestAlert(fastify, request.authUser!.streamerId!));
  });

  fastify.post("/v1/streamer/alerts/:alertId/approve", async (request) => {
    return ok(await approveAlert(fastify, request, (request.params as { alertId: string }).alertId));
  });

  fastify.post("/v1/streamer/alerts/:alertId/reject", async (request) => {
    return ok(await rejectAlert(fastify, request, (request.params as { alertId: string }).alertId));
  });

  fastify.post("/v1/streamer/onboarding/complete", async (request) => {
    return ok(await completeOnboarding(fastify, request));
  });

  fastify.get("/v1/streamer/payments/export.csv", async (request, reply) => {
    const csv = await exportStreamerPaymentsCsv(fastify, request);
    reply.header("content-type", "text/csv; charset=utf-8");
    reply.header("content-disposition", 'attachment; filename="streampix-payments.csv"');
    return reply.send(csv);
  });
};
