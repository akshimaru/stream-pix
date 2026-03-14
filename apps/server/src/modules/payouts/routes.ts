import type { FastifyPluginAsync } from "fastify";
import { ok } from "../../lib/http.js";
import {
  approvePayoutRequest,
  createStreamerPayoutRequest,
  getStreamerPayoutOverview,
  listAdminPayoutRequests,
  listStreamerPayoutRequests,
  rejectPayoutRequest,
  updateStreamerPayoutAccount,
} from "./service.js";

export const payoutRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/v1/streamer/payouts/overview",
    {
      onRequest: async (request) => {
        await fastify.requireRoles(request, "STREAMER", "SUPERADMIN");
      },
    },
    async (request) => ok(await getStreamerPayoutOverview(fastify, request)),
  );

  fastify.get(
    "/v1/streamer/payouts",
    {
      onRequest: async (request) => {
        await fastify.requireRoles(request, "STREAMER", "SUPERADMIN");
      },
    },
    async (request) => ok(await listStreamerPayoutRequests(fastify, request)),
  );

  fastify.patch(
    "/v1/streamer/payout-account",
    {
      onRequest: async (request) => {
        await fastify.requireRoles(request, "STREAMER", "SUPERADMIN");
      },
    },
    async (request) => ok(await updateStreamerPayoutAccount(fastify, request, request.body)),
  );

  fastify.post(
    "/v1/streamer/payouts/request",
    {
      onRequest: async (request) => {
        await fastify.requireRoles(request, "STREAMER", "SUPERADMIN");
      },
    },
    async (request) => ok(await createStreamerPayoutRequest(fastify, request, request.body)),
  );

  fastify.get(
    "/v1/admin/payouts",
    {
      onRequest: async (request) => {
        await fastify.requireRoles(request, "SUPERADMIN", "INTERNAL_ADMIN");
      },
    },
    async (request) => ok(await listAdminPayoutRequests(fastify, request)),
  );

  fastify.post(
    "/v1/admin/payouts/:payoutRequestId/approve",
    {
      onRequest: async (request) => {
        await fastify.requireRoles(request, "SUPERADMIN", "INTERNAL_ADMIN");
      },
    },
    async (request) =>
      ok(await approvePayoutRequest(fastify, request, (request.params as { payoutRequestId: string }).payoutRequestId)),
  );

  fastify.post(
    "/v1/admin/payouts/:payoutRequestId/reject",
    {
      onRequest: async (request) => {
        await fastify.requireRoles(request, "SUPERADMIN", "INTERNAL_ADMIN");
      },
    },
    async (request) =>
      ok(
        await rejectPayoutRequest(
          fastify,
          request,
          (request.params as { payoutRequestId: string }).payoutRequestId,
          request.body,
        ),
      ),
  );
};
