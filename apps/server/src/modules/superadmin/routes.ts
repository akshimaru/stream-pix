import type { FastifyPluginAsync } from "fastify";
import { ok } from "../../lib/http.js";
import {
  changeStreamerPlan,
  createAdminPlan,
  createImpersonationPayload,
  exportAdminTransactionsCsv,
  getAdminOverview,
  listAdminPaymentProviders,
  listAdminPlans,
  listAdminStreamers,
  listAdminTransactions,
  listAuditLogs,
  testAdminPaymentProvider,
  toggleStreamerStatus,
  updateAdminPaymentProvider,
  updateAdminPlan,
} from "./service.js";

export const superadminRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("onRequest", async (request) => {
    await fastify.requireRoles(request, "SUPERADMIN", "INTERNAL_ADMIN");
  });

  fastify.get("/v1/admin/overview", async () => ok(await getAdminOverview(fastify)));
  fastify.get("/v1/admin/streamers", async (request) => ok(await listAdminStreamers(fastify, request)));
  fastify.get("/v1/admin/plans", async () => ok(await listAdminPlans(fastify)));
  fastify.get("/v1/admin/payment-providers", async () => ok(await listAdminPaymentProviders(fastify)));
  fastify.post("/v1/admin/plans", async (request) => ok(await createAdminPlan(fastify, request.body)));
  fastify.patch("/v1/admin/plans/:planId", async (request) =>
    ok(await updateAdminPlan(fastify, (request.params as { planId: string }).planId, request.body)),
  );
  fastify.patch("/v1/admin/payment-providers/:providerId", async (request) =>
    ok(
      await updateAdminPaymentProvider(
        fastify,
        (request.params as { providerId: string }).providerId,
        request.body,
      ),
    ),
  );
  fastify.post("/v1/admin/payment-providers/:providerId/test", async (request) =>
    ok(await testAdminPaymentProvider(fastify, (request.params as { providerId: string }).providerId)),
  );
  fastify.get("/v1/admin/transactions", async (request) =>
    ok(await listAdminTransactions(fastify, request)),
  );
  fastify.get("/v1/admin/audit-logs", async () => ok(await listAuditLogs(fastify)));
  fastify.post("/v1/admin/streamers/:streamerId/toggle-status", async (request) =>
    ok(await toggleStreamerStatus(fastify, (request.params as { streamerId: string }).streamerId)),
  );
  fastify.post("/v1/admin/streamers/:streamerId/change-plan", async (request) =>
    ok(
      await changeStreamerPlan(
        fastify,
        (request.params as { streamerId: string }).streamerId,
        (request.body as { planId: string }).planId,
      ),
    ),
  );
  fastify.post("/v1/admin/streamers/:streamerId/impersonate", async (request) =>
    ok(
      await createImpersonationPayload(
        fastify,
        (request.params as { streamerId: string }).streamerId,
        request,
      ),
    ),
  );
  fastify.get("/v1/admin/transactions/export.csv", async (_request, reply) => {
    const csv = await exportAdminTransactionsCsv(fastify);
    reply.header("content-type", "text/csv; charset=utf-8");
    reply.header("content-disposition", 'attachment; filename="streampix-platform-transactions.csv"');
    return reply.send(csv);
  });
};
