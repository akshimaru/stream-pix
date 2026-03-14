import type { FastifyPluginAsync } from "fastify";
import { ok } from "../../lib/http.js";
import {
  createPublicCharge,
  getChargeSummary,
  simulateChargeConfirmation,
} from "./service.js";

export const pixPaymentRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post("/v1/public/streamers/:slug/charges", async (request) => {
    const charge = await createPublicCharge(
      fastify,
      (request.params as { slug: string }).slug,
      request.body,
      request,
    );

    return ok(charge);
  });

  fastify.get("/v1/public/charges/:chargeId", async (request) => {
    const charge = await getChargeSummary(fastify, (request.params as { chargeId: string }).chargeId);

    return ok(charge);
  });

  fastify.post("/v1/public/charges/:chargeId/simulate-confirmation", async (request) => {
    const response = await simulateChargeConfirmation(
      fastify,
      (request.params as { chargeId: string }).chargeId,
    );

    return ok(response);
  });
};
